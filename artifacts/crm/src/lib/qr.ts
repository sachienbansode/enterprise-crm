// QR codes for contact capture: decode from a camera frame / photo, and turn the text into person + company fields.
// Decoding uses the browser's BarcodeDetector when it has one (Chrome on Android / Mac), otherwise jsQR (all browsers, incl. iPhone).

export type QrPerson = { name?: string; designation?: string; mobile?: string; landline?: string; email?: string; linkedin?: string };
export type QrCompany = { name?: string; website?: string; phone?: string; email?: string; address?: string; city?: string };
export type QrResult = { kind: "vcard" | "mecard" | "bizcard" | "linkedin" | "url" | "email" | "phone" | "text"; person: QrPerson; company: QrCompany; raw: string; notes?: string };

let jsqr: any = null;
async function loadJsQR() { if (!jsqr) jsqr = (await import("jsqr")).default; return jsqr; }

let detector: any = undefined;
async function nativeDetector() {
  if (detector !== undefined) return detector;
  detector = null;
  try {
    const BD = (window as any).BarcodeDetector;
    if (BD && (await BD.getSupportedFormats?.())?.includes("qr_code")) detector = new BD({ formats: ["qr_code"] });
  } catch { detector = null; }
  return detector;
}

/** Decode a QR from a video element, canvas or image. Returns the text or null. */
export async function decodeQR(src: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, work?: HTMLCanvasElement): Promise<string | null> {
  const d = await nativeDetector();
  if (d) {
    try { const r = await d.detect(src); if (r?.[0]?.rawValue) return r[0].rawValue; } catch { /* fall through to jsQR */ }
  }
  const w = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || (src as HTMLCanvasElement).width;
  const h = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || (src as HTMLCanvasElement).height;
  if (!w || !h) return null;
  const scale = Math.min(1, 1280 / Math.max(w, h));
  const c = work || document.createElement("canvas");
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src as any, 0, 0, c.width, c.height);
  const lib = await loadJsQR();
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const r = lib(img.data, c.width, c.height, { inversionAttempts: "attemptBoth" });
  return r?.data || null;
}

/** Decode a QR from a photo given as a data URL (e.g. the business-card photo). */
export async function decodeQRFromDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl) return null;
  try { const img = new Image(); img.src = dataUrl; await img.decode(); return await decodeQR(img); } catch { return null; }
}

// ── Parsing ──────────────────────────────────────────────────────────────────
const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|rediffmail|proton|protonmail|zoho)\./i;
const digits = (s: string) => s.replace(/[^\d+]/g, "");
const isMobile = (s: string) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(digits(s).replace(/^\+/, "+"));
const site = (u: string) => { const t = u.trim(); return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t; };
const isLinkedIn = (u: string) => /linkedin\.com\/(in|pub)\//i.test(u);

function addPhone(p: QrPerson, c: QrCompany, num: string, type = "") {
  const n = num.trim(); if (!n) return;
  const t = type.toLowerCase();
  if (/fax/.test(t)) return;
  if (/cell|mobile|iphone/.test(t) || (!/work|voice|main|office/.test(t) && isMobile(n))) { if (!p.mobile) p.mobile = n; else if (!p.landline) p.landline = n; return; }
  if (isMobile(n) && !p.mobile) { p.mobile = n; return; }
  if (!p.landline) p.landline = n; else if (!c.phone) c.phone = n;
}
function finish(p: QrPerson, c: QrCompany) {
  if (p.email && !c.website) { const dom = p.email.split("@")[1]; if (dom && !FREE_MAIL.test(dom)) c.website = `https://www.${dom.replace(/^www\./, "")}`; }
  if (c.website) c.website = site(c.website);
  if (p.linkedin) p.linkedin = site(p.linkedin);
  for (const o of [p, c] as any[]) for (const k of Object.keys(o)) { if (typeof o[k] === "string") o[k] = o[k].trim(); if (!o[k]) delete o[k]; }
}
const unesc = (s: string) => s.replace(/\\([;,:\\])/g, "$1").replace(/\\n/gi, "\n");

function parseVCard(raw: string): QrResult {
  const p: QrPerson = {}, c: QrCompany = {}; const notes: string[] = [];
  const lines = raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n"); // unfold
  for (const line of lines) {
    const i = line.indexOf(":"); if (i < 0) continue;
    const head = line.slice(0, i), val = line.slice(i + 1);
    const [nameRaw, ...params] = head.split(";");
    const name = nameRaw.replace(/^item\d+\./i, "").toUpperCase();
    const ptxt = params.join(";").toLowerCase();
    let v = val;
    if (/encoding=quoted-printable/.test(ptxt)) v = v.replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    switch (name) {
      case "FN": p.name = unesc(v); break;
      case "N": if (!p.name) { const [last, first, mid, pre] = v.split(";").map(unesc); p.name = [pre, first, mid, last].filter(Boolean).join(" "); } break;
      case "ORG": c.name = unesc(v.split(";")[0]); break;
      case "TITLE": p.designation = unesc(v); break;
      case "ROLE": if (!p.designation) p.designation = unesc(v); break;
      case "TEL": addPhone(p, c, unesc(v).replace(/^tel:/i, ""), ptxt); break;
      case "EMAIL": if (!p.email) p.email = unesc(v).replace(/^mailto:/i, ""); else if (!c.email) c.email = unesc(v); break;
      case "URL": case "X-SOCIALPROFILE": { const u = unesc(v); if (isLinkedIn(u) || /linkedin/.test(ptxt)) p.linkedin = u; else if (!c.website) c.website = u; break; }
      case "ADR": { const a = v.split(";").map(unesc); const [, ext, street, city, region, zip, country] = a; c.address = [ext, street, city, region, zip, country].filter(Boolean).join(", "); if (city) c.city = city; break; }
      case "NOTE": notes.push(unesc(v)); break;
    }
  }
  finish(p, c);
  return { kind: "vcard", person: p, company: c, raw, notes: notes.join("\n") || undefined };
}

