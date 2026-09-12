import type { R6HeroId } from "./r6Assets";

export const r61ManufacturingTextureMaterials = {
  Concrete_Floor: "concrete-floor",
  Concrete_Wall: "concrete-wall",
  Metal_Painted_Charcoal: "metal-painted-charcoal",
  Metal_Steel: "metal-steel",
  Metal_Aluminum: "metal-aluminum",
  Panel_White: "panel-white",
} as const;

export type R61ManufacturingMaterialName = keyof typeof r61ManufacturingTextureMaterials;
export type R61TextureKind = "basecolor" | "normal" | "orm";

export const r61MaterialNormalScale: Record<string, number> = {
  Concrete_Floor: 0.18,
  Concrete_Wall: 0.16,
  Metal_Painted_Charcoal: 0.10,
  Metal_Steel: 0.08,
  Metal_Aluminum: 0.08,
  Panel_White: 0.06,
};

export const r61GlassMaterials = new Set<string>([
  "Glass_Clear",
  "Glass_Tinted",
  "VisionGlass",
]);

export function r61MaterialTextureUrl(
  hero: R6HeroId,
  material: R61ManufacturingMaterialName,
  kind: R61TextureKind,
) {
  const slug = r61ManufacturingTextureMaterials[material];
  return `/textures/r6/${hero}/materials/${slug}/${kind}.ktx2`;
}
