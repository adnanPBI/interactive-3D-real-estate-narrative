import { NextResponse } from "next/server";
import buildMetadata from "@/generated/build-metadata.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "convalt-energy-3d-web",
    stage: 6,
    packageVersion: buildMetadata.packageVersion,
    buildId: process.env.BUILD_ID || buildMetadata.buildId || "unknown",
    gitCommit: process.env.RENDER_GIT_COMMIT || buildMetadata.gitCommit || "unknown",
    deploymentTier: process.env.DEPLOYMENT_TIER || buildMetadata.deploymentTier || "unknown",
    assetSet: buildMetadata.assetSet,
    r6RuntimeAssetsPresent: buildMetadata.r6RuntimeAssetsPresent === true,
    buildMetadataGeneratedAt: buildMetadata.generatedAt,
    buildConfigDigest: buildMetadata.configDigest,
    releaseSourceDigest: buildMetadata.releaseSourceDigest,
    time: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
