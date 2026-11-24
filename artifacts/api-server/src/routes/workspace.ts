import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";
import { visibleNames } from "../lib/visibility";
import { saveInteraction } from "./interactions";
import { logTaskEvent } from "../lib/taskEvents";

// ─── My Workspace ─────────────────────────────────────────────────────────────
// One page per representative: everything they have to do (tasks, opportunity follow-ups, reminders, meetings),
// their open opportunities with the latest update, and a quick way to record a new update.
//   GET  /api/workspace/summary            tiles
//   GET  /api/workspace/todo               unified to-do list (filters: from, to, type, priority, vertical, status, search)
//   GET  /api/workspace/opportunities      my open opportunities + deals with last update / next action
//   GET  /api/workspace/updates            my recent updates
//   POST /api/workspace/update             record an update against an opportunity / deal (+ next action, optional task)
//   POST /api/workspace/reminders          personal reminder with date + time (notified when due)
//   POST /api/workspace/followups/:leadId  reschedule / mark done an opportunity follow-up
// Managers (admin / head / manager roles) can open a team member's workspace with ?user=<id>.
export const workspaceRouter = Router();
const UUID = /^[0-9a-f-]{36}$/i;
const clean = (v: any) => { const s = typeof v === "string" ? v.trim() : v; return s === "" || s === undefined || s === null ? null : s; };
const MANAGER = /(super admin|admin|head|manager|director|ceo)/i;
const OPEN_LEAD = `COALESCE(l.status,'Active') NOT IN ('Won','Lost','Closed') AND l.stage <> 'deleted'
  AND NOT EXISTS (SELECT 1 FROM pipeline_stages ps WHERE ps.entity='lead' AND ps.stage_id=l.stage AND (ps.is_won OR ps.is_lost))`;
const OPEN_DEAL = `d.stage <> 'deleted' AND NOT EXISTS (SELECT 1 FROM pipeline_stages ps WHERE ps.entity='deal' AND ps.stage_id=d.stage AND (ps.is_won OR ps.is_lost))`;
const STALE_DAYS = 14;

/** Whose workspace: the signed-in user, or (for managers) the team member asked for. */
async function whoFor(req: any): Promise<{ id: string; name: string; self: boolean }> {
  const ask = String(req.query.user || req.body?.user || "");
  if (ask && UUID.test(ask) && ask !== req.user.id) {
    if (!MANAGER.test(String(req.user.role || ""))) throw Object.assign(new Error("Only managers can open another person's workspace"), { status: 403 });
    const u = (await query("SELECT id, name FROM users WHERE id=$1", [ask])).rows[0];
    if (!u) throw Object.assign(new Error("User not found"), { status: 404 });
    return { id: u.id, name: u.name, self: false };
  }
  return { id: req.user.id, name: req.user.name, self: true };
}
const fail = (res: any, e: any) => res.status(e.status || 500).json({ error: e.message });

// ── Reminders: tasks with a time; a notification is sent when they fall due ──
async function remindDue() {
  try {
    const due = (await query(
      `UPDATE tasks SET reminded_at=NOW() WHERE status='Open' AND remind_at IS NOT NULL AND remind_at <= NOW() AND reminded_at IS NULL
        RETURNING id, owner_id, title, remind_at`)).rows;
    for (const t of due) {
      if (!t.owner_id) continue;
      await query("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'reminder','Reminder',$2,'task',$3)",
        [t.owner_id, String(t.title).slice(0, 250), t.id]).catch(() => {});
    }
  } catch { /* table not ready yet at first start */ }
}
setInterval(remindDue, 60_000);

