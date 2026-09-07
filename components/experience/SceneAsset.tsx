"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { activeAssetSet, modelTransform, sceneAssetForQuality, sceneWeight, type SceneDefinition } from "@/experience/config/scenes";
import { storyMotion } from "@/experience/config/storyMotion";
import { useExperienceStore } from "@/lib/experienceStore";
import { InstancedSolarField } from "./InstancedSolarField";
import { useSceneAsset } from "./useSceneAsset";

type MaterialBinding = {
  material: THREE.MeshStandardMaterial;
  opacity: number;
  emissiveIntensity: number;
  pulse: boolean;
  stableDepthWrite: boolean;
  stableTransparent: boolean;
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
  // Stage 3 art-direction guardrails. The GLB owns its PBR values; these are
  // deliberately small runtime adjustments that keep authored assets coherent.
  if (material.name === "SolarGlass") {
    material.roughness = Math.min(material.roughness, 0.22);
    material.metalness = Math.max(material.metalness, 0.45);
  } else if (material.name === "BlackGlass") {
    material.roughness = Math.min(material.roughness, 0.16);
    material.metalness = Math.max(material.metalness, 0.5);
  } else if (material.name === "VisionGlass") {
    material.roughness = Math.min(material.roughness, 0.11);
    material.metalness = Math.max(material.metalness, 0.16);
    material.opacity = Math.min(material.opacity, 0.72);
    material.transparent = true;
    material.depthWrite = false;
  } else if (material.name === "Concrete" || material.name === "Asphalt") {
    material.roughness = Math.max(material.roughness, 0.82);
  } else if (material.name === "Facade") {
    material.roughness = Math.min(material.roughness, 0.48);
    material.metalness = Math.max(material.metalness, 0.34);
  } else if (material.name === "Aluminum") {
    material.roughness = Math.min(material.roughness, 0.30);
    material.metalness = Math.max(material.metalness, 0.78);
  } else if (material.name === "Roof") {
    material.roughness = Math.max(material.roughness, 0.68);
    material.metalness = Math.min(material.metalness, 0.24);
  } else if (material.name === "Warning") {
    material.roughness = 0.55;
  } else if (material.name === "Rubber") {
    material.roughness = 0.92;
    material.metalness = 0;
  } else if (material.name === "Shadow") {
    material.roughness = 1;
    material.metalness = 0;
    material.opacity = Math.min(material.opacity, 0.36);
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
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.6);
  } else if (material.name === "CoolGlow") {
    material.emissive.set("#203c5a");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.48);
  } else if (material.name === "Water") {
    material.roughness = Math.min(material.roughness, 0.18);
    material.metalness = Math.max(material.metalness, 0.4);
  } else if (material.name === "Vegetation" || material.name === "VegetationDark" || material.name === "Recycled") {
    material.roughness = Math.max(material.roughness, 0.75);
  } else if (material.name === "GreenGlow") {
    material.emissive.set("#173d25");
    material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.38);
  }

  material.envMapIntensity = quality === "high" ? 1.16 : 0.96;
  for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap, material.aoMap, material.emissiveMap]) {
    if (!texture) continue;
    texture.anisotropy = anisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }
  material.needsUpdate = true;
}

