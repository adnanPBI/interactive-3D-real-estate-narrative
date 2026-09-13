"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { r612HeroMotion, type FlowSurfaceProfile, type RunnerTrailProfile, type SteamEmitterProfile } from "@/experience/config/r612Motion";
import type { R6HeroId } from "@/experience/config/r6Assets";

const waterVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform vec3 uTint;

  void main() {
    float t = uTime * uSpeed;
    float waveA = sin((vUv.x * 18.0 + vUv.y * 5.0) + t * 2.5);
    float waveB = sin((vUv.y * 25.0 - vUv.x * 7.0) - t * 1.8);
    float wave = (waveA + waveB) * 0.5;
    float glint = smoothstep(0.62, 0.98, 0.5 + wave * 0.5);
    vec3 color = mix(uTint * 0.78, uTint * 1.22, glint * 0.42);
    float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, vUv.y)
      * smoothstep(0.0, 0.08, 1.0 - vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.y);
    gl_FragColor = vec4(color, uOpacity * edge * (0.84 + glint * 0.16));
  }
`;

const steamVertexShader = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uRise;
  uniform float uSize;
  varying float vFade;

  void main() {
    float cycle = fract(aPhase + uTime * uSpeed);
    vec3 p = position;
    p.y += cycle * uRise;
    p.x += sin((cycle + aPhase) * 10.0) * 0.11 * cycle;
    p.z += cos((cycle * 1.3 + aPhase) * 8.0) * 0.08 * cycle;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * (250.0 / max(1.0, -mv.z)), 1.0, 22.0);
    vFade = 1.0 - smoothstep(0.18, 1.0, cycle);
  }
`;

const steamFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 uTint;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    float soft = 1.0 - smoothstep(0.18, 0.5, d);
    gl_FragColor = vec4(uTint, soft * vFade * uOpacity);
  }
`;

function FlowSurface({ profile }: { profile: FlowSurfaceProfile }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: profile.speed },
    uOpacity: { value: profile.opacity },
    uTint: { value: new THREE.Color(profile.tint) },
  }), [profile.opacity, profile.speed, profile.tint]);

  useFrame((state) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      position={profile.position as [number, number, number]}
      rotation={[-Math.PI / 2, profile.rotationY, 0]}
      renderOrder={3}
      receiveShadow={false}
    >
      <planeGeometry args={[profile.size[0], profile.size[1], 1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SteamEmitter({ profile, quality, index }: { profile: SteamEmitterProfile; quality: "high" | "medium"; index: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const count = quality === "high" ? 28 : 16;
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      // Deterministic low-discrepancy placement: no runtime randomness and no allocations in useFrame.
      const a = ((i * 0.61803398875 + index * 0.173) % 1) * Math.PI * 2;
      const radius = (((i * 0.41421356237 + 0.23) % 1) ** 0.6);
      positions[i * 3] = Math.cos(a) * profile.spread[0] * radius;
      positions[i * 3 + 1] = ((i * 0.27182818284) % 1) * 0.18;
      positions[i * 3 + 2] = Math.sin(a) * profile.spread[1] * radius;
      phases[i] = (i * 0.754877666 + index * 0.113) % 1;
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return next;
  }, [count, index, profile.spread]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: quality === "high" ? 0.12 : 0.095 },
    uRise: { value: profile.rise },
    uSize: { value: quality === "high" ? 18 : 14 },
    uOpacity: { value: profile.opacity },
    uTint: { value: new THREE.Color(profile.tint) },
  }), [profile.opacity, profile.rise, profile.tint, quality]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points position={profile.position as [number, number, number]} geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial
        ref={material}
        vertexShader={steamVertexShader}
        fragmentShader={steamFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest
        toneMapped={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

const runnerDummy = new THREE.Object3D();

function writeRunnerMatrices(mesh: THREE.InstancedMesh | null, count: number, profile: RunnerTrailProfile) {
  if (!mesh) return;
  const spacing = profile.length / count;
  for (let index = 0; index < count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    runnerDummy.position.set(side * profile.laneOffset, 0, -index * spacing);
    runnerDummy.rotation.set(0, 0, 0);
    runnerDummy.scale.set(1, 1, 0.82 + (index % 3) * 0.08);
    runnerDummy.updateMatrix();
    mesh.setMatrixAt(index, runnerDummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function EndlessServiceTrail({ profile, accent, quality }: { profile: RunnerTrailProfile; accent: string; quality: "high" | "medium" }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const meshA = useRef<THREE.InstancedMesh>(null);
  const meshB = useRef<THREE.InstancedMesh>(null);
  const offset = useRef(0);
  const count = quality === "high" ? 22 : 14;

  useLayoutEffect(() => {
    writeRunnerMatrices(meshA.current, count, profile);
    writeRunnerMatrices(meshB.current, count, profile);
  }, [count, profile]);

  useFrame((_, delta) => {
    const reduced = typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
    if (reduced) return;
    const speed = profile.speed * (quality === "high" ? 1 : 0.72);
    offset.current = (offset.current + Math.min(delta, 0.08) * speed) % profile.length;
    if (a.current) a.current.position.z = offset.current;
    if (b.current) b.current.position.z = offset.current - profile.length;
  });

  const trail = (ref: React.RefObject<THREE.InstancedMesh | null>) => (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.08, 0.016, 0.42]} />
      <meshStandardMaterial
        color={accent}
        emissive={accent}
        emissiveIntensity={0.38}
        metalness={0.35}
        roughness={0.5}
        transparent
        opacity={profile.opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );

  return (
    <group position={[profile.x, profile.y, profile.z]}>
      <group ref={a}>{trail(meshA)}</group>
      <group ref={b}>{trail(meshB)}</group>
    </group>
  );
}

/**
 * Adds motion around the existing R6.1.2 hero without touching its GLB, KTX2,
 * materials, LOD provenance or fallback asset. All geometry here is ephemeral
 * runtime FX and may be removed without changing the authored hero itself.
 */
export function R6HeroAmbientMotion({ hero, accent, quality }: { hero: R6HeroId; accent: string; quality: "high" | "medium" }) {
  const profile = r612HeroMotion[hero];
  return (
    <group name="r612-runtime-motion" userData={{ runtimeOnly: true, assetPreserved: true }}>
      {profile.runner ? <EndlessServiceTrail profile={profile.runner} accent={accent} quality={quality} /> : null}
      {profile.water.map((water, index) => <FlowSurface key={`water-${index}`} profile={water} />)}
      {profile.steam.map((steam, index) => <SteamEmitter key={`steam-${index}`} profile={steam} quality={quality} index={index} />)}
    </group>
  );
}
