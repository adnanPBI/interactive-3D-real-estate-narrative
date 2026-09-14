"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelTransform, type SceneDefinition } from "@/experience/config/scenes";
import { r6HeroUrl, type R6HeroId } from "@/experience/config/r6Assets";
import { r612HeroMotion } from "@/experience/config/r612Motion";
import {
  r61GlassMaterials,
  r61MaterialNormalScale,
  type R61ManufacturingMaterialName,
} from "@/experience/config/r61Materials";
import type { R6Lod } from "@/experience/systems/HeroActivation";
import { useSceneAsset } from "./useSceneAsset";
import { useR6HeroTextures } from "./useR6HeroTextures";
import { useR61MaterialTextures, type R61MaterialTextures } from "./useR61MaterialTextures";
import { R6InstancedSolarField, R6InstancedTurbines, R6InstancedVegetation } from "./InstancedInfrastructure";
import { R6HeroAmbientMotion } from "./R6AmbientMotion";

type Binding = { material: THREE.MeshStandardMaterial; glass: boolean };

type LegacyTextures = ReturnType<typeof useR6HeroTextures>;

function shouldUseLegacyTexture(name: string) {
  return ["Facade", "Concrete", "White", "Graphite", "Steel", "Aluminum", "Roof", "Recycled"].includes(name);
}

function isPremiumMaterial(name: string): name is R61ManufacturingMaterialName {
  return Object.prototype.hasOwnProperty.call(r61MaterialNormalScale, name);
}

function applyCinematicPbrTuning(material: THREE.MeshStandardMaterial, glass: boolean) {
  const name = material.name;
  if (glass) {
    material.color.offsetHSL(0, 0.01, -0.045);
    material.roughness = Math.min(material.roughness, 0.09);
    material.metalness = Math.max(material.metalness, 0.20);
    material.envMapIntensity = 1.45;
    return;
  }

  if (name.includes("Concrete")) {
    material.color.multiplyScalar(0.88);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.62, 0.88);
    material.metalness = Math.min(material.metalness, 0.08);
    material.envMapIntensity = 0.72;
  } else if (name.startsWith("Metal_") || name === "Steel" || name === "Aluminum") {
    material.color.multiplyScalar(0.90);
    material.metalness = Math.max(material.metalness, 0.68);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.22, 0.46);
    material.envMapIntensity = 1.38;
  } else if (name === "Graphite" || name === "Roof" || name === "Metal_Painted_Charcoal") {
    material.color.multiplyScalar(0.76);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.36, 0.68);
    material.metalness = Math.max(material.metalness, 0.22);
    material.envMapIntensity = 1.02;
  } else if (name === "Facade" || name === "Panel_White" || name === "White") {
    material.color.multiplyScalar(0.94);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.38, 0.66);
    material.metalness = Math.max(material.metalness, 0.10);
    material.envMapIntensity = 1.12;
  } else if (name === "Recycled") {
    material.color.multiplyScalar(0.84);
    material.roughness = Math.max(material.roughness, 0.72);
    material.envMapIntensity = 0.78;
  } else {
    material.envMapIntensity = 1.04;
  }
}

function configureMaterial(
  material: THREE.MeshStandardMaterial,
  legacyTextures: LegacyTextures,
  premiumTextures: R61MaterialTextures | null,
  anisotropy: number,
) {
  const glass = r61GlassMaterials.has(material.name);
  if (glass) {
    material.transparent = true;
    material.opacity = Math.min(material.opacity, 0.48);
    material.depthWrite = false;
  } else {
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
    material.alphaHash = false;
  }

  const premium = isPremiumMaterial(material.name) ? premiumTextures?.[material.name] : undefined;
  if (premium) {
    if (!material.map) material.map = premium.basecolor;
    if (!material.normalMap) {
      material.normalMap = premium.normal;
      const normalScale = r61MaterialNormalScale[material.name] ?? 0.12;
      material.normalScale.set(normalScale * 1.15, normalScale * 1.15);
    }
    if (!material.roughnessMap) material.roughnessMap = premium.orm;
    if (!material.metalnessMap) material.metalnessMap = premium.orm;
    if (!material.aoMap) material.aoMap = premium.orm;
    material.aoMapIntensity = 1.12;
  } else if (legacyTextures && shouldUseLegacyTexture(material.name)) {
    if (!material.map) material.map = legacyTextures.basecolor;
    if (!material.normalMap) {
      material.normalMap = legacyTextures.normal;
      material.normalScale.set(0.19, 0.19);
    }
    if (!material.roughnessMap) material.roughnessMap = legacyTextures.orm;
    if (!material.metalnessMap) material.metalnessMap = legacyTextures.orm;
  }

  applyCinematicPbrTuning(material, glass);

  const slots: Array<[THREE.Texture | null, "color" | "data"]> = [
    [material.map, "color"],
    [material.emissiveMap, "color"],
    [material.normalMap, "data"],
    [material.roughnessMap, "data"],
    [material.metalnessMap, "data"],
  ];
  for (const [texture, role] of slots) {
    if (!texture) continue;
    texture.colorSpace = role === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = anisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }
  material.needsUpdate = true;
  return glass;
}

