#!/usr/bin/env python3
"""Run the canonical R6.1 builder against the normalized R6 compatibility API.

This launcher is intentionally tiny: it leaves build-r61-assets.py untouched and
replaces only its legacy-generator loader for Render's normalized source tree.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
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


def main() -> int:
    compat = load(ROOT / "scripts" / "r61-legacy-compat.py", "r61_render_compat")
    builder = load(ROOT / "scripts" / "build-r61-assets.py", "r61_render_builder")
    builder.load_legacy = lambda: compat
    # The ordinary Render build intentionally uses development KTX2 output.
    # Release/Basis encoding remains a separate audited production gate.
    sys.argv = [str(ROOT / "scripts" / "build-r61-assets.py")]
    builder.main()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
