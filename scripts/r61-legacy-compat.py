#!/usr/bin/env python3
"""Compatibility bridge between the R6.1 asset builder and the checked-in R6 V2 recipes.

The remote repository was normalized from an older R6 generator while
``build-r61-assets.py`` came from the R6.1 line.  That left the R6.1 builder
expecting helper APIs that the older generator did not expose.  This module
adapts the existing deterministic R6 recipes without changing their source
modules, while keeping Manufacturing on its authoritative visual-master path.
"""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from functools import partial
from hashlib import sha256
import importlib
import importlib.util
import json
from pathlib import Path
import struct
import sys

import numpy as np
from PIL import Image
import trimesh

ROOT = Path(__file__).resolve().parents[1]
AUTHORING = ROOT / "assets-source" / "r6" / "authoring"
PROXY_REDUCER = "deterministic-component-cull-v1"
PROXY_TARGET_RATIO = 0.55


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


core = _load(ROOT / "scripts" / "generate-r6-assets.py", "r61_r6_v2_core")
reducer = _load(ROOT / "tools" / "reduce-r6-proxies.py", "r61_proxy_reducer")
fallbacks = _load(ROOT / "scripts" / "render-r6-fallbacks.py", "r61_fallback_renderer")

if str(AUTHORING) not in sys.path:
    sys.path.insert(0, str(AUTHORING))


@dataclass
class AuthoredRecipe:
    scene: trimesh.Scene
    authored_components: tuple[str, ...]


# Semantic runtime id -> (legacy context id, bespoke authoring module)
RECIPES = OrderedDict(
    [
        ("integrated-campus", ("hero-campus", "hero_integrated")),
        ("manufacturing-line", ("manufacturing", "hero_manufacturing")),
        ("substation-bess", ("power-generation", "hero_generation")),
        ("data-center-cooling", ("data-centers", "hero_datacenter")),
        ("recycling-intake", ("recycling", "hero_recycling")),
        ("connected-campus", ("closing-platform", "hero_connected")),
    ]
)


def _context_path(legacy_id: str, lod: str) -> Path:
    if lod == "lod0":
        return ROOT / "public" / "models" / "r5" / "high" / f"{legacy_id}.glb"
    if lod == "lod1":
        return ROOT / "public" / "models" / "r5" / "medium" / f"{legacy_id}.glb"
    # The original R6 workflow materialized Stage 3 from R5 medium before R6
    # authoring.  Render does not persist that temporary directory, so use the
    # same R5-medium artifact directly when Stage 3 is absent.
    staged = ROOT / "public" / "models" / "stage3" / f"{legacy_id}.glb"
    if staged.is_file():
        return staged
    return ROOT / "public" / "models" / "r5" / "medium" / f"{legacy_id}.glb"


def _build_recipe(semantic_id: str, legacy_id: str, module_name: str, level: int) -> AuthoredRecipe:
    if level not in (0, 1, 2):
        raise ValueError(level)
    lod = ("lod0", "lod1", "lod2")[level]
    base_path = _context_path(legacy_id, lod)
    if not base_path.is_file():
        raise FileNotFoundError(f"Missing R6 context for {semantic_id}/{lod}: {base_path}")
    base = trimesh.load(base_path, force="scene", process=False)
    if not isinstance(base, trimesh.Scene):
        base = trimesh.Scene(base)
    module = importlib.import_module(module_name)
    detail = module.build(core.ctx, lod)
    if not isinstance(detail, trimesh.Scene):
        detail = trimesh.Scene(detail)
    components = tuple(sorted(str(name) for name in detail.geometry.keys()))
    combined = core.combine(base, detail, f"r61-{semantic_id}-{lod}")
    return AuthoredRecipe(combined, components)


def _builder(semantic_id: str, legacy_id: str, module_name: str, level: int) -> AuthoredRecipe:
    return _build_recipe(semantic_id, legacy_id, module_name, level)


BUILDERS = OrderedDict(
    (
        semantic_id,
        partial(_builder, semantic_id, legacy_id, module_name),
    )
    for semantic_id, (legacy_id, module_name) in RECIPES.items()
)


def export_scene(authored: AuthoredRecipe | trimesh.Scene, out: Path) -> tuple[int, int]:
    scene = authored.scene if isinstance(authored, AuthoredRecipe) else authored
    if not isinstance(scene, trimesh.Scene):
        scene = trimesh.Scene(scene)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(trimesh.exchange.gltf.export_glb(scene, include_normals=True))
    loaded = trimesh.load(out, force="scene", process=False)
    if not isinstance(loaded, trimesh.Scene):
        loaded = trimesh.Scene(loaded)
    triangles = sum(int(len(mesh.faces)) for mesh in loaded.geometry.values() if hasattr(mesh, "faces"))
    return triangles, out.stat().st_size


def _scene_bounds(path: Path) -> list[list[float]]:
    scene = trimesh.load(path, force="scene", process=False)
    if not isinstance(scene, trimesh.Scene):
        scene = trimesh.Scene(scene)
    bounds = np.asarray(scene.bounds, dtype=np.float64)
    if bounds.shape != (2, 3) or not np.isfinite(bounds).all():
        raise RuntimeError(f"Invalid bounds for {path}")
    return bounds.tolist()


