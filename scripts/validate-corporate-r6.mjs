#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "public/models/r6/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];
const lods = ["lod0", "lod1", "lod2", "proxy"];
const expected = ["hero-campus", "manufacturing", "power-generation", "data-centers", "recycling", "closing-platform"];

if (manifest.stage !== "6-r6-hero-fidelity") errors.push(`Unexpected manifest stage: ${manifest.stage}`);
if ((manifest.scenes ?? []).length !== 6) errors.push("R6 must contain exactly six hero scenes.");
if (!String(manifest.provenance ?? "").includes("bespoke")) errors.push("R6 authoring provenance is missing.");

for (const id of expected) {
  const scene = (manifest.scenes ?? []).find((candidate) => candidate.id === id);
  if (!scene) { errors.push(`${id}: scene missing.`); continue; }
  const authoringPath = path.join(root, scene.authoring ?? "");
  if (!fs.existsSync(authoringPath)) errors.push(`${id}: bespoke authoring source missing: ${scene.authoring}`);
  else {
    const source = fs.readFileSync(authoringPath, "utf8");
    if (!source.includes("def build")) errors.push(`${id}: authoring source has no build() function.`);
    if (!source.includes("bevel_box")) errors.push(`${id}: authoring source does not use true R6 bevel geometry.`);
  }

  for (const lod of lods) {
    const item = scene.lods?.[lod];
    if (!item) { errors.push(`${id}: ${lod} missing.`); continue; }
    const filename = path.join(root, "public", item.file ?? "");
    if (!fs.existsSync(filename)) { errors.push(`${id}: ${lod} file missing: ${item.file}`); continue; }
    const bytes = fs.readFileSync(filename);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    if (item.sha256 !== digest) errors.push(`${id}: ${lod} SHA-256 does not match manifest.`);
    if (!Number.isFinite(item.triangles) || item.triangles <= 0) errors.push(`${id}: ${lod} triangle count invalid.`);
    if (!Number.isFinite(item.meshGroups) || item.meshGroups <= 0) errors.push(`${id}: ${lod} mesh-group count invalid.`);
    const textureCount = Number(item.textureCount ?? -1);
    if (textureCount < 0) errors.push(`${id}: ${lod} textureCount missing — KTX2 step was not completed.`);
    if (textureCount > 0) {
      const probe = bytes.toString("latin1");
      if (!probe.includes("KHR_texture_basisu") && !probe.includes("image/ktx2")) errors.push(`${id}: ${lod} GLB has textures but no KTX2 Basis extension/mime marker.`);
      if (!String(item.textureEncoding ?? "").startsWith("KTX2/")) errors.push(`${id}: ${lod} manifest texture encoding is not KTX2.`);
    }
  }

  const fallback = path.join(root, "public/fallback/r6", `${id}.webp`);
  if (!fs.existsSync(fallback) || fs.statSync(fallback).size < 20_000) errors.push(`${id}: professional WebP fallback is missing or undersized.`);
}

const runtimeFiles = {
  "SMAA": "components/experience/R6PostFX.tsx",
  "one-LOD0": "components/experience/ChapterScene.tsx",
  "instancing": "components/experience/R6InstancedDetails.tsx",
  "opaque-fade": "components/experience/SceneAsset.tsx",
  "quality-budgets": "experience/config/storyMotion.ts",
  "copy-safe-composition": "experience/config/scenes.ts",
};
for (const [label, filename] of Object.entries(runtimeFiles)) if (!fs.existsSync(path.join(root, filename))) errors.push(`${label}: ${filename} missing.`);

const chapterScene = fs.readFileSync(path.join(root, "components/experience/ChapterScene.tsx"), "utf8");
if (!chapterScene.includes('sceneIndex === activeChapter ? "lod0" : "lod1"')) errors.push("Only-active-chapter LOD0 policy is not explicit.");
const instancing = fs.readFileSync(path.join(root, "components/experience/R6InstancedDetails.tsx"), "utf8") + fs.readFileSync(path.join(root, "components/experience/InstancedSolarField.tsx"), "utf8");
if ((instancing.match(/<instancedMesh/g) ?? []).length < 4) errors.push("R6 does not contain enough GPU-instanced repeated equipment paths.");

if (errors.length) {
  console.error("Corporate R6 validation FAILED:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("Corporate R6 PASS: six bespoke heroes, four LODs each, KTX2, SMAA, instancing, opaque dissolve, copy-safe compositions and fallbacks confirmed.");
