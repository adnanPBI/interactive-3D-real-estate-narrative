"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
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
    gl_PointSize = clamp(uSize * (250.0 / max(1.0, -mv.z)), 1.0, 24.0);
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

function motionReduced() {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
}

function FlowSurface({ profile }: { profile: FlowSurfaceProfile }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: profile.speed },
    uOpacity: { value: profile.opacity },
    uTint: { value: new THREE.Color(profile.tint) },
  }), [profile.opacity, profile.speed, profile.tint]);

  useFrame((state) => {
    if (!motionReduced() && material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={profile.position as [number, number, number]} rotation={[-Math.PI / 2, profile.rotationY, 0]} renderOrder={3} receiveShadow={false}>
      <planeGeometry args={[profile.size[0], profile.size[1], 1, 1]} />
      <shaderMaterial ref={material} vertexShader={waterVertexShader} fragmentShader={waterFragmentShader} uniforms={uniforms} transparent depthWrite={false} depthTest toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SteamEmitter({ profile, quality, index }: { profile: SteamEmitterProfile; quality: "high" | "medium"; index: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const count = quality === "high" ? 34 : 20;
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
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
    uSpeed: { value: quality === "high" ? 0.15 : 0.11 },
    uRise: { value: profile.rise },
    uSize: { value: quality === "high" ? 21 : 16 },
    uOpacity: { value: Math.min(0.32, profile.opacity * 1.35) },
    uTint: { value: new THREE.Color(profile.tint) },
  }), [profile.opacity, profile.rise, profile.tint, quality]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state) => {
    if (!motionReduced() && material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points position={profile.position as [number, number, number]} geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial ref={material} vertexShader={steamVertexShader} fragmentShader={steamFragmentShader} uniforms={uniforms} transparent depthWrite={false} depthTest toneMapped={false} blending={THREE.NormalBlending} />
    </points>
  );
}

const runnerDummy = new THREE.Object3D();

function writeVehicleMatrices(mesh: THREE.InstancedMesh | null, count: number, profile: RunnerTrailProfile, y: number, zOffset: number, scale = 1) {
  if (!mesh) return;
  const spacing = profile.length / count;
  for (let index = 0; index < count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    runnerDummy.position.set(side * profile.laneOffset, y, -index * spacing + zOffset);
    runnerDummy.rotation.set(0, side > 0 ? Math.PI : 0, 0);
    runnerDummy.scale.set(scale, scale, scale);
    runnerDummy.updateMatrix();
    mesh.setMatrixAt(index, runnerDummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** A visible two-lane endless service-road loop. The previous implementation used
 * tiny translucent tick marks; this uses actual vehicle silhouettes and lights so
 * motion reads immediately at normal desktop viewing distance. */
function EndlessServiceTrail({ profile, accent, quality }: { profile: RunnerTrailProfile; accent: string; quality: "high" | "medium" }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const bodyA = useRef<THREE.InstancedMesh>(null);
  const bodyB = useRef<THREE.InstancedMesh>(null);
  const cabA = useRef<THREE.InstancedMesh>(null);
  const cabB = useRef<THREE.InstancedMesh>(null);
  const lampA = useRef<THREE.InstancedMesh>(null);
  const lampB = useRef<THREE.InstancedMesh>(null);
  const offset = useRef(0);
  const count = quality === "high" ? 8 : 6;

  useLayoutEffect(() => {
    for (const ref of [bodyA, bodyB]) writeVehicleMatrices(ref.current, count, profile, 0.16, 0, 1);
    for (const ref of [cabA, cabB]) writeVehicleMatrices(ref.current, count, profile, 0.285, -0.12, 0.72);
    for (const ref of [lampA, lampB]) writeVehicleMatrices(ref.current, count, profile, 0.25, -0.38, 0.72);
  }, [count, profile]);

  useFrame((state, delta) => {
    if (motionReduced()) return;
    const speed = Math.max(0.8, profile.speed * 1.9) * (quality === "high" ? 1 : 0.8);
    offset.current = (offset.current + Math.min(delta, 0.08) * speed) % profile.length;
    if (a.current) a.current.position.z = offset.current;
    if (b.current) b.current.position.z = offset.current - profile.length;
    if (quality === "high" && Math.floor(state.clock.elapsedTime * 6) % 5 === 0) state.gl.shadowMap.needsUpdate = true;
  });

  const fleet = (
    body: RefObject<THREE.InstancedMesh | null>,
    cab: RefObject<THREE.InstancedMesh | null>,
    lamp: RefObject<THREE.InstancedMesh | null>,
  ) => (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, count]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.34, 0.16, 0.72]} />
        <meshStandardMaterial color="#59605e" metalness={0.52} roughness={0.34} />
      </instancedMesh>
      <instancedMesh ref={cab} args={[undefined, undefined, count]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.30, 0.18, 0.34]} />
        <meshPhysicalMaterial color="#cfd6d2" metalness={0.18} roughness={0.28} clearcoat={0.35} clearcoatRoughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={lamp} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[0.15, 0.045, 0.035]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3.2} toneMapped={false} />
      </instancedMesh>
    </>
  );

  return (
    <group position={[profile.x, profile.y, profile.z]}>
      <mesh position={[0, 0.018, -profile.length * 0.5]} receiveShadow>
        <boxGeometry args={[profile.laneOffset * 2.8, 0.025, profile.length]} />
        <meshStandardMaterial color="#4a4d49" roughness={0.92} metalness={0.02} />
      </mesh>
      <group ref={a}>{fleet(bodyA, cabA, lampA)}</group>
      <group ref={b}>{fleet(bodyB, cabB, lampB)}</group>
    </group>
  );
}

