import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("data-center structural equipment remains authored, not bounds-derived runtime geometry", async () => {
  const motion = await read("components/experience/R6AmbientMotion.tsx");
  const authored = await read("assets-source/r6/authoring/hero_datacenter.py");

  assert.doesNotMatch(motion, /function DataCenterOperations/);
  assert.doesNotMatch(motion, /function CoolingFan/);
  assert.doesNotMatch(motion, /data-center-live-cooling/);
  assert.doesNotMatch(motion, /hero === "data-center-cooling" \? <DataCenterOperations/);

  assert.match(motion, /DATA_CENTER_STEAM_ORIGIN/);
  assert.match(motion, /\[1\.0, 3\.34, -0\.85\]/);
  assert.match(motion, /hero === "data-center-cooling"[\s\S]*DATA_CENTER_STEAM_ORIGIN/);

  // The structural source already owns the rooftop deck, rails and seated units.
  assert.match(authored, /b\.box\(\(6\.2,\.07,\.75\),\(1\.0,3\.18,-\.85\),"Graphite"\)/);
  assert.match(authored, /safety_rail\(b,\(-1\.95,3\.18,-1\.18\),\(3\.95,3\.18,-1\.18\)/);
  assert.match(authored, /r4\.rooftop_unit\(b,\(x,3\.18,-\.85\),\.34\)/);
});

test("data-center atmosphere remains non-structural runtime motion", async () => {
  const motion = await read("components/experience/R6AmbientMotion.tsx");
  assert.match(motion, /function RoofSteam/);
  assert.match(motion, /hero === "data-center-cooling" \|\| hero === "manufacturing-line"/);
  assert.match(motion, /<points/);
  assert.match(motion, /<pointsMaterial/);
});
