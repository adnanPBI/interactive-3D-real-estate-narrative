#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const requiredAssets = ["hero-campus", "manufacturing", "power-generation", "data-centers", "recycling", "closing-platform"];
const approvedManifest = resolve(root, "public/models/approved/manifest.json");
const approvedAssetsPresent = existsSync(approvedManifest) && requiredAssets.every((name) => existsSync(resolve(root, `public/models/approved/${name}.glb`)));
const approvedAssetsManifestSha256 = existsSync(approvedManifest) ? sha256(approvedManifest) : null;
const approvedBrandPath = resolve(root, "public/brand/convalt-logo.svg");
const approvedBrandPresent = existsSync(approvedBrandPath);
const approvedBrandSha256 = approvedBrandPresent ? sha256(approvedBrandPath) : null;

function walkFiles(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  const files = [];
  for (const name of readdirSync(path).sort()) {
    const child = resolve(path, name);
    const childStat = statSync(child);
    if (childStat.isDirectory()) files.push(...walkFiles(child));
    else if (childStat.isFile()) files.push(child);
  }
  return files;
}

function releaseSourceDigest() {
  // Deliberately excludes generated metadata, evidence, docs and deployment-only
  // files. The digest binds the executable application source plus runtime assets
  // so a non-indexed RC build and the production build can prove they came from
  // the same accepted code/art even though their public environment config differs.
  const roots = [
    "app", "components", "content", "experience", "lib", "public", "types",
    "package.json", "package-lock.json", "next.config.ts", "tsconfig.json", "Dockerfile",
  ];
  const files = roots.flatMap((entry) => walkFiles(resolve(root, entry)))
    .filter((file) => !file.endsWith(".DS_Store"))
    .sort((a, b) => relative(root, a).localeCompare(relative(root, b)));
  const hash = createHash("sha256");
  for (const file of files) {
    const rel = relative(root, file).replaceAll("\\", "/");
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return { digest: hash.digest("hex"), fileCount: files.length };
}

let contentApproval = { present: false, valid: false, approvedBy: null, approvedAt: null, contentSnapshot: null, contentSha256: null };
const approvalFile = resolve(root, "content/approved/manifest.json");
if (existsSync(approvalFile)) {
  try {
    const approval = JSON.parse(readFileSync(approvalFile, "utf8"));
    const snapshot = approval.contentSnapshot ? resolve(root, String(approval.contentSnapshot)) : null;
    const actual = snapshot && existsSync(snapshot) ? sha256(snapshot) : null;
    const valid = approval.approved === true && Boolean(approval.approvedBy) && Boolean(approval.approvedAt) &&
      approval.legalClaimsReviewed === true && approval.projectDataReviewed === true && approval.peopleAndOfficeDataReviewed === true &&
      Boolean(actual) && actual === String(approval.contentSha256 || "").toLowerCase();
    contentApproval = {
      present: true,
      valid,
      approvedBy: approval.approvedBy || null,
      approvedAt: approval.approvedAt || null,
      contentSnapshot: approval.contentSnapshot || null,
      contentSha256: actual,
    };
  } catch {
    contentApproval = { ...contentApproval, present: true };
  }
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const source = releaseSourceDigest();
const stable = {
  schemaVersion: 2,
  packageVersion: pkg.version,
  stage: 6,
  buildId: process.env.BUILD_ID || "unknown",
  deploymentTier: process.env.DEPLOYMENT_TIER || "unknown",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1",
  assetSet: process.env.NEXT_PUBLIC_3D_ASSET_SET === "approved" ? "approved" : "stage3",
  brandSet: process.env.NEXT_PUBLIC_BRAND_ASSET_SET === "approved" ? "approved" : "stage4",
  turnstileSiteKeyConfigured: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  approvedAssetsPresent,
  approvedAssetsManifestSha256,
  approvedBrandPresent,
  approvedBrandSha256,
  contentApproval,
  releaseSourceDigest: source.digest,
  releaseSourceFileCount: source.fileCount,
};
const configDigest = createHash("sha256").update(JSON.stringify(stable)).digest("hex");
const metadata = { ...stable, generatedAt: new Date().toISOString(), configDigest };
const outDir = resolve(root, "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "build-metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
console.log(`Build metadata written: generated/build-metadata.json; sourceDigest=${source.digest.slice(0, 12)}; contentApproval=${contentApproval.valid ? "valid" : "not-approved"}; assets=${approvedAssetsPresent ? "approved-present" : "not-approved"}.`);
