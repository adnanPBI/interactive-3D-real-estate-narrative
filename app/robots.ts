import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.convalt.com";
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1";
  return allowIndexing
    ? { rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }, sitemap: `${base}/sitemap.xml`, host: base }
    : { rules: { userAgent: "*", disallow: "/" } };
}
