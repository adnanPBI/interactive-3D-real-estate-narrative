"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { r612HeroMotion } from "@/experience/config/r612Motion";
import type { R6HeroId } from "@/experience/config/r6Assets";

export type HeroLocalBounds = {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
  center: readonly [number, number, number];
  size: readonly [number, number, number];
};

function reducedMotion() {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
}

const tmp = new THREE.Object3D();

function ServiceTruck({ accent }: { accent: string }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.20, 0]}>
        <boxGeometry args={[0.82, 0.25, 0.36]} />
        <meshStandardMaterial color="#48514f" metalness={0.34} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0.22, 0.36, 0]}>
        <boxGeometry args={[0.34, 0.27, 0.34]} />
        <meshPhysicalMaterial color="#d5d8d3" metalness={0.08} roughness={0.30} clearcoat={0.28} clearcoatRoughness={0.26} />
      </mesh>
      {[-0.26, 0.27].flatMap((x) => [-0.20, 0.20].map((z) => (
        <mesh key={`${x}-${z}`} rotation={[Math.PI / 2, 0, 0]} position={[x, 0.08, z * 0.72]} castShadow>
          <cylinderGeometry args={[0.105, 0.105, 0.08, 16]} />
          <meshStandardMaterial color="#151817" roughness={0.78} />
        </mesh>
      )))}
      <mesh position={[0.31, 0.53, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.075, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Sparse, recognizable trucks on a road derived from the actual GLB footprint. */
function ReadableServiceTraffic({ bounds, accent, speed }: { bounds: HeroLocalBounds; accent: string; speed: number }) {
  const trucks = useRef<Array<THREE.Group | null>>([]);
  const progress = useRef(0);
  const width = Math.max(6, bounds.size[0] * 0.82);
  const roadZ = bounds.max[2] + Math.max(0.55, bounds.size[2] * 0.07);
  const roadY = bounds.min[1] + 0.025;
  const count = 3;

  useFrame((_, delta) => {
    if (reducedMotion()) return;
    progress.current = (progress.current + Math.min(delta, 0.06) * Math.max(0.16, speed * 0.72)) % 1;
    for (let i = 0; i < count; i += 1) {
      const node = trucks.current[i];
      if (!node) continue;
      const direction = i === 1 ? -1 : 1;
      const phase = (progress.current * direction + i / count + 3) % 1;
      const x = bounds.center[0] - width * 0.5 + phase * width;
      node.position.set(x, roadY, roadZ + (i === 1 ? 0.30 : -0.10));
      node.rotation.y = direction > 0 ? 0 : Math.PI;
    }
  });

  return (
    <group name="readable-service-traffic">
      <mesh position={[bounds.center[0], roadY, roadZ + 0.10]} receiveShadow>
        <boxGeometry args={[width * 1.06, 0.04, 1.05]} />
        <meshStandardMaterial color="#343938" roughness={0.96} metalness={0.02} />
      </mesh>
      <mesh position={[bounds.center[0], roadY + 0.025, roadZ + 0.10]}>
        <boxGeometry args={[width * 0.96, 0.012, 0.025]} />
        <meshStandardMaterial color="#ddd2ae" emissive="#b69a55" emissiveIntensity={0.12} />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(node) => { trucks.current[i] = node; }} scale={i === 1 ? 0.92 : 1}>
          <ServiceTruck accent={accent} />
        </group>
      ))}
    </group>
  );
}

