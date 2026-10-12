import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";
import { aiComplete } from "./ai";

// Interactions (calls / meetings / notes / roadshows) and tasks (action items).
// Quick Log: type or dictate a few sentences → POST /parse turns it into a structured CRM update → POST / saves it.
export const interactionsRouter = Router();
export const tasksRouter = Router();
const UUID = /^[0-9a-f-]{36}$/i;
const TYPES = ["Call", "Meeting", "Note", "Email", "Roadshow", "Site Visit"];
const clean = (v: any) => (v === "" || v === undefined ? null : v);
const uuidOrNull = (v: any) => (v && UUID.test(String(v)) ? String(v) : null);

function isoDate(d: Date) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

// Rough date understanding for when the AI isn't configured ("by Friday", "next week", "tomorrow", "in 3 days")
function guessDate(text: string, now = new Date()): string | null {
  const t = text.toLowerCase();
  const d = new Date(now);
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (/\btomorrow\b/.test(t)) { d.setDate(d.getDate() + 1); return isoDate(d); }
  if (/\bnext week\b/.test(t)) { d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return isoDate(d); }
  const inN = t.match(/\bin (\d{1,2}) days?\b/); if (inN) { d.setDate(d.getDate() + +inN[1]); return isoDate(d); }
  for (let i = 0; i < 7; i++) if (new RegExp(`\\b${days[i]}\\b`).test(t)) { d.setDate(d.getDate() + (((i - d.getDay()) + 7) % 7 || 7)); return isoDate(d); }
  return null;
}

function heuristicParse(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const actionRe = /\b(will|to share|share|send|schedule|follow up|follow-up|call back|revert|prepare|arrange|set up|need to)\b/i;
  const actions = sentences.filter(s => actionRe.test(s)).map(s => ({ title: s.replace(/[.]$/, ""), owner: null, due_date: guessDate(s) }));
  return {
    title: sentences[0]?.slice(0, 120) || "Interaction",
    summary: text.trim(),
    key_points: sentences.filter(s => !actionRe.test(s)).slice(0, 6),
    opportunity_update: null as string | null,
    opportunity_type: (text.match(/\b(IPO|Pre-IPO|QIP|Private Placement|M&A|Rights Issue|Fundraising|OFS|Block)\b/i)?.[1] || null),
    transaction_size: (text.match(/₹?\s?([\d,.]+)\s?(crore|cr)\b/i)?.[0] || null),
    action_items: actions,
    next_follow_up: guessDate(text),
    ai: false,
  };
}

// ── Parse free text / dictation into Meeting Summary, Key Points, Opportunity Update, Action Items, Owner, Deadline ──
interactionsRouter.post("/parse", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (text.length < 5) return res.status(400).json({ error: "Say or type a little more first" });
  if (text.length > 20000) return res.status(400).json({ error: "Too long (max 20,000 characters)" });
  const today = isoDate(new Date());
  const weekday = new Date().toLocaleDateString("en-IN", { weekday: "long" });
  try {
    const users = (await query("SELECT name FROM users WHERE status='Active' ORDER BY name")).rows.map(r => r.name);
    const system = `You turn an investment banker's spoken or typed meeting note into a CRM update.
Today is ${weekday}, ${today} (Asia/Kolkata). Resolve relative dates ("Friday", "next week") to YYYY-MM-DD.
Team members: ${users.join(", ") || "unknown"}. The speaker is ${req.user!.name}; "we/I" means the speaker.
Return ONLY JSON:
{"title": "<short title, e.g. 'Meeting with ABC Ltd promoter'>",
 "summary": "<2-4 sentence meeting summary>",
 "key_points": ["<key discussion point>", ...],
 "opportunity_update": "<what changed for the deal/opportunity, or null>",
 "opportunity_type": "<IPO|Pre-IPO|QIP|Private Placement|Rights Issue|OFS / Block|M&A|Fundraising|Debt Raising|null>",
 "transaction_size": "<e.g. ₹500 Cr or null>",
 "action_items": [{"title": "<action>", "owner": "<team member name, 'Client' if the client owes it, or null>", "due_date": "<YYYY-MM-DD or null>"}],
 "next_follow_up": "<YYYY-MM-DD or null>"}
Do not invent facts that are not in the note.`;
    const out = await aiComplete(system, text).catch(() => null);
    if (!out) return res.json(heuristicParse(text));
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return res.json(heuristicParse(text));
    const j = JSON.parse(m[0]);
    return res.json({
      title: String(j.title || "").slice(0, 300) || heuristicParse(text).title,
      summary: j.summary || text,
      key_points: Array.isArray(j.key_points) ? j.key_points.map(String).slice(0, 12) : [],
      opportunity_update: j.opportunity_update || null,
      opportunity_type: j.opportunity_type || null,
      transaction_size: j.transaction_size || null,
      action_items: (Array.isArray(j.action_items) ? j.action_items : []).slice(0, 15).map((a: any) => ({
        title: String(a.title || "").slice(0, 400), owner: a.owner || null,
        due_date: /^\d{4}-\d{2}-\d{2}$/.test(String(a.due_date)) ? a.due_date : null,
      })).filter((a: any) => a.title),
      next_follow_up: /^\d{4}-\d{2}-\d{2}$/.test(String(j.next_follow_up)) ? j.next_follow_up : null,
      ai: true,
    });
  } catch {
    return res.json(heuristicParse(text));
  }
});

