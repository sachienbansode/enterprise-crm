import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";
import { visibleIds } from "../lib/visibility";
import { existsSync, createReadStream } from "fs";

// Investment Banking / ECM: company & promoter master, Company 360 and the IB dashboard.
const router = Router();
const UUID = /^[0-9a-f-]{36}$/i;
const IB = "Investment Banking";
const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

const ensureIbVisible = async (module: "dashboard" | "customers" | "leads") => (await visibleIds(module)).includes("ib");

const COMPANY_FIELDS = ["name", "cin", "sector", "industry", "group_name", "website", "listed_status", "exchange_symbol", "hq_city",
  "address", "email", "mobile", "date_of_incorporation", "relationship_owner_id", "relationship_strength", "notes",
  "info_source", "info_as_of"] as const;
const FIN_FIELDS = ["revenue_cr", "ebitda_cr", "pat_cr", "net_worth_cr", "valuation_cr", "fin_year", "fin_source", "fin_as_of"] as const;

function clean(v: any) { return v === "" || v === undefined ? null : v; }
function cleanCin(v: any) { const s = String(v || "").trim().toUpperCase(); return s || null; }

// ── Duplicate check: CIN is the master key; similar names are a warning ──
router.get("/companies/check", async (req, res) => {
  const cin = cleanCin(req.query.cin), name = String(req.query.name || "").trim(), exclude = String(req.query.exclude || "");
  try {
    const out: any = { cinValid: cin ? CIN_RE.test(cin) : null, cinMatch: null, similar: [] };
    if (cin) {
      const r = await query("SELECT id, name, client_code FROM clients WHERE upper(cin)=$1 AND ($2='' OR id::text <> $2) LIMIT 1", [cin, exclude]);
      out.cinMatch = r.rows[0] || null;
    }
    if (name.length >= 3) {
      const core = name.toLowerCase().replace(/\b(private|pvt|public|limited|ltd|llp|india|the|co|company)\b\.?/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
      if (core.length >= 3) {
        const r = await query(
          `SELECT id, name, client_code, cin FROM clients
            WHERE lower(name) LIKE $1 AND ($2='' OR id::text <> $2) ORDER BY name LIMIT 5`,
          [`%${core.split(/\s+/).slice(0, 2).join("%")}%`, exclude],
        );
        out.similar = r.rows;
      }
    }
    res.json(out);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Company list (IB) — fast search over name / CIN / group / promoter names ──
router.get("/companies", async (req, res) => {
  try {
    if (!(await ensureIbVisible("customers"))) return res.json({ data: [], total: 0 });
    const search = String(req.query.search || "").trim();
    const sector = String(req.query.sector || "");
    const params: any[] = [];
    let where = "WHERE EXISTS (SELECT 1 FROM client_verticals cv WHERE cv.client_id=c.id AND cv.vertical='ib')";
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (c.name ILIKE $${params.length} OR c.cin ILIKE $${params.length} OR c.group_name ILIKE $${params.length} OR c.client_code ILIKE $${params.length}
                 OR EXISTS (SELECT 1 FROM company_people p WHERE p.client_id=c.id AND p.name ILIKE $${params.length}))`;
    }
    if (sector) { params.push(sector); where += ` AND c.sector = $${params.length}`; }
    const r = await query(
      `SELECT c.id, c.client_code, c.name, c.cin, c.sector, c.listed_status, c.group_name, c.relationship_strength, c.hq_city,
              c.revenue_cr, c.valuation_cr, ro.name AS relationship_owner,
              (SELECT COUNT(*)::int FROM leads l WHERE l.client_id=c.id AND l.vertical=$${params.length + 1}
                  AND l.stage NOT IN ('closed','lost','deleted')) AS open_opps,
              (SELECT MAX(occurred_at) FROM interactions i WHERE i.client_id=c.id) AS last_interaction,
              (SELECT string_agg(p.name, ', ') FROM (SELECT name FROM company_people WHERE client_id=c.id ORDER BY (role_type='Promoter') DESC, is_key DESC, created_at LIMIT 2) p) AS promoters
         FROM clients c LEFT JOIN users ro ON ro.id = c.relationship_owner_id
         ${where} ORDER BY c.name LIMIT 500`,
      [...params, IB],
    );
    res.json({ data: r.rows, total: r.rows.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Create company ──
const httpErr = (status: number, error: string) => Object.assign(new Error(error), { status });
/** Creates an IB company (+ optional people). Shared by New Company and business-card scanning. */
export async function insertCompany(input: any, user: any, vertical = "ib") {
    const b = input || {};
    const name = String(b.name || "").trim();
    if (!name) throw httpErr(400, "Company name is required");
    const cin = cleanCin(b.cin);
    if (cin && !CIN_RE.test(cin)) throw httpErr(400, "CIN looks invalid (21 characters, e.g. L17110MH1973PLC019786)");
    if (cin) {
      const dup = await query("SELECT name FROM clients WHERE upper(cin)=$1", [cin]);
      if (dup.rows[0]) throw httpErr(409, `A company with this CIN already exists: ${dup.rows[0].name}`);
    }
    const cnt = await query("SELECT COUNT(*) FROM clients WHERE client_code LIKE 'NIYT-C%'");
    const code = `NIYT-C-${String(parseInt(cnt.rows[0].count, 10) + 1).padStart(6, "0")}`;
    const by = user.name;
    const hasFin = FIN_FIELDS.some(f => clean(b[f]) !== null);
    const r = await query(
      `INSERT INTO clients (client_code, name, type, category, status, kyc_status, cin, sector, industry, group_name, website, listed_status,
          exchange_symbol, hq_city, address, email, mobile, date_of_incorporation, relationship_owner_id, relationship_strength, notes,
          info_source, info_as_of, info_updated_by, info_updated_at,
          revenue_cr, ebitda_cr, pat_cr, net_worth_cr, valuation_cr, fin_year, fin_source, fin_as_of, fin_updated_by, fin_updated_at,
          owner_id, rm_id)
       VALUES ($1,$2,'Non-Individual','Corporate','Active','Pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$31) RETURNING *`,
      [code, name, cin, clean(b.sector), clean(b.industry), clean(b.group_name), clean(b.website), clean(b.listed_status),
       clean(b.exchange_symbol), clean(b.hq_city), clean(b.address), clean(b.email), clean(b.mobile), clean(b.date_of_incorporation),
       clean(b.relationship_owner_id) || user.id, clean(b.relationship_strength) || "Warm", clean(b.notes),
       clean(b.info_source), clean(b.info_as_of), by,
       clean(b.revenue_cr), clean(b.ebitda_cr), clean(b.pat_cr), clean(b.net_worth_cr), clean(b.valuation_cr), clean(b.fin_year),
       clean(b.fin_source), clean(b.fin_as_of), hasFin ? by : null, hasFin ? new Date() : null, user.id],
    );
    const c = r.rows[0];
    if (hasFin) await query("UPDATE clients SET fin_updated_at=NOW() WHERE id=$1", [c.id]);
    await query("INSERT INTO client_verticals (client_id, vertical) VALUES ($1,$2) ON CONFLICT DO NOTHING", [c.id, vertical]);
    for (const p of Array.isArray(b.people) ? b.people : []) {
      if (String(p?.name || "").trim()) {
        await query(
          "INSERT INTO company_people (client_id, name, designation, role_type, email, mobile, created_by_name) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [c.id, p.name.trim(), clean(p.designation), clean(p.role_type) || "Promoter", clean(p.email), clean(p.mobile), by],
        );
      }
    }
    await logAudit({ entityType: "client", entityId: c.id, entityCode: code, action: "CREATE", userId: user.id, userName: by, userRole: user.role, recordDisplay: `${name} (${code})`, after: c });
  return c;
}
router.post("/companies", async (req, res) => {
  try {
    res.status(201).json(await insertCompany(req.body, req.user));
  } catch (e: any) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (/uq_clients_cin/.test(e.message)) return res.status(409).json({ error: "A company with this CIN already exists" });
    res.status(500).json({ error: e.message });
  }
});

// ── Update company profile / financials (stamps Source · Date · Updated by) ──
router.patch("/companies/:id", async (req, res) => {
  const { id } = req.params;
  if (!UUID.test(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const prev = (await query("SELECT * FROM clients WHERE id=$1", [id])).rows[0];
    if (!prev) return res.status(404).json({ error: "Company not found" });
    const b = req.body || {};
    if ("name" in b && !String(b.name || "").trim()) return res.status(400).json({ error: "Company name is required" });
    if ("cin" in b) {
      const cin = cleanCin(b.cin);
      if (cin && !CIN_RE.test(cin)) return res.status(400).json({ error: "CIN looks invalid (21 characters, e.g. L17110MH1973PLC019786)" });
      if (cin) {
        const dup = await query("SELECT name FROM clients WHERE upper(cin)=$1 AND id<>$2", [cin, id]);
        if (dup.rows[0]) return res.status(409).json({ error: `Another company already has this CIN: ${dup.rows[0].name}` });
      }
      b.cin = cin;
    }
    const sets: string[] = [], vals: any[] = [];
    const norm = (v: any) => (v === null || v === undefined || v === "" ? null : String(v));
    let infoChanged = false, finChanged = false;
    for (const f of [...COMPANY_FIELDS, ...FIN_FIELDS]) {
      if (!(f in b)) continue;
      const nv = clean(b[f]);
      const pv = prev[f] instanceof Date ? prev[f].toISOString().slice(0, 10) : prev[f];
      if (norm(nv) === norm(pv) || (nv !== null && pv !== null && !isNaN(Number(nv)) && Number(nv) === Number(pv))) continue;
      vals.push(nv); sets.push(`${f}=$${vals.length}`);
      if ((FIN_FIELDS as readonly string[]).includes(f)) finChanged = true; else infoChanged = true;
    }
    if (!sets.length) return res.json(prev);
    if (finChanged) { vals.push(req.user!.name); sets.push(`fin_updated_by=$${vals.length}`, "fin_updated_at=NOW()"); }
    if (infoChanged) { vals.push(req.user!.name); sets.push(`info_updated_by=$${vals.length}`, "info_updated_at=NOW()"); }
    vals.push(id);
    const r = await query(`UPDATE clients SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    await logAudit({ entityType: "client", entityId: id, entityCode: prev.client_code, action: "UPDATE", userId: req.user!.id, userName: req.user!.name, userRole: req.user!.role, recordDisplay: `${prev.name} (${prev.client_code})`, before: prev, after: r.rows[0] });
    res.json(r.rows[0]);
  } catch (e: any) {
    if (/uq_clients_cin/.test(e.message)) return res.status(409).json({ error: "Another company already has this CIN" });
    res.status(500).json({ error: e.message });
  }
});

// ── Company 360: everything about a company on one screen ──
router.get("/companies/:id", async (req, res) => {
  const { id } = req.params;
  if (!UUID.test(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const c = (await query(
      `SELECT c.*, ro.name AS relationship_owner,
              array_agg(DISTINCT cv.vertical) FILTER (WHERE cv.vertical IS NOT NULL) AS verticals
         FROM clients c LEFT JOIN users ro ON ro.id=c.relationship_owner_id LEFT JOIN client_verticals cv ON cv.client_id=c.id
        WHERE c.id=$1 GROUP BY c.id, ro.name`, [id])).rows[0];
    if (!c) return res.status(404).json({ error: "Company not found" });
    const [people, opps, deals, interactions, tasks, docs, stages] = await Promise.all([
      query("SELECT * FROM company_people WHERE client_id=$1 ORDER BY is_key DESC, role_type, name", [id]),
      query(`SELECT l.*, u.name AS rm_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_rm_id
              WHERE l.client_id=$1 AND l.stage <> 'deleted' ORDER BY l.created_at DESC`, [id]),
      query(`SELECT d.*, u.name AS rm_name FROM deals d LEFT JOIN users u ON u.id=d.rm_id
              WHERE d.client_id=$1 AND d.stage <> 'deleted' ORDER BY d.created_at DESC`, [id]),
      query("SELECT * FROM interactions WHERE client_id=$1 ORDER BY occurred_at DESC LIMIT 200", [id]),
      query("SELECT * FROM tasks WHERE client_id=$1 ORDER BY (status='Done'), due_date NULLS LAST, created_at DESC LIMIT 200", [id]),
      query(`SELECT d.id, d.name, d.type, d.current_version, d.created_at, u.name AS uploaded_by FROM documents d
              LEFT JOIN users u ON u.id=d.created_by WHERE d.client_id=$1 ORDER BY d.created_at DESC`, [id]),
      query("SELECT vertical, stage_id, label FROM pipeline_stages WHERE entity='lead'"),
    ]);
    const label = (v: string, s: string) => stages.rows.find(x => x.stage_id === s)?.label || s;
    // Unified relationship timeline
    const timeline: any[] = [
      ...interactions.rows.map(i => ({ kind: "interaction", at: i.occurred_at, by: i.created_by_name, type: i.type, title: i.title, summary: i.summary, source: i.source, id: i.id, meeting_id: i.meeting_id })),
      ...opps.rows.map(l => ({ kind: "opportunity", at: l.created_at, by: l.created_by_name, title: l.name, stage: label("", l.stage), id: l.id })),
      ...tasks.rows.filter(t => t.status === "Done").map(t => ({ kind: "task_done", at: t.completed_at || t.created_at, by: t.owner_name, title: t.title, id: t.id })),
      ...docs.rows.map(d => ({ kind: "document", at: d.created_at, by: d.uploaded_by, title: d.name, id: d.id })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    res.json({ company: c, people: people.rows, opportunities: opps.rows.map(l => ({ ...l, stage_label: label("", l.stage) })), deals: deals.rows, interactions: interactions.rows, tasks: tasks.rows, documents: docs.rows, timeline });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Promoters / management ──
const PERSON_FIELDS = ["name", "designation", "role_type", "email", "mobile", "landline", "linkedin", "address", "city", "notes", "is_key"] as const;
router.post("/companies/:id/people", async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || "").trim()) return res.status(400).json({ error: "Name is required" });
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try { res.status(201).json(await insertPerson(req.params.id, b, req.user, "manual")); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});
export async function insertPerson(clientId: string, b: any, user: any, source = "manual") {
  const r = await query(
    `INSERT INTO company_people (client_id, name, designation, role_type, email, mobile, landline, linkedin, address, city, notes, is_key, source, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [clientId, String(b.name).trim(), clean(b.designation), clean(b.role_type) || "Management", clean(b.email), clean(b.mobile), clean(b.landline),
     clean(b.linkedin), clean(b.address), clean(b.city), clean(b.notes), !!b.is_key, source, user.id, user.name],
  );
  await logAudit({ entityType: "company_person", entityId: clientId, action: "CREATE", userId: user.id, userName: user.name, userRole: user.role, recordDisplay: b.name, after: r.rows[0] });
  return r.rows[0];
}
// Partial update: only the fields sent are changed
router.patch("/people/:pid", async (req, res) => {
  const b = req.body || {};
  if (!UUID.test(req.params.pid)) return res.status(400).json({ error: "Invalid id" });
  if ("name" in b && !String(b.name || "").trim()) return res.status(400).json({ error: "Name is required" });
  try {
    const sets: string[] = [], vals: any[] = [];
    for (const f of PERSON_FIELDS) {
      if (!(f in b)) continue;
      vals.push(f === "is_key" ? !!b[f] : f === "name" ? String(b.name).trim() : clean(b[f])); sets.push(`${f}=$${vals.length}`);
    }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    vals.push(req.params.pid);
    const r = await query(`UPDATE company_people SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
    if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
    await logAudit({ entityType: "company_person", entityId: r.rows[0].client_id, action: "UPDATE", userId: req.user!.id, userName: req.user!.name, userRole: req.user!.role, recordDisplay: r.rows[0].name, after: r.rows[0] });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
// Contact page: person + company + owner + history (meetings, interactions and tasks involving this person)
router.get("/people/:pid", async (req, res) => {
  if (!UUID.test(req.params.pid)) return res.status(400).json({ error: "Invalid id" });
  try {
    const p = (await query(
      `SELECT p.*, c.name AS company_name, c.client_code, c.website AS company_website, c.hq_city AS company_city, c.address AS company_address,
              ro.name AS owner_name, ro.id AS owner_id
         FROM company_people p JOIN clients c ON c.id=p.client_id LEFT JOIN users ro ON ro.id=c.relationship_owner_id WHERE p.id=$1`, [req.params.pid])).rows[0];
    if (!p) return res.status(404).json({ error: "Not found" });
    const email = (p.email || "").toLowerCase(), name = p.name;
    const [ints, meets, tasks] = await Promise.all([
      query(`SELECT id, type, title, summary, occurred_at, source, created_by_name, meeting_id FROM interactions
              WHERE client_id=$1 AND (attendees::text ILIKE $2 OR ($3 <> '' AND attendees::text ILIKE $3) OR title ILIKE $2 OR summary ILIKE $2)
              ORDER BY occurred_at DESC LIMIT 50`, [p.client_id, `%${name}%`, email ? `%${email}%` : ""]),
      query(`SELECT id, title, source, status, start_at, duration_sec FROM meetings
              WHERE client_id=$1 AND interaction_id IS NULL AND (attendees::text ILIKE $2 OR ($3 <> '' AND attendees::text ILIKE $3))
              ORDER BY start_at DESC NULLS LAST LIMIT 30`, [p.client_id, `%${name}%`, email ? `%${email}%` : ""]).catch(() => ({ rows: [] as any[] })),
      query(`SELECT id, title, due_date, status, owner_name, created_at, completed_at FROM tasks WHERE person_id=$1 ORDER BY (status='Done'), due_date NULLS LAST LIMIT 50`, [p.id]),
    ]);
    const history = [
      ...ints.rows.map(i => ({ kind: "interaction", at: i.occurred_at, by: i.created_by_name, title: i.title, summary: i.summary, type: i.type, source: i.source, id: i.id, meeting_id: i.meeting_id })),
      ...meets.rows.map(m => ({ kind: "meeting", at: m.start_at, title: m.title, status: m.status, source: m.source, meeting_id: m.id })),
      ...tasks.rows.map(t => ({ kind: "task", at: t.status === "Done" ? (t.completed_at || t.created_at) : t.created_at, by: t.owner_name, title: t.title, status: t.status, due_date: t.due_date, id: t.id })),
      { kind: "created", at: p.created_at, by: p.created_by_name, title: p.source === "card_scan" ? "Added from a business card" : "Added to the CRM" },
    ].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    const { card_path, card_back_path, ...rest } = p;
    res.json({ ...rest, has_card: !!card_path, has_card_back: !!card_back_path, history, open_tasks: tasks.rows.filter(t => t.status !== "Done").length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.get("/people/:pid/card", async (req, res) => {
  if (!UUID.test(req.params.pid)) return res.status(400).end();
  const r = (await query("SELECT card_path, card_back_path FROM company_people WHERE id=$1", [req.params.pid])).rows[0];
  const f = req.query.side === "back" ? r?.card_back_path : r?.card_path;
  if (!f || !existsSync(f)) return res.status(404).json({ error: "No card image" });
  res.setHeader("Content-Type", "image/jpeg"); res.setHeader("Cache-Control", "private, max-age=3600");
  createReadStream(f).pipe(res);
});
router.delete("/people/:pid", async (req, res) => {
  try {
    const r = await query("DELETE FROM company_people WHERE id=$1 RETURNING client_id, name", [req.params.pid]);
    if (r.rows[0]) await logAudit({ entityType: "company_person", entityId: r.rows[0].client_id, action: "DELETE", userId: req.user!.id, userName: req.user!.name, userRole: req.user!.role, recordDisplay: r.rows[0].name });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── IB dashboard: "My Day" + ECM analytics ──
router.get("/dashboard", async (req, res) => {
  try {
    if (!(await ensureIbVisible("dashboard"))) return res.status(404).json({ error: "Investment Banking is hidden by the administrator" });
    const mine = req.query.scope === "mine";
    const uid = req.user!.id;
    const rmFilter = mine ? " AND l.assigned_rm_id = $2" : "";
    const p = mine ? [IB, uid] : [IB];
    const [opps, stages, todayMeet, dueActions, overdue] = await Promise.all([
      query(`SELECT l.id, l.lead_code, l.name, l.stage, l.priority, l.value_estimate, l.expected_fee, l.probability, l.opportunity_type,
                    l.next_action, l.next_action_date, l.lost_reason, l.created_at, l.closed_at, l.assigned_rm_id, c.name AS company, c.sector, u.name AS rm
               FROM leads l LEFT JOIN clients c ON c.id=l.client_id LEFT JOIN users u ON u.id=l.assigned_rm_id
              WHERE l.vertical=$1 AND l.stage <> 'deleted'${rmFilter}`, p),
      query("SELECT stage_id, label, sort_order, is_won, is_lost FROM pipeline_stages WHERE entity='lead' AND vertical='ib' AND is_active ORDER BY sort_order"),
      query(`SELECT i.id, i.type, i.title, i.occurred_at, c.name AS company, i.client_id FROM interactions i LEFT JOIN clients c ON c.id=i.client_id
              WHERE i.vertical=$1 AND i.occurred_at::date = CURRENT_DATE ${mine ? "AND i.created_by=$2" : ""} ORDER BY i.occurred_at`, p),
      query(`SELECT l.id, l.name, l.next_action, l.next_action_date, c.name AS company FROM leads l LEFT JOIN clients c ON c.id=l.client_id
              WHERE l.vertical=$1 AND l.stage NOT IN ('closed','lost','deleted') AND l.next_action_date <= CURRENT_DATE + 2 ${rmFilter}
              ORDER BY l.next_action_date LIMIT 20`, p),
      query(`SELECT t.id, t.title, t.due_date, t.owner_name, t.priority, c.name AS company, t.client_id, t.lead_id FROM tasks t LEFT JOIN clients c ON c.id=t.client_id
              WHERE t.status='Open' AND (t.vertical=$1 OR t.vertical IS NULL) AND t.due_date <= CURRENT_DATE ${mine ? "AND t.owner_id=$2" : ""}
              ORDER BY t.due_date LIMIT 30`, p),
    ]);
    const st = stages.rows;
    const isWon = (s: string) => !!st.find(x => x.stage_id === s)?.is_won;
    const isLost = (s: string) => !!st.find(x => x.stage_id === s)?.is_lost;
    const order = (s: string) => st.find(x => x.stage_id === s)?.sort_order ?? 0;
    const val = (v: any) => {
      const m = String(v ?? "").replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lakh|lac|k)?/i);
      if (!m) return 0; const n = parseFloat(m[1]); const u = (m[2] || "").toLowerCase();
      return n * (u.startsWith("cr") ? 1e7 : u === "l" || u.startsWith("la") ? 1e5 : u === "k" ? 1e3 : 1);
    };
    const rows = opps.rows;
    const open = rows.filter(l => !isWon(l.stage) && !isLost(l.stage));
    const won = rows.filter(l => isWon(l.stage)), lost = rows.filter(l => isLost(l.stage));
    const sum = (a: any[], f: (x: any) => number) => a.reduce((s, x) => s + f(x), 0);
    const prob = (l: any) => (l.probability ?? Math.round((order(l.stage) / Math.max(1, st.length - 1)) * 100)) / 100;
    // Reached a stage = currently at/after it, or closed won (lost records don't keep the furthest stage reached)
    const reached = (stageId: string) => rows.filter(l => isWon(l.stage) || (!isLost(l.stage) && order(l.stage) >= order(stageId))).length;
    const funnelSteps = [["identified", "Leads"], ["pitch", "Pitch"], ["mandate", "Mandate"], ["execution", "Transaction"], ["closed", "Closed"]]
      .filter(([s]) => st.some(x => x.stage_id === s));
    const funnel = funnelSteps.map(([s, label]) => ({ stage: s, label, count: s === "identified" ? rows.length : reached(s) }));
    const groupBy = (key: (l: any) => string) => {
      const m: Record<string, { name: string; count: number; value: number; fee: number }> = {};
      for (const l of open) { const k = key(l) || "Unspecified"; (m[k] ||= { name: k, count: 0, value: 0, fee: 0 }); m[k].count++; m[k].value += val(l.value_estimate); m[k].fee += Number(l.expected_fee || 0); }
      return Object.values(m).sort((a, b) => b.value - a.value);
    };
    const lostReasons: Record<string, number> = {};
    for (const l of lost) lostReasons[l.lost_reason || "Not recorded"] = (lostReasons[l.lost_reason || "Not recorded"] || 0) + 1;
    const rmPerf: Record<string, any> = {};
    for (const l of rows) {
      const k = l.rm || "Unassigned"; const r = (rmPerf[k] ||= { rm: k, open: 0, won: 0, lost: 0, pipelineValue: 0, expectedFee: 0, overdueActions: 0 });
      if (isWon(l.stage)) r.won++; else if (isLost(l.stage)) r.lost++; else { r.open++; r.pipelineValue += val(l.value_estimate); r.expectedFee += Number(l.expected_fee || 0); if (l.next_action_date && new Date(l.next_action_date) < new Date(new Date().toDateString())) r.overdueActions++; }
    }
    const noNextAction = open.filter(l => !l.next_action).length;
    res.json({
      kpis: {
        openOpportunities: open.length,
        pipelineValue: sum(open, l => val(l.value_estimate)),
        expectedFee: sum(open, l => Number(l.expected_fee || 0)),
        weightedFee: Math.round(sum(open, l => Number(l.expected_fee || 0) * prob(l))),
        mandatesWon: won.length, mandatesLost: lost.length,
        winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
        noNextAction,
      },
      stages: st.map(s => ({ id: s.stage_id, label: s.label, count: rows.filter(l => l.stage === s.stage_id).length, value: sum(rows.filter(l => l.stage === s.stage_id), l => val(l.value_estimate)) })),
      funnel,
      bySector: groupBy(l => l.sector),
      byType: groupBy(l => l.opportunity_type),
      lostReasons: Object.entries(lostReasons).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      rmPerformance: Object.values(rmPerf).sort((a: any, b: any) => b.expectedFee - a.expectedFee),
      myDay: {
        meetings: todayMeet.rows,
        actions: dueActions.rows,
        overdueTasks: overdue.rows,
        priority: open.filter(l => l.priority === "High" || l.priority === "Critical")
          .sort((a, b) => Number(b.expected_fee || 0) - Number(a.expected_fee || 0)).slice(0, 8)
          .map(l => ({ id: l.id, name: l.name, company: l.company, stage: st.find(x => x.stage_id === l.stage)?.label || l.stage, expected_fee: l.expected_fee, next_action: l.next_action, next_action_date: l.next_action_date })),
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
