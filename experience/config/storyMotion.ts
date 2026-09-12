export type StoryChapterId = "hero" | "manufacturing" | "generation" | "data-centers" | "recycling" | "close";

export type ChapterRange = {
  id: StoryChapterId;
  label: string;
  start: number;
  end: number;
  cameraAnchor: number;
};

/** R6 master motion and enforceable runtime budgets. */
export const storyMotion = {
  chapterCount: 6,
  chapterTransitionSeconds: 1.18,
  cameraDamping: 5.4,
  fovDamping: 5.0,
  lightDamping: 3.4,
  sceneBlendDamping: 6.2,
  splineTension: 0.38,
  pointerParallax: {
    desktop: { x: 0.012, y: 0.008 },
    tablet: { x: 0.006, y: 0.004 },
    mobile: { x: 0.0015, y: 0.0015 },
  },
  quality: {
    high: {
      initialDpr: 1.25,
      minDpr: 0.95,
      maxDpr: 1.35,
      maxDrawCalls: 120,
      maxTriangles: 220_000,
      maxTextures: 48,
      maxTextureMemoryMB: 180,
      shadowMapSize: 2048,
      composerSamples: 4,
    },
    medium: {
      initialDpr: 1.0,
      minDpr: 0.82,
      maxDpr: 1.0,
      maxDrawCalls: 80,
      maxTriangles: 120_000,
      maxTextures: 34,
      maxTextureMemoryMB: 100,
      shadowMapSize: 1024,
      composerSamples: 0,
    },
  },
} as const;

const ids: StoryChapterId[] = ["hero", "manufacturing", "generation", "data-centers", "recycling", "close"];
const labels = ["Integrated platform", "Solar manufacturing", "Power generation", "Data centers", "Recycling", "Connected platform"];

export const chapterRanges: readonly ChapterRange[] = ids.map((id, index) => ({
  id,
  label: labels[index],
  start: index / (ids.length - 1),
  end: Math.min(1, (index + 1) / (ids.length - 1)),
  cameraAnchor: index / (ids.length - 1),
}));

export function clampStoryProgress(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function activeChapterForProgress(value: number) {
  const p = clampStoryProgress(value);
  return Math.min(chapterRanges.length - 1, Math.round(p * (chapterRanges.length - 1)));
}