// ── Summary tiles ──
workspaceRouter.get("/summary", async (req, res) => {
  try {
    const who = await whoFor(req); const names = await visibleNames();
    const todo = await buildTodo(who, names, { status: "open", type: "task,reminder,follow_up" });
    const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
    const week = new Date(Date.now() + 5.5 * 3600000 + 7 * 86400000).toISOString().slice(0, 10);
    const f = (await query(
      `SELECT COUNT(*) FILTER (WHERE l.next_action_date IS NULL OR COALESCE(l.next_action,'') = '') AS no_next,
              COUNT(*) FILTER (WHERE COALESCE((SELECT MAX(i.occurred_at) FROM interactions i WHERE i.lead_id=l.id), l.updated_at, l.created_at) < NOW() - INTERVAL '${STALE_DAYS} days') AS stale,
              COUNT(*) AS open
         FROM leads l WHERE (l.assigned_rm_id=$1 OR (l.assigned_rm_id IS NULL AND l.created_by=$1)) AND l.vertical = ANY($2) AND ${OPEN_LEAD}`, [who.id, names])).rows[0];
    const m = (await query(
      `SELECT COUNT(*) AS n FROM meetings WHERE (organizer_id=$1 OR created_by=$1) AND start_at::date = CURRENT_DATE AND COALESCE(status,'') <> 'cancelled'`, [who.id])).rows[0];
    const n = (x: any) => Number(x) || 0;
    res.json({
      user: { id: who.id, name: who.name, self: who.self },
      overdue: todo.filter(x => x.date && x.date < today).length, today: todo.filter(x => x.date === today).length,
      week: todo.filter(x => x.date && x.date > today && x.date <= week).length, no_date: todo.filter(x => !x.date).length,
      meetings_today: n(m.n), open_tasks: todo.filter(x => x.kind !== "follow_up").length, open_opportunities: n(f.open), needs_update: n(f.stale), no_next_action: n(f.no_next),
    });
  } catch (e) { fail(res, e); }
});

