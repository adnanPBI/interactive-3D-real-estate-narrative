export type ProceduralWeather = "clear" | "haze" | "dusk";
export type ProceduralRunnerMode = "off" | "ambient" | "cinematic";

export type ProceduralPalette = {
  ground: string;
  road: string;
  structure: string;
  service: string;
  solar: string;
  accent: string;
};

export type ProceduralChapterProfile = {
  id: "hero" | "manufacturing" | "generation" | "data-centers" | "recycling" | "close";
  segmentLength: number;
  lateralSpread: number;
  density: number;
  speed: number;
  wind: number;
  traffic: number;
  timeOfDay: number;
  weather: ProceduralWeather;
  structureProbability: number;
  solarProbability: number;
  turbineProbability: number;
  beaconProbability: number;
  palette: ProceduralPalette;
};

export type ProceduralRuntimeConfig = {
  enabled: boolean;
  seed: string;
  runnerMode: ProceduralRunnerMode;
  speed: number;
  density: number;
  wind: number;
  traffic: number;
  timeOfDay: number | null;
  weather: ProceduralWeather | "profile";
};

export const proceduralDefaults: ProceduralRuntimeConfig = {
  enabled: true,
  seed: "convalt-r612-procedural",
  runnerMode: "ambient",
  speed: 1,
  density: 1,
  wind: 1,
  traffic: 1,
  timeOfDay: null,
  weather: "profile",
};

export const proceduralChapterProfiles: readonly ProceduralChapterProfile[] = [
  {
    id: "hero",
    segmentLength: 14,
    lateralSpread: 10.5,
    density: 0.9,
    speed: 1.15,
    wind: 0.7,
    traffic: 0.55,
    timeOfDay: 16.2,
    weather: "clear",
    structureProbability: 0.72,
    solarProbability: 0.66,
    turbineProbability: 0.18,
    beaconProbability: 0.62,
    palette: { ground: "#d7d2c7", road: "#676b67", structure: "#c9c4ba", service: "#8f948f", solar: "#24384f", accent: "#3d5a80" },
  },
  {
    id: "manufacturing",
    segmentLength: 13,
    lateralSpread: 9.5,
    density: 1.12,
    speed: 1.0,
    wind: 0.45,
    traffic: 0.72,
    timeOfDay: 14.6,
    weather: "clear",
    structureProbability: 0.92,
    solarProbability: 0.36,
    turbineProbability: 0.04,
    beaconProbability: 0.78,
    palette: { ground: "#d7d0c4", road: "#5e615e", structure: "#bbb6ad", service: "#8b8173", solar: "#2b4052", accent: "#b08d57" },
  },
  {
    id: "generation",
    segmentLength: 16,
    lateralSpread: 12,
    density: 1.04,
    speed: 1.3,
    wind: 1.28,
    traffic: 0.38,
    timeOfDay: 17.1,
    weather: "haze",
    structureProbability: 0.44,
    solarProbability: 0.94,
    turbineProbability: 0.72,
    beaconProbability: 0.7,
    palette: { ground: "#d3d2ca", road: "#666a67", structure: "#b8bdb9", service: "#8b938e", solar: "#203b55", accent: "#3d5a80" },
  },
  {
    id: "data-centers",
    segmentLength: 14,
    lateralSpread: 10,
    density: 1.16,
    speed: 0.92,
    wind: 0.68,
    traffic: 0.52,
    timeOfDay: 18.0,
    weather: "haze",
    structureProbability: 0.96,
    solarProbability: 0.32,
    turbineProbability: 0.02,
    beaconProbability: 0.92,
    palette: { ground: "#d4d6d3", road: "#5b605f", structure: "#b5bbb9", service: "#7c8584", solar: "#263f53", accent: "#3d5a80" },
  },
  {
    id: "recycling",
    segmentLength: 13,
    lateralSpread: 9.5,
    density: 1.0,
    speed: 1.08,
    wind: 0.82,
    traffic: 0.84,
    timeOfDay: 15.4,
    weather: "clear",
    structureProbability: 0.78,
    solarProbability: 0.18,
    turbineProbability: 0.03,
    beaconProbability: 0.58,
    palette: { ground: "#d8d0c4", road: "#66615b", structure: "#b7afa4", service: "#867d70", solar: "#2d4050", accent: "#b08d57" },
  },
  {
    id: "close",
    segmentLength: 16,
    lateralSpread: 11.5,
    density: 1.0,
    speed: 1.18,
    wind: 0.92,
    traffic: 0.52,
    timeOfDay: 17.7,
    weather: "dusk",
    structureProbability: 0.7,
    solarProbability: 0.72,
    turbineProbability: 0.38,
    beaconProbability: 0.95,
    palette: { ground: "#d6d1c7", road: "#606562", structure: "#bfc1bb", service: "#848c87", solar: "#223b52", accent: "#3d5a80" },
  },
] as const;
