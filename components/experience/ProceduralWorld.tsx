"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { proceduralChapterProfiles } from "@/experience/config/proceduralWorld";
import { proceduralSample, resolveProceduralRuntime } from "@/experience/systems/proceduralRuntime";
import { useExperienceStore } from "@/lib/experienceStore";

const dummy = new THREE.Object3D();
const turbineMaterial = new THREE.MeshStandardMaterial({ color: "#d5d7d4", roughness: 0.58, metalness: 0.42 });
const rotorMaterial = new THREE.MeshStandardMaterial({ color: "#e5e6e2", roughness: 0.52, metalness: 0.3 });
const FRONT_WRAP_Z = 12;

type Slot = {
  z: number;
  x: number;
  scale: number;
  yaw: number;
  variant: number;
};

type Layout = {
  structures: Slot[];
  solar: Slot[];
  traffic: Slot[];
  beacons: Slot[];
  turbines: Slot[];
};

function buildLayout(seed: string, chapter: number, count: number, segmentLength: number, lateralSpread: number, density: number, profile: (typeof proceduralChapterProfiles)[number]): Layout {
  const layout: Layout = { structures: [], solar: [], traffic: [], beacons: [], turbines: [] };
  const boundedCount = Math.max(5, Math.min(14, Math.round(count * density)));

  for (let index = 0; index < boundedCount; index += 1) {
    const baseZ = -segmentLength * (index + 0.35);
    const side = proceduralSample(seed, chapter, index, 1) > 0.5 ? 1 : -1;
    const sideX = side * (4.8 + proceduralSample(seed, chapter, index, 2) * Math.max(1, lateralSpread - 4.8));
    const yaw = (proceduralSample(seed, chapter, index, 3) - 0.5) * 0.22;
    const scale = 0.72 + proceduralSample(seed, chapter, index, 4) * 0.7;
    const variant = proceduralSample(seed, chapter, index, 5);

    if (proceduralSample(seed, chapter, index, 10) < profile.structureProbability) {
      layout.structures.push({ z: baseZ, x: sideX, scale, yaw, variant });
    }
    if (proceduralSample(seed, chapter, index, 11) < profile.solarProbability) {
      layout.solar.push({ z: baseZ - 3.2, x: -sideX * 0.72, scale: 0.72 + scale * 0.28, yaw: side * 0.08, variant });
    }
    if (proceduralSample(seed, chapter, index, 12) < profile.beaconProbability) {
      layout.beacons.push({ z: baseZ + 2.6, x: side * (2.8 + proceduralSample(seed, chapter, index, 13) * 2.5), scale: 0.75, yaw: 0, variant });
    }
    if (proceduralSample(seed, chapter, index, 14) < profile.turbineProbability && layout.turbines.length < 4) {
      layout.turbines.push({ z: baseZ - 6.0, x: sideX * 1.08, scale: 0.78 + scale * 0.22, yaw: 0, variant });
    }

    const trafficCount = proceduralSample(seed, chapter, index, 20) < profile.traffic ? 2 : 1;
    for (let lane = 0; lane < trafficCount; lane += 1) {
      const laneSide = lane === 0 ? -1 : 1;
      layout.traffic.push({
        z: baseZ - proceduralSample(seed, chapter, index, 21 + lane) * segmentLength,
        x: laneSide * (1.1 + proceduralSample(seed, chapter, index, 23 + lane) * 0.3),
        scale: 0.58 + proceduralSample(seed, chapter, index, 25 + lane) * 0.34,
        yaw: laneSide < 0 ? 0 : Math.PI,
        variant,
      });
    }
  }

  return layout;
}

function wrapZ(baseZ: number, offset: number, loopLength: number) {
  if (loopLength <= 0) return baseZ;
  let z = baseZ + offset;
  while (z > FRONT_WRAP_Z) z -= loopLength;
  while (z <= FRONT_WRAP_Z - loopLength) z += loopLength;
  return z;
}

