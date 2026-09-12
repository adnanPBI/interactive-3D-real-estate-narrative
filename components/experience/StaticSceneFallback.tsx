"use client";

import { sceneDefinitions } from "@/experience/config/scenes";

/** Authored R6 still frames preserve the chapter composition without WebGL. */
export function StaticSceneFallback({ activeChapter }: { activeChapter: number }) {
  return (
    <div
      className="experience-fallback experience-fallback--r6"
      aria-hidden="true"
      data-r6-static-fallback="true"
    >
      {sceneDefinitions.map((scene, index) => (
        <div
          className="fallback-scene"
          data-active={index === activeChapter}
          data-r6-fallback-scene={scene.id}
          data-r6-fallback-src={scene.fallback}
          key={scene.id}
          style={{ backgroundImage: `url(${scene.fallback})` }}
        />
      ))}
      <div className="fallback-vignette" />
    </div>
  );
}
