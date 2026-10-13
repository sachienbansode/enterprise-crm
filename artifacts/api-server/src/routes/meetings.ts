import { Router, raw } from "express";
import { existsSync, mkdirSync, appendFileSync, statSync, createReadStream, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { query } from "../lib/db";
import { encrypt, decrypt } from "../lib/crypto";
import { requireAdmin } from "../lib/session";
import { aiComplete } from "./ai";
import { saveInteraction } from "./interactions";
import { getGraphToken } from "./teams";

// ─── Meetings: record in-person meetings (speaker-separated transcript) and pull Teams transcripts ───
//  In-person:  POST /meetings  → POST /meetings/:id/chunk (audio pieces while recording) → POST /meetings/:id/finish
//              → Azure AI Speech (diarization: Speaker 1/2/3) → AI matches speakers to the attendees → summary
//              → interaction + tasks on the company / opportunity. Speakers can be corrected: PATCH /meetings/:id/speakers
//  Teams:      meetings booked from the CRM are stored; after they end the Graph transcript (has real speaker names)
//              and recording link are fetched automatically (or on demand: POST /meetings/:id/fetch-teams).
export const meetingsRouter = Router();
export const speechAdminRouter = Router();

const DIR = join(process.cwd(), "uploads", "meetings");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
const UUID = /^[0-9a-f-]{36}$/i;
const clean = (v: any) => (v === "" || v === undefined ? null : v);
const VNAME: Record<string, string> = { retail: "Retail Broking", corporate: "Corporate Broking", ib: "Investment Banking", aif: "AIF", ie: "Institutional Equities" };

type Seg = { s: string; t0: number; t1: number; text: string };
type Attendee = { key: string; kind: "user" | "person" | "other"; id?: string | null; name: string; role?: string | null };

async function speechCfg() { return (await query("SELECT * FROM speech_config WHERE id=1")).rows[0] || {}; }
const extFor = (mime: string) => (/mp4|m4a|aac/.test(mime) ? "m4a" : /ogg/.test(mime) ? "ogg" : /wav/.test(mime) ? "wav" : /mpeg|mp3/.test(mime) ? "mp3" : "webm");

async function vertFor(clientId: string | null, leadId: string | null) {
  if (leadId) { const r = await query("SELECT vertical FROM leads WHERE id=$1", [leadId]); if (r.rows[0]) return r.rows[0].vertical; }
  if (clientId) { const r = await query("SELECT vertical FROM client_verticals WHERE client_id=$1 ORDER BY (vertical='ib') DESC LIMIT 1", [clientId]); if (r.rows[0]) return VNAME[r.rows[0].vertical] || null; }
  return null;
}

// ─── Transcription (Azure AI Speech fast transcription, with diarization) ───
async function transcribeAzure(file: string, mime: string): Promise<{ segments: Seg[]; duration: number }> {
  const c = await speechCfg();
  if (!c.enabled || !c.endpoint || !c.api_key) throw new Error("Meeting transcription is not set up (Admin → Integrations → Meeting Recording)");
  const base = String(c.endpoint).replace(/\/+$/, "");
  const url = `${base}/speechtotext/transcriptions:transcribe?api-version=${c.api_version || "2024-11-15"}`;
  const form = new FormData();
  const bytes = readFileSync(file);
  form.append("audio", new Blob([bytes], { type: mime || "audio/webm" }), `meeting.${extFor(mime)}`);
  form.append("definition", JSON.stringify({
    locales: c.locales?.length ? c.locales : ["en-IN"],
    diarization: { enabled: true, maxSpeakers: Math.min(Math.max(Number(c.max_speakers) || 6, 2), 35) },
    profanityFilterMode: "None",
  }));
  let last = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": decrypt(c.api_key) }, body: form });
    if (r.status === 429 || r.status >= 500) { last = `Azure Speech ${r.status}`; await new Promise(s => setTimeout(s, 2000 * 2 ** attempt)); continue; }
    const d: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Azure Speech ${r.status}: ${d.error?.message || d.message || "transcription failed"}`);
    // Speakers are numbered 1, 2, 3… in the order they first speak (Azure's raw ids can start at 0 or 1)
    const order = new Map<string, string>();
    const label = (raw: any) => { const k = String(raw ?? "?"); if (!order.has(k)) order.set(k, String(order.size + 1)); return order.get(k)!; };
    const segments: Seg[] = (d.phrases || []).map((p: any) => ({
      s: label(p.speaker),
      t0: Math.round((p.offsetMilliseconds || 0) / 1000), t1: Math.round(((p.offsetMilliseconds || 0) + (p.durationMilliseconds || 0)) / 1000),
      text: String(p.text || "").trim(),
    })).filter((x: Seg) => x.text);
    return { segments: mergeSegs(segments), duration: Math.round((d.durationMilliseconds || 0) / 1000) };
  }
  throw new Error(last || "Azure Speech unavailable");
}

// Join consecutive phrases from the same speaker into one readable turn
function mergeSegs(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const x of segs) {
    const p = out[out.length - 1];
    if (p && p.s === x.s && x.t0 - p.t1 <= 4 && p.text.length < 900) { p.text += " " + x.text; p.t1 = x.t1; }
    else out.push({ ...x });
  }
  return out;
}

// ─── Teams transcript (WebVTT with <v Speaker Name>) ───
export function parseVtt(vtt: string): Seg[] {
  const toSec = (t: string) => { const [h, m, s] = t.split(":"); return Math.round(Number(h) * 3600 + Number(m) * 60 + parseFloat(s)); };
  const out: Seg[] = [];
  const blocks = vtt.replace(/\r/g, "").split(/\n\n+/);
  for (const b of blocks) {
    const tm = b.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
    if (!tm) continue;
    const body = b.slice(b.indexOf(tm[0]) + tm[0].length).trim();
    const vm = body.match(/<v\s+([^>]+)>([\s\S]*?)(<\/v>|$)/);
    const name = vm ? vm[1].trim() : "Unknown";
    const text = (vm ? vm[2] : body).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text) out.push({ s: name, t0: toSec(tm[1].replace(",", ".")), t1: toSec(tm[2].replace(",", ".")), text });
  }
  return mergeSegs(out);
}

// ─── Who is who: match diarized speakers to the attendees ───
async function identifySpeakers(segs: Seg[], attendees: Attendee[], recorderName: string): Promise<Record<string, any>> {
  const keys = [...new Set(segs.map(s => s.s))];
  const speakers: Record<string, any> = Object.fromEntries(keys.map(k => [k, { name: `Speaker ${k}`, attendee: null, confidence: 0, confirmed: false }]));
  if (!attendees.length || !keys.length) return speakers;
  // One speaker + one attendee: trivially the same person
  if (keys.length === 1 && attendees.length === 1) { speakers[keys[0]] = { name: attendees[0].name, attendee: attendees[0].key, confidence: 0.6, confirmed: false }; return speakers; }
  const sample = keys.map(k => {
    const lines = segs.filter(s => s.s === k);
    const words = lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
    return `Speaker ${k} (${lines.length} turns, ~${words} words, first speaks at ${lines[0]?.t0 ?? 0}s):\n` + lines.slice(0, 8).map(l => `  - ${l.text.slice(0, 220)}`).join("\n");
  }).join("\n\n");
  const opening = segs.slice(0, 25).map(s => `[Speaker ${s.s}] ${s.text.slice(0, 200)}`).join("\n");
  const list = attendees.map(a => `- key "${a.key}": ${a.name}${a.role ? ` (${a.role})` : ""}${a.kind === "user" ? " — our team" : a.kind === "person" ? " — client side" : ""}`).join("\n");
  const out = await aiComplete(
    `You identify speakers in a diarized meeting transcript of an Indian investment-banking / broking firm meeting a client.
Attendees:\n${list}\nThe person who recorded the meeting is ${recorderName} (our team).
Use clues: names used to address people ("thanks Neha"), self-references ("as CFO", "our board"), who asks vs answers (bankers pitch / ask about financials; promoters & CFOs describe their company), and who opens the meeting (usually the recorder).
Return ONLY JSON: {"speakers": {"<speaker number>": {"attendee": "<attendee key or null>", "confidence": <0..1>, "why": "<short reason>"}}}
Each attendee can be matched to at most one speaker. Use null when unsure.`,
    `Opening of the meeting:\n${opening}\n\nPer-speaker samples:\n${sample}`,
  ).catch(() => null);
  if (!out) return speakers;
  try {
    const j = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] || "{}");
    const used = new Set<string>();
    for (const [k, v] of Object.entries<any>(j.speakers || {})) {
      const key = String(k).replace(/\D/g, "") || k;
      const a = attendees.find(x => x.key === v?.attendee);
      if (speakers[key] && a && !used.has(a.key)) {
        used.add(a.key);
        speakers[key] = { name: a.name, attendee: a.key, confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0.5)), why: String(v.why || "").slice(0, 200), confirmed: false };
      }
    }
  } catch { /* keep generic labels */ }
  return speakers;
}

const named = (segs: Seg[], speakers: Record<string, any>) => segs.map(s => `${speakers[s.s]?.name || (/^\d+$/.test(s.s) ? `Speaker ${s.s}` : s.s)}: ${s.text}`).join("\n");

// ─── Summary → interaction + tasks ───
async function summarize(m: any, segs: Seg[], speakers: Record<string, any>) {
  const text = named(segs, speakers).slice(0, 80000);
  const today = new Date().toISOString().slice(0, 10);
  const out = await aiComplete(
    `Summarise this client meeting transcript for a CRM (Indian investment banking / broking). Today is ${today}. Resolve relative dates to YYYY-MM-DD.
Return ONLY JSON: {"title": "...", "summary": "<3-5 sentences>", "key_points": ["..."], "decisions": ["..."], "opportunity_update": "<or null>",
"action_items": [{"title": "...", "owner": "<attendee name or null>", "due_date": "<YYYY-MM-DD or null>"}], "next_follow_up": "<YYYY-MM-DD or null>"}
Only use what was said.`, `Meeting: ${m.title || "Client meeting"}\n\n${text}`,
  ).catch(() => null);
  try { if (out) return JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] || "null"); } catch { /* fall through */ }
  return { title: m.title || "Client meeting", summary: segs.slice(0, 6).map(s => s.text).join(" ").slice(0, 600), key_points: [], action_items: [], next_follow_up: null, ai: false };
}

async function publish(id: string) {
  const m = (await query("SELECT * FROM meetings WHERE id=$1", [id])).rows[0];
  if (!m) return;
  const segs: Seg[] = m.segments || [];
  const sum = await summarize(m, segs, m.speakers || {});
  const people = Object.values<any>(m.speakers || {}).map(s => s.name);
  const owner = m.organizer_id ? (await query("SELECT id, name, role FROM users WHERE id=$1", [m.organizer_id])).rows[0] : null;
  const user = owner ? { id: owner.id, name: owner.name, role: owner.role } : { id: m.created_by, name: m.created_by_name || "System" };
  const items = (sum?.action_items || []).map((a: any) => ({ title: a.title, owner: a.owner, due_date: a.due_date }));
  let interactionId = m.interaction_id;
  if (!interactionId) {
    const it = await saveInteraction({
      type: "Meeting", occurred_at: m.start_at, client_id: m.client_id, lead_id: m.lead_id, vertical: m.vertical,
      title: sum?.title || m.title, summary: sum?.summary, key_points: [...(sum?.key_points || []), ...(sum?.decisions || []).map((d: string) => `Decision: ${d}`)],
      opportunity_update: sum?.opportunity_update, next_follow_up: sum?.next_follow_up, action_items: items,
      source: m.source === "teams" ? "teams" : "recording", external_id: `meeting:${m.id}`, attendees: people.map(n => ({ name: n })),
    }, user);
    interactionId = it?.id || null;
    if (interactionId) await query("UPDATE interactions SET meeting_id=$1 WHERE id=$2", [m.id, interactionId]);
  } else {
    await query("UPDATE interactions SET title=COALESCE($1,title), summary=COALESCE($2,summary), attendees=$3::jsonb WHERE id=$4",
      [sum?.title, sum?.summary, JSON.stringify(people.map(n => ({ name: n }))), interactionId]);
  }
  await query("UPDATE meetings SET summary=$1::jsonb, interaction_id=$2, status='transcribed', error=NULL, updated_at=NOW() WHERE id=$3", [JSON.stringify(sum), interactionId, id]);
  if (m.organizer_id || m.created_by) {
    await query("INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'meeting_summary','Meeting transcript ready',$2,'meeting',$3)",
      [m.organizer_id || m.created_by, `${sum?.title || m.title || "Meeting"} — summary, speakers and action items are in the CRM`, m.id]).catch(() => {});
  }
}

async function processRecording(id: string) {
  const m = (await query("SELECT * FROM meetings WHERE id=$1", [id])).rows[0];
  if (!m?.audio_path || !existsSync(m.audio_path)) throw new Error("No audio was received for this meeting");
  await query("UPDATE meetings SET status='transcribing', attempts=attempts+1, updated_at=NOW() WHERE id=$1", [id]);
  const { segments, duration } = await transcribeAzure(m.audio_path, m.audio_mime);
  if (!segments.length) throw new Error("No speech was detected in the recording");
  const speakers = await identifySpeakers(segments, m.attendees || [], m.created_by_name || "the recorder");
  await query("UPDATE meetings SET segments=$1::jsonb, speakers=$2::jsonb, transcript_source='azure-speech', duration_sec=COALESCE(NULLIF($3,0), duration_sec), updated_at=NOW() WHERE id=$4",
    [JSON.stringify(segments), JSON.stringify(speakers), duration, id]);
  await publish(id);
}

function runInBackground(id: string, fn: (id: string) => Promise<void>) {
  fn(id).catch(async e => {
    console.error("[meetings]", id, e.message);
    await query("UPDATE meetings SET status='failed', error=$1, updated_at=NOW() WHERE id=$2", [String(e.message).slice(0, 500), id]).catch(() => {});
  });
}

// ─── Teams: find the online meeting, pull transcript + recording ───
async function graph(token: string, url: string, accept = "application/json") {
  const r = await fetch(`https://graph.microsoft.com/v1.0${url}`, { headers: { Authorization: `Bearer ${token}`, Accept: accept } });
  if (!r.ok) { const d: any = await r.json().catch(() => ({})); throw Object.assign(new Error(d.error?.message || `Graph ${r.status}`), { status: r.status, code: d.error?.code }); }
  return accept === "application/json" ? r.json() : r.text();
}

export async function fetchTeams(id: string): Promise<{ ok: boolean; msg: string }> {
  const m = (await query("SELECT * FROM meetings WHERE id=$1", [id])).rows[0];
  if (!m || m.source !== "teams") return { ok: false, msg: "Not a Teams meeting" };
  if (!m.join_url || !m.organizer_email) return { ok: false, msg: "This meeting has no Teams link" };
  const token = await getGraphToken();
  if (!token) return { ok: false, msg: "Microsoft 365 is not connected (Admin → M365 Integration)" };
  try {
    const user: any = await graph(token, `/users/${encodeURIComponent(m.organizer_email)}?$select=id`);
    let omId = m.online_meeting_id;
    if (!omId) {
      const om: any = await graph(token, `/users/${user.id}/onlineMeetings?$filter=JoinWebUrl eq '${encodeURIComponent(m.join_url).replace(/'/g, "''")}'`);
      omId = om.value?.[0]?.id;
      if (!omId) return { ok: false, msg: "Teams hasn't published this meeting yet" };
      await query("UPDATE meetings SET online_meeting_id=$1 WHERE id=$2", [omId, id]);
    }
    const ts: any = await graph(token, `/users/${user.id}/onlineMeetings/${omId}/transcripts`);
    const t = (ts.value || []).sort((a: any, b: any) => String(b.createdDateTime).localeCompare(String(a.createdDateTime)))[0];
    let recId = m.recording_id;
    try { const rs: any = await graph(token, `/users/${user.id}/onlineMeetings/${omId}/recordings`); recId = rs.value?.[0]?.id || recId; } catch { /* recordings optional */ }
    if (recId) await query("UPDATE meetings SET recording_id=$1 WHERE id=$2", [recId, id]);
    if (!t) return { ok: false, msg: "No transcript yet — transcription must be switched on in the Teams meeting" };
    const vtt = String(await graph(token, `/users/${user.id}/onlineMeetings/${omId}/transcripts/${t.id}/content?$format=text/vtt`, "text/vtt"));
    const segments = parseVtt(vtt);
    if (!segments.length) return { ok: false, msg: "The Teams transcript is empty" };
    // Teams already names every speaker; link names to attendees where they match
    const attendees: Attendee[] = m.attendees || [];
    const speakers: Record<string, any> = {};
    for (const name of [...new Set(segments.map(s => s.s))]) {
      const a = attendees.find(x => x.name.toLowerCase() === name.toLowerCase()) || attendees.find(x => name.toLowerCase().includes(x.name.toLowerCase().split(" ")[0]));
      speakers[name] = { name, attendee: a?.key || null, confidence: 1, confirmed: true };
    }
    await query("UPDATE meetings SET segments=$1::jsonb, speakers=$2::jsonb, transcript_source='teams', status='transcribing', updated_at=NOW() WHERE id=$3",
      [JSON.stringify(segments), JSON.stringify(speakers), id]);
    await publish(id);
    return { ok: true, msg: `Transcript imported (${segments.length} turns)` };
  } catch (e: any) {
    const perm = e.status === 403 || /Authorization|Forbidden|access policy/i.test(e.message);
    const msg = perm ? "Microsoft 365 permission missing: grant OnlineMeetings.Read.All, OnlineMeetingTranscript.Read.All, OnlineMeetingRecording.Read.All and add the Teams application access policy (see Admin → Meeting Recording)." : e.message;
    await query("UPDATE meetings SET error=$1, attempts=attempts+1, updated_at=NOW() WHERE id=$2", [msg.slice(0, 500), id]).catch(() => {});
    return { ok: false, msg };
  }
}

/** Called by teams.ts when a meeting is booked from the CRM. */
export async function recordTeamsMeeting(p: { eventId: string; joinUrl: string; subject: string; start: string; end: string; organizerEmail: string; clientId?: string | null; leadId?: string | null; attendees?: string[]; user?: any }) {
  if (!p.joinUrl) return;
  const people = p.clientId ? (await query("SELECT id, name, designation, email FROM company_people WHERE client_id=$1", [p.clientId])).rows : [];
  const att: Attendee[] = [
    ...(p.user ? [{ key: `user:${p.user.id}`, kind: "user" as const, id: p.user.id, name: p.user.name }] : []),
    ...(p.attendees || []).map(e => {
      const per = people.find(x => (x.email || "").toLowerCase() === String(e).toLowerCase());
      return per ? { key: `person:${per.id}`, kind: "person" as const, id: per.id, name: per.name, role: per.designation } : { key: `other:${e}`, kind: "other" as const, name: String(e) };
    }),
  ];
  const vertical = await vertFor(p.clientId || null, p.leadId || null);
  await query(
    `INSERT INTO meetings (source, title, client_id, lead_id, vertical, organizer_id, organizer_email, organizer_name, start_at, end_at, join_url, graph_event_id, attendees, status, created_by, created_by_name)
     VALUES ('teams',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'scheduled',$5,$7) ON CONFLICT (graph_event_id) WHERE graph_event_id IS NOT NULL DO NOTHING`,
    [p.subject, p.clientId || null, p.leadId || null, vertical, p.user?.id || null, p.organizerEmail, p.user?.name || p.organizerEmail, p.start, p.end, p.joinUrl, p.eventId, JSON.stringify(att)],
  ).catch(e => console.error("[meetings] store Teams meeting:", e.message));
}

/** Background job: pull Teams transcripts after meetings end; retry stuck transcriptions once. */
export function startMeetingJobs() {
  const tick = async () => {
    try {
      const c = await speechCfg();
      if (c.teams_auto_fetch !== false) {
        const due = await query(`SELECT id FROM meetings WHERE source='teams' AND status='scheduled' AND end_at < NOW() - INTERVAL '10 minutes'
                                   AND end_at > NOW() - INTERVAL '3 days' AND attempts < 12 ORDER BY end_at LIMIT 10`);
        for (const r of due.rows) await fetchTeams(r.id);
        await query("UPDATE meetings SET status='no_transcript' WHERE source='teams' AND status='scheduled' AND end_at < NOW() - INTERVAL '3 days'");
      }
      const stuck = await query("SELECT id FROM meetings WHERE source='recording' AND status='transcribing' AND updated_at < NOW() - INTERVAL '30 minutes' AND attempts < 2 LIMIT 3");
      for (const r of stuck.rows) runInBackground(r.id, processRecording);
      // retention: delete audio older than keep_audio_days (transcript stays)
      const days = Number(c.keep_audio_days) || 0;
      if (days > 0) {
        const old = await query(`SELECT id, audio_path FROM meetings WHERE audio_path IS NOT NULL AND created_at < NOW() - ($1 || ' days')::interval`, [String(days)]);
        for (const r of old.rows) { try { if (existsSync(r.audio_path)) unlinkSync(r.audio_path); } catch { /* ignore */ } await query("UPDATE meetings SET audio_path=NULL WHERE id=$1", [r.id]); }
      }
    } catch (e: any) { console.error("[meetings] job:", e.message); }
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 10 * 60_000);
}

// ════════════════════ Routes ════════════════════
// Who may open a meeting: its recorder/organiser, admins, and users of the same vertical
const canSee = async (req: any, id: string) => {
  if (!UUID.test(id)) return null;
  const m = (await query("SELECT * FROM meetings WHERE id=$1", [id])).rows[0];
  if (!m) return null;
  const u = req.user || {};
  const admin = /admin|business head/i.test(u.role || "");
  if (admin || m.created_by === u.id || m.organizer_id === u.id || !u.vertical || u.vertical === "All" || !m.vertical || m.vertical === u.vertical) return m;
  return null;
};

// Start an in-person recording
meetingsRouter.post("/", async (req, res) => {
  const b = req.body || {};
  if (!b.consent) return res.status(400).json({ error: "Confirm that everyone present has agreed to be recorded." });
  try {
    const clientId = UUID.test(b.client_id || "") ? b.client_id : null;
    const leadId = UUID.test(b.lead_id || "") ? b.lead_id : null;
    const me: Attendee = { key: `user:${req.user!.id}`, kind: "user", id: req.user!.id, name: req.user!.name };
    const att: Attendee[] = [me, ...(Array.isArray(b.attendees) ? b.attendees : [])
      .filter((a: any) => a?.name && a.key !== me.key).slice(0, 20)
      .map((a: any) => ({ key: String(a.key || `other:${a.name}`), kind: a.kind === "person" || a.kind === "user" ? a.kind : "other", id: a.id || null, name: String(a.name).slice(0, 120), role: a.role || null }))];
    const mime = String(b.mime || "audio/webm").slice(0, 60);
    const r = await query(
      `INSERT INTO meetings (source, title, client_id, lead_id, vertical, organizer_id, organizer_name, start_at, attendees, status, audio_mime, consent_by, consent_at, created_by, created_by_name)
       VALUES ('recording',$1,$2,$3,$4,$5,$6,NOW(),$7::jsonb,'recording',$8,$6,NOW(),$5,$6) RETURNING id`,
      [clean(b.title) || "Client meeting", clientId, leadId, await vertFor(clientId, leadId), req.user!.id, req.user!.name, JSON.stringify(att), mime]);
    const id = r.rows[0].id;
    const path = join(DIR, `${id}.${extFor(mime)}`);
    await query("UPDATE meetings SET audio_path=$1 WHERE id=$2", [path, id]);
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Audio arrives in pieces while recording, in order (so a dropped connection or closed tab never loses the meeting)
meetingsRouter.post("/:id/chunk", raw({ type: () => true, limit: "30mb" }), async (req, res) => {
  const { id } = req.params; const seq = Number(req.query.seq);
  if (!UUID.test(id) || !Number.isInteger(seq) || seq < 0) return res.status(400).json({ error: "Bad chunk" });
  try {
    const m = (await query("SELECT audio_path, chunks, status, created_by FROM meetings WHERE id=$1", [id])).rows[0];
    if (!m || m.created_by !== req.user!.id) return res.status(404).json({ error: "Recording not found" });
    if (m.status !== "recording") return res.status(409).json({ error: "This recording is already finished" });
    if (seq < m.chunks) return res.json({ ok: true, duplicate: true });      // retried piece already stored
    if (seq > m.chunks) return res.status(409).json({ error: `Expected piece ${m.chunks}`, expected: m.chunks });
    const buf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (buf.length) appendFileSync(m.audio_path, buf);
    await query("UPDATE meetings SET chunks=chunks+1, audio_bytes=audio_bytes+$1, updated_at=NOW() WHERE id=$2", [buf.length, id]);
    res.json({ ok: true, next: seq + 1 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

meetingsRouter.post("/:id/finish", async (req, res) => {
  const { id } = req.params;
  try {
    const m = (await query("SELECT * FROM meetings WHERE id=$1", [id])).rows[0];
    if (!m || m.created_by !== req.user!.id) return res.status(404).json({ error: "Recording not found" });
    const dur = Math.round(Number(req.body?.duration_sec) || 0);
    await query("UPDATE meetings SET status='transcribing', end_at=NOW(), duration_sec=$1, updated_at=NOW() WHERE id=$2", [dur || null, id]);
    if (!m.audio_path || !existsSync(m.audio_path) || statSync(m.audio_path).size < 2000) {
      await query("UPDATE meetings SET status='failed', error='No audio was captured' WHERE id=$1", [id]);
      return res.status(400).json({ error: "No audio was captured — check the microphone permission and try again." });
    }
    runInBackground(id, processRecording);
    res.json({ ok: true, status: "transcribing" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

meetingsRouter.post("/:id/retry", async (req, res) => {
  const m = await canSee(req, req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  if (m.source === "teams") return res.json(await fetchTeams(m.id));
  runInBackground(m.id, processRecording);
  res.json({ ok: true, msg: "Transcribing again" });
});

meetingsRouter.post("/:id/fetch-teams", async (req, res) => {
  const m = await canSee(req, req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  res.json(await fetchTeams(m.id));
});

meetingsRouter.get("/", async (req, res) => {
  const params: any[] = []; const where: string[] = [];
  for (const k of ["client_id", "lead_id"]) { const v = String(req.query[k] || ""); if (UUID.test(v)) { params.push(v); where.push(`m.${k}=$${params.length}`); } }
  if (req.query.mine === "1") { params.push(req.user!.id); where.push(`(m.created_by=$${params.length} OR m.organizer_id=$${params.length})`); }
  try {
    const r = await query(
      `SELECT m.id, m.source, m.title, m.client_id, c.name AS company, m.lead_id, m.start_at, m.end_at, m.duration_sec, m.status, m.error,
              m.organizer_name, m.join_url, (m.recording_id IS NOT NULL OR m.audio_path IS NOT NULL) AS has_audio, m.interaction_id,
              jsonb_array_length(m.segments) AS turns, m.speakers
         FROM meetings m LEFT JOIN clients c ON c.id=m.client_id ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY COALESCE(m.start_at, m.created_at) DESC LIMIT 100`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

meetingsRouter.get("/:id", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const m = await canSee(req, req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  const c = m.client_id ? (await query("SELECT name FROM clients WHERE id=$1", [m.client_id])).rows[0] : null;
  const { audio_path, ...rest } = m;
  res.json({ ...rest, company: c?.name || null, has_audio: !!(audio_path && existsSync(audio_path)) || !!m.recording_id });
});

// Correct who-is-who; the transcript, summary and timeline entry update
meetingsRouter.patch("/:id/speakers", async (req, res) => {
  const m = await canSee(req, req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  const map = req.body?.speakers || {};
  const speakers = { ...(m.speakers || {}) };
  for (const [k, v] of Object.entries<any>(map)) {
    if (!speakers[k]) continue;
    const a = (m.attendees || []).find((x: Attendee) => x.key === v?.attendee);
    const name = a?.name || String(v?.name || "").trim().slice(0, 120) || speakers[k].name;
    speakers[k] = { ...speakers[k], name, attendee: a?.key || null, confirmed: true, confidence: 1 };
  }
  await query("UPDATE meetings SET speakers=$1::jsonb, updated_at=NOW() WHERE id=$2", [JSON.stringify(speakers), m.id]);
  if (req.body?.resummarize !== false && (m.segments || []).length) await publish(m.id).catch(() => {});
  res.json({ ok: true, speakers });
});

meetingsRouter.patch("/:id", async (req, res) => {
  const b = req.body || {};
  try {
    const r = await query("UPDATE meetings SET title=COALESCE($1,title), client_id=COALESCE($2,client_id), lead_id=COALESCE($3,lead_id), updated_at=NOW() WHERE id=$4 RETURNING id",
      [clean(b.title), UUID.test(b.client_id || "") ? b.client_id : null, UUID.test(b.lead_id || "") ? b.lead_id : null, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Play the audio: local recording, or stream the Teams recording through the server
meetingsRouter.get("/:id/audio", async (req, res) => {
  const m = await canSee(req, req.params.id);
  if (!m) return res.status(404).end();
  try {
    if (m.audio_path && existsSync(m.audio_path)) {
      const size = statSync(m.audio_path).size;
      const range = String(req.headers.range || "");
      res.setHeader("Content-Type", m.audio_mime || "audio/webm");
      res.setHeader("Accept-Ranges", "bytes");
      const mm = range.match(/bytes=(\d*)-(\d*)/);
      if (mm) {
        const start = mm[1] ? Number(mm[1]) : 0; const end = mm[2] ? Math.min(Number(mm[2]), size - 1) : size - 1;
        res.status(206).setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
        res.setHeader("Content-Length", String(end - start + 1));
        return createReadStream(m.audio_path, { start, end }).pipe(res);
      }
      res.setHeader("Content-Length", String(size));
      return createReadStream(m.audio_path).pipe(res);
    }
    if (m.source === "teams" && m.recording_id && m.online_meeting_id) {
      const token = await getGraphToken();
      if (!token) return res.status(503).json({ error: "Microsoft 365 not connected" });
      const u: any = await graph(token, `/users/${encodeURIComponent(m.organizer_email)}?$select=id`);
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${u.id}/onlineMeetings/${m.online_meeting_id}/recordings/${m.recording_id}/content`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok || !r.body) return res.status(r.status).json({ error: "Recording not available" });
      res.setHeader("Content-Type", r.headers.get("content-type") || "video/mp4");
      const reader = (r.body as any).getReader();
      for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
      return res.end();
    }
    res.status(404).json({ error: "No recording" });
  } catch (e: any) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
});

// ─── Admin: Azure AI Speech + Teams settings ───
speechAdminRouter.use(requireAdmin);
speechAdminRouter.get("/", async (_req, res) => {
  const c = await speechCfg();
  res.json({ enabled: !!c.enabled, endpoint: c.endpoint || "", api_version: c.api_version, locales: c.locales || [], max_speakers: c.max_speakers,
    teams_auto_fetch: c.teams_auto_fetch !== false, keep_audio_days: c.keep_audio_days, has_key: !!c.api_key, updated_by: c.updated_by, updated_at: c.updated_at });
});
speechAdminRouter.put("/", async (req, res) => {
  const b = req.body || {};
  try {
    const locales = Array.isArray(b.locales) ? b.locales.map((x: any) => String(x).trim()).filter((x: string) => /^[a-z]{2}-[A-Z]{2}$/.test(x)).slice(0, 4) : null;
    await query(`UPDATE speech_config SET enabled=COALESCE($1,enabled), endpoint=COALESCE($2,endpoint), api_version=COALESCE($3,api_version),
        locales=COALESCE($4::text[],locales), max_speakers=COALESCE($5,max_speakers), teams_auto_fetch=COALESCE($6,teams_auto_fetch),
        keep_audio_days=COALESCE($7,keep_audio_days),
        api_key=CASE WHEN $8::text IS NULL THEN api_key WHEN $8='' THEN NULL ELSE $8 END, updated_by=$9, updated_at=NOW() WHERE id=1`,
      [typeof b.enabled === "boolean" ? b.enabled : null, typeof b.endpoint === "string" ? b.endpoint.trim().replace(/\/+$/, "") : null,
       clean(b.api_version), locales && locales.length ? locales : null, b.max_speakers ? Math.min(Math.max(Number(b.max_speakers), 2), 35) : null,
       typeof b.teams_auto_fetch === "boolean" ? b.teams_auto_fetch : null, b.keep_audio_days !== undefined && b.keep_audio_days !== "" ? Math.max(0, Number(b.keep_audio_days) || 0) : null,
       typeof b.api_key === "string" ? (b.api_key.trim() ? encrypt(b.api_key.trim()) : "") : null, req.user!.name]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
speechAdminRouter.post("/test", async (_req, res) => {
  const c = await speechCfg();
  if (!c.endpoint || !c.api_key) return res.json({ ok: false, msg: "Enter the endpoint and key first" });
  try {
    // 1 second of silence (WAV) is enough to prove the endpoint + key work
    const sr = 16000, n = sr, buf = Buffer.alloc(44 + n * 2);
    buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
    const form = new FormData();
    form.append("audio", new Blob([buf], { type: "audio/wav" }), "test.wav");
    form.append("definition", JSON.stringify({ locales: c.locales?.length ? c.locales : ["en-IN"] }));
    const r = await fetch(`${String(c.endpoint).replace(/\/+$/, "")}/speechtotext/transcriptions:transcribe?api-version=${c.api_version || "2024-11-15"}`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": decrypt(c.api_key) }, body: form });
    const d: any = await r.json().catch(() => ({}));
    res.json(r.ok ? { ok: true, msg: "Connected to Azure AI Speech" } : { ok: false, msg: `Azure Speech ${r.status}: ${d.error?.message || d.message || "error"}` });
  } catch (e: any) { res.json({ ok: false, msg: e.message }); }
});
