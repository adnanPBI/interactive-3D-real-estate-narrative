"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { storyMotion } from "@/experience/config/storyMotion";
import { finalizeRenderTelemetry, setSceneRenderTelemetry } from "@/experience/systems/renderTelemetry";
import { useExperienceStore } from "@/lib/experienceStore";

class SceneTelemetryPass extends RenderPass {
  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ) {
    renderer.info.reset();
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    setSceneRenderTelemetry(renderer.info.render.calls, renderer.info.render.triangles);
  }
}

/**
 * R6 output pipeline. Native canvas MSAA remains enabled, while SMAA stabilizes
 * the final industrial silhouette. Renderer-info auto reset is disabled so the
 * governor can distinguish scene work from post-processing work per frame.
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
    next.addPass(new SceneTelemetryPass(scene, camera));
    next.addPass(new SMAAPass());
    next.addPass(new OutputPass());
    return next;
  }, [camera, gl, quality, scene]);

  useEffect(() => {
    const previousAutoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = previousAutoReset;
      gl.info.reset();
    };
  }, [gl]);

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
      gl.info.reset();
      gl.render(scene, camera);
      setSceneRenderTelemetry(gl.info.render.calls, gl.info.render.triangles);
      finalizeRenderTelemetry(gl.info.render.calls, gl.info.render.triangles);
      return;
    }
    const dpr = gl.getPixelRatio();
    if (Math.abs(dpr - lastDpr.current) > 0.005) {
      composer.setPixelRatio(dpr);
      composer.setSize(size.width, size.height);
      lastDpr.current = dpr;
    }
    composer.render();
    finalizeRenderTelemetry(gl.info.render.calls, gl.info.render.triangles);
  }, 1);

  return null;
}
