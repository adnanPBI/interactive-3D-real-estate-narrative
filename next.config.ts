import type { NextConfig } from "next";

// Render currently starts the service with `next start`, which requires the normal
// Next.js build layout. Standalone output is opt-in for container images only.
// This avoids the unsupported `next start` + `output: standalone` combination that
// was present in the R6.1.7 production deployment.
const useStandaloneOutput = process.env.NEXT_OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: useStandaloneOutput ? "standalone" : undefined,
  experimental: {
    optimizePackageImports: ["three", "@react-three/fiber", "gsap"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
