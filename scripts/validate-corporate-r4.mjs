#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runtimeOnly = process.env.R4_RUNTIME_ONLY === '1';
const manifestPath = path.join(root, 'public/models/r4/manifest.json');
const scenesPath = path.join(root, 'experience/config/scenes.ts');
const sceneAssetPath = path.join(root, 'components/experience/SceneAsset.tsx');
const generatorPath = path.join(root, 'scripts/generate-r4-assets.py');
const skyPath = path.join(root, 'components/experience/CinematicSky.tsx');
const boardsDir = path.join(root, 'docs/corporate/r4-art-direction');

const required = [manifestPath, scenesPath, sceneAssetPath, generatorPath, skyPath];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`R4.1 missing required file: ${path.relative(root, file)}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.stage !== '6-r4.1-cinematic-model-polish') throw new Error(`Unexpected R4.1 manifest stage: ${manifest.stage}`);
if (!Array.isArray(manifest.assets) || manifest.assets.length !== 6) throw new Error('R4.1 manifest must contain exactly six assets.');

const names = ['hero-campus','manufacturing','power-generation','data-centers','recycling','closing-platform'];
let totalTris = 0;
let totalBytes = 0;
for (const name of names) {
  const item = manifest.assets.find((x) => x.file === `${name}.glb`);
  if (!item) throw new Error(`R4.1 manifest missing ${name}.glb`);
  const glb = path.join(root, 'public/models/r4', item.file);
  const fallback = path.join(root, 'public/fallback/r4', `${name}.svg`);
  if (!fs.existsSync(glb)) throw new Error(`Missing R4.1 GLB: ${glb}`);
  if (!fs.existsSync(fallback)) throw new Error(`Missing R4.1 fallback: ${fallback}`);
  const actualBytes = fs.statSync(glb).size;
  if (actualBytes !== item.bytes) throw new Error(`${name} manifest byte count ${item.bytes} does not match file ${actualBytes}`);
  const actualSha = crypto.createHash('sha256').update(fs.readFileSync(glb)).digest('hex');
  if (actualSha !== item.sha256) throw new Error(`${name} manifest SHA-256 does not match runtime GLB.`);
  if (item.bytes < 1_500_000 || item.bytes > 8 * 1024 * 1024) throw new Error(`${name} GLB byte budget out of range: ${item.bytes}`);
  if (item.triangles < 12_000 || item.triangles > 180_000) throw new Error(`${name} triangle budget out of range: ${item.triangles}`);
  if (item.meshGroups < 18 || item.meshGroups > 24) throw new Error(`${name} mesh-group budget out of range: ${item.meshGroups}`);
  if (!Array.isArray(item.materials) || item.materials.length < 18) throw new Error(`${name} has insufficient authored material variety.`);
  totalTris += item.triangles;
  totalBytes += actualBytes;
}

const scenes = fs.readFileSync(scenesPath, 'utf8');
if (!scenes.includes('requestedAssetSet === "stage3" ? "stage3" : "r4"')) throw new Error('R4.1 is not the default runtime asset set.');
if (!scenes.includes('fallbackBase = assetSet === "r4" ? "/fallback/r4"')) throw new Error('R4.1 fallback routing missing.');
for (const x of ['[11.0, 6.7, 15.8]','[8.2, 4.55, 10.8]','[6.2, 6.25, 14.8]','[3.2, 4.75, 11.7]','[1.0, 4.4, 11.5]','[-1.0, 7.1, 17.8]']) {
  if (!scenes.includes(x)) throw new Error(`R4.1 camera anchor missing: ${x}`);
}

const sceneAsset = fs.readFileSync(sceneAssetPath, 'utf8');
for (const token of [
  'material.name === "Facade"',
  'material.name === "VisionGlass"',
  'material.name === "Aluminum"',
  'material.name === "Shadow"',
  'material.name === "WarmGlow"',
  'material.name === "CoolGlow"',
  'binding.stableDepthWrite && fade > 0.965',
]) {
  if (!sceneAsset.includes(token)) throw new Error(`R4.1 material/depth hardening missing: ${token}`);
}

const canvas = fs.readFileSync(path.join(root, 'components/experience/ExperienceCanvas.tsx'), 'utf8');
if (!canvas.includes('THREE.PCFSoftShadowMap')) throw new Error('R4.1 high-tier soft-shadow renderer hardening missing.');

const sky = fs.readFileSync(skyPath, 'utf8');
for (const token of ['sphereGeometry args={[1, 32, 16]}','uSunStrength','depthWrite={false}']) {
  if (!sky.includes(token)) throw new Error(`R4.1 atmospheric sky contract missing: ${token}`);
}

if (!runtimeOnly) {
  const boardFiles = [
    '01-integrated-platform.png','02-solar-manufacturing.png','03-power-generation.png',
    '04-data-centers.png','05-recycling.png','06-connected-ecosystem.png'
  ];
  for (const board of boardFiles) {
    const full = path.join(boardsDir, board);
    if (!fs.existsSync(full) || fs.statSync(full).size < 100_000) throw new Error(`R4.1 art-direction board missing/invalid: ${board}`);
  }
} else {
  console.log('R4.1 runtime-only validation: documentation art-direction boards intentionally excluded from deployment gate.');
}

console.log(`Corporate R4.1 visual-fidelity PASS: 6 GLBs, ${totalTris.toLocaleString()} triangles, ${(totalBytes/1024/1024).toFixed(2)} MiB.`);
