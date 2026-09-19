"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetManager } from "@/experience/systems/AssetManager";

const HERO_LOAD_TIMEOUT_MS = 20_000;

export function useSceneAsset(url: string) {
  const renderer = useThree((state) => state.gl);
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let timedOut = false;
    setGltf(null);
    setFailed(false);

    const timeoutId = window.setTimeout(() => {
      if (!alive) return;
      timedOut = true;
      console.error(`[3D] Timed out loading ${url} after ${HERO_LOAD_TIMEOUT_MS}ms`);
      setFailed(true);
    }, HERO_LOAD_TIMEOUT_MS);

    assetManager.retain(url, renderer)
      .then((asset) => {
        if (!alive || timedOut) return;
        window.clearTimeout(timeoutId);
        setGltf(asset);
      })
      .catch((error) => {
        if (alive) {
          window.clearTimeout(timeoutId);
          console.error(`[3D] Failed to load ${url}`, error);
          setFailed(true);
        }
      });

    return () => {
      alive = false;
      window.clearTimeout(timeoutId);
      assetManager.release(url);
    };
  }, [renderer, url]);

  return { gltf, failed };
}