function ConveyorLoop({ position, length, accent, quality, speed = 1 }: { position: [number, number, number]; length: number; accent: string; quality: "high" | "medium"; speed?: number }) {
  const carriers = useRef<THREE.InstancedMesh>(null);
  const count = quality === "high" ? 11 : 7;
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!carriers.current || motionReduced()) return;
    t.current = (t.current + Math.min(delta, 0.08) * speed) % length;
    for (let i = 0; i < count; i += 1) {
      const x = -length * 0.5 + ((i * length / count + t.current) % length);
      runnerDummy.position.set(x, 0.18, 0);
      runnerDummy.rotation.set(0, 0, 0);
      runnerDummy.scale.set(1, 1, 1);
      runnerDummy.updateMatrix();
      carriers.current.setMatrixAt(i, runnerDummy.matrix);
    }
    carriers.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position}>
      <mesh receiveShadow>
        <boxGeometry args={[length, 0.10, 0.55]} />
        <meshStandardMaterial color="#444a49" metalness={0.62} roughness={0.42} />
      </mesh>
      <instancedMesh ref={carriers} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.44, 0.08, 0.38]} />
        <meshPhysicalMaterial color={accent} metalness={0.32} roughness={0.25} clearcoat={0.5} clearcoatRoughness={0.18} />
      </instancedMesh>
    </group>
  );
}

function CoolingFanBank({ quality }: { quality: "high" | "medium" }) {
  const fans = useRef<Array<THREE.Group | null>>([]);
  const positions: Array<[number, number, number]> = [[-2.5, 2.65, -1.55], [-1.3, 2.72, -1.55], [-0.1, 2.68, -1.55], [1.1, 2.72, -1.55]];
  useFrame((_, delta) => {
    if (motionReduced()) return;
    fans.current.forEach((fan, index) => { if (fan) fan.rotation.y += Math.min(delta, 0.08) * (2.2 + index * 0.18); });
  });
  return <group>{positions.slice(0, quality === "high" ? 4 : 3).map((position, index) => (
    <group key={index} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[0.42, 0.46, 0.16, 24]} />
        <meshStandardMaterial color="#69716f" metalness={0.72} roughness={0.34} />
      </mesh>
      <group ref={(node) => { fans.current[index] = node; }} position={[0, 0.12, 0]}>
        {[0, 1, 2, 3].map((blade) => <mesh key={blade} rotation={[0, blade * Math.PI / 2, 0]} position={[0.22, 0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.035, 0.11]} />
          <meshStandardMaterial color="#333a39" metalness={0.55} roughness={0.38} />
        </mesh>)}
      </group>
    </group>
  ))}</group>;
}

function GridPulse({ accent }: { accent: string }) {
  const pulse = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!pulse.current || motionReduced()) return;
    const phase = (state.clock.elapsedTime * 0.55) % 1;
    pulse.current.position.x = -3.8 + phase * 7.6;
  });
  return <group position={[0, 0.75, 2.65]}>
    <mesh>
      <boxGeometry args={[7.8, 0.035, 0.035]} />
      <meshStandardMaterial color="#4f5b5d" metalness={0.7} roughness={0.28} />
    </mesh>
    <group ref={pulse}>
      <mesh>
        <sphereGeometry args={[0.105, 14, 10]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <pointLight color={accent} intensity={1.9} distance={2.4} decay={2} />
    </group>
  </group>;
}

function SurveyDrone({ accent }: { accent: string }) {
  const drone = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!drone.current || motionReduced()) return;
    const t = state.clock.elapsedTime * 0.22;
    drone.current.position.set(Math.sin(t) * 2.6, 3.35 + Math.sin(t * 2.3) * 0.12, Math.cos(t) * 1.8 - 0.8);
    drone.current.rotation.y = -t + Math.PI * 0.5;
  });
  return <group ref={drone}>
    <mesh castShadow><boxGeometry args={[0.36, 0.10, 0.22]} /><meshStandardMaterial color="#333a39" metalness={0.7} roughness={0.28} /></mesh>
    <mesh position={[0, -0.075, 0.12]}><sphereGeometry args={[0.055, 10, 8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={4} toneMapped={false} /></mesh>
  </group>;
}

export function R6HeroAmbientMotion({ hero, accent, quality }: { hero: R6HeroId; accent: string; quality: "high" | "medium" }) {
  const profile = r612HeroMotion[hero];
  return (
    <group name="r612-runtime-motion" userData={{ runtimeOnly: true, assetPreserved: true }}>
      {profile.runner ? <EndlessServiceTrail profile={profile.runner} accent={accent} quality={quality} /> : null}
      {profile.water.map((water, index) => <FlowSurface key={`water-${index}`} profile={water} />)}
      {profile.steam.map((steam, index) => <SteamEmitter key={`steam-${index}`} profile={steam} quality={quality} index={index} />)}
      {hero === "manufacturing-line" ? <ConveyorLoop position={[0.4, 0.28, 2.0]} length={5.8} accent={accent} quality={quality} speed={1.05} /> : null}
      {hero === "recycling-intake" ? <ConveyorLoop position={[-0.7, 0.34, 1.55]} length={5.2} accent={accent} quality={quality} speed={0.82} /> : null}
      {hero === "data-center-cooling" ? <CoolingFanBank quality={quality} /> : null}
      {hero === "substation-bess" ? <GridPulse accent={accent} /> : null}
      {hero === "integrated-campus" || hero === "connected-campus" ? <SurveyDrone accent={accent} /> : null}
    </group>
  );
}
