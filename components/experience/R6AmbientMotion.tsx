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
        color={hero === "manufacturing-line" ? "#1b3f57" : accent}
        metalness={hero === "manufacturing-line" ? 0.48 : 0.20}
        roughness={hero === "manufacturing-line" ? 0.18 : 0.48}
        clearcoat={0.24}
        clearcoatRoughness={0.22}
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
        <meshStandardMaterial color="#505957" metalness={0.72} roughness={0.30} />
      </mesh>
      <group ref={carriage} position={[x0, 0.38, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.24, 0.28]} />
          <meshStandardMaterial color="#d7d8d1" metalness={0.24} roughness={0.34} />
        </mesh>
        <group ref={gripper} position={[0, -0.20, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.065, 0.42, 0.065]} />
            <meshStandardMaterial color="#6a7471" metalness={0.68} roughness={0.28} />
          </mesh>
          <mesh castShadow position={[0, -0.24, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.26]} />
            <meshStandardMaterial color="#bd9045" metalness={0.46} roughness={0.32} />
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
        <cylinderGeometry args={[0.46, 0.46, 0.12, 28]} />
        <meshStandardMaterial color="#4b5553" metalness={0.62} roughness={0.34} />
      </mesh>
      <group ref={rotor} position={[0, 0.07, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} castShadow rotation={[0, i * Math.PI / 2, 0]} position={[0, 0.03, 0.20]}>
            <boxGeometry args={[0.10, 0.035, 0.36]} />
            <meshStandardMaterial color="#c5cbc7" metalness={0.46} roughness={0.32} />
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
    if (state.gl.shadowMap.enabled && state.clock.elapsedTime % 0.12 < Math.min(delta, 0.06)) state.gl.shadowMap.needsUpdate = true;
  });
  const hubY = 4.55 * scale;
  const bladeLength = 1.60 * scale;
  return (
    <group position={position} name="rotating-turbine-runtime">
      <mesh castShadow position={[0, hubY * 0.5, 0]}>
        <cylinderGeometry args={[0.08 * scale, 0.18 * scale, hubY, 28]} />
        <meshStandardMaterial color="#d5d7d0" metalness={0.42} roughness={0.34} />
      </mesh>
      <group position={[0, hubY, 0.05 * scale]}>
        <mesh castShadow>
          <sphereGeometry args={[0.20 * scale, 20, 14]} />
          <meshStandardMaterial color="#e7e7df" metalness={0.30} roughness={0.28} />
        </mesh>
        <group ref={rotor}>
          {[0, 1, 2].map((i) => {
            const a = i * (Math.PI * 2 / 3);
            return (
              <group key={i} rotation={[0, 0, a]}>
                <mesh castShadow position={[0, bladeLength * 0.52, 0]}>
                  <boxGeometry args={[0.18 * scale, bladeLength, 0.07 * scale]} />
                  <meshStandardMaterial color="#f0efe7" metalness={0.14} roughness={0.31} />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

function InPlantTurbines({ hero, bounds }: { hero: R6HeroId; bounds: HeroLocalBounds }) {
  if (!(hero === "integrated-campus" || hero === "substation-bess" || hero === "connected-campus")) return null;
  const scale = Math.max(0.48, Math.min(0.68, bounds.size[1] / 5.2));
  const bladeMargin = 1.95 * scale;
  const right = bounds.max[0] - bladeMargin;
  const back = bounds.min[2] + bladeMargin;
  const count = hero === "substation-bess" ? 2 : hero === "integrated-campus" ? 2 : 1;
  return (
    <group name="in-plant-rotating-turbines" userData={{ insideHeroBounds: true }}>
      {Array.from({ length: count }, (_, i) => (
        <Turbine
          key={i}
          position={[right - i * 2.9 * scale, bounds.min[1], back + i * 1.25 * scale]}
          scale={scale}
          speed={0.92 + i * 0.13}
        />
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
      <pointsMaterial color="#aeb6b2" size={0.16} transparent opacity={0.15} depthWrite={false} />
    </points>
  );
}

export function R6HeroAmbientMotion({ hero, accent, quality: _quality, bounds }: { hero: R6HeroId; accent: string; quality: "high" | "medium"; bounds: HeroLocalBounds | null }) {
  if (!bounds) return null;
  return (
    <group name="r614-process-motion" userData={{ runtimeOnly: true, boundsAware: true, noRoadTraffic: true }}>
      <ProcessCarrierLoop hero={hero} bounds={bounds} accent={accent} />
      {hero === "manufacturing-line" ? <ManufacturingGantry bounds={bounds} /> : null}
      {hero === "data-center-cooling" ? <DataCenterOperations bounds={bounds} /> : null}
      <InPlantTurbines hero={hero} bounds={bounds} />
      <RoofSteam bounds={bounds} hero={hero} />
    </group>
  );
}
