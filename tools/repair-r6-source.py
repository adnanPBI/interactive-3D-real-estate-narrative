#!/usr/bin/env python3
"""Surgical compatibility repair for generated/bootstrap R6 source.

The R6 source path is produced later in the asset-authoring pipeline on the
first materialization run. This helper is intentionally idempotent: it is safe
to call both before and after asset generation.

It also hardens the R6 asset generator so its final proxy artifacts are rebuilt
deterministically from the final LOD2 GLBs before downstream KTX2 encoding.
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "components" / "experience" / "R6HeroAsset.tsx"
GENERATOR = ROOT / "scripts" / "generate-r6-assets.py"
PROXY_MARKER = "R6_TRUE_PROXY_REDUCTION"


def repair_runtime_source() -> int:
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


def repair_generator_proxy_derivation() -> int:
    if not GENERATOR.exists():
        print(f"R6 generator not present yet: {GENERATOR.relative_to(ROOT)}")
        return 0

    text = GENERATOR.read_text(encoding="utf-8")
    if PROXY_MARKER in text:
        print(f"R6 generator already derives proxies from LOD2: {GENERATOR.relative_to(ROOT)}")
        return 0

    helper = '''\n\ndef _r6_generate_true_proxies_from_lod2() -> None:\n    # R6_TRUE_PROXY_REDUCTION: final proxy artifacts are derived from final LOD2.\n    # Keep this call inside the generator, before the package pipeline performs\n    # KTX2 encoding, so proxy materials/textures are encoded exactly once.\n    import subprocess as _subprocess\n    import sys as _sys\n    from pathlib import Path as _Path\n\n    _root = _Path(__file__).resolve().parents[1]\n    _subprocess.run(\n        [\n            _sys.executable,\n            str(_root / "tools" / "reduce-r6-proxies.py"),\n            "--root",\n            str(_root / "public" / "models" / "r6"),\n            "--ratio",\n            "0.55",\n        ],\n        check=True,\n    )\n'''

    guard = re.search(
        r'(?m)^if __name__ == ["\\\']__main__["\\\']:\s*\n(?P<indent>[ \t]+)(?P<call>(?:raise\s+SystemExit\(main\(\)\)|main\(\)))\s*$',
        text,
    )
    if not guard:
        print(
            "ERROR: unable to locate generate-r6-assets.py main guard for proxy hardening",
            file=sys.stderr,
        )
        return 4

    indent = guard.group("indent")
    call = guard.group("call")
    if call.startswith("raise"):
        replacement = (
            helper
            + '\nif __name__ == "__main__":\n'
            + f"{indent}_r6_status = main()\n"
            + f"{indent}_r6_generate_true_proxies_from_lod2()\n"
            + f"{indent}raise SystemExit(_r6_status)"
        )
    else:
        replacement = (
            helper
            + '\nif __name__ == "__main__":\n'
            + f"{indent}main()\n"
            + f"{indent}_r6_generate_true_proxies_from_lod2()"
        )

    text = text[: guard.start()] + replacement + text[guard.end() :]
    GENERATOR.write_text(text, encoding="utf-8")
    print(f"Hardened {GENERATOR.relative_to(ROOT)}: final proxy source is final LOD2.")
    return 0


def main() -> int:
    runtime_status = repair_runtime_source()
    if runtime_status:
        return runtime_status
    return repair_generator_proxy_derivation()


if __name__ == "__main__":
    raise SystemExit(main())