// ── Unified to-do list ──
// kinds: task, reminder, follow_up (opportunity next action), meeting
async function buildTodo(who: { id: string }, names: string[], q: Record<string, string>): Promise<any[]> {
    const status = q.status === "done" ? "done" : q.status === "all" ? "all" : "open";
    const from = /^\d{4}-\d{2}-\d{2}$/.test(q.from || "") ? q.from : null;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(q.to || "") ? q.to : null;
    const kinds = String(q.type || "").split(",").filter(Boolean);
    const want = (k: string) => !kinds.length || kinds.includes(k);
    const items: any[] = [];

    if (want("task") || want("reminder")) {
      const p: any[] = [who.id]; const w = ["t.owner_id=$1"];
      if (status === "open") w.push("t.status='Open'"); else if (status === "done") w.push("t.status='Done'");
      if (from) { p.push(from); w.push(`COALESCE(t.due_date, t.remind_at::date) >= $${p.length}::date`); }
      if (to) { p.push(to); w.push(`COALESCE(t.due_date, t.remind_at::date) <= $${p.length}::date`); }
      if (!want("task")) w.push("t.remind_at IS NOT NULL"); if (!want("reminder")) w.push("t.remind_at IS NULL");
      const r = await query(
        `SELECT t.*, c.name AS client_name, l.name AS lead_name, l.lead_code, l.vertical AS lead_vertical, d.name AS deal_name, d.deal_code
           FROM tasks t LEFT JOIN clients c ON c.id=t.client_id LEFT JOIN leads l ON l.id=t.lead_id LEFT JOIN deals d ON d.id=t.deal_id
          WHERE ${w.join(" AND ")} ORDER BY t.due_date NULLS LAST LIMIT 500`, p);
      for (const t of r.rows) items.push({
        key: `task:${t.id}`, kind: t.remind_at ? "reminder" : "task", id: t.id, title: t.title, notes: t.notes,
        date: t.due_date ? String(t.due_date instanceof Date ? t.due_date.toISOString() : t.due_date).slice(0, 10) : t.remind_at ? new Date(t.remind_at).toISOString().slice(0, 10) : null,
        time: t.remind_at ? new Date(t.remind_at).toISOString() : null, priority: t.priority || "Medium", done: t.status === "Done", completed_at: t.completed_at,
        vertical: t.vertical || t.lead_vertical, client_id: t.client_id, client_name: t.client_name, lead_id: t.lead_id, lead_name: t.lead_name, lead_code: t.lead_code,
        deal_id: t.deal_id, deal_name: t.deal_name, deal_code: t.deal_code, created_by_name: t.created_by_name,
      });
    }
    if (want("follow_up") && status !== "done") {
      const p: any[] = [who.id, names]; const w = [`(l.assigned_rm_id=$1 OR (l.assigned_rm_id IS NULL AND l.created_by=$1))`, "l.vertical = ANY($2)", OPEN_LEAD,
        "(l.next_action_date IS NOT NULL OR COALESCE(l.next_action,'') <> '')"];
      if (from) { p.push(from); w.push(`l.next_action_date >= $${p.length}::date`); }
      if (to) { p.push(to); w.push(`l.next_action_date <= $${p.length}::date`); }
      const r = await query(
        `SELECT l.id, l.name, l.lead_code, l.vertical, COALESCE((SELECT ps.label FROM pipeline_stages ps WHERE ps.entity='lead' AND ps.stage_id=l.stage ORDER BY ps.vertical LIMIT 1), l.stage) AS stage, l.priority, l.next_action, l.next_action_date, l.client_id, c.name AS client_name, l.value_estimate,
                (SELECT row_to_json(x) FROM (SELECT i.type, i.occurred_at, COALESCE(i.opportunity_update, i.summary, i.title) AS text FROM interactions i WHERE i.lead_id=l.id ORDER BY i.occurred_at DESC LIMIT 1) x) AS last_update
           FROM leads l LEFT JOIN clients c ON c.id=l.client_id WHERE ${w.join(" AND ")} ORDER BY l.next_action_date NULLS LAST LIMIT 500`, p);
      // an open task for the same opportunity and the same action already covers the follow-up — don't list it twice
      const openTasks = want("task") ? items : (await query("SELECT lead_id, title, 'task' AS kind, false AS done FROM tasks WHERE owner_id=$1 AND status='Open' AND lead_id IS NOT NULL", [who.id])).rows;
      const taskKey = new Set(openTasks.filter((x: any) => (x.kind === "task" || x.kind === "reminder") && !x.done && x.lead_id).map((x: any) => `${x.lead_id}|${String(x.title).trim().toLowerCase()}`));
      for (const l of r.rows) if (!taskKey.has(`${l.id}|${String(l.next_action || "Follow up").trim().toLowerCase()}`)) items.push({
        key: `fu:${l.id}`, kind: "follow_up", id: l.id, title: l.next_action || "Follow up", date: l.next_action_date ? String(l.next_action_date instanceof Date ? l.next_action_date.toISOString() : l.next_action_date).slice(0, 10) : null,
        priority: l.priority || "Medium", done: false, vertical: l.vertical, client_id: l.client_id, client_name: l.client_name, lead_id: l.id, lead_name: l.name, lead_code: l.lead_code,
        stage: l.stage, value: l.value_estimate, last_update: l.last_update,
      });
    }
    if (want("meeting") && status !== "done") {
      const p: any[] = [who.id]; const w = ["(m.organizer_id=$1 OR m.created_by=$1)", "COALESCE(m.status,'') <> 'cancelled'"];
      p.push(from || new Date(Date.now() - 86400000).toISOString().slice(0, 10)); w.push(`m.start_at::date >= $${p.length}::date`);
      if (to) { p.push(to); w.push(`m.start_at::date <= $${p.length}::date`); }
      const r = await query(
        `SELECT m.id, m.title, m.start_at, m.end_at, m.join_url, m.client_id, c.name AS client_name, m.lead_id, l.name AS lead_name, l.lead_code, m.vertical
           FROM meetings m LEFT JOIN clients c ON c.id=m.client_id LEFT JOIN leads l ON l.id=m.lead_id WHERE ${w.join(" AND ")} ORDER BY m.start_at LIMIT 200`, p);
      for (const m of r.rows) items.push({
        key: `mt:${m.id}`, kind: "meeting", id: m.id, title: m.title || "Meeting", date: new Date(m.start_at).toISOString().slice(0, 10), time: new Date(m.start_at).toISOString(),
        end: m.end_at, join_url: m.join_url, priority: "Medium", done: false, vertical: m.vertical, client_id: m.client_id, client_name: m.client_name,
        lead_id: m.lead_id, lead_name: m.lead_name, lead_code: m.lead_code,
      });
    }

    // filters that apply to every kind
    let out = items;
    if (q.priority) out = out.filter(x => String(x.priority).toLowerCase() === q.priority.toLowerCase());
    if (q.vertical) out = out.filter(x => x.vertical === q.vertical);
    if (q.search) {
      const s = q.search.toLowerCase();
      out = out.filter(x => [x.title, x.notes, x.client_name, x.lead_name, x.lead_code, x.deal_name, x.deal_code, x.last_update?.text].some(v => String(v || "").toLowerCase().includes(s)));
    }
    const rank = (x: any) => (x.done ? 1 : 0);
    out.sort((a, b) => rank(a) - rank(b) || String(a.date || "9999").localeCompare(String(b.date || "9999")) || String(a.time || "").localeCompare(String(b.time || "")));
    return out;
}

workspaceRouter.get("/todo", async (req, res) => {
  try {
    const who = await whoFor(req);
    const out = await buildTodo(who, await visibleNames(), req.query as Record<string, string>);
    res.json({ user: { id: who.id, name: who.name, self: who.self }, items: out });
  } catch (e) { fail(res, e); }
});

