import { create } from "zustand";
import { sceneTimeline } from "@/experience/config/scenes";
import { activeChapterForProgress, clampStoryProgress } from "@/experience/config/storyMotion";

export type ExperienceQuality = "high" | "medium" | "fallback";
export type R6Lod = "lod0" | "lod1" | "lod2" | "proxy";
export type PostFxMode = "smaa" | "off";

type ExperienceState = {
  /** GSAP-tweened step progress consumed by the 3D runtime. */
  progress: number;
  /** Target chapter anchor progress for diagnostics and deterministic transitions. */
  targetProgress: number;
  activeChapter: number;
  /** Camera segment index; changes only at the five spline boundaries. */
  renderFrom: number;
  quality: ExperienceQuality;
  /** Runtime governor ceiling. High normally permits LOD0; sustained slow frames lower it. */
  lodCeiling: R6Lod;
  /** SMAA is mandatory in normal R6 operation; emergency governor state may disable it. */
  postFx: PostFxMode;
  setTimelineProgress: (progress: number) => void;
  setTargetProgress: (progress: number) => void;
  setActiveChapter: (index: number) => void;
  setQuality: (quality: ExperienceQuality) => void;
  setLodCeiling: (lod: R6Lod) => void;
  setPostFx: (mode: PostFxMode) => void;
  resetRenderBudget: () => void;
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  progress: 0,
  targetProgress: 0,
  activeChapter: 0,
  renderFrom: 0,
  quality: "high",
  lodCeiling: "lod0",
  postFx: "smaa",
  setTimelineProgress: (progress) => {
    const next = clampStoryProgress(progress);
    const renderFrom = sceneTimeline(next).from;
    set({ progress: next, activeChapter: activeChapterForProgress(next), renderFrom });
  },
  setTargetProgress: (targetProgress) => set({ targetProgress: clampStoryProgress(targetProgress) }),
  setActiveChapter: (activeChapter) => set({ activeChapter: Math.min(5, Math.max(0, activeChapter)) }),
  setQuality: (quality) => set({
    quality,
    lodCeiling: quality === "high" ? "lod0" : quality === "medium" ? "lod1" : "proxy",
    postFx: quality === "fallback" ? "off" : "smaa",
  }),
  setLodCeiling: (lodCeiling) => set({ lodCeiling }),
  setPostFx: (postFx) => set({ postFx }),
  resetRenderBudget: () => set((state) => ({
    lodCeiling: state.quality === "high" ? "lod0" : state.quality === "medium" ? "lod1" : "proxy",
    postFx: state.quality === "fallback" ? "off" : "smaa",
  })),
}));
