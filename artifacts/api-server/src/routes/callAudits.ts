import { Router, raw } from "express";
import { existsSync, mkdirSync, writeFileSync, statSync, createReadStream, unlinkSync } from "fs";
import { join } from "path";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";
import { CALL_AUDIT_ROLE } from "../lib/visibility";
import { aiComplete } from "./ai";
import { transcribeAudioFile } from "./meetings";

// ─── Call recording audits (AMC CRO and team) ─────────────────────────────────
// Recordings (from the telephone / dialer system) are uploaded, a sample is picked, an auditor listens and fills
// the checklist. A non-compliant call — or one marked "action required" — raises a Service Request automatically,
// assigned to the action owner, and the audit shows that SR until it is resolved.
export const callAuditsRouter = Router();
const DIR = join(process.cwd(), "uploads", "call-audits");
const UUID = /^[0-9a-f-]{36}$/i;
const clean = (v: any) => (v === "" || v === undefined || v === null ? null : String(v).trim() || null);

export const CHECKLIST = [
  { id: "id_verify", label: "Caller identity verified before sharing account or transaction details", critical: true },
  { id: "disclosure", label: "Call-recording intimation and mandatory disclaimers given", critical: false },
  { id: "no_assured", label: "No assured or guaranteed returns promised", critical: true },
  { id: "product_info", label: "Scheme information accurate (riskometer, exit load, expense ratio, lock-in)", critical: false },
  { id: "suitability", label: "Suitability discussed — no mis-selling or pushing of unsuitable schemes", critical: true },
  { id: "confidential", label: "No confidential or unpublished portfolio information shared", critical: true },
  { id: "instruction", label: "Transaction / dealing instructions confirmed and read back", critical: false },
  { id: "conduct", label: "Professional conduct and language", critical: false },
  { id: "complaint", label: "Complaint, if raised, captured and logged", critical: false },
  { id: "followup", label: "Commitments and follow-ups recorded", critical: false },
];
const SHORT: Record<string, string> = { id_verify: "Identity not verified", disclosure: "Disclosure missed", no_assured: "Assured returns", product_info: "Wrong product information",
  suitability: "Mis-selling / suitability", confidential: "Confidential information shared", instruction: "Instruction not confirmed", conduct: "Conduct / language",
  complaint: "Complaint not logged", followup: "Follow-up not recorded" };
const META = {
  checklist: CHECKLIST,
  teams: ["Sales", "Investor Service", "Dealing / Front Office", "Fund Management", "Distributor Desk", "Other"],
  purposes: ["Sales / pitch", "Transaction request", "Service query", "Complaint", "Dealing order", "Distributor call", "Other"],
  caller_types: ["Investor", "Prospect", "Distributor", "Broker / Counterparty", "Internal", "Other"],
  sample_reasons: ["Random", "Risk-based", "Complaint-linked", "New employee", "Dealer calls", "Regulatory request"],
  businesses: ["AMC", "Retail Broking", "Corporate Broking", "Investment Banking", "AIF", "Institutional Equities"],
  outcomes: ["Satisfactory", "Needs improvement", "Non-compliant"],
  results: ["Passed", "Issues identified"],
  issue_for: SHORT,
  issue_categories: ["Mis-selling / suitability", "Assured returns", "Identity not verified", "Confidential information shared", "Disclosure missed",
    "Wrong product information", "Instruction not confirmed", "Conduct / language", "Complaint not logged", "Follow-up not recorded", "Process gap", "Other"],
  severities: ["Low", "Medium", "High", "Critical"],
};

async function canAudit(user: any): Promise<boolean> {
  if (!user) return false;
  if (CALL_AUDIT_ROLE.test(String(user.role || ""))) return true;
  const r = await query(`SELECT 1 FROM user_role_mapping m JOIN user_roles r ON r.id=m.role_id WHERE m.user_id=$1 AND m.is_active IS NOT FALSE AND r.role_name ~* $2 LIMIT 1`,
    [user.id, CALL_AUDIT_ROLE.source]).catch(() => ({ rows: [] as any[] }));
  return r.rows.length > 0;
}
callAuditsRouter.use(async (req, res, next) => {
  if (!(await canAudit(req.user))) return res.status(403).json({ error: "Call Audits are open to the CRO team, Compliance and admins.", code: "NO_CALL_AUDIT" });
  next();
});

