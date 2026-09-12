#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/models/r6/manifest.json"), "utf8"));
const sceneAsset = fs.readFileSync(path.join(root, "components/experience/SceneAsset.tsx"), "utf8");
const postFx = fs.readFileSync(path.join(root, "components/experience/R6PostFX.tsx"), "utf8");
const errors = [];

if (!sceneAsset.includes("standard.alphaHash = true")) errors.push("Solid-scene dither path (alphaHash) is missing.");
if (!sceneAsset.includes("standard.transparent = false")) errors.push("Opaque solid material path is missing.");
if (!sceneAsset.includes("transparentAuthored")) errors.push("Authored-glass transparency allowlist is missing.");
if (!postFx.includes("SMAAPass")) errors.push("SMAA output pass is missing.");
if (!postFx.includes("composerSamples")) errors.push("Multisampled high-tier composer is missing.");

for (const scene of manifest.scenes ?? []) {
  const lod0 = scene.lods?.lod0;
  if (!lod0) { errors.push(`${scene.id}: LOD0 missing.`); continue; }
  if (!Array.isArray(lod0.materials) || lod0.materials.length < 6) errors.push(`${scene.id}: LOD0 material separation is too weak.`);
  const encoding = String(lod0.textureEncoding ?? "");
  const textureCount = Number(lod0.textureCount ?? -1);
  if (textureCount < 0) errors.push(`${scene.id}: textureCount missing; KTX2 authoring step did not run.`);
  if (textureCount > 0 && !encoding.startsWith("KTX2/")) errors.push(`${scene.id}: LOD0 hero textures are not KTX2 (${encoding}).`);
}

if (errors.length) {
  console.error("R6 material/AA validation FAILED:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("R6 material/AA PASS: opaque alpha-hash transitions + SMAA + KTX2 hero texture policy confirmed.");
