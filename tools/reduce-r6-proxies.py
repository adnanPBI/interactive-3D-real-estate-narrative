#!/usr/bin/env python3
"""Build deterministic R6 proxy GLBs directly from the final LOD2 GLBs.

The reducer is deliberately CPU-only and has no OpenGL/X11/EGL/OSMesa/VTK
runtime dependency. It preserves complete source meshes for the most visually
important LOD2 components and removes lower-impact components until the proxy
reaches the configured triangle budget. Because retained meshes are copied
without vertex/UV mutation, material and texture assignments remain valid for
the downstream KTX2 authoring step.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Iterable

import numpy as np
import trimesh

CHAPTERS = (
    "hero-campus",
    "manufacturing",
    "power-generation",
    "data-centers",
    "recycling",
    "closing-platform",
)


def _corners(bounds: np.ndarray) -> np.ndarray:
    lo, hi = bounds
    return np.array(
        [
            [x, y, z]
            for x in (lo[0], hi[0])
            for y in (lo[1], hi[1])
            for z in (lo[2], hi[2])
        ],
        dtype=np.float64,
    )


def _transform_points(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    hom = np.column_stack((points, np.ones(len(points), dtype=np.float64)))
    return (matrix @ hom.T).T[:, :3]


def _geometry_importance(scene: trimesh.Scene, geom_name: str) -> tuple[float, int]:
    mesh = scene.geometry[geom_name]
    triangles = int(len(mesh.faces)) if hasattr(mesh, "faces") else 0
    if triangles <= 0:
        return (0.0, triangles)

    local_bounds = np.asarray(mesh.bounds, dtype=np.float64)
    refs: list[np.ndarray] = []
    instance_count = 0
    for node_name in scene.graph.nodes_geometry:
        transform, node_geom = scene.graph.get(node_name)
        if node_geom != geom_name:
            continue
        instance_count += 1
        refs.append(_transform_points(_corners(local_bounds), np.asarray(transform, dtype=np.float64)))

    if not refs:
        refs = [_corners(local_bounds)]
        instance_count = 1

    points = np.vstack(refs)
    extent = np.maximum(points.max(axis=0) - points.min(axis=0), 1e-9)
    diag = float(np.linalg.norm(extent))
    surface = float(2.0 * (extent[0] * extent[1] + extent[1] * extent[2] + extent[2] * extent[0]))
    volume = float(np.prod(extent))

    # Favour silhouette-carrying shells and spatially important infrastructure,
    # while making very dense detail less likely to survive the proxy tier.
    spatial = diag + math.sqrt(max(surface, 0.0)) + math.cbrt(max(volume, 0.0))
    score = spatial * (1.0 + 0.08 * math.log2(instance_count + 1.0)) / math.sqrt(max(triangles, 1))
    return (score, triangles)


def _select_geometry(scene: trimesh.Scene, ratio: float) -> tuple[set[str], int, int]:
    entries: list[tuple[str, float, int]] = []
    total = 0
    for name in sorted(scene.geometry):
        score, triangles = _geometry_importance(scene, name)
        if triangles <= 0:
            continue
        total += triangles
        entries.append((name, score, triangles))

    if total <= 1 or len(entries) <= 1:
        return ({name for name, _, _ in entries}, total, total)

    target = max(1, min(total - 1, int(math.floor(total * ratio))))
    ranked = sorted(entries, key=lambda item: (-item[1], item[0]))

    keep: set[str] = set()
    kept = 0
    for name, _score, triangles in ranked:
        if kept == 0 or kept + triangles <= target:
            keep.add(name)
            kept += triangles

    # If coarse component granularity undershoots badly, add the smallest
    # remaining components that still fit. This is deterministic and keeps the
    # proxy close to the requested budget without ever reaching LOD2 parity.
    for name, _score, triangles in sorted(
        (entry for entry in entries if entry[0] not in keep),
        key=lambda item: (item[2], item[0]),
    ):
        if kept + triangles <= target:
            keep.add(name)
            kept += triangles

    # Guarantee genuine reduction even for unusual scenes where the largest
    # component alone exceeds the nominal target.
    if kept >= total:
        removable = min((entry for entry in entries if entry[0] in keep), key=lambda item: (item[1], item[0]))
        keep.remove(removable[0])
        kept -= removable[2]

    if not keep:
        largest = max(entries, key=lambda item: (item[2], item[0]))
        keep.add(largest[0])
        kept = largest[2]
        if kept >= total:
            raise RuntimeError("LOD2 scene has no independently removable geometry; cannot build a genuine proxy")

    return keep, kept, total


def _build_proxy_scene(source: trimesh.Scene, keep: set[str]) -> trimesh.Scene:
    proxy = trimesh.Scene(base_frame=source.graph.base_frame)

    # Copy geometry byte-semantically through trimesh objects; retained UVs,
    # materials and texture bindings are untouched for the later KTX2 step.
    for geom_name in sorted(keep):
        proxy.geometry[geom_name] = source.geometry[geom_name].copy()

    for node_name in sorted(source.graph.nodes_geometry, key=str):
        transform, geom_name = source.graph.get(node_name)
        if geom_name not in keep:
            continue
        proxy.graph.update(
            frame_to=node_name,
            frame_from=proxy.graph.base_frame,
            matrix=np.asarray(transform, dtype=np.float64),
            geometry=geom_name,
        )

    proxy.metadata = dict(source.metadata or {})
    proxy.metadata["r6ProxySource"] = "LOD2"
    proxy.metadata["r6ProxyReducer"] = "deterministic-component-cull-v1"
    return proxy


def _triangle_count(scene: trimesh.Scene) -> int:
    return sum(int(len(mesh.faces)) for mesh in scene.geometry.values() if hasattr(mesh, "faces"))


def reduce_one(lod2: Path, proxy_path: Path, ratio: float) -> dict[str, object]:
    loaded = trimesh.load(lod2, force="scene", process=False)
    if not isinstance(loaded, trimesh.Scene):
        loaded = trimesh.Scene(loaded)

    keep, selected_triangles, lod2_triangles = _select_geometry(loaded, ratio)
    if lod2_triangles <= 0:
        raise RuntimeError(f"{lod2}: LOD2 has no triangles")

    proxy_scene = _build_proxy_scene(loaded, keep)
    proxy_triangles = _triangle_count(proxy_scene)
    if proxy_triangles != selected_triangles:
        raise RuntimeError(
            f"{lod2.name}: reducer accounting mismatch: selected={selected_triangles}, exported-scene={proxy_triangles}"
        )
    if not (0 < proxy_triangles < lod2_triangles):
        raise RuntimeError(
            f"{lod2.name}: expected 0 < proxy triangles < LOD2 triangles, got {proxy_triangles} vs {lod2_triangles}"
        )

    proxy_path.parent.mkdir(parents=True, exist_ok=True)
    proxy_scene.export(proxy_path, file_type="glb")

    # Reload the written GLB: the acceptance rule is based on the artifact, not
    # an in-memory estimate.
    verify = trimesh.load(proxy_path, force="scene", process=False)
    if not isinstance(verify, trimesh.Scene):
        verify = trimesh.Scene(verify)
    written_triangles = _triangle_count(verify)
    if written_triangles >= lod2_triangles:
        raise RuntimeError(
            f"{proxy_path.name}: written proxy is not reduced: proxy={written_triangles}, lod2={lod2_triangles}"
        )

    return {
        "lod2": lod2.name,
        "proxy": proxy_path.name,
        "lod2Triangles": lod2_triangles,
        "proxyTriangles": written_triangles,
        "ratio": round(written_triangles / lod2_triangles, 6),
        "keptGeometries": len(keep),
        "sourceGeometries": len(loaded.geometry),
        "source": "LOD2",
    }


def _paths(root: Path, chapters: Iterable[str]) -> Iterable[tuple[str, Path, Path]]:
    for chapter in chapters:
        yield chapter, root / f"{chapter}-lod2.glb", root / f"{chapter}-proxy.glb"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("public/models/r6"))
    parser.add_argument("--ratio", type=float, default=0.55)
    args = parser.parse_args()
    if not (0.10 <= args.ratio < 1.0):
        parser.error("--ratio must be >= 0.10 and < 1.0")

    root = args.root.resolve()
    report: list[dict[str, object]] = []
    for chapter, lod2, proxy in _paths(root, CHAPTERS):
        if not lod2.exists():
            raise FileNotFoundError(f"Missing final LOD2 source for {chapter}: {lod2}")
        item = reduce_one(lod2, proxy, args.ratio)
        report.append(item)
        print(
            f"proxy {chapter:18s} LOD2={item['lod2Triangles']:7d} -> "
            f"proxy={item['proxyTriangles']:7d} ratio={item['ratio']:.3f} "
            f"geometries={item['keptGeometries']}/{item['sourceGeometries']}"
        )

    manifest = root / "proxy-reduction.json"
    manifest.write_text(json.dumps({"version": 1, "targetRatio": args.ratio, "chapters": report}, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
