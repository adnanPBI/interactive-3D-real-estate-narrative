"use client";

import { sceneDefinitions } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";
import { AssetPreloader } from "./AssetPreloader";
import { CinematicCameraRig } from "./CinematicCameraRig";
import { CinematicSky } from "./CinematicSky";
import { EnergyField } from "./EnergyField";
import { EnvironmentProbe } from "./EnvironmentProbe";
import { SceneAsset } from "./SceneAsset";

/**
 * Cinematic-minimal scene composition.
 *
 * R4 preserves the previous procedural micro-detail layer. Realism is
 * authored in optimized GLBs, not rebuilt at runtime from hundreds of decorative
 * primitives. Only the current and next scene are mounted around the transition.
 */
export function StoryWorld({ quality, onFirstSceneReady }: { quality: "high" | "medium"; onFirstSceneReady?: () => void }) {
  const from = useExperienceStore((state) => state.renderFrom);
  const to = Math.min(sceneDefinitions.length - 1, from + 1);

  return (
    <>
      <EnvironmentProbe />
      <CinematicSky />
      <CinematicCameraRig quality={quality} />
      <AssetPreloader />

      <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={quality === "high"}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#ded8cd" roughness={1} metalness={0} transparent opacity={0.28} />
      </mesh>
      <EnergyField quality={quality} />

      <SceneAsset key={sceneDefinitions[from].id} definition={sceneDefinitions[from]} sceneIndex={from} quality={quality} onReady={from === 0 ? onFirstSceneReady : undefined} />
      {to !== from && <SceneAsset key={sceneDefinitions[to].id} definition={sceneDefinitions[to]} sceneIndex={to} quality={quality} />}
    </>
  );
}
