import { Router } from "express";
import crypto from "crypto";
import { query } from "../lib/db";
import { encrypt, decrypt } from "../lib/crypto";
import { requireAdmin } from "../lib/session";
import { saveInteraction } from "./interactions";

// Fireflies.ai — optional add-on. When a recorded meeting is transcribed, Fireflies calls our webhook;
// we fetch the transcript + AI summary, match attendees to a company / opportunity by e-mail and log it
// as an interaction (with action items as tasks). Unmatched meetings land in "Unlinked meetings" to be linked by hand.
export const firefliesAdminRouter = Router();   // mounted at /api/admin/fireflies (admin only)
export const firefliesWebhookRouter = Router(); // mounted at /api/integrations/fireflies (public, signed)

const API = "https://api.fireflies.ai/graphql";
const TRANSCRIPT_QUERY = `query Transcript($id: String!) {
  transcript(id: $id) {
    id title date duration transcript_url organizer_email participants
    meeting_attendees { displayName email }
    summary { overview action_items shorthand_bullet keywords }
  }
}`;

async function cfg() { return (await query("SELECT * FROM fireflies_config WHERE id=1")).rows[0] || {}; }
async function gql(apiKey: string, q: string, variables: any = {}) {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ query: q, variables }) });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d.errors?.length) throw new Error(d.errors?.[0]?.message || `Fireflies HTTP ${r.status}`);
  return d.data;
}
const status = (s: string) => query("UPDATE fireflies_config SET last_event_at=NOW(), last_status=$1 WHERE id=1", [s.slice(0, 500)]).catch(() => {});

// ── Import one Fireflies meeting into the CRM ──
export async function importMeeting(meetingId: string) {
  const c = await cfg();
  if (!c.enabled || !c.api_key) throw new Error("Fireflies add-on is not enabled");
  const data = await gql(decrypt(c.api_key), TRANSCRIPT_QUERY, { id: meetingId });
  const t = data?.transcript;
  if (!t) throw new Error("Transcript not found");
  const emails = new Set<string>([
    ...(t.meeting_attendees || []).map((a: any) => String(a?.email || "").toLowerCase()),
    ...(t.participants || []).map((p: any) => String(p || "").toLowerCase()),
  ].filter(e => e.includes("@")));
  const list = [...emails];
  // Match: company people → client contacts → client e-mail
  let clientId: string | null = null;
  if (list.length) {
    const m = await query(
      `SELECT client_id FROM company_people WHERE lower(email) = ANY($1)
       UNION ALL SELECT client_id FROM client_contacts WHERE contact_type ILIKE 'email' AND lower(value) = ANY($1)
       UNION ALL SELECT id FROM clients WHERE lower(email) = ANY($1) LIMIT 1`, [list]);
    clientId = m.rows[0]?.client_id || m.rows[0]?.id || null;
  }
  if (!clientId && c.only_matched) { await status(`Skipped "${t.title}" — no attendee matched a company`); return { skipped: true }; }
  const lead = clientId ? (await query(
    "SELECT id FROM leads WHERE client_id=$1 AND stage NOT IN ('closed','lost','deleted','won') ORDER BY updated_at DESC NULLS LAST LIMIT 1", [clientId])).rows[0] : null;
  const organizer = t.organizer_email
    ? (await query("SELECT id, name, role FROM users WHERE lower(email)=lower($1)", [t.organizer_email])).rows[0] : null;
  const s = t.summary || {};
  const lines = (v: any) => (Array.isArray(v) ? v : String(v || "").split(/\n+/)).map((x: any) => String(x).replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean);
  const actionItems = c.auto_create_tasks ? lines(s.action_items).filter(l => !/^\*\*.*\*\*$/.test(l)).slice(0, 20).map(title => ({ title, owner_id: organizer?.id })) : [];
  const saved = await saveInteraction({
    type: "Meeting", occurred_at: t.date ? new Date(Number(t.date) || t.date).toISOString() : null,
    client_id: clientId, lead_id: lead?.id || null,
    title: t.title, summary: s.overview || null, key_points: lines(s.shorthand_bullet).slice(0, 15),
    action_items: actionItems, source: "fireflies", external_id: t.id, external_url: t.transcript_url,
    attendees: (t.meeting_attendees || []).map((a: any) => ({ name: a.displayName, email: a.email })),
  }, organizer ? { id: organizer.id, name: organizer.name, role: organizer.role } : { id: null, name: "Fireflies" });
  if (!saved) return { duplicate: true };
  if (organizer) {
    await query("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'meeting_summary','Meeting summary ready',$2,'interaction',$3)",
      [organizer.id, `${t.title}${clientId ? "" : " — not linked to a company yet"}`, saved.id]).catch(() => {});
  }
  await status(`Imported "${t.title}"${clientId ? "" : " (unlinked)"}`);
  return { id: saved.id, linked: !!clientId };
}

