"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Shared low-cost environment probe; generated once per renderer and disposed cleanly. */
export function EnvironmentProbe() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.03).texture;
    scene.environment = env;
    return () => {
      if (scene.environment === env) scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        materials.forEach((material) => material.dispose());
      });
    };
  }, [gl, scene]);

  return null;
}
