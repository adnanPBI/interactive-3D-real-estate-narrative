#!/usr/bin/env python3
"""Build source-derived R6.1.7 runtime assets without stacked/coplanar shapes."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import struct
import sys
import numpy as np
import trimesh
from r616_geometry import repair_closed_inward
from r617_manufacturing import is_legacy_roof_artifact, enhance_runtime

ROOT = Path(__file__).resolve().parents[1]


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def fixed_dfd_rgba8(srgb: bool) -> bytes:
    samples = []
    for bit_offset, channel in ((0, 0), (8, 1), (16, 2), (24, 15)):
        samples.append(struct.pack("<HBB4BII", bit_offset, 7, channel, 0, 0, 0, 0, 0, 255))
    descriptor_size = 24 + len(samples) * 16
    total_size = 4 + descriptor_size
    header = struct.pack(
        "<IHHHH8B8B", total_size, 0, 0, 2, descriptor_size,
        1, 1, 2 if srgb else 1, 0, 0, 0, 0, 0,
        4, 0, 0, 0, 0, 0, 0, 0,
    )
    return header + b"".join(samples)


ROAD_VEHICLE_TOKENS = (
    "road", "asphalt", "driveway", "street", "parking", "parked",
    "car", "truck", "vehicle", "forklift", "servicecart",
    "lane_mark", "lane-mark", "road_mark", "road-mark", "aisleline", "aisleend",
)


def _is_road_or_vehicle(builder, node: str, mesh) -> bool:
    material = builder.material_name(mesh)
    text = f"{node} {material}".lower().replace(" ", "_")
    return any(token in text for token in ROAD_VEHICLE_TOKENS)


def install_manufacturing_filter(builder) -> None:
    original = builder.select_source_meshes
    def filtered(source, runtime_lod: int):
        selected = original(source, runtime_lod)
        scene_max_y = max(float(mesh.bounds[1][1]) for _node, mesh in selected)
        kept, removed = [], []
        repaired = 0
        for node, mesh in selected:
            reason = None
            if _is_road_or_vehicle(builder, node, mesh):
                reason = "road-or-vehicle"
            elif runtime_lod < 2 and is_legacy_roof_artifact(node, mesh, scene_max_y):
                reason = "marked-roof-artifact"
            if reason:
                removed.append((node, builder.material_name(mesh), int(len(mesh.faces)), reason))
                continue
            repaired += int(repair_closed_inward(mesh))
            kept.append((node, mesh))
        print(f"R6.1.7 manufacturing filter lod{runtime_lod}: removed={len(removed)} kept={len(kept)} outwardRepaired={repaired}")
        for node, material, triangles, reason in removed[:120]:
            print(f"  removed {reason} node={node} material={material} triangles={triangles}")
        return kept
    builder.select_source_meshes = filtered


def install_manufacturing_enhancer(builder) -> None:
    original = builder.merge_runtime_by_material
    def enhanced(selected, out: Path):
        triangles, bytes_, draws, components = original(selected, out)
        lod = {"lod0": 0, "lod1": 1, "lod2": 2}.get(out.stem)
        if lod is None:
            return triangles, bytes_, draws, components
        loaded = trimesh.load(out, force="scene", process=False)
        scene = loaded if isinstance(loaded, trimesh.Scene) else trimesh.Scene(loaded)
        added = enhance_runtime(scene, lod)
        if added:
            out.write_bytes(trimesh.exchange.gltf.export_glb(scene, include_normals=True))
            check = trimesh.load(out, force="scene", process=False)
            check_scene = check if isinstance(check, trimesh.Scene) else trimesh.Scene(check)
            triangles = sum(int(len(mesh.faces)) for mesh in check_scene.geometry.values() if hasattr(mesh, "faces"))
            bytes_ = out.stat().st_size
            draws = len(check_scene.geometry)
            components += added
            bounds = np.asarray(check_scene.bounds, dtype=float)
            if not np.isfinite(bounds).all():
                raise RuntimeError("R6.1.7 manufacturing enhancement produced invalid bounds")
            print(f"R6.1.7 manufacturing enhancement {out.stem}: addedParts={added} triangles={triangles} draws={draws}")
        return triangles, bytes_, draws, components
    builder.merge_runtime_by_material = enhanced


def main() -> int:
    compat = load(ROOT / "scripts" / "r61-legacy-compat.py", "r61_render_compat")
    compat._dfd_rgba8 = fixed_dfd_rgba8
    builder = load(ROOT / "scripts" / "build-r61-assets.py", "r61_render_builder")
    builder.load_legacy = lambda: compat
    install_manufacturing_filter(builder)
    install_manufacturing_enhancer(builder)
    sys.argv = [str(ROOT / "scripts" / "build-r61-assets.py")]
    builder.main()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
