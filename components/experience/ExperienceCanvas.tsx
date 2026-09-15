"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { storyMotion } from "@/experience/config/storyMotion";
import { PerformanceGovernor } from "./PerformanceGovernor";
import { R6PostFX } from "./R6PostFX";
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

  return <div className="experience-canvas" aria-hidden="true">
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "demand"}
      camera={{ position: [7.4, 5.0, 11.8], fov: 38, near: 0.1, far: 90 }}
      gl={{
        antialias: true,
        precision: "highp",
        alpha: false,
        powerPreference: "high-performance",
        depth: true,
        stencil: false,
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        const failToStatic = (reason: string) => window.dispatchEvent(new CustomEvent("convalt:webgl-fatal", { detail: { reason } }));
        canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); failToStatic("context-lost"); }, { once: true });
        const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
        gl.setPixelRatio(Math.min(limits.maxDpr, Math.max(limits.minDpr, Math.min(deviceDpr, limits.initialDpr))));
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        // R6.1.5 client review: restore readable midtones without flattening the
        // white façade highlights. ACES still protects the brightest surfaces.
        gl.toneMappingExposure = quality === "high" ? 1.07 : 1.10;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
      }}
    >
      <color attach="background" args={["#ddd9d1"]} />
      <fog attach="fog" args={["#ddd9d1", 24, 74]} />
      <PerformanceGovernor quality={quality} />
      <StoryWorld quality={quality} onFirstSceneReady={onFirstSceneReady} />
      <R6PostFX quality={quality} />
    </Canvas>
  </div>;
}
