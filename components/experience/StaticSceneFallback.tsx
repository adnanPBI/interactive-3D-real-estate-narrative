"use client";

import { sceneDefinitions } from "@/experience/config/scenes";

/**
 * Low-power/reduced-motion path that preserves the same six-chapter art direction
 * without creating a WebGL context. Every image is an original Stage 3 fallback
 * illustration generated alongside the GLB pack.
 */
export function StaticSceneFallback({ activeChapter }: { activeChapter: number }) {
  return (
    <div className="experience-fallback experience-fallback--stage3" aria-hidden="true">
      {sceneDefinitions.map((scene, index) => (
        <div
          className="fallback-scene"
          data-active={index === activeChapter}
          key={scene.id}
          style={{ backgroundImage: `url(${scene.fallback})` }}
        />
      ))}
      <div className="fallback-vignette" />
      <span className="fallback-label">Lightweight experience</span>
    </div>
  );
}
