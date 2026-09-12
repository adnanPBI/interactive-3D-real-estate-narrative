#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const file = resolve(root, "content/approved/manifest.json");
if (!existsSync(file)) {
  console.error("CLIENT APPROVAL BLOCKER: content/approved/manifest.json is missing. Final copy/project/team/contact facts must be reviewed by Convalt before release-candidate freeze.");
  process.exit(2);
}
let manifest;
try { manifest = JSON.parse(readFileSync(file, "utf8")); } catch {
  console.error("CLIENT APPROVAL BLOCKER: content/approved/manifest.json is not valid JSON.");
  process.exit(3);
}
const required = ["approved", "approvedBy", "approvedAt", "contentSnapshot", "contentSha256", "legalClaimsReviewed", "projectDataReviewed", "peopleAndOfficeDataReviewed"];
for (const key of required) if (!(key in manifest)) {
  console.error(`CLIENT APPROVAL BLOCKER: manifest field ${key} is missing.`);
  process.exit(4);
}
if (manifest.approved !== true || !String(manifest.approvedBy).trim() || !String(manifest.approvedAt).trim()) {
  console.error("CLIENT APPROVAL BLOCKER: approved=true plus approvedBy/approvedAt are required.");
  process.exit(5);
}
for (const key of ["legalClaimsReviewed", "projectDataReviewed", "peopleAndOfficeDataReviewed"]) {
  if (manifest[key] !== true) {
    console.error(`CLIENT APPROVAL BLOCKER: ${key}=true is required.`);
    process.exit(6);
  }
}
if (String(manifest.contentSnapshot).replaceAll("\\", "/") !== "content/site.ts") {
  console.error("CLIENT APPROVAL BLOCKER: contentSnapshot must be content/site.ts so approval is bound to shipped content, not an unrelated archived copy.");
  process.exit(7);
}
const contentPath = resolve(root, "content/site.ts");
if (!existsSync(contentPath)) {
  console.error(`CLIENT APPROVAL BLOCKER: approved content snapshot does not exist: ${manifest.contentSnapshot}`);
  process.exit(7);
}
const actual = createHash("sha256").update(readFileSync(contentPath)).digest("hex");
if (String(manifest.contentSha256).toLowerCase() !== actual) {
  console.error(`CLIENT APPROVAL BLOCKER: content SHA-256 mismatch. Expected ${manifest.contentSha256 || "<missing>"}; actual ${actual}.`);
  process.exit(8);
}
console.log(`Client content approval PASS: ${manifest.approvedBy} at ${manifest.approvedAt}; ${manifest.contentSnapshot} sha256=${actual}.`);