/** Score = Yes ÷ (Yes + No); a "No" on a critical point makes the call Non-compliant. */
function evaluate(checklist: Record<string, any>) {
  let yes = 0, no = 0; const failed: string[] = []; let criticalFail = false;
  for (const c of CHECKLIST) {
    const v = String(checklist?.[c.id]?.v || "");
    if (v === "yes") yes++;
    else if (v === "no") { no++; failed.push(c.id); if (c.critical) criticalFail = true; }
  }
  const score = yes + no ? Math.round((yes / (yes + no)) * 100) : null;
  const outcome = criticalFail ? "Non-compliant" : score !== null && score < 80 ? "Needs improvement" : score !== null ? "Satisfactory" : null;
  return { score, outcome, failed, criticalFail, answered: yes + no };
}

const LIST_SELECT = `
  SELECT a.id, a.audit_code, a.vertical, a.call_date, a.call_time, a.direction, a.phone, a.caller_name, a.caller_type, a.client_id, c.name AS client_name, c.client_code,
         a.employee_id, a.employee_name, a.team, a.call_purpose, a.duration_sec, a.recording_ref, a.recording_path, a.audio_name, a.audio_bytes, (a.audio_path IS NOT NULL) AS has_audio,
         a.sample_batch, a.sample_reason, a.in_sample, a.checklist, a.score, a.result, a.issue_category, a.outcome, a.severity, a.observations, a.recommendation,
         a.action_required, a.action_owner_id, a.action_owner_name, a.action_due, a.sr_id, a.sr_code, sr.status AS sr_status,
         a.transcript, a.transcript_source, a.ai_check, a.auditor_name, a.audited_at, a.created_by_name, a.created_at,
         (SELECT COALESCE(json_agg(json_build_object('id', s.id, 'sr_code', s.sr_code, 'status', s.status, 'subject', s.subject, 'priority', s.priority,
                   'assignee', u.name, 'due', s.sla_deadline, 'created_at', s.created_at) ORDER BY s.created_at), '[]'::json)
            FROM service_requests s LEFT JOIN users u ON u.id = s.assigned_to WHERE s.call_audit_id = a.id) AS srs,
         CASE WHEN NOT a.in_sample THEN 'Not sampled'
              WHEN a.audited_at IS NULL THEN 'Pending'
              WHEN EXISTS (SELECT 1 FROM service_requests s WHERE s.call_audit_id = a.id AND s.status NOT IN ('Resolved','Closed')) THEN 'Action open'
              WHEN EXISTS (SELECT 1 FROM service_requests s WHERE s.call_audit_id = a.id) THEN 'Closed'
              ELSE 'Audited' END AS state
    FROM call_audits a LEFT JOIN clients c ON c.id=a.client_id LEFT JOIN service_requests sr ON sr.id=a.sr_id`;

callAuditsRouter.get("/meta", async (_req, res) => {
  const users = (await query("SELECT id, name, role FROM users WHERE COALESCE(status,'Active')='Active' ORDER BY name")).rows;
  const batches = (await query("SELECT sample_batch, COUNT(*)::int n FROM call_audits WHERE sample_batch IS NOT NULL GROUP BY 1 ORDER BY MAX(created_at) DESC LIMIT 30")).rows;
  res.json({ ...META, users, batches });
});

