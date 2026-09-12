"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { chapters } from "@/content/site";
import { useExperienceStore } from "@/lib/experienceStore";
import { AccessibilityTwin } from "./AccessibilityTwin";
import { StaticSceneFallback } from "./StaticSceneFallback";
import { ExperienceErrorBoundary } from "./ExperienceErrorBoundary";
import { useQualityTier } from "./useQualityTier";

const ExperienceCanvas = dynamic(
  () => import("./ExperienceCanvas").then((module) => module.ExperienceCanvas),
  { ssr: false, loading: () => null },
);

const LaptopBenchmarkPanel = dynamic(
  () => import("./LaptopBenchmarkPanel").then((module) => module.LaptopBenchmarkPanel),
  { ssr: false, loading: () => null },
);

const LAST_CHAPTER = chapters.length - 1;
const WHEEL_THRESHOLD = 120;
const WHEEL_RESET_MS = 800;
const SWIPE_THRESHOLD = 44;

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a,button,input,select,textarea,[role='button'],[contenteditable='true'],[data-allow-scroll='true'],.menu-overlay,.a11y-popover"));
}

/**
 * Viewport-locked chapter controller.
 *
 * Wheel, swipe and keyboard input advance one narrative chapter at a time. The
 * document never becomes an artificial long-form scroll track. A single GSAP tween
 * moves normalized story progress between authored chapter anchors; the same
 * progress drives camera, scene blend, lighting and DOM chapter state.
 */
