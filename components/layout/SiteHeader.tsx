"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccessibilityMenu } from "./AccessibilityMenu";

const items = [
  ["Projects", "/projects"], ["Team", "/team"], ["Media", "/media"], ["Press", "/press-releases"], ["Resources", "/resources"]
] as const;

const approvedBrand = process.env.NEXT_PUBLIC_BRAND_ASSET_SET === "approved";

/** Minimal home chrome: brand + Menu. Internal pages retain full navigation. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const isHome = pathname === "/";
  const current = (href: string) => pathname === href || (href === "/projects" && pathname.startsWith("/projects/"));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.dataset.menuOpen = open ? "true" : "false";
    if (!open) return () => { delete document.body.dataset.menuOpen; };
    const first = overlayRef.current?.querySelector<HTMLElement>("a,button");
    window.requestAnimationFrame(() => first?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      delete document.body.dataset.menuOpen;
    };
  }, [open]);

  return (
    <header className={`site-header ${isHome ? "site-header--home" : "site-header--internal"}`}>
      <Link className="brand" href="/" aria-label="Convalt Energy home">
        {approvedBrand ? <img className="brand-logo" src="/brand/convalt-logo.svg" alt="" /> : <><strong>CONVALT</strong><span>ENERGY</span></>}
      </Link>
      <div className="header-actions">
        {!isHome && (
          <>
            <nav className="site-nav" aria-label="Primary navigation">
              {items.map(([label, href]) => <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}>{label}</Link>)}
            </nav>
            <AccessibilityMenu />
            <Link className="header-cta" href="/contact">Contact</Link>
          </>
        )}
        <button ref={triggerRef} className="menu-button" type="button" aria-expanded={open} aria-controls="site-menu-overlay" onClick={() => setOpen((value) => !value)} data-home={isHome}>
          <span>{open ? "Close" : "Menu"}</span><i aria-hidden="true" />
        </button>
      </div>

      <nav ref={overlayRef} className="menu-overlay" id="site-menu-overlay" data-open={open} aria-label={isHome ? "Site navigation" : "Mobile navigation"} aria-hidden={!open}>
        <div className="menu-overlay__inner">
          <div className="menu-overlay__label">Explore</div>
          <div className="menu-overlay__links">
            {items.map(([label, href], index) => <Link key={href} href={href} aria-current={current(href) ? "page" : undefined}><small>{String(index + 1).padStart(2, "0")}</small><span>{label}</span></Link>)}
            <Link href="/contact" aria-current={current("/contact") ? "page" : undefined}><small>06</small><span>Contact</span></Link>
          </div>
          <div className="menu-overlay__tools">
            <AccessibilityMenu />
            {isHome && <a href="#accessibility-host" onClick={() => setOpen(false)}>Accessible 3D equivalent</a>}
          </div>
        </div>
      </nav>
    </header>
  );
}