export function HeroAsset({
  hero,
  lod,
  definition,
  quality,
  onReady,
}: {
  hero: R6HeroId;
  lod: R6Lod;
  definition: SceneDefinition;
  quality: "high" | "medium";
  onReady?: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const renderer = useThree((state) => state.gl);
  const width = useThree((state) => state.size.width);
  const assetUrl = r6HeroUrl(hero, lod);
  const { gltf, failed } = useSceneAsset(assetUrl);
  const legacyTextures = useR6HeroTextures(hero, hero !== "manufacturing-line");
  const premiumTextures = useR61MaterialTextures(hero, quality);
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), quality === "high" ? 12 : 6);
  const authored = modelTransform(definition, width);
  const motion = r612HeroMotion[hero];

  const { instance, bindings } = useMemo(() => {
    if (!gltf) return { instance: null, bindings: [] as Binding[] };
    const clone = skeletonClone(gltf.scene);
    const materialMap = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    const nextBindings: Binding[] = [];
    clone.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = source.map((original) => {
        let material = materialMap.get(original);
        if (!material) {
          material = original.clone() as THREE.MeshStandardMaterial;
          materialMap.set(original, material);
          if (material.isMeshStandardMaterial) {
            const glass = configureMaterial(material, legacyTextures, premiumTextures, anisotropy);
            nextBindings.push({ material, glass });
          }
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
      const names = materials.map((material) => material.name);
      const transparentOnly = names.every((name) => r61GlassMaterials.has(name));
      const structural = names.some((name) => [
        "Facade", "Concrete", "Steel", "Graphite", "Aluminum",
        "Concrete_Floor", "Concrete_Wall", "Metal_Painted_Charcoal", "Metal_Steel", "Metal_Aluminum", "Panel_White",
      ].includes(name));
      mesh.castShadow = !transparentOnly && (quality === "high" || structural);
      mesh.receiveShadow = !transparentOnly;
    });
    return { instance: clone, bindings: nextBindings };
  }, [anisotropy, gltf, legacyTextures, premiumTextures, quality]);

  useEffect(() => {
    renderer.shadowMap.needsUpdate = true;
  }, [assetUrl, authored, renderer]);

  useEffect(() => {
    if (!instance) return;
    const texturesReady = hero === "manufacturing-line" ? Boolean(premiumTextures) : Boolean(legacyTextures);
    if (!texturesReady) return;
    renderer.shadowMap.needsUpdate = true;
    let raf1 = 0; let raf2 = 0;
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => onReady?.()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [hero, instance, legacyTextures, onReady, premiumTextures, renderer]);

  useEffect(() => {
    if (typeof window === "undefined" || !instance) return;
    window.__CONVALT_ACTIVE_HERO__ = { hero, lod, url: assetUrl, ready: true };
    return () => {
      if (window.__CONVALT_ACTIVE_HERO__?.url === assetUrl) window.__CONVALT_ACTIVE_HERO__ = undefined;
    };
  }, [assetUrl, hero, instance, lod]);
  useEffect(() => () => { for (const { material } of bindings) material.dispose(); }, [bindings]);

  return (
    <group
      ref={root}
      position={authored.position as [number, number, number]}
      rotation={authored.rotation as [number, number, number]}
      scale={authored.scale}
    >
      {instance ? <primitive object={instance} /> : failed ? <mesh position={[0, 1, 0]}><boxGeometry args={[2.4, 1.4, 1.8]} /><meshStandardMaterial color="#4a4f4c" wireframe /></mesh> : null}
      <R6HeroAmbientMotion hero={hero} accent={definition.accent} quality={quality} />
      {hero === "integrated-campus" && <><R6InstancedSolarField compact /><R6InstancedTurbines count={2} quality={quality} wind={motion.wind} /><R6InstancedVegetation count={14} wind={motion.wind} /></>}
      {hero === "substation-bess" && <><R6InstancedSolarField /><R6InstancedTurbines count={2} quality={quality} wind={motion.wind} /></>}
      {hero === "data-center-cooling" && <R6InstancedVegetation count={12} wind={motion.wind} />}
      {hero === "recycling-intake" && <R6InstancedVegetation count={12} wind={motion.wind} />}
      {hero === "connected-campus" && <><R6InstancedSolarField compact /><R6InstancedTurbines count={1} quality={quality} wind={motion.wind} /><R6InstancedVegetation count={12} wind={motion.wind} /></>}
    </group>
  );
}
