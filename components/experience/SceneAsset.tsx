"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelTransform, sceneAssetForLod, sceneWeight, type SceneDefinition } from "@/experience/config/scenes";
import { storyMotion } from "@/experience/config/storyMotion";
import { useExperienceStore, type R6Lod } from "@/lib/experienceStore";
import { R6InstancedDetails } from "./R6InstancedDetails";
import { useSceneAsset } from "./useSceneAsset";

type MaterialBinding = {
  material: THREE.MeshStandardMaterial;
  opacity: number;
  emissiveIntensity: number;
  pulse: boolean;
  transparentAuthored: boolean;
};

function AssetFailureMarker() {
  return (
    <group>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[3.6, 1.6, 2.2]} />
        <meshStandardMaterial color="#373d37" wireframe />
      </mesh>
      <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.035, 8, 48]} />
        <meshBasicMaterial color="#b97828" />
      </mesh>
    </group>
  );
}

function tuneMaterial(material: THREE.MeshStandardMaterial, anisotropy: number, quality: "high" | "medium") {
  if (material.name === "SolarGlass") {
    material.roughness = Math.min(material.roughness, 0.18);
    material.metalness = Math.max(material.metalness, 0.48);
  } else if (material.name === "BlackGlass") {
    material.roughness = Math.min(material.roughness, 0.13);
    material.metalness = Math.max(material.metalness, 0.52);
  } else if (material.name === "VisionGlass") {
    material.roughness = Math.min(material.roughness, 0.10);
    material.metalness = Math.max(material.metalness, 0.14);
    material.opacity = Math.min(material.opacity, 0.67);
    material.transparent = true;
    material.depthWrite = false;
  } else if (material.name === "Concrete" || material.name === "Asphalt") {
    material.roughness = Math.max(material.roughness, 0.84);
  } else if (material.name === "Facade") {
    material.roughness = Math.min(material.roughness, 0.42);
    material.metalness = Math.max(material.metalness, 0.38);
  } else if (material.name === "Aluminum") {
    material.roughness = Math.min(material.roughness, 0.25);
    material.metalness = Math.max(material.metalness, 0.82);
  } else if (material.name === "Roof") {
    material.roughness = Math.max(material.roughness, 0.70);
    material.metalness = Math.min(material.metalness, 0.22);
  } else if (material.name === "Warning") {
    material.roughness = 0.50;
  } else if (material.name === "Rubber") {
    material.roughness = 0.94;
    material.metalness = 0;
  } else if (material.name === "Shadow") {
    material.roughness = 1;
    material.metalness = 0;
    material.opacity = Math.min(material.opacity, 0.28);
    material.transparent = true;
    material.depthWrite = false;
  } else if (material.name === "Bronze" || material.name === "Copper") {
    material.emissive.set("#21160a");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.08);
  } else if (material.name === "ServerFace") {
    material.emissive.set("#21170d");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.28);
  } else if (material.name === "WarmGlow") {
    material.emissive.set("#5a3513");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.58);
  } else if (material.name === "CoolGlow") {
    material.emissive.set("#203c5a");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.46);
  } else if (material.name === "Water") {
    material.roughness = Math.min(material.roughness, 0.16);
    material.metalness = Math.max(material.metalness, 0.38);
  } else if (material.name === "Vegetation" || material.name === "VegetationDark" || material.name === "Recycled") {
    material.roughness = Math.max(material.roughness, 0.78);
  } else if (material.name === "GreenGlow") {
    material.emissive.set("#173d25");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.34);
  }

  material.envMapIntensity = quality === "high" ? 1.22 : 1.0;
  for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.aoMap, material.emissiveMap]) {
    if (!texture) continue;
    texture.anisotropy = anisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }
  material.needsUpdate = true;
}

