"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { r6ChapterHero, r6HeroUrl } from "@/experience/config/r6Assets";
import { assetManager } from "@/experience/systems/AssetManager";
import { preloadR61ManufacturingTextures } from "./useR61MaterialTextures";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * R6 preload policy: active and adjacent heroes use the exact LOD they will display at the current quality tier.
 * LOD0 is never preloaded for more than the current chapter, enforcing the
 * one-LOD0 invariant in both GPU residency and visual output.
 */
export function AssetPreloader({ quality }: { quality: "high" | "medium" }) {
  const renderer = useThree((state) => state.gl);
  const activeChapter = useExperienceStore((state) => state.activeChapter);

  useEffect(() => {
    const activeHero = r6ChapterHero[activeChapter];
    const activeLod = quality === "high" ? "lod0" : "lod1";
    const activeUrl = r6HeroUrl(activeHero, activeLod);
    const neighborIndices = [activeChapter - 1, activeChapter + 1].filter((i) => i >= 0 && i < r6ChapterHero.length);
    const neighborUrls = neighborIndices.map((i) => r6HeroUrl(r6ChapterHero[i], activeLod));
    const keep = new Set([activeUrl, ...neighborUrls]);

    void assetManager.prefetch(activeUrl, renderer, 24_000);
    for (const url of neighborUrls) void assetManager.prefetch(url, renderer, 14_000);

    // Warm the one remediated material bundle when Manufacturing is current or
    // adjacent. This shares the exact KTX2 transcode promise with HeroAsset.
    const warmIndices = new Set([activeChapter, ...neighborIndices]);
    if (warmIndices.has(1)) void preloadR61ManufacturingTextures(renderer);
    assetManager.prune(keep);
  }, [activeChapter, quality, renderer]);

  return null;
}
