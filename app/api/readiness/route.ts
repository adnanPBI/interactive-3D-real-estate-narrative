import { NextResponse } from "next/server";
import buildMetadata from "@/generated/build-metadata.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pair(a?: string, b?: string) {
  return Boolean(a && b);
}

export async function GET() {
  // Build-time public settings come from the generated metadata artifact rather
  // than runtime NEXT_PUBLIC_* variables, preventing readiness from reporting a
  // different configuration than the client bundle that was actually built.
  const assetSet = buildMetadata.assetSet === "approved" ? "approved" : "stage3";
  const brandSet = buildMetadata.brandSet === "approved" ? "approved" : "stage4";
  const approvedAssetsPresent = buildMetadata.approvedAssetsPresent === true;
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
  let canonicalHttps = false;
  try { canonicalHttps = new URL(buildMetadata.siteUrl || "").protocol === "https:"; } catch {}
  const buildIdentified = !["", "local", "unknown"].includes(buildId);

  const checks = {
    assetSet,
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

  const previewReady = contactDeliveryConfigured;
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
    buildMetadataGeneratedAt: buildMetadata.generatedAt,
    buildConfigDigest: buildMetadata.configDigest,
    releaseSourceDigest: buildMetadata.releaseSourceDigest,
    previewReady,
    releaseCandidateReady,
    productionReady,
    ...(detailsEnabled ? { checks } : {}),
  }, { status: previewReady ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
