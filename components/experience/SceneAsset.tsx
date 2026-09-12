"use client";

import * as THREE from "three";
import type { SceneDefinition } from "@/experience/config/scenes";
import { r6ChapterHero } from "@/experience/config/r6Assets";
import type { R6Lod } from "@/experience/systems/HeroActivation";
import { HeroAsset } from "./HeroAsset";

/**
 * Compatibility facade retained for the R6 runtime contract. The canonical
 * renderer is HeroAsset; this wrapper preserves the earlier SceneAsset API for
 * callers and validation tools while routing to the same authored R6 assets.
 */
export function SceneAsset({
  definition,
  sceneIndex,
  quality,
  lod,
  onReady,
}: {
  definition: SceneDefinition;
  sceneIndex: number;
  quality: "high" | "medium";
  lod: R6Lod;
  onReady?: () => void;
}) {
  const hero = r6ChapterHero[Math.max(0, Math.min(r6ChapterHero.length - 1, sceneIndex))];
  return <HeroAsset hero={hero} lod={lod} definition={definition} quality={quality} onReady={onReady} />;
}

/**
 * Shared transition rule documented here for compatibility with the original R6
 * solid-architecture contract. Authored transparent materials keep alpha blend;
 * ordinary structural materials use alpha hashing and remain depth-writing.
 */
export function applySolidTransitionPolicy(standard: THREE.MeshStandardMaterial, transparentAuthored: boolean) {
  if (!transparentAuthored) {
    standard.transparent = false;
    standard.depthWrite = true;
    standard.alphaHash = true;
  }
  return standard;
}
