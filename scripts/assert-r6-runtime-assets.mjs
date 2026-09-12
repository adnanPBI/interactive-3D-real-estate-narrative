import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const isVercel = process.env.VERCEL === "1";
const assetSet = (process.env.NEXT_PUBLIC_3D_ASSET_SET || "r6").trim().toLowerCase();

if (!isVercel) {
  console.log("R6 runtime-asset guard: non-Vercel build, skipping.");
  process.exit(0);
}

if (assetSet !== "r6") {
  console.error(`R6 runtime-asset guard failed: Vercel build resolved NEXT_PUBLIC_3D_ASSET_SET=${JSON.stringify(assetSet)} instead of \"r6\".`);
  process.exit(2);
}

const heroes = [
  "integrated-campus",
  "manufacturing-line",
  "substation-bess",
  "data-center-cooling",
  "recycling-intake",
  "connected-campus",
];
const lods = ["lod0", "lod1", "lod2", "proxy"];
const missing = [];

for (const hero of heroes) {
  for (const lod of lods) {
    const relative = `public/models/r6/hero/${hero}/${lod}.glb`;
    const absolute = resolve(process.cwd(), relative);
    if (!existsSync(absolute) || !statSync(absolute).isFile() || statSync(absolute).size === 0) {
      missing.push(relative);
    }
  }
}

if (missing.length > 0) {
  console.error("R6 runtime-asset guard failed. Refusing to publish a Vercel build that would fall back to placeholder geometry.");
  for (const file of missing) console.error(` - missing: ${file}`);
  console.error("Generate and validate the authoritative R6 runtime assets before running the Vercel build.");
  process.exit(3);
}

console.log(`R6 runtime-asset guard passed: ${heroes.length * lods.length} hero GLBs are present and NEXT_PUBLIC_3D_ASSET_SET=r6.`);
