import { chapterRanges, type ChapterRange } from "./storyMotion";

export type Vec3 = readonly [number, number, number];
export type ViewportClass = "desktop" | "tablet" | "mobile";

export type CameraShot = {
  position: Vec3;
  target: Vec3;
  fov: number;
};

export type ResponsiveCamera = Record<ViewportClass, CameraShot>;

export type ModelTransform = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
};

export type SceneDefinition = {
  id: "hero" | "manufacturing" | "generation" | "data-centers" | "recycling" | "close";
  label: string;
  timeline: ChapterRange;
  assetName: string;
  asset: string;
  fallback: string;
  camera: ResponsiveCamera;
  model: Record<ViewportClass, ModelTransform>;
  accent: string;
  background: string;
  fog: readonly [number, number];
  keyLight: Vec3;
  keyIntensity: number;
  rimIntensity: number;
};

const requestedAssetSet = process.env.NEXT_PUBLIC_3D_ASSET_SET;
const assetSet = requestedAssetSet === "approved"
  ? "approved"
  : requestedAssetSet === "stage3"
    ? "stage3"
    : requestedAssetSet === "r4"
      ? "r4"
      : requestedAssetSet === "r5" ? "r5" : "r6";
const r6LegacyNameToHero = {
  "hero-campus": "integrated-campus",
  "manufacturing": "manufacturing-line",
  "power-generation": "substation-bess",
  "data-centers": "data-center-cooling",
  "recycling": "recycling-intake",
  "closing-platform": "connected-campus",
} as const;

type LegacyAssetName = keyof typeof r6LegacyNameToHero;

const asset = (name: LegacyAssetName) => {
  if (assetSet === "r6") return `/models/r6/hero/${r6LegacyNameToHero[name]}/lod0.glb`;
  if (assetSet === "r5") return `/models/r5/high/${name}.glb`;
  return `/models/${assetSet}/${name}.glb`;
};
const fallback = (name: LegacyAssetName) => {
  if (assetSet === "r6") return `/fallback/r6/${r6LegacyNameToHero[name]}.webp`;
  if (assetSet === "r5") return `/fallback/r5/${name}.svg`;
  if (assetSet === "r4") return `/fallback/r4/${name}.svg`;
  return `/fallback/stage3/${name}.svg`;
};

/**
 * R6.1.3 composition pass.
 * The canonical LOD0 bounds are roughly 15–18 units wide. Previous desktop
 * scales of .69–.78 made the assets wider than the copy-safe viewport column.
 * These transforms are calibrated to keep the entire industrial hero inside its
 * half of the composition while preserving enough scale for readable detail.
 */
