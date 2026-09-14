"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneDefinitions } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * Per-chapter environment probes tuned to preserve PBR separation.  The prior
 * probe was bright enough to lift white/grey industrial materials into the
 * editorial background; this lower-energy probe keeps reflections without
 * flattening the architecture.
 */
export function EnvironmentProbe() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const targetsRef = useRef<THREE.WebGLRenderTarget[]>([]);
  const activeRef = useRef(-1);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileCubemapShader();
    const targets = sceneDefinitions.map((definition) => {
      const probeScene = new THREE.Scene();
      const backdrop = new THREE.Color(definition.background).multiplyScalar(0.82);
      probeScene.background = backdrop;
      const hemi = new THREE.HemisphereLight("#e7e2d8", backdrop, 1.10);
      const key = new THREE.DirectionalLight(definition.accent, 1.65);
      key.position.fromArray(definition.keyLight);
      probeScene.add(hemi, key);
      return pmrem.fromScene(probeScene, 0.08);
    });
    targetsRef.current = targets;
    activeRef.current = -1;

    return () => {
      if (targets.some((target) => scene.environment === target.texture)) scene.environment = null;
      targets.forEach((target) => target.dispose());
      targetsRef.current = [];
      pmrem.dispose();
    };
  }, [gl, scene]);

  useFrame(() => {
    const targets = targetsRef.current;
    if (!targets.length) return;
    const activeChapter = useExperienceStore.getState().activeChapter;
    const next = Math.max(0, Math.min(targets.length - 1, activeChapter));
    if (activeRef.current === next) return;
    activeRef.current = next;
    scene.environment = targets[next].texture;
  });

  return null;
}
