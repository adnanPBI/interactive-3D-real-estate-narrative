"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function AccessibilityMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const publishPreferences = () => {
    window.dispatchEvent(new CustomEvent("convalt:preferences", { detail: { contrast: document.documentElement.dataset.contrast, motion: document.documentElement.dataset.motion } }));
  };

  useEffect(() => {
    const storedContrast = localStorage.getItem("convalt-contrast") === "high";
    const storedMotion = localStorage.getItem("convalt-motion") === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setContrast(storedContrast); setReducedMotion(storedMotion);
    document.documentElement.dataset.contrast = storedContrast ? "high" : "standard";
    document.documentElement.dataset.motion = storedMotion ? "reduced" : "standard";
    setReady(true); publishPreferences();
  }, []);

  useEffect(() => { if (!ready) return; document.documentElement.dataset.contrast = contrast ? "high" : "standard"; localStorage.setItem("convalt-contrast", contrast ? "high" : "standard"); publishPreferences(); }, [contrast, ready]);
  useEffect(() => { if (!ready) return; document.documentElement.dataset.motion = reducedMotion ? "reduced" : "standard"; localStorage.setItem("convalt-motion", reducedMotion ? "reduced" : "standard"); publishPreferences(); }, [ready, reducedMotion]);

  useEffect(() => {
    const sync = () => { setContrast(document.documentElement.dataset.contrast === "high"); setReducedMotion(document.documentElement.dataset.motion === "reduced"); };
    window.addEventListener("convalt:preferences", sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("convalt:preferences", sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input, button, a[href]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("input,button,a[href],[tabindex]:not([tabindex='-1'])") ?? []);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey); document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [open]);

  return <div className="a11y-menu">
    <button ref={triggerRef} className="a11y-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="a11y-preferences" onClick={() => setOpen((value) => !value)}><span aria-hidden="true">◉</span><span>Accessibility</span></button>
    <div ref={panelRef} className="a11y-popover" id="a11y-preferences" role="dialog" aria-label="Accessibility preferences" aria-modal="false" data-open={open}>
      <div className="a11y-popover__head"><strong>Accessibility</strong><button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Close accessibility preferences">×</button></div>
      <label><input type="checkbox" checked={contrast} onChange={(event) => setContrast(event.target.checked)} /><span><strong>High contrast</strong><small>Increase UI contrast over the 3D stage.</small></span></label>
      <label><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /><span><strong>Reduce motion</strong><small>Replace cinematic WebGL motion with the static six-frame story.</small></span></label>
      <a href={pathname === "/" ? "#accessibility-host" : "/#accessibility-host"} onClick={() => setOpen(false)}>Open accessible 3D equivalent</a>
    </div>
  </div>;
}
