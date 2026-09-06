import type { Metadata } from "next";
import { InternalHero } from "@/components/ui/InternalHero";
import { ProjectExplorer } from "@/components/content/ProjectExplorer";
import { projects } from "@/content/site";

export const metadata: Metadata = {
  title: "Projects",
  description: "Convalt Energy projects across solar manufacturing, power generation, data centers and recycling in the United States and international markets.",
  alternates: { canonical: "/projects" },
  openGraph: { title: "Projects | Convalt Energy", description: "Convalt Energy projects across solar manufacturing, power generation, data centers and recycling in the United States and international markets.", url: "/projects", images: ["/og-card.png"] }
};

export default function ProjectsPage() {
  return (
    <main id="main-content" className="internal-main">
      <InternalHero eyebrow="Portfolio" title="Projects" intro="Explore Convalt Energy's current public project pipeline by business unit and region." />
      <section className="content-wrap content-wrap--wide" aria-labelledby="project-index-heading">
        <div className="section-intro"><div><div className="eyebrow">Current public portfolio</div><h2 id="project-index-heading" className="section-heading">Integrated infrastructure at multiple scales.</h2></div><p>Browse the portfolio by business unit and region to understand how manufacturing, generation, digital infrastructure and recycling fit together.</p></div>
        <ProjectExplorer projects={projects} />
      </section>
    </main>
  );
}
