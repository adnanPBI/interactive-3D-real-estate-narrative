"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { storyMotion } from "@/experience/config/storyMotion";
import { getRenderTelemetry } from "@/experience/systems/renderTelemetry";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * R6.1.3 stability governor.
 *
 * The previous governor toggled the complete shadow system off after two slow
 * windows and back on after four recovery windows.  That made large portions of
 * the industrial assets appear to blink even though the meshes themselves were
 * stable.  Shadows now remain continuously enabled; only DPR is adjusted and it
 * uses a much wider hysteresis window to avoid visible resolution pumping.
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
    sampleTime.current += Math.min(delta, 0.12);
    frames.current += 1;
    if (sampleTime.current < 3.0) return;

    const fps = frames.current / sampleTime.current;
    const current = renderer.getPixelRatio();
    const renderInfo = getRenderTelemetry();
    const sceneCalls = renderInfo.sceneCalls || renderer.info.render.calls;
    const sceneTriangles = renderInfo.sceneTriangles || renderer.info.render.triangles;
    const budgetWarnings: string[] = [];
    if (sceneCalls > limits.maxDrawCalls) budgetWarnings.push(`draw-calls>${limits.maxDrawCalls}`);
    if (sceneTriangles > limits.maxTriangles) budgetWarnings.push(`triangles>${limits.maxTriangles}`);
    if (renderer.info.memory.textures > limits.maxTextures) budgetWarnings.push(`textures>${limits.maxTextures}`);

    // Never toggle shadows at runtime: visual stability takes priority.
    if (!renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.needsUpdate = true;
    }

    if (typeof window !== "undefined") {
      const buffer = window.__CONVALT_PERF__ ?? { samples: [] };
      buffer.samples.push({
        at: Date.now(), fps: Number(fps.toFixed(2)), dpr: Number(current.toFixed(2)),
        chapter: useExperienceStore.getState().activeChapter, quality,
        calls: sceneCalls, triangles: sceneTriangles,
        totalCalls: renderInfo.totalCalls, totalTriangles: renderInfo.totalTriangles,
        postCalls: renderInfo.postCalls, postTriangles: renderInfo.postTriangles,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        shadowsEnabled: true, budgetWarnings,
      });
      if (buffer.samples.length > 240) buffer.samples.splice(0, buffer.samples.length - 240);
      window.__CONVALT_PERF__ = buffer;
    }

    // Slow, one-direction-at-a-time DPR adaptation prevents visible pumping.
    if (fps < 49 && current > limits.minDpr + 0.04) {
      slowWindows.current += 1;
      stableWindows.current = 0;
      if (slowWindows.current >= 3) {
        renderer.setPixelRatio(Math.max(limits.minDpr, current - 0.08));
        renderer.setSize(size.width, size.height, false);
        slowWindows.current = 0;
      }
    } else if (fps > 59 && current < limits.maxDpr - 0.04 && budgetWarnings.length === 0) {
      stableWindows.current += 1;
      slowWindows.current = 0;
      if (stableWindows.current >= 8) {
        renderer.setPixelRatio(Math.min(limits.maxDpr, current + 0.04));
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
