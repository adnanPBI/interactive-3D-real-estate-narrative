import type { R6HeroId } from "./r6Assets";

export type Vec3Tuple = readonly [number, number, number];

export type SteamEmitterProfile = {
  position: Vec3Tuple;
  spread: readonly [number, number];
  rise: number;
  opacity: number;
  tint: string;
};

export type FlowSurfaceProfile = {
  position: Vec3Tuple;
  rotationY: number;
  size: readonly [number, number];
  opacity: number;
  tint: string;
  speed: number;
};

export type RunnerTrailProfile = {
  x: number;
  y: number;
  z: number;
  length: number;
  speed: number;
  laneOffset: number;
  opacity: number;
};

export type R612HeroMotionProfile = {
  wind: number;
  cameraDrift: readonly [number, number, number];
  cameraLookDrift: readonly [number, number];
  sunOrbit: readonly [number, number, number];
  sunPulse: number;
  steam: readonly SteamEmitterProfile[];
  water: readonly FlowSurfaceProfile[];
  runner: RunnerTrailProfile | null;
};

/**
 * R6.1.2 motion art direction.
 * Motion is intentionally slow and industrial rather than arcade-like.  The
 * positional fields remain as compatibility metadata; runtime placement is
 * resolved against the loaded hero bounds in R6AmbientMotion.
 */
export const r612HeroMotion: Record<R6HeroId, R612HeroMotionProfile> = {
  "integrated-campus": {
    wind: 0.62,
    cameraDrift: [0.028, 0.014, 0.018],
    cameraLookDrift: [0.010, 0.007],
    sunOrbit: [0.12, 0.04, 0.08],
    sunPulse: 0.012,
    steam: [], water: [],
    runner: { x: 0, y: 0, z: 0, length: 1, speed: 0.26, laneOffset: 0.30, opacity: 1 },
  },
  "manufacturing-line": {
    wind: 0.28,
    cameraDrift: [0.022, 0.012, 0.016],
    cameraLookDrift: [0.008, 0.006],
    sunOrbit: [0.09, 0.03, 0.065],
    sunPulse: 0.010,
    steam: [{ position: [0, 0, 0], spread: [0.42, 0.30], rise: 1.65, opacity: 0.12, tint: "#d8d9d6" }],
    water: [],
    runner: { x: 0, y: 0, z: 0, length: 1, speed: 0.22, laneOffset: 0.28, opacity: 1 },
  },
  "substation-bess": {
    wind: 0.88,
    cameraDrift: [0.030, 0.016, 0.021],
    cameraLookDrift: [0.011, 0.007],
    sunOrbit: [0.14, 0.045, 0.10],
    sunPulse: 0.014,
    steam: [], water: [],
    runner: { x: 0, y: 0, z: 0, length: 1, speed: 0.28, laneOffset: 0.30, opacity: 1 },
  },
  "data-center-cooling": {
    wind: 0.48,
    cameraDrift: [0.020, 0.010, 0.014],
    cameraLookDrift: [0.007, 0.005],
    sunOrbit: [0.08, 0.026, 0.055],
    sunPulse: 0.009,
    steam: [
      { position: [0, 0, 0], spread: [0.34, 0.26], rise: 1.85, opacity: 0.14, tint: "#dde2df" },
      { position: [0, 0, 0], spread: [0.32, 0.25], rise: 1.70, opacity: 0.12, tint: "#dde2df" },
    ],
    water: [],
    runner: { x: 0, y: 0, z: 0, length: 1, speed: 0.20, laneOffset: 0.27, opacity: 1 },
  },
  "recycling-intake": {
    wind: 0.58,
    cameraDrift: [0.024, 0.013, 0.017],
    cameraLookDrift: [0.009, 0.006],
    sunOrbit: [0.10, 0.032, 0.07],
    sunPulse: 0.011,
    steam: [{ position: [0, 0, 0], spread: [0.48, 0.32], rise: 1.35, opacity: 0.10, tint: "#c8c3ba" }],
    water: [],
    runner: { x: 0, y: 0, z: 0, length: 1, speed: 0.24, laneOffset: 0.28, opacity: 1 },
  },
  "connected-campus": {
    wind: 0.64,
    cameraDrift: [0.027, 0.014, 0.019],
    cameraLookDrift: [0.010, 0.006],
    sunOrbit: [0.12, 0.038, 0.085],
    sunPulse: 0.012,
    steam: [], water: [],
    runner: { x: 0, y: 0, z: 0, length: 1, speed: 0.25, laneOffset: 0.29, opacity: 1 },
  },
};