// ── My open opportunities and deals, with the latest update ──
workspaceRouter.get("/opportunities", async (req, res) => {
  try {
    const who = await whoFor(req); const names = await visibleNames();
    const q = req.query as Record<string, string>;
    const p: any[] = [who.id, names]; const w = [`(l.assigned_rm_id=$1 OR (l.assigned_rm_id IS NULL AND l.created_by=$1))`, "l.vertical = ANY($2)", OPEN_LEAD];
    if (q.vertical) { p.push(q.vertical); w.push(`l.vertical=$${p.length}`); }
    if (q.search) { p.push(`%${q.search}%`); w.push(`(l.name ILIKE $${p.length} OR l.lead_code ILIKE $${p.length} OR c.name ILIKE $${p.length} OR l.next_action ILIKE $${p.length})`); }
    const leads = (await query(
      `SELECT 'lead' AS kind, l.id, l.lead_code AS code, l.name, l.vertical,
              COALESCE((SELECT ps.label FROM pipeline_stages ps WHERE ps.entity='lead' AND ps.stage_id=l.stage ORDER BY ps.vertical LIMIT 1), l.stage) AS stage, l.priority, l.value_estimate AS value, l.next_action, l.next_action_date, l.expected_close,
              l.client_id, c.name AS client_name, l.updated_at, l.created_at,
              lu.type AS last_type, lu.occurred_at AS last_at, lu.text AS last_text, lu.by AS last_by,
              (SELECT COUNT(*)::int FROM tasks t WHERE t.lead_id=l.id AND t.status='Open') AS open_tasks
         FROM leads l LEFT JOIN clients c ON c.id=l.client_id
         LEFT JOIN LATERAL (SELECT i.type, i.occurred_at, COALESCE(i.opportunity_update, i.summary, i.title) AS text, i.created_by_name AS by
                              FROM interactions i WHERE i.lead_id=l.id ORDER BY i.occurred_at DESC LIMIT 1) lu ON TRUE
        WHERE ${w.join(" AND ")}`, p)).rows;
    const pd: any[] = [who.id, names]; const wd = ["d.rm_id=$1", "d.vertical = ANY($2)", OPEN_DEAL];
    if (q.vertical) { pd.push(q.vertical); wd.push(`d.vertical=$${pd.length}`); }
    if (q.search) { pd.push(`%${q.search}%`); wd.push(`(d.name ILIKE $${pd.length} OR d.deal_code ILIKE $${pd.length} OR c.name ILIKE $${pd.length})`); }
    const deals = (await query(
      `SELECT 'deal' AS kind, d.id, d.deal_code AS code, d.name, d.vertical,
              COALESCE((SELECT ps.label FROM pipeline_stages ps WHERE ps.entity='deal' AND ps.stage_id=d.stage ORDER BY ps.vertical LIMIT 1), d.stage) AS stage, NULL AS priority, d.value, NULL AS next_action,
              (SELECT MIN(t.due_date) FROM tasks t WHERE t.deal_id=d.id AND t.status='Open') AS next_action_date, d.expected_close,
              d.client_id, c.name AS client_name, d.updated_at, d.created_at,
              lu.type AS last_type, lu.occurred_at AS last_at, lu.text AS last_text, lu.by AS last_by,
              (SELECT COUNT(*)::int FROM tasks t WHERE t.deal_id=d.id AND t.status='Open') AS open_tasks
         FROM deals d LEFT JOIN clients c ON c.id=d.client_id
         LEFT JOIN LATERAL (SELECT i.type, i.occurred_at, COALESCE(i.opportunity_update, i.summary, i.title) AS text, i.created_by_name AS by
                              FROM interactions i WHERE i.deal_id=d.id ORDER BY i.occurred_at DESC LIMIT 1) lu ON TRUE
        WHERE ${wd.join(" AND ")}`, pd)).rows;
    // next action for a deal = its earliest open task
    for (const d of deals) if (d.next_action_date) d.next_action = (await query("SELECT title FROM tasks WHERE deal_id=$1 AND status='Open' ORDER BY due_date NULLS LAST LIMIT 1", [d.id])).rows[0]?.title || null;
    const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
    let rows = [...leads, ...deals].map((r: any) => {
      const last = new Date(r.last_at || r.updated_at || r.created_at).getTime();
      const idle = Math.floor((Date.now() - last) / 86400000);
      const nd = r.next_action_date ? new Date(String(r.next_action_date instanceof Date ? r.next_action_date.toISOString() : r.next_action_date).slice(0, 10)).getTime() : null;
      const flags = [nd !== null && nd < today ? "overdue" : "", !r.next_action && nd === null ? "no_next" : "", idle >= STALE_DAYS ? "stale" : ""].filter(Boolean);
      return { ...r, idle_days: idle, flags };
    });
    if (q.attention === "1") rows = rows.filter(r => r.flags.length);
    const sort = q.sort || "next";
    rows.sort((a: any, b: any) => sort === "idle" ? b.idle_days - a.idle_days
      : sort === "name" ? String(a.name).localeCompare(String(b.name))
      : String(a.next_action_date ? new Date(a.next_action_date).toISOString() : "9999").localeCompare(String(b.next_action_date ? new Date(b.next_action_date).toISOString() : "9999")));
    res.json({ user: { id: who.id, name: who.name, self: who.self }, data: rows, stale_days: STALE_DAYS });
  } catch (e) { fail(res, e); }
});

