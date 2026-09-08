#!/usr/bin/env python3
"""Surgical compatibility repair for the one-time R6 source bootstrap.

The R6 patch was authored against an earlier Three/@react-three/fiber typing
surface. This script keeps runtime intent unchanged while repairing only the
three known incompatibilities before the patch is materialized on main:
  * implicit `media` callback parameter
  * obsolete `WebGLRenderer.samples` access
  * array-based shader precompile call (precompile is optional warm-up only)

It is intentionally idempotent and fails if the expected file is absent.
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "components" / "experience" / "R6HeroAsset.tsx"


def main() -> int:
    if not TARGET.exists():
        print(f"ERROR: bootstrap did not create {TARGET.relative_to(ROOT)}", file=sys.stderr)
        return 2

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

    # TS2345: older bootstrap tried to compile an Object3D[] as a Scene.
    # Shader precompile is a non-functional warm-up optimization; removing that
    # call is safer than lying to the type system or passing an invalid runtime
    # object. First handle awaited/void calls, then simple standalone calls.
    patterns = [
        r"await\s+gl\.compileAsync\([\s\S]*?\);",
        r"void\s+gl\.compileAsync\([\s\S]*?\);",
        r"gl\.compileAsync\([\s\S]*?\);",
    ]
    for pattern in patterns:
        text = re.sub(pattern, "Promise.resolve(); // R6: optional shader warm-up omitted for renderer compatibility", text, count=1)
        if "compileAsync(" not in text:
            break

    # Guardrails: the two obsolete constructs must be gone. An unresolved bare
    # media arrow is also a deterministic failure rather than silently shipping.
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