callAuditsRouter.get("/", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const where: string[] = []; const p: any[] = [];
    const add = (sql: string, v: any) => { p.push(v); where.push(sql.replace("?", `$${p.length}`)); };
    if (q.batch) add("a.sample_batch = ?", q.batch);
    if (q.from) add("a.call_date >= ?::date", q.from);
    if (q.to) add("a.call_date <= ?::date", q.to);
    if (q.employee) add("a.employee_name ILIKE ?", `%${q.employee}%`);
    if (q.outcome) add("a.outcome = ?", q.outcome);
    if (q.search) { p.push(`%${q.search}%`); const n = `$${p.length}`; where.push(`(a.audit_code ILIKE ${n} OR a.employee_name ILIKE ${n} OR a.caller_name ILIKE ${n} OR a.phone ILIKE ${n} OR a.recording_ref ILIKE ${n} OR a.recording_path ILIKE ${n} OR c.name ILIKE ${n} OR a.audio_name ILIKE ${n})`); }
    const base = `${LIST_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
    const rows = (await query(`SELECT * FROM (${base}) x ${q.state ? `WHERE state = $${p.length + 1}` : ""} ORDER BY (state='Pending') DESC, call_date DESC NULLS LAST, created_at DESC LIMIT 500`,
      q.state ? [...p, q.state] : p)).rows;
    const all = (await query(`SELECT state, outcome, result, COUNT(*)::int n FROM (${base}) x GROUP BY 1,2,3`, p)).rows;
    const sum = (f: (r: any) => boolean) => all.filter(f).reduce((s: number, r: any) => s + r.n, 0);
    const audited = sum(r => r.state !== "Pending" && r.state !== "Not sampled");
    const sampled = sum(r => r.state !== "Not sampled");
    res.json({
      data: rows.map(({ transcript, ...r }: any) => ({ ...r, has_transcript: !!transcript })),
      kpis: { total: sum(() => true), sampled, pending: sum(r => r.state === "Pending"), audited, not_sampled: sum(r => r.state === "Not sampled"),
        non_compliant: sum(r => r.outcome === "Non-compliant"), issues: sum(r => r.result === "Issues identified"), passed: sum(r => r.result === "Passed"), needs_improvement: sum(r => r.outcome === "Needs improvement"),
        actions_open: sum(r => r.state === "Action open"), coverage: sampled ? Math.round((audited / sampled) * 100) : 0 },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

callAuditsRouter.get("/export.csv", async (_req, res) => {
  const rows = (await query(`${LIST_SELECT} ORDER BY a.call_date DESC NULLS LAST`)).rows;
  const cols = ["audit_code", "vertical", "call_date", "call_time", "direction", "phone", "caller_name", "caller_type", "client_code", "client_name", "employee_name", "team", "call_purpose",
    "duration_sec", "recording_ref", "recording_path", "audio_name", "sample_batch", "sample_reason", "state", "result", "issue_category", "score", "outcome", "severity", "failed_points", "observations", "recommendation", "sr_code", "auditor_name", "audited_at"];
  const esc = (v: any) => { const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [cols.join(",")].concat(rows.map((r: any) => cols.map(k => esc(k === "failed_points" ? evaluate(r.checklist || {}).failed.map(f => SHORT[f]).join("; ") : k === "sr_code" ? (r.srs || []).map((x: any) => `${x.sr_code} (${x.status})`).join("; ") : r[k])).join(",")));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="call-audits-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send("﻿" + lines.join("\n"));
});

callAuditsRouter.get("/:id", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  const r = (await query(`${LIST_SELECT} WHERE a.id=$1`, [req.params.id])).rows[0];
  if (!r) return res.status(404).json({ error: "Not found" });
  res.json(r);
});

async function nextCode(): Promise<string> {
  const r = await query("SELECT COALESCE(MAX(substring(audit_code FROM '^CA-([0-9]+)$')::int), 0) + 1 AS n FROM call_audits");
  return `CA-${String(r.rows[0].n).padStart(4, "0")}`;
}
const DETAIL_FIELDS = ["vertical", "call_date", "call_time", "direction", "phone", "caller_name", "caller_type", "client_id", "employee_id", "employee_name", "team", "call_purpose",
  "duration_sec", "recording_ref", "recording_path", "sample_batch", "sample_reason", "in_sample"] as const;
function details(b: any) {
  const o: Record<string, any> = {};
  for (const k of DETAIL_FIELDS) if (k in (b || {})) o[k] = k === "in_sample" ? b[k] !== false && b[k] !== "false" : k === "duration_sec" ? (b[k] === "" || b[k] == null ? null : Math.round(Number(b[k])) || null) : clean(b[k]);
  if (o.client_id && !UUID.test(o.client_id)) o.client_id = null;
  if (o.employee_id && !UUID.test(o.employee_id)) o.employee_id = null;
  return o;
}
/** Recording file name like 20261114_103522_9876543210.mp3 → call date, time and number. */
function fromFileName(name: string) {
  const o: Record<string, any> = {};
  const d = name.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/); if (d) o.call_date = `${d[1]}-${d[2]}-${d[3]}`;
  const t = name.match(/(?:20\d{6}|20\d{2}-\d{2}-\d{2})[ T_-]?(\d{2})[-_.:]?(\d{2})[-_.:]?(\d{2})?/); if (t) o.call_time = `${t[1]}:${t[2]}`;
  const ph = name.match(/(?:\+?91)?([6-9]\d{9})(?!\d)/); if (ph) o.phone = ph[1];
  return o;
}

// Upload one recording (raw body). Call details come as query parameters; the rest is filled later in the audit screen.
callAuditsRouter.post("/upload", raw({ type: () => true, limit: "120mb" }), async (req, res) => {
  try {
    const q = req.query as Record<string, any>;
    const buf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const path0 = clean(q.recording_path);
    // A recording can be uploaded, or just referenced by its file name and path (recorder server / shared drive) — or both
    const name = String(q.name || "").slice(0, 200) || (path0 ? String(path0).split(/[\\/]/).pop()!.slice(0, 200) : null);
    if (!buf.length && !path0 && !clean(q.recording_ref)) return res.status(400).json({ error: "Upload the recording or enter its file name and path" });
    const mime = String(q.mime || req.headers["content-type"] || "audio/mpeg").slice(0, 80);
    if (buf.length && !/^audio\/|^video\/(mp4|webm|ogg)/.test(mime)) return res.status(400).json({ error: "Upload an audio file (mp3, wav, m4a, ogg, webm)." });
    const d = { ...fromFileName(name || ""), ...details(q) };
    const code = await nextCode();
    const cols = Object.keys(d);
    const r = await query(
      `INSERT INTO call_audits (audit_code, ${cols.join(", ")}${cols.length ? "," : ""} audio_name, audio_mime, audio_bytes, created_by, created_by_name)
       VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}${cols.length ? "," : ""} $${cols.length + 2}, $${cols.length + 3}, $${cols.length + 4}, $${cols.length + 5}, $${cols.length + 6}) RETURNING id`,
      [code, ...cols.map(k => d[k]), name, buf.length ? mime : null, buf.length || null, req.user?.id || null, req.user?.name || null]);
    const id = r.rows[0].id;
    if (buf.length) {
      mkdirSync(DIR, { recursive: true });
      const ext = (name?.match(/\.([a-z0-9]{2,4})$/i)?.[1] || "mp3").toLowerCase();
      const path = join(DIR, `${id}.${ext}`); writeFileSync(path, buf);
      await query("UPDATE call_audits SET audio_path=$1 WHERE id=$2", [path, id]);
    }
    await logAudit({ entityType: "call_audit", entityId: id, entityCode: code, action: "CREATE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, recordDisplay: `${code} ${name || ""}`.trim() });
    res.status(201).json((await query(`${LIST_SELECT} WHERE a.id=$1`, [id])).rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Attach (or replace) the recording of an existing call — e.g. one first entered by file name and path
callAuditsRouter.post("/:id/audio", raw({ type: () => true, limit: "120mb" }), async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const buf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const name = String(req.query.name || "recording.mp3").slice(0, 200), mime = String(req.query.mime || "audio/mpeg").slice(0, 80);
    if (!buf.length) return res.status(400).json({ error: "Choose the recording file" });
    if (!/^audio\/|^video\/(mp4|webm|ogg)/.test(mime)) return res.status(400).json({ error: "Upload an audio file (mp3, wav, m4a, ogg, webm)." });
    const a = (await query("SELECT audio_path FROM call_audits WHERE id=$1", [req.params.id])).rows[0];
    if (!a) return res.status(404).json({ error: "Not found" });
    if (a.audio_path && existsSync(a.audio_path)) try { unlinkSync(a.audio_path); } catch { /* ignore */ }
    mkdirSync(DIR, { recursive: true });
    const path = join(DIR, `${req.params.id}.${(name.match(/\.([a-z0-9]{2,4})$/i)?.[1] || "mp3").toLowerCase()}`); writeFileSync(path, buf);
    await query("UPDATE call_audits SET audio_path=$1, audio_mime=$2, audio_name=$3, audio_bytes=$4, updated_at=NOW() WHERE id=$5", [path, mime, name, buf.length, req.params.id]);
    res.json((await query(`${LIST_SELECT} WHERE a.id=$1`, [req.params.id])).rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

callAuditsRouter.put("/:id", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const d = details(req.body); const cols = Object.keys(d);
    if (!cols.length) return res.status(400).json({ error: "Nothing to update" });
    await query(`UPDATE call_audits SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(", ")}, updated_at=NOW() WHERE id=$1`, [req.params.id, ...cols.map(k => d[k])]);
    res.json((await query(`${LIST_SELECT} WHERE a.id=$1`, [req.params.id])).rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Pick a random sample from recordings not yet sampled (optionally limited to a date range / team / employee)
callAuditsRouter.post("/sample", async (req, res) => {
  try {
    const b = req.body || {};
    const n = Math.max(1, Math.min(500, Math.round(Number(b.count) || 0)));
    const where = ["NOT in_sample"]; const p: any[] = [];
    if (b.from) { p.push(b.from); where.push(`call_date >= $${p.length}::date`); }
    if (b.to) { p.push(b.to); where.push(`call_date <= $${p.length}::date`); }
    if (b.team) { p.push(b.team); where.push(`team = $${p.length}`); }
    if (b.employee) { p.push(`%${b.employee}%`); where.push(`employee_name ILIKE $${p.length}`); }
    p.push(clean(b.batch) || `Sample ${new Date().toISOString().slice(0, 10)}`, clean(b.reason) || "Random", n);
    const r = await query(`UPDATE call_audits SET in_sample=TRUE, sample_batch=$${p.length - 2}, sample_reason=$${p.length - 1}, updated_at=NOW()
                            WHERE id IN (SELECT id FROM call_audits WHERE ${where.join(" AND ")} ORDER BY random() LIMIT $${p.length}) RETURNING audit_code`, p);
    res.json({ picked: r.rows.length, codes: r.rows.map((x: any) => x.audit_code) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

callAuditsRouter.get("/:id/audio", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).end();
  const a = (await query("SELECT audio_path, audio_mime FROM call_audits WHERE id=$1", [req.params.id])).rows[0];
  if (!a?.audio_path || !existsSync(a.audio_path)) return res.status(404).json({ error: "No recording uploaded" });
  const size = statSync(a.audio_path).size;
  res.setHeader("Content-Type", a.audio_mime || "audio/mpeg"); res.setHeader("Accept-Ranges", "bytes");
  const m = String(req.headers.range || "").match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : 0, end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    res.status(206).setHeader("Content-Range", `bytes ${start}-${end}/${size}`); res.setHeader("Content-Length", String(end - start + 1));
    return createReadStream(a.audio_path, { start, end }).pipe(res);
  }
  res.setHeader("Content-Length", String(size)); createReadStream(a.audio_path).pipe(res);
});

callAuditsRouter.post("/:id/transcribe", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const a = (await query("SELECT audio_path, audio_mime FROM call_audits WHERE id=$1", [req.params.id])).rows[0];
    if (!a?.audio_path || !existsSync(a.audio_path)) return res.status(400).json({ error: "Upload the recording first" });
    const t = await transcribeAudioFile(a.audio_path, a.audio_mime || "audio/mpeg");
    await query("UPDATE call_audits SET transcript=$1, transcript_source=$2, updated_at=NOW() WHERE id=$3", [t.text, t.source, req.params.id]);
    res.json({ transcript: t.text, source: t.source });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// AI pre-check: suggests an answer per checklist point from the transcript — the auditor still decides.
callAuditsRouter.post("/:id/ai-check", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const a = (await query("SELECT transcript, call_purpose, team FROM call_audits WHERE id=$1", [req.params.id])).rows[0];
    if (!a?.transcript) return res.status(400).json({ error: "Transcribe the call first" });
    const system = `You review recorded phone calls of an Indian mutual fund (AMC) for compliance. For each checklist point answer "yes" (complied), "no" (breached) or "na" (not applicable to this call), with a one-line reason quoting the call where possible. Be strict on assured returns, mis-selling, sharing confidential portfolio information and identity checks. Reply with JSON only: {"points":{"<id>":{"v":"yes|no|na","why":"…"}},"summary":"2-3 lines","suggested_outcome":"Satisfactory|Needs improvement|Non-compliant"}`;
    const user = `Checklist:\n${CHECKLIST.map(c => `- ${c.id}: ${c.label}`).join("\n")}\n\nTeam: ${a.team || "?"} · Purpose: ${a.call_purpose || "?"}\n\nTranscript:\n${String(a.transcript).slice(0, 40000)}`;
    const out = await aiComplete(system, user);
    if (!out) return res.status(503).json({ error: "The AI model isn't set up or didn't answer (Admin → AI Settings)" });
    const m = out.match(/\{[\s\S]*\}/); if (!m) return res.status(502).json({ error: "The AI answer couldn't be read — try again" });
    const j = JSON.parse(m[0]);
    await query("UPDATE call_audits SET ai_check=$1::jsonb, updated_at=NOW() WHERE id=$2", [JSON.stringify(j), req.params.id]);
    res.json(j);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/** Raise a Service Request referencing a call audit (category "Call Audit"), linked by service_requests.call_audit_id.
 *  The first SR of an audit is also kept as its main action SR (call_audits.sr_id). */
async function raiseSr(a: any, o: { subject: string; description: string; subcategory: string; priority: string; owner: { id: string; name: string }; due?: string | null; notify: string }, user: any) {
  const sla = (await query("SELECT tat_hours FROM sla_config WHERE category='Call Audit' AND subcategory IS NULL")).rows[0];
  const deadline = o.due ? new Date(`${o.due}T18:00:00+05:30`) : new Date(Date.now() + (sla?.tat_hours || 168) * 3600 * 1000);
  let sr: any = null;
  for (let attempt = 0; attempt < 5 && !sr; attempt++) {
    const mx = await query("SELECT COALESCE(MAX(substring(sr_code FROM '^SR-([0-9]+)$')::int), 5800) AS n FROM service_requests");
    try {
      sr = (await query(
        `INSERT INTO service_requests (sr_code, subject, description, category, subcategory, channel, priority, client_id, vertical, created_by, assigned_to, sla_deadline, status, call_audit_id)
         VALUES ($1,$2,$3,'Call Audit',$4,'Call Audit',$5,$6,NULL,$7,$8,$9,'Open',$10) RETURNING id, sr_code`,
        [`SR-${Number(mx.rows[0].n) + 1 + attempt}`, o.subject.slice(0, 250), o.description, o.subcategory, o.priority, a.client_id || null, user?.id || null, o.owner.id, deadline, a.id])).rows[0];
    } catch (e: any) { if (e.code !== "23505") throw e; }
  }
  if (!sr) throw new Error("Could not allocate an SR number — please try again");
  await query("UPDATE call_audits SET sr_id=COALESCE(sr_id,$1), sr_code=COALESCE(sr_code,$2), updated_at=NOW() WHERE id=$3", [sr.id, sr.sr_code, a.id]);
  await query("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'sr_assigned',$2,$3,'service_request',$4)",
    [o.owner.id, `Call audit action — ${sr.sr_code}`, o.notify.slice(0, 300), sr.id]).catch(() => {});
  await logAudit({ entityType: "service_request", entityId: sr.id, entityCode: sr.sr_code, action: "CREATE", userId: user?.id, userName: user?.name, userRole: user?.role, recordDisplay: `${sr.sr_code} from call audit ${a.audit_code}` });
  return sr;
}
const callLine = (a: any) => [a.call_date && new Date(a.call_date).toISOString().slice(0, 10), a.call_time, a.direction, a.phone, a.caller_name, a.caller_type].filter(Boolean).join(" · ");
const PRIORITY: Record<string, string> = { Critical: "Critical", High: "High", Medium: "Medium", Low: "Low" };

// Save the audit. Non-compliant (or "action required") raises an SR for the action owner — once per audit.
callAuditsRouter.post("/:id/audit", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const b = req.body || {};
    const a = (await query(`${LIST_SELECT} WHERE a.id=$1`, [req.params.id])).rows[0];
    if (!a) return res.status(404).json({ error: "Not found" });
    const checklist: Record<string, any> = {};
    for (const c of CHECKLIST) { const x = b.checklist?.[c.id]; if (x && ["yes", "no", "na"].includes(x.v)) checklist[c.id] = { v: x.v, note: clean(x.note) }; }
    const ev = evaluate(checklist);
    if (ev.answered === 0 && !Object.keys(checklist).length) return res.status(400).json({ error: "Answer the checklist first" });
    // Result: Passed, or Issues identified (any "No" on the checklist, or the auditor says so). Issues need a category and comments, and always raise an SR.
    const issues = ev.failed.length > 0 || b.result === "Issues identified" || (META.outcomes.includes(b.outcome) && b.outcome !== "Satisfactory");
    const result = issues ? "Issues identified" : "Passed";
    let outcome = META.outcomes.includes(b.outcome) ? b.outcome : ev.outcome || "Satisfactory";
    if (issues && outcome === "Satisfactory") outcome = "Needs improvement";
    if (!issues) outcome = "Satisfactory";
    const severity = META.severities.includes(b.severity) ? b.severity : outcome === "Non-compliant" ? "High" : outcome === "Needs improvement" ? "Medium" : "Low";
    const observations = clean(b.observations), recommendation = clean(b.recommendation);
    const issueCategory = issues ? (META.issue_categories.includes(b.issue_category) ? b.issue_category : null) : null;
    if (issues && !issueCategory) return res.status(400).json({ error: "Issues identified — choose the issue category" });
    if (issues && !observations) return res.status(400).json({ error: "Issues identified — add your comments (what was heard, where in the call)" });
    const actionRequired = issues;
    const ownerId = UUID.test(String(b.action_owner_id || "")) ? b.action_owner_id : (a.employee_id || null);
    const owner = ownerId ? (await query("SELECT id, name FROM users WHERE id=$1", [ownerId])).rows[0] : null;
    if (actionRequired && !owner && !a.sr_id) return res.status(400).json({ error: "Choose who should act on this (action owner) — the SR is raised for them" });
    const due = clean(b.action_due);
    await query("UPDATE call_audits SET result=$2, issue_category=$3 WHERE id=$1", [a.id, result, issueCategory]);
    await query(`UPDATE call_audits SET checklist=$2::jsonb, score=$3, outcome=$4, severity=$5, observations=$6, recommendation=$7, action_required=$8,
                   action_owner_id=$9, action_owner_name=$10, action_due=$11, auditor_id=$12, auditor_name=$13, audited_at=COALESCE(audited_at, NOW()), status='Audited', in_sample=TRUE, updated_at=NOW()
                 WHERE id=$1`,
      [a.id, JSON.stringify(checklist), ev.score, outcome, severity, observations, recommendation, actionRequired, owner?.id || null, owner?.name || null, due, req.user?.id || null, req.user?.name || null]);

    let sr: any = null;
    if (actionRequired && !a.sr_id) {
      const failed = ev.failed.map(f => SHORT[f]);
      sr = await raiseSr(a, {
        subject: `Call audit ${a.audit_code}: ${issueCategory}${failed.length && failed[0] !== issueCategory ? ` — ${failed.slice(0, 2).join(", ")}` : ""}`,
        description: [
          `Raised automatically from call audit ${a.audit_code} — issues identified: ${issueCategory} (${outcome}${ev.score !== null ? `, score ${ev.score}%` : ""}, severity ${severity}).`,
          callLine(a) ? `Call: ${callLine(a)}` : "",
          `Employee: ${[a.employee_name, a.team].filter(Boolean).join(" · ") || "—"}${a.recording_ref ? ` · Recording ${a.recording_ref}` : ""}${a.recording_path ? ` · File ${a.recording_path}` : ""}`,
          failed.length ? `Points not met: ${failed.join("; ")}` : "",
          observations ? `Auditor's comments: ${observations}` : "", recommendation ? `Action expected: ${recommendation}` : "",
          `Audited by ${req.user?.name || "CRO team"}.`,
        ].filter(Boolean).join("\n"),
        subcategory: issueCategory!, priority: PRIORITY[severity] || "Medium", owner: owner!, due, notify: `${a.audit_code}: ${issueCategory}. ${observations || ""}`,
      }, req.user);
    }
    await logAudit({ entityType: "call_audit", entityId: a.id, entityCode: a.audit_code, action: "UPDATE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role,
      recordDisplay: `${a.audit_code} — ${outcome}${sr ? ` → ${sr.sr_code}` : ""}` });
    res.json({ ...(await query(`${LIST_SELECT} WHERE a.id=$1`, [a.id])).rows[0], sr_created: sr?.sr_code || null });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Raise an SR from an audited call (any number, each carrying the audit reference) — e.g. a follow-up for another team
