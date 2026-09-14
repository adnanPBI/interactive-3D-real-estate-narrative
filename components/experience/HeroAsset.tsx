"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { modelTransform, type SceneDefinition } from "@/experience/config/scenes";
import { r6HeroUrl, type R6HeroId } from "@/experience/config/r6Assets";
import {
  r61GlassMaterials,
  r61MaterialNormalScale,
  type R61ManufacturingMaterialName,
} from "@/experience/config/r61Materials";
import type { R6Lod } from "@/experience/systems/HeroActivation";
import { useSceneAsset } from "./useSceneAsset";
import { useR6HeroTextures } from "./useR6HeroTextures";
import { useR61MaterialTextures, type R61MaterialTextures } from "./useR61MaterialTextures";
import { R6HeroAmbientMotion, type HeroLocalBounds } from "./R6AmbientMotion";

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
    // Stable architectural glazing: tinted/reflective rather than transparent.
    // This removes camera-dependent transparent sorting shimmer/blinking.
    material.color.set("#33474f");
    material.roughness = 0.18;
    material.metalness = 0.34;
    material.envMapIntensity = 1.18;
    return;
  }

  if (name.includes("Concrete")) {
    material.color.multiplyScalar(0.72);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.70, 0.91);
    material.metalness = Math.min(material.metalness, 0.04);
    material.envMapIntensity = 0.50;
  } else if (name.startsWith("Metal_") || name === "Steel" || name === "Aluminum") {
    material.color.multiplyScalar(0.76);
    material.metalness = Math.max(material.metalness, 0.68);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.24, 0.46);
    material.envMapIntensity = 1.08;
  } else if (name === "Graphite" || name === "Roof" || name === "Metal_Painted_Charcoal") {
    material.color.multiplyScalar(0.58);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.40, 0.68);
    material.metalness = Math.max(material.metalness, 0.20);
    material.envMapIntensity = 0.82;
  } else if (name === "Facade" || name === "Panel_White" || name === "White") {
    material.color.multiplyScalar(0.79);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.40, 0.66);
    material.metalness = Math.max(material.metalness, 0.08);
    material.envMapIntensity = 0.84;
  } else if (name === "Recycled") {
    material.color.multiplyScalar(0.69);
    material.roughness = Math.max(material.roughness, 0.78);
    material.envMapIntensity = 0.60;
  } else if (name.includes("Copper") || name.includes("Bronze") || name.includes("Accent")) {
    material.color.offsetHSL(0, 0.06, -0.04);
    material.metalness = Math.max(material.metalness, 0.58);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.26, 0.50);
    material.envMapIntensity = 1.04;
  } else {
    material.color.multiplyScalar(0.84);
    material.envMapIntensity = 0.78;
  }
}

function configureMaterial(
  material: THREE.MeshStandardMaterial,
  legacyTextures: LegacyTextures,
  premiumTextures: R61MaterialTextures | null,
  anisotropy: number,
) {
  const glass = r61GlassMaterials.has(material.name);

  // All structural materials, including glazing, stay in the stable opaque depth
  // pass. The R6 assets contain layered façade strips where transparent sorting
  // caused repeated component shimmer during slow camera movement.
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.depthTest = true;
  material.alphaHash = false;

  const premium = isPremiumMaterial(material.name) ? premiumTextures?.[material.name] : undefined;
  if (premium) {
    if (!material.map) material.map = premium.basecolor;
    if (!material.normalMap) {
      material.normalMap = premium.normal;
      const normalScale = r61MaterialNormalScale[material.name] ?? 0.12;
      material.normalScale.set(normalScale * 1.12, normalScale * 1.12);
    }
    if (!material.roughnessMap) material.roughnessMap = premium.orm;
    if (!material.metalnessMap) material.metalnessMap = premium.orm;
    if (!material.aoMap) material.aoMap = premium.orm;
    material.aoMapIntensity = 1.28;
  } else if (legacyTextures && shouldUseLegacyTexture(material.name)) {
    if (!material.map) material.map = legacyTextures.basecolor;
    if (!material.normalMap) {
      material.normalMap = legacyTextures.normal;
      material.normalScale.set(0.18, 0.18);
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

function localBounds(object: THREE.Object3D | null): HeroLocalBounds | null {
  if (!object) return null;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
  };
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
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), quality === "high" ? 16 : 8);
  const authored = modelTransform(definition, width);

  const { instance, bindings, bounds } = useMemo(() => {
    if (!gltf) return { instance: null, bindings: [] as Binding[], bounds: null as HeroLocalBounds | null };
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
      mesh.castShadow = quality === "high";
      mesh.receiveShadow = true;
      mesh.renderOrder = 0;
    });
    return { instance: clone, bindings: nextBindings, bounds: localBounds(clone) };
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
      <R6HeroAmbientMotion hero={hero} accent={definition.accent} quality={quality} bounds={bounds} />
    </group>
  );
}
