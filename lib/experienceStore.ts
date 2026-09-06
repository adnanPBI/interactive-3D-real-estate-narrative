import { create } from "zustand";
import { sceneTimeline } from "@/experience/config/scenes";
import { activeChapterForProgress, clampStoryProgress } from "@/experience/config/storyMotion";

export type ExperienceQuality = "high" | "medium" | "fallback";

type ExperienceState = {
  /** GSAP-tweened step progress consumed by the 3D runtime. */
  progress: number;
  /** Target chapter anchor progress for diagnostics and deterministic transitions. */
  targetProgress: number;
  activeChapter: number;
  /** Camera segment index; changes only at the five spline boundaries. */
  renderFrom: number;
  quality: ExperienceQuality;
  setTimelineProgress: (progress: number) => void;
  setTargetProgress: (progress: number) => void;
  setActiveChapter: (index: number) => void;
  setQuality: (quality: ExperienceQuality) => void;
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  progress: 0,
  targetProgress: 0,
  activeChapter: 0,
  renderFrom: 0,
  quality: "high",
  setTimelineProgress: (progress) => {
    const next = clampStoryProgress(progress);
    const renderFrom = sceneTimeline(next).from;
    set({ progress: next, activeChapter: activeChapterForProgress(next), renderFrom });
  },
  setTargetProgress: (targetProgress) => set({ targetProgress: clampStoryProgress(targetProgress) }),
  setActiveChapter: (activeChapter) => set({ activeChapter: Math.min(5, Math.max(0, activeChapter)) }),
  setQuality: (quality) => set({ quality }),
}));