callAuditsRouter.post("/:id/sr", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const b = req.body || {};
    const a = (await query(`${LIST_SELECT} WHERE a.id=$1`, [req.params.id])).rows[0];
    if (!a) return res.status(404).json({ error: "Not found" });
    if (!a.audited_at) return res.status(409).json({ error: "Save the audit first — the SR carries its findings" });
    const ownerId = UUID.test(String(b.owner_id || "")) ? b.owner_id : (a.action_owner_id || a.employee_id || null);
    const owner = ownerId ? (await query("SELECT id, name FROM users WHERE id=$1", [ownerId])).rows[0] : null;
    if (!owner) return res.status(400).json({ error: "Choose who the SR is for" });
    const failed = evaluate(a.checklist || {}).failed.map(f => SHORT[f]);
    const details = clean(b.details);
    const sr = await raiseSr(a, {
      subject: clean(b.subject) || `Call audit ${a.audit_code}: follow-up`,
      description: [
        details || "",
        `Reference: call audit ${a.audit_code} (${a.result || "audited"}${a.issue_category ? ` — ${a.issue_category}` : ""}; ${a.outcome || ""}${a.score != null ? `, score ${Number(a.score)}%` : ""}${a.severity ? `, severity ${a.severity}` : ""}).`,
        callLine(a) ? `Call: ${callLine(a)}` : "",
        `Employee: ${[a.employee_name, a.team].filter(Boolean).join(" · ") || "—"}${a.recording_ref ? ` · Recording ${a.recording_ref}` : ""}${a.recording_path ? ` · File ${a.recording_path}` : ""}`,
        failed.length ? `Points not met: ${failed.join("; ")}` : "",
        a.observations ? `Audit observations: ${a.observations}` : "", a.recommendation ? `Recommendation: ${a.recommendation}` : "",
        `Raised by ${req.user?.name || "CRO team"}.`,
      ].filter(Boolean).join("\n"),
      subcategory: clean(b.subcategory) || a.issue_category || failed[0] || "Follow-up", priority: PRIORITY[b.priority] || PRIORITY[a.severity] || "Medium",
      owner, due: clean(b.due), notify: `${a.audit_code}: ${clean(b.subject) || "follow-up"}`,
    }, req.user);
    await logAudit({ entityType: "call_audit", entityId: a.id, entityCode: a.audit_code, action: "UPDATE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, recordDisplay: `${a.audit_code} → ${sr.sr_code} raised` });
    res.status(201).json({ ...(await query(`${LIST_SELECT} WHERE a.id=$1`, [a.id])).rows[0], sr_created: sr.sr_code });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

callAuditsRouter.delete("/:id", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const a = (await query("SELECT id, audit_code, audio_path, audited_at FROM call_audits WHERE id=$1", [req.params.id])).rows[0];
    if (!a) return res.status(404).json({ error: "Not found" });
    if (a.audited_at) return res.status(409).json({ error: "An audited call is kept for the record and can't be deleted" });
    if (a.audio_path && existsSync(a.audio_path)) try { unlinkSync(a.audio_path); } catch { /* ignore */ }
    await query("DELETE FROM call_audits WHERE id=$1", [a.id]);
    await logAudit({ entityType: "call_audit", entityId: a.id, entityCode: a.audit_code, action: "DELETE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, recordDisplay: a.audit_code });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
