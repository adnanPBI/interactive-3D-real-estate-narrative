import Link from "next/link";
import { siteIdentity } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div><div className="footer-kicker">Convalt Energy</div><div className="footer-title">Energy infrastructure, built for the long term.</div></div>
        <div><div className="footer-label">Explore</div><div className="footer-links"><Link href="/projects">Projects</Link><Link href="/team">Team</Link><Link href="/media">Media</Link></div></div>
        <div><div className="footer-label">Company</div><div className="footer-links"><Link href="/press-releases">Press Releases</Link><Link href="/resources">Resources</Link><Link href="/contact">Contact</Link><a href={`mailto:${siteIdentity.email}`}>{siteIdentity.email}</a></div></div>
      </div>
      <div className="footer-meta"><span>A portfolio company of {siteIdentity.parent}</span><span>Copyright © {new Date().getFullYear()} {siteIdentity.legalName}. All rights reserved.</span></div>
    </footer>
  );
}