// ── List ──
interactionsRouter.get("/", async (req, res) => {
  const params: any[] = []; const where: string[] = [];
  for (const k of ["client_id", "lead_id", "deal_id"]) {
    const v = uuidOrNull(req.query[k]); if (v) { params.push(v); where.push(`i.${k} = $${params.length}`); }
  }
  if (req.query.unlinked === "1") where.push("i.client_id IS NULL");
  try {
    const r = await query(
      `SELECT i.*, c.name AS company FROM interactions i LEFT JOIN clients c ON c.id=i.client_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY i.occurred_at DESC LIMIT 200`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Users can be named loosely by the AI ("Rahul") — match to a real user
async function resolveOwner(name: any, fallback: { id: string; name: string }) {
  if (!name || /^client$/i.test(String(name))) return { id: null as string | null, name: name ? String(name) : fallback.name, ownerIsClient: !!name };
  const r = await query("SELECT id, name FROM users WHERE status='Active' AND (lower(name)=lower($1) OR lower(name) LIKE lower($1) || ' %' OR lower(email) LIKE lower($1) || '%') ORDER BY name LIMIT 1", [String(name).trim()]);
  return r.rows[0] ? { id: r.rows[0].id, name: r.rows[0].name, ownerIsClient: false } : { id: fallback.id, name: fallback.name, ownerIsClient: false };
}

export async function saveInteraction(b: any, user: { id: string | null; name: string; role?: string }) {
  const lead = uuidOrNull(b.lead_id) ? (await query("SELECT id, client_id, vertical FROM leads WHERE id=$1", [b.lead_id])).rows[0] : null;
  const clientId = uuidOrNull(b.client_id) || lead?.client_id || null;
  let vertical = clean(b.vertical) || lead?.vertical || null;
  if (!vertical && clientId) {
    const v = (await query("SELECT vertical FROM client_verticals WHERE client_id=$1 ORDER BY (vertical='ib') DESC LIMIT 1", [clientId])).rows[0]?.vertical;
    vertical = ({ retail: "Retail Broking", corporate: "Corporate Broking", ib: "Investment Banking", aif: "AIF", ie: "Institutional Equities" } as any)[v] || null;
  }
  const r = await query(
    `INSERT INTO interactions (type, occurred_at, client_id, lead_id, deal_id, vertical, title, summary, key_points, opportunity_update,
        raw_text, next_follow_up, source, external_id, external_url, attendees, created_by, created_by_name)
     VALUES ($1,COALESCE($2::timestamptz, NOW()),$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18)
     ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [TYPES.includes(b.type) ? b.type : "Meeting", clean(b.occurred_at), clientId, lead?.id || null, uuidOrNull(b.deal_id), vertical,
     clean(b.title), clean(b.summary), JSON.stringify(Array.isArray(b.key_points) ? b.key_points : []), clean(b.opportunity_update),
     clean(b.raw_text), clean(b.next_follow_up), clean(b.source) || "manual", clean(b.external_id), clean(b.external_url),
     JSON.stringify(Array.isArray(b.attendees) ? b.attendees : []), user.id, user.name],
  );
  const it = r.rows[0];
  if (!it) return null; // duplicate external event
  const fallback = { id: user.id as string, name: user.name };
  const created: any[] = [];
  for (const a of Array.isArray(b.action_items) ? b.action_items : []) {
    if (!String(a?.title || "").trim()) continue;
    const owner = a.owner_id && UUID.test(a.owner_id)
      ? { id: a.owner_id, name: (await query("SELECT name FROM users WHERE id=$1", [a.owner_id])).rows[0]?.name || user.name }
      : await resolveOwner(a.owner, fallback);
    const t = await query(
      `INSERT INTO tasks (title, due_date, priority, owner_id, owner_name, client_id, lead_id, deal_id, interaction_id, vertical, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [String(a.title).trim().slice(0, 400), clean(a.due_date), a.priority || "Medium", owner.id, owner.name, clientId, lead?.id || null,
       uuidOrNull(b.deal_id), it.id, vertical, user.id, user.name],
    );
    created.push(t.rows[0]);
  }
  // Keep the opportunity's "next action" current
  if (lead && (b.next_action || b.next_follow_up)) {
    const na = b.next_action || created[0]?.title || "Follow up";
    await query("UPDATE leads SET next_action=$1, next_action_date=COALESCE($2::date, next_action_date), updated_at=NOW() WHERE id=$3",
      [String(na).slice(0, 300), clean(b.next_follow_up) || created[0]?.due_date || null, lead.id]);
  }
  await logAudit({ entityType: "interaction", entityId: it.id, action: "CREATE", userId: user.id, userName: user.name, userRole: user.role || null as any, recordDisplay: it.title || it.type, after: it });
  return { ...it, tasks: created };
}

interactionsRouter.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.summary || b.title || "").trim()) return res.status(400).json({ error: "Add a summary first" });
    const out = await saveInteraction(b, { id: req.user!.id, name: req.user!.name, role: req.user!.role });
    res.status(201).json(out);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

interactionsRouter.patch("/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const r = await query(
      `UPDATE interactions SET client_id=COALESCE($1,client_id), lead_id=COALESCE($2,lead_id), title=COALESCE($3,title), summary=COALESCE($4,summary)
        WHERE id=$5 RETURNING *`,
      [uuidOrNull(b.client_id), uuidOrNull(b.lead_id), clean(b.title), clean(b.summary), req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
    if (uuidOrNull(b.client_id)) await query("UPDATE tasks SET client_id=$1 WHERE interaction_id=$2 AND client_id IS NULL", [b.client_id, req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Tasks ──
tasksRouter.get("/", async (req, res) => {
  const params: any[] = []; const where: string[] = [];
  if (req.query.mine === "1") { params.push(req.user!.id); where.push(`t.owner_id = $${params.length}`); }
  if (req.query.status) { params.push(String(req.query.status)); where.push(`t.status = $${params.length}`); }
  for (const k of ["client_id", "lead_id", "deal_id"]) {
    const v = uuidOrNull(req.query[k]); if (v) { params.push(v); where.push(`t.${k} = $${params.length}`); }
  }
  if (req.query.due === "overdue") where.push("t.status='Open' AND t.due_date < CURRENT_DATE");
  try {
    const r = await query(
      `SELECT t.*, c.name AS company FROM tasks t LEFT JOIN clients c ON c.id=t.client_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY (t.status='Done'), t.due_date NULLS LAST, t.created_at DESC LIMIT 300`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

tasksRouter.post("/", async (req, res) => {
  const b = req.body || {};
  if (!String(b.title || "").trim()) return res.status(400).json({ error: "Task title is required" });
  try {
    const ownerId = uuidOrNull(b.owner_id) || req.user!.id;
    const ownerName = (await query("SELECT name FROM users WHERE id=$1", [ownerId])).rows[0]?.name || req.user!.name;
    const r = await query(
      `INSERT INTO tasks (title, due_date, priority, owner_id, owner_name, client_id, lead_id, deal_id, vertical, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [String(b.title).trim().slice(0, 400), clean(b.due_date), clean(b.priority) || "Medium", ownerId, ownerName,
       uuidOrNull(b.client_id), uuidOrNull(b.lead_id), uuidOrNull(b.deal_id), clean(b.vertical), req.user!.id, req.user!.name]);
    if (ownerId !== req.user!.id) {
      await query("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'task_assigned','New task assigned',$2,'task',$3)",
        [ownerId, `${req.user!.name}: ${String(b.title).slice(0, 180)}`, r.rows[0].id]).catch(() => {});
    }
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

tasksRouter.patch("/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const status = b.status === "Done" || b.status === "Open" ? b.status : null;
    const r = await query(
      `UPDATE tasks SET status=COALESCE($1,status), completed_at=CASE WHEN $1='Done' THEN NOW() WHEN $1='Open' THEN NULL ELSE completed_at END,
         due_date=COALESCE($2::date,due_date), title=COALESCE($3,title), priority=COALESCE($4,priority) WHERE id=$5 RETURNING *`,
      [status, clean(b.due_date), clean(b.title), clean(b.priority), req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
