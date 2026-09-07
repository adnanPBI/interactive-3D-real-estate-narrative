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
      : "r5";
const assetBase = assetSet === "r5" ? "/models/r5/high" : `/models/${assetSet}`;
const fallbackBase = assetSet === "r5" ? "/fallback/r5" : assetSet === "r4" ? "/fallback/r4" : "/fallback/stage3";

const asset = (name: string) => `${assetBase}/${name}.glb`;
const fallback = (name: string) => `${fallbackBase}/${name}.svg`;

/**
 * R4 camera art direction is authored per breakpoint rather than applying
 * one generic mobile offset. This keeps the focal architecture visible while
 * preserving negative space for narrative copy on desktop, tablet and mobile.
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
      desktop: { position: [11.0, 6.7, 15.8], target: [0.15, 0.85, -0.35], fov: 39 },
      tablet: { position: [8.0, 5.8, 15.8], target: [0.1, 0.9, -0.2], fov: 43 },
      mobile: { position: [3.2, 5.0, 17.2], target: [0.0, 0.9, 0.4], fov: 51 },
    },
    model: {
      desktop: { position: [1.85, -1.34, 0], rotation: [0, -0.18, 0], scale: 0.60 },
      tablet: { position: [0.35, -1.34, 0.1], rotation: [0, -0.14, 0], scale: 0.60 },
      mobile: { position: [0, -1.34, 0.65], rotation: [0, -0.08, 0], scale: 0.54 },
    },
    accent: "#3d5a80",
    background: "#eee7dc",
    fog: [14, 42],
    keyLight: [6.5, 9.8, 5.2],
    keyIntensity: 2.05,
    rimIntensity: 2.7,
  },
  {
    id: "manufacturing",
    label: "Solar manufacturing",
    timeline: chapterRanges[1],
    assetName: "manufacturing",
    asset: asset("manufacturing"),
    fallback: fallback("manufacturing"),
    camera: {
      desktop: { position: [8.2, 4.55, 10.8], target: [1.2, 1.25, 0.0], fov: 40 },
      tablet: { position: [6.1, 4.65, 13.0], target: [0.55, 1.1, 0.15], fov: 45 },
      mobile: { position: [2.6, 4.1, 14.6], target: [0.2, 1.05, 0.55], fov: 52 },
    },
    model: {
      desktop: { position: [2.05, -1.35, 0.0], rotation: [0, -0.10, 0], scale: 0.68 },
      tablet: { position: [0.45, -1.35, 0.2], rotation: [0, -0.08, 0], scale: 0.64 },
      mobile: { position: [0, -1.35, 0.75], rotation: [0, -0.03, 0], scale: 0.56 },
    },
    accent: "#b08d57",
    background: "#eee5d8",
    fog: [13, 38],
    keyLight: [4.8, 8.8, 6.2],
    keyIntensity: 2.15,
    rimIntensity: 2.35,
  },
  {
    id: "generation",
    label: "Power generation",
    timeline: chapterRanges[2],
    assetName: "power-generation",
    asset: asset("power-generation"),
    fallback: fallback("power-generation"),
    camera: {
      desktop: { position: [6.2, 6.25, 14.8], target: [0.1, 0.75, -0.45], fov: 42 },
      tablet: { position: [4.5, 5.4, 15.2], target: [0.0, 0.8, -0.2], fov: 45 },
      mobile: { position: [1.8, 4.6, 16.5], target: [0, 0.85, 0.5], fov: 51 },
    },
    model: {
      desktop: { position: [-2.05, -1.35, 0.0], rotation: [0, 0.18, 0], scale: 0.61 },
      tablet: { position: [-0.2, -1.35, 0.15], rotation: [0, 0.13, 0], scale: 0.60 },
      mobile: { position: [0, -1.35, 0.72], rotation: [0, 0.06, 0], scale: 0.53 },
    },
    accent: "#3d5a80",
    background: "#e9e7df",
    fog: [15, 46],
    keyLight: [-5.8, 9.2, 5.6],
    keyIntensity: 2.08,
    rimIntensity: 2.6,
  },
  {
    id: "data-centers",
    label: "Data centers",
    timeline: chapterRanges[3],
    assetName: "data-centers",
    asset: asset("data-centers"),
    fallback: fallback("data-centers"),
    camera: {
      desktop: { position: [3.2, 4.75, 11.7], target: [0.0, 1.05, -0.55], fov: 39 },
      tablet: { position: [2.7, 4.75, 13.9], target: [0.2, 1.05, -0.25], fov: 44 },
      mobile: { position: [0.9, 4.1, 15.2], target: [0.05, 1.0, 0.45], fov: 51 },
    },
    model: {
      desktop: { position: [2.10, -1.34, 0.0], rotation: [0, -0.08, 0], scale: 0.65 },
      tablet: { position: [0.2, -1.34, 0.2], rotation: [0, -0.05, 0], scale: 0.61 },
      mobile: { position: [0, -1.34, 0.75], rotation: [0, -0.02, 0], scale: 0.54 },
    },
    accent: "#3d5a80",
    background: "#e7e8e5",
    fog: [12, 36],
    keyLight: [4.6, 7.8, 4.6],
    keyIntensity: 1.9,
    rimIntensity: 2.75,
  },
  {
    id: "recycling",
    label: "Recycling",
    timeline: chapterRanges[4],
    assetName: "recycling",
    asset: asset("recycling"),
    fallback: fallback("recycling"),
    camera: {
      desktop: { position: [1.0, 4.4, 11.5], target: [-0.1, 0.95, -0.35], fov: 40 },
      tablet: { position: [0.8, 4.45, 13.6], target: [-0.1, 0.95, -0.15], fov: 45 },
      mobile: { position: [0.0, 3.95, 15.0], target: [0, 0.95, 0.5], fov: 51 },
    },
    model: {
      desktop: { position: [-2.00, -1.35, 0], rotation: [0, 0.13, 0], scale: 0.65 },
      tablet: { position: [-0.2, -1.35, 0.2], rotation: [0, 0.09, 0], scale: 0.61 },
      mobile: { position: [0, -1.35, 0.78], rotation: [0, 0.04, 0], scale: 0.54 },
    },
    accent: "#b08d57",
    background: "#eee5d9",
    fog: [13, 38],
    keyLight: [-4.5, 8.6, 5.4],
    keyIntensity: 2.02,
    rimIntensity: 2.35,
  },
  {
    id: "close",
    label: "Project pipeline",
    timeline: chapterRanges[5],
    assetName: "closing-platform",
    asset: asset("closing-platform"),
    fallback: fallback("closing-platform"),
    camera: {
      desktop: { position: [-1.0, 7.1, 17.8], target: [0.0, 0.9, -0.5], fov: 39 },
      tablet: { position: [-0.5, 6.2, 17.9], target: [0.0, 0.9, -0.25], fov: 43 },
      mobile: { position: [-0.4, 5.1, 18.6], target: [0.0, 0.9, 0.4], fov: 50 },
    },
    model: {
      desktop: { position: [1.60, -1.35, 0], rotation: [0, -0.05, 0], scale: 0.58 },
      tablet: { position: [0.1, -1.35, 0.2], rotation: [0, -0.03, 0], scale: 0.57 },
      mobile: { position: [0, -1.35, 0.8], rotation: [0, -0.01, 0], scale: 0.51 },
    },
    accent: "#3d5a80",
    background: "#eee7dd",
    fog: [15, 44],
    keyLight: [6.2, 10.0, 2.7],
    keyIntensity: 2.2,
    rimIntensity: 2.7,
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
  if (assetSet === "r5") return `/models/r5/${quality}/${definition.assetName}.glb`;
  return definition.asset;
}

export const activeAssetSet = assetSet;
