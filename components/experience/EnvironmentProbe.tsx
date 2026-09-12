"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneDefinitions } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * Authored per-chapter environment probes. We derive compact PMREM targets from
 * each chapter's approved background/accent palette rather than injecting a
 * generic studio-room environment that can flatten scene-specific materials.
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
      probeScene.background = new THREE.Color(definition.background);
      const hemi = new THREE.HemisphereLight("#fffaf1", definition.background, 2.2);
      const key = new THREE.DirectionalLight(definition.accent, 3.4);
      key.position.fromArray(definition.keyLight);
      probeScene.add(hemi, key);
      return pmrem.fromScene(probeScene, 0.05);
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
