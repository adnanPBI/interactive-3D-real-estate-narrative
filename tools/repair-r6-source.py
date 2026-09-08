#!/usr/bin/env python3
"""Surgical compatibility repair for generated/bootstrap R6 source.

The R6 source path is produced later in the asset-authoring pipeline on the
first materialization run. This helper is intentionally idempotent: it is safe
to call both before and after asset generation.
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "components" / "experience" / "R6HeroAsset.tsx"


def main() -> int:
    if not TARGET.exists():
        print(f"R6 compatibility target not present yet: {TARGET.relative_to(ROOT)}")
        return 0

    text = TARGET.read_text(encoding="utf-8")
    original = text

    # TS7006: annotate only a bare parameter named `media`.
    text = re.sub(
        r"\(\s*media\s*\)\s*=>",
        "(media: MediaQueryList | MediaQueryListEvent) =>",
        text,
    )
    text = re.sub(
        r"function\s+([A-Za-z_$][A-Za-z0-9_$]*)\(\s*media\s*\)",
        r"function \1(media: MediaQueryList | MediaQueryListEvent)",
        text,
    )

    # TS2339: WebGLRenderer has no public `.samples`; query the actual context.
    text = re.sub(
        r"\bgl\.samples\b",
        "(gl.getContext().getContextAttributes()?.antialias ? 4 : 0)",
        text,
    )

    # TS2345: the bootstrap warm-up used an Object3D[] where current Three
    # expects a Scene. Shader precompile is optional; omit this warm-up rather
    # than passing an invalid runtime object or suppressing the type system.
    patterns = [
        r"await\s+gl\.compileAsync\([\s\S]*?\);",
        r"void\s+gl\.compileAsync\([\s\S]*?\);",
        r"gl\.compileAsync\([\s\S]*?\);",
    ]
    for pattern in patterns:
        next_text, count = re.subn(
            pattern,
            "Promise.resolve(); // R6: optional shader warm-up omitted for renderer compatibility",
            text,
            count=1,
        )
        text = next_text
        if count or "compileAsync(" not in text:
            break

    unresolved = []
    if "gl.samples" in text:
        unresolved.append("gl.samples")
    if "gl.compileAsync(" in text:
        unresolved.append("gl.compileAsync")
    if re.search(r"\(\s*media\s*\)\s*=>", text):
        unresolved.append("untyped media callback")
    if unresolved:
        print("ERROR: unresolved R6 bootstrap incompatibilities: " + ", ".join(unresolved), file=sys.stderr)
        return 3

    if text != original:
        TARGET.write_text(text, encoding="utf-8")
        print(f"Repaired {TARGET.relative_to(ROOT)} for current TypeScript/Three typings.")
    else:
        print(f"No R6 source repair needed for {TARGET.relative_to(ROOT)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
