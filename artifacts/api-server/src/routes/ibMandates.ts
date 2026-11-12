import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";

// IB Phase 2 — mandate execution:
//   • Milestones per mandate (checklist from a template for the deal kind: IPO, QIP, Rights, OFS / Block, M&A, PE, Debt …)
//   • Investor database (MFs, insurers, FPIs, AIFs, PE / VC, family offices …) with sector / deal-type / ticket preferences
//   • Investor matching for a mandate (sector, deal type, ticket size vs issue size, relationship, past interest)
//   • Roadshow / NDR tracking per mandate: meetings, interest, indicative demand, feedback → demand vs issue size
export const ibMandatesRouter = Router();
const UUID = /^[0-9a-f-]{36}$/i;
const clean = (v: any) => { const s = v === undefined || v === null ? "" : String(v).trim(); return s ? s : null; };
const num = (v: any) => { if (v === "" || v === null || v === undefined) return null; const n = Number(String(v).replace(/[,₹\s]/g, "")); return Number.isFinite(n) ? n : null; };
const arr = (v: any) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x: any) => String(x).trim()).filter(Boolean);
const rupeesOf = (v: any) => {
  const m = String(v ?? "").replace(/,/g, "").match(/([\d.]+)\s*(crores?|cr|lakhs?|lacs?|l|mn|million|m|k)?\b/i);
  if (!m) return 0; const n = parseFloat(m[1]); const u = (m[2] || "").toLowerCase();
  return n * (u.startsWith("cr") ? 1e7 : u.startsWith("l") ? 1e5 : u.startsWith("m") ? 1e6 : u === "k" ? 1e3 : 1);
};

export const INVESTOR_TYPES = ["Mutual Fund", "Insurance", "FPI", "AIF", "PE / VC", "Family Office", "HNI", "Bank / NBFC", "Pension / Provident Fund", "Sovereign Fund", "Corporate", "Other"];
export const IB_DEAL_TYPES = ["IPO", "QIP", "Rights", "OFS / Block", "Pre-IPO", "Private Equity", "M&A", "Debt / NCD"];

