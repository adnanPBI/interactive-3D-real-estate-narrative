"use client";

import { r6ChapterHero } from "@/experience/config/r6Assets";
import { sceneDefinitions } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";
import { assetManager } from "@/experience/systems/AssetManager";
import { r6HeroUrl } from "@/experience/config/r6Assets";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { AssetPreloader } from "./AssetPreloader";
import { CinematicCameraRig } from "./CinematicCameraRig";
import { CinematicSky } from "./CinematicSky";
import { EnvironmentProbe } from "./EnvironmentProbe";
import { HeroAsset } from "./HeroAsset";

export function StoryWorld({ quality, onFirstSceneReady }: { quality: "high" | "medium"; onFirstSceneReady?: () => void }) {
  const activeChapter = useExperienceStore((state) => state.activeChapter);
  const renderer = useThree((state) => state.gl);
  const lod = quality === "high" ? "lod0" : "lod1";
  const [renderedChapter, setRenderedChapter] = useState(activeChapter);
  useEffect(() => () => assetManager.disposeRenderer(renderer), [renderer]);
  useEffect(() => {
    let alive = true;
    const hero = r6ChapterHero[activeChapter];
    const url = r6HeroUrl(hero, lod);
    void assetManager.prefetch(url, renderer, 8_000).then((asset) => {
      if (alive && asset) setRenderedChapter(activeChapter);
    });
    return () => { alive = false; };
  }, [activeChapter, lod, renderer]);
  const definition = sceneDefinitions[renderedChapter];
  const hero = r6ChapterHero[renderedChapter];

  return <>
    <EnvironmentProbe />
    <CinematicSky />
    <CinematicCameraRig quality={quality} />
    <AssetPreloader quality={quality} />
    <mesh position={[0, -1.52, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[140, 140]} />
      <meshStandardMaterial color="#d9d4ca" roughness={0.96} metalness={0} />
    </mesh>
    <HeroAsset key={`${hero}-${lod}`} hero={hero} lod={lod} definition={definition} quality={quality} onReady={renderedChapter === 0 ? onFirstSceneReady : undefined} />
  </>;
}
