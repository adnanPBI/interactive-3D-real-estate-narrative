import type { Metadata } from "next";
import { InternalHero } from "@/components/ui/InternalHero";
import { resourceGroups } from "@/content/site";

export const metadata: Metadata = { title: "Resources", description: "Industry, tax, market-data and trade resources referenced by Convalt Energy.", alternates: { canonical: "/resources" }, openGraph: { title: "Resources | Convalt Energy", description: "Industry, tax, market-data and trade resources referenced by Convalt Energy.", url: "/resources", images: ["/og-card.png"] } };

export default function ResourcesPage() {
  return (
    <main id="main-content" className="internal-main">
      <InternalHero eyebrow="Reference Library" title="Resources" intro="Industry, policy, market-data and trade references grouped around the same topics as Convalt's current public resource page." />
      <section className="content-wrap content-wrap--wide resource-grid">{resourceGroups.map((group) => <section className="resource-card" key={group.title}><div className="eyebrow">External references</div><h2>{group.title}</h2><ul>{group.links.map((link) => <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true">↗</span></a></li>)}</ul></section>)}</section>
    </main>
  );
}
