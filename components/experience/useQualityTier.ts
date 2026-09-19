"use client";

import { useEffect, useState } from "react";

export type Quality = "high" | "medium" | "fallback";
type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function detectRenderer() {
  try {
    window.__R6_WEBGL_PROBE_ATTEMPTS__ = (window.__R6_WEBGL_PROBE_ATTEMPTS__ ?? 0) + 1;
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!gl) return { webgl: false, renderer: "" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL: number } | null;
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "") : "";
    // Release the probe context immediately; the real R3F canvas gets its own context.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { webgl: true, renderer };
  } catch {
    return { webgl: false, renderer: "" };
  }
}

function chooseQuality(): Quality {
  const { webgl, renderer } = detectRenderer();
  if (!webgl) return "fallback";

  const params = new URLSearchParams(window.location.search);
  const forced = params.get("quality");
  if (forced === "fallback") return "fallback";
  if (forced === "high" || forced === "medium") return forced;

  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = Boolean(nav.connection?.saveData);
  const slowConnection = /(^|-)2g$/.test(nav.connection?.effectiveType ?? "");
  const integratedIntel = /Intel.*(?:UHD|Iris)|(?:UHD|Iris).*Intel/i.test(renderer);
  const weakRenderer = /SwiftShader|llvmpipe|Software/i.test(renderer);

  // Reduced motion is an animation preference, not a request to remove the 3D
  // hero. Camera/ambient motion already reads documentElement.dataset.motion and
  // becomes stationary. Keep the rendered model visible.
  if (weakRenderer || cores <= 2 || memory <= 2) return "fallback";
  if (saveData || slowConnection || cores <= 4 || memory <= 4 || window.innerWidth < 820) return "medium";

  // Do not demote a capable desktop solely because it uses Intel Iris/UHD.
  if (integratedIntel && (cores <= 6 || memory < 8)) return "medium";
  return "high";
}

export function useQualityTier() {
  const [quality, setQuality] = useState<Quality>("fallback");

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
