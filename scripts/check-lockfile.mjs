#!/usr/bin/env node
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const root = lock.packages?.[""];
const errors = [];

if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 3) {
  errors.push(`package-lock.json must use lockfileVersion >= 3; got ${lock.lockfileVersion}`);
}
if (!root) {
  errors.push("package-lock.json is missing packages[''] root metadata");
} else {
  if (root.name !== pkg.name) errors.push(`root package name mismatch: ${root.name} != ${pkg.name}`);
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const expected = pkg[field] ?? {};
    const actual = root[field] ?? {};
    for (const [name, spec] of Object.entries(expected)) {
      if (actual[name] !== spec) errors.push(`${field}.${name} mismatch: lock=${actual[name]} package=${spec}`);
    }
    for (const name of Object.keys(actual)) {
      if (!(name in expected)) errors.push(`${field}.${name} exists in lock root but not package.json`);
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(`LOCKFILE ERROR: ${error}`);
  process.exit(1);
}
if (root?.version !== pkg.version) {
  console.warn(`Lockfile package metadata version ${root?.version} differs from release label ${pkg.version}; dependency graph is authoritative.`);
}
console.log(`Lockfile dependency gate passed (lockfileVersion=${lock.lockfileVersion}, package=${pkg.name}).`);
