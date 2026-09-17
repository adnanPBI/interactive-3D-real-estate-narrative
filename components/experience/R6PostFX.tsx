"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { storyMotion } from "@/experience/config/storyMotion";
import { finalizeRenderTelemetry, setSceneRenderTelemetry } from "@/experience/systems/renderTelemetry";
import { useExperienceStore } from "@/lib/experienceStore";

class SceneTelemetryPass extends RenderPass {
  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean) {
    renderer.info.reset();
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    setSceneRenderTelemetry(renderer.info.render.calls, renderer.info.render.triangles);
  }
}

const architecturalGrade = {
  uniforms: {
    tDiffuse: { value: null }, contrast: { value: 0.035 },
    saturation: { value: 1.01 }, gamma: { value: 1.0 }, vignette: { value: 0.03 },
  },
  vertexShader: `varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float contrast,saturation,gamma,vignette;
    void main(){
      vec4 texel=texture2D(tDiffuse,vUv);
      vec3 color=pow(max(texel.rgb,vec3(0.0)),vec3(gamma));
      color=(color-0.5)*(1.0+contrast)+0.5;
      float luma=dot(color,vec3(0.2126,0.7152,0.0722));
      color=mix(vec3(luma),color,saturation);
      vec2 p=vUv-0.5;
      float edge=smoothstep(0.24,0.74,dot(p,p)*1.42);
      color*=1.0-edge*vignette;
      gl_FragColor=vec4(clamp(color,0.0,1.0),texel.a);
    }`,
};

/** Preserve HDR highlights through tone mapping, then grade display-referred
 * output and resolve edges with SMAA. SSAO remains restrained; no bloom wash.
 */
export function R6PostFX({ quality }: { quality: "high" | "medium" }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const postFx = useExperienceStore((state) => state.postFx);
  const lastDpr = useRef(-1);

  const composer = useMemo(() => {
    if (postFx === "off") return null;
    const limits = storyMotion.quality[quality];
    const hdr = gl.extensions.has("EXT_color_buffer_float");
    const target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true, stencilBuffer: false,
      type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
    });
    target.samples = limits.composerSamples;
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    const next = new EffectComposer(gl, target);
    next.addPass(new SceneTelemetryPass(scene, camera));
    if (quality === "high" && hdr) {
      const ssao = new SSAOPass(scene, camera, 1, 1);
      ssao.kernelRadius = 4;
      ssao.minDistance = 0.0012;
      ssao.maxDistance = 0.055;
      next.addPass(ssao);
    }
    // Never clamp HDR radiance before tone mapping.
    next.addPass(new OutputPass());
    const grade = new ShaderPass(architecturalGrade);
    grade.uniforms.contrast.value = quality === "high" ? 0.035 : 0.025;
    grade.uniforms.saturation.value = 1.01;
    grade.uniforms.gamma.value = 1.0;
    grade.uniforms.vignette.value = quality === "high" ? 0.032 : 0.018;
    next.addPass(grade);
    next.addPass(new SMAAPass());
    return next;
  }, [camera, gl, postFx, quality, scene]);

  useEffect(() => {
    const previousAutoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = previousAutoReset; gl.info.reset(); };
  }, [gl]);
  useEffect(() => {
    if (!composer) return;
    const dpr = gl.getPixelRatio();
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    lastDpr.current = dpr;
  }, [composer, gl, size.height, size.width]);
  useEffect(() => () => {
    if (!composer) return;
    for (const pass of composer.passes) pass.dispose?.();
    composer.dispose();
  }, [composer]);

  useFrame(() => {
    if (!composer) {
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