// ── Webhook (V2 "sha256=<hex>" and V1 bare-hex signatures) ──
firefliesWebhookRouter.post("/webhook", async (req: any, res) => {
  try {
    const c = await cfg();
    if (!c.enabled) return res.status(404).json({ error: "Not enabled" });
    if (!c.webhook_secret) return res.status(403).json({ error: "Signing secret not configured" });
    const raw: Buffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const hex = crypto.createHmac("sha256", decrypt(c.webhook_secret)).update(raw).digest("hex");
    const got = String(req.headers["x-hub-signature"] || "").replace(/^sha256=/, "");
    if (got.length !== hex.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(hex))) {
      await status("Rejected a webhook call with a bad signature");
      return res.status(401).json({ error: "Bad signature" });
    }
    const b = req.body || {};
    const event = b.event || b.eventType;
    const meetingId = b.meeting_id || b.meetingId;
    res.json({ ok: true }); // acknowledge fast; import in the background
    if (meetingId && /transcribed|summarized|Transcription completed/i.test(String(event))) {
      importMeeting(String(meetingId)).catch(e => status(`Import failed: ${e.message}`));
    }
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
});

// ── Admin settings ──
firefliesAdminRouter.use(requireAdmin);
firefliesAdminRouter.get("/", async (_req, res) => {
  const c = await cfg();
  res.json({
    enabled: !!c.enabled, auto_create_tasks: c.auto_create_tasks !== false, only_matched: !!c.only_matched,
    has_api_key: !!c.api_key, has_webhook_secret: !!c.webhook_secret,
    last_event_at: c.last_event_at, last_status: c.last_status, updated_by: c.updated_by, updated_at: c.updated_at,
  });
});
firefliesAdminRouter.put("/", async (req, res) => {
  const b = req.body || {};
  try {
    await query(
      `UPDATE fireflies_config SET enabled=COALESCE($1,enabled), auto_create_tasks=COALESCE($2,auto_create_tasks), only_matched=COALESCE($3,only_matched),
         api_key=CASE WHEN $4::text IS NULL THEN api_key WHEN $4='' THEN NULL ELSE $4 END,
         webhook_secret=CASE WHEN $5::text IS NULL THEN webhook_secret WHEN $5='' THEN NULL ELSE $5 END,
         updated_by=$6, updated_at=NOW() WHERE id=1`,
      [typeof b.enabled === "boolean" ? b.enabled : null, typeof b.auto_create_tasks === "boolean" ? b.auto_create_tasks : null,
       typeof b.only_matched === "boolean" ? b.only_matched : null,
       typeof b.api_key === "string" ? (b.api_key.trim() ? encrypt(b.api_key.trim()) : "") : null,
       typeof b.webhook_secret === "string" ? (b.webhook_secret.trim() ? encrypt(b.webhook_secret.trim()) : "") : null,
       req.user!.name]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
firefliesAdminRouter.post("/generate-secret", async (_req, res) => {
  res.json({ secret: crypto.randomBytes(24).toString("hex") });
});
firefliesAdminRouter.post("/test", async (_req, res) => {
  try {
    const c = await cfg();
    if (!c.api_key) return res.json({ ok: false, msg: "Enter the Fireflies API key first" });
    const d = await gql(decrypt(c.api_key), `query { user { email name } transcripts(limit: 10) { id title date } }`);
    res.json({ ok: true, msg: `Connected as ${d?.user?.name || d?.user?.email || "Fireflies user"}`, recent: d?.transcripts || [] });
  } catch (e: any) { res.json({ ok: false, msg: e.message }); }
});
firefliesAdminRouter.post("/import/:meetingId", async (req, res) => {
  try { res.json(await importMeeting(req.params.meetingId)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});
