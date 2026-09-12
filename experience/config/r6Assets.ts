import type { R6Lod } from "@/experience/systems/HeroActivation";

export const r6ChapterHero = [
  "integrated-campus",
  "manufacturing-line",
  "substation-bess",
  "data-center-cooling",
  "recycling-intake",
  "connected-campus",
] as const;

export type R6HeroId = (typeof r6ChapterHero)[number];
export type R6TextureKind = "basecolor" | "normal" | "orm";

export function r6HeroUrl(hero: R6HeroId, lod: R6Lod) {
  return `/models/r6/hero/${hero}/${lod}.glb`;
}

export function r6TextureUrl(hero: R6HeroId, kind: R6TextureKind) {
  return `/textures/r6/${hero}/${kind}.ktx2`;
}
