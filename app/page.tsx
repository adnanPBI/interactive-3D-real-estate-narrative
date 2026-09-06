import type { Metadata } from "next";
import { HomeExperience } from "@/components/experience/HomeExperience";
import { PreloaderGate } from "@/components/experience/PreloaderGate";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Convalt Energy | Integrated Energy Infrastructure",
    description: "A cinematic six-chapter journey through manufacturing, generation, data infrastructure and circularity.",
    url: "/",
    images: ["/og-card.png"],
  },
};

export default function HomePage() {
  return <main className="home-main"><PreloaderGate><HomeExperience /></PreloaderGate></main>;
}
