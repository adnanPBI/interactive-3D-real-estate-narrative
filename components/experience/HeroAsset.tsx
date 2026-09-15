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

function isGlowMaterial(name: string) {
  return name === "WarmGlow" || name === "CoolGlow" || name === "ServerFace";
}

function applyCinematicPbrTuning(material: THREE.MeshStandardMaterial, glass: boolean) {
  const name = material.name;
  if (glass) {
    // R6.1.5: real architectural glazing. Keep the pane behind the metal frame,
    // do not write depth, and use restrained reflectivity so interior detail is
    // visible without transparent-sort shimmer.
    material.color.set(name === "Glass_Tinted" ? "#6f8b91" : "#a8c0c2");
    material.roughness = name === "Glass_Tinted" ? 0.15 : 0.10;
    material.metalness = 0.08;
    material.envMapIntensity = 1.18;
    material.transparent = true;
    material.opacity = name === "Glass_Tinted" ? 0.46 : 0.34;
    material.depthWrite = false;
    material.depthTest = true;
    material.side = THREE.DoubleSide;
    material.alphaHash = false;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
    return;
  }

  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.depthTest = true;
  material.side = THREE.FrontSide;
  material.alphaHash = false;

  // Previous production multiplied most colors down into the 0.58-0.84 range,
  // which crushed the annotated assets into near-black silhouettes. Preserve
  // material contrast while allowing the authored palette and PBR textures to
  // remain readable against the warm editorial background.
  if (name.includes("Concrete")) {
    material.color.multiplyScalar(0.96);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.64, 0.86);
    material.metalness = Math.min(material.metalness, 0.04);
    material.envMapIntensity = 0.72;
  } else if (name.startsWith("Metal_") || name === "Steel" || name === "Aluminum") {
    material.color.multiplyScalar(0.98);
    material.metalness = Math.max(material.metalness, 0.66);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.22, 0.43);
    material.envMapIntensity = 1.16;
  } else if (name === "Graphite" || name === "Roof" || name === "Metal_Painted_Charcoal") {
    material.color.multiplyScalar(0.84);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.36, 0.62);
    material.metalness = Math.max(material.metalness, 0.16);
    material.envMapIntensity = 0.96;
  } else if (name === "Facade" || name === "Panel_White" || name === "White") {
    material.color.multiplyScalar(0.98);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.34, 0.60);
    material.metalness = Math.max(material.metalness, 0.06);
    material.envMapIntensity = 0.98;
  } else if (name === "Recycled") {
    material.color.multiplyScalar(0.90);
    material.roughness = Math.max(material.roughness, 0.70);
    material.envMapIntensity = 0.76;
  } else if (name.includes("Copper") || name.includes("Bronze") || name.includes("Accent")) {
    material.color.offsetHSL(0, 0.045, 0.035);
    material.metalness = Math.max(material.metalness, 0.54);
    material.roughness = THREE.MathUtils.clamp(material.roughness, 0.24, 0.46);
    material.envMapIntensity = 1.12;
  } else {
    material.color.multiplyScalar(0.96);
    material.envMapIntensity = 0.90;
  }

  if (isGlowMaterial(name)) {
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    material.emissiveIntensity = Math.min(material.emissiveIntensity || 1, 0.72);
  }
}

function configureMaterial(
  material: THREE.MeshStandardMaterial,
  legacyTextures: LegacyTextures,
  premiumTextures: R61MaterialTextures | null,
  anisotropy: number,
) {
  const glass = r61GlassMaterials.has(material.name);

  const premium = isPremiumMaterial(material.name) ? premiumTextures?.[material.name] : undefined;
  if (premium) {
    if (!material.map) material.map = premium.basecolor;
    if (!material.normalMap) {
      material.normalMap = premium.normal;
      const normalScale = r61MaterialNormalScale[material.name] ?? 0.12;
      material.normalScale.set(normalScale, normalScale);
    }
    if (!material.roughnessMap) material.roughnessMap = premium.orm;
    if (!material.metalnessMap) material.metalnessMap = premium.orm;
    if (!material.aoMap) material.aoMap = premium.orm;
    material.aoMapIntensity = 1.04;
  } else if (legacyTextures && shouldUseLegacyTexture(material.name)) {
    if (!material.map) material.map = legacyTextures.basecolor;
    if (!material.normalMap) {
      material.normalMap = legacyTextures.normal;
      material.normalScale.set(0.15, 0.15);
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
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.renderOrder = meshMaterials.some((material) => r61GlassMaterials.has(material.name))
        ? 3
        : meshMaterials.some((material) => isGlowMaterial(material.name)) ? 2 : 0;
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
    let raf1 = 0;
    let raf2 = 0;
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
