"use client";

import { useEffect } from "react";
import type { ProceduralRuntimeConfig } from "@/experience/config/proceduralWorld";
import { readProceduralSearch, sanitizeProceduralPatch } from "@/experience/systems/proceduralRuntime";
import { useExperienceStore } from "@/lib/experienceStore";

declare global {
  interface Window {
    __CONVALT_PROCEDURAL__?: {
      get: () => ProceduralRuntimeConfig;
      set: (patch: Partial<ProceduralRuntimeConfig>) => ProceduralRuntimeConfig;
      reset: () => ProceduralRuntimeConfig;
    };
  }
}

/**
 * Browser-facing bridge for QA, presentations and authored demos.
 * Query examples:
 *   ?runner=cinematic&speed=1.25&density=1.2&wind=1.4&traffic=.8&time=18&weather=dusk&seed=investor-demo
 * Runtime examples:
 *   window.__CONVALT_PROCEDURAL__?.set({ speed: 1.5, weather: "haze" })
 */
export function ProceduralRuntimeBridge() {
  const setProcedural = useExperienceStore((state) => state.setProcedural);
  const resetProcedural = useExperienceStore((state) => state.resetProcedural);

  useEffect(() => {
    setProcedural(readProceduralSearch(window.location.search));

    const publish = () => useExperienceStore.getState().procedural;
    window.__CONVALT_PROCEDURAL__ = {
      get: publish,
      set: (patch) => {
        setProcedural(sanitizeProceduralPatch(patch));
        return useExperienceStore.getState().procedural;
      },
      reset: () => {
        resetProcedural();
        return useExperienceStore.getState().procedural;
      },
    };

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ProceduralRuntimeConfig>>).detail;
      if (detail && typeof detail === "object") setProcedural(detail);
    };
    window.addEventListener("convalt:procedural-update", onUpdate);
    return () => {
      window.removeEventListener("convalt:procedural-update", onUpdate);
      delete window.__CONVALT_PROCEDURAL__;
    };
  }, [resetProcedural, setProcedural]);

  return null;
}
