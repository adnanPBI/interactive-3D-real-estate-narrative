"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneDefinitions, sceneTimeline } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";

const vertexShader = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(world.xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vWorldDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform float uSunStrength;

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = smoothstep(-0.16, 0.72, dir.y);
    float horizonBand = exp(-pow(abs(dir.y) * 4.2, 1.35));
    vec3 color = mix(uHorizon, uTop, h);
    color = mix(color, uHorizon * 1.025, horizonBand * 0.28);
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunGlow = pow(sunDot, 96.0) * uSunStrength + pow(sunDot, 8.0) * uSunStrength * 0.16;
    color += uSun * sunGlow;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const topA = new THREE.Color();
const topB = new THREE.Color();
const horizonA = new THREE.Color();
const horizonB = new THREE.Color();

/** One-draw-call atmospheric sky. It provides cinematic depth without HDR payloads
 * or post-processing and remains cheap on Intel integrated graphics. */
export function CinematicSky() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color("#bfc7c8") },
    uHorizon: { value: new THREE.Color("#f0d8b8") },
    uSun: { value: new THREE.Color("#ffe1ad") },
    uSunDir: { value: new THREE.Vector3(-0.72, 0.19, -0.66).normalize() },
    uSunStrength: { value: 0.72 },
  }), []);

  useFrame((_, delta) => {
    if (!material.current) return;
    const timeline = sceneTimeline(useExperienceStore.getState().progress);
    const a = sceneDefinitions[timeline.from];
    const b = sceneDefinitions[timeline.to];
    const t = timeline.local * timeline.local * (3 - 2 * timeline.local);

    // Background tokens inform the atmosphere while deliberately staying warmer
    // and more expansive than the flat DOM palette.
    horizonA.set(a.background).offsetHSL(0.015, 0.10, 0.035);
    horizonB.set(b.background).offsetHSL(0.015, 0.10, 0.035);
    topA.set(a.background).offsetHSL(0.54, 0.06, -0.12);
    topB.set(b.background).offsetHSL(0.54, 0.06, -0.12);

    const alpha = 1 - Math.exp(-delta * 2.8);
    material.current.uniforms.uHorizon.value.lerp(horizonA.lerp(horizonB, t), alpha);
    material.current.uniforms.uTop.value.lerp(topA.lerp(topB, t), alpha);
  });

  return (
    <mesh scale={70} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}
