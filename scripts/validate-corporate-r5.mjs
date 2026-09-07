#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "public/models/r5/manifest.json");
const scenesPath = path.join(root, "experience/config/scenes.ts");
const canvasPath = path.join(root, "components/experience/ExperienceCanvas.tsx");
const sceneAssetPath = path.join(root, "components/experience/SceneAsset.tsx");
const instancedSolarPath = path.join(root, "components/experience/InstancedSolarField.tsx");
const preloaderPath = path.join(root, "components/experience/AssetPreloader.tsx");
const generatorPath = path.join(root, "scripts/generate-r5-hybrid-assets.py");
const storyMotionPath = path.join(root, "experience/config/storyMotion.ts");

for (const file of [manifestPath, scenesPath, canvasPath, sceneAssetPath, instancedSolarPath, preloaderPath, generatorPath, storyMotionPath]) {
  if (!fs.existsSync(file)) throw new Error(`R5 missing required file: ${path.relative(root, file)}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.stage !== "6-r5-hybrid-cinematic") throw new Error(`Unexpected R5 stage: ${manifest.stage}`);
const names = ["hero-campus", "manufacturing", "power-generation", "data-centers", "recycling", "closing-platform"];
const summary = {};

for (const tier of ["medium", "high"]) {
  const assets = manifest.tiers?.[tier];
  if (!Array.isArray(assets) || assets.length !== names.length) throw new Error(`R5 ${tier} tier must contain six assets.`);
  const budget = manifest.budgets?.[tier];
  if (!budget) throw new Error(`R5 ${tier} budget missing.`);
  let triangles = 0;
  let bytes = 0;
  for (const name of names) {
    const item = assets.find((x) => x.file === `${name}.glb`);
    if (!item) throw new Error(`R5 ${tier} missing ${name}.glb`);
    const file = path.join(root, "public/models/r5", tier, item.file);
    if (!fs.existsSync(file)) throw new Error(`Missing R5 ${tier} GLB: ${file}`);
    const actualBytes = fs.statSync(file).size;
    if (actualBytes !== item.bytes) throw new Error(`${tier}/${name}: manifest bytes ${item.bytes} != actual ${actualBytes}`);
    if (item.triangles < 15_000 || item.triangles > budget.maxTrianglesPerScene) throw new Error(`${tier}/${name}: triangle budget invalid: ${item.triangles}`);
    if (item.meshGroups < 18 || item.meshGroups > budget.maxMeshGroups) throw new Error(`${tier}/${name}: mesh-group budget invalid: ${item.meshGroups}`);
    if (actualBytes > budget.maxGlbBytesPerScene) throw new Error(`${tier}/${name}: GLB exceeds byte budget: ${actualBytes}`);
    if (!Array.isArray(item.materials) || item.materials.length < 14) throw new Error(`${tier}/${name}: insufficient material variety.`);
    triangles += item.triangles;
    bytes += actualBytes;
  }
  summary[tier] = { triangles, bytes };
}

for (const name of names) {
  const medium = manifest.tiers.medium.find((x) => x.file === `${name}.glb`);
  const high = manifest.tiers.high.find((x) => x.file === `${name}.glb`);
  if (high.triangles < medium.triangles) throw new Error(`${name}: high tier must not be less detailed than medium.`);
}

const scenes = fs.readFileSync(scenesPath, "utf8");
for (const token of [
  ': "r5";',
  'assetSet === "r5" ? "/models/r5/high"',
  'assetSet === "r5" ? "/fallback/r5"',
  'return `/models/r5/${quality}/${definition.assetName}.glb`',
]) {
  if (!scenes.includes(token)) throw new Error(`R5 scene routing missing: ${token}`);
}

const canvas = fs.readFileSync(canvasPath, "utf8");
for (const token of ['antialias: true', 'precision: "highp"', 'gl.shadowMap.enabled = true']) {
  if (!canvas.includes(token)) throw new Error(`R5 renderer hardening missing: ${token}`);
}

const sceneAsset = fs.readFileSync(sceneAssetPath, "utf8");
for (const token of ["sceneAssetForQuality", "getMaxAnisotropy", "mediumCaster", "InstancedSolarField"]) {
  if (!sceneAsset.includes(token)) throw new Error(`R5 runtime material/detail hardening missing: ${token}`);
}

const instanced = fs.readFileSync(instancedSolarPath, "utf8");
for (const token of ["useLayoutEffect", "setMatrixAt", "InstancedMesh", "Two draw calls"]) {
  if (!instanced.includes(token)) throw new Error(`R5 instancing contract missing: ${token}`);
}

const preloader = fs.readFileSync(preloaderPath, "utf8");
if (!preloader.includes("sceneAssetForQuality") || !preloader.includes("quality")) throw new Error("R5 quality-aware preloader missing.");

const generator = fs.readFileSync(generatorPath, "utf8");
for (const token of ["6-r5-hybrid-cinematic", 'r4.SPECS["Ground"]', "ao=False", "fan_bank", "roller_bed", "insulator_bank"]) {
  if (!generator.includes(token)) throw new Error(`R5 authored-detail generator missing: ${token}`);
}

const motion = fs.readFileSync(storyMotionPath, "utf8");
if (!motion.includes("maxDpr: 1.75") || !motion.includes("maxDpr: 1.35")) throw new Error("R5 adaptive DPR caps missing.");

console.log(
  `Corporate R5 hybrid PASS: medium ${summary.medium.triangles.toLocaleString()} tris / ${(summary.medium.bytes / 1024 / 1024).toFixed(2)} MiB; ` +
  `high ${summary.high.triangles.toLocaleString()} tris / ${(summary.high.bytes / 1024 / 1024).toFixed(2)} MiB.`,
);
