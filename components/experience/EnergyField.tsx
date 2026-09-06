"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { energyFieldFragment, energyFieldVertex } from "@/experience/shaders/energyField";

/** A static, low-cost contact shadow. No scanlines, sweep animation or neon grid. */
export function EnergyField({ quality }: { quality: "high" | "medium" }) {
  const uniforms = useMemo(() => ({
    uStrength: { value: quality === "high" ? 0.12 : 0.09 },
    uColor: { value: new THREE.Color("#c8c4ba") },
  }), [quality]);

  return (
    <mesh position={[0, -1.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 40, 1, 1]} />
      <shaderMaterial vertexShader={energyFieldVertex} fragmentShader={energyFieldFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.NormalBlending} />
    </mesh>
  );
}
