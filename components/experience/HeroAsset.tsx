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
import { tuneCinematicMaterial } from "@/experience/config/r616Materials";
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
    material.userData.r616AbsolutePbr = true;
    material.aoMapIntensity = 0.70;
  } else if (legacyTextures && shouldUseLegacyTexture(material.name)) {
    if (!material.map) material.map = legacyTextures.basecolor;
    if (!material.normalMap) {
      material.normalMap = legacyTextures.normal;
      material.normalScale.set(0.15, 0.15);
    }
    // A hero-wide ORM cannot represent concrete and bare metal simultaneously.
    // Keep authored material factors instead of making every surface alike.
  }

  tuneCinematicMaterial(material, glass);
  const slots: Array<[THREE.Texture | null, "color" | "data"]> = [
    [material.map, "color"],
    [material.emissiveMap, "color"],
    [material.normalMap, "data"],
    [material.roughnessMap, "data"],
    [material.metalnessMap, "data"],
    [material.aoMap, "data"],
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

export function HeroAsset({ hero, lod, definition, quality, onReady }: {
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

  // Geometry readiness is the release gate for showing the scene. Optional KTX2
  // detail may arrive a little later and must never leave a valid GLB hidden behind
  // an endless loading state.
  useEffect(() => {
    if (!instance) return;
    renderer.shadowMap.needsUpdate = true;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => onReady?.()); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [instance, onReady, renderer]);

  // A failed or stalled hero should never produce the blank sky/ground state seen
  // in production. Escalate to the authored static scene instead.
  useEffect(() => {
    if (!failed || typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("convalt:webgl-fatal", {
      detail: { reason: `hero-load-failed:${hero}:${lod}` },
    }));
  }, [failed, hero, lod]);

  useEffect(() => {
    if (typeof window === "undefined" || !instance) return;
    window.__CONVALT_ACTIVE_HERO__ = { hero, lod, url: assetUrl, ready: true };
    return () => {
      if (window.__CONVALT_ACTIVE_HERO__?.url === assetUrl) window.__CONVALT_ACTIVE_HERO__ = undefined;
    };
  }, [assetUrl, hero, instance, lod]);

  useEffect(() => () => { for (const { material } of bindings) material.dispose(); }, [bindings]);

  return (
    <group ref={root} position={authored.position as [number, number, number]}
      rotation={authored.rotation as [number, number, number]} scale={authored.scale}>
      {instance ? <primitive object={instance} /> : failed ? <mesh position={[0, 1, 0]}><boxGeometry args={[2.4, 1.4, 1.8]} /><meshStandardMaterial color="#4a4f4c" wireframe /></mesh> : null}
      <R6HeroAmbientMotion hero={hero} accent={definition.accent} quality={quality} bounds={bounds} />
    </group>
  );
}
