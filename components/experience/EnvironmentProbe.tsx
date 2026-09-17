"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneDefinitions } from "@/experience/config/scenes";
import { useExperienceStore } from "@/lib/experienceStore";

/** Capture real HDR sky/softbox surfaces, not lights in an empty cubemap.
 * No downloads or per-frame probes; visible editorial backgrounds stay intact.
 */
export function EnvironmentProbe() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const targetsRef = useRef<THREE.WebGLRenderTarget[]>([]);
  const activeRef = useRef(-1);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const targets: THREE.WebGLRenderTarget[] = [];
    const previousEnvironment = scene.environment;
    try {
      for (const definition of sceneDefinitions) {
        const probe = new THREE.Scene();
        const geometry = new THREE.SphereGeometry(25, 24, 16);
        const sky = new THREE.ShaderMaterial({
          side: THREE.BackSide, depthWrite: false, toneMapped: false,
          uniforms: {
            uSun: { value: new THREE.Vector3(...definition.keyLight).normalize() },
            uSky: { value: new THREE.Color("#bacbdd").multiplyScalar(0.55) },
            uGround: { value: new THREE.Color("#77796c").multiplyScalar(0.35) },
            uWarm: { value: new THREE.Color("#fff0d6").multiplyScalar(3.2) },
          },
          vertexShader: `varying vec3 vDirection;
            void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `precision highp float;
            varying vec3 vDirection; uniform vec3 uSun,uSky,uGround,uWarm;
            void main(){vec3 d=normalize(vDirection);
              vec3 radiance=mix(uGround,uSky,smoothstep(-0.12,0.5,d.y));
              radiance+=vec3(0.08)*exp(-abs(d.y)*9.0);
              radiance+=uWarm*pow(max(dot(d,uSun),0.0),96.0);
              gl_FragColor=vec4(radiance,1.0);}`,
        });
        probe.add(new THREE.Mesh(geometry, sky));
        const panels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
        for (const [position, width, height, color, energy] of [
          [[-8, 6, 3], 5, 7, "#e0ecff", 1.8],
          [[5, 8, -6], 3, 8, "#fff2df", 2.6],
          [[2, 3, 10], 8, 3, "#f2f0e9", 0.7],
        ] as const) {
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(energy), toneMapped: false }));
          panel.position.set(position[0], position[1], position[2]);
          panel.lookAt(0, 0, 0);
          probe.add(panel);
          panels.push(panel);
        }
        try {
          targets.push(pmrem.fromScene(probe, 0.04, 0.1, 60));
        } finally {
          geometry.dispose(); sky.dispose();
          panels.forEach((panel) => { panel.geometry.dispose(); panel.material.dispose(); });
        }
      }
      targetsRef.current = targets;
      activeRef.current = -1;
    } catch (error) {
      targets.forEach((target) => target.dispose());
      targets.length = 0;
      targetsRef.current = [];
      console.warn("[R6.1.6] Environment capture unavailable", error);
    } finally {
      pmrem.dispose();
    }
    return () => {
      if (targets.some((target) => scene.environment === target.texture)) scene.environment = previousEnvironment;
      targets.forEach((target) => target.dispose());
      targetsRef.current = [];
    };
  }, [gl, scene]);

  useFrame(() => {
    const targets = targetsRef.current;
    if (!targets.length) return;
    const next = Math.max(0, Math.min(targets.length - 1, useExperienceStore.getState().activeChapter));
    if (activeRef.current !== next) {
      activeRef.current = next;
      scene.environment = targets[next].texture;
    }
  });
  return null;
}
