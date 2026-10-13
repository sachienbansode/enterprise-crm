import { Router } from "express";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { query } from "../lib/db";
import { aiVision } from "./ai";
import { insertCompany, insertPerson } from "./ib";

// Business-card scanning: photo → AI reads the card → review → company + person created (or matched) in one step.
//   POST /api/cards/scan  { image: dataURL, back?: dataURL }   → { fields, matches }
//   POST /api/cards/save  { company_id? | company{…}, person_id? | person{…}, vertical, image?, back? } → { company_id, person_id, … }
export const cardsRouter = Router();
const DIR = join(process.cwd(), "uploads", "cards");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
const UUID = /^[0-9a-f-]{36}$/i;
const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|rediffmail|rediff|icloud|me|aol|proton|protonmail|zoho|yandex)\./i;
const MAX_IMG = 8 * 1024 * 1024;

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
 "person":{"name":"","designation":"","email":"","mobile":"","landline":"","linkedin":""},
 "company":{"name":"","website":"","email":"","phone":"","address":"","city":"","cin":"","gstin":"","sector_hint":""},
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
- If two sides are given, the second image is the back of the same card.
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
  if (company.cin) (await query("SELECT id, name, client_code, cin, hq_city FROM clients WHERE upper(cin)=upper($1) LIMIT 1", [company.cin])).rows.forEach((r: any) => add(r, "Same CIN"));
  if (dom) {
    (await query(
      `SELECT DISTINCT c.id, c.name, c.client_code, c.cin, c.hq_city FROM clients c LEFT JOIN company_people p ON p.client_id=c.id
        WHERE lower(c.website) LIKE $1 OR lower(c.email) LIKE $2 OR lower(p.email) LIKE $2 LIMIT 5`, [`%${dom}%`, `%@${dom}`])).rows.forEach((r: any) => add(r, `Same e-mail domain (${dom})`));
  }
  const core = company.name ? nameCore(company.name) : "";
  if (core.length >= 3) {
    (await query("SELECT id, name, client_code, cin, hq_city FROM clients WHERE lower(name) LIKE $1 ORDER BY length(name) LIMIT 5",
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
  const front = decodeImage(req.body?.image);
  if (!front) return res.status(400).json({ error: "Send a JPEG or PNG photo of the card (up to 8 MB)." });
  const back = req.body?.back ? decodeImage(req.body.back) : null;
  try {
    const text = await aiVision(SYSTEM, back ? "Front and back of one business card." : "Read this business card.", [front, ...(back ? [back] : [])]);
    if (text === null) return res.status(409).json({ error: "The AI Assistant isn't switched on, so the card can't be read automatically — fill in the details below. An admin can turn it on under Administration → LLM Settings.", code: "AI_OFF" });
    const j = parseJson(text);
    if (!j) return res.status(502).json({ error: "Couldn't read the card — try again with the card flat, filling the frame, in good light." });
    if (j.is_card === false) return res.status(422).json({ error: `This doesn't look like a business card${j.notes ? ` (${j.notes})` : ""}.`, code: "NOT_A_CARD" });
    const p = j.person || {}, c = j.company || {};
    const person = {
      name: p.name ? titleCase(String(p.name).trim()) : "", designation: clean(p.designation) || "", email: String(p.email || "").trim().toLowerCase(),
      mobile: normPhone(p.mobile) || "", landline: normPhone(p.landline) || "", linkedin: clean(p.linkedin) || "",
    };
    const company = {
      name: String(c.name || "").trim(), website: clean(c.website) || "", email: String(c.email || "").trim().toLowerCase(), phone: normPhone(c.phone) || "",
      address: clean(c.address) || "", city: clean(c.city) || "", cin: String(c.cin || "").replace(/\s/g, "").toUpperCase(), gstin: String(c.gstin || "").replace(/\s/g, "").toUpperCase(),
      sector_hint: clean(c.sector_hint) || "",
    };
    if (!/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(company.cin)) company.cin = "";
    // Landline with no mobile on the card: if it's a mobile-format number, move it
    if (!person.mobile && /^\+91 [6-9]\d{4} \d{5}$/.test(person.landline)) { person.mobile = person.landline; person.landline = ""; }
    res.json({ fields: { person, company, confidence: Number(j.confidence) || null, notes: clean(j.notes) || "" }, matches: await findMatches(company, person) });
  } catch (e: any) {
    console.error("[cards] scan failed:", e.message);
    const msg = /401|invalid.*key|authentication/i.test(e.message) ? "The AI provider rejected the API key — an admin can check it under Administration → LLM Settings."
      : /image|vision|content type|multimodal/i.test(e.message) ? "The configured AI model can't read images. Choose a vision model (e.g. GPT-4o, Claude, Gemini) under Administration → LLM Settings."
      : "Couldn't read the card right now — fill in the details below, or try again.";
    res.status(502).json({ error: msg });
  }
});

// Re-check matches after the user edits the fields (e.g. corrects the company name)
cardsRouter.post("/match", async (req, res) => {
  try { res.json(await findMatches(req.body?.company || {}, req.body?.person || {})); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

cardsRouter.post("/save", async (req, res) => {
  const b = req.body || {};
  const user = req.user!;
  const vertical = /^[a-z_]{2,20}$/.test(String(b.vertical || "")) ? b.vertical : "ib";
  const front = b.image ? decodeImage(b.image) : null;
  const back = b.back ? decodeImage(b.back) : null;
  const p = b.person || {}, c = b.company || {};
  if (!String(p.name || "").trim()) return res.status(400).json({ error: "The person's name is required." });
  if (!b.company_id && !String(c.name || "").trim()) return res.status(400).json({ error: "Choose an existing company or enter the company name." });
  if (b.company_id && !UUID.test(b.company_id)) return res.status(400).json({ error: "Invalid company" });
  try {
    let companyId = b.company_id as string | undefined, createdCompany = false;
    if (companyId) {
      const ex = (await query("SELECT id FROM clients WHERE id=$1", [companyId])).rows[0];
      if (!ex) return res.status(404).json({ error: "Company not found" });
      await query("INSERT INTO client_verticals (client_id, vertical) VALUES ($1,$2) ON CONFLICT DO NOTHING", [companyId, vertical]);
      // Fill only the blanks on the existing company from the card
      await query(
        `UPDATE clients SET website=COALESCE(NULLIF(website,''),$2), address=COALESCE(NULLIF(address,''),$3), hq_city=COALESCE(NULLIF(hq_city,''),$4),
                mobile=COALESCE(NULLIF(mobile,''),$5), email=COALESCE(NULLIF(email,''),$6), updated_at=NOW() WHERE id=$1`,
        [companyId, clean(c.website), clean(c.address), clean(c.city), clean(c.phone), clean(c.email)]);
    } else {
      const co = await insertCompany({
        name: String(c.name).trim(), website: clean(c.website), address: clean(c.address), hq_city: clean(c.city), mobile: clean(c.phone), email: clean(c.email),
        cin: clean(c.cin), sector: clean(c.sector), relationship_strength: "Cold",
        info_source: "Business card", info_as_of: new Date().toISOString().slice(0, 10),
        notes: [c.gstin ? `GSTIN: ${c.gstin}` : "", clean(b.notes) || ""].filter(Boolean).join("\n") || null,
      }, user, vertical);
      companyId = co.id; createdCompany = true;
    }
    let personId = b.person_id as string | undefined, createdPerson = false;
    if (personId) {
      if (!UUID.test(personId)) return res.status(400).json({ error: "Invalid person" });
      const r = await query(
        `UPDATE company_people SET client_id=$2, designation=COALESCE($3,designation), email=COALESCE(NULLIF(email,''),$4), mobile=COALESCE(NULLIF(mobile,''),$5),
                landline=COALESCE(NULLIF(landline,''),$6), linkedin=COALESCE(NULLIF(linkedin,''),$7), updated_at=NOW() WHERE id=$1 RETURNING id`,
        [personId, companyId, clean(p.designation), clean(p.email), clean(p.mobile), clean(p.landline), clean(p.linkedin)]);
      if (!r.rows[0]) return res.status(404).json({ error: "Person not found" });
    } else {
      const ps = await insertPerson(companyId!, { ...p, role_type: clean(p.role_type) || "Management", city: clean(c.city), address: clean(c.address) }, user, "card_scan");
      personId = ps.id; createdPerson = true;
    }
    if (front) { const f = join(DIR, `${personId}.jpg`); writeFileSync(f, front.buf); await query("UPDATE company_people SET card_path=$2 WHERE id=$1", [personId, f]); }
    if (back) { const f = join(DIR, `${personId}_back.jpg`); writeFileSync(f, back.buf); await query("UPDATE company_people SET card_back_path=$2 WHERE id=$1", [personId, f]); }
    const companyName = (await query("SELECT name FROM clients WHERE id=$1", [companyId])).rows[0]?.name;
    res.status(201).json({ company_id: companyId, company_name: companyName, person_id: personId, created_company: createdCompany, created_person: createdPerson });
  } catch (e: any) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});