def derive_proxy_from_lod2(lod2: Path, proxy: Path) -> dict[str, object]:
    result = dict(reducer.reduce_one(lod2, proxy, PROXY_TARGET_RATIO))
    source_bounds = _scene_bounds(lod2)
    proxy_bounds = _scene_bounds(proxy)
    delta = float(np.max(np.abs(np.asarray(source_bounds) - np.asarray(proxy_bounds))))
    result.update(
        {
            "algorithm": PROXY_REDUCER,
            "targetRatio": PROXY_TARGET_RATIO,
            "sourceSha256": sha256(lod2.read_bytes()).hexdigest(),
            "proxySha256": sha256(proxy.read_bytes()).hexdigest(),
            "sourceBounds": source_bounds,
            "proxyBounds": proxy_bounds,
            "boundsMaxAbsDelta": delta,
        }
    )
    return result


# Minimal deterministic hero-wide texture set used only by the five legacy R6
# recipes.  Authored GLB maps remain first priority at runtime; these maps fill
# missing material slots and preserve the R6 external-texture contract.
def authored_texture(hero: str, index: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    size = 256
    y, x = np.mgrid[0:size, 0:size]
    palettes = [
        (186, 190, 184), (190, 185, 174), (161, 171, 174),
        (172, 180, 178), (155, 161, 151), (176, 181, 175),
    ]
    r, g, b = palettes[index % len(palettes)]
    grain = (((x * 13 + y * 7 + index * 29) % 17) - 8).astype(np.int16)
    base = np.empty((size, size, 4), dtype=np.uint8)
    for channel, value in enumerate((r, g, b)):
        base[..., channel] = np.clip(value + grain, 0, 255).astype(np.uint8)
    base[..., 3] = 255

    normal = np.empty_like(base)
    normal[..., 0] = 128
    normal[..., 1] = 128
    normal[..., 2] = 255
    normal[..., 3] = 255

    orm = np.empty_like(base)
    orm[..., 0] = 245  # AO
    orm[..., 1] = 176 + (index % 3) * 12  # roughness
    orm[..., 2] = 48 + (index % 2) * 24   # metalness
    orm[..., 3] = 255
    return base, normal, orm


KTX2_ID = b"\xABKTX 20\xBB\r\n\x1A\n"
VK_FORMAT_R8G8B8A8_UNORM = 37
VK_FORMAT_R8G8B8A8_SRGB = 43


def _dfd_rgba8(srgb: bool) -> bytes:
    samples = []
    for bit_offset, channel in ((0, 0), (8, 1), (16, 2), (24, 15)):
        samples.append(struct.pack("<HBB4BII", bit_offset, 7, channel, 0, 0, 0, 0, 0, 255))
    descriptor_size = 24 + len(samples) * 16
    total_size = 4 + descriptor_size
    return struct.pack(
        "<IHHHH8B8B",
        total_size, 0, 0, 2, descriptor_size,
        1, 1, 2 if srgb else 1, 0, 0, 0, 0,
        0, 4, 0, 0, 0, 0, 0, 0,
    ) + b"".join(samples)


def _mips(arr: np.ndarray) -> list[np.ndarray]:
    image = Image.fromarray(arr, "RGBA")
    levels = [np.asarray(image, dtype=np.uint8)]
    while image.width > 1 or image.height > 1:
        image = image.resize((max(1, image.width // 2), max(1, image.height // 2)), Image.Resampling.LANCZOS)
        levels.append(np.asarray(image, dtype=np.uint8))
    return levels


def write_ktx2(path: Path, arr: np.ndarray, srgb: bool = False) -> None:
    levels = _mips(arr)
    height, width, channels = levels[0].shape
    if channels != 4:
        raise RuntimeError("RGBA texture expected")
    dfd = _dfd_rgba8(srgb)
    header_len = 68
    level_index_len = 24 * len(levels)
    dfd_offset = len(KTX2_ID) + header_len + level_index_len
    kvd_offset = dfd_offset + len(dfd)
    cursor = (kvd_offset + 3) // 4 * 4
    indices: list[tuple[int, int, int]] = []
    payload = bytearray()
    for level in levels:
        raw = level.tobytes(order="C")
        absolute = cursor + len(payload)
        aligned = (absolute + 3) // 4 * 4
        if aligned > absolute:
            payload.extend(b"\x00" * (aligned - absolute))
        indices.append((aligned, len(raw), len(raw)))
        payload.extend(raw)
    header = struct.pack(
        "<9I4I2Q",
        VK_FORMAT_R8G8B8A8_SRGB if srgb else VK_FORMAT_R8G8B8A8_UNORM,
        1, width, height, 0, 0, 1, len(levels), 0,
        dfd_offset, len(dfd), kvd_offset, 0, 0, 0,
    )
    index = b"".join(struct.pack("<3Q", *entry) for entry in indices)
    prefix = KTX2_ID + header + index + dfd
    prefix += b"\x00" * (cursor - len(prefix))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(prefix + payload)


def draw_fallback(hero: str, index: int, out: Path) -> None:
    image = fallbacks.draw_frame(index)
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, "WEBP", quality=92, method=6)


if __name__ == "__main__":
    print(json.dumps({"builders": list(BUILDERS), "proxyReducer": PROXY_REDUCER, "proxyTargetRatio": PROXY_TARGET_RATIO}, indent=2))
