"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
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

function ProcessCarrierLoop({ hero, bounds, accent }: { hero: R6HeroId; bounds: HeroLocalBounds; accent: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const enabled = hero === "manufacturing-line" || hero === "recycling-intake";
  const count = hero === "manufacturing-line" ? 8 : 7;
  const lineLength = Math.max(4.2, bounds.size[0] * (hero === "manufacturing-line" ? 0.56 : 0.48));
  const y = bounds.min[1] + Math.max(0.30, bounds.size[1] * 0.16);
  const z = bounds.center[2] + bounds.size[2] * (hero === "manufacturing-line" ? 0.18 : 0.11);

  useFrame((_, delta) => {
    if (!enabled || !mesh.current || reducedMotion()) return;
    phase.current = (phase.current + Math.min(delta, 0.06) * (hero === "manufacturing-line" ? 0.135 : 0.105)) % 1;
    for (let i = 0; i < count; i += 1) {
      const u = (i / count + phase.current) % 1;
      tmp.position.set(bounds.center[0] - lineLength * 0.5 + u * lineLength, y, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      mesh.current.setMatrixAt(i, tmp.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;
  return (
    <instancedMesh
      ref={mesh}
      name={hero === "manufacturing-line" ? "moving-solar-modules" : "moving-recycling-feed"}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      {hero === "manufacturing-line"
        ? <boxGeometry args={[0.62, 0.065, 0.43]} />
        : <boxGeometry args={[0.34, 0.22, 0.30]} />}
      <meshPhysicalMaterial
        color={hero === "manufacturing-line" ? "#244e67" : accent}
        metalness={hero === "manufacturing-line" ? 0.42 : 0.18}
        roughness={hero === "manufacturing-line" ? 0.20 : 0.44}
        clearcoat={0.28}
        clearcoatRoughness={0.20}
      />
    </instancedMesh>
  );
}

function ManufacturingGantry({ bounds }: { bounds: HeroLocalBounds }) {
  const carriage = useRef<THREE.Group>(null);
  const gripper = useRef<THREE.Group>(null);
  const span = Math.max(3.6, bounds.size[0] * 0.36);
  const x0 = bounds.center[0] - span * 0.5;
  const y = bounds.min[1] + Math.max(0.72, bounds.size[1] * 0.38);
  const z = bounds.center[2] - bounds.size[2] * 0.08;

  useFrame((state) => {
    if (reducedMotion()) return;
    const t = state.clock.elapsedTime;
    if (carriage.current) carriage.current.position.x = x0 + ((Math.sin(t * 0.44) + 1) * 0.5) * span;
    if (gripper.current) gripper.current.position.y = -0.12 - (Math.sin(t * 0.88) + 1) * 0.085;
  });

  return (
    <group name="manufacturing-live-gantry" position={[0, y, z]}>
      <mesh position={[bounds.center[0], 0.44, 0]} castShadow>
        <boxGeometry args={[span + 0.75, 0.09, 0.10]} />
        <meshStandardMaterial color="#697270" metalness={0.68} roughness={0.28} />
      </mesh>
      <group ref={carriage} position={[x0, 0.38, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.24, 0.28]} />
          <meshStandardMaterial color="#e3e4de" metalness={0.20} roughness={0.30} />
        </mesh>
        <group ref={gripper} position={[0, -0.20, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.065, 0.42, 0.065]} />
            <meshStandardMaterial color="#7b8581" metalness={0.62} roughness={0.26} />
          </mesh>
          <mesh castShadow position={[0, -0.24, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.26]} />
            <meshStandardMaterial color="#caa258" metalness={0.40} roughness={0.28} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function CoolingFan({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!rotor.current || reducedMotion()) return;
    rotor.current.rotation.y += Math.min(delta, 0.06) * speed;
  });
  return (
    <group position={position} scale={scale} name="cooling-fan-runtime">
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.12, 32]} />
        <meshStandardMaterial color="#616c69" metalness={0.58} roughness={0.30} />
      </mesh>
      <group ref={rotor} position={[0, 0.07, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} castShadow rotation={[0, i * Math.PI / 2, 0]} position={[0, 0.03, 0.20]}>
            <boxGeometry args={[0.10, 0.035, 0.36]} />
            <meshStandardMaterial color="#d8ddd8" metalness={0.42} roughness={0.28} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function DataCenterOperations({ bounds }: { bounds: HeroLocalBounds }) {
  const y = bounds.max[1] + 0.08;
  const z = bounds.center[2] - bounds.size[2] * 0.10;
  const start = bounds.center[0] - bounds.size[0] * 0.24;
  const scale = Math.max(0.54, Math.min(0.80, bounds.size[0] / 16));
  return (
    <group name="data-center-live-cooling">
      {[0, 1, 2, 3].map((i) => (
        <CoolingFan key={i} position={[start + i * 1.05 * scale, y, z]} scale={scale} speed={1.45 + i * 0.12} />
      ))}
    </group>
  );
}

function Turbine({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!rotor.current || reducedMotion()) return;
    rotor.current.rotation.z += Math.min(delta, 0.06) * speed;
    if (state.gl.shadowMap.enabled && state.clock.elapsedTime % 0.12 < Math.min(delta, 0.06)) {
      state.gl.shadowMap.needsUpdate = true;
    }
  });

  const hubY = 6.05 * scale;
  const bladeLength = 2.55 * scale;
  return (
    <group position={position} name="rotating-turbine-runtime" userData={{ replacesAuthoredStaticTurbine: true }}>
      <mesh castShadow position={[0, hubY * 0.5, 0]}>
        <cylinderGeometry args={[0.065 * scale, 0.16 * scale, hubY, 36]} />
        <meshPhysicalMaterial color="#ecece6" metalness={0.22} roughness={0.30} clearcoat={0.16} />
      </mesh>
      <mesh castShadow position={[0, 0.05 * scale, 0]}>
        <cylinderGeometry args={[0.24 * scale, 0.28 * scale, 0.10 * scale, 28]} />
        <meshStandardMaterial color="#c9c7bf" roughness={0.72} metalness={0.04} />
      </mesh>
      <group position={[0, hubY, 0.04 * scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.19 * scale, 24, 18]} />
          <meshPhysicalMaterial color="#f3f3ec" metalness={0.18} roughness={0.24} clearcoat={0.24} />
        </mesh>
        <mesh castShadow position={[-0.16 * scale, 0.10 * scale, -0.05 * scale]}>
          <boxGeometry args={[0.72 * scale, 0.24 * scale, 0.28 * scale]} />
          <meshPhysicalMaterial color="#ededE7" metalness={0.18} roughness={0.28} clearcoat={0.18} />
        </mesh>
        <group ref={rotor}>
          {[0, 1, 2].map((i) => {
            const a = i * (Math.PI * 2 / 3);
            return (
              <group key={i} rotation={[0, 0, a]}>
                <mesh castShadow position={[0, bladeLength * 0.52, 0]}>
                  <boxGeometry args={[0.19 * scale, bladeLength, 0.055 * scale]} />
                  <meshPhysicalMaterial color="#f6f5ef" metalness={0.08} roughness={0.28} clearcoat={0.18} />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

type TurbinePlacement = { position: [number, number, number]; scale: number; speed: number };

const TURBINE_LAYOUTS: Partial<Record<R6HeroId, readonly TurbinePlacement[]>> = {
  // These are the original R4 authored turbine coordinates. The static R4/R5
  // versions are removed at build time; the animated assemblies occupy the same
  // plant zones instead of sitting outside the compound boundary.
  "integrated-campus": [
    { position: [7.0, 0, -0.7], scale: 0.82, speed: 0.82 },
    { position: [8.0, 0, -4.1], scale: 0.62, speed: 0.94 },
  ],
  "substation-bess": [
    { position: [7.2, 0, -3.7], scale: 0.96, speed: 0.76 },
    { position: [4.9, 0, -5.0], scale: 0.70, speed: 0.88 },
    { position: [9.2, 0, -5.4], scale: 0.60, speed: 0.98 },
  ],
  "connected-campus": [
    { position: [8.6, 0, -2.4], scale: 0.78, speed: 0.82 },
    { position: [9.1, 0, -5.0], scale: 0.58, speed: 0.96 },
  ],
};

function InPlantTurbines({ hero }: { hero: R6HeroId }) {
  const placements = TURBINE_LAYOUTS[hero];
  if (!placements?.length) return null;
  return (
    <group name="replacement-rotating-turbines" userData={{ originalTurbineZones: true, roadFree: true }}>
      {placements.map((placement, i) => (
        <Turbine key={`${hero}-${i}`} {...placement} />
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
      <pointsMaterial color="#d6ddd8" size={0.16} transparent opacity={0.12} depthWrite={false} />
    </points>
  );
}

export function R6HeroAmbientMotion({ hero, accent, quality: _quality, bounds }: { hero: R6HeroId; accent: string; quality: "high" | "medium"; bounds: HeroLocalBounds | null }) {
  if (!bounds) return null;
  return (
    <group name="r615-process-motion" userData={{ runtimeOnly: true, boundsAware: true, noRoadTraffic: true }}>
      <ProcessCarrierLoop hero={hero} bounds={bounds} accent={accent} />
      {hero === "manufacturing-line" ? <ManufacturingGantry bounds={bounds} /> : null}
      {hero === "data-center-cooling" ? <DataCenterOperations bounds={bounds} /> : null}
      <InPlantTurbines hero={hero} />
      <RoofSteam bounds={bounds} hero={hero} />
    </group>
  );
}
