"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { storyMotion } from "@/experience/config/storyMotion";
import { PerformanceGovernor } from "./PerformanceGovernor";
import { StoryWorld } from "./StoryWorld";

export function ExperienceCanvas({
  quality,
  active,
  onFirstSceneReady,
}: {
  quality: "high" | "medium";
  active: boolean;
  onFirstSceneReady?: () => void;
}) {
  const limits = storyMotion.quality[quality];
  const dpr: [number, number] = [limits.minDpr, limits.maxDpr];

  return (
    <div className="experience-canvas" aria-hidden="true">
      <Canvas
        dpr={dpr}
        frameloop={active ? "always" : "demand"}
        camera={{ position: [7.4, 5.0, 11.8], fov: 38, near: 0.1, far: 90 }}
        gl={{
          antialias: quality === "high",
          alpha: false,
          powerPreference: "high-performance",
          depth: true,
          stencil: false,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(limits.initialDpr, limits.maxDpr));
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = quality === "high" ? 1.12 : 1.16;
          gl.shadowMap.enabled = quality === "high";
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <color attach="background" args={["#eee7dc"]} />
        <fog attach="fog" args={["#eee7dc", 14, 44]} />
        <PerformanceGovernor quality={quality} />
        <StoryWorld quality={quality} onFirstSceneReady={onFirstSceneReady} />
      </Canvas>
    </div>
  );
}
