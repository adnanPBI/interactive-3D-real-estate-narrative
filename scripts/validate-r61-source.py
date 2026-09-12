#!/usr/bin/env python3
"""Validate the authoritative R6.1 Manufacturing visual-master source.

Production R6.1 must never silently fall back to a generated/legacy Manufacturing
hero. The checked-in source-manifest and visual-master GLB are the source of
truth consumed by build-r61-assets.py.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets-source" / "r6" / "heroes" / "manufacturing-line"
MANIFEST = SOURCE / "source-manifest.json"
MASTER = SOURCE / "visual-master.glb"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-approval", action="store_true")
    args = parser.parse_args()

    missing = [str(p.relative_to(ROOT)) for p in (MANIFEST, MASTER) if not p.is_file()]
    if missing:
        print("R6.1 SOURCE GATE FAILED: authoritative Manufacturing source package is incomplete.", file=sys.stderr)
        for path in missing:
            print(f"  missing: {path}", file=sys.stderr)
        print("Do not generate or substitute a replacement visual master in CI; restore the reviewed canonical source package.", file=sys.stderr)
        return 2

    try:
        payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"R6.1 SOURCE GATE FAILED: invalid source-manifest.json: {exc}", file=sys.stderr)
        return 2

    errors: list[str] = []
    if payload.get("pipelineAuthoritative") is not True:
        errors.append("pipelineAuthoritative must be true")
    expected = payload.get("sourceSha256")
    actual = sha256(MASTER)
    if not isinstance(expected, str) or expected.lower() != actual:
        errors.append(f"visual-master SHA-256 mismatch: manifest={expected!r} actual={actual}")
    if not payload.get("status"):
        errors.append("status is required")
    if not payload.get("uvPolicy"):
        errors.append("uvPolicy is required")
    if args.require_approval and payload.get("clientApproved") is not True:
        errors.append("clientApproved must be true for a release build")

    if errors:
        print("R6.1 SOURCE GATE FAILED:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(f"R6.1 source gate passed: {MASTER.relative_to(ROOT)} sha256={actual}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