function ProcessConveyor({ bounds, accent, hero }: { bounds: HeroLocalBounds; accent: string; hero: R6HeroId }) {
  const carriers = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const enabled = hero === "manufacturing-line" || hero === "recycling-intake";
  const count = 6;
  const length = Math.max(3.8, bounds.size[0] * 0.42);
  const y = bounds.min[1] + Math.max(0.24, bounds.size[1] * 0.055);
  const z = bounds.max[2] - bounds.size[2] * 0.15;

  useFrame((_, delta) => {
    if (!enabled || !carriers.current || reducedMotion()) return;
    phase.current = (phase.current + Math.min(delta, 0.06) * 0.10) % 1;
    for (let i = 0; i < count; i += 1) {
      const u = (i / count + phase.current) % 1;
      tmp.position.set(bounds.center[0] - length * 0.5 + u * length, y + 0.13, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      carriers.current.setMatrixAt(i, tmp.matrix);
    }
    carriers.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;
  return (
    <group name="readable-process-conveyor">
      <mesh position={[bounds.center[0], y, z]} receiveShadow>
        <boxGeometry args={[length, 0.13, 0.62]} />
        <meshStandardMaterial color="#353b3a" metalness={0.58} roughness={0.42} />
      </mesh>
      <instancedMesh ref={carriers} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.44, 0.18, 0.40]} />
        <meshPhysicalMaterial color={accent} metalness={0.24} roughness={0.31} clearcoat={0.25} clearcoatRoughness={0.22} />
      </instancedMesh>
    </group>
  );
}

function Turbine({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!rotor.current || reducedMotion()) return;
    rotor.current.rotation.z += Math.min(delta, 0.06) * speed;
  });
  const hubY = 5.1 * scale;
  const bladeLength = 1.75 * scale;
  return (
    <group position={position}>
      <mesh castShadow position={[0, hubY * 0.5, 0]}>
        <cylinderGeometry args={[0.075 * scale, 0.17 * scale, hubY, 28]} />
        <meshStandardMaterial color="#d2d4ce" metalness={0.46} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0, 0.06 * scale, 0]}>
        <cylinderGeometry args={[0.28 * scale, 0.34 * scale, 0.12 * scale, 24]} />
        <meshStandardMaterial color="#777d79" roughness={0.64} />
      </mesh>
      <group position={[0, hubY, 0.03 * scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18 * scale, 20, 14]} />
          <meshStandardMaterial color="#e1e1da" metalness={0.32} roughness={0.28} />
        </mesh>
        <group ref={rotor}>
          {[0, 1, 2].map((i) => {
            const a = i * (Math.PI * 2 / 3);
            return (
              <mesh key={i} castShadow position={[Math.cos(a) * bladeLength * 0.52, Math.sin(a) * bladeLength * 0.52, 0]} rotation={[0, 0, a - Math.PI / 2]}>
                <boxGeometry args={[0.17 * scale, bladeLength, 0.055 * scale]} />
                <meshStandardMaterial color="#ecece6" metalness={0.18} roughness={0.34} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function ReadableTurbines({ hero, bounds }: { hero: R6HeroId; bounds: HeroLocalBounds }) {
  if (!(hero === "integrated-campus" || hero === "substation-bess" || hero === "connected-campus")) return null;
  const z = bounds.min[2] + bounds.size[2] * 0.18;
  const baseX = bounds.max[0] + Math.max(0.75, bounds.size[0] * 0.05);
  const scale = Math.max(0.62, Math.min(0.82, bounds.size[1] / 4.8));
  const count = hero === "substation-bess" ? 2 : 1;
  return (
    <group name="readable-runtime-turbines">
      {Array.from({ length: count }, (_, i) => (
        <Turbine key={i} position={[baseX + i * 2.0 * scale, bounds.min[1], z - i * 1.2]} scale={scale} speed={0.72 + i * 0.09} />
      ))}
    </group>
  );
}

function RoofSteam({ bounds, hero }: { bounds: HeroLocalBounds; hero: R6HeroId }) {
  const points = useRef<THREE.Points>(null);
  const enabled = hero === "data-center-cooling" || hero === "manufacturing-line";
  const geometry = useMemo(() => {
    const count = 18;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = Math.sin(i * 2.2) * 0.10;
      arr[i * 3 + 1] = (i / count) * 0.9;
      arr[i * 3 + 2] = Math.cos(i * 1.6) * 0.08;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((state) => {
    if (!enabled || !points.current || reducedMotion()) return;
    points.current.position.y = bounds.max[1] + 0.12 + ((state.clock.elapsedTime * 0.025) % 0.16);
  });
  if (!enabled) return null;
  return (
    <points ref={points} geometry={geometry} position={[bounds.center[0] + bounds.size[0] * 0.10, bounds.max[1] + 0.12, bounds.center[2] - bounds.size[2] * 0.10]} frustumCulled={false}>
      <pointsMaterial color="#aeb6b2" size={0.16} transparent opacity={0.16} depthWrite={false} />
    </points>
  );
}

export function R6HeroAmbientMotion({ hero, accent, quality: _quality, bounds }: { hero: R6HeroId; accent: string; quality: "high" | "medium"; bounds: HeroLocalBounds | null }) {
  const profile = r612HeroMotion[hero];
  if (!bounds) return null;
  return (
    <group name="r613-readable-motion" userData={{ runtimeOnly: true, boundsAware: true, semanticMotion: true }}>
      {profile.runner ? <ReadableServiceTraffic bounds={bounds} accent={accent} speed={profile.runner.speed} /> : null}
      <ProcessConveyor bounds={bounds} accent={accent} hero={hero} />
      <ReadableTurbines hero={hero} bounds={bounds} />
      <RoofSteam bounds={bounds} hero={hero} />
    </group>
  );
}
