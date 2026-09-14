"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
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

const cinematicGrade = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 0.12 },
    saturation: { value: 1.08 },
    vignette: { value: 0.17 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float contrast;
    uniform float saturation;
    uniform float vignette;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;
      color = (color - 0.5) * (1.0 + contrast) + 0.5;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, saturation);
      vec2 p = vUv - 0.5;
      float edge = smoothstep(0.22, 0.72, dot(p, p) * 1.65);
      color *= 1.0 - edge * vignette;
      gl_FragColor = vec4(max(color, 0.0), texel.a);
    }
  `,
};

/**
 * R6.1.2 cinematic output pipeline. Native MSAA + SMAA remain the anti-aliasing
 * foundation. A deliberately restrained bloom pass lets practical/emissive
 * motion read, while the grade restores depth that was previously washed out by
 * the pale editorial background and fog.
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

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      quality === "high" ? 0.24 : 0.14,
      quality === "high" ? 0.42 : 0.34,
      0.84,
    );
    next.addPass(bloom);

    const grade = new ShaderPass(cinematicGrade);
    grade.uniforms.contrast.value = quality === "high" ? 0.14 : 0.10;
    grade.uniforms.saturation.value = quality === "high" ? 1.10 : 1.06;
    grade.uniforms.vignette.value = quality === "high" ? 0.18 : 0.12;
    next.addPass(grade);

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