// ── Updates history (mine, or for one opportunity / deal) ──
workspaceRouter.get("/updates", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const p: any[] = []; const w: string[] = [];
    if (UUID.test(q.lead_id || "")) { p.push(q.lead_id); w.push(`i.lead_id=$${p.length}`); }
    else if (UUID.test(q.deal_id || "")) { p.push(q.deal_id); w.push(`i.deal_id=$${p.length}`); }
    else { const who = await whoFor(req); p.push(who.id); w.push(`i.created_by=$${p.length}`); }
    if (q.search) { p.push(`%${q.search}%`); w.push(`(i.title ILIKE $${p.length} OR i.summary ILIKE $${p.length} OR i.opportunity_update ILIKE $${p.length} OR l.name ILIKE $${p.length} OR c.name ILIKE $${p.length})`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.from || "")) { p.push(q.from); w.push(`i.occurred_at::date >= $${p.length}::date`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.to || "")) { p.push(q.to); w.push(`i.occurred_at::date <= $${p.length}::date`); }
    p.push(await visibleNames()); w.push(`(i.vertical IS NULL OR i.vertical = ANY($${p.length}))`);
    const r = await query(
      `SELECT i.id, i.type, i.occurred_at, i.title, i.summary, i.opportunity_update, i.next_follow_up, i.created_by_name, i.vertical,
              i.lead_id, l.name AS lead_name, l.lead_code, i.deal_id, d.name AS deal_name, d.deal_code, i.client_id, c.name AS client_name
         FROM interactions i LEFT JOIN leads l ON l.id=i.lead_id LEFT JOIN deals d ON d.id=i.deal_id LEFT JOIN clients c ON c.id=i.client_id
        WHERE ${w.join(" AND ")} ORDER BY i.occurred_at DESC LIMIT ${q.lead_id || q.deal_id ? 20 : 200}`, p);
    res.json({ data: r.rows });
  } catch (e) { fail(res, e); }
});

// ── Record the latest update against an opportunity / deal ──
workspaceRouter.post("/update", async (req, res) => {
  try {
    const b = req.body || {};
    const text = String(b.update || "").trim();
    if (!text) return res.status(400).json({ error: "Write what happened" });
    const names = await visibleNames();
    let lead: any = null, deal: any = null;
    if (UUID.test(String(b.lead_id || ""))) lead = (await query("SELECT id, name, client_id, vertical FROM leads WHERE id=$1", [b.lead_id])).rows[0];
    else if (UUID.test(String(b.deal_id || ""))) deal = (await query("SELECT id, name, client_id, vertical FROM deals WHERE id=$1", [b.deal_id])).rows[0];
    const rec = lead || deal;
    if (!rec) return res.status(400).json({ error: "Choose the opportunity or deal" });
    if (!names.includes(rec.vertical)) return res.status(404).json({ error: "Not found" });
    const nextDate = /^\d{4}-\d{2}-\d{2}$/.test(String(b.next_date || "")) ? b.next_date : null;
    const nextAction = clean(b.next_action);
    if (lead && !nextAction && !b.no_next) return res.status(400).json({ error: "Add the next action (or tick 'No next action')" });
    const it = await saveInteraction({
      type: b.type, occurred_at: clean(b.occurred_at), lead_id: lead?.id, deal_id: deal?.id, client_id: rec.client_id, vertical: rec.vertical,
      title: `${b.type || "Update"} — ${rec.name}`.slice(0, 200), summary: text, opportunity_update: text,
      next_follow_up: nextDate, next_action: nextAction, source: "workspace",
      action_items: deal && nextAction ? [{ title: nextAction, due_date: nextDate, owner_id: req.user!.id }] : [],
    }, { id: req.user!.id, name: req.user!.name, role: req.user!.role });
    // a follow-up task linked to this opportunity, if asked (deals always get one for their next action)
    let task: any = null;
    if (lead && b.create_task && nextAction) {
      task = (await query(
        `INSERT INTO tasks (title, due_date, priority, owner_id, owner_name, client_id, lead_id, vertical, created_by, created_by_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$4,$5) RETURNING *`,
        [nextAction.slice(0, 400), nextDate, clean(b.priority) || "Medium", req.user!.id, req.user!.name, rec.client_id, lead.id, rec.vertical])).rows[0];
      await logTaskEvent(task.id, "created", { id: req.user!.id, name: req.user!.name }, { to: nextDate ? `Due ${nextDate}` : null, comment: `From an update on ${rec.name}` });
    }
    if (lead && b.no_next) await query("UPDATE leads SET next_action=NULL, next_action_date=NULL, updated_at=NOW() WHERE id=$1", [lead.id]);
    // a follow-up the user completed from the to-do list: close the task it came from
    if (UUID.test(String(b.done_task_id || ""))) {
      const done = await query("UPDATE tasks SET status='Done', completed_at=NOW(), completion_note=$3, completed_by_name=$4 WHERE id=$1 AND owner_id=$2 AND status='Open' RETURNING id", [b.done_task_id, req.user!.id, `Update recorded: ${text}`.slice(0, 2000), req.user!.name]);
      if (done.rows[0]) await logTaskEvent(b.done_task_id, "completed", { id: req.user!.id, name: req.user!.name }, { comment: `Update recorded on ${rec.name}: ${text}` });
    }
    res.status(201).json({ interaction: it, task });
  } catch (e) { fail(res, e); }
});

