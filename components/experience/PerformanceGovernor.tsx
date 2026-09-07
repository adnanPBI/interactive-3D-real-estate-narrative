"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { storyMotion } from "@/experience/config/storyMotion";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * Integrated-GPU-friendly governor. Resolution is reduced before scene content.
 * Static geometry/texture budget violations are recorded as evidence rather than
 * hidden by DPR changes, because those require an asset-authoring fix.
 */
export function PerformanceGovernor({ quality }: { quality: "high" | "medium" }) {
  const renderer = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const sampleTime = useRef(0);
  const frames = useRef(0);
  const stableWindows = useRef(0);
  const slowWindows = useRef(0);
  const limits = storyMotion.quality[quality];

  useFrame((_, delta) => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    sampleTime.current += Math.min(delta, 0.1);
    frames.current += 1;
    if (sampleTime.current < 2.0) return;

    const fps = frames.current / sampleTime.current;
    const current = renderer.getPixelRatio();
    const budgetWarnings: string[] = [];
    if (renderer.info.render.calls > limits.maxDrawCalls) budgetWarnings.push(`draw-calls>${limits.maxDrawCalls}`);
    if (renderer.info.render.triangles > limits.maxTriangles) budgetWarnings.push(`triangles>${limits.maxTriangles}`);
    if (renderer.info.memory.textures > limits.maxTextures) budgetWarnings.push(`textures>${limits.maxTextures}`);

    if (typeof window !== "undefined") {
      const buffer = window.__CONVALT_PERF__ ?? { samples: [] };
      buffer.samples.push({
        at: Date.now(),
        fps: Number(fps.toFixed(2)),
        dpr: Number(current.toFixed(2)),
        chapter: useExperienceStore.getState().activeChapter,
        quality,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        budgetWarnings,
      });
      if (buffer.samples.length > 240) buffer.samples.splice(0, buffer.samples.length - 240);
      window.__CONVALT_PERF__ = buffer;
    }

    if (fps < 56 && current > limits.minDpr + 0.03) {
      slowWindows.current += 1;
      stableWindows.current = 0;
      if (slowWindows.current >= 2) {
        const step = fps < 48 ? 0.16 : 0.10;
        renderer.setPixelRatio(Math.max(limits.minDpr, current - step));
        renderer.setSize(size.width, size.height, false);
        slowWindows.current = 0;
      }
    } else if (fps > 58.5 && current < limits.maxDpr - 0.03 && budgetWarnings.length === 0) {
      stableWindows.current += 1;
      slowWindows.current = 0;
      if (stableWindows.current >= 3) {
        renderer.setPixelRatio(Math.min(limits.maxDpr, current + 0.07));
        renderer.setSize(size.width, size.height, false);
        stableWindows.current = 0;
      }
    } else {
      slowWindows.current = 0;
      stableWindows.current = 0;
    }

    sampleTime.current = 0;
    frames.current = 0;
  });

  return null;
}
