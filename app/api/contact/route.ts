import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 12_000;
const WINDOW_SECONDS = 15 * 60;
const MAX_REQUESTS = 5;
const localRateLimit = new Map<string, { count: number; expiresAt: number }>();

const limits = {
  firstName: 80, lastName: 80, company: 160, email: 254, phone: 40,
  businessUnit: 80, product: 120, module: 120, teamInterest: 80, countryInterest: 100, message: 500
} as const;

type Field = keyof typeof limits;
type Payload = Record<Field, string> & { website?: string; formStartedAt?: string; turnstileToken?: string };

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function plainBody(value: unknown, max: number) {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
function clientIp(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.CONTACT_ALLOWED_ORIGINS ?? "").split(",")].filter(Boolean).map((value) => {
    try { return new URL(value as string).origin; } catch { return ""; }
  });
  if (process.env.NODE_ENV !== "production") configured.push("http://localhost:3000", "http://127.0.0.1:3000");
  return configured.includes(origin);
}

async function readJsonBodyLimited(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new Error("body_too_large");
  if (!request.body) return {};
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0; let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel("body too large"); throw new Error("body_too_large"); }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  const parsed: unknown = JSON.parse(text || "{}");
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_json_object");
  return parsed as Record<string, unknown>;
}

async function rateLimit(key: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const safeKey = `contact:${key}`;
    const headers = { Authorization: `Bearer ${token}` };
    const increment = await fetch(`${url}/incr/${encodeURIComponent(safeKey)}`, { headers, cache: "no-store" });
    if (!increment.ok) throw new Error("rate_limit_provider_failed");
    const { result } = await increment.json() as { result: number };
    if (result === 1) {
      const expiry = await fetch(`${url}/expire/${encodeURIComponent(safeKey)}/${WINDOW_SECONDS}`, { headers, cache: "no-store" });
      if (!expiry.ok) {
        await fetch(`${url}/del/${encodeURIComponent(safeKey)}`, { headers, cache: "no-store" }).catch(() => undefined);
        throw new Error("rate_limit_expiry_failed");
      }
    } else {
      const ttl = await fetch(`${url}/ttl/${encodeURIComponent(safeKey)}`, { headers, cache: "no-store" });
      if (ttl.ok) {
        const value = await ttl.json() as { result?: number };
        if (Number(value.result) < 0) {
          const repaired = await fetch(`${url}/expire/${encodeURIComponent(safeKey)}/${WINDOW_SECONDS}`, { headers, cache: "no-store" });
          if (!repaired.ok) throw new Error("rate_limit_expiry_failed");
        }
      }
    }
    return result <= MAX_REQUESTS;
  }
  const now = Date.now();
  const current = localRateLimit.get(key);
  if (!current || current.expiresAt <= now) { localRateLimit.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 }); return true; }
  current.count += 1;
  return current.count <= MAX_REQUESTS;
}

async function verifyTurnstile(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store" });
  if (!response.ok) return false;
  const data = await response.json() as { success?: boolean };
  return data.success === true;
}

function validate(body: Record<string, unknown>): Payload | null {
  const payload = {} as Payload;
  for (const [field, max] of Object.entries(limits) as Array<[Field, number]>) payload[field] = field === "message" ? plainBody(body[field], max) : clean(body[field], max);
  payload.website = clean(body.website, 120);
  payload.formStartedAt = clean(body.formStartedAt, 30);
  payload.turnstileToken = clean(body.turnstileToken, 2048);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
  const required: Field[] = ["firstName", "lastName", "company", "email", "phone", "businessUnit", "product", "module", "teamInterest", "countryInterest", "message"];
  if (!emailOk || required.some((field) => !payload[field]) || payload.message.length < 10) return null;
  return payload;
}

function messageText(payload: Payload, reference: string) {
  return [
    `Convalt Energy website enquiry (${reference})`, "",
    `Name: ${payload.firstName} ${payload.lastName}`,
    `Company: ${payload.company}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `Business unit: ${payload.businessUnit}`,
    `Product / project: ${payload.product}`,
    `Module / technology: ${payload.module}`,
    `Team interest: ${payload.teamInterest}`,
    `Country: ${payload.countryInterest}`, "",
    payload.message
  ].join("\n");
}

async function deliver(payload: Payload, reference: string) {
  const text = messageText(payload, reference);
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, ...payload, website: undefined, turnstileToken: undefined }), cache: "no-store" });
    if (!response.ok) throw new Error("webhook_delivery_failed");
    return "webhook";
  }
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (apiKey && to && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: to.split(",").map((item) => item.trim()).filter(Boolean), reply_to: payload.email, subject: `[Convalt.com] ${payload.businessUnit} enquiry - ${reference}`, text }),
      cache: "no-store"
    });
    if (!response.ok) throw new Error("email_delivery_failed");
    return "email";
  }
  throw new Error("delivery_not_configured");
}

export async function POST(request: NextRequest) {
  const reference = `CE-${randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    if (!allowedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Unsupported request format." }, { status: 415 });
    const body = await readJsonBodyLimited(request);
    const payload = validate(body);
    if (!payload) return NextResponse.json({ error: "Please complete all required fields with valid information." }, { status: 400 });
    if (payload.website) return NextResponse.json({ message: "Thank you. Your enquiry has been received.", reference });
    const startedAt = Number(payload.formStartedAt || 0);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt < 1200 || Date.now() - startedAt > 2 * 60 * 60 * 1000) return NextResponse.json({ error: "Please reload the form and try again." }, { status: 400 });
    const ip = clientIp(request);
    if (!(await rateLimit(ip))) return NextResponse.json({ error: "Too many enquiries were submitted from this connection. Please try again later." }, { status: 429 });
    if (!(await verifyTurnstile(payload.turnstileToken ?? "", ip))) return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 400 });
    await deliver(payload, reference);
    console.info("[contact-delivered]", { reference, businessUnit: payload.businessUnit });
    return NextResponse.json({ message: "Thank you. Your enquiry has been sent to Convalt Energy.", reference });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("[contact-error]", { reference, reason });
    if (reason === "body_too_large") return NextResponse.json({ error: "Request is too large.", reference }, { status: 413 });
    if (reason === "invalid_json_object" || error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be a JSON object.", reference }, { status: 400 });
    const configurationError = reason === "delivery_not_configured";
    const providerError = reason.startsWith("rate_limit_");
    return NextResponse.json({ error: configurationError ? "Contact delivery is not configured on this deployment." : providerError ? "Rate-limit service is temporarily unavailable. Please try again." : "Your enquiry could not be delivered right now. Please try again later.", reference }, { status: configurationError || providerError ? 503 : 502 });
  }
}
