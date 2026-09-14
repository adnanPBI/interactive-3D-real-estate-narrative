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
 * R6.1.2 cinematic camera pass.
 * Desktop shots are intentionally closer and lower than the earlier overview
 * framing so industrial massing reads as architecture rather than a miniature.
 * Copy-safe negative space remains on the narrative side of each chapter.
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
      desktop: { position: [9.15, 5.35, 12.2], target: [1.1, 1.05, -0.15], fov: 37 },
      tablet: { position: [7.1, 5.15, 13.7], target: [0.55, 1.0, -0.05], fov: 41 },
      mobile: { position: [3.0, 4.7, 15.2], target: [0.0, 0.95, 0.35], fov: 49 },
    },
    model: {
      desktop: { position: [3.35, -1.30, 0.0], rotation: [0, -0.17, 0], scale: 0.78 },
      tablet: { position: [0.35, -1.31, 0.08], rotation: [0, -0.15, 0], scale: 0.70 },
      mobile: { position: [0, -1.32, 0.55], rotation: [0, -0.09, 0], scale: 0.61 },
    },
    accent: "#3d5a80",
    background: "#e8e2d8",
    fog: [19, 58],
    keyLight: [6.8, 10.8, 4.8],
    keyIntensity: 2.55,
    rimIntensity: 3.55,
  },
  {
    id: "manufacturing",
    label: "Solar manufacturing",
    timeline: chapterRanges[1],
    assetName: "manufacturing",
    asset: asset("manufacturing"),
    fallback: fallback("manufacturing"),
    camera: {
      desktop: { position: [8.9, 4.9, 12.3], target: [1.15, 1.2, -0.1], fov: 39 },
      tablet: { position: [6.4, 4.9, 13.8], target: [0.5, 1.1, 0.05], fov: 43 },
      mobile: { position: [2.5, 4.2, 14.9], target: [0.15, 1.05, 0.45], fov: 50 },
    },
    model: {
      desktop: { position: [3.25, -1.30, 0.05], rotation: [0, -0.10, 0], scale: 0.70 },
      tablet: { position: [0.35, -1.32, 0.15], rotation: [0, -0.08, 0], scale: 0.66 },
      mobile: { position: [0, -1.33, 0.68], rotation: [0, -0.04, 0], scale: 0.58 },
    },
    accent: "#c28d3f",
    background: "#e9e2d7",
    fog: [18, 55],
    keyLight: [5.2, 9.8, 5.8],
    keyIntensity: 2.62,
    rimIntensity: 3.25,
  },
  {
    id: "generation",
    label: "Power generation",
    timeline: chapterRanges[2],
    assetName: "power-generation",
    asset: asset("power-generation"),
    fallback: fallback("power-generation"),
    camera: {
      desktop: { position: [6.7, 5.65, 13.2], target: [-0.35, 0.95, -0.4], fov: 40 },
      tablet: { position: [4.6, 5.25, 14.3], target: [-0.1, 0.9, -0.1], fov: 43 },
      mobile: { position: [1.8, 4.5, 15.6], target: [0, 0.9, 0.42], fov: 49 },
    },
    model: {
      desktop: { position: [-3.25, -1.31, 0.05], rotation: [0, 0.14, 0], scale: 0.70 },
      tablet: { position: [-0.2, -1.32, 0.12], rotation: [0, 0.13, 0], scale: 0.65 },
      mobile: { position: [0, -1.33, 0.62], rotation: [0, 0.07, 0], scale: 0.56 },
    },
    accent: "#466b9a",
    background: "#e5e5df",
    fog: [20, 62],
    keyLight: [-6.2, 10.2, 5.2],
    keyIntensity: 2.48,
    rimIntensity: 3.6,
  },
  {
    id: "data-centers",
    label: "Data centers",
    timeline: chapterRanges[3],
    assetName: "data-centers",
    asset: asset("data-centers"),
    fallback: fallback("data-centers"),
    camera: {
      desktop: { position: [4.1, 4.9, 12.6], target: [0.0, 1.08, -0.55], fov: 38 },
      tablet: { position: [2.9, 4.9, 13.9], target: [0.15, 1.05, -0.2], fov: 42 },
      mobile: { position: [0.9, 4.15, 15.0], target: [0.05, 1.0, 0.42], fov: 49 },
    },
    model: {
      desktop: { position: [3.25, -1.30, -0.05], rotation: [0, -0.07, 0], scale: 0.69 },
      tablet: { position: [0.2, -1.32, 0.1], rotation: [0, -0.05, 0], scale: 0.64 },
      mobile: { position: [0, -1.33, 0.68], rotation: [0, -0.02, 0], scale: 0.56 },
    },
    accent: "#4a739f",
    background: "#e2e5e3",
    fog: [17, 52],
    keyLight: [5.0, 8.8, 4.2],
    keyIntensity: 2.35,
    rimIntensity: 3.75,
  },
  {
    id: "recycling",
    label: "Recycling",
    timeline: chapterRanges[4],
    assetName: "recycling",
    asset: asset("recycling"),
    fallback: fallback("recycling"),
    camera: {
      desktop: { position: [1.7, 4.6, 12.1], target: [-0.45, 1.0, -0.25], fov: 39 },
      tablet: { position: [0.8, 4.55, 13.5], target: [-0.12, 0.95, -0.1], fov: 43 },
      mobile: { position: [0.0, 4.0, 14.8], target: [0, 0.95, 0.45], fov: 49 },
    },
    model: {
      desktop: { position: [-3.20, -1.31, 0.0], rotation: [0, 0.11, 0], scale: 0.70 },
      tablet: { position: [-0.2, -1.32, 0.12], rotation: [0, 0.09, 0], scale: 0.65 },
      mobile: { position: [0, -1.33, 0.70], rotation: [0, 0.04, 0], scale: 0.56 },
    },
    accent: "#c28d3f",
    background: "#e9e1d5",
    fog: [18, 55],
    keyLight: [-4.8, 9.5, 5.0],
    keyIntensity: 2.45,
    rimIntensity: 3.35,
  },
  {
    id: "close",
    label: "Project pipeline",
    timeline: chapterRanges[5],
    assetName: "closing-platform",
    asset: asset("closing-platform"),
    fallback: fallback("closing-platform"),
    camera: {
      desktop: { position: [-0.6, 6.1, 15.2], target: [0.4, 0.95, -0.45], fov: 38 },
      tablet: { position: [-0.4, 5.7, 16.1], target: [0.0, 0.9, -0.2], fov: 42 },
      mobile: { position: [-0.35, 5.0, 17.3], target: [0.0, 0.9, 0.35], fov: 48 },
    },
    model: {
      desktop: { position: [3.15, -1.31, 0.08], rotation: [0, -0.06, 0], scale: 0.66 },
      tablet: { position: [0.1, -1.32, 0.12], rotation: [0, -0.04, 0], scale: 0.61 },
      mobile: { position: [0, -1.33, 0.70], rotation: [0, -0.02, 0], scale: 0.54 },
    },
    accent: "#466b9a",
    background: "#e7e1d8",
    fog: [20, 60],
    keyLight: [6.4, 10.8, 2.7],
    keyIntensity: 2.58,
    rimIntensity: 3.7,
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
