#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
qa = root / "scripts" / "acceptance_qa.py"
css = root / "app" / "globals.css"

text = qa.read_text(encoding="utf-8")
replacements = [
    (
        '            {"id": chapter, "index": index},\n            timeout=5000,',
        '            arg={"id": chapter, "index": index},\n            timeout=5000,',
    ),
    (
        '                            if (delta > 0 && delta < 250) deltas.push(delta);',
        '                            if (delta > 0) deltas.push(delta);',
    ),
]
for old, new in replacements:
    if old not in text and new not in text:
        raise SystemExit(f"acceptance patch context missing: {old[:80]}")
    text = text.replace(old, new, 1)

needle = '            semantic = semantic_snapshot(page, chapter)\n'
insert = '''            semantic = semantic_snapshot(page, chapter)\n            hero_state = page.evaluate("() => window.__CONVALT_ACTIVE_HERO__ || null")\n            expected_hero = list(R6_FALLBACKS.values())[index].split("/")[-1].replace(".webp", "")\n            semantic["heroState"] = hero_state\n            semantic["heroMatches"] = bool(hero_state and hero_state.get("hero") == expected_hero and hero_state.get("ready") is True)\n            semantic["pass"] = bool(semantic["pass"] and semantic["heroMatches"])\n'''
if 'semantic["heroMatches"]' not in text:
    if needle not in text:
        raise SystemExit("six-chapter semantic patch context missing")
    text = text.replace(needle, insert, 1)
qa.write_text(text, encoding="utf-8")

block = '''\n/* R6.1.2 patch: accessible overlay close/focus/scroll containment. */\n.menu-overlay { overflow:auto; overscroll-behavior:contain; }\n.menu-overlay__close { position:sticky; top:0; justify-self:end; z-index:2; border:1px solid var(--corp-line); background:#fff; color:inherit; padding:10px 14px; cursor:pointer; }\nbody[data-menu-open="true"] .site-header { z-index:100; }\n'''
css_text = css.read_text(encoding="utf-8")
if "R6.1.2 patch: accessible overlay" not in css_text:
    css.write_text(css_text.rstrip() + "\n" + block, encoding="utf-8")

print("Applied lossless R6.1.2 large-file remediation.")
