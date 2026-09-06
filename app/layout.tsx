import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/dm-sans/wght.css";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteIdentity } from "@/content/site";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.convalt.com";
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Convalt Energy | Integrated Energy Infrastructure", template: "%s | Convalt Energy" },
  description: "Convalt Energy develops solar manufacturing, power generation, data center and recycling infrastructure across the United States and international markets.",
  applicationName: "Convalt Energy",
  generator: "Next.js",
  openGraph: {
    title: "Convalt Energy | Integrated Energy Infrastructure",
    description: "Manufacturing, power generation, data centers and recycling in one integrated energy platform.",
    type: "website",
    url: "/",
    siteName: "Convalt Energy",
    images: [{ url: "/og-card.png", width: 1200, height: 630, alt: "Convalt Energy integrated infrastructure" }]
  },
  twitter: { card: "summary_large_image", title: "Convalt Energy", description: "Integrated energy infrastructure for manufacturing, power, compute and circularity.", images: ["/og-card.png"] },
  robots: { index: allowIndexing, follow: allowIndexing, googleBot: { index: allowIndexing, follow: allowIndexing } },
  icons: { icon: "/favicon.svg" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f5f3ef" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteIdentity.legalName,
    url: siteIdentity.url,
    email: siteIdentity.email,
    telephone: siteIdentity.phone,
    parentOrganization: { "@type": "Organization", name: siteIdentity.parent },
    address: { "@type": "PostalAddress", ...siteIdentity.address }
  };
  return (
    <html lang="en">
      <body>
        <JsonLd data={organization} />
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
