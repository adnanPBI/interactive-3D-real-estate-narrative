"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { r61ManufacturingTextureMaterials, r61MaterialTextureUrl, type R61ManufacturingMaterialName } from "@/experience/config/r61Materials";
import type { R6HeroId } from "@/experience/config/r6Assets";

export type R61MaterialTextureSet = { basecolor: THREE.CompressedTexture; normal: THREE.CompressedTexture; orm: THREE.CompressedTexture };
export type R61MaterialTextures = Partial<Record<R61ManufacturingMaterialName, R61MaterialTextureSet>>;
const bundleCache = new WeakMap<THREE.WebGLRenderer, Promise<R61MaterialTextures>>();

function loadManufacturingBundle(renderer: THREE.WebGLRenderer) {
  const cached = bundleCache.get(renderer); if (cached) return cached;
  const loader = new KTX2Loader().setTranscoderPath("/basis/").setWorkerLimit(2).detectSupport(renderer);
  const materialNames = Object.keys(r61ManufacturingTextureMaterials) as R61ManufacturingMaterialName[];
  const promise = Promise.allSettled(materialNames.map(async (material) => {
    const settled = await Promise.allSettled([loader.loadAsync(r61MaterialTextureUrl("manufacturing-line", material, "basecolor")), loader.loadAsync(r61MaterialTextureUrl("manufacturing-line", material, "normal")), loader.loadAsync(r61MaterialTextureUrl("manufacturing-line", material, "orm"))]);
    const rejected = settled.find((item) => item.status === "rejected");
    if (rejected) { for (const item of settled) if (item.status === "fulfilled") item.value.dispose(); throw rejected.reason; }
    const [basecolor, normal, orm] = settled.map((item) => (item as PromiseFulfilledResult<THREE.CompressedTexture>).value);
    basecolor.colorSpace = THREE.SRGBColorSpace; normal.colorSpace = THREE.NoColorSpace; orm.colorSpace = THREE.NoColorSpace;
    for (const texture of [basecolor, normal, orm]) { texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true; }
    return [material, { basecolor, normal, orm } satisfies R61MaterialTextureSet] as const;
  })).then((settled) => {
    const rejected = settled.find((item) => item.status === "rejected");
    if (rejected) { for (const item of settled) if (item.status === "fulfilled") { const [, set] = item.value; set.basecolor.dispose(); set.normal.dispose(); set.orm.dispose(); } throw rejected.reason; }
    return Object.fromEntries(settled.map((item) => (item as PromiseFulfilledResult<readonly [R61ManufacturingMaterialName, R61MaterialTextureSet]>).value)) as R61MaterialTextures;
  }).finally(() => loader.dispose()).catch((error) => { bundleCache.delete(renderer); throw error; });
  bundleCache.set(renderer, promise); return promise;
}

export async function preloadR61ManufacturingTextures(renderer: THREE.WebGLRenderer) {
  try { await loadManufacturingBundle(renderer); } catch (error) { console.error("[R6.1] Manufacturing material prefetch failed", error); }
}

export function useR61MaterialTextures(hero: R6HeroId, quality: "high" | "medium") {
  const renderer = useThree((state) => state.gl); const [textures, setTextures] = useState<R61MaterialTextures | null>(null);
  useEffect(() => {
    if (hero !== "manufacturing-line") { setTextures(null); return; }
    let alive = true;
    loadManufacturingBundle(renderer).then((next) => {
      const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), quality === "high" ? 8 : 4);
      for (const set of Object.values(next)) { if (!set) continue; set.basecolor.anisotropy = anisotropy; set.normal.anisotropy = anisotropy; set.orm.anisotropy = anisotropy; }
      if (alive) setTextures(next);
    }).catch((error) => { console.error("[R6.1] Manufacturing material KTX2 load failed; authored GLB PBR factors remain active", error); if (alive) setTextures(null); });
    return () => { alive = false; };
  }, [hero, quality, renderer]);
  return textures;
}
