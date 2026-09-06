import type { MetadataRoute } from "next";
import { projects } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.convalt.com";
  const staticRoutes = ["", "/projects", "/team", "/media", "/press-releases", "/resources", "/contact"];
  const now = new Date();
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: now, changeFrequency: route === "" || route === "/media" || route === "/press-releases" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/projects" ? 0.9 : 0.7 })),
    ...projects.map((project) => ({ url: `${base}/projects/${project.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 }))
  ];
}
