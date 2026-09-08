#!/usr/bin/env python3
"""Idempotent repair for bootstrap/materialized R6 source.

Besides current Three/TypeScript compatibility, this helper hardens the R6
asset-authoring command so the final proxy GLBs are deterministically rebuilt
from the final LOD2 GLBs before downstream KTX2 encoding. This deliberately
avoids any display-server or GPU dependency.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "components" / "experience" / "R6HeroAsset.tsx"
GENERATOR = ROOT / "scripts" / "generate-r6-assets.py"
PACKAGE = ROOT / "package.json"
REDUCER_COMMAND = "python3 tools/reduce-r6-proxies.py --root public/models/r6 --ratio 0.55"


def repair_runtime_source() -> int:
    if not TARGET.exists():
        print(f"R6 compatibility target not present yet: {TARGET.relative_to(ROOT)}")
        return 0

    text = TARGET.read_text(encoding="utf-8")
    original = text
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
    text = re.sub(
        r"\bgl\.samples\b",
        "(gl.getContext().getContextAttributes()?.antialias ? 4 : 0)",
        text,
    )

    for pattern in [
        r"await\s+gl\.compileAsync\([\s\S]*?\);",
        r"void\s+gl\.compileAsync\([\s\S]*?\);",
        r"gl\.compileAsync\([\s\S]*?\);",
    ]:
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


def repair_asset_pipeline() -> int:
    if not PACKAGE.exists():
        print("ERROR: package.json is missing", file=sys.stderr)
        return 4

    package = json.loads(PACKAGE.read_text(encoding="utf-8"))
    scripts = package.setdefault("scripts", {})
    command = scripts.get("assets:r6")
    if not command:
        print("ERROR: R6 source patch did not define npm script assets:r6", file=sys.stderr)
        return 5

    if REDUCER_COMMAND not in command:
        encoder = "node scripts/encode-r6-ktx2.mjs"
        if encoder in command:
            command = command.replace(encoder, f"{REDUCER_COMMAND} && {encoder}", 1)
        else:
            # Preserve every bootstrap command and append the reducer. The
            # generated source currently exposes the KTX2 encoder separately;
            # the diagnostic below makes any future pipeline change visible.
            command = f"{command} && {REDUCER_COMMAND}"
        scripts["assets:r6"] = command
        PACKAGE.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")
        print("Hardened npm assets:r6: final proxy source is final LOD2.")
    else:
        print("npm assets:r6 already contains the final LOD2 proxy reducer.")

    print(f"assets:r6 command: {scripts['assets:r6']}")

    # The generator is intentionally left semantically untouched on bootstrap;
    # the reducer is part of the generator command and therefore runs after the
    # generator emits final LOD2 and before KTX2 encoding. Once the source is
    # materialized on main it can be edited directly without guessing at patch
    # internals.
    if GENERATOR.exists():
        print(f"R6 generator materialized: {GENERATOR.relative_to(ROOT)} ({GENERATOR.stat().st_size} bytes)")
    return 0


def main() -> int:
    status = repair_runtime_source()
    if status:
        return status
    return repair_asset_pipeline()


if __name__ == "__main__":
    raise SystemExit(main())
