import type { Metadata } from "next";
import { InternalHero } from "@/components/ui/InternalHero";
import { mediaItems } from "@/content/site";

export const metadata: Metadata = { title: "Media", description: "Selected public coverage of Convalt Energy projects, manufacturing and energy infrastructure.", alternates: { canonical: "/media" }, openGraph: { title: "Media | Convalt Energy", description: "Selected public coverage of Convalt Energy projects, manufacturing and energy infrastructure.", url: "/media", images: ["/og-card.png"] } };
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export default function MediaPage() {
  return (
    <main id="main-content" className="internal-main">
      <InternalHero eyebrow="Newsroom" title="Media" intro="Selected public coverage of Convalt projects, partnerships and infrastructure development." />
      <section className="content-wrap content-wrap--wide">
        <div className="section-intro"><div><div className="eyebrow">2026 snapshot</div><h2 className="section-heading">Recent coverage</h2></div><p>Selected coverage highlights Convalt's manufacturing, infrastructure and project-development activity.</p></div>
        <div className="news-list">{mediaItems.map((item) => <article className="news-row" key={`${item.date}-${item.title}`}><div className="news-row__meta"><time dateTime={item.date}>{formatDate(item.date)}</time><span>{item.type}</span></div><div><div className="eyebrow">{item.outlet}</div><h2>{item.title}</h2><p>{item.summary}</p></div></article>)}</div>
      </section>
    </main>
  );
}