// ── Personal reminder (date + time) ──
workspaceRouter.post("/reminders", async (req, res) => {
  try {
    const b = req.body || {};
    const title = String(b.title || "").trim();
    if (!title) return res.status(400).json({ error: "What should we remind you about?" });
    const at = new Date(String(b.remind_at || ""));
    if (isNaN(at.getTime())) return res.status(400).json({ error: "Pick the date and time" });
    const istDate = new Date(at.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
    const r = await query(
      `INSERT INTO tasks (title, notes, due_date, remind_at, priority, owner_id, owner_name, client_id, lead_id, deal_id, vertical, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$6,$7) RETURNING *`,
      [title.slice(0, 400), clean(b.notes), istDate, at.toISOString(), clean(b.priority) || "Medium", req.user!.id, req.user!.name,
       UUID.test(String(b.client_id || "")) ? b.client_id : null, UUID.test(String(b.lead_id || "")) ? b.lead_id : null, UUID.test(String(b.deal_id || "")) ? b.deal_id : null, clean(b.vertical)]);
    await logTaskEvent(r.rows[0].id, "created", { id: req.user!.id, name: req.user!.name }, { to: `Reminder ${at.toISOString()}` });
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, e); }
});

// ── Task / reminder edits: done (comment required), reopen (reason required), reschedule, edit — every change goes to the task trail ──
const dstr = (d: any) => (d ? String(d instanceof Date ? d.toISOString() : d).slice(0, 10) : null);
async function canEditTask(t: any, user: any) {
  return t.owner_id === user.id || t.created_by === user.id || MANAGER.test(String(user.role || ""));
}
workspaceRouter.patch("/tasks/:id", async (req, res) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body || {};
    const t = (await query("SELECT * FROM tasks WHERE id=$1", [req.params.id])).rows[0];
    if (!t) return res.status(404).json({ error: "Not found" });
    if (!(await canEditTask(t, req.user))) return res.status(403).json({ error: "Not your task" });
    const by = { id: req.user!.id, name: req.user!.name };
    const comment = clean(b.comment);
    const sets: string[] = []; const p: any[] = [t.id]; const events: [any, any][] = [];
    const set = (sql: string, v: any) => { p.push(v); sets.push(sql.replace("?", `$${p.length}`)); };
    if (b.status === "Done" && t.status !== "Done") {
      if (!comment || comment.length < 3) return res.status(400).json({ error: "Add a short comment on how it was completed" });
      sets.push("status='Done'", "completed_at=NOW()"); set("completion_note=?", comment); set("completed_by_name=?", req.user!.name);
      events.push(["completed", { comment }]);
    }
    if (b.status === "Open" && t.status === "Done") {
      if (!comment) return res.status(400).json({ error: "Say why the task is being reopened" });
      sets.push("status='Open'", "completed_at=NULL");
      events.push(["reopened", { comment }]);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(b.due_date || "")) && b.due_date !== dstr(t.due_date) && !b.remind_at) {
      set("due_date=?::date", b.due_date); events.push(["rescheduled", { from: dstr(t.due_date), to: b.due_date, comment }]);
    }
    if (b.remind_at) {
      const at = new Date(b.remind_at);
      if (!isNaN(at.getTime())) { set("remind_at=?", at.toISOString()); sets.push("reminded_at=NULL"); set("due_date=?::date", new Date(at.getTime() + 5.5 * 3600000).toISOString().slice(0, 10));
        events.push(["rescheduled", { from: t.remind_at ? new Date(t.remind_at).toISOString() : dstr(t.due_date), to: at.toISOString(), comment }]); }
    }
    if ("notes" in b && clean(b.notes) !== (t.notes || null)) { set("notes=?", clean(b.notes)); events.push(["edited", { from: `Notes: ${t.notes || "—"}`, to: `Notes: ${clean(b.notes) || "—"}` }]); }
    if (clean(b.title) && String(b.title).trim() !== t.title) { set("title=?", String(b.title).trim().slice(0, 400)); events.push(["edited", { from: `Title: ${t.title}`, to: `Title: ${String(b.title).trim()}` }]); }
    if (["High", "Medium", "Low", "Critical"].includes(b.priority) && b.priority !== t.priority) { set("priority=?", b.priority); events.push(["edited", { from: `Priority: ${t.priority}`, to: `Priority: ${b.priority}` }]); }
    if (UUID.test(String(b.owner_id || "")) && b.owner_id !== t.owner_id) {
      const o = (await query("SELECT id, name FROM users WHERE id=$1", [b.owner_id])).rows[0];
      if (o) { set("owner_id=?", o.id); set("owner_name=?", o.name); events.push(["reassigned", { from: t.owner_name, to: o.name, comment }]);
        await query("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'task_assigned','Task assigned to you',$2,'task',$3)",
          [o.id, `${req.user!.name}: ${t.title}`.slice(0, 250), t.id]).catch(() => {}); }
    }
    if (!sets.length && comment && b.status === undefined) { await logTaskEvent(t.id, "comment", by, { comment }); return res.json(t); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to change" });
    const r = await query(`UPDATE tasks SET ${sets.join(", ")} WHERE id=$1 RETURNING *`, p);
    for (const [action, o] of events) await logTaskEvent(t.id, action, by, o);
    res.json(r.rows[0]);
  } catch (e) { fail(res, e); }
});

