"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
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

const dummy = new THREE.Object3D();

function ServiceTraffic({ bounds, accent, speed, quality }: { bounds: HeroLocalBounds; accent: string; speed: number; quality: "high" | "medium" }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const cabs = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);
  const progress = useRef(0);
  const count = quality === "high" ? 6 : 4;
  const width = Math.max(5, bounds.size[0]);
  const roadZ = bounds.max[2] + Math.max(0.38, bounds.size[2] * 0.045);
  const roadY = bounds.min[1] + 0.055;
  const lane = Math.max(0.18, Math.min(0.34, bounds.size[2] * 0.025));
  const vehicleScale = Math.max(0.58, Math.min(0.92, width / 13));

  useFrame((_, delta) => {
    if (reducedMotion()) return;
    progress.current = (progress.current + Math.min(delta, 0.06) * Math.max(0.14, speed)) % width;
    for (let i = 0; i < count; i += 1) {
      const direction = i % 2 === 0 ? 1 : -1;
      const base = (i / count) * width;
      const wrapped = ((base + progress.current * direction + width * 4) % width) - width * 0.5;
      const x = bounds.center[0] + wrapped;
      const z = roadZ + (i % 2 === 0 ? -lane : lane);
      const yaw = direction > 0 ? Math.PI / 2 : -Math.PI / 2;

      dummy.position.set(x, roadY + 0.13 * vehicleScale, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(vehicleScale, vehicleScale, vehicleScale);
      dummy.updateMatrix();
      bodies.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + direction * 0.15 * vehicleScale, roadY + 0.23 * vehicleScale, z);
      dummy.scale.set(vehicleScale * 0.76, vehicleScale * 0.76, vehicleScale * 0.76);
      dummy.updateMatrix();
      cabs.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + direction * 0.36 * vehicleScale, roadY + 0.20 * vehicleScale, z);
      dummy.scale.set(vehicleScale * 0.58, vehicleScale * 0.58, vehicleScale * 0.58);
      dummy.updateMatrix();
      lamps.current?.setMatrixAt(i, dummy.matrix);
    }
    for (const mesh of [bodies.current, cabs.current, lamps.current]) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="bounds-aware-service-traffic">
      <mesh position={[bounds.center[0], roadY, roadZ]} receiveShadow>
        <boxGeometry args={[width * 1.06, 0.035, lane * 3.8]} />
        <meshStandardMaterial color="#3f4341" roughness={0.93} metalness={0.03} />
      </mesh>
      <instancedMesh ref={bodies} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.66, 0.18, 0.32]} />
        <meshStandardMaterial color="#4d5653" metalness={0.42} roughness={0.42} />
      </instancedMesh>
      <instancedMesh ref={cabs} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.32, 0.20, 0.30]} />
        <meshStandardMaterial color="#b6bfbb" metalness={0.16} roughness={0.36} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[0.06, 0.05, 0.14]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.35} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function RoofSteam({ bounds, hero, quality }: { bounds: HeroLocalBounds; hero: R6HeroId; quality: "high" | "medium" }) {
  const material = useRef<THREE.PointsMaterial>(null);
  const emitters = hero === "data-center-cooling" ? 2 : hero === "manufacturing-line" || hero === "recycling-intake" ? 1 : 0;
  const count = quality === "high" ? 22 : 14;
  const points = useMemo(() => {
    if (!emitters) return new THREE.BufferGeometry();
    const array = new Float32Array(count * emitters * 3);
    for (let e = 0; e < emitters; e += 1) {
      const originX = bounds.center[0] + (e - (emitters - 1) / 2) * bounds.size[0] * 0.18;
      const originZ = bounds.center[2] - bounds.size[2] * 0.12;
      for (let i = 0; i < count; i += 1) {
        const k = e * count + i;
        const phase = i / count;
        array[k * 3] = originX + Math.sin(i * 2.399) * bounds.size[0] * 0.012;
        array[k * 3 + 1] = bounds.max[1] + 0.10 + phase * Math.max(0.9, bounds.size[1] * 0.28);
        array[k * 3 + 2] = originZ + Math.cos(i * 1.73) * bounds.size[2] * 0.012;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(array, 3));
    return g;
  }, [bounds, count, emitters]);

  useEffect(() => () => points.dispose(), [points]);
  useFrame((state) => {
    if (reducedMotion() || !points.attributes.position) return;
    const attr = points.attributes.position as THREE.BufferAttribute;
    const rise = Math.max(0.9, bounds.size[1] * 0.28);
    for (let k = 0; k < attr.count; k += 1) {
      const emitter = Math.floor(k / count);
      const originX = bounds.center[0] + (emitter - (emitters - 1) / 2) * bounds.size[0] * 0.18;
      const originZ = bounds.center[2] - bounds.size[2] * 0.12;
      const local = (k % count) / count;
      const phase = (local + state.clock.elapsedTime * 0.035) % 1;
      attr.setXYZ(
        k,
        originX + Math.sin(k * 2.399 + phase * 5) * bounds.size[0] * 0.012 * (0.3 + phase),
        bounds.max[1] + 0.10 + phase * rise,
        originZ + Math.cos(k * 1.73 + phase * 4) * bounds.size[2] * 0.012 * (0.3 + phase),
      );
    }
    attr.needsUpdate = true;
    if (material.current) material.current.opacity = 0.12;
  });

  if (!emitters) return null;
  return (
    <points geometry={points} frustumCulled={false}>
      <pointsMaterial ref={material} color="#d4d8d5" size={quality === "high" ? 0.18 : 0.14} sizeAttenuation transparent opacity={0.12} depthWrite={false} />
    </points>
  );
}

function ProcessLine({ bounds, accent, hero, quality }: { bounds: HeroLocalBounds; accent: string; hero: R6HeroId; quality: "high" | "medium" }) {
  const carriers = useRef<THREE.InstancedMesh>(null);
  const t = useRef(0);
  const enabled = hero === "manufacturing-line" || hero === "recycling-intake";
  const count = quality === "high" ? 8 : 5;
  const length = bounds.size[0] * 0.48;
  const y = bounds.min[1] + Math.max(0.16, bounds.size[1] * 0.035);
  const z = bounds.max[2] - bounds.size[2] * 0.16;

  useFrame((_, delta) => {
    if (!enabled || !carriers.current || reducedMotion()) return;
    t.current = (t.current + Math.min(delta, 0.06) * 0.18) % 1;
    for (let i = 0; i < count; i += 1) {
      const u = (i / count + t.current) % 1;
      dummy.position.set(bounds.center[0] - length * 0.5 + u * length, y + 0.10, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carriers.current.setMatrixAt(i, dummy.matrix);
    }
    carriers.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;
  return (
    <group>
      <mesh position={[bounds.center[0], y, z]} receiveShadow>
        <boxGeometry args={[length, 0.08, 0.42]} />
        <meshStandardMaterial color="#454a48" metalness={0.46} roughness={0.48} />
      </mesh>
      <instancedMesh ref={carriers} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.34, 0.08, 0.30]} />
        <meshStandardMaterial color={accent} metalness={0.22} roughness={0.34} />
      </instancedMesh>
    </group>
  );
}

export function R6HeroAmbientMotion({ hero, accent, quality, bounds }: { hero: R6HeroId; accent: string; quality: "high" | "medium"; bounds: HeroLocalBounds | null }) {
  const profile = r612HeroMotion[hero];
  if (!bounds) return null;
  return (
    <group name="r612-runtime-motion" userData={{ runtimeOnly: true, boundsAware: true }}>
      {profile.runner ? <ServiceTraffic bounds={bounds} accent={accent} speed={profile.runner.speed} quality={quality} /> : null}
      <RoofSteam bounds={bounds} hero={hero} quality={quality} />
      <ProcessLine bounds={bounds} accent={accent} hero={hero} quality={quality} />
    </group>
  );
}
