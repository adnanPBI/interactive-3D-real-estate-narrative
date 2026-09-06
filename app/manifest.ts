import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Convalt Energy", short_name: "Convalt", description: "Integrated energy infrastructure", start_url: "/", display: "standalone", background_color: "#f1efe8", theme_color: "#101310", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] };
}
