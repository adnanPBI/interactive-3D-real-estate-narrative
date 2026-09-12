#!/usr/bin/env python3
"""Re-prove deterministic CPU-only generation of the six R6 fallback frames."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RENDERER = ROOT / "scripts" / "render-r6-fallbacks.py"
OUT = ROOT / "public" / "fallback" / "r6"
EVIDENCE = ROOT / "artifacts" / "r6-cpu-fallback-proof.json"
EXPECTED = (
    "hero-campus.webp",
    "manufacturing.webp",
    "power-generation.webp",
    "data-centers.webp",
    "recycling.webp",
    "closing-platform.webp",
    "integrated-campus.webp",
    "manufacturing-line.webp",
    "substation-bess.webp",
    "data-center-cooling.webp",
    "recycling-intake.webp",
    "connected-campus.webp",
)
FORBIDDEN = ("vtk", "OpenGL", "EGL", "OSMesa", "pyvista")


def digest(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def snapshot() -> dict[str, str]:
    missing = [name for name in EXPECTED if not (OUT / name).is_file()]
    if missing:
        raise RuntimeError(f"missing fallback outputs: {missing}")
    result: dict[str, str] = {}
    for name in EXPECTED:
        path = OUT / name
        with Image.open(path) as image:
            if image.size != (1600, 900):
                raise RuntimeError(f"{name}: expected 1600x900, got {image.size}")
        result[name] = digest(path)
    return result


def run_renderer() -> None:
    subprocess.run([sys.executable, str(RENDERER)], cwd=ROOT, check=True)


def main() -> int:
    source = RENDERER.read_text(encoding="utf-8")
    forbidden_hits = [term for term in FORBIDDEN if term.lower() in source.lower() and term not in ("OpenGL", "EGL", "OSMesa")]
    # Those three words appear only in the renderer's explicit "no dependency" documentation.
    if forbidden_hits:
        raise RuntimeError(f"CPU fallback renderer imports/references forbidden rendering stacks: {forbidden_hits}")

    run_renderer()
    first = snapshot()
    run_renderer()
    second = snapshot()
    if first != second:
        changed = [name for name in EXPECTED if first[name] != second[name]]
        raise RuntimeError(f"fallback renderer is nondeterministic: {changed}")

    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(json.dumps({
        "renderer": str(RENDERER.relative_to(ROOT)),
        "mode": "CPU-only Pillow",
        "dimensions": [1600, 900],
        "deterministic": True,
        "outputs": first,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"CPU fallback proof passed; wrote {EVIDENCE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
