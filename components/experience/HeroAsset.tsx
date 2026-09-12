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
import { R6InstancedSolarField, R6InstancedTurbines, R6InstancedVegetation } from "./InstancedInfrastructure";

type Binding = { material: THREE.MeshStandardMaterial; glass: boolean };

type LegacyTextures = ReturnType<typeof useR6HeroTextures>;

function shouldUseLegacyTexture(name: string) {
  return ["Facade", "Concrete", "White", "Graphite", "Steel", "Aluminum", "Roof", "Recycled"].includes(name);
}

function isPremiumMaterial(name: string): name is R61ManufacturingMaterialName {
  return Object.prototype.hasOwnProperty.call(r61MaterialNormalScale, name);
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
    material.opacity = Math.min(material.opacity, 0.52);
    material.depthWrite = false;
    material.roughness = Math.min(material.roughness, 0.11);
    material.metalness = Math.max(material.metalness, 0.16);
  } else {
    // Critical R6 rule: solid architecture stays in the opaque depth pass.
    material.transparent = false;
    material.opacity = 1;
    material.depthWrite = true;
    material.alphaHash = false;
  }

  // R6.1 rule: authored GLB textures always win. External material-specific maps
  // fill only empty slots; the older hero-wide maps are a final legacy fallback.
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
    if (!material.aoMap) {
      material.aoMap = premium.orm;
      material.aoMapIntensity = 0.88;
    }
  } else if (legacyTextures && shouldUseLegacyTexture(material.name)) {
    if (!material.map) material.map = legacyTextures.basecolor;
    if (!material.normalMap) {
      material.normalMap = legacyTextures.normal;
      material.normalScale.set(0.16, 0.16);
    }
    if (!material.roughnessMap) material.roughnessMap = legacyTextures.orm;
    if (!material.metalnessMap) material.metalnessMap = legacyTextures.orm;
  }

  material.envMapIntensity = glass ? 1.20 : material.name.startsWith("Metal_") ? 1.08 : 0.96;
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
    // KTX2 mips are authored/encoded offline; do not overwrite them at runtime.
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
  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), quality === "high" ? 8 : 4);
  const authored = modelTransform(definition, width);

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
    // Invalidate immediately when the caster identity or authored responsive
    // transform changes, so removed/moved geometry cannot leave a stale shadow
    // while the next GLB is resolving or the viewport crosses a breakpoint.
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

  return <group ref={root} position={authored.position as [number, number, number]} rotation={authored.rotation as [number, number, number]} scale={authored.scale}>
    {instance ? <primitive object={instance} /> : failed ? <mesh position={[0, 1, 0]}><boxGeometry args={[2.4, 1.4, 1.8]} /><meshStandardMaterial color="#4a4f4c" wireframe /></mesh> : null}
    {hero === "integrated-campus" && <><R6InstancedSolarField compact /><R6InstancedTurbines count={2} quality={quality} /><R6InstancedVegetation count={14} /></>}
    {hero === "substation-bess" && <><R6InstancedSolarField /><R6InstancedTurbines count={2} quality={quality} /></>}
    {hero === "data-center-cooling" && <R6InstancedVegetation count={12} />}
    {hero === "recycling-intake" && <R6InstancedVegetation count={12} />}
    {hero === "connected-campus" && <><R6InstancedSolarField compact /><R6InstancedTurbines count={1} quality={quality} /><R6InstancedVegetation count={12} /></>}
  </group>;
}