// ── Milestone templates (days = target offset from the mandate date) ──────────
const T = (title: string, days: number) => ({ title, days });
export const MILESTONE_TEMPLATES: Record<string, { label: string; steps: { title: string; days: number }[] }> = {
  ipo: { label: "IPO", steps: [T("Mandate letter / engagement signed", 0), T("Kick-off meeting & syndicate appointed", 7), T("Due diligence (legal, financial, business)", 30), T("Restated financials & auditor comfort", 45),
    T("DRHP drafted and board-approved", 60), T("DRHP filed with SEBI & exchanges", 75), T("SEBI observations received", 135), T("RHP filed with RoC", 160), T("Price band & anchor allocation", 170),
    T("Roadshows / NDRs completed", 172), T("Issue open — bidding", 175), T("Basis of allotment finalised", 182), T("Listing & trading", 185)] },
  qip: { label: "QIP", steps: [T("Mandate signed", 0), T("Board & shareholder approvals (special resolution)", 10), T("Due diligence & placement document", 20), T("In-principle approval from exchanges", 25),
    T("Investor wall-crossing / soft sounding", 28), T("Relevant date & floor price fixed", 30), T("Book open — QIB bids", 31), T("Allocation & CAN issued", 33), T("Allotment, listing & trading approval", 36)] },
  rights: { label: "Rights issue", steps: [T("Mandate signed", 0), T("Board approval & record date", 10), T("Draft letter of offer filed", 20), T("In-principle approval", 35), T("Letter of offer dispatched", 45),
    T("Issue open (rights entitlements traded)", 50), T("Issue close", 65), T("Basis of allotment", 70), T("Listing", 75)] },
  ofs_block: { label: "OFS / Block", steps: [T("Mandate signed", 0), T("Seller approvals & lock-in check", 2), T("Investor sounding", 4), T("Exchange notice (T-1)", 5), T("Non-retail day / block window", 6), T("Retail day / settlement", 7), T("Post-deal disclosures", 9)] },
  ma: { label: "M&A advisory", steps: [T("Mandate signed", 0), T("Information memorandum / teaser", 21), T("Buyer / target long-list approved", 30), T("NDAs signed", 40), T("Indicative offers received", 60),
    T("Due diligence (data room)", 90), T("Binding offer & term sheet", 110), T("Definitive agreements signed", 135), T("Regulatory approvals (CCI / SEBI / RBI)", 165), T("Closing & consideration paid", 180)] },
  pe: { label: "Private equity / pre-IPO", steps: [T("Mandate signed", 0), T("Teaser, IM & financial model", 21), T("Investor outreach", 30), T("Management meetings", 50), T("Term sheet signed", 75),
    T("Due diligence", 100), T("SHA / SSA signed", 120), T("Funds received & allotment", 130)] },
  debt: { label: "Debt / NCD", steps: [T("Mandate signed", 0), T("Credit rating obtained", 20), T("Term sheet & information memorandum", 25), T("Debenture trustee appointed", 28), T("Investor book built", 35), T("Allotment & listing", 40)] },
  restructuring: { label: "Debt restructuring", steps: [T("Mandate signed", 0), T("Lender consortium mapped", 10), T("Techno-economic viability study", 40), T("Resolution plan drafted", 60), T("Lender approvals (ICA)", 90), T("Implementation", 120)] },
  general: { label: "General mandate", steps: [T("Mandate signed", 0), T("Kick-off meeting", 7), T("Documentation", 30), T("Approvals", 60), T("Execution", 90), T("Closing", 120)] },
};
const kindOfDeal = (d: any): string => {
  const k = String(d.details?.kind || "").toLowerCase();
  if (MILESTONE_TEMPLATES[k]) return k;
  const t = `${d.type || ""} ${d.deal_type || ""} ${d.name || ""}`.toLowerCase();
  if (/qip/.test(t)) return "qip"; if (/rights/.test(t)) return "rights"; if (/ofs|block|bulk/.test(t)) return "ofs_block";
  if (/\bpe\b|private|pre-ipo/.test(t)) return "pe"; if (/ipo|ecm/.test(t)) return "ipo"; if (/m&a|merger|acqui/.test(t)) return "ma";
  if (/debt|ncd|dcm|bond/.test(t)) return "debt"; if (/restructur/.test(t)) return "restructuring";
  return "general";
};
const DEAL_TYPE_OF_KIND: Record<string, string> = { ipo: "IPO", qip: "QIP", rights: "Rights", ofs_block: "OFS / Block", pe: "Private Equity", ma: "M&A", debt: "Debt / NCD", restructuring: "Debt / NCD", general: "" };

async function dealOr404(id: string, res: any) {
  if (!UUID.test(id)) { res.status(400).json({ error: "Invalid deal" }); return null; }
  const d = (await query(`SELECT d.*, c.name AS client_name, c.sector AS client_sector, c.industry AS client_industry FROM deals d LEFT JOIN clients c ON c.id=d.client_id WHERE d.id=$1`, [id])).rows[0];
  if (!d) { res.status(404).json({ error: "Mandate not found" }); return null; }
  return d;
}
const note = (dealId: string, user: any, body: string) =>
  query(`INSERT INTO entity_comments (entity_type, entity_id, user_id, user_name, body) VALUES ('deal', $1, $2, $3, $4)`, [dealId, user?.id || null, user?.name || "System", body]).catch(() => {});

// ── Milestones ────────────────────────────────────────────────────────────────
ibMandatesRouter.get("/milestone-templates", (_req, res) => {
  res.json(Object.entries(MILESTONE_TEMPLATES).map(([id, t]) => ({ id, label: t.label, steps: t.steps.length })));
});

