"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { r6TextureUrl, type R6HeroId } from "@/experience/config/r6Assets";

type TextureSet = { basecolor: THREE.CompressedTexture; normal: THREE.Texture; orm: THREE.CompressedTexture };

export function useR6HeroTextures(hero: R6HeroId, enabled = true) {
  const renderer = useThree((state) => state.gl);
  const [textures, setTextures] = useState<TextureSet | null>(null);
  useEffect(() => {
    if (!enabled) { setTextures(null); return; }
    let alive = true;
    const loader = new KTX2Loader().setTranscoderPath("/basis/").setWorkerLimit(1).detectSupport(renderer);
    Promise.allSettled([loader.loadAsync(r6TextureUrl(hero, "basecolor")), loader.loadAsync(r6TextureUrl(hero, "normal")), loader.loadAsync(r6TextureUrl(hero, "orm"))]).then((settled) => {
      const rejected = settled.find((item) => item.status === "rejected");
      if (rejected) {
        for (const item of settled) if (item.status === "fulfilled") item.value.dispose();
        throw rejected.reason;
      }
      const [basecolor, normal, orm] = settled.map((item) => (item as PromiseFulfilledResult<THREE.CompressedTexture>).value);
      basecolor.colorSpace = THREE.SRGBColorSpace;
      normal.colorSpace = THREE.NoColorSpace;
      orm.colorSpace = THREE.NoColorSpace;
      for (const texture of [basecolor, normal, orm]) {
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2.2, 2.2);
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 12); texture.needsUpdate = true;
      }
      if (alive) setTextures({ basecolor, normal, orm }); else for (const texture of [basecolor, normal, orm]) texture.dispose();
    }).catch((error) => console.error(`[R6] KTX2 texture load failed for ${hero}`, error));
    return () => { alive = false; loader.dispose(); };
  }, [enabled, hero, renderer]);
  useEffect(() => () => { if (!textures) return; textures.basecolor.dispose(); textures.normal.dispose(); textures.orm.dispose(); }, [textures]);
  return textures;
}