function writeMatrix(
  mesh: THREE.InstancedMesh | null,
  slots: Slot[],
  kind: "structure" | "solar" | "traffic" | "beacon",
  offset = 0,
  loopLength = Number.POSITIVE_INFINITY,
) {
  if (!mesh) return;
  mesh.count = slots.length;
  slots.forEach((slot, index) => {
    dummy.position.set(slot.x, -1.48, Number.isFinite(loopLength) ? wrapZ(slot.z, offset, loopLength) : slot.z);
    dummy.rotation.set(0, slot.yaw, 0);
    if (kind === "structure") {
      const width = (2.2 + slot.variant * 2.1) * slot.scale;
      const height = (1.2 + slot.variant * 2.2) * slot.scale;
      const depth = (2.6 + (1 - slot.variant) * 2.3) * slot.scale;
      dummy.position.y += height * 0.5;
      dummy.scale.set(width, height, depth);
    } else if (kind === "solar") {
      dummy.position.y += 0.18;
      dummy.rotation.x = -0.16;
      dummy.scale.set(2.8 * slot.scale, 0.08, 1.65 * slot.scale);
    } else if (kind === "traffic") {
      dummy.position.y += 0.22;
      dummy.scale.set(0.55 * slot.scale, 0.34 * slot.scale, 1.25 * slot.scale);
    } else {
      dummy.position.y += 0.42;
      dummy.scale.setScalar(0.14 * slot.scale);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function Turbine({
  slot,
  phase,
  wind,
  shadows,
  offsetRef,
  loopLength,
}: {
  slot: Slot;
  phase: number;
  wind: number;
  shadows: boolean;
  offsetRef: { current: number };
  loopLength: number;
}) {
  const root = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (root.current) root.current.position.z = wrapZ(slot.z, offsetRef.current, loopLength);
    if (rotor.current) rotor.current.rotation.z += delta * (0.42 + wind * 0.72 + phase * 0.08);
  });

  const height = 3.7 * slot.scale;
  return (
    <group ref={root} position={[slot.x, -1.48, slot.z]} scale={slot.scale}>
      <mesh position={[0, height * 0.5, 0]} material={turbineMaterial} castShadow={shadows} receiveShadow={false}>
        <cylinderGeometry args={[0.08, 0.16, height, 8]} />
      </mesh>
      <group position={[0, height, 0]} rotation={[0, slot.variant * 0.35 - 0.18, 0]}>
        <mesh material={turbineMaterial} castShadow={shadows}>
          <sphereGeometry args={[0.16, 10, 8]} />
        </mesh>
        <group ref={rotor} rotation={[0, 0, phase * Math.PI * 2]}>
          {[0, 1, 2].map((blade) => (
            <mesh key={blade} rotation={[0, 0, blade * Math.PI * 2 / 3]} position={[0, 0.72, 0]} material={rotorMaterial} castShadow={shadows}>
              <boxGeometry args={[0.1, 1.35, 0.055]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export function ProceduralWorld({ quality }: { quality: "high" | "medium" }) {
  const activeChapter = useExperienceStore((state) => state.activeChapter);
  const runtimeConfig = useExperienceStore((state) => state.procedural);
  const profile = proceduralChapterProfiles[activeChapter] ?? proceduralChapterProfiles[0];
  const reducedMotion = typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
  const runtime = resolveProceduralRuntime(profile, runtimeConfig, quality, reducedMotion);
  const structures = useRef<THREE.InstancedMesh>(null);
  const solar = useRef<THREE.InstancedMesh>(null);
  const traffic = useRef<THREE.InstancedMesh>(null);
  const beacons = useRef<THREE.InstancedMesh>(null);
  const runnerDistance = useRef(0);
  const trafficDistance = useRef(0);

  const chunkCount = quality === "high" ? 12 : 8;
  const loopLength = profile.segmentLength * Math.max(5, Math.round(chunkCount * runtime.density));
  const layout = useMemo(
    () => buildLayout(runtime.seed, activeChapter, chunkCount, profile.segmentLength, profile.lateralSpread, runtime.density, profile),
    [activeChapter, chunkCount, profile, runtime.density, runtime.seed],
  );

  useEffect(() => {
    runnerDistance.current = 0;
    trafficDistance.current = 0;
    writeMatrix(structures.current, layout.structures, "structure", 0, loopLength);
    writeMatrix(solar.current, layout.solar, "solar", 0, loopLength);
    writeMatrix(traffic.current, layout.traffic, "traffic", 0, loopLength);
    writeMatrix(beacons.current, layout.beacons, "beacon", 0, loopLength);
  }, [layout, loopLength]);

  useFrame((state, delta) => {
    if (!runtime.enabled || runtime.runnerMode === "off" || reducedMotion) return;
    const boundedDelta = Math.min(delta, 0.1);
    runnerDistance.current = (runnerDistance.current + boundedDelta * runtime.speed * 3.2) % loopLength;
    trafficDistance.current = (trafficDistance.current + boundedDelta * (3.8 + runtime.traffic * 2.5)) % loopLength;

    writeMatrix(structures.current, layout.structures, "structure", runnerDistance.current, loopLength);
    writeMatrix(solar.current, layout.solar, "solar", runnerDistance.current, loopLength);
    writeMatrix(beacons.current, layout.beacons, "beacon", runnerDistance.current, loopLength);
    writeMatrix(traffic.current, layout.traffic, "traffic", trafficDistance.current, loopLength);

    // Animated turbine blades cast dynamic shadows only on the high tier.
    if (layout.turbines.length > 0 && runtime.wind > 0 && state.gl.shadowMap.enabled) state.gl.shadowMap.needsUpdate = true;
  });

  const dusk = runtime.timeOfDay >= 17.2 || runtime.timeOfDay < 7.0 || runtime.weather === "dusk";
  const hazeFactor = runtime.weather === "haze" ? 0.86 : 1;
  const shadows = quality === "high" && runtime.speed < 2.4;

  if (!runtime.enabled) return null;

  return (
    <group name="r612-procedural-world" userData={{ procedural: true, seed: runtime.seed, chapter: profile.id }}>
      <instancedMesh ref={structures} args={[undefined, undefined, Math.max(1, layout.structures.length)]} visible={layout.structures.length > 0} frustumCulled={false} castShadow={shadows} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={profile.palette.structure} roughness={0.78} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={solar} args={[undefined, undefined, Math.max(1, layout.solar.length)]} visible={layout.solar.length > 0} frustumCulled={false} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={profile.palette.solar} roughness={0.28} metalness={0.54} emissive={dusk ? profile.palette.accent : "#000000"} emissiveIntensity={dusk ? 0.06 : 0} />
      </instancedMesh>
      <instancedMesh ref={beacons} args={[undefined, undefined, Math.max(1, layout.beacons.length)]} visible={layout.beacons.length > 0} frustumCulled={false} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={profile.palette.accent} emissive={profile.palette.accent} emissiveIntensity={(dusk ? 2.1 : 0.85) * hazeFactor} roughness={0.38} metalness={0.15} />
      </instancedMesh>
      {layout.turbines.map((slot, index) => (
        <Turbine
          key={`${activeChapter}-${index}`}
          slot={slot}
          phase={slot.variant}
          wind={runtime.wind}
          shadows={shadows}
          offsetRef={runnerDistance}
          loopLength={loopLength}
        />
      ))}

      <instancedMesh ref={traffic} args={[undefined, undefined, Math.max(1, layout.traffic.length)]} visible={layout.traffic.length > 0} frustumCulled={false} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={profile.palette.service} roughness={0.5} metalness={0.42} emissive={dusk ? "#ffd7a0" : "#000000"} emissiveIntensity={dusk ? 0.08 : 0} />
      </instancedMesh>

      <mesh position={[0, -1.505, -loopLength * 0.45]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[4.8, loopLength * 1.35]} />
        <meshStandardMaterial color={profile.palette.road} roughness={0.96} metalness={0} />
      </mesh>
      <mesh position={[0, -1.495, -loopLength * 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.065, loopLength * 1.35]} />
        <meshBasicMaterial color="#ece8dc" />
      </mesh>
    </group>
  );
}