ibMandatesRouter.get("/deals/:id/milestones", async (req, res) => {
  try {
    const d = await dealOr404(req.params.id, res); if (!d) return;
    const r = await query("SELECT * FROM deal_milestones WHERE deal_id=$1 ORDER BY sort_order, due_date NULLS LAST, created_at", [d.id]);
    res.json({ data: r.rows, suggested_template: kindOfDeal(d) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.post("/deals/:id/milestones/template", async (req, res) => {
  try {
    const d = await dealOr404(req.params.id, res); if (!d) return;
    const key = MILESTONE_TEMPLATES[req.body?.template] ? req.body.template : kindOfDeal(d);
    const tpl = MILESTONE_TEMPLATES[key];
    const have = (await query("SELECT lower(title) AS t FROM deal_milestones WHERE deal_id=$1", [d.id])).rows.map((r: any) => r.t);
    const start = d.deal_date ? new Date(d.deal_date) : new Date();
    const base = (await query("SELECT COALESCE(MAX(sort_order),0) AS m FROM deal_milestones WHERE deal_id=$1", [d.id])).rows[0].m;
    let added = 0;
    for (const [i, s] of tpl.steps.entries()) {
      if (have.includes(s.title.toLowerCase())) continue;
      const due = new Date(start.getTime() + s.days * 86400000).toISOString().slice(0, 10);
      await query(`INSERT INTO deal_milestones (deal_id, title, sort_order, due_date, status, created_by, created_by_name) VALUES ($1,$2,$3,$4,'Pending',$5,$6)`,
        [d.id, s.title, Number(base) + i + 1, due, req.user?.id || null, req.user?.name || null]);
      added++;
    }
    if (added) await note(d.id, req.user, `Milestones added from the ${tpl.label} template (${added})`);
    const r = await query("SELECT * FROM deal_milestones WHERE deal_id=$1 ORDER BY sort_order, due_date NULLS LAST", [d.id]);
    res.status(201).json({ added, template: key, data: r.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.post("/deals/:id/milestones", async (req, res) => {
  try {
    const d = await dealOr404(req.params.id, res); if (!d) return;
    const title = clean(req.body?.title); if (!title) return res.status(400).json({ error: "Enter the milestone" });
    const base = (await query("SELECT COALESCE(MAX(sort_order),0) AS m FROM deal_milestones WHERE deal_id=$1", [d.id])).rows[0].m;
    const r = await query(`INSERT INTO deal_milestones (deal_id, title, sort_order, due_date, status, owner_name, notes, created_by, created_by_name)
      VALUES ($1,$2,$3,$4,'Pending',$5,$6,$7,$8) RETURNING *`, [d.id, title, Number(base) + 1, clean(req.body?.due_date), clean(req.body?.owner_name), clean(req.body?.notes), req.user?.id || null, req.user?.name || null]);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const MS_STATUS = ["Pending", "In progress", "Done", "Not needed"];
ibMandatesRouter.patch("/milestones/:mid", async (req, res) => {
  try {
    if (!UUID.test(req.params.mid)) return res.status(400).json({ error: "Invalid milestone" });
    const prev = (await query("SELECT * FROM deal_milestones WHERE id=$1", [req.params.mid])).rows[0];
    if (!prev) return res.status(404).json({ error: "Milestone not found" });
    const b = req.body || {};
    if (b.status && !MS_STATUS.includes(b.status)) return res.status(400).json({ error: "Invalid status" });
    const r = await query(`UPDATE deal_milestones SET title=COALESCE($2,title), due_date=CASE WHEN $3::text = '__clear' THEN NULL ELSE COALESCE($3::date, due_date) END,
        status=COALESCE($4,status), owner_name=COALESCE($5,owner_name), notes=COALESCE($6,notes),
        done_at=CASE WHEN COALESCE($4,status)='Done' AND done_at IS NULL THEN NOW() WHEN COALESCE($4,status)<>'Done' THEN NULL ELSE done_at END, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [prev.id, clean(b.title), b.due_date === "" ? "__clear" : clean(b.due_date), clean(b.status), clean(b.owner_name), b.notes === undefined ? null : String(b.notes)]);
    if (b.status && b.status !== prev.status) await note(prev.deal_id, req.user, `Milestone "${prev.title}": ${prev.status} → ${b.status}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.delete("/milestones/:mid", async (req, res) => {
  try {
    if (!UUID.test(req.params.mid)) return res.status(400).json({ error: "Invalid milestone" });
    await query("DELETE FROM deal_milestones WHERE id=$1", [req.params.mid]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Investors ─────────────────────────────────────────────────────────────────
ibMandatesRouter.get("/investor-options", (_req, res) => res.json({ types: INVESTOR_TYPES, deal_types: IB_DEAL_TYPES }));

ibMandatesRouter.get("/investors", async (req, res) => {
  try {
    const { search, type, sector, deal_type } = req.query as Record<string, string>;
    const params: any[] = []; let where = "WHERE i.is_active";
    if (search) { params.push(`%${search}%`); where += ` AND (i.name ILIKE $${params.length} OR i.contact_name ILIKE $${params.length} OR i.city ILIKE $${params.length} OR array_to_string(i.sectors, ',') ILIKE $${params.length})`; }
    if (type) { params.push(type); where += ` AND i.investor_type = $${params.length}`; }
    if (sector) { params.push(sector); where += ` AND (i.sectors IS NULL OR cardinality(i.sectors)=0 OR $${params.length} = ANY(i.sectors) OR 'Sector agnostic' = ANY(i.sectors))`; }
    if (deal_type) { params.push(deal_type); where += ` AND $${params.length} = ANY(i.deal_types)`; }
    const r = await query(`SELECT i.*,
        (SELECT COUNT(*)::int FROM roadshow_meetings m WHERE m.investor_id=i.id) AS meetings,
        (SELECT MAX(meeting_date) FROM roadshow_meetings m WHERE m.investor_id=i.id) AS last_met
      FROM investors i ${where} ORDER BY i.name LIMIT 500`, params);
    res.json({ data: r.rows, total: r.rows.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.get("/investors/:iid", async (req, res) => {
  try {
    if (!UUID.test(req.params.iid)) return res.status(400).json({ error: "Invalid investor" });
    const i = (await query("SELECT * FROM investors WHERE id=$1", [req.params.iid])).rows[0];
    if (!i) return res.status(404).json({ error: "Investor not found" });
    const meetings = (await query(`SELECT m.*, d.deal_code, d.name AS deal_name FROM roadshow_meetings m JOIN deals d ON d.id=m.deal_id WHERE m.investor_id=$1 ORDER BY m.meeting_date DESC NULLS LAST`, [i.id])).rows;
    res.json({ ...i, meetings });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const investorFields = (b: any) => [clean(b.name), clean(b.investor_type) || "Other", clean(b.city), clean(b.country) || "India", num(b.aum_cr), num(b.ticket_min_cr), num(b.ticket_max_cr),
  arr(b.sectors), arr(b.deal_types), clean(b.contact_name), clean(b.contact_designation), clean(b.contact_email), clean(b.contact_phone), clean(b.website), clean(b.relationship) || "Warm", clean(b.notes)];

ibMandatesRouter.post("/investors", async (req, res) => {
  try {
    const b = req.body || {};
    if (!clean(b.name)) return res.status(400).json({ error: "Enter the investor's name" });
    const dup = (await query("SELECT id, name FROM investors WHERE lower(name)=lower($1) AND is_active", [String(b.name).trim()])).rows[0];
    if (dup) return res.status(409).json({ error: `${dup.name} is already in the investor list`, id: dup.id });
    const r = await query(`INSERT INTO investors (name, investor_type, city, country, aum_cr, ticket_min_cr, ticket_max_cr, sectors, deal_types, contact_name, contact_designation, contact_email, contact_phone, website, relationship, notes, created_by, created_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`, [...investorFields(b), req.user?.id || null, req.user?.name || null]);
    await logAudit({ entityType: "investor", entityId: r.rows[0].id, entityCode: r.rows[0].name, action: "CREATE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, recordDisplay: r.rows[0].name, after: r.rows[0] }).catch(() => {});
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.patch("/investors/:iid", async (req, res) => {
  try {
    if (!UUID.test(req.params.iid)) return res.status(400).json({ error: "Invalid investor" });
    const prev = (await query("SELECT * FROM investors WHERE id=$1", [req.params.iid])).rows[0];
    if (!prev) return res.status(404).json({ error: "Investor not found" });
    const b = { ...prev, ...req.body };
    if (!clean(b.name)) return res.status(400).json({ error: "Enter the investor's name" });
    const r = await query(`UPDATE investors SET name=$1, investor_type=$2, city=$3, country=$4, aum_cr=$5, ticket_min_cr=$6, ticket_max_cr=$7, sectors=$8, deal_types=$9,
        contact_name=$10, contact_designation=$11, contact_email=$12, contact_phone=$13, website=$14, relationship=$15, notes=$16, updated_at=NOW() WHERE id=$17 RETURNING *`,
      [...investorFields(b), prev.id]);
    await logAudit({ entityType: "investor", entityId: prev.id, entityCode: prev.name, action: "UPDATE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, recordDisplay: prev.name, before: prev, after: r.rows[0] }).catch(() => {});
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.delete("/investors/:iid", async (req, res) => {
  try {
    if (!UUID.test(req.params.iid)) return res.status(400).json({ error: "Invalid investor" });
    await query("UPDATE investors SET is_active=false, updated_at=NOW() WHERE id=$1", [req.params.iid]); // kept for roadshow history
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Investor matching for a mandate ───────────────────────────────────────────
ibMandatesRouter.get("/deals/:id/investor-matches", async (req, res) => {
  try {
    const d = await dealOr404(req.params.id, res); if (!d) return;
    const kind = kindOfDeal(d), dealType = DEAL_TYPE_OF_KIND[kind] || "";
    const sizeCr = rupeesOf(d.value) / 1e7;
    const sector = String(d.client_sector || d.client_industry || "").trim();
    const invs = (await query(`SELECT i.*,
        (SELECT COUNT(*)::int FROM roadshow_meetings m WHERE m.investor_id=i.id AND m.interest IN ('High','Medium')) AS positive_meetings,
        EXISTS (SELECT 1 FROM roadshow_meetings m WHERE m.investor_id=i.id AND m.deal_id=$1) AS on_roadshow
      FROM investors i WHERE i.is_active`, [d.id])).rows;
    const out = invs.map((i: any) => {
      let score = 0; const why: string[] = [];
      const sectors: string[] = i.sectors || [];
      if (sector && sectors.some(s => s.toLowerCase() === sector.toLowerCase())) { score += 35; why.push(`invests in ${sector}`); }
      else if (!sectors.length || sectors.includes("Sector agnostic")) { score += 15; why.push("sector agnostic"); }
      if (dealType && (i.deal_types || []).includes(dealType)) { score += 30; why.push(`does ${dealType}`); }
      if (sizeCr > 0 && (i.ticket_min_cr != null || i.ticket_max_cr != null)) {
        const min = Number(i.ticket_min_cr || 0), max = Number(i.ticket_max_cr || Infinity);
        // a typical allocation is 2–15% of the issue
        const lo = sizeCr * 0.02, hi = sizeCr * 0.15;
        if (max >= lo && min <= hi) { score += 20; why.push(`ticket ₹${min || 0}–${Number.isFinite(max) ? max : "∞"} Cr fits`); }
        else if (min > hi) why.push("ticket too large for this size");
        else why.push("ticket too small");
      }
      if (i.relationship === "Hot") { score += 10; why.push("hot relationship"); } else if (i.relationship === "Warm") score += 5;
      if (i.positive_meetings > 0) { score += Math.min(10, i.positive_meetings * 3); why.push(`${i.positive_meetings} positive past meeting${i.positive_meetings > 1 ? "s" : ""}`); }
      return { id: i.id, name: i.name, investor_type: i.investor_type, city: i.city, aum_cr: i.aum_cr, ticket_min_cr: i.ticket_min_cr, ticket_max_cr: i.ticket_max_cr,
        relationship: i.relationship, contact_name: i.contact_name, score: Math.min(100, score), why, on_roadshow: i.on_roadshow };
    }).filter((x: any) => x.score >= 20).sort((a: any, b: any) => b.score - a.score).slice(0, 25);
    res.json({ data: out, basis: { sector: sector || null, deal_type: dealType || null, size_cr: sizeCr ? Math.round(sizeCr * 100) / 100 : null } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Roadshow / NDR meetings ───────────────────────────────────────────────────
ibMandatesRouter.get("/deals/:id/roadshow", async (req, res) => {
  try {
    const d = await dealOr404(req.params.id, res); if (!d) return;
    const r = await query(`SELECT m.*, i.name AS investor_name, i.investor_type, i.city AS investor_city FROM roadshow_meetings m JOIN investors i ON i.id=m.investor_id
       WHERE m.deal_id=$1 ORDER BY m.meeting_date NULLS LAST, m.created_at`, [d.id]);
    const rows = r.rows;
    const sizeCr = rupeesOf(d.value) / 1e7;
    const demand = rows.filter((x: any) => x.status !== "Cancelled" && x.interest !== "Pass").reduce((s: number, x: any) => s + Number(x.indicative_cr || 0), 0);
    const by = (k: string) => rows.filter((x: any) => x.interest === k).length;
    res.json({ data: rows, summary: { meetings: rows.length, done: rows.filter((x: any) => x.status === "Done").length, planned: rows.filter((x: any) => x.status === "Planned").length,
      high: by("High"), medium: by("Medium"), low: by("Low"), pass: by("Pass"), demand_cr: Math.round(demand * 100) / 100, size_cr: sizeCr ? Math.round(sizeCr * 100) / 100 : null,
      coverage: sizeCr ? Math.round((demand / sizeCr) * 100) / 100 : null } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const MODES = ["One-on-one", "Group meeting", "Video call", "Call", "NDR", "Site visit"];
const INTEREST = ["High", "Medium", "Low", "Pass", "Not yet known"];
const RS_STATUS = ["Planned", "Done", "Cancelled"];
ibMandatesRouter.post("/deals/:id/roadshow", async (req, res) => {
  try {
    const d = await dealOr404(req.params.id, res); if (!d) return;
    const b = req.body || {};
    if (!UUID.test(String(b.investor_id || ""))) return res.status(400).json({ error: "Choose the investor" });
    const inv = (await query("SELECT name FROM investors WHERE id=$1", [b.investor_id])).rows[0];
    if (!inv) return res.status(404).json({ error: "Investor not found" });
    const r = await query(`INSERT INTO roadshow_meetings (deal_id, investor_id, meeting_date, mode, location, attendees, status, interest, indicative_cr, feedback, next_step, created_by, created_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [d.id, b.investor_id, clean(b.meeting_date), MODES.includes(b.mode) ? b.mode : "One-on-one", clean(b.location), clean(b.attendees), RS_STATUS.includes(b.status) ? b.status : "Planned",
       INTEREST.includes(b.interest) ? b.interest : "Not yet known", num(b.indicative_cr), clean(b.feedback), clean(b.next_step), req.user?.id || null, req.user?.name || null]);
    await note(d.id, req.user, `Roadshow: ${inv.name} added${b.meeting_date ? ` (${String(b.meeting_date).slice(0, 10)})` : ""}`);
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.patch("/roadshow/:rid", async (req, res) => {
  try {
    if (!UUID.test(req.params.rid)) return res.status(400).json({ error: "Invalid meeting" });
    const prev = (await query("SELECT m.*, i.name AS investor_name FROM roadshow_meetings m JOIN investors i ON i.id=m.investor_id WHERE m.id=$1", [req.params.rid])).rows[0];
    if (!prev) return res.status(404).json({ error: "Meeting not found" });
    const b = { ...prev, ...req.body };
    const r = await query(`UPDATE roadshow_meetings SET meeting_date=$2, mode=$3, location=$4, attendees=$5, status=$6, interest=$7, indicative_cr=$8, feedback=$9, next_step=$10, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [prev.id, clean(b.meeting_date), MODES.includes(b.mode) ? b.mode : prev.mode, clean(b.location), clean(b.attendees), RS_STATUS.includes(b.status) ? b.status : prev.status,
       INTEREST.includes(b.interest) ? b.interest : prev.interest, num(b.indicative_cr), clean(b.feedback), clean(b.next_step)]);
    const ch: string[] = [];
    if (req.body.status && req.body.status !== prev.status) ch.push(`status ${prev.status} → ${req.body.status}`);
    if (req.body.interest && req.body.interest !== prev.interest) ch.push(`interest ${req.body.interest}`);
    if (req.body.indicative_cr !== undefined && num(req.body.indicative_cr) !== (prev.indicative_cr == null ? null : Number(prev.indicative_cr))) ch.push(`indicative ₹${num(req.body.indicative_cr) ?? 0} Cr`);
    if (ch.length) await note(prev.deal_id, req.user, `Roadshow: ${prev.investor_name} — ${ch.join(", ")}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

ibMandatesRouter.delete("/roadshow/:rid", async (req, res) => {
  try {
    if (!UUID.test(req.params.rid)) return res.status(400).json({ error: "Invalid meeting" });
    await query("DELETE FROM roadshow_meetings WHERE id=$1", [req.params.rid]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
