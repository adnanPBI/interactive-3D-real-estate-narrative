#!/usr/bin/env python3
"""Run the canonical R6.1 builder against the normalized R6 compatibility API.

This launcher leaves build-r61-assets.py untouched and injects only the
compatibility API required by Render's normalized source tree.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
import struct
import sys

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
        "<IHHHH8B8B",
        total_size, 0, 0, 2, descriptor_size,
        1, 1, 2 if srgb else 1, 0, 0, 0, 0, 0,
        4, 0, 0, 0, 0, 0, 0, 0,
    )
    return header + b"".join(samples)


def main() -> int:
    compat = load(ROOT / "scripts" / "r61-legacy-compat.py", "r61_render_compat")
    # Normalize the dev KTX2 DFD header to the same 21-field structure used by
    # the audited R6.1 texture encoder. This changes no source geometry.
    compat._dfd_rgba8 = fixed_dfd_rgba8
    builder = load(ROOT / "scripts" / "build-r61-assets.py", "r61_render_builder")
    builder.load_legacy = lambda: compat
    # The ordinary Render build intentionally uses development KTX2 output.
    # Release/Basis encoding remains a separate audited production gate.
    sys.argv = [str(ROOT / "scripts" / "build-r61-assets.py")]
    builder.main()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
