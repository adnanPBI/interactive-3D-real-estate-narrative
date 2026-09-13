import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("procedural runtime is deterministic and does not use Math.random", async () => {
  const source = await read("experience/systems/proceduralRuntime.ts");
  assert.match(source, /export function hash32/);
  assert.match(source, /export function proceduralSample/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.match(source, /seed/);
});

test("procedural runtime exposes bounded live parameters", async () => {
  const source = await read("experience/systems/proceduralRuntime.ts");
  for (const token of ["runner", "seed", "speed", "density", "wind", "traffic", "time", "weather"]) {
    assert.match(source, new RegExp(`params\\.(?:get|has)\\(\\\"${token}\\\"\\)`));
  }
  assert.match(source, /clamp\(finiteNumber\(params\.get\("speed"\)/);
  assert.match(source, /clamp\(finiteNumber\(params\.get\("density"\)/);
});

test("all six chapters define distinct procedural profiles", async () => {
  const source = await read("experience/config/proceduralWorld.ts");
  for (const id of ["hero", "manufacturing", "generation", "data-centers", "recycling", "close"]) {
    assert.match(source, new RegExp(`id: \\\"${id}\\\"`));
  }
  assert.match(source, /runnerMode: "ambient"/);
  assert.match(source, /turbineProbability/);
  assert.match(source, /solarProbability/);
});

test("procedural world is additive and preserves authored HeroAsset", async () => {
  const story = await read("components/experience/StoryWorld.tsx");
  assert.match(story, /<ProceduralWorld quality=\{quality\} \/>/);
  assert.match(story, /<HeroAsset/);
  assert.match(story, /authored GLBs remain the premium focal architecture/);
});

test("streaming world uses instancing, independent wrapping, and reduced-motion stop", async () => {
  const world = await read("components/experience/ProceduralWorld.tsx");
  assert.match(world, /<instancedMesh/);
  assert.match(world, /function wrapZ/);
  assert.match(world, /writeMatrix\(structures\.current/);
  assert.match(world, /writeMatrix\(traffic\.current/);
  assert.match(world, /reducedMotion/);
  assert.match(world, /runtime\.runnerMode === "off"/);
  assert.doesNotMatch(world, /Math\.random/);
});

test("moving turbine shadows are explicitly refreshed while animation runs", async () => {
  const world = await read("components/experience/ProceduralWorld.tsx");
  assert.match(world, /state\.gl\.shadowMap\.needsUpdate = true/);
  assert.match(world, /quality === "high"/);
  assert.match(world, /rotor\.current\.rotation\.z/);
});

test("runtime bridge supports query, event and window API controls", async () => {
  const bridge = await read("components/experience/ProceduralRuntimeBridge.tsx");
  assert.match(bridge, /window\.__CONVALT_PROCEDURAL__/);
  assert.match(bridge, /convalt:procedural-update/);
  assert.match(bridge, /readProceduralSearch\(window\.location\.search\)/);
});

test("time and weather tune existing cinematic lighting instead of replacing it", async () => {
  const rig = await read("components/experience/CinematicCameraRig.tsx");
  assert.match(rig, /resolveProceduralRuntime/);
  assert.match(rig, /daylightForHour/);
  assert.match(rig, /weatherLight/);
  assert.match(rig, /proceduralKey/);
  assert.match(rig, /fogScale/);
  assert.match(rig, /sceneDefinitions/);
});
