import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InternalHero } from "@/components/ui/InternalHero";
import { JsonLd } from "@/components/seo/JsonLd";
import { projects, siteIdentity } from "@/content/site";

export function generateStaticParams() { return projects.map((project) => ({ slug: project.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { title: `${project.title} | Convalt Energy`, description: project.summary, type: "website", url: `/projects/${project.slug}`, images: ["/og-card.png"] }
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  const related = projects.filter((item) => item.slug !== project.slug && (item.category === project.category || item.region === project.region)).slice(0, 3);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteIdentity.url },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${siteIdentity.url}/projects` },
      { "@type": "ListItem", position: 3, name: project.title, item: `${siteIdentity.url}/projects/${project.slug}` }
    ]
  };

  return (
    <main id="main-content" className="internal-main">
      <JsonLd data={breadcrumb} />
      <InternalHero eyebrow={`${project.category} · ${project.region}`} title={project.title} intro={project.summary} />
      <section className="content-wrap project-detail">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/projects">Projects</Link><span aria-hidden="true">/</span><span>{project.title}</span></nav>
        <div className="project-detail__grid">
          <div className="project-detail__visual" aria-hidden="true"><div><span>{project.category}</span><strong>{project.capacity}</strong></div></div>
          <div className="metric-list">
            <div className="metric-row"><span>Status</span><strong>{project.status}</strong></div>
            <div className="metric-row"><span>Location</span><strong>{project.location}</strong></div>
            {project.metrics.map((metric) => <div className="metric-row" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}
          </div>
        </div>
        
      </section>
      {related.length > 0 && <section className="content-wrap content-wrap--wide related-section"><div className="eyebrow">Continue exploring</div><h2 className="section-heading">Related projects</h2><div className="related-grid">{related.map((item) => <Link href={`/projects/${item.slug}`} key={item.slug} className="related-card"><span>{item.category}</span><strong>{item.title}</strong><small>{item.location}</small></Link>)}</div></section>}
    </main>
  );
}
