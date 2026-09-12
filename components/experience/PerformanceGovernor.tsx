"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { storyMotion } from "@/experience/config/storyMotion";
import { getRenderTelemetry } from "@/experience/systems/renderTelemetry";
import { useExperienceStore } from "@/lib/experienceStore";

export function PerformanceGovernor({ quality }: { quality: "high" | "medium" }) {
  const renderer = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const sampleTime = useRef(0); const frames = useRef(0); const stableWindows = useRef(0); const slowWindows = useRef(0); const severeWindows = useRef(0); const shadowRecoveryWindows = useRef(0); const shadowsDisabled = useRef(false);
  const limits = storyMotion.quality[quality];
  useFrame((_, delta) => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    sampleTime.current += delta; frames.current += 1; if (sampleTime.current < 2.0) return;
    const fps = frames.current / sampleTime.current; const current = renderer.getPixelRatio(); const renderInfo = getRenderTelemetry(); const sceneCalls = renderInfo.sceneCalls || renderer.info.render.calls; const sceneTriangles = renderInfo.sceneTriangles || renderer.info.render.triangles; const budgetWarnings: string[] = [];
    if (sceneCalls > limits.maxDrawCalls) budgetWarnings.push(`draw-calls>${limits.maxDrawCalls}`);
    if (sceneTriangles > limits.maxTriangles) budgetWarnings.push(`triangles>${limits.maxTriangles}`);
    if (renderer.info.memory.textures > limits.maxTextures) budgetWarnings.push(`textures>${limits.maxTextures}`);
    if (!shadowsDisabled.current) {
      shadowRecoveryWindows.current = 0;
      if (fps < 48) {
        severeWindows.current += 1;
        const atMinimumDpr = current <= limits.minDpr + 0.03;
        if (severeWindows.current >= 2 && atMinimumDpr) { renderer.shadowMap.enabled = false; shadowsDisabled.current = true; severeWindows.current = 0; stableWindows.current = 0; }
      } else severeWindows.current = 0;
    } else {
      severeWindows.current = 0;
      if (fps > 58.5 && budgetWarnings.length === 0) {
        shadowRecoveryWindows.current += 1;
        if (shadowRecoveryWindows.current >= 4) { renderer.shadowMap.enabled = true; renderer.shadowMap.needsUpdate = true; shadowsDisabled.current = false; shadowRecoveryWindows.current = 0; stableWindows.current = 0; }
      } else shadowRecoveryWindows.current = 0;
    }
    if (typeof window !== "undefined") {
      const buffer = window.__CONVALT_PERF__ ?? { samples: [] };
      buffer.samples.push({ at: Date.now(), fps: Number(fps.toFixed(2)), dpr: Number(current.toFixed(2)), chapter: useExperienceStore.getState().activeChapter, quality, calls: sceneCalls, triangles: sceneTriangles, totalCalls: renderInfo.totalCalls, totalTriangles: renderInfo.totalTriangles, postCalls: renderInfo.postCalls, postTriangles: renderInfo.postTriangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, shadowsEnabled: renderer.shadowMap.enabled, budgetWarnings });
      if (buffer.samples.length > 240) buffer.samples.splice(0, buffer.samples.length - 240); window.__CONVALT_PERF__ = buffer;
    }
    if (fps < 56 && current > limits.minDpr + 0.03) {
      slowWindows.current += 1; stableWindows.current = 0;
      if (slowWindows.current >= 2) { const step = fps < 48 ? 0.16 : 0.10; renderer.setPixelRatio(Math.max(limits.minDpr, current - step)); renderer.setSize(size.width, size.height, false); slowWindows.current = 0; }
    } else if (fps > 58.5 && current < limits.maxDpr - 0.03 && budgetWarnings.length === 0 && !shadowsDisabled.current) {
      stableWindows.current += 1; slowWindows.current = 0;
      if (stableWindows.current >= 4) { renderer.setPixelRatio(Math.min(limits.maxDpr, current + 0.05)); renderer.setSize(size.width, size.height, false); stableWindows.current = 0; }
    } else { slowWindows.current = 0; stableWindows.current = 0; }
    sampleTime.current = 0; frames.current = 0;
  });
  return null;
}
