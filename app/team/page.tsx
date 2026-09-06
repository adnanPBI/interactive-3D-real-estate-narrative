import type { Metadata } from "next";
import { InternalHero } from "@/components/ui/InternalHero";
import { teamGroups } from "@/content/site";

export const metadata: Metadata = { title: "Team", description: "Directors, management, development, operations and advisors supporting Convalt Energy.", alternates: { canonical: "/team" }, openGraph: { title: "Team | Convalt Energy", description: "Directors, management, development, operations and advisors supporting Convalt Energy.", url: "/team", images: ["/og-card.png"] } };

export default function TeamPage() {
  return (
    <main id="main-content" className="internal-main">
      <InternalHero eyebrow="People" title="Team" intro="A multi-disciplinary team spanning energy development, manufacturing, engineering, finance and operations." />
      <section className="content-wrap content-wrap--wide team-directory">
        {teamGroups.map((group) => <section className="team-group" key={group.group} aria-labelledby={`team-${group.group.toLowerCase().replaceAll(" ", "-")}`}><div className="team-group__heading"><div className="eyebrow">Convalt Energy</div><h2 id={`team-${group.group.toLowerCase().replaceAll(" ", "-")}`}>{group.group}</h2></div><div className="people-grid">{group.members.map((member) => <article className="person-card" key={`${group.group}-${member.name}`}><div className="person-mark" aria-hidden="true">{member.name === "Under Selection" ? "—" : member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><h3>{member.name}</h3><p>{member.title}</p></article>)}</div></section>)}
      </section>
    </main>
  );
}