// MECARD:N:Last,First;TEL:..;EMAIL:..;URL:..;ADR:..;ORG:..;NOTE:..;;
function parseFields(body: string) {
  const out: [string, string][] = []; let key = "", val = "", inVal = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && i + 1 < body.length) { val += body[++i]; continue; }
    if (!inVal) { if (ch === ":") { inVal = true; val = ""; } else key += ch; continue; }
    if (ch === ";") { out.push([key.trim().toUpperCase(), val]); key = ""; val = ""; inVal = false; continue; }
    val += ch;
  }
  if (inVal) out.push([key.trim().toUpperCase(), val]);
  return out;
}
function parseMeCard(raw: string): QrResult {
  const p: QrPerson = {}, c: QrCompany = {}; let note = "";
  for (const [k, v] of parseFields(raw.replace(/^MECARD:/i, ""))) {
    if (k === "N") { const [last, first] = v.split(","); p.name = first ? `${first.trim()} ${last.trim()}` : v.trim(); }
    else if (k === "TEL") addPhone(p, c, v);
    else if (k === "EMAIL") p.email = p.email || v;
    else if (k === "URL") { if (isLinkedIn(v)) p.linkedin = v; else c.website = c.website || v; }
    else if (k === "ADR") c.address = v.replace(/,+/g, ", ");
    else if (k === "ORG") c.name = v;
    else if (k === "TITLE") p.designation = v;
    else if (k === "NOTE") note = v;
  }
  finish(p, c);
  return { kind: "mecard", person: p, company: c, raw, notes: note || undefined };
}
// BIZCARD:N:First;X:Last;T:Title;C:Company;A:Address;B:Phone;M:Mobile;E:Email;;
function parseBizCard(raw: string): QrResult {
  const p: QrPerson = {}, c: QrCompany = {}; let first = "", last = "";
  for (const [k, v] of parseFields(raw.replace(/^BIZCARD:/i, ""))) {
    if (k === "N") first = v; else if (k === "X") last = v; else if (k === "T") p.designation = v; else if (k === "C") c.name = v;
    else if (k === "A") c.address = v; else if (k === "B") addPhone(p, c, v, "work"); else if (k === "M") addPhone(p, c, v, "cell"); else if (k === "E") p.email = v;
  }
  p.name = [first, last].filter(Boolean).join(" ");
  finish(p, c);
  return { kind: "bizcard", person: p, company: c, raw };
}

/** Turn any QR text into contact fields. Unknown text is scanned for e-mail / phone / web address. */
export function parseContactQR(text: string): QrResult {
  const raw = String(text || "").trim();
  if (/^BEGIN:VCARD/i.test(raw)) return parseVCard(raw);
  if (/^MECARD:/i.test(raw)) return parseMeCard(raw);
  if (/^BIZCARD:/i.test(raw)) return parseBizCard(raw);
  const p: QrPerson = {}, c: QrCompany = {};
  if (/^mailto:/i.test(raw)) { p.email = decodeURIComponent(raw.replace(/^mailto:/i, "").split("?")[0]); finish(p, c); return { kind: "email", person: p, company: c, raw }; }
  if (/^(tel|sms):/i.test(raw)) { addPhone(p, c, raw.replace(/^(tel|sms):/i, "").split("?")[0]); finish(p, c); return { kind: "phone", person: p, company: c, raw }; }
  const wa = raw.match(/^https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\+?(\d{10,13})/i);
  if (wa) { p.mobile = `+${wa[1]}`; finish(p, c); return { kind: "phone", person: p, company: c, raw }; }
  if (/^https?:\/\//i.test(raw) || /^www\./i.test(raw)) {
    if (isLinkedIn(raw)) {
      p.linkedin = raw.split("?")[0];
      const slug = raw.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i)?.[1] || "";
      const guess = decodeURIComponent(slug).replace(/-[0-9a-f]{5,}$/i, "").replace(/[-_]+/g, " ").replace(/\d+/g, "").trim();
      if (guess && guess.split(" ").length <= 4) p.name = guess.replace(/\b\w/g, m => m.toUpperCase());
      finish(p, c); return { kind: "linkedin", person: p, company: c, raw };
    }
    c.website = raw; finish(p, c); return { kind: "url", person: p, company: c, raw };
  }
  // Plain text: pick out what we can
  const email = raw.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)?.[0];
  if (email) p.email = email;
  const phones = raw.match(/\+?\d[\d\s-]{8,}\d/g) || [];
  phones.forEach(n => addPhone(p, c, n));
  const url = raw.match(/(https?:\/\/|www\.)[^\s]+/i)?.[0];
  if (url) { if (isLinkedIn(url)) p.linkedin = url; else c.website = url; }
  const firstLine = raw.split(/\n/)[0].trim();
  if (firstLine && firstLine.length <= 40 && !/[@\d]/.test(firstLine)) p.name = firstLine;
  finish(p, c);
  return { kind: "text", person: p, company: c, raw };
}

export const QR_KIND_LABEL: Record<QrResult["kind"], string> = {
  vcard: "Contact QR (vCard)", mecard: "Contact QR (MeCard)", bizcard: "Contact QR (BizCard)", linkedin: "LinkedIn profile QR",
  url: "Website QR", email: "E-mail QR", phone: "Phone / WhatsApp QR", text: "Text QR",
};
