#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/models/r6/manifest.json"), "utf8"));
const errors = [];
const scenes = manifest.scenes ?? [];

if (manifest.budgets?.high?.activeTriangles !== 220000) errors.push("High active-triangle budget must be 220,000.");
if (manifest.budgets?.high?.drawCalls !== 120) errors.push("High draw-call budget must be 120.");
if (manifest.budgets?.high?.textureMemoryMB !== 180) errors.push("High texture-memory budget must be 180 MB.");
if (manifest.budgets?.high?.maxLod0Heroes !== 1) errors.push("High tier must permit exactly one LOD0 hero.");
if (manifest.budgets?.medium?.activeTriangles !== 120000) errors.push("Medium active-triangle budget must be 120,000.");
if (manifest.budgets?.medium?.drawCalls !== 80) errors.push("Medium draw-call budget must be 80.");
if (manifest.budgets?.medium?.textureMemoryMB !== 100) errors.push("Medium texture-memory budget must be 100 MB.");
if (manifest.budgets?.medium?.maxLod0Heroes !== 0) errors.push("Medium tier must not activate LOD0.");

const max = (lod, key) => Math.max(...scenes.map((scene) => Number(scene.lods?.[lod]?.[key] ?? 0)));
// Conservative extra budget for the shared ground, sky, and instanced details.
const sharedTriangles = 18_000;
const sharedCalls = 16;
const highWorstTriangles = max("lod0", "triangles") + max("lod1", "triangles") + sharedTriangles;
const mediumWorstTriangles = max("lod1", "triangles") + max("lod2", "triangles") + sharedTriangles;
const highWorstCalls = max("lod0", "meshGroups") + max("lod1", "meshGroups") + sharedCalls;
const mediumWorstCalls = max("lod1", "meshGroups") + max("lod2", "meshGroups") + sharedCalls;

if (highWorstTriangles > 220000) errors.push(`High worst-case triangles ${highWorstTriangles.toLocaleString()} exceed 220,000.`);
if (mediumWorstTriangles > 120000) errors.push(`Medium worst-case triangles ${mediumWorstTriangles.toLocaleString()} exceed 120,000.`);
if (highWorstCalls > 120) errors.push(`High worst-case calls ${highWorstCalls} exceed 120.`);
if (mediumWorstCalls > 80) errors.push(`Medium worst-case calls ${mediumWorstCalls} exceed 80.`);

for (const scene of scenes) {
  if ((scene.lods?.lod0?.triangles ?? Infinity) > 100000) errors.push(`${scene.id} LOD0 exceeds 100k authoring guardrail.`);
  if ((scene.lods?.lod1?.triangles ?? Infinity) > 65000) errors.push(`${scene.id} LOD1 exceeds 65k authoring guardrail.`);
  if ((scene.lods?.lod2?.triangles ?? Infinity) > 20000) errors.push(`${scene.id} LOD2 exceeds 20k authoring guardrail.`);
}

if (errors.length) {
  console.error("R6 budget validation FAILED:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log(`R6 budgets PASS: high worst ${highWorstTriangles.toLocaleString()} tris / ${highWorstCalls} calls; medium worst ${mediumWorstTriangles.toLocaleString()} tris / ${mediumWorstCalls} calls.`);