export function SceneAsset({ definition, sceneIndex, quality, onReady }: { definition: SceneDefinition; sceneIndex: number; quality: "high" | "medium"; onReady?: () => void }) {
  const root = useRef<THREE.Group>(null);
  const renderer = useThree((state) => state.gl);
  const smoothed = useRef(sceneWeight(sceneIndex, useExperienceStore.getState().progress));
  const assetUrl = sceneAssetForQuality(definition, quality);
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), quality === "high" ? 12 : 8);
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
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const clonedMaterials = sourceMaterials.map((source) => {
        let material = materialMap.get(source) as THREE.MeshStandardMaterial | undefined;
        if (!material) {
          material = source.clone() as THREE.MeshStandardMaterial;
          materialMap.set(source, material);
          if (material.isMeshStandardMaterial) {
            tuneMaterial(material, anisotropy, quality);
            const stableTransparent = material.transparent || material.name === "VisionGlass" || material.name === "Shadow";
            // During chapter blends solids temporarily use the transparent path.
            // Once a chapter is stable they return to the opaque pass for cleaner
            // MSAA silhouettes, deterministic depth ordering and fewer blend costs.
            material.transparent = true;
            // Stable chapters render with normal depth writes for crisp architectural
            // occlusion. During cross-fades we temporarily disable depth writing so
            // the incoming environment can blend without hard clipping. Glass and
            // authored contact-shadow decals never write depth.
            const stableDepthWrite = material.name !== "VisionGlass" && material.name !== "Shadow";
            material.depthWrite = stableDepthWrite;
            materialBindings.push({
              material,
              opacity: material.opacity,
              emissiveIntensity: material.emissiveIntensity,
              pulse: material.name === "ServerFace",
              stableDepthWrite,
              stableTransparent,
            });
          }
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? clonedMaterials : clonedMaterials[0];
      const names = clonedMaterials.map((material) => material.name);
      const translucentOnly = names.every((name) => name === "VisionGlass" || name === "Shadow" || name === "WarmGlow" || name === "CoolGlow");
      const mediumCaster = names.some((name) => ["Facade", "Graphite", "Steel", "Aluminum", "Roof", "Concrete", "White"].includes(name));
      mesh.castShadow = !translucentOnly && (quality === "high" || mediumCaster);
      mesh.receiveShadow = names.every((name) => name !== "VisionGlass" && name !== "Shadow");
    });

    return { instance: cloned, bindings: materialBindings };
  }, [anisotropy, gltf, quality]);

  useEffect(() => {
    if (instance) onReady?.();
  }, [instance, onReady]);

  useEffect(() => {
    return () => {
      // Geometry/textures remain owned by AssetManager. Only per-instance material
      // clones are disposed here, preventing scroll transitions from mutating or
      // freeing the shared GLB cache.
      for (const { material } of bindings) material.dispose();
    };
  }, [bindings]);

  useFrame((state, delta) => {
    if (!root.current) return;
    const weight = sceneWeight(sceneIndex, useExperienceStore.getState().progress);
    smoothed.current = THREE.MathUtils.damp(smoothed.current, weight, storyMotion.sceneBlendDamping, delta);
    const w = THREE.MathUtils.clamp(smoothed.current, 0, 1);
    root.current.visible = w > 0.012;

    const transform = modelTransform(definition, state.size.width);
    root.current.position.set(
      transform.position[0],
      transform.position[1] - (1 - w) * 0.42,
      transform.position[2],
    );
    root.current.rotation.set(
      transform.rotation[0],
      transform.rotation[1] + (1 - w) * 0.055,
      transform.rotation[2],
    );
    const scale = transform.scale * (0.968 + w * 0.032);
    root.current.scale.setScalar(scale);

    const fade = THREE.MathUtils.smoothstep(w, 0.04, 0.94);
    const pulse = 0.9 + Math.sin(state.clock.elapsedTime * 1.65) * 0.1;
    for (const binding of bindings) {
      const material = binding.material;
      material.opacity = binding.opacity * fade;
      const shouldWriteDepth = binding.stableDepthWrite && fade > 0.965;
      const shouldBeTransparent = binding.stableTransparent || fade < 0.995;
      if (material.depthWrite !== shouldWriteDepth || material.transparent !== shouldBeTransparent) {
        material.depthWrite = shouldWriteDepth;
        material.transparent = shouldBeTransparent;
        material.needsUpdate = true;
      }
      material.emissiveIntensity = binding.emissiveIntensity * (binding.pulse ? pulse : 1) * (0.45 + 0.55 * fade);
    }
  });

  return (
    <group ref={root}>
      {instance ? <primitive object={instance} /> : failed ? <AssetFailureMarker /> : null}
      {activeAssetSet === "r5" && definition.id === "generation" ? (
        <InstancedSolarField
          sceneIndex={sceneIndex}
          quality={quality}
          cols={quality === "high" ? 14 : 10}
          rows={quality === "high" ? 4 : 3}
          origin={[-0.9, 0.54, -4.75]}
          spacing={[1.55, 0.92]}
          panelScale={quality === "high" ? 0.52 : 0.48}
        />
      ) : null}
      {activeAssetSet === "r5" && definition.id === "hero" && quality === "high" ? (
        <InstancedSolarField
          sceneIndex={sceneIndex}
          quality={quality}
          cols={10}
          rows={2}
          origin={[-3.9, 0.53, 5.72]}
          spacing={[1.48, 0.88]}
          panelScale={0.46}
        />
      ) : null}
    </group>
  );
}