export const sceneDefinitions: readonly SceneDefinition[] = [
  {
    id: "hero",
    label: "Integrated platform",
    timeline: chapterRanges[0],
    assetName: "hero-campus",
    asset: asset("hero-campus"),
    fallback: fallback("hero-campus"),
    camera: {
      desktop: { position: [10.8, 5.8, 14.8], target: [2.55, 0.95, -0.10], fov: 39 },
      tablet: { position: [7.8, 5.4, 15.3], target: [0.85, 0.95, 0.00], fov: 43 },
      mobile: { position: [3.3, 5.0, 16.2], target: [0.1, 0.92, 0.35], fov: 50 },
    },
    model: {
      desktop: { position: [4.05, -1.34, 0.12], rotation: [0, -0.15, 0], scale: 0.54 },
      tablet: { position: [0.70, -1.34, 0.12], rotation: [0, -0.13, 0], scale: 0.53 },
      mobile: { position: [0.0, -1.34, 0.62], rotation: [0, -0.08, 0], scale: 0.46 },
    },
    accent: "#3d5a80",
    background: "#ded8cd",
    fog: [26, 72],
    keyLight: [6.8, 10.8, 4.8],
    keyIntensity: 1.86,
    rimIntensity: 2.28,
  },
  {
    id: "manufacturing",
    label: "Solar manufacturing",
    timeline: chapterRanges[1],
    assetName: "manufacturing",
    asset: asset("manufacturing"),
    fallback: fallback("manufacturing"),
    camera: {
      desktop: { position: [10.4, 5.5, 14.5], target: [2.45, 1.05, -0.05], fov: 40 },
      tablet: { position: [7.2, 5.2, 15.0], target: [0.65, 1.02, 0.02], fov: 44 },
      mobile: { position: [3.0, 4.7, 16.0], target: [0.15, 1.0, 0.42], fov: 51 },
    },
    model: {
      desktop: { position: [3.85, -1.34, 0.06], rotation: [0, -0.09, 0], scale: 0.56 },
      tablet: { position: [0.60, -1.35, 0.13], rotation: [0, -0.07, 0], scale: 0.54 },
      mobile: { position: [0.0, -1.35, 0.68], rotation: [0, -0.04, 0], scale: 0.47 },
    },
    accent: "#b6792b",
    background: "#dfd8cd",
    fog: [25, 70],
    keyLight: [5.2, 9.8, 5.8],
    keyIntensity: 1.92,
    rimIntensity: 2.22,
  },
  {
    id: "generation",
    label: "Power generation",
    timeline: chapterRanges[2],
    assetName: "power-generation",
    asset: asset("power-generation"),
    fallback: fallback("power-generation"),
    camera: {
      desktop: { position: [5.1, 5.9, 15.3], target: [-2.45, 0.90, -0.25], fov: 41 },
      tablet: { position: [3.5, 5.5, 15.7], target: [-0.65, 0.9, -0.05], fov: 44 },
      mobile: { position: [1.5, 4.8, 16.4], target: [0.0, 0.9, 0.4], fov: 50 },
    },
    model: {
      desktop: { position: [-3.90, -1.35, 0.05], rotation: [0, 0.13, 0], scale: 0.55 },
      tablet: { position: [-0.55, -1.35, 0.12], rotation: [0, 0.11, 0], scale: 0.53 },
      mobile: { position: [0, -1.35, 0.65], rotation: [0, 0.06, 0], scale: 0.46 },
    },
    accent: "#355f8e",
    background: "#dbddd9",
    fog: [27, 76],
    keyLight: [-6.2, 10.2, 5.2],
    keyIntensity: 1.84,
    rimIntensity: 2.32,
  },
  {
    id: "data-centers",
    label: "Data centers",
    timeline: chapterRanges[3],
    assetName: "data-centers",
    asset: asset("data-centers"),
    fallback: fallback("data-centers"),
    camera: {
      desktop: { position: [6.7, 5.5, 15.1], target: [2.35, 1.02, -0.35], fov: 40 },
      tablet: { position: [4.0, 5.3, 15.5], target: [0.55, 1.0, -0.10], fov: 44 },
      mobile: { position: [1.2, 4.6, 16.1], target: [0.05, 0.98, 0.42], fov: 50 },
    },
    model: {
      desktop: { position: [3.85, -1.34, -0.02], rotation: [0, -0.06, 0], scale: 0.54 },
      tablet: { position: [0.55, -1.35, 0.10], rotation: [0, -0.04, 0], scale: 0.52 },
      mobile: { position: [0, -1.35, 0.68], rotation: [0, -0.02, 0], scale: 0.45 },
    },
    accent: "#376b91",
    background: "#d9dcda",
    fog: [24, 68],
    keyLight: [5.0, 8.8, 4.2],
    keyIntensity: 1.80,
    rimIntensity: 2.38,
  },
  {
    id: "recycling",
    label: "Recycling",
    timeline: chapterRanges[4],
    assetName: "recycling",
    asset: asset("recycling"),
    fallback: fallback("recycling"),
    camera: {
      desktop: { position: [3.4, 5.2, 14.8], target: [-2.25, 0.95, -0.18], fov: 41 },
      tablet: { position: [1.6, 5.0, 15.2], target: [-0.55, 0.94, -0.06], fov: 44 },
      mobile: { position: [0.2, 4.5, 16.0], target: [0, 0.94, 0.44], fov: 50 },
    },
    model: {
      desktop: { position: [-3.85, -1.35, 0.02], rotation: [0, 0.10, 0], scale: 0.55 },
      tablet: { position: [-0.55, -1.35, 0.12], rotation: [0, 0.08, 0], scale: 0.53 },
      mobile: { position: [0, -1.35, 0.70], rotation: [0, 0.04, 0], scale: 0.46 },
    },
    accent: "#b6792b",
    background: "#dfd7ca",
    fog: [25, 70],
    keyLight: [-4.8, 9.5, 5.0],
    keyIntensity: 1.86,
    rimIntensity: 2.28,
  },
  {
    id: "close",
    label: "Project pipeline",
    timeline: chapterRanges[5],
    assetName: "closing-platform",
    asset: asset("closing-platform"),
    fallback: fallback("closing-platform"),
    camera: {
      desktop: { position: [1.5, 6.4, 16.8], target: [2.0, 0.92, -0.24], fov: 40 },
      tablet: { position: [0.6, 5.9, 17.0], target: [0.45, 0.90, -0.10], fov: 44 },
      mobile: { position: [-0.2, 5.2, 17.7], target: [0.0, 0.90, 0.35], fov: 49 },
    },
    model: {
      desktop: { position: [3.45, -1.35, 0.10], rotation: [0, -0.05, 0], scale: 0.52 },
      tablet: { position: [0.45, -1.35, 0.14], rotation: [0, -0.04, 0], scale: 0.50 },
      mobile: { position: [0, -1.35, 0.70], rotation: [0, -0.02, 0], scale: 0.44 },
    },
    accent: "#355f8e",
    background: "#ddd7cd",
    fog: [28, 78],
    keyLight: [6.4, 10.8, 2.7],
    keyIntensity: 1.88,
    rimIntensity: 2.35,
  },
] as const;

