import type { Metadata } from "next";
import { InternalHero } from "@/components/ui/InternalHero";
import { pressReleases } from "@/content/site";

export const metadata: Metadata = { title: "Press Releases", description: "Recent public Convalt Energy announcements and company updates.", alternates: { canonical: "/press-releases" }, openGraph: { title: "Press Releases | Convalt Energy", description: "Recent public Convalt Energy announcements and company updates.", url: "/press-releases", images: ["/og-card.png"] } };
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export default function PressPage() {
  return (
    <main id="main-content" className="internal-main">
      <InternalHero eyebrow="Newsroom" title="Press Releases" intro="Recent public announcements from Convalt Energy." />
      <section className="content-wrap content-wrap--wide">
        <div className="news-list news-list--press">{pressReleases.map((item) => <article className="news-row" key={item.date}><div className="news-row__meta"><time dateTime={item.date}>{formatDate(item.date)}</time><span>Press Release</span></div><div><h2>{item.title}</h2><p>{item.summary}</p></div></article>)}</div>
      </section>
    </main>
  );
}
