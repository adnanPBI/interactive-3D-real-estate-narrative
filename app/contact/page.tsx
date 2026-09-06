import type { Metadata } from "next";
import { ContactForm } from "@/components/ui/ContactForm";
import { InternalHero } from "@/components/ui/InternalHero";
import { JsonLd } from "@/components/seo/JsonLd";
import { offices, siteIdentity } from "@/content/site";

export const metadata: Metadata = { title: "Contact", description: "Contact Convalt Energy and view current public office locations across the United States, Europe, Asia and Africa.", alternates: { canonical: "/contact" }, openGraph: { title: "Contact | Convalt Energy", description: "Contact Convalt Energy and view current public office locations across the United States, Europe, Asia and Africa.", url: "/contact", images: ["/og-card.png"] } };

export default function ContactPage() {
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteIdentity.legalName,
    url: siteIdentity.url,
    email: siteIdentity.email,
    telephone: siteIdentity.phone,
    address: { "@type": "PostalAddress", ...siteIdentity.address },
    contactPoint: [{ "@type": "ContactPoint", contactType: "general enquiries", email: siteIdentity.email, telephone: siteIdentity.phone }]
  };
  const regions = [...new Set(offices.map((office) => office.region))];
  return (
    <main id="main-content" className="internal-main">
      <JsonLd data={contactJsonLd} />
      <InternalHero eyebrow="Get in touch" title="Contact" intro="Connect with Convalt Energy about projects, manufacturing, power generation, data centers, recycling or corporate enquiries." />
      <section className="content-wrap content-wrap--wide contact-layout">
        <div className="contact-panel"><div className="eyebrow">General enquiries</div><h2>Start a conversation.</h2><p>Use the form and your enquiry can be routed to the appropriate business or project team.</p><div className="contact-direct"><a href={`mailto:${siteIdentity.email}`}>{siteIdentity.email}</a><a href="tel:+12126830400">{siteIdentity.phone}</a></div></div>
        <div><h2 className="section-heading">Send an enquiry</h2><ContactForm /></div>
      </section>
      <section className="content-wrap content-wrap--wide offices-section"><div className="section-intro"><div><div className="eyebrow">Global presence</div><h2 className="section-heading">Office locations</h2></div><p>Connect with Convalt Energy offices and teams across its operating regions.</p></div>{regions.map((region) => <section className="office-region" key={region}><h3>{region}</h3><div className="office-grid">{offices.filter((office) => office.region === region).map((office) => <article className="office-card" key={`${office.region}-${office.name}`}><div className="eyebrow">{office.region}</div><h4>{office.name}</h4><address>{office.address.map((line) => <span key={line}>{line}</span>)}</address>{office.email && <a href={`mailto:${office.email}`}>{office.email}</a>}{office.phone && <a href={`tel:${office.phone.replace(/[^+\d]/g, "")}`}>{office.phone}</a>}</article>)}</div></section>)}</section>
    </main>
  );
}
