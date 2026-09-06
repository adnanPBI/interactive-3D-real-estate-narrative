"use client";

import { FormEvent, useState } from "react";
import Script from "next/script";
import { businessUnits, teamInterests } from "@/content/site";

type FormStatus = { kind: "idle" | "sending" | "success" | "error"; message: string };

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>({ kind: "idle", message: "" });
  const [messageLength, setMessageLength] = useState(0);
  const [startedAt] = useState(() => Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;
    const formElement = event.currentTarget;
    setStatus({ kind: "sending", message: "Sending your enquiry…" });
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    payload.formStartedAt = String(startedAt);
    payload.turnstileToken = String(form.get("cf-turnstile-response") ?? "");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Unable to send your enquiry right now.");
      formElement.reset();
      setMessageLength(0);
      setStatus({ kind: "success", message: data.message ?? "Thank you. Your enquiry has been sent." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Unable to send your enquiry right now." });
    }
  }

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <>
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
    <form className="contact-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="field"><label htmlFor="firstName">First name <span aria-hidden="true">*</span></label><input id="firstName" name="firstName" required maxLength={80} autoComplete="given-name" /></div>
        <div className="field"><label htmlFor="lastName">Last name <span aria-hidden="true">*</span></label><input id="lastName" name="lastName" required maxLength={80} autoComplete="family-name" /></div>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="company">Company <span aria-hidden="true">*</span></label><input id="company" name="company" required maxLength={160} autoComplete="organization" /></div>
        <div className="field"><label htmlFor="email">Email <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" /></div>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="phone">Phone <span aria-hidden="true">*</span></label><input id="phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" inputMode="tel" /></div>
        <div className="field"><label htmlFor="businessUnit">Business unit interest <span aria-hidden="true">*</span></label><select id="businessUnit" name="businessUnit" required defaultValue=""><option value="" disabled>Select a business unit</option>{businessUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="product">Product / project interest <span aria-hidden="true">*</span></label><input id="product" name="product" required maxLength={120} placeholder="Product, project or not applicable" /></div>
        <div className="field"><label htmlFor="module">Module / technology interest <span aria-hidden="true">*</span></label><input id="module" name="module" required maxLength={120} placeholder="Technology, module or not applicable" /></div>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="teamInterest">Team interest <span aria-hidden="true">*</span></label><select id="teamInterest" name="teamInterest" required defaultValue=""><option value="" disabled>Select a team</option>{teamInterests.map((team) => <option key={team} value={team}>{team}</option>)}</select></div>
        <div className="field"><label htmlFor="countryInterest">Country of interest <span aria-hidden="true">*</span></label><input id="countryInterest" name="countryInterest" required maxLength={100} autoComplete="country-name" /></div>
      </div>
      <div className="field"><div className="label-line"><label htmlFor="message">Message <span aria-hidden="true">*</span></label><span>{messageLength} / 500</span></div><textarea id="message" name="message" rows={7} required minLength={10} maxLength={500} onChange={(event) => setMessageLength(event.currentTarget.value.length)} /></div>
      <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {turnstileSiteKey && <div className="turnstile-wrap"><div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" /></div>}
      <div className="form-actions"><button className="primary-btn" type="submit" disabled={status.kind === "sending"}>{status.kind === "sending" ? "Sending…" : "Send enquiry"}</button><p className="form-help">Required fields are marked with an asterisk. Delivery is server-side and can be configured for Resend or a secure webhook.</p></div>
      <div className="form-status" data-kind={status.kind} role={status.kind === "error" ? "alert" : "status"} aria-live="polite">{status.message}</div>
    </form>
    </>
  );
}