// ── One task in detail, with its full trail ──
workspaceRouter.get("/tasks/:id", async (req, res) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
    const t = (await query(
      `SELECT t.*, c.name AS client_name, c.client_code, l.name AS lead_name, l.lead_code, l.vertical AS lead_vertical, l.stage AS lead_stage,
              d.name AS deal_name, d.deal_code, p.name AS person_name
         FROM tasks t LEFT JOIN clients c ON c.id=t.client_id LEFT JOIN leads l ON l.id=t.lead_id LEFT JOIN deals d ON d.id=t.deal_id
         LEFT JOIN company_people p ON p.id=t.person_id WHERE t.id=$1`, [req.params.id])).rows[0];
    if (!t) return res.status(404).json({ error: "Not found" });
    const names = await visibleNames();
    const mine = t.owner_id === req.user!.id || t.created_by === req.user!.id;
    if (!mine && !MANAGER.test(String(req.user!.role || "")) && t.vertical && !names.includes(t.vertical)) return res.status(404).json({ error: "Not found" });
    const ev = (await query("SELECT * FROM task_events WHERE task_id=$1 ORDER BY at", [t.id])).rows;
    // tasks created before the trail existed: show their creation / completion from the task itself
    const trail = [...ev];
    if (!ev.some((e: any) => e.action === "created")) trail.unshift({ action: "created", at: t.created_at, by_name: t.created_by_name, to_value: t.due_date ? `Due ${dstr(t.due_date)}` : null, synthetic: true });
    if (t.status === "Done" && !ev.some((e: any) => e.action === "completed")) trail.push({ action: "completed", at: t.completed_at, by_name: t.completed_by_name || t.owner_name, comment: t.completion_note, synthetic: true });
    const late = t.status === "Done" && t.due_date && t.completed_at && dstr(t.completed_at)! > dstr(t.due_date)!;
    res.json({ ...t, kind: t.remind_at ? "reminder" : "task", can_edit: await canEditTask(t, req.user), completed_late: !!late, trail });
  } catch (e) { fail(res, e); }
});