export function sceneTimeline(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const last = sceneDefinitions.length - 1;
  if (p >= 1) return { position: last, from: last, to: last, local: 0 };

  let from = 0;
  for (let index = 0; index < last; index += 1) {
    const a = sceneDefinitions[index].timeline.cameraAnchor;
    const b = sceneDefinitions[index + 1].timeline.cameraAnchor;
    if (p >= a && p < b) {
      from = index;
      const local = (p - a) / Math.max(0.000001, b - a);
      return { position: from + local, from, to: from + 1, local };
    }
  }
  return { position: 0, from: 0, to: 1, local: 0 };
}

export function sceneWeight(index: number, progress: number) {
  const timeline = sceneTimeline(progress);
  const eased = timeline.local * timeline.local * (3 - 2 * timeline.local);
  if (timeline.from === timeline.to) return index === timeline.from ? 1 : 0;
  if (index === timeline.from) return 1 - eased;
  if (index === timeline.to) return eased;
  return 0;
}

export function viewportClass(width: number): ViewportClass {
  if (width < 680) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

export function cameraShot(definition: SceneDefinition, width: number): CameraShot {
  return definition.camera[viewportClass(width)];
}

export function modelTransform(definition: SceneDefinition, width: number): ModelTransform {
  return definition.model[viewportClass(width)];
}

export function sceneAssetForQuality(definition: SceneDefinition, quality: "high" | "medium") {
  if (assetSet === "r6") {
    const hero = r6LegacyNameToHero[definition.assetName as LegacyAssetName];
    return `/models/r6/hero/${hero}/${quality === "high" ? "lod0" : "lod1"}.glb`;
  }
  if (assetSet === "r5") return `/models/r5/${quality}/${definition.assetName}.glb`;
  return definition.asset;
}

export const activeAssetSet = assetSet;
