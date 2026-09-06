"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { sceneDefinitions } from "@/experience/config/scenes";
import { assetManager } from "@/experience/systems/AssetManager";
import { useExperienceStore } from "@/lib/experienceStore";

/** Zone-based loader: current + adjacent assets stay warm; distant scenes are pruned. */
export function AssetPreloader() {
  const renderer = useThree((state) => state.gl);
  const from = useExperienceStore((state) => state.renderFrom);
  const to = Math.min(sceneDefinitions.length - 1, from + 1);

  useEffect(() => {
    const indices = [Math.max(0, from - 1), from, to, Math.min(sceneDefinitions.length - 1, to + 1)];
    const keep = new Set(indices.map((index) => sceneDefinitions[index].asset));

    void assetManager.prefetch(sceneDefinitions[from].asset, renderer, 20_000);
    void assetManager.prefetch(sceneDefinitions[to].asset, renderer, 20_000);
    const ahead = Math.min(sceneDefinitions.length - 1, to + 1);
    void assetManager.prefetch(sceneDefinitions[ahead].asset, renderer, 12_000);

    assetManager.prune(keep);
  }, [from, renderer, to]);

  return null;
}
