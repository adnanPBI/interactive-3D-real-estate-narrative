import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authored hero GLB path remains the R6.1.2 source of truth", async () => {
  const hero = await read("components/experience/HeroAsset.tsx");
  assert.match(hero, /const assetUrl = r6HeroUrl\(hero, lod\)/);
  assert.match(hero, /<primitive object=\{instance\}/);
  assert.match(hero, /authored GLB primitive remains byte-for-byte unchanged/);
  assert.match(hero, /<R6HeroAmbientMotion/);
});

test("motion profiles are runtime-only and cover all six existing heroes", async () => {
  const source = await read("experience/config/r612Motion.ts");
  for (const id of ["integrated-campus", "manufacturing-line", "substation-bess", "data-center-cooling", "recycling-intake", "connected-campus"]) {
    assert.match(source, new RegExp(`\\"${id}\\"`));
  }
  assert.match(source, /never modify, regenerate, retopologize, re-export or replace/);
  assert.match(source, /cameraDrift/);
  assert.match(source, /sunOrbit/);
  assert.match(source, /steam/);
  assert.match(source, /water/);
  assert.match(source, /runner/);
});

test("ambient FX use deterministic GPU/instanced motion and no runtime randomness", async () => {
  const source = await read("components/experience/R6AmbientMotion.tsx");
  assert.match(source, /function FlowSurface/);
  assert.match(source, /function SteamEmitter/);
  assert.match(source, /function EndlessServiceTrail/);
  assert.match(source, /uTime/);
  assert.match(source, /<instancedMesh/);
  assert.match(source, /assetPreserved: true/);
  assert.doesNotMatch(source, /Math\.random/);
});

test("existing runtime turbines rotate with bounded shadow refresh and vegetation sways", async () => {
  const source = await read("components/experience/InstancedInfrastructure.tsx");
  assert.match(source, /rotorAngle\.current \+=/);
  assert.match(source, /shadowAccumulator\.current >= 0\.085/);
  assert.match(source, /state\.gl\.shadowMap\.needsUpdate = true/);
  assert.match(source, /const sway = Math\.sin/);
  assert.match(source, /THREE\.DynamicDrawUsage/);
});

test("camera and key light keep authored shots while adding small procedural breathing", async () => {
  const source = await read("components/experience/CinematicCameraRig.tsx");
  assert.match(source, /setSplineVector\(desired/);
  assert.match(source, /r612HeroMotion/);
  assert.match(source, /cameraDrift/);
  assert.match(source, /cameraLookDrift/);
  assert.match(source, /sunOrbit/);
  assert.match(source, /sunPulse/);
  assert.match(source, /document\.documentElement\.dataset\.motion === \"reduced\"/);
});

test("sky sun lobe moves procedurally without adding image assets", async () => {
  const source = await read("components/experience/CinematicSky.tsx");
  assert.match(source, /animatedSunDir/);
  assert.match(source, /uSunDir/);
  assert.match(source, /uSunStrength/);
  assert.match(source, /state\.clock\.elapsedTime/);
});
