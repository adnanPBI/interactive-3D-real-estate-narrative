"use client";

import type { SceneDefinition } from "@/experience/config/scenes";
import { useExperienceStore, type R6Lod } from "@/lib/experienceStore";
import { SceneAsset } from "./SceneAsset";

const rank: Record<R6Lod, number> = { lod0: 0, lod1: 1, lod2: 2, proxy: 3 };
const byRank: R6Lod[] = ["lod0", "lod1", "lod2", "proxy"];

function clampLod(desired: R6Lod, ceiling: R6Lod) {
  return byRank[Math.max(rank[desired], rank[ceiling])];
}

/**
 * One R6 LOD0 maximum: only the single active chapter is ever allowed to ask
 * for LOD0. Transition neighbours use LOD1/LOD2 and are swapped by URL rather
 * than keeping multiple full-resolution hero copies resident.
 */
export function ChapterScene({
  definition,
  sceneIndex,
  quality,
  onReady,
}: {
  definition: SceneDefinition;
  sceneIndex: number;
  quality: "high" | "medium";
  onReady?: () => void;
}) {
  const activeChapter = useExperienceStore((state) => state.activeChapter);
  const ceiling = useExperienceStore((state) => state.lodCeiling);
  const desired: R6Lod = quality === "high"
    ? (sceneIndex === activeChapter ? "lod0" : "lod1")
    : (sceneIndex === activeChapter ? "lod1" : "lod2");
  const lod = clampLod(desired, ceiling);

  return <SceneAsset definition={definition} sceneIndex={sceneIndex} quality={quality} lod={lod} onReady={onReady} />;
}