export function SceneAsset({
  definition,
  sceneIndex,
  quality,
  lod,
  onReady,
}: {
  definition: SceneDefinition;
  sceneIndex: number;
  quality: "high" | "medium";
  lod: R6Lod;
  onReady?: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const renderer = useThree((state) => state.gl);
  const smoothed = useRef(sceneWeight(sceneIndex, useExperienceStore.getState().progress));
  const assetUrl = sceneAssetForLod(definition, lod);
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), quality === "high" ? 16 : 8);
  const { gltf, failed } = useSceneAsset(assetUrl);

  const { instance, bindings } = useMemo(() => {
    if (!gltf) return { instance: null, bindings: [] as MaterialBinding[] };

    const cloned = skeletonClone(gltf.scene);
    const materialBindings: MaterialBinding[] = [];
    const materialMap = new Map<THREE.Material, THREE.Material>();

    cloned.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMaterials = sourceMaterials.map((source) => {
        let material = materialMap.get(source) as THREE.Material | undefined;
        if (!material) {
          material = source.clone();
          materialMap.set(source, material);
          if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const standard = material as THREE.MeshStandardMaterial;
            tuneMaterial(standard, anisotropy, quality);
            const transparentAuthored = standard.transparent || standard.name === "VisionGlass" || standard.name === "Shadow";
            if (!transparentAuthored) {
              // R6 never pushes ordinary architecture through generic alpha
              // blending. Alpha hash gives a depth-correct dithered dissolve while
              // preserving the opaque pass, MSAA coverage and stable shadows.
              standard.transparent = false;
              standard.depthWrite = true;
              standard.alphaHash = true;
            }
            materialBindings.push({
              material: standard,
              opacity: standard.opacity,
              emissiveIntensity: standard.emissiveIntensity,
              pulse: standard.name === "ServerFace",
              transparentAuthored,
            });
          }
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? clonedMaterials : clonedMaterials[0];

      const names = clonedMaterials.map((material) => material.name);
      const translucentOnly = names.every((name) => name === "VisionGlass" || name === "Shadow");
      const shadowLod = lod === "lod0" || (quality === "high" && lod === "lod1");
      mesh.castShadow = shadowLod && !translucentOnly;
      mesh.receiveShadow = lod !== "proxy" && names.every((name) => name !== "VisionGlass" && name !== "Shadow");
    });

    return { instance: cloned, bindings: materialBindings };
  }, [anisotropy, gltf, lod, quality]);

  useEffect(() => {
    if (instance) onReady?.();
  }, [instance, onReady]);

  useEffect(() => () => {
    for (const { material } of bindings) material.dispose();
  }, [bindings]);

  useFrame((state, delta) => {
    if (!root.current) return;
    const weight = sceneWeight(sceneIndex, useExperienceStore.getState().progress);
    smoothed.current = THREE.MathUtils.damp(smoothed.current, weight, storyMotion.sceneBlendDamping, delta);
    const w = THREE.MathUtils.clamp(smoothed.current, 0, 1);
    root.current.visible = w > 0.012;

    const transform = modelTransform(definition, state.size.width);
    root.current.position.set(transform.position[0], transform.position[1] - (1 - w) * 0.26, transform.position[2]);
    root.current.rotation.set(transform.rotation[0], transform.rotation[1] + (1 - w) * 0.032, transform.rotation[2]);
    const scale = transform.scale * (0.982 + w * 0.018);
    root.current.scale.setScalar(scale);

    const fade = THREE.MathUtils.smoothstep(w, 0.035, 0.93);
    const pulse = 0.9 + Math.sin(state.clock.elapsedTime * 1.65) * 0.1;
    for (const binding of bindings) {
      const material = binding.material;
      material.opacity = binding.opacity * fade;
      if (binding.transparentAuthored) {
        material.transparent = true;
        material.depthWrite = false;
      } else {
        material.transparent = false;
        material.depthWrite = true;
      }
      material.emissiveIntensity = binding.emissiveIntensity * (binding.pulse ? pulse : 1) * (0.55 + 0.45 * fade);
    }
  });

  return (
    <group ref={root}>
      {instance ? <primitive object={instance} /> : failed ? <AssetFailureMarker /> : null}
      {lod !== "proxy" ? <R6InstancedDetails definition={definition} sceneIndex={sceneIndex} quality={quality} /> : null}
    </group>
  );
}
