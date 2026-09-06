export type StoryChapterId = "hero" | "manufacturing" | "generation" | "data-centers" | "recycling" | "close";

export type ChapterRange = {
  id: StoryChapterId;
  label: string;
  start: number;
  end: number;
  cameraAnchor: number;
};

/**
 * Single source of truth for R3 cinematic motion and performance limits.
 *
 * The home no longer uses a physical scroll range. Six discrete chapter anchors
 * are connected by a calm GSAP tween and sampled by the allocation-free camera
 * spline. Keeping these values centralized makes the interaction auditable and
 * prevents renderer magic numbers from drifting across components.
 */
export const storyMotion = {
  chapterCount: 6,
  chapterTransitionSeconds: 1.15,
  cameraDamping: 5.2,
  fovDamping: 4.8,
  lightDamping: 3.2,
  sceneBlendDamping: 5.6,
  splineTension: 0.40,
  pointerParallax: {
    desktop: { x: 0.015, y: 0.010 },
    tablet: { x: 0.008, y: 0.006 },
    mobile: { x: 0.002, y: 0.002 },
  },
  quality: {
    high: {
      initialDpr: 1.15,
      minDpr: 0.82,
      maxDpr: 1.30,
      maxDrawCalls: 90,
      maxTriangles: 260_000,
      maxTextures: 32,
    },
    medium: {
      initialDpr: 1.0,
      minDpr: 0.72,
      maxDpr: 1.0,
      maxDrawCalls: 75,
      maxTriangles: 180_000,
      maxTextures: 24,
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

/** Nearest authored anchor, appropriate for discrete chapter transitions. */
export function activeChapterForProgress(value: number) {
  const p = clampStoryProgress(value);
  return Math.min(chapterRanges.length - 1, Math.round(p * (chapterRanges.length - 1)));
}
