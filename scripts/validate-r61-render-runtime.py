#!/usr/bin/env python3
"""Validate the R6.1 semantic runtime pack produced for Render.

The browser loads six semantic hero ids from public/models/r6/hero/<hero>/<lod>.glb.
This gate verifies those exact paths, the R6.1 manifest/proxy report, strict LOD2
proxy reduction, hashes when recorded, external textures, and semantic fallbacks.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = ROOT / "public" / "models" / "r6"
HERO_ROOT = MODEL_ROOT / "hero"
TEXTURE_ROOT = ROOT / "public" / "textures" / "r6"
FALLBACK_ROOT = ROOT / "public" / "fallback" / "r6"
MANIFEST = MODEL_ROOT / "manifest.json"
PROXY_REPORT = MODEL_ROOT / "proxy-reduction.json"
HEROES = (
    "integrated-campus",
    "manufacturing-line",
    "substation-bess",
    "data-center-cooling",
    "recycling-intake",
    "connected-campus",
)
LODS = ("lod0", "lod1", "lod2", "proxy")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def as_scene(path: Path) -> trimesh.Scene:
    loaded = trimesh.load(path, force="scene", process=False)
    return loaded if isinstance(loaded, trimesh.Scene) else trimesh.Scene(loaded)


def triangles(path: Path) -> int:
    scene = as_scene(path)
    return sum(int(len(mesh.faces)) for mesh in scene.geometry.values() if hasattr(mesh, "faces"))


def bounds(path: Path) -> np.ndarray:
    value = np.asarray(as_scene(path).bounds, dtype=np.float64)
    if value.shape != (2, 3) or not np.isfinite(value).all():
        raise RuntimeError(f"Invalid bounds: {path}")
    return value


def fail(errors: list[str]) -> int:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    return 1


def main() -> int:
    errors: list[str] = []
    for required in (MANIFEST, PROXY_REPORT):
        if not required.is_file():
            errors.append(f"missing {required.relative_to(ROOT)}")
    if errors:
        return fail(errors)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    report = json.loads(PROXY_REPORT.read_text(encoding="utf-8"))
    heroes = manifest.get("heroes") or {}
    if not str(manifest.get("revision", "")).startswith("r6.1"):
        errors.append(f"unexpected manifest revision {manifest.get('revision')!r}")
    if set(heroes) != set(HEROES):
        errors.append(f"semantic hero manifest mismatch: {sorted(heroes)}")

    proxy_rows = {str(row.get("hero", "")): row for row in report.get("chapters", [])}

    for hero in HEROES:
        meta = heroes.get(hero) or {}
        lod_meta = meta.get("lods") or {}
        measured: dict[str, int] = {}
        for lod in LODS:
            path = HERO_ROOT / hero / f"{lod}.glb"
            if not path.is_file() or path.stat().st_size <= 0:
                errors.append(f"{hero}: missing/non-empty {lod}.glb")
                continue
            count = triangles(path)
            measured[lod] = count
            row = lod_meta.get(lod) or {}
            expected_tri = row.get("triangles")
            if isinstance(expected_tri, (int, float)) and int(expected_tri) != count:
                errors.append(f"{hero}: {lod} triangle mismatch manifest={expected_tri} actual={count}")
            expected_bytes = row.get("bytes")
            if isinstance(expected_bytes, (int, float)) and int(expected_bytes) != path.stat().st_size:
                errors.append(f"{hero}: {lod} byte-size mismatch")
            expected_sha = row.get("sha256")
            if isinstance(expected_sha, str) and expected_sha and expected_sha != sha256(path):
                errors.append(f"{hero}: {lod} SHA-256 mismatch")

        if {"lod0", "lod1", "lod2", "proxy"}.issubset(measured):
            if not (measured["lod0"] >= measured["lod1"] >= measured["lod2"] > measured["proxy"] > 0):
                errors.append(f"{hero}: invalid LOD ordering {measured}")

        row = proxy_rows.get(hero)
        if row is None:
            errors.append(f"{hero}: missing proxy provenance row")
        elif (HERO_ROOT / hero / "lod2.glb").is_file() and (HERO_ROOT / hero / "proxy.glb").is_file():
            lod2 = HERO_ROOT / hero / "lod2.glb"
            proxy = HERO_ROOT / hero / "proxy.glb"
            lt, pt = triangles(lod2), triangles(proxy)
            if row.get("source") != "LOD2":
                errors.append(f"{hero}: proxy source must be LOD2")
            if int(row.get("lod2Triangles", -1)) != lt or int(row.get("proxyTriangles", -1)) != pt:
                errors.append(f"{hero}: proxy report triangle counts differ from files")
            if isinstance(row.get("sourceSha256"), str) and row["sourceSha256"] != sha256(lod2):
                errors.append(f"{hero}: recorded LOD2 SHA mismatch")
            if isinstance(row.get("proxySha256"), str) and row["proxySha256"] != sha256(proxy):
                errors.append(f"{hero}: recorded proxy SHA mismatch")
            lb, pb = bounds(lod2), bounds(proxy)
            le = np.maximum(lb[1] - lb[0], 1e-9)
            pe = np.maximum(pb[1] - pb[0], 1e-9)
            ratio = pe / le
            center_drift = float(np.linalg.norm((((pb[0] + pb[1]) - (lb[0] + lb[1])) * 0.5) / le))
            if np.any(ratio < 0.55) or np.any(ratio > 1.05):
                errors.append(f"{hero}: proxy bounds drift {ratio.round(3).tolist()}")
            if center_drift > 0.35:
                errors.append(f"{hero}: proxy center drift {center_drift:.3f}")

        fallback = FALLBACK_ROOT / f"{hero}.webp"
        if not fallback.is_file() or fallback.stat().st_size < 8_000:
            errors.append(f"{hero}: semantic fallback missing/undersized")

        if hero == "manufacturing-line":
            source = meta.get("sourceAsset") or {}
            source_path = ROOT / str(source.get("path", ""))
            if source.get("pipelineAuthoritative") is not True or not source_path.is_file():
                errors.append("manufacturing-line: authoritative visual-master source is not wired")
            if measured.get("lod0", 0) and not (75_000 <= measured["lod0"] <= 95_000):
                errors.append(f"manufacturing-line: LOD0 outside fidelity band ({measured['lod0']})")
            textures = meta.get("textures") or []
            if not textures:
                errors.append("manufacturing-line: material texture manifest is empty")
            for texture in textures:
                path = ROOT / "public" / str(texture.get("path", "")).lstrip("/")
                if not path.is_file() or path.stat().st_size == 0:
                    errors.append(f"manufacturing-line: missing texture {texture.get('path')}")
        else:
            for kind in ("basecolor", "normal", "orm"):
                path = TEXTURE_ROOT / hero / f"{kind}.ktx2"
                if not path.is_file() or path.stat().st_size == 0:
                    errors.append(f"{hero}: missing external {kind}.ktx2")

        print(f"R6 runtime {hero:20s}: {measured}")

    runtime_files = (
        ROOT / "experience" / "config" / "r6Assets.ts",
        ROOT / "components" / "experience" / "HeroAsset.tsx",
        ROOT / "components" / "experience" / "R6PostFX.tsx",
        ROOT / "components" / "experience" / "InstancedInfrastructure.tsx",
    )
    for path in runtime_files:
        if not path.is_file():
            errors.append(f"runtime contract file missing: {path.relative_to(ROOT)}")

    if errors:
        return fail(errors)
    print("R6.1 Render runtime gate passed: six semantic heroes, 24 GLBs, textures, fallbacks, and LOD2-derived proxies are coherent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
