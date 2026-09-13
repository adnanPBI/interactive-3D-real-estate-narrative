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
 * Runtime-only motion art direction for R6.1.2.
 *
 * These values never modify, regenerate, retopologize, re-export or replace an
 * authored GLB/KTX2/fallback asset. They only drive React Three Fiber transforms,
 * lightweight procedural effects and the existing cinematic lights/camera.
 */
export const r612HeroMotion: Record<R6HeroId, R612HeroMotionProfile> = {
  "integrated-campus": {
    wind: 0.82,
    cameraDrift: [0.10, 0.055, 0.075],
    cameraLookDrift: [0.035, 0.022],
    sunOrbit: [0.34, 0.10, 0.24],
    sunPulse: 0.028,
    steam: [],
    water: [],
    runner: { x: 5.2, y: 0.045, z: -1.5, length: 14, speed: 0.78, laneOffset: 0.36, opacity: 0.18 },
  },
  "manufacturing-line": {
    wind: 0.38,
    cameraDrift: [0.075, 0.035, 0.055],
    cameraLookDrift: [0.024, 0.018],
    sunOrbit: [0.24, 0.075, 0.18],
    sunPulse: 0.022,
    steam: [
      { position: [3.6, 2.0, -2.15], spread: [0.55, 0.42], rise: 2.2, opacity: 0.16, tint: "#e8e3da" },
    ],
    water: [],
    runner: { x: 5.5, y: 0.045, z: -1.3, length: 13, speed: 0.58, laneOffset: 0.34, opacity: 0.15 },
  },
  "substation-bess": {
    wind: 1.25,
    cameraDrift: [0.12, 0.07, 0.09],
    cameraLookDrift: [0.036, 0.024],
    sunOrbit: [0.42, 0.12, 0.31],
    sunPulse: 0.035,
    steam: [],
    water: [],
    runner: { x: 5.7, y: 0.045, z: -1.8, length: 16, speed: 0.88, laneOffset: 0.38, opacity: 0.16 },
  },
  "data-center-cooling": {
    wind: 0.72,
    cameraDrift: [0.065, 0.035, 0.052],
    cameraLookDrift: [0.020, 0.016],
    sunOrbit: [0.20, 0.065, 0.15],
    sunPulse: 0.018,
    steam: [
      { position: [-2.65, 2.0, -2.0], spread: [0.45, 0.36], rise: 2.65, opacity: 0.22, tint: "#e7eceb" },
      { position: [-1.35, 2.05, -2.0], spread: [0.42, 0.34], rise: 2.45, opacity: 0.19, tint: "#e7eceb" },
    ],
    water: [
      { position: [-1.85, 0.075, -2.85], rotationY: 0.02, size: [4.8, 1.55], opacity: 0.28, tint: "#6d9dad", speed: 0.42 },
    ],
    runner: { x: 5.2, y: 0.045, z: -1.6, length: 13, speed: 0.48, laneOffset: 0.34, opacity: 0.12 },
  },
  "recycling-intake": {
    wind: 0.92,
    cameraDrift: [0.085, 0.048, 0.066],
    cameraLookDrift: [0.030, 0.020],
    sunOrbit: [0.30, 0.085, 0.22],
    sunPulse: 0.028,
    steam: [
      { position: [-2.9, 1.35, 0.55], spread: [0.72, 0.48], rise: 1.65, opacity: 0.14, tint: "#c8c2b7" },
    ],
    water: [
      { position: [-1.95, 0.065, 2.65], rotationY: -0.04, size: [3.9, 1.15], opacity: 0.18, tint: "#82999a", speed: 0.34 },
    ],
    runner: { x: 5.0, y: 0.045, z: -1.25, length: 13, speed: 0.72, laneOffset: 0.35, opacity: 0.14 },
  },
  "connected-campus": {
    wind: 0.98,
    cameraDrift: [0.11, 0.065, 0.082],
    cameraLookDrift: [0.034, 0.023],
    sunOrbit: [0.38, 0.11, 0.28],
    sunPulse: 0.032,
    steam: [],
    water: [],
    runner: { x: 5.35, y: 0.045, z: -1.55, length: 15, speed: 0.82, laneOffset: 0.37, opacity: 0.18 },
  },
};
