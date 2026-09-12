"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SceneDefinition } from "@/experience/config/scenes";
import { InstancedSolarField } from "./InstancedSolarField";

function InstancedTrees({ count, start, spacing, quality }: { count: number; start: readonly [number, number, number]; spacing: number; quality: "high" | "medium" }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.055, 0.075, 0.52, 7), []);
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(0.34, quality === "high" ? 1 : 0), [quality]);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6d5037", roughness: 0.94 }), []);
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#526952", roughness: 0.9 }), []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const zJitter = ((i * 37) % 7) * 0.035;
      dummy.position.set(start[0] + i * spacing, start[1], start[2] + zJitter);
      dummy.scale.set(0.92 + (i % 3) * 0.08, 1, 0.92 + ((i + 1) % 3) * 0.07);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.48;
      dummy.scale.multiplyScalar(0.92 + (i % 2) * 0.08);
      dummy.updateMatrix();
      crowns.current?.setMatrixAt(i, dummy.matrix);
    }
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
  }, [count, spacing, start]);

  return <>
    <instancedMesh ref={trunks} args={[trunkGeo, trunkMat, count]} castShadow={quality === "high"} />
    <instancedMesh ref={crowns} args={[crownGeo, crownMat, count]} castShadow={quality === "high"} receiveShadow />
  </>;
}

function InstancedTurbines({ count, quality }: { count: number; quality: "high" | "medium" }) {
  const towers = useRef<THREE.InstancedMesh>(null);
  const nacelles = useRef<THREE.InstancedMesh>(null);
  const towerGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.18, 3.8, quality === "high" ? 12 : 8), [quality]);
  const nacelleGeo = useMemo(() => new THREE.BoxGeometry(0.42, 0.22, 0.22), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#edece7", roughness: 0.34, metalness: 0.15 }), []);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(-3.6 + i * 4.0, 1.9, -6.8 - (i % 2) * 1.1);
      dummy.updateMatrix();
      towers.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 3.82;
      dummy.updateMatrix();
      nacelles.current?.setMatrixAt(i, dummy.matrix);
    }
    if (towers.current) towers.current.instanceMatrix.needsUpdate = true;
    if (nacelles.current) nacelles.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return <>
    <instancedMesh ref={towers} args={[towerGeo, material, count]} castShadow={quality === "high"} />
    <instancedMesh ref={nacelles} args={[nacelleGeo, material, count]} castShadow={quality === "high"} />
  </>;
}

/** Repeated visual density stays on the GPU-instanced path in R6. */
export function R6InstancedDetails({ definition, sceneIndex, quality }: { definition: SceneDefinition; sceneIndex: number; quality: "high" | "medium" }) {
  if (definition.id === "generation") return <>
    <InstancedSolarField sceneIndex={sceneIndex} quality={quality} cols={quality === "high" ? 16 : 11} rows={quality === "high" ? 5 : 3} origin={[-1.1, 0.56, -5.2]} spacing={[1.48, 0.92]} panelScale={quality === "high" ? 0.48 : 0.44} />
    <InstancedTurbines count={quality === "high" ? 3 : 2} quality={quality} />
  </>;
  if (definition.id === "hero") return <>
    <InstancedSolarField sceneIndex={sceneIndex} quality={quality} cols={quality === "high" ? 12 : 8} rows={2} origin={[-4.1, 0.54, 5.5]} spacing={[1.48, 0.88]} panelScale={0.44} />
    <InstancedTrees count={quality === "high" ? 13 : 9} start={[-5.5, 0.27, -4.4]} spacing={0.9} quality={quality} />
  </>;
  if (definition.id === "data-centers") return <InstancedTrees count={quality === "high" ? 16 : 10} start={[-6.2, 0.27, 5.4]} spacing={0.78} quality={quality} />;
  if (definition.id === "recycling") return <InstancedTrees count={quality === "high" ? 12 : 8} start={[-5.2, 0.27, 5.8]} spacing={0.88} quality={quality} />;
  if (definition.id === "close") return <InstancedTrees count={quality === "high" ? 10 : 7} start={[-4.4, 0.27, -5.8]} spacing={0.94} quality={quality} />;
  return null;
}
