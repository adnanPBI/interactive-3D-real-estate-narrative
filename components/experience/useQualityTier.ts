"use client";

import { useEffect, useState } from "react";

export type Quality = "high" | "medium" | "fallback";
type NavigatorWithMemory = Navigator & { deviceMemory?: number };

function detectRenderer() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!gl) return { webgl: false, renderer: "" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL: number } | null;
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "") : "";
    return { webgl: true, renderer };
  } catch {
    return { webgl: false, renderer: "" };
  }
}

function chooseQuality(): Quality {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("quality");
  if (forced === "high" || forced === "medium" || forced === "fallback") return forced;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || document.documentElement.dataset.motion === "reduced";
  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const { webgl, renderer } = detectRenderer();
  const integratedIntel = /Intel.*(?:UHD|Iris)|(?:UHD|Iris).*Intel/i.test(renderer);
  const weakRenderer = /SwiftShader|llvmpipe|Software/i.test(renderer);

  // Reduced-motion means no cinematic camera motion at all: use the premium
  // static six-frame DOM/fallback presentation instead of merely slowing WebGL.
  if (reduced || !webgl || weakRenderer || cores <= 2 || memory <= 2) return "fallback";
  if (integratedIntel || cores <= 6 || memory <= 4 || window.innerWidth < 820) return "medium";
  return "high";
}

export function useQualityTier() {
  const [quality, setQuality] = useState<Quality>("medium");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () => setQuality(chooseQuality());
    evaluate();
    media.addEventListener?.("change", evaluate);
    window.addEventListener("convalt:preferences", evaluate);
    window.addEventListener("resize", evaluate);
    return () => {
      media.removeEventListener?.("change", evaluate);
      window.removeEventListener("convalt:preferences", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  return quality;
}
