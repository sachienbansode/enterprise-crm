import { useEffect, useMemo, useRef, useState } from "react";
import { X, RefreshCw, Video, Mic, Play, AlertTriangle, CheckCircle2, Search, Sparkles, Download, Trash2 } from "lucide-react";
import { appConfirm, appToast } from "../lib/dialog";

// Meeting transcript: who said what (speakers named), summary, action items, and audio/recording playback.
// Speaker names can be corrected — the summary and the company timeline update.

const COLORS = ["text-sky-600 dark:text-sky-400", "text-emerald-600 dark:text-emerald-400", "text-amber-600 dark:text-amber-400", "text-violet-600 dark:text-violet-400", "text-rose-600 dark:text-rose-400", "text-teal-600 dark:text-teal-400", "text-orange-600 dark:text-orange-400"];
const ts = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const when = (d: any) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

// Admin / Super Admin can delete a recording
const isAdminUser = () => { try { return /admin/i.test(JSON.parse(localStorage.getItem("niytri_user") || "{}").role || ""); } catch { return false; } };

export function MeetingView({ id, onClose }: { id: string; onClose: () => void }) {
  const [m, setM] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const del = async () => {
    const ok = await appConfirm({ title: "Delete this recording?", message: "The audio, transcript and the meeting note on the company timeline are removed for everyone. Tasks raised from it are kept. This can't be undone.", confirmLabel: "Delete recording", tone: "danger" });
    if (!ok) return;
    setDeleting(true);
    const r = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (r.ok) { appToast("Recording deleted", "success"); window.dispatchEvent(new CustomEvent("quicklog:saved")); window.dispatchEvent(new CustomEvent("company:changed")); onClose(); }
    else appToast((await r.json().catch(() => ({}))).error || "Could not delete the recording", "error");
  };
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [otherName, setOtherName] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBusy, setAudioBusy] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  const load = () => fetch(`/api/meetings/${id}`).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error)))).then(d => { setM(d); setErr(""); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!m || !["transcribing", "recording"].includes(m.status)) return;
    const h = setInterval(load, 5000); return () => clearInterval(h);
  }, [m?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);

  const speakerKeys = useMemo(() => Object.keys(m?.speakers || {}), [m]);
  const colorOf = (k: string) => COLORS[Math.max(0, speakerKeys.indexOf(k)) % COLORS.length];
  const nameOf = (k: string) => m?.speakers?.[k]?.name || (/^\d+$/.test(k) ? `Speaker ${k}` : k);
  const segs = (m?.segments || []).filter((s: any) => !q || s.text.toLowerCase().includes(q.toLowerCase()) || nameOf(s.s).toLowerCase().includes(q.toLowerCase()));

  const loadAudio = async () => {
    setAudioBusy(true);
    try {
      const r = await fetch(`/api/meetings/${id}/audio`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Recording not available");
      setAudioUrl(URL.createObjectURL(await r.blob()));
    } catch (e: any) { setMsg(e.message); } finally { setAudioBusy(false); }
  };
  const seek = async (t: number) => {
    if (!audioUrl) await loadAudio();
    setTimeout(() => { if (audio.current) { audio.current.currentTime = t; audio.current.play().catch(() => {}); } }, 150);
  };

  const saveSpeakers = async () => {
    setSaving(true); setMsg("");
    const speakers: Record<string, any> = {};
    for (const k of speakerKeys) {
      const v = edit[k];
      if (v === undefined) continue;
      speakers[k] = v === "__other" ? { name: otherName[k] || "" } : { attendee: v };
    }
    const r = await fetch(`/api/meetings/${id}/speakers`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speakers }) });
    setSaving(false);
    if (r.ok) { setEdit({}); setMsg("Speakers saved — summary updated"); load(); } else setMsg((await r.json().catch(() => ({}))).error || "Could not save");
  };
  const action = async (path: string) => {
    setMsg("Working…");
    const r = await fetch(`/api/meetings/${id}/${path}`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setMsg(d.msg || d.error || (r.ok ? "Done" : "Failed")); load();
  };
  const download = () => {
    if (!m) return;
    const text = `${m.title}\n${m.company || ""}\n${when(m.start_at)}\n\n` + (m.segments || []).map((s: any) => `[${ts(s.t0)}] ${nameOf(s.s)}: ${s.text}`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = `${(m.title || "meeting").replace(/[^\w]+/g, "-")}-transcript.txt`; a.click();
  };

  const statusBadge = (st: string) => ({
    scheduled: ["Waiting for Teams transcript", "bg-sky-500/15 text-sky-600 dark:text-sky-300"], recording: ["Recording", "bg-red-500/15 text-red-500"],
    transcribing: ["Transcribing…", "bg-amber-500/15 text-amber-600 dark:text-amber-300"], transcribed: ["Transcript ready", "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"],
    no_transcript: ["No Teams transcript", "bg-gray-500/15 text-gray-500"], failed: ["Failed", "bg-red-500/15 text-red-500"],
  } as any)[st] || [st, "bg-gray-500/15 text-gray-500"];

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-[60] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-4xl h-full sm:h-[92vh] bg-white dark:bg-gray-950 sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="w-9 h-9 rounded-lg bg-violet-600/15 text-violet-500 flex items-center justify-center flex-shrink-0">{m?.source === "teams" ? <Video size={17} /> : <Mic size={17} />}</div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-gray-900 dark:text-white truncate">{m?.summary?.title || m?.title || "Meeting"}</div>
            <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-2">
              {m?.company && <span>{m.company}</span>}<span>{when(m?.start_at)}</span>{m?.duration_sec ? <span>{Math.round(m.duration_sec / 60)} min</span> : null}
              <span>{m?.source === "teams" ? "Teams meeting" : "Recorded in person"}</span>
            </div>
          </div>
          {m && <span className={`text-[10px] px-2 py-1 rounded-full font-semibold whitespace-nowrap ${statusBadge(m.status)[1]}`}>{statusBadge(m.status)[0]}</span>}
          {m && isAdminUser() && (
            <button onClick={del} disabled={deleting} aria-label="Delete recording" title="Delete recording (admin)"
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition-colors">{deleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
          )}
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>

        {err ? <div className="p-6 text-sm text-red-500">{err}</div> : !m ? <div className="p-6 text-xs text-gray-500 flex items-center"><RefreshCw size={14} className="animate-spin mr-2" /> Loading…</div> : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left: summary + speakers */}
            <div className="md:w-[340px] md:border-r border-b md:border-b-0 border-gray-200 dark:border-gray-800 overflow-y-auto p-4 space-y-4 max-h-[45%] md:max-h-none">
              {(m.status === "failed" || (m.error && m.status !== "transcribed")) && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-2.5 text-xs text-red-600 dark:text-red-300">
                  <AlertTriangle size={13} className="inline mr-1" />{m.error || "Something went wrong"}
                  <button onClick={() => action(m.source === "teams" ? "fetch-teams" : "retry")} className="block mt-2 text-violet-600 dark:text-violet-300 font-medium">Try again</button>
                </div>
              )}
              {m.status === "transcribing" && <div className="text-xs text-amber-600 dark:text-amber-300 flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> Transcribing and naming speakers — this page updates by itself.</div>}
              {m.source === "teams" && m.status === "scheduled" && (
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                  <div>The transcript is fetched automatically after the meeting ends (transcription must be on in Teams).</div>
                  <button onClick={() => action("fetch-teams")} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs">Fetch transcript now</button>
                  {m.join_url && <a href={m.join_url} target="_blank" rel="noreferrer" className="block text-violet-600 dark:text-violet-300">Join / open in Teams →</a>}
                </div>
              )}

              {m.summary && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1"><Sparkles size={12} /> Summary</div>
                  <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed">{m.summary.summary}</p>
                  {m.summary.key_points?.length > 0 && <ul className="list-disc pl-4 text-xs text-gray-700 dark:text-gray-300 space-y-0.5">{m.summary.key_points.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>}
                  {m.summary.action_items?.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 mt-2 mb-1">Action items (added as tasks)</div>
                      <ul className="text-xs space-y-1">{m.summary.action_items.map((a: any, i: number) => (
                        <li key={i} className="rounded-lg bg-gray-50 dark:bg-gray-900 px-2 py-1.5 text-gray-800 dark:text-gray-200">{a.title}<span className="text-gray-500">{a.owner ? ` · ${a.owner}` : ""}{a.due_date ? ` · ${new Date(a.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}</span></li>
                      ))}</ul>
                    </div>
                  )}
                </div>
              )}

              {speakerKeys.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Speakers</div>
                  {speakerKeys.map(k => {
                    const sp = m.speakers[k];
                    const turns = (m.segments || []).filter((s: any) => s.s === k).length;
                    const cur = edit[k] ?? sp.attendee ?? "";
                    return (
                      <div key={k} className="rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${colorOf(k)}`}>{sp.name}</span>
                          <span className="text-[10px] text-gray-500">{turns} turn{turns === 1 ? "" : "s"}</span>
                          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${sp.confirmed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : sp.attendee ? "bg-amber-500/15 text-amber-600 dark:text-amber-300" : "bg-gray-500/15 text-gray-500"}`}>
                            {sp.confirmed ? "Confirmed" : sp.attendee ? `AI match ${Math.round((sp.confidence || 0) * 100)}%` : "Unknown"}
                          </span>
                        </div>
                        {sp.why && !sp.confirmed && <div className="text-[10px] text-gray-500 mt-0.5">{sp.why}</div>}
                        {m.source !== "teams" && (
                          <div className="mt-1.5 flex gap-1.5">
                            <select value={cur} onChange={e => setEdit(x => ({ ...x, [k]: e.target.value }))} className="flex-1 min-w-0 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-1.5 py-1" aria-label={`Who is ${sp.name}`}>
                              <option value="">— Who is this? —</option>
                              {(m.attendees || []).map((a: any) => <option key={a.key} value={a.key}>{a.name}{a.role ? ` (${a.role})` : ""}</option>)}
                              <option value="__other">Someone else…</option>
                            </select>
                          </div>
                        )}
                        {edit[k] === "__other" && <input value={otherName[k] || ""} onChange={e => setOtherName(x => ({ ...x, [k]: e.target.value }))} placeholder="Name" className="mt-1.5 w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1" />}
                      </div>
                    );
                  })}
                  {Object.keys(edit).length > 0 && (
                    <button onClick={saveSpeakers} disabled={saving} className="w-full py-2 rounded-lg bg-violet-600 text-white text-xs font-medium flex items-center justify-center gap-1.5">
                      {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Save speakers & update summary
                    </button>
                  )}
                </div>
              )}
              {msg && <div className="text-[11px] text-gray-500">{msg}</div>}
            </div>

            {/* Right: transcript */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1.5 flex-1 rounded-lg bg-gray-100 dark:bg-gray-900 px-2.5 py-1.5">
                  <Search size={13} className="text-gray-400" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search transcript" className="bg-transparent text-xs outline-none flex-1 text-gray-800 dark:text-gray-200" />
                </div>
                {m.has_audio && !audioUrl && <button onClick={loadAudio} disabled={audioBusy} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1">{audioBusy ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />} {m.source === "teams" ? "Recording" : "Audio"}</button>}
                {(m.segments || []).length > 0 && <button onClick={download} className="text-xs p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300" aria-label="Download transcript" title="Download transcript"><Download size={13} /></button>}
              </div>
              {audioUrl && (m.source === "teams"
                ? <video ref={audio as any} src={audioUrl} controls className="w-full max-h-56 bg-black" />
                : <audio ref={audio} src={audioUrl} controls className="w-full px-3 py-2" />)}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {segs.length === 0 && <div className="text-xs text-gray-500">{(m.segments || []).length ? "No lines match your search." : "The transcript will appear here."}</div>}
                {segs.map((s: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <button onClick={() => seek(s.t0)} className="text-[10px] font-mono text-gray-400 hover:text-violet-500 pt-0.5 w-10 text-right flex-shrink-0" title="Play from here">{ts(s.t0)}</button>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${colorOf(s.s)}`}>{nameOf(s.s)}</div>
                      <div className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed">{s.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
