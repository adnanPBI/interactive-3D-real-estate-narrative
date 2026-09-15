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
 * R6.1.5 annotated composition pass.
 * Client review called the R6.1.3 assets too small. The desktop transforms below
 * restore roughly 22-27% more visual area while keeping each hero anchored on
 * its existing side of the editorial copy. Tablet/mobile receive a smaller lift
 * to avoid clipping on narrow layouts.
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
      desktop: { position: [10.5, 5.65, 14.3], target: [2.55, 0.95, -0.10], fov: 38 },
      tablet: { position: [7.6, 5.3, 14.9], target: [0.85, 0.95, 0.00], fov: 42 },
      mobile: { position: [3.3, 4.9, 15.8], target: [0.1, 0.92, 0.35], fov: 49 },
    },
    model: {
      desktop: { position: [3.95, -1.34, 0.12], rotation: [0, -0.15, 0], scale: 0.68 },
      tablet: { position: [0.66, -1.34, 0.12], rotation: [0, -0.13, 0], scale: 0.61 },
      mobile: { position: [0.0, -1.34, 0.62], rotation: [0, -0.08, 0], scale: 0.50 },
    },
    accent: "#3d5a80",
    background: "#e3ddd3",
    fog: [28, 78],
    keyLight: [6.8, 10.8, 4.8],
    keyIntensity: 2.00,
    rimIntensity: 2.38,
  },
  {
    id: "manufacturing",
    label: "Solar manufacturing",
    timeline: chapterRanges[1],
    assetName: "manufacturing",
    asset: asset("manufacturing"),
    fallback: fallback("manufacturing"),
    camera: {
      desktop: { position: [10.0, 5.35, 14.0], target: [2.45, 1.05, -0.05], fov: 39 },
      tablet: { position: [7.0, 5.1, 14.6], target: [0.65, 1.02, 0.02], fov: 43 },
      mobile: { position: [3.0, 4.6, 15.6], target: [0.15, 1.0, 0.42], fov: 50 },
    },
    model: {
      desktop: { position: [3.72, -1.34, 0.06], rotation: [0, -0.09, 0], scale: 0.70 },
      tablet: { position: [0.56, -1.35, 0.13], rotation: [0, -0.07, 0], scale: 0.62 },
      mobile: { position: [0.0, -1.35, 0.68], rotation: [0, -0.04, 0], scale: 0.51 },
    },
    accent: "#b6792b",
    background: "#e4ddd3",
    fog: [27, 76],
    keyLight: [5.2, 9.8, 5.8],
    keyIntensity: 2.08,
    rimIntensity: 2.34,
  },
  {
    id: "generation",
    label: "Power generation",
    timeline: chapterRanges[2],
    assetName: "power-generation",
    asset: asset("power-generation"),
    fallback: fallback("power-generation"),
    camera: {
      desktop: { position: [4.8, 5.7, 14.8], target: [-2.45, 0.90, -0.25], fov: 40 },
      tablet: { position: [3.3, 5.4, 15.3], target: [-0.65, 0.9, -0.05], fov: 43 },
      mobile: { position: [1.5, 4.7, 16.0], target: [0.0, 0.9, 0.4], fov: 49 },
    },
    model: {
      desktop: { position: [-3.72, -1.35, 0.05], rotation: [0, 0.13, 0], scale: 0.69 },
      tablet: { position: [-0.52, -1.35, 0.12], rotation: [0, 0.11, 0], scale: 0.61 },
      mobile: { position: [0, -1.35, 0.65], rotation: [0, 0.06, 0], scale: 0.50 },
    },
    accent: "#355f8e",
    background: "#e0e2de",
    fog: [29, 82],
    keyLight: [-6.2, 10.2, 5.2],
    keyIntensity: 2.00,
    rimIntensity: 2.42,
  },
  {
    id: "data-centers",
    label: "Data centers",
    timeline: chapterRanges[3],
    assetName: "data-centers",
    asset: asset("data-centers"),
    fallback: fallback("data-centers"),
    camera: {
      desktop: { position: [6.4, 5.3, 14.6], target: [2.35, 1.02, -0.35], fov: 39 },
      tablet: { position: [3.8, 5.1, 15.1], target: [0.55, 1.0, -0.10], fov: 43 },
      mobile: { position: [1.2, 4.5, 15.7], target: [0.05, 0.98, 0.42], fov: 49 },
    },
    model: {
      desktop: { position: [3.70, -1.34, -0.02], rotation: [0, -0.06, 0], scale: 0.68 },
      tablet: { position: [0.51, -1.35, 0.10], rotation: [0, -0.04, 0], scale: 0.60 },
      mobile: { position: [0, -1.35, 0.68], rotation: [0, -0.02, 0], scale: 0.49 },
    },
    accent: "#376b91",
    background: "#dfe2df",
    fog: [26, 74],
    keyLight: [5.0, 8.8, 4.2],
    keyIntensity: 2.02,
    rimIntensity: 2.46,
  },
  {
    id: "recycling",
    label: "Recycling",
    timeline: chapterRanges[4],
    assetName: "recycling",
    asset: asset("recycling"),
    fallback: fallback("recycling"),
    camera: {
      desktop: { position: [3.1, 5.0, 14.3], target: [-2.25, 0.95, -0.18], fov: 40 },
      tablet: { position: [1.4, 4.9, 14.8], target: [-0.55, 0.94, -0.06], fov: 43 },
      mobile: { position: [0.2, 4.4, 15.6], target: [0, 0.94, 0.44], fov: 49 },
    },
    model: {
      desktop: { position: [-3.68, -1.35, 0.02], rotation: [0, 0.10, 0], scale: 0.69 },
      tablet: { position: [-0.52, -1.35, 0.12], rotation: [0, 0.08, 0], scale: 0.61 },
      mobile: { position: [0, -1.35, 0.70], rotation: [0, 0.04, 0], scale: 0.50 },
    },
    accent: "#b6792b",
    background: "#e4dcd0",
    fog: [27, 76],
    keyLight: [-4.8, 9.5, 5.0],
    keyIntensity: 2.04,
    rimIntensity: 2.38,
  },
  {
    id: "close",
    label: "Project pipeline",
    timeline: chapterRanges[5],
    assetName: "closing-platform",
    asset: asset("closing-platform"),
    fallback: fallback("closing-platform"),
    camera: {
      desktop: { position: [1.3, 6.1, 16.1], target: [2.0, 0.92, -0.24], fov: 39 },
      tablet: { position: [0.5, 5.7, 16.5], target: [0.45, 0.90, -0.10], fov: 43 },
      mobile: { position: [-0.2, 5.1, 17.1], target: [0.0, 0.90, 0.35], fov: 48 },
    },
    model: {
      desktop: { position: [3.28, -1.35, 0.10], rotation: [0, -0.05, 0], scale: 0.66 },
      tablet: { position: [0.42, -1.35, 0.14], rotation: [0, -0.04, 0], scale: 0.59 },
      mobile: { position: [0, -1.35, 0.70], rotation: [0, -0.02, 0], scale: 0.49 },
    },
    accent: "#355f8e",
    background: "#e2dcd2",
    fog: [30, 84],
    keyLight: [6.4, 10.8, 2.7],
    keyIntensity: 2.04,
    rimIntensity: 2.46,
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

export function sceneAssetForQuality(definition: SceneDefinition, _quality: "high" | "medium") {
  if (assetSet === "r6") {
    const hero = r6LegacyNameToHero[definition.assetName as LegacyAssetName];
    return `/models/r6/hero/${hero}/lod0.glb`;
  }
  if (assetSet === "r5") return `/models/r5/high/${definition.assetName}.glb`;
  return definition.asset;
}

export const activeAssetSet = assetSet;
