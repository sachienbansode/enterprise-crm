import { Router } from "express";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { query } from "../lib/db";
import { aiVision } from "./ai";
import { insertCompany, insertPerson } from "./ib";
import { NAME_NORM_SQL } from "./clientMerge";
import { lookupSite, nameFromDomain } from "../lib/siteLookup";

// Business-card scanning: photo → AI reads the card → review → company + person created (or matched) in one step.
//   POST /api/cards/scan  { images: dataURL[] (up to 6) | image + back? }   → { fields, matches }
//   POST /api/cards/save  { company_id? | company{…}, person_id? | person{…}, vertical, images?[] | image? + back? } → { company_id, person_id, … }
export const cardsRouter = Router();
const DIR = join(process.cwd(), "uploads", "cards");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
const UUID = /^[0-9a-f-]{36}$/i;
const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|rediffmail|rediff|icloud|me|aol|proton|protonmail|zoho|yandex)\./i;
const MAX_IMG = 8 * 1024 * 1024;
const MAX_IMAGES = 6;
/** All images sent: images[] (new) or image + back (older app versions). */
function imagesOf(b: any) {
  const list = Array.isArray(b?.images) && b.images.length ? b.images : [b?.image, b?.back].filter(Boolean);
  return list.slice(0, MAX_IMAGES).map(decodeImage).filter(Boolean) as { mime: string; b64: string; buf: Buffer }[];
}

function decodeImage(dataUrl: any): { mime: string; b64: string; buf: Buffer } | null {
  const m = String(dataUrl || "").match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > MAX_IMG) return null;
  return { mime: m[1] === "image/jpg" ? "image/jpeg" : m[1], b64: m[2], buf };
}
const clean = (v: any) => { const s = typeof v === "string" ? v.trim() : v; return s === "" || s === undefined || s === null ? null : s; };
const digits = (v: any) => String(v || "").replace(/\D/g, "");
export const domainOf = (email?: string | null, website?: string | null) => {
  const e = String(email || "").toLowerCase().split("@")[1];
  if (e && !FREE_MAIL.test(e)) return e;
  const w = String(website || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return w && w.includes(".") ? w : null;
};
const nameCore = (n: string) => n.toLowerCase().replace(/\b(private|pvt|public|limited|ltd|llp|india|the|co|company|inc|corp|corporation)\b\.?/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const titleCase = (s: string) => /[a-z]/.test(s) ? s : s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase());

function normPhone(v: any) {
  const d = digits(v);
  if (!d) return null;
  if (d.length === 10 && /^[6-9]/.test(d)) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith("91") && /^[6-9]/.test(d[2])) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return String(v).trim();
}

const SYSTEM = `You read business cards (visiting cards) for an Indian investment bank's CRM. Reply with ONE JSON object only — no prose, no code fences.
Schema:
{"is_card":true,
 "person":{"name":"","designation":"","department":"","email":"","email_alt":"","mobile":"","mobile_alt":"","whatsapp":"","landline":"","linkedin":"","qualifications":""},
 "company":{"name":"","group":"","website":"","email":"","phone":"","phone_alt":"","fax":"","toll_free":"","address":"","city":"","state":"","pincode":"","country":"",
            "cin":"","gstin":"","pan":"","sebi_reg":"","arn":"","other_addresses":"","social":"","services":"","tagline":"","sector_hint":""},
 "confidence":0.0,
 "notes":""}
Rules:
- Copy text exactly as printed; do not invent anything. Leave a field "" if it is not on the card.
- person.name: the individual's name in normal capitalisation (e.g. "Preethi Sridhar", not "PREETHI SRIDHAR"); drop honorifics (Mr, Ms, Dr, CA, CS) from the name.
- company.name: the full company name including Ltd / Pvt Ltd / LLP if printed; keep the logo wordmark only if no full name is printed.
- mobile: Indian mobile numbers (10 digits starting 6-9, optionally +91). landline: numbers with an STD code (e.g. 022-…, +91 44…), or labelled Tel/Off/Board. If several, keep the first and list the rest in notes.
- email on the person is the individual's address; a generic one (info@, contact@) goes in company.email.
- company.city: the city from the address. cin: 21-character Corporate Identity Number if printed. gstin: 15-character GSTIN if printed.
- sector_hint: one or two words for the industry if it is obvious from the card (e.g. "Pharmaceuticals", "NBFC"), else "".
- Several images may be given: front and back of the card, and possibly more photos of the same contact (another side, a letterhead, an e-mail signature).
  Combine everything into ONE contact — take each field from whichever image shows it; if images disagree, prefer the business card.
- Capture EVERY detail printed. Extra numbers / e-mails go in *_alt; department (e.g. "Corporate Finance"); qualifications printed after the name (CA, CFA, MBA);
  state, pincode (6 digits) and country from the address; pan: 10-character PAN (AAAAA9999A) if printed; sebi_reg: SEBI registration no. (e.g. INZ000…, INH…, INA…);
  arn: AMFI ARN (e.g. ARN-12345); other_addresses: branch / registered / corporate offices other than the main address, "; "-separated;
  social: other links (Twitter / X, Facebook, Instagram, YouTube, company LinkedIn page), "; "-separated; services: products / services listed, comma-separated;
  group: the business group if printed (e.g. "A Tata Enterprise" → "Tata"); tagline: slogan under the logo.
- If the image is not a business card, reply {"is_card":false,"notes":"what it looks like"}.
- confidence: 0-1, how sure you are the fields are read correctly (blurry or cut-off → lower).`;

