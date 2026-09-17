#!/usr/bin/env python3
"""Build source-derived runtime assets, preserving the reviewed visual master.

The existing road/vehicle filter remains. R6.1.6 also corrects closed inward
shells on runtime copies, retaining positions, UVs, material names and topology.
"""
from __future__ import annotations
import importlib.util
from pathlib import Path
import struct
import sys
from r616_geometry import repair_closed_inward

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
    "lane_mark", "lane-mark", "road_mark", "road-mark",
    "aisleline", "aisleend",
)


def _is_road_or_vehicle(builder, node: str, mesh) -> bool:
    material = builder.material_name(mesh)
    text = f"{node} {material}".lower().replace(" ", "_")
    return any(token in text for token in ROAD_VEHICLE_TOKENS)


def install_manufacturing_filter(builder) -> None:
    original = builder.select_source_meshes
    def filtered(source, runtime_lod: int):
        selected = original(source, runtime_lod)
        kept, removed = [], []
        repaired = 0
        for node, mesh in selected:
            if _is_road_or_vehicle(builder, node, mesh):
                removed.append((node, builder.material_name(mesh), int(len(mesh.faces))))
                continue
            repaired += int(repair_closed_inward(mesh))
            kept.append((node, mesh))
        print(f"R6.1.6 manufacturing filter lod{runtime_lod}: "
              f"removed={len(removed)} kept={len(kept)} outwardRepaired={repaired}")
        for node, material, triangles in removed[:100]:
            print(f"  removed component node={node} material={material} triangles={triangles}")
        return kept
    builder.select_source_meshes = filtered


def main() -> int:
    compat = load(ROOT / "scripts" / "r61-legacy-compat.py", "r61_render_compat")
    compat._dfd_rgba8 = fixed_dfd_rgba8
    builder = load(ROOT / "scripts" / "build-r61-assets.py", "r61_render_builder")
    builder.load_legacy = lambda: compat
    install_manufacturing_filter(builder)
    sys.argv = [str(ROOT / "scripts" / "build-r61-assets.py")]
    builder.main()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
