#!/usr/bin/env python3
"""Build non-overlapping R6.1.7 context for the five legacy-context heroes.

R6.1.6 stacked new hero architecture over R4+R5 architecture.  Several of those
surfaces occupied the same space and shimmered/z-fought in the user's marked
areas.  This context keeps landscape and useful plant from the deterministic R4
scene, but suppresses only masses that are replaced by the R6 authored hero.
"""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import sys
import trimesh

ROOT = Path(__file__).resolve().parents[1]
R5_PATH = ROOT / "scripts" / "generate-r5-hybrid-assets.py"
OUT = ROOT / "public" / "models" / "r6" / "context"
OUT.mkdir(parents=True, exist_ok=True)


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def no_op(*_args, **_kwargs):
    return None


def center_key(center):
    return (round(float(center[0]), 2), round(float(center[2]), 2))


def build_scene(r4, scene_id: str, skip_buildings: set[tuple[float, float]], suppress: set[str]):
    names = {"road", "turbine", "parking_car", "truck", "forklift", "building_shell", "pipe_rack", "cooling_tower", "chiller_bank"}
    originals = {name: getattr(r4, name) for name in names}
    removed = {"buildings": [], "helpers": sorted(suppress | {"road", "turbine", "parking_car", "truck", "forklift"})}

    for name in ("road", "turbine", "parking_car", "truck", "forklift"):
        setattr(r4, name, no_op)
    for name in suppress:
        setattr(r4, name, no_op)

    original_building = originals["building_shell"]
    def filtered_building(builder, center, *args, **kwargs):
        key = center_key(center)
        if key in skip_buildings:
            removed["buildings"].append(key)
            return None
        return original_building(builder, center, *args, **kwargs)
    r4.building_shell = filtered_building

    try:
        scene = r4.SCENES[scene_id]()
    finally:
        for name, fn in originals.items():
            setattr(r4, name, fn)
    return scene, removed


def main() -> int:
    r5 = load(R5_PATH, "r617_clean_context_r5")
    r4 = r5.r4  # R5 material tuning, R4 geometry only; no R5 detail overlay.
    policies = {
        "hero-campus": {
            "skip": {(-2.70, -1.40), (3.40, -2.20)},
            "suppress": set(),
        },
        "power-generation": {"skip": set(), "suppress": set()},
        "data-centers": {
            "skip": {(-1.20, -1.40), (5.40, -2.20), (5.00, 1.10)},
            "suppress": {"pipe_rack", "cooling_tower", "chiller_bank"},
        },
        "recycling": {
            "skip": {(3.60, -1.50)},
            "suppress": set(),
        },
        "closing-platform": {
            "skip": {(-3.60, -1.70), (3.40, -2.00), (6.40, 2.40)},
            "suppress": set(),
        },
    }
    report = {"revision": "r6.1.7", "policy": "R4 context only; R6 owns replacement hero masses", "scenes": {}}
    for scene_id, policy in policies.items():
        scene, removed = build_scene(r4, scene_id, policy["skip"], policy["suppress"])
        path = OUT / f"{scene_id}.glb"
        path.write_bytes(trimesh.exchange.gltf.export_glb(scene, include_normals=True))
        loaded = trimesh.load(path, force="scene", process=False)
        if not isinstance(loaded, trimesh.Scene):
            loaded = trimesh.Scene(loaded)
        triangles = sum(len(g.faces) for g in loaded.geometry.values() if hasattr(g, "faces"))
        report["scenes"][scene_id] = {"file": str(path.relative_to(ROOT)), "triangles": triangles, **removed}
        print(f"R6.1.7 context {scene_id:18s}: {triangles:7d} triangles; removed buildings={removed['buildings']}")
    (OUT / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    print("R6.1.7 non-overlapping context complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
