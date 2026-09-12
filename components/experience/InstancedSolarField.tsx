"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneWeight } from "@/experience/config/scenes";
import { storyMotion } from "@/experience/config/storyMotion";
import { useExperienceStore } from "@/lib/experienceStore";

type Props = {
  sceneIndex: number;
  quality: "high" | "medium";
  cols: number;
  rows: number;
  origin: readonly [number, number, number];
  spacing?: readonly [number, number];
  panelScale?: number;
  tilt?: number;
  yaw?: number;
};

/** Two opaque/alpha-hashed instanced draws for an entire repeated solar field. */
export function InstancedSolarField({
  sceneIndex,
  quality,
  cols,
  rows,
  origin,
  spacing = [1.48, 0.92],
  panelScale = 0.48,
  tilt = -0.23,
  yaw = 0,
}: Props) {
  const panelRef = useRef<THREE.InstancedMesh>(null);
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const smoothed = useRef(sceneWeight(sceneIndex, useExperienceStore.getState().progress));
  const count = cols * rows;

  const panelGeometry = useMemo(() => new THREE.BoxGeometry(1.42, 0.040, 0.82), []);
  const frameGeometry = useMemo(() => new THREE.BoxGeometry(1.50, 0.030, 0.90), []);
  const panelMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    name: "R6InstancedSolarGlass",
    color: "#17394e",
    metalness: 0.58,
    roughness: 0.14,
    envMapIntensity: quality === "high" ? 1.28 : 1.0,
    transparent: false,
    alphaHash: true,
  }), [quality]);
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    name: "R6InstancedSolarFrame",
    color: "#aeb6b5",
    metalness: 0.88,
    roughness: 0.22,
    envMapIntensity: quality === "high" ? 1.22 : 0.94,
    transparent: false,
    alphaHash: true,
  }), [quality]);

  useLayoutEffect(() => {
    if (!panelRef.current || !frameRef.current) return;
    const dummy = new THREE.Object3D();
    let index = 0;
    const [ox, oy, oz] = origin;
    const [sx, sz] = spacing;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        dummy.position.set(ox + (col - (cols - 1) / 2) * sx * panelScale, oy, oz + (row - (rows - 1) / 2) * sz * panelScale);
        dummy.rotation.set(tilt, yaw, 0);
        dummy.scale.setScalar(panelScale);
        dummy.updateMatrix();
        frameRef.current.setMatrixAt(index, dummy.matrix);
        dummy.position.y += 0.026 * panelScale;
        dummy.updateMatrix();
        panelRef.current.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    frameRef.current.instanceMatrix.needsUpdate = true;
    panelRef.current.instanceMatrix.needsUpdate = true;
    frameRef.current.computeBoundingSphere();
    panelRef.current.computeBoundingSphere();
  }, [cols, origin, panelScale, rows, spacing, tilt, yaw]);

  useFrame((_, delta) => {
    const weight = sceneWeight(sceneIndex, useExperienceStore.getState().progress);
    smoothed.current = THREE.MathUtils.damp(smoothed.current, weight, storyMotion.sceneBlendDamping, delta);
    const fade = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(smoothed.current, 0, 1), 0.05, 0.92);
    panelMaterial.opacity = fade;
    frameMaterial.opacity = fade;
    const visible = fade > 0.012;
    if (panelRef.current) panelRef.current.visible = visible;
    if (frameRef.current) frameRef.current.visible = visible;
  });

  useEffect(() => () => {
    panelGeometry.dispose();
    frameGeometry.dispose();
    panelMaterial.dispose();
    frameMaterial.dispose();
  }, [frameGeometry, frameMaterial, panelGeometry, panelMaterial]);

  return <>
    <instancedMesh ref={frameRef} args={[frameGeometry, frameMaterial, count]} castShadow={quality === "high"} receiveShadow={quality === "high"} frustumCulled />
    <instancedMesh ref={panelRef} args={[panelGeometry, panelMaterial, count]} castShadow={false} receiveShadow={quality === "high"} frustumCulled />
  </>;
}
