#!/usr/bin/env python3
"""Validate that every shipped R6 proxy is genuinely derived from final LOD2.

The authoritative reducer writes public/models/r6/proxy-reduction.json. This
gate re-opens both artifacts, verifies strict triangle reduction, checks the
recorded LOD2 provenance, and rejects proxies whose spatial bounds drift far
enough to indicate an unrelated independently-authored model.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = ROOT / "public" / "models" / "r6"
REPORT = MODEL_ROOT / "proxy-reduction.json"
CHAPTERS = (
    "hero-campus",
    "manufacturing",
    "power-generation",
    "data-centers",
    "recycling",
    "closing-platform",
)


def as_scene(path: Path) -> trimesh.Scene:
    loaded = trimesh.load(path, force="scene", process=False)
    return loaded if isinstance(loaded, trimesh.Scene) else trimesh.Scene(loaded)


def triangles(scene: trimesh.Scene) -> int:
    return sum(int(len(mesh.faces)) for mesh in scene.geometry.values() if hasattr(mesh, "faces"))


def bounds(scene: trimesh.Scene) -> np.ndarray:
    value = np.asarray(scene.bounds, dtype=np.float64)
    if value.shape != (2, 3) or not np.isfinite(value).all():
        raise ValueError("invalid scene bounds")
    return value


def main() -> int:
    errors: list[str] = []
    if not REPORT.exists():
        print(f"ERROR: missing reducer provenance report: {REPORT.relative_to(ROOT)}", file=sys.stderr)
        return 2

    payload = json.loads(REPORT.read_text(encoding="utf-8"))
    rows = {str(item.get("lod2", "")).removesuffix("-lod2.glb"): item for item in payload.get("chapters", [])}

    for chapter in CHAPTERS:
        lod2_path = MODEL_ROOT / f"{chapter}-lod2.glb"
        proxy_path = MODEL_ROOT / f"{chapter}-proxy.glb"
        row = rows.get(chapter)
        if row is None:
            errors.append(f"{chapter}: missing provenance entry")
            continue
        if row.get("source") != "LOD2":
            errors.append(f"{chapter}: provenance source must be LOD2, got {row.get('source')!r}")
        if not lod2_path.exists() or not proxy_path.exists():
            errors.append(f"{chapter}: missing LOD2/proxy artifact")
            continue

        lod2 = as_scene(lod2_path)
        proxy = as_scene(proxy_path)
        lod2_tri = triangles(lod2)
        proxy_tri = triangles(proxy)
        if not (0 < proxy_tri < lod2_tri):
            errors.append(f"{chapter}: strict reduction failed ({proxy_tri} !< {lod2_tri})")
        if int(row.get("lod2Triangles", -1)) != lod2_tri or int(row.get("proxyTriangles", -1)) != proxy_tri:
            errors.append(f"{chapter}: reducer report triangle counts do not match shipped GLBs")

        lb = bounds(lod2)
        pb = bounds(proxy)
        le = np.maximum(lb[1] - lb[0], 1e-9)
        pe = np.maximum(pb[1] - pb[0], 1e-9)
        lc = (lb[0] + lb[1]) * 0.5
        pc = (pb[0] + pb[1]) * 0.5
        extent_ratio = pe / le
        center_drift = np.linalg.norm((pc - lc) / le)
        if np.any(extent_ratio < 0.55) or np.any(extent_ratio > 1.05):
            errors.append(f"{chapter}: proxy bounds inconsistent with LOD2 extents: {extent_ratio.round(3).tolist()}")
        if center_drift > 0.35:
            errors.append(f"{chapter}: proxy center drift from LOD2 is too large ({center_drift:.3f})")

        print(f"PASS {chapter}: LOD2={lod2_tri} proxy={proxy_tri} center_drift={center_drift:.3f}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("R6 proxy provenance gate passed for all six chapters.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
