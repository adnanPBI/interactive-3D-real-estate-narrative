"use client";

import type { SceneDefinition } from "@/experience/config/scenes";
import { SceneAsset } from "./SceneAsset";

/**
 * Backward-compatible chapter renderer. The active chapter alone may request
 * LOD0; inactive adjacent chapters are capped at LOD1 so two hero LOD0 assets
 * cannot coexist through this compatibility path.
 */
export function ChapterScene({
  definition,
  sceneIndex,
  activeChapter,
  quality,
  onReady,
}: {
  definition: SceneDefinition;
  sceneIndex: number;
  activeChapter: number;
  quality: "high" | "medium";
  onReady?: () => void;
}) {
  const lod = sceneIndex === activeChapter ? "lod0" : "lod1";
  return <SceneAsset definition={definition} sceneIndex={sceneIndex} quality={quality} lod={lod} onReady={onReady} />;
}
