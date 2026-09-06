"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Branded first-frame gate.
 *
 * The percentage is intentionally eased while real assets initialize, but the
 * gate does not complete until HomeExperience reports that its first usable 3D
 * scene (or accessible fallback) is ready. A timeout prevents a failed GPU from
 * trapping the visitor behind the loader forever.
 */
export function PreloaderGate({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    const started = performance.now();
    let raf = 0;
    let dismissTimer = 0;

    const finish = () => {
      if (readyRef.current) return;
      readyRef.current = true;
      setProgress(100);
      setReady(true);
      dismissTimer = window.setTimeout(() => setDismissed(true), 620);
    };

    const tick = (now: number) => {
      if (readyRef.current) return;
      const elapsed = now - started;
      // Visual progress approaches 92% while real GPU/asset readiness is pending.
      const eased = 1 - Math.exp(-elapsed / 900);
      setProgress(Math.min(92, Math.round(eased * 92)));
      raf = requestAnimationFrame(tick);
    };

    const onReady = () => finish();
    window.addEventListener("convalt:experience-ready", onReady, { once: true });
    raf = requestAnimationFrame(tick);
    const failSafe = window.setTimeout(finish, 9000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(failSafe);
      clearTimeout(dismissTimer);
      window.removeEventListener("convalt:experience-ready", onReady);
    };
  }, []);

  return (
    <>
      {children}
      {!dismissed && (
        <div className="preloader-gate" data-ready={ready} role="progressbar" aria-label="Loading Convalt Energy interactive experience" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="preloader-content">
            <div className="preloader-brand"><strong>CONVALT</strong><span>ENERGY</span></div>
            <div className="preloader-counter">{String(progress).padStart(3, "\u2007")}<span>%</span></div>
            <div className="preloader-bar" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
          </div>
        </div>
      )}
    </>
  );
}