// ── Task history: all my tasks (open and completed), any period ──
workspaceRouter.get("/task-history", async (req, res) => {
  try {
    const who = await whoFor(req);
    const q = req.query as Record<string, string>;
    const p: any[] = [who.id]; const w = ["(t.owner_id=$1 OR t.created_by=$1)"];
    if (q.status === "open") w.push("t.status='Open'"); else if (q.status === "done") w.push("t.status='Done'");
    const by = q.date_by === "completed" ? "t.completed_at::date" : q.date_by === "created" ? "t.created_at::date" : "t.due_date";
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.from || "")) { p.push(q.from); w.push(`${by} >= $${p.length}::date`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.to || "")) { p.push(q.to); w.push(`${by} <= $${p.length}::date`); }
    if (q.kind === "reminder") w.push("t.remind_at IS NOT NULL"); else if (q.kind === "task") w.push("t.remind_at IS NULL");
    if (q.timing === "late") w.push("t.status='Done' AND t.completed_at::date > t.due_date");
    if (q.timing === "overdue") w.push("t.status='Open' AND t.due_date < CURRENT_DATE");
    if (q.search) { p.push(`%${q.search}%`); const n = `$${p.length}`; w.push(`(t.title ILIKE ${n} OR t.notes ILIKE ${n} OR t.completion_note ILIKE ${n} OR c.name ILIKE ${n} OR l.name ILIKE ${n} OR l.lead_code ILIKE ${n} OR d.name ILIKE ${n} OR d.deal_code ILIKE ${n})`); }
    const page = Math.max(1, Number(q.page) || 1), size = 50;
    const base = `FROM tasks t LEFT JOIN clients c ON c.id=t.client_id LEFT JOIN leads l ON l.id=t.lead_id LEFT JOIN deals d ON d.id=t.deal_id WHERE ${w.join(" AND ")}`;
    const total = Number((await query(`SELECT COUNT(*) ${base}`, p)).rows[0].count);
    const rows = (await query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.remind_at, t.completed_at, t.completion_note, t.completed_by_name, t.owner_name, t.created_by_name, t.created_at, t.vertical,
              t.lead_id, l.name AS lead_name, l.lead_code, t.deal_id, d.name AS deal_name, d.deal_code, t.client_id, c.name AS client_name,
              (SELECT COUNT(*)::int FROM task_events e WHERE e.task_id=t.id AND e.action='rescheduled') AS times_rescheduled
         ${base} ORDER BY COALESCE(t.completed_at, t.due_date::timestamptz, t.created_at) DESC LIMIT ${size} OFFSET ${(page - 1) * size}`, p)).rows;
    res.json({ data: rows, total, page, size });
  } catch (e) { fail(res, e); }
});

// ── Opportunity follow-up from the to-do list: reschedule, or change the next action ──
workspaceRouter.post("/followups/:leadId", async (req, res) => {
  try {
    if (!UUID.test(req.params.leadId)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body || {};
    const l = (await query("SELECT id, name, vertical, next_action, next_action_date FROM leads WHERE id=$1", [req.params.leadId])).rows[0];
    if (!l || !(await visibleNames()).includes(l.vertical)) return res.status(404).json({ error: "Not found" });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.next_date || "")) ? b.next_date : null;
    if (!date && !clean(b.next_action)) return res.status(400).json({ error: "Pick the new date" });
    const r = await query("UPDATE leads SET next_action=COALESCE($2,next_action), next_action_date=COALESCE($3::date,next_action_date), updated_at=NOW() WHERE id=$1 RETURNING id, next_action, next_action_date",
      [l.id, clean(b.next_action), date]);
    await logAudit({ entityType: "lead", entityId: l.id, action: "UPDATE", userId: req.user!.id, userName: req.user!.name, userRole: req.user!.role,
      recordDisplay: `${l.name}: follow-up moved to ${date || "same date"}`, before: { next_action: l.next_action, next_action_date: l.next_action_date }, after: r.rows[0] });
    res.json(r.rows[0]);
  } catch (e) { fail(res, e); }
});

// ── Team list for managers (whose workspace to open) ──
workspaceRouter.get("/team", async (req, res) => {
  try {
    if (!MANAGER.test(String(req.user!.role || ""))) return res.json({ data: [] });
    const r = await query("SELECT id, name, role, vertical FROM users WHERE COALESCE(status,'Active')='Active' ORDER BY name");
    res.json({ data: r.rows });
  } catch (e) { fail(res, e); }
});
