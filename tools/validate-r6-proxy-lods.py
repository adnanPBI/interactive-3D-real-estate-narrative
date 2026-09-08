#!/usr/bin/env python3
"""Fail CI unless every R6 proxy GLB is genuinely lighter than its LOD2 peer."""
from __future__ import annotations

from pathlib import Path
import sys
import trimesh

ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = ROOT / "public" / "models" / "r6"
MAX_PROXY_RATIO = 0.92


def triangle_count(path: Path) -> int:
    loaded = trimesh.load(path, force="scene")
    if isinstance(loaded, trimesh.Trimesh):
        return int(len(loaded.faces))
    return int(sum(len(g.faces) for g in loaded.geometry.values() if hasattr(g, "faces")))


def discover_pairs() -> list[tuple[Path, Path]]:
    pairs: list[tuple[Path, Path]] = []
    seen: set[tuple[str, str]] = set()
    for lod2 in MODEL_ROOT.rglob("*.glb"):
        if "lod2" not in lod2.stem.lower():
            continue
        candidate_names = [
            lod2.with_name(lod2.name.lower().replace("lod2", "proxy")),
            lod2.with_name(lod2.name.replace("lod2", "proxy")),
            lod2.parent / "proxy.glb",
        ]
        proxy = next((p for p in candidate_names if p.exists()), None)
        if proxy is None:
            continue
        key = (str(lod2.resolve()), str(proxy.resolve()))
        if key not in seen:
            seen.add(key)
            pairs.append((lod2, proxy))
    return sorted(pairs, key=lambda pair: str(pair[0]))


def main() -> int:
    if not MODEL_ROOT.exists():
        print(f"ERROR: missing R6 model root: {MODEL_ROOT}", file=sys.stderr)
        return 2

    pairs = discover_pairs()
    if len(pairs) != 6:
        print(f"ERROR: expected 6 LOD2/proxy pairs, found {len(pairs)}", file=sys.stderr)
        for lod2, proxy in pairs:
            print(f"  {lod2.relative_to(ROOT)} -> {proxy.relative_to(ROOT)}", file=sys.stderr)
        return 3

    failures: list[str] = []
    print("R6 proxy reduction gate")
    print("hero/pair | lod2 tris | proxy tris | ratio")
    for lod2, proxy in pairs:
        lod2_tris = triangle_count(lod2)
        proxy_tris = triangle_count(proxy)
        ratio = proxy_tris / max(1, lod2_tris)
        label = str(lod2.parent.relative_to(MODEL_ROOT))
        print(f"{label:36s} | {lod2_tris:9d} | {proxy_tris:10d} | {ratio:0.3f}")
        if proxy_tris >= lod2_tris:
            failures.append(f"{label}: proxy is not lighter than LOD2")
        elif ratio > MAX_PROXY_RATIO:
            failures.append(
                f"{label}: proxy ratio {ratio:.3f} exceeds {MAX_PROXY_RATIO:.2f}; use a materially reduced source"
            )

    if failures:
        print("\nPROXY GATE FAILED", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 4

    print("R6 proxy reduction gate PASS: all six proxies are materially lighter than LOD2.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
