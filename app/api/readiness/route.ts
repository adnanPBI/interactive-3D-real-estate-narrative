import { NextResponse } from "next/server";
import buildMetadata from "@/generated/build-metadata.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pair(a?: string, b?: string) {
  return Boolean(a && b);
}

export async function GET() {
  // Report the asset set that was actually baked into the client bundle. R6 is a
  // first-class runtime set and must not be mislabeled as stage3.
  const assetSet = buildMetadata.assetSet;
  const brandSet = buildMetadata.brandSet === "approved" ? "approved" : "stage4";
  const approvedAssetsPresent = buildMetadata.approvedAssetsPresent === true;
  const r6RuntimeAssetsPresent = buildMetadata.r6RuntimeAssetsPresent === true;
  const runtimeAssetsPresent = assetSet === "r6" ? r6RuntimeAssetsPresent
    : assetSet === "approved" ? approvedAssetsPresent
      : true;
  const approvedBrandPresent = buildMetadata.approvedBrandPresent === true;
  const contentApproved = buildMetadata.contentApproval.valid === true;
  const contactDeliveryConfigured = Boolean(
    process.env.CONTACT_WEBHOOK_URL ||
    (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL),
  );
  const turnstileConfigured = buildMetadata.turnstileSiteKeyConfigured === true && Boolean(process.env.TURNSTILE_SECRET_KEY);
  const durableRateLimitConfigured = pair(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN);
  const indexing = buildMetadata.allowIndexing === true;
  const tier = process.env.DEPLOYMENT_TIER || buildMetadata.deploymentTier || "development";
  const buildId = process.env.BUILD_ID || buildMetadata.buildId || "unknown";
  const gitCommit = process.env.RENDER_GIT_COMMIT || buildMetadata.gitCommit || "unknown";
  let canonicalHttps = false;
  try { canonicalHttps = new URL(buildMetadata.siteUrl || "").protocol === "https:"; } catch {}
  const buildIdentified = !["", "local", "unknown"].includes(buildId);

  const checks = {
    assetSet,
    runtimeAssetsPresent,
    r6RuntimeAssetsPresent,
    approvedAssetsPresent,
    brandSet,
    approvedBrandPresent,
    clientContentApproved: contentApproved,
    contactDeliveryConfigured,
    turnstileConfigured,
    durableRateLimitConfigured,
    canonicalHttps,
    buildIdentified,
    indexing,
  };

  const previewReady = contactDeliveryConfigured && runtimeAssetsPresent;
  // Formal release approval remains intentionally stricter than R6 runtime health.
  const releaseBaseReady = previewReady && assetSet === "approved" && approvedAssetsPresent &&
    brandSet === "approved" && approvedBrandPresent && contentApproved && turnstileConfigured &&
    durableRateLimitConfigured && canonicalHttps && buildIdentified;
  const releaseCandidateReady = releaseBaseReady && !indexing;
  const productionReady = releaseBaseReady && indexing && tier === "production";

  const detailsEnabled = process.env.ENABLE_ACCEPTANCE_QA === "1" || tier !== "production";
  return NextResponse.json({
    status: productionReady ? "production-ready" : releaseCandidateReady ? "release-candidate-ready" : previewReady ? "preview-ready" : "blocked",
    stage: 6,
    deploymentTier: tier,
    buildId,
    gitCommit,
    buildMetadataGeneratedAt: buildMetadata.generatedAt,
    buildConfigDigest: buildMetadata.configDigest,
    releaseSourceDigest: buildMetadata.releaseSourceDigest,
    previewReady,
    releaseCandidateReady,
    productionReady,
    ...(detailsEnabled ? { checks } : {}),
  }, { status: previewReady ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
