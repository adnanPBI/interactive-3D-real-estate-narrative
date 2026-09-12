#!/usr/bin/env python3
"""Browser acceptance harness for the six-chapter R6 experience.

Supports CI diagnostic mode, explicit WebGL-failure fallback proof, and ordered
six-chapter evidence capture. FPS is diagnostic here; physical-laptop sign-off
remains a separate release-evidence gate.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import time
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

CHAPTER_IDS = ("hero", "manufacturing", "generation", "data-centers", "recycling", "close")


def with_query(url: str, **params: str) -> str:
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update(params)
    return urlunsplit((parts.scheme, parts.netloc, parts.path or "/", urlencode(query), parts.fragment))


def semantic_snapshot(page, chapter: str) -> dict[str, object]:
    return page.evaluate(
        """chapter => {
          const active = document.querySelector('.story-chapter[data-active="true"]');
          const fallback = document.querySelector('[data-r6-static-fallback="true"]');
          const canvases = [...document.querySelectorAll('canvas')];
          const immersive = canvases.filter((canvas) => canvas.closest('.experience-canvas, .experience-shell'));
          return {
            requested: chapter,
            activeId: active?.id || null,
            activeHeading: active?.querySelector('h1,h2')?.textContent?.trim() || null,
            fallbackVisible: !!fallback,
            experienceCanvasCount: canvases.length,
            immersiveCanvasCount: immersive.length,
            webglProbeAttempts: window.__R6_WEBGL_PROBE_ATTEMPTS__ || 0,
            readyState: document.readyState,
          };
        }""",
        chapter,
    )


def wait_for_story(page) -> None:
    page.wait_for_selector('.story-progress .progress-dot', state='attached', timeout=20000)
    count = page.locator('.story-progress .progress-dot').count()
    if count != 6:
        raise RuntimeError(f"expected 6 story chapter controls, found {count}")


def run_fallback_proof(page, base_url: str, out: Path) -> dict[str, object]:
    page.add_init_script(
        """() => {
          window.__R6_WEBGL_PROBE_ATTEMPTS__ = 0;
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
            return original.call(this, type, ...args);
          };
        }"""
    )
    # Deliberately request high quality. WebGL safety must win over this override.
    page.goto(with_query(base_url, qa="1", quality="high"), wait_until="domcontentloaded", timeout=30000)
    wait_for_story(page)
    try:
        page.wait_for_selector('[data-r6-static-fallback="true"]', state='attached', timeout=15000)
    except PlaywrightTimeoutError as exc:
        raise RuntimeError("WebGL failure did not recover to the R6 static fallback") from exc
    snap = semantic_snapshot(page, "hero")
    if not snap["fallbackVisible"]:
        raise RuntimeError("fallback proof selector exists but semantic snapshot is not in fallback mode")
    if int(snap["webglProbeAttempts"]) < 1:
        raise RuntimeError("forced WebGL-unavailable proof did not execute the client probe")
    forcedQualityOverride = True
    if int(snap["immersiveCanvasCount"]) != 0:
        raise RuntimeError("forced WebGL failure still mounted an immersive canvas")
    screenshot = out / "webgl-fallback.png"
    page.screenshot(path=str(screenshot), full_page=True)
    return {
        "pass": True,
        "forcedQualityOverride": forcedQualityOverride,
        "experienceCanvasCount": snap["experienceCanvasCount"],
        "immersiveCanvasCount": snap["immersiveCanvasCount"],
        "webglProbeAttempts": snap["webglProbeAttempts"],
        "screenshot": screenshot.name,
        "semantic": snap,
    }


def run_six_chapter(page, base_url: str, out: Path) -> list[dict[str, object]]:
    page.goto(with_query(base_url, qa="1"), wait_until="domcontentloaded", timeout=30000)
    wait_for_story(page)
    results: list[dict[str, object]] = []
    controls = page.locator('.story-progress .progress-dot')
    for index, chapter in enumerate(CHAPTER_IDS):
        controls.nth(index).click()
        page.wait_for_function(
            """arg => {
              const el = document.getElementById(arg.id);
              return !!el && el.dataset.active === 'true';
            }""",
            arg={"id": chapter, "index": index},
            timeout=5000,
        )
        page.wait_for_timeout(350)
        semantic = semantic_snapshot(page, chapter)
        semantic["pass"] = semantic.get("activeId") == chapter
        screenshot = out / f"chapter-{index + 1:02d}-{chapter}.png"
        page.screenshot(path=str(screenshot), full_page=True)
        results.append({"chapter": chapter, "index": index, "screenshot": screenshot.name, "semantic": semantic})
    failed = [item["chapter"] for item in results if not item["semantic"]["pass"]]
    if failed:
        raise RuntimeError(f"six-chapter semantic regression: {failed}")
    return results


def collect_frame_deltas(page, seconds: float = 2.5) -> dict[str, object]:
    deltas = page.evaluate(
        """seconds => new Promise(resolve => {
          const deltas = [];
          let previous = performance.now();
          const end = previous + seconds * 1000;
          function tick(now) {
            const delta = now - previous;
            previous = now;
            if (delta > 0) deltas.push(delta);
            if (now >= end) resolve(deltas); else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        })""",
        seconds,
    )
    if not deltas:
        return {"samples": 0, "fps": 0.0, "p95FrameMs": None}
    ordered = sorted(float(v) for v in deltas)
    mean = sum(ordered) / len(ordered)
    p95 = ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]
    return {"samples": len(ordered), "fps": round(1000.0 / mean, 2), "p95FrameMs": round(p95, 2)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", type=Path, default=Path("artifacts/acceptance"))
    parser.add_argument("--no-fps-gate", action="store_true")
    parser.add_argument("--webgl-fallback-proof-only", action="store_true")
    parser.add_argument("--six-chapter-proof-only", action="store_true")
    args = parser.parse_args()
    if args.webgl_fallback_proof_only and args.six_chapter_proof_only:
        parser.error("choose only one proof-only mode")

    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []
    report: dict[str, object] = {"url": args.url, "generatedAt": int(time.time()), "pass": False}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
            page = context.new_page()
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: console_errors.append(str(exc)))

            if args.webgl_fallback_proof_only:
                report["fallback"] = run_fallback_proof(page, args.url, out)
            elif args.six_chapter_proof_only:
                report["chapters"] = run_six_chapter(page, args.url, out)
            else:
                report["chapters"] = run_six_chapter(page, args.url, out)
                report["performanceDiagnostic"] = collect_frame_deltas(page)

            browser.close()
        severe = [e for e in console_errors if "favicon" not in e.lower() and "hydration" not in e.lower()]
        report["consoleErrors"] = severe
        report["pass"] = not severe
        if severe:
            raise RuntimeError(f"browser console/page errors: {severe[:5]}")
    except Exception as exc:
        report["error"] = str(exc)
        report["pass"] = False
        (out / "acceptance.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"ACCEPTANCE FAIL: {exc}", file=sys.stderr)
        return 1

    (out / "acceptance.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Acceptance passed; evidence: {out / 'acceptance.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