function parseJson(text: string): any {
  const t = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
  return null;
}

// Existing companies / people that the card probably belongs to
async function findMatches(company: any, person: any) {
  const out: { companies: any[]; people: any[] } = { companies: [], people: [] };
  const seen = new Set<string>();
  const add = (row: any, why: string) => { if (!seen.has(row.id)) { seen.add(row.id); out.companies.push({ ...row, why }); } };
  const dom = domainOf(person.email || company.email, company.website);
  if (company.cin) (await query("SELECT id, name, client_code, cin, hq_city FROM clients WHERE upper(cin)=upper($1) AND COALESCE(status,'') <> 'Merged' LIMIT 1", [company.cin])).rows.forEach((r: any) => add(r, "Same CIN"));
  if (dom) {
    (await query(
      `SELECT DISTINCT c.id, c.name, c.client_code, c.cin, c.hq_city FROM clients c LEFT JOIN company_people p ON p.client_id=c.id
        WHERE (lower(c.website) LIKE $1 OR lower(c.email) LIKE $2 OR lower(p.email) LIKE $2) AND COALESCE(c.status,'') <> 'Merged' LIMIT 5`, [`%${dom}%`, `%@${dom}`])).rows.forEach((r: any) => add(r, `Same e-mail domain (${dom})`));
  }
  const core = company.name ? nameCore(company.name) : "";
  if (core.length >= 3) {
    (await query("SELECT id, name, client_code, cin, hq_city FROM clients WHERE lower(name) LIKE $1 AND COALESCE(status,'') <> 'Merged' ORDER BY length(name) LIMIT 5",
      [`%${core.split(" ").slice(0, 2).join("%")}%`])).rows.forEach((r: any) => add(r, "Similar name"));
  }
  const em = String(person.email || "").toLowerCase().trim(), mob = digits(person.mobile).slice(-10);
  if (em || mob.length === 10) {
    out.people = (await query(
      `SELECT p.id, p.name, p.designation, p.email, p.mobile, p.client_id, c.name AS company_name FROM company_people p JOIN clients c ON c.id=p.client_id
        WHERE ($1 <> '' AND lower(p.email)=$1) OR ($2 <> '' AND right(regexp_replace(coalesce(p.mobile,''),'\\D','','g'),10)=$2) LIMIT 5`, [em, mob.length === 10 ? mob : ""])).rows
      .map((r: any) => ({ ...r, why: em && String(r.email || "").toLowerCase() === em ? "Same e-mail" : "Same mobile" }));
  }
  out.companies = out.companies.slice(0, 5);
  return out;
}