export function HomeExperience() {
  const quality = useQualityTier();
  const shellRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const transitionTween = useRef<gsap.core.Tween | null>(null);
  const transitioning = useRef(false);
  const wheelAccumulator = useRef(0);
  const lastWheelTime = useRef(0);
  const touchStart = useRef<number | null>(null);
  const [canvasActive, setCanvasActive] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [runtimeFallback, setRuntimeFallback] = useState(false);

  const setQuality = useExperienceStore((state) => state.setQuality);
  const activeChapter = useExperienceStore((state) => state.activeChapter);
  const setTimelineProgress = useExperienceStore((state) => state.setTimelineProgress);
  const setTargetProgress = useExperienceStore((state) => state.setTargetProgress);
  const setActiveChapter = useExperienceStore((state) => state.setActiveChapter);

  useEffect(() => setQuality(runtimeFallback ? "fallback" : quality), [quality, runtimeFallback, setQuality]);
  useEffect(() => {
    const fail = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason ?? "runtime-error";
      console.error(`[3D] Switching to static fallback: ${reason}`);
      setRuntimeFallback(true);
      setCanvasReady(true);
    };
    window.addEventListener("convalt:webgl-fatal", fail);
    return () => window.removeEventListener("convalt:webgl-fatal", fail);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      transitionTween.current?.kill();
    };
  }, []);

  useEffect(() => {
    const publish = () => setCanvasActive(document.visibilityState === "visible");
    publish();
    document.addEventListener("visibilitychange", publish);
    return () => document.removeEventListener("visibilitychange", publish);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowBenchmark(params.get("benchmark") === "1" || params.get("qa") === "1");
  }, []);

  useEffect(() => {
    if (quality !== "fallback" && !canvasReady) return;
    const delay = quality === "fallback" ? 100 : 360;
    const id = window.setTimeout(() => window.dispatchEvent(new CustomEvent("convalt:experience-ready")), delay);
    return () => window.clearTimeout(id);
  }, [canvasReady, quality]);

  const goToChapter = useCallback((targetIndex: number, immediate = false) => {
    const clamped = Math.max(0, Math.min(LAST_CHAPTER, targetIndex));
    const current = useExperienceStore.getState();
    if (!immediate && transitioning.current) return;
    if (!immediate && clamped === current.activeChapter) return;

    setHasInteracted(true);
    const targetProgress = clamped / LAST_CHAPTER;
    setTargetProgress(targetProgress);

    const reduced = runtimeFallback || quality === "fallback" || document.documentElement.dataset.motion === "reduced";
    if (immediate || reduced) {
      transitionTween.current?.kill();
      transitioning.current = false;
      setTimelineProgress(targetProgress);
      setActiveChapter(clamped);
      return;
    }

    transitioning.current = true;
    transitionTween.current?.kill();
    const proxy = { value: current.progress };
    const distance = Math.max(1, Math.abs(clamped - current.activeChapter));
    transitionTween.current = gsap.to(proxy, {
      value: targetProgress,
      duration: Math.min(2.15, 1.15 + (distance - 1) * 0.24),
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: () => setTimelineProgress(proxy.value),
      onComplete: () => {
        setTimelineProgress(targetProgress);
        setActiveChapter(clamped);
        transitioning.current = false;
        wheelAccumulator.current = 0;
      },
      onInterrupt: () => { transitioning.current = false; },
    });
  }, [quality, runtimeFallback, setActiveChapter, setTargetProgress, setTimelineProgress]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      if (transitioning.current) return;
      const now = performance.now();
      if (now - lastWheelTime.current > WHEEL_RESET_MS) wheelAccumulator.current = 0;
      lastWheelTime.current = now;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      wheelAccumulator.current += event.deltaY * unit;
      const current = useExperienceStore.getState().activeChapter;
      if (wheelAccumulator.current >= WHEEL_THRESHOLD) {
        wheelAccumulator.current = 0;
        goToChapter(current + 1);
      } else if (wheelAccumulator.current <= -WHEEL_THRESHOLD) {
        wheelAccumulator.current = 0;
        goToChapter(current - 1);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isInteractiveTarget(event.target)) return;
      touchStart.current = event.touches[0].clientY;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (touchStart.current !== null && !isInteractiveTarget(event.target)) event.preventDefault();
    };
    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStart.current === null || isInteractiveTarget(event.target)) return;
      const end = event.changedTouches[0]?.clientY ?? touchStart.current;
      const delta = touchStart.current - end;
      touchStart.current = null;
      if (transitioning.current || Math.abs(delta) < SWIPE_THRESHOLD) return;
      const current = useExperienceStore.getState().activeChapter;
      goToChapter(current + (delta > 0 ? 1 : -1));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isInteractiveTarget(event.target) || transitioning.current) return;
      const current = useExperienceStore.getState().activeChapter;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goToChapter(current + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goToChapter(current - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToChapter(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToChapter(LAST_CHAPTER);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToChapter]);

  useEffect(() => {
    if (quality === "fallback" || document.documentElement.dataset.motion === "reduced") return;
    const element = copyRefs.current[activeChapter];
    if (!element) return;
    const tween = gsap.fromTo(element, { autoAlpha: 0.35, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.72, ease: "power2.out", overwrite: true });
    return () => { tween.kill(); };
  }, [activeChapter, quality]);

  return (
    <div className="experience-shell experience-shell--corporate" ref={shellRef} data-interacted={hasInteracted}>
      {quality === "fallback" || runtimeFallback ? (
        <StaticSceneFallback activeChapter={activeChapter} />
      ) : (
        <ExperienceErrorBoundary onError={() => setRuntimeFallback(true)}>
          <ExperienceCanvas quality={quality} active={canvasActive} onFirstSceneReady={() => setCanvasReady(true)} />
        </ExperienceErrorBoundary>
      )}

      <nav className="story-progress" aria-label="Story chapters">
        {chapters.map((chapter, index) => (
          <button
            className="progress-dot"
            key={chapter.id}
            data-active={index === activeChapter}
            onClick={() => goToChapter(index)}
            aria-label={`Go to ${chapter.kicker}`}
            aria-current={index === activeChapter ? "step" : undefined}
            title={chapter.kicker}
          />
        ))}
      </nav>

      <div className="story-track" id="main-content">
        {chapters.map((chapter, index) => (
          <section
            className="story-chapter"
            id={chapter.id}
            key={chapter.id}
            aria-labelledby={`${chapter.id}-title`}
            aria-hidden={index === activeChapter ? undefined : true}
            data-active={index === activeChapter}
            data-copy-align={chapter.align}
          >
            <div className="story-copy" ref={(node) => { copyRefs.current[index] = node; }}>
              <div className="story-kicker">{chapter.kicker}</div>
              {index === 0 ? <h1 id={`${chapter.id}-title`}>{chapter.title}</h1> : <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>}
              <p>{chapter.body}</p>
              {index < LAST_CHAPTER ? (
                <span className="chapter-cue" data-hidden={hasInteracted} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              ) : (
                <Link className="story-cta" href="/projects">Explore projects <span aria-hidden="true">↗</span></Link>
              )}
            </div>
          </section>
        ))}
      </div>

      <AccessibilityTwin activeChapter={activeChapter} onJump={goToChapter} />
      {showBenchmark && <LaptopBenchmarkPanel quality={quality} activeChapter={activeChapter} />}
    </div>
  );
}
