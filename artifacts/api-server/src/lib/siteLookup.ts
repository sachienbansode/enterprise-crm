// Company details from a website address (for "create client from a link").
// Safe fetch: http(s) only, public addresses only (no internal / cloud-metadata IPs), 3 redirects, 8 s, 2 MB.
import { lookup } from "dns/promises";
import { isIP } from "net";

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^22[4-9]\./, /^2[3-5]\d\./];
function privateIp(ip: string) {
  if (isIP(ip) === 4) return PRIVATE_V4.some(r => r.test(ip));
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::1" || v === "::" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}
async function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http / https links can be read");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("That link uses an unusual port");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => privateIp(a.address))) throw new Error("That address isn't a public website");
}

export async function safeFetchHtml(raw: string): Promise<{ url: string; html: string }> {
  let u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(u);
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(u, { redirect: "manual", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; NIYTRI-CRM/1.0; +company-lookup)", Accept: "text/html,application/xhtml+xml" } });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = new URL(r.headers.get("location")!, u); continue; }
      if (!r.ok) throw new Error(`The site answered ${r.status}`);
      if (!/html|xml/i.test(r.headers.get("content-type") || "html")) throw new Error("That link isn't a web page");
      const reader = r.body!.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) { ctl.abort(); break; } chunks.push(value); }
      return { url: u.toString(), html: Buffer.concat(chunks).toString("utf8") };
    } finally { clearTimeout(tm); }
  }
  throw new Error("Too many redirects");
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
const meta = (html: string, name: string) => decode(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)`, "i"))?.[1]
  || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i"))?.[1] || "");
const tc = (s: string) => s.replace(/\b([a-z])/g, m => m.toUpperCase());

export type SiteInfo = { company: Record<string, string>; person: Record<string, string>; description?: string; url: string };

export function extractSite(url: string, html: string): SiteInfo {
  const company: Record<string, string> = {}, person: Record<string, string> = {};
  const host = new URL(url).hostname.replace(/^www\./, "");
  company.website = `https://${new URL(url).hostname}`;
  // schema.org Organization in JSON-LD — the most reliable source
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => { try { return JSON.parse(m[1].trim()); } catch { return null; } }).filter(Boolean);
  const flat: any[] = []; const walk = (x: any) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) return x.forEach(walk); flat.push(x); if (x["@graph"]) walk(x["@graph"]); };
  blocks.forEach(walk);
  const org = flat.find(o => /Organization|Corporation|LocalBusiness|FinancialService|BankOrCreditUnion|InvestmentOrDeposit|Company/i.test(String(o["@type"] || "")));
  if (org) {
    if (org.legalName || org.name) company.name = decode(String(org.legalName || org.name));
    if (org.email) company.email = String(org.email).replace(/^mailto:/i, "");
    if (org.telephone) company.phone = String(org.telephone);
    const a = Array.isArray(org.address) ? org.address[0] : org.address;
    if (a && typeof a === "object") {
      company.address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry?.name || a.addressCountry].filter(x => x && typeof x === "string").join(", ");
      if (a.addressLocality) company.city = String(a.addressLocality);
    } else if (typeof a === "string") company.address = a;
    const same = [].concat(org.sameAs || []).map(String);
    const li = same.find(s => /linkedin\.com\/company/i.test(s)); if (li) company.linkedin = li;
  }
  if (!company.name) {
    const site = meta(html, "og:site_name") || meta(html, "application-name");
    const title = decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "");
    const fromTitle = title.split(/\s+[|\-–—:]\s+/).map(s => s.trim()).filter(Boolean);
    // prefer the title part that looks like a company name (Ltd / Limited / Pvt …), else og:site_name, else the shortest part
    company.name = fromTitle.find(p => /\b(ltd|limited|pvt|private|llp|inc|corp|bank|capital|securities|group)\b/i.test(p)) || site || fromTitle.sort((a, b) => a.length - b.length)[0] || "";
    if (!company.name || /^(home|welcome|index)$/i.test(company.name)) company.name = tc(host.split(".")[0].replace(/[-_]/g, " "));
  }
  const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  if (!company.email) {
    const mails = [...html.matchAll(/mailto:([^"'?>\s]+)/gi)].map(m => decodeURIComponent(m[1]).toLowerCase());
    const found = mails[0] || text.match(/[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+/i)?.[0]?.toLowerCase();
    if (found && !/\.(png|jpg|gif|svg|webp)$/.test(found)) company.email = found;
  }
  if (!company.phone) { const tel = html.match(/href=["']tel:([^"']+)/i)?.[1]; if (tel) company.phone = decodeURIComponent(tel).trim(); }
  const cin = text.toUpperCase().match(/\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/)?.[0]; if (cin) company.cin = cin;
  const gst = text.toUpperCase().match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/)?.[0]; if (gst) company.gstin = gst;
  const desc = meta(html, "og:description") || meta(html, "description");
  for (const o of [company, person]) for (const k of Object.keys(o)) if (!o[k]) delete o[k];
  return { company, person, description: desc ? desc.slice(0, 400) : undefined, url };
}

/** Read a company website (and its contact page when the home page has no e-mail / phone). */
export async function lookupSite(raw: string): Promise<SiteInfo> {
  const home = await safeFetchHtml(raw);
  const info = extractSite(home.url, home.html);
  if (!info.company.email || !info.company.phone || !info.company.address) {
    const origin = new URL(home.url).origin;
    const link = home.html.match(/href=["']([^"']*contact[^"']*)["']/i)?.[1];
    for (const path of [link, "/contact-us", "/contact"].filter(Boolean) as string[]) {
      try {
        const page = await safeFetchHtml(new URL(path, origin).toString());
        const more = extractSite(page.url, page.html);
        for (const k of ["email", "phone", "address", "city", "cin"]) if (!info.company[k] && more.company[k]) info.company[k] = more.company[k];
        break;
      } catch { /* try the next */ }
    }
  }
  return info;
}
