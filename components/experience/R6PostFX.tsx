"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { storyMotion } from "@/experience/config/storyMotion";
import { useExperienceStore } from "@/lib/experienceStore";

/**
 * R6 output pipeline.
 *
 * Native canvas MSAA remains enabled, but the final image also passes through
 * SMAA. This is intentionally a small post stack: the project values stable
 * industrial edges and predictable laptop performance over expensive cinematic
 * effects such as SSR, DOF or motion blur.
 */
export function R6PostFX({ quality }: { quality: "high" | "medium" }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const postFx = useExperienceStore((state) => state.postFx);
  const lastDpr = useRef(-1);

  const composer = useMemo(() => {
    const limits = storyMotion.quality[quality];
    const target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
      type: quality === "high" ? THREE.HalfFloatType : THREE.UnsignedByteType,
    });
    target.samples = limits.composerSamples;
    target.texture.colorSpace = THREE.SRGBColorSpace;

    const next = new EffectComposer(gl, target);
    next.addPass(new RenderPass(scene, camera));
    next.addPass(new SMAAPass(1, 1));
    next.addPass(new OutputPass());
    return next;
  }, [camera, gl, quality, scene]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    lastDpr.current = dpr;
  }, [composer, gl, size.height, size.width]);

  useEffect(() => () => {
    for (const pass of composer.passes) pass.dispose?.();
    composer.dispose();
  }, [composer]);

  // Priority 1 takes ownership of rendering from R3F's default renderer.
  useFrame(() => {
    if (postFx === "off") {
      gl.render(scene, camera);
      return;
    }
    const dpr = gl.getPixelRatio();
    if (Math.abs(dpr - lastDpr.current) > 0.005) {
      composer.setPixelRatio(dpr);
      composer.setSize(size.width, size.height);
      lastDpr.current = dpr;
    }
    composer.render();
  }, 1);

  return null;
}
