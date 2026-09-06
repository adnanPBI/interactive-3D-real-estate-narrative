"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetManager } from "@/experience/systems/AssetManager";

export function useSceneAsset(url: string) {
  const renderer = useThree((state) => state.gl);
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setGltf(null);
    setFailed(false);

    assetManager.retain(url, renderer)
      .then((asset) => {
        if (alive) setGltf(asset);
      })
      .catch((error) => {
        if (alive) {
          console.error(`[3D] Failed to load ${url}`, error);
          setFailed(true);
        }
      });

    return () => {
      alive = false;
      assetManager.release(url);
    };
  }, [renderer, url]);

  return { gltf, failed };
}
