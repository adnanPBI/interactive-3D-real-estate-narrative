"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export function ContextLossGuard({ onFatal }: { onFatal?: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => {
      event.preventDefault();
      console.error("[R6] WebGL context lost.");
      onFatal?.();
    };
    canvas.addEventListener("webglcontextlost", onLost, false);
    return () => canvas.removeEventListener("webglcontextlost", onLost, false);
  }, [gl, onFatal]);

  return null;
}
