import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const quality = fs.readFileSync("components/experience/useQualityTier.ts", "utf8");
const home = fs.readFileSync("components/experience/HomeExperience.tsx", "utf8");
const fallback = fs.readFileSync("components/experience/StaticSceneFallback.tsx", "utf8");
const acceptance = fs.readFileSync("scripts/acceptance_qa.py", "utf8");

test("R6 starts in static fallback until the client WebGL probe upgrades quality", () => {
  assert.match(quality, /useState<Quality>\("fallback"\)/);
  assert.match(quality, /if \(!webgl\) return "fallback"/);
  assert.ok(quality.indexOf('if (!webgl) return "fallback"') < quality.indexOf('if (forced === "high"'), "WebGL safety must precede the quality override");
  assert.match(home, /quality === "fallback" \|\| runtimeFallback \? \(/);
  assert.match(home, /<StaticSceneFallback activeChapter=\{activeChapter\}/);
  assert.match(home, /<ExperienceCanvas quality=\{quality\}/);
});

test("R6 static fallback exposes deterministic six-scene QA instrumentation", () => {
  assert.match(fallback, /data-r6-static-fallback="true"/); assert.match(fallback, /data-r6-fallback-scene=\{scene\.id\}/); assert.match(fallback, /data-r6-fallback-src=\{scene\.fallback\}/);
});

test("Playwright acceptance includes a forced WebGL-unavailable runtime proof", () => {
  assert.match(acceptance, /__R6_WEBGL_PROBE_ATTEMPTS__/); assert.match(acceptance, /webgl-fallback-proof-only/); assert.match(acceptance, /experienceCanvasCount/); assert.match(acceptance, /immersiveCanvasCount/); assert.match(acceptance, /forcedQualityOverride/);
  for (const id of ["hero", "manufacturing", "generation", "data-centers", "recycling", "close"]) assert.ok(acceptance.includes(`"${id}"`), id);
});

test("R6.1 preserves authored maps and uses bounded transition-aware rendering", () => {
  const heroAsset = fs.readFileSync("components/experience/HeroAsset.tsx", "utf8"); const canvas = fs.readFileSync("components/experience/ExperienceCanvas.tsx", "utf8"); const camera = fs.readFileSync("components/experience/CinematicCameraRig.tsx", "utf8"); const environment = fs.readFileSync("components/experience/EnvironmentProbe.tsx", "utf8"); const post = fs.readFileSync("components/experience/R6PostFX.tsx", "utf8");
  assert.match(heroAsset, /if \(!material\.map\)/); assert.match(heroAsset, /if \(!material\.normalMap\)/); assert.match(heroAsset, /if \(!material\.aoMap\)/); assert.match(canvas, /PCFShadowMap/); assert.match(canvas, /shadowMap\.autoUpdate = false/); assert.match(camera, /SHADOW_POSITION_EPSILON = 0\.004/); assert.match(camera, /previousShadowSun = useRef<THREE\.Vector3 \| null>\(null\)/); assert.match(camera, /shadowMap\.needsUpdate = true/); assert.doesNotMatch(camera, /SHADOW_INTENSITY_EPSILON|previousSunIntensity/); assert.match(heroAsset, /\[assetUrl, authored, renderer\]/); assert.doesNotMatch(environment, /RoomEnvironment/); assert.match(environment, /sceneDefinitions/); assert.match(environment, /targets\.forEach\(\(target\) => target\.dispose\(\)\)/); assert.match(post, /SceneTelemetryPass/); assert.match(post, /gl\.info\.autoReset = false/);
});
