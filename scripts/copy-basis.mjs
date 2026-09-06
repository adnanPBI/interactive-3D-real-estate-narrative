#!/usr/bin/env node
import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function copyRuntime(name, candidates, targetRelative) {
  const target = path.join(root, targetRelative);
  await mkdir(target, { recursive: true });
  for (const relative of candidates) {
    const source = path.join(root, relative);
    try {
      await access(source);
      await cp(source, target, { recursive: true, force: true });
      console.log(`Copied ${name} runtime to ${targetRelative}.`);
      return true;
    } catch {
      // Try the next Three.js package layout.
    }
  }
  console.warn(`${name} runtime copy skipped: no known source directory found.`);
  return false;
}

await copyRuntime(
  "Basis/KTX2",
  ["node_modules/three/examples/jsm/libs/basis"],
  "public/basis",
);

await copyRuntime(
  "Draco",
  [
    "node_modules/three/examples/jsm/libs/draco",
    "node_modules/three/examples/jsm/libs/draco/gltf",
  ],
  "public/draco",
);