cardsRouter.post("/scan", async (req, res) => {
  const imgs = imagesOf(req.body);
  if (!imgs.length) return res.status(400).json({ error: "Send a JPEG or PNG photo of the card (up to 8 MB each, up to 6 photos)." });
  try {
    const engine: { provider?: string; model?: string; fallback?: boolean } = {};
    const prompt = imgs.length === 1 ? "Read this business card." : imgs.length === 2 ? "Front and back of one business card — combine them into one contact."
      : `${imgs.length} photos of the same contact (business card front, back and other photos) — combine everything into one contact.`;
    const text = await aiVision(SYSTEM, prompt, imgs, engine);
    if (text === null) return res.status(409).json({ error: "The AI Assistant isn't switched on, so the card can't be read automatically — fill in the details below. An admin can turn it on under Administration → LLM Settings.", code: "AI_OFF" });
    const j = parseJson(text);
    if (!j) return res.status(502).json({ error: "Couldn't read the card — try again with the card flat, filling the frame, in good light." });
    if (j.is_card === false) return res.status(422).json({ error: `This doesn't look like a business card${j.notes ? ` (${j.notes})` : ""}.`, code: "NOT_A_CARD" });
    const p = j.person || {}, c = j.company || {};
    const s_ = (v: any) => clean(typeof v === "string" ? v : v == null ? "" : String(v)) || "";
    const person = {
      name: p.name ? titleCase(String(p.name).trim()) : "", designation: s_(p.designation), department: s_(p.department), qualifications: s_(p.qualifications),
      email: String(p.email || "").trim().toLowerCase(), email_alt: String(p.email_alt || "").trim().toLowerCase(),
      mobile: normPhone(p.mobile) || "", mobile_alt: normPhone(p.mobile_alt) || "", whatsapp: normPhone(p.whatsapp) || "", landline: normPhone(p.landline) || "", linkedin: s_(p.linkedin),
    };
    if (person.whatsapp && digits(person.whatsapp).slice(-10) === digits(person.mobile).slice(-10)) person.whatsapp = "";
    const company = {
      name: titleCase(String(c.name || "").trim()).replace(/\b(Ltd|Pvt|Llp)\b/g, m => m === "Llp" ? "LLP" : m), website: clean(c.website) || "", email: String(c.email || "").trim().toLowerCase(), phone: normPhone(c.phone) || "",
      address: clean(c.address) || "", city: clean(c.city) || "", cin: String(c.cin || "").replace(/\s/g, "").toUpperCase(), gstin: String(c.gstin || "").replace(/\s/g, "").toUpperCase(),
      sector_hint: clean(c.sector_hint) || "",
      group: s_(c.group), phone_alt: normPhone(c.phone_alt) || "", fax: s_(c.fax), toll_free: s_(c.toll_free), state: s_(c.state), pincode: String(c.pincode || "").replace(/\D/g, "").slice(0, 6),
      country: s_(c.country), pan: String(c.pan || "").replace(/\s/g, "").toUpperCase(), sebi_reg: s_(c.sebi_reg), arn: s_(c.arn),
      other_addresses: s_(c.other_addresses), social: s_(c.social), services: s_(c.services), tagline: s_(c.tagline),
    };
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(company.pan)) company.pan = "";
    if (company.pincode.length !== 6) company.pincode = "";
    if (!/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(company.cin)) company.cin = "";
    // No website printed: use the company e-mail domain (not for gmail / yahoo …)
    if (!company.website) { const dom = domainOf(person.email || company.email, ""); if (dom) company.website = `www.${dom}`; }
    // Landline with no mobile on the card: if it's a mobile-format number, move it
    if (!person.mobile && /^\+91 [6-9]\d{4} \d{5}$/.test(person.landline)) { person.mobile = person.landline; person.landline = ""; }
    res.json({ fields: { person, company, confidence: Number(j.confidence) || null, notes: clean(j.notes) || "" }, engine, images: imgs.length, matches: await findMatches(company, person) });
  } catch (e: any) {
    console.error("[cards] scan failed:", e.message);
    const msg = /401|invalid.*key|authentication/i.test(e.message) ? "The AI provider rejected the API key — an admin can check it under Administration → LLM Settings."
      : /image|vision|content type|multimodal/i.test(e.message) ? "The configured AI model can't read images. Choose a vision model (e.g. GPT-4o, Claude, Gemini) under Administration → LLM Settings."
      : "Couldn't read the card right now — fill in the details below, or try again.";
    res.status(502).json({ error: msg });
  }
});

