import {
  proceduralDefaults,
  type ProceduralChapterProfile,
  type ProceduralRuntimeConfig,
  type ProceduralRunnerMode,
  type ProceduralWeather,
} from "@/experience/config/proceduralWorld";

export type ResolvedProceduralRuntime = {
  enabled: boolean;
  seed: string;
  runnerMode: ProceduralRunnerMode;
  speed: number;
  density: number;
  wind: number;
  traffic: number;
  timeOfDay: number;
  weather: ProceduralWeather;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function hash32(input: string) {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return hash >>> 0;
}

/** Deterministic 0..1 sample suitable for repeatable procedural chunks. */
export function proceduralSample(seed: string, chapter: number, chunk: number, channel: number) {
  let state = hash32(`${seed}:${chapter}:${chunk}:${channel}`) || 0x6d2b79f5;
  state += 0x6d2b79f5;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function finiteNumber(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRunnerMode(value: string | null): ProceduralRunnerMode | undefined {
  if (value === "off" || value === "ambient" || value === "cinematic") return value;
  if (value === "0") return "off";
  if (value === "1") return "ambient";
  return undefined;
}

function parseWeather(value: string | null): ProceduralRuntimeConfig["weather"] | undefined {
  if (value === "profile" || value === "clear" || value === "haze" || value === "dusk") return value;
  return undefined;
}

export function readProceduralSearch(search: string): Partial<ProceduralRuntimeConfig> {
  const params = new URLSearchParams(search);
  const runnerMode = parseRunnerMode(params.get("runner"));
  const weather = parseWeather(params.get("weather"));
  const disabled = params.get("procedural") === "0" || params.get("proc") === "0";
  const enabled = params.get("procedural") === "1" || params.get("proc") === "1" ? true : disabled ? false : undefined;
  const seed = params.get("seed")?.trim();

  const patch: Partial<ProceduralRuntimeConfig> = {};
  if (enabled !== undefined) patch.enabled = enabled;
  if (seed) patch.seed = seed.slice(0, 80);
  if (runnerMode) patch.runnerMode = runnerMode;
  if (weather) patch.weather = weather;
  if (params.has("speed")) patch.speed = clamp(finiteNumber(params.get("speed"), proceduralDefaults.speed), 0, 3);
  if (params.has("density")) patch.density = clamp(finiteNumber(params.get("density"), proceduralDefaults.density), 0.25, 1.6);
  if (params.has("wind")) patch.wind = clamp(finiteNumber(params.get("wind"), proceduralDefaults.wind), 0, 2.5);
  if (params.has("traffic")) patch.traffic = clamp(finiteNumber(params.get("traffic"), proceduralDefaults.traffic), 0, 2.5);
  if (params.has("time")) patch.timeOfDay = clamp(finiteNumber(params.get("time"), 16), 0, 24);
  return patch;
}

export function sanitizeProceduralPatch(patch: Partial<ProceduralRuntimeConfig>): Partial<ProceduralRuntimeConfig> {
  const next: Partial<ProceduralRuntimeConfig> = {};
  if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
  if (typeof patch.seed === "string" && patch.seed.trim()) next.seed = patch.seed.trim().slice(0, 80);
  if (patch.runnerMode === "off" || patch.runnerMode === "ambient" || patch.runnerMode === "cinematic") next.runnerMode = patch.runnerMode;
  if (typeof patch.speed === "number" && Number.isFinite(patch.speed)) next.speed = clamp(patch.speed, 0, 3);
  if (typeof patch.density === "number" && Number.isFinite(patch.density)) next.density = clamp(patch.density, 0.25, 1.6);
  if (typeof patch.wind === "number" && Number.isFinite(patch.wind)) next.wind = clamp(patch.wind, 0, 2.5);
  if (typeof patch.traffic === "number" && Number.isFinite(patch.traffic)) next.traffic = clamp(patch.traffic, 0, 2.5);
  if (patch.timeOfDay === null) next.timeOfDay = null;
  else if (typeof patch.timeOfDay === "number" && Number.isFinite(patch.timeOfDay)) next.timeOfDay = clamp(patch.timeOfDay, 0, 24);
  if (patch.weather === "profile" || patch.weather === "clear" || patch.weather === "haze" || patch.weather === "dusk") next.weather = patch.weather;
  return next;
}

export function resolveProceduralRuntime(
  profile: ProceduralChapterProfile,
  runtime: ProceduralRuntimeConfig,
  quality: "high" | "medium",
  reducedMotion: boolean,
): ResolvedProceduralRuntime {
  const densityQuality = quality === "high" ? 1 : 0.72;
  const runnerFactor = runtime.runnerMode === "cinematic" ? 1.35 : runtime.runnerMode === "ambient" ? 1 : 0;
  return {
    enabled: runtime.enabled,
    seed: runtime.seed,
    runnerMode: runtime.runnerMode,
    speed: reducedMotion ? 0 : profile.speed * runtime.speed * runnerFactor,
    density: clamp(profile.density * runtime.density * densityQuality, 0.2, 1.6),
    wind: reducedMotion ? 0 : clamp(profile.wind * runtime.wind, 0, 2.5),
    traffic: reducedMotion ? 0 : clamp(profile.traffic * runtime.traffic, 0, 2.5),
    timeOfDay: runtime.timeOfDay ?? profile.timeOfDay,
    weather: runtime.weather === "profile" ? profile.weather : runtime.weather,
  };
}
