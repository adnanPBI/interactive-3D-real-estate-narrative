"use client";

import { r6ChapterHero, r6HeroUrl } from "@/experience/config/r6Assets";
import { sceneDefinitions } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";
import { assetManager } from "@/experience/systems/AssetManager";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { AssetPreloader } from "./AssetPreloader";
import { CinematicCameraRig } from "./CinematicCameraRig";
import { CinematicSky } from "./CinematicSky";
import { EnvironmentProbe } from "./EnvironmentProbe";
import { HeroAsset } from "./HeroAsset";

type RuntimeLod = "lod0";

function targetLodFor(_hero: (typeof r6ChapterHero)[number], _quality: "high" | "medium"): RuntimeLod {
  // R6.1.5 visual-fidelity mode: every current LOD0 is below the 120k medium
  // triangle ceiling, so do not collapse non-manufacturing chapters to LOD1.
  // This keeps façade trims, cooling plant, electrical detail and recycling
  // equipment visible on the Windows/Intel medium tier seen in client review.
  return "lod0";
}

export function StoryWorld({ quality, onFirstSceneReady }: { quality: "high" | "medium"; onFirstSceneReady?: () => void }) {
  const activeChapter = useExperienceStore((state) => state.activeChapter);
  const renderer = useThree((state) => state.gl);
  const initialHero = r6ChapterHero[activeChapter];
  const [rendered, setRendered] = useState<{ chapter: number; lod: RuntimeLod }>({
    chapter: activeChapter,
    lod: targetLodFor(initialHero, quality),
  });

  useEffect(() => () => assetManager.disposeRenderer(renderer), [renderer]);
  useEffect(() => {
    let alive = true;
    const hero = r6ChapterHero[activeChapter];
    const lod = targetLodFor(hero, quality);
    const url = r6HeroUrl(hero, lod);
    void assetManager.prefetch(url, renderer, 8_000).then((asset) => {
      if (alive && asset) setRendered({ chapter: activeChapter, lod });
    });
    return () => { alive = false; };
  }, [activeChapter, quality, renderer]);

  const definition = sceneDefinitions[rendered.chapter];
  const hero = r6ChapterHero[rendered.chapter];

  return <>
    <EnvironmentProbe />
    <CinematicSky />
    <CinematicCameraRig quality={quality} />
    <AssetPreloader quality={quality} />
    <mesh position={[0, -1.52, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[140, 140]} />
      <meshStandardMaterial color="#ddd9d0" roughness={0.94} metalness={0} />
    </mesh>
    <HeroAsset
      key={`${hero}-${rendered.lod}`}
      hero={hero}
      lod={rendered.lod}
      definition={definition}
      quality={quality}
      onReady={rendered.chapter === 0 ? onFirstSceneReady : undefined}
    />
  </>;
}