// Re-check matches after the user edits the fields (e.g. corrects the company name)
// Company details from a website link → same draft / review flow as a card
cardsRouter.post("/url", async (req, res) => {
  const raw = String(req.body?.url || "").trim();
  if (!raw || raw.length > 500) return res.status(400).json({ error: "Paste a website address, e.g. www.example.com" });
  try {
    const info = await lookupSite(raw);
    const company = { ...info.company }; delete (company as any).linkedin;
    res.json({ company, person: info.person, description: info.description, url: info.url, matches: await findMatches(company, info.person) });
  } catch (e: any) {
    const why = /abort/i.test(e.message) ? "it took too long to answer" : /ENOTFOUND|EAI_AGAIN/i.test(e.message) ? "the address wasn't found — check the spelling" : /ECONNREFUSED|ECONNRESET|certificate|fetch failed/i.test(e.message) ? "the site couldn't be reached" : e.message;
    // still give a usable draft: website + a company name from the domain, so the company can be created and corrected
    const site = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const company = { website: site, name: nameFromDomain(raw) };
    res.status(422).json({ error: `Couldn't read that website (${why}) — the website and a name from the address are filled in; check the name and add the other details below.`,
      company, matches: await findMatches(company, {}).catch(() => null) });
  }
});

cardsRouter.post("/match", async (req, res) => {
  try { res.json(await findMatches(req.body?.company || {}, req.body?.person || {})); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

cardsRouter.post("/save", async (req, res) => {
  const b = req.body || {};
  const user = req.user!;
  const vertical = /^[a-z_]{2,20}$/.test(String(b.vertical || "")) ? b.vertical : "ib";
  const imgs = imagesOf(b);
  const p = b.person || {}, c = b.company || {};
  // Details that have no field of their own go into the notes of the company / contact, labelled
  const line = (label: string, v: any) => (clean(v) ? `${label}: ${clean(v)}` : "");
  const pan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(c.pan || "").toUpperCase()) ? String(c.pan).toUpperCase() : null;
  const addr = [clean(c.address), [clean(c.state), clean(c.pincode)].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const fullAddress = addr && clean(c.address) && (String(c.address).includes(String(c.pincode || "~")) || String(c.address).includes(String(c.state || "~"))) ? clean(c.address) : addr || null;
  const companyNotes = [line("GSTIN", c.gstin), line("PAN", c.pan && !pan ? c.pan : ""), line("SEBI registration", c.sebi_reg), line("AMFI ARN", c.arn), line("Other phone", c.phone_alt), line("Fax", c.fax),
    line("Toll-free", c.toll_free), line("Country", c.country && !/^india$/i.test(c.country) ? c.country : ""), line("Other offices", c.other_addresses), line("Links", c.social),
    line("Products / services", c.services), line("Tagline", c.tagline)].filter(Boolean);
  const personNotes = [line("Department", p.department), line("Qualifications", p.qualifications), line("Other e-mail", p.email_alt), line("Other mobile", p.mobile_alt), line("WhatsApp", p.whatsapp)].filter(Boolean);
  const viaQr = b.source === "qr";
  const viaOcr = b.source === "ocr";
  const hasPerson = !!String(p.name || "").trim() || !!b.person_id; // company-only save is allowed (e.g. created from a website link)
  if (!b.company_id && !String(c.name || "").trim()) return res.status(400).json({ error: "Choose an existing company or enter the company name." });
  if (b.company_id && !UUID.test(b.company_id)) return res.status(400).json({ error: "Invalid company" });
  try {
    let companyId = b.company_id as string | undefined, createdCompany = false;
    // Never create a second copy of a company that's already in the CRM under the same name (Pvt / Ltd / Limited ignored) — attach the card to it
    if (!companyId) {
      const same = (await query(`SELECT id FROM clients WHERE ${NAME_NORM_SQL("name")} = ${NAME_NORM_SQL("$1::text")} AND length(${NAME_NORM_SQL("$1::text")}) >= 4 AND COALESCE(status,'') <> 'Merged' ORDER BY created_at LIMIT 1`, [String(c.name).trim()])).rows[0];
      if (same) companyId = same.id;
    }
    if (companyId) {
      const ex = (await query("SELECT id FROM clients WHERE id=$1", [companyId])).rows[0];
      if (!ex) return res.status(404).json({ error: "Company not found" });
      await query("INSERT INTO client_verticals (client_id, vertical) VALUES ($1,$2) ON CONFLICT DO NOTHING", [companyId, vertical]);
      // Fill only the blanks on the existing company from the card
      await query(
        `UPDATE clients SET website=COALESCE(NULLIF(website,''),$2), address=COALESCE(NULLIF(address,''),$3), hq_city=COALESCE(NULLIF(hq_city,''),$4),
                mobile=COALESCE(NULLIF(mobile,''),$5), email=COALESCE(NULLIF(email,''),$6), pan=COALESCE(NULLIF(pan,''),$7), group_name=COALESCE(NULLIF(group_name,''),$8),
                notes=CASE WHEN $9::text IS NULL OR COALESCE(notes,'') LIKE '%' || $9::text || '%' THEN notes ELSE trim(both E'\n' from concat_ws(E'\n', notes, $9::text)) END, updated_at=NOW() WHERE id=$1`,
        [companyId, clean(c.website), fullAddress, clean(c.city), clean(c.phone), clean(c.email), pan, clean(c.group), companyNotes.length ? `From card: ${companyNotes.join("; ")}` : null]);
    } else {
      const co = await insertCompany({
        name: String(c.name).trim(), website: clean(c.website), address: fullAddress, hq_city: clean(c.city), mobile: clean(c.phone), email: clean(c.email),
        cin: clean(c.cin), sector: clean(c.sector), group_name: clean(c.group), relationship_strength: "Cold",
        info_source: viaQr ? "QR code" : viaOcr ? "Business card (on-device OCR)" : b.source === "link" ? "Website / link" : b.source === "text" ? "Pasted contact details" : "Business card", info_as_of: new Date().toISOString().slice(0, 10),
        notes: [...companyNotes, clean(b.notes) || ""].filter(Boolean).join("\n") || null,
      }, user, vertical);
      companyId = co.id; createdCompany = true;
      if (pan) await query("UPDATE clients SET pan=$2 WHERE id=$1 AND pan IS NULL AND NOT EXISTS (SELECT 1 FROM clients x WHERE upper(x.pan)=$2 AND x.id<>$1)", [companyId, pan]).catch(() => {});
    }
    let personId = b.person_id as string | undefined, createdPerson = false;
    if (hasPerson) {
      if (personId) {
        if (!UUID.test(personId)) return res.status(400).json({ error: "Invalid person" });
        const r = await query(
          `UPDATE company_people SET client_id=$2, designation=COALESCE($3,designation), email=COALESCE(NULLIF(email,''),$4), mobile=COALESCE(NULLIF(mobile,''),$5),
                  landline=COALESCE(NULLIF(landline,''),$6), linkedin=COALESCE(NULLIF(linkedin,''),$7),
                  notes=CASE WHEN $8::text IS NULL OR COALESCE(notes,'') LIKE '%' || $8::text || '%' THEN notes ELSE trim(both E'\n' from concat_ws(E'\n', notes, $8::text)) END, updated_at=NOW() WHERE id=$1 RETURNING id`,
          [personId, companyId, clean(p.designation), clean(p.email), clean(p.mobile), clean(p.landline), clean(p.linkedin), personNotes.length ? personNotes.join("; ") : null]);
        if (!r.rows[0]) return res.status(404).json({ error: "Person not found" });
      } else {
        const ps = await insertPerson(companyId!, { ...p, role_type: clean(p.role_type) || "Management", city: clean(c.city), address: fullAddress,
          notes: [clean(p.notes) || "", ...personNotes].filter(Boolean).join("\n") || null }, user, viaQr ? "qr_scan" : "card_scan");
        personId = ps.id; createdPerson = true;
      }
    }
    // card photos: 1st = front, 2nd = back, the rest kept as extra images of the contact
    if (personId && imgs.length) {
      const paths = imgs.map((im, i) => { const f = join(DIR, `${personId}${i === 0 ? "" : i === 1 ? "_back" : `_${i + 1}`}.jpg`); writeFileSync(f, im.buf); return f; });
      await query("UPDATE company_people SET card_path=$2, card_back_path=COALESCE($3, card_back_path), card_extra_paths=$4 WHERE id=$1",
        [personId, paths[0], paths[1] || null, paths.length > 2 ? paths.slice(2) : null]);
    }
    const companyName = (await query("SELECT name FROM clients WHERE id=$1", [companyId])).rows[0]?.name;
    res.status(201).json({ company_id: companyId, company_name: companyName, person_id: personId || null, created_company: createdCompany, created_person: createdPerson });
  } catch (e: any) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});
