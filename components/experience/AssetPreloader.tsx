"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { sceneAssetForQuality, sceneDefinitions } from "@/experience/config/scenes";
import { assetManager } from "@/experience/systems/AssetManager";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * Zone-based loader: current + adjacent assets stay warm; distant scenes are
 * pruned. R5 resolves a different hero GLB per quality tier, which is the
 * project-specific equivalent of an LOD0/LOD1 split without keeping both in GPU
 * memory at the same time.
 */
export function AssetPreloader({ quality }: { quality: "high" | "medium" }) {
  const renderer = useThree((state) => state.gl);
  const from = useExperienceStore((state) => state.renderFrom);
  const to = Math.min(sceneDefinitions.length - 1, from + 1);

  useEffect(() => {
    const url = (index: number) => sceneAssetForQuality(sceneDefinitions[index], quality);
    const indices = [Math.max(0, from - 1), from, to, Math.min(sceneDefinitions.length - 1, to + 1)];
    const keep = new Set(indices.map(url));

    void assetManager.prefetch(url(from), renderer, 20_000);
    void assetManager.prefetch(url(to), renderer, 20_000);
    const ahead = Math.min(sceneDefinitions.length - 1, to + 1);
    void assetManager.prefetch(url(ahead), renderer, 12_000);

    assetManager.prune(keep);
  }, [from, quality, renderer, to]);

  return null;
}
