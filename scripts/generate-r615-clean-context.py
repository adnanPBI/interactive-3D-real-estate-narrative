#!/usr/bin/env python3
"""Rebuild the R5 context used by R6.1.5 without roads, vehicles or static turbines.

The five legacy-context R6 heroes inherit R5 GLBs. Earlier R6 authoring stopped
adding roads/turbines, but those objects were still baked into the inherited R4
and R5 context. This build-time adapter suppresses them before R5 materializes
its high/medium GLBs, preserving buildings, solar, plant, landscaping and PBR
materials while leaving turbine motion exclusively to the WebGL runtime.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
R5_PATH = ROOT / "scripts" / "generate-r5-hybrid-assets.py"


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


def main() -> int:
    r5 = load(R5_PATH, "r615_clean_r5")

    # R4 base scenes reference these names through their module globals, so
    # replacing them here removes the baked infrastructure without editing the
    # reviewed scene layout or material system.
    for name in ("road", "turbine", "parking_car", "truck", "forklift"):
        if hasattr(r5.r4, name):
            setattr(r5.r4, name, no_op)

    # R5 high-tier details add their own smoother turbine assemblies.
    r5.high_turbine = no_op

    print("R6.1.5 clean-context policy: roads=off vehicles=off static-turbines=off")
    r5.main()
    print("R6.1.5 clean-context rebuild complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
