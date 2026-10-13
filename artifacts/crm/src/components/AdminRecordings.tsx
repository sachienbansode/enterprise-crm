import { useCallback, useEffect, useState } from "react";
import { Mic, Video, Search, RefreshCw, Trash2, RotateCcw, ChevronLeft, ChevronRight, HardDrive, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { appConfirm, appToast } from "../lib/dialog";

// Admin → Integrations → All Recordings: every in-person recording and Teams meeting across the CRM.
// Open (transcript + audio), retry failed ones, delete one or many. Admin / Super Admin only.

const when = (d: any) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const mins = (s: number) => (!s ? "—" : s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`);
const mb = (b: number) => (!b ? "—" : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);
const STATUS: Record<string, [string, string]> = {
  transcribed: ["Transcript ready", "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"], failed: ["Failed", "bg-red-500/15 text-red-600 dark:text-red-400"],
  transcribing: ["Transcribing", "bg-amber-500/15 text-amber-600 dark:text-amber-400"], recording: ["Recording", "bg-red-500/15 text-red-500"],
  scheduled: ["Teams · waiting", "bg-sky-500/15 text-sky-600 dark:text-sky-400"], no_transcript: ["No transcript", "bg-gray-500/15 text-gray-500"],
};

export default function AdminRecordings({ t }: { t: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [source, setSource] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [page, setPage] = useState(0);
  const [PAGE, setPAGE] = useState(25);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ q, status, source, from, to, limit: String(PAGE), offset: String(page * PAGE) });
    fetch(`/api/meetings/admin/all?${p}`).then(r => r.json()).then(d => { setRows(d.rows || []); setStats(d); }).catch(() => setRows([])).finally(() => setLoading(false));
  }, [q, status, source, from, to, page, PAGE]);
  useEffect(() => { const h = setTimeout(load, 200); return () => clearTimeout(h); }, [load]);
  useEffect(() => { setPage(0); setSel(new Set()); }, [q, status, source, from, to, PAGE]);
  const quick = (days: number | null) => {
    if (days === null) { setFrom(""); setTo(""); return; }
    const d = new Date(); const f = new Date(Date.now() - days * 86400000);
    setFrom(f.toLocaleDateString("en-CA")); setTo(d.toLocaleDateString("en-CA"));
  };
  const range = (days: number) => { const f = new Date(Date.now() - days * 86400000).toLocaleDateString("en-CA"); return from === f && to === new Date().toLocaleDateString("en-CA"); };
  useEffect(() => { const h = () => load(); window.addEventListener("company:changed", h); return () => window.removeEventListener("company:changed", h); }, [load]);

  const del = async (ids: string[]) => {
    const ok = await appConfirm({ title: ids.length === 1 ? "Delete this recording?" : `Delete ${ids.length} recordings?`, message: "Audio, transcript and the meeting note on the company timeline are removed for everyone. Tasks raised from them are kept. This can't be undone.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    let done = 0;
    for (const id of ids) { const r = await fetch(`/api/meetings/${id}`, { method: "DELETE" }); if (r.ok) done++; }
    appToast(`${done} recording${done === 1 ? "" : "s"} deleted`, done === ids.length ? "success" : "error");
    setSel(new Set()); load();
  };
  const retry = async (id: string) => {
    const r = await fetch(`/api/meetings/${id}/retry`, { method: "POST" }); const d = await r.json().catch(() => ({}));
    appToast(d.msg || d.error || "Transcribing again", r.ok ? "success" : "error"); setTimeout(load, 800);
  };
  const open = (id: string) => window.dispatchEvent(new CustomEvent("meeting:open", { detail: { id } }));
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const chip = (on: boolean) => `text-xs px-2.5 py-1 rounded-full border transition-colors ${on ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300 font-semibold" : `${t.border} ${t.textMuted} hover:border-blue-400`}`;
  const total = stats.total || 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-4 sm:px-6 py-4 border-b ${t.border} flex flex-wrap items-center gap-3 flex-shrink-0`}>
        <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center"><Mic className="w-4 h-4 text-white" /></div>
        <div className="mr-auto">
          <div className={`text-base font-bold ${t.text}`}>All Recordings</div>
          <div className={`text-xs ${t.textMuted}`}>Every in-person recording and Teams meeting in the CRM · admins only</div>
        </div>
        <button onClick={load} aria-label="Refresh" className={`p-2 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      <div className="px-4 sm:px-6 pt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[["Recordings", total, Mic, ""], ["Transcript ready", stats.transcribed || 0, CheckCircle2, "text-emerald-500"], ["Failed", stats.failed || 0, AlertTriangle, "text-red-500"],
          ["Total length", mins(stats.seconds || 0), Clock, ""], ["Audio stored", mb(stats.bytes || 0), HardDrive, ""]].map(([l, v, Icon, c]: any) => (
          <div key={l} className={`${t.bgCard} border ${t.border} rounded-xl p-3 animate-in fade-in duration-300`}>
            <div className={`text-[10px] uppercase tracking-wide ${t.textMuted} flex items-center gap-1`}><Icon className={`w-3 h-3 ${c}`} />{l}</div>
            <div className={`text-lg font-bold ${t.text} mt-0.5`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${t.border} ${t.bgCard} flex-1 min-w-[200px] sm:max-w-xs`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={q} onChange={e => setQ(e.target.value)} className={`bg-transparent text-xs ${t.text} outline-none w-full`} placeholder="Name, company, opportunity or IB-code…" aria-label="Search recordings" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className={`${t.textMuted} hover:text-red-500 text-xs`}>✕</button>}
        </div>
        {[["", "All"], ["transcribed", "Ready"], ["processing", "In progress"], ["failed", "Failed"]].map(([v, l]) => <button key={v} onClick={() => setStatus(v)} className={chip(status === v)}>{l}</button>)}
        <span className={`w-px h-5 ${t.border} border-l mx-1`} />
        {[["", "Both"], ["recording", "In person"], ["teams", "Teams"]].map(([v, l]) => <button key={v} onClick={() => setSource(v)} className={chip(source === v)}>{l}</button>)}
        <span className={`w-px h-5 ${t.border} border-l mx-1`} />
        {([[7, "7 days"], [30, "30 days"], [90, "90 days"]] as const).map(([d, l]) => <button key={d} onClick={() => quick(d)} className={chip(range(d))}>{l}</button>)}
        <label className={`flex items-center gap-1 text-[11px] ${t.textMuted}`}>From <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className={`text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} aria-label="From date" /></label>
        <label className={`flex items-center gap-1 text-[11px] ${t.textMuted}`}>To <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className={`text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} aria-label="To date" /></label>
        {(from || to) && <button onClick={() => quick(null)} className={`text-[11px] ${t.textMuted} hover:text-red-500`}>Clear dates</button>}
        {sel.size > 0 && <button onClick={() => del([...sel])} className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"><Trash2 className="w-3.5 h-3.5" /> Delete {sel.size}</button>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
        {loading && !rows.length ? <div className={`py-10 text-center text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          : !rows.length ? <div className={`py-12 text-center text-sm ${t.textMuted}`}>No recordings match.</div> : (
          <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className={t.tableHead}>
                <tr className={`border-b ${t.border}`}>
                  <th className="w-8 px-3 py-2.5"><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every(r => sel.has(r.id))} onChange={e => setSel(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></th>
                  {["When", "Meeting", "Company", "Opportunity", "Recorded by", "Length", "Audio", "Status", ""].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-3 py-2.5 whitespace-nowrap ${["Recorded by", "Audio"].includes(h) ? "hidden md:table-cell" : ""} ${h === "Company" ? "hidden sm:table-cell" : ""} ${h === "Opportunity" ? "hidden lg:table-cell" : ""}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const [sl, sc] = STATUS[r.status] || [r.status, "bg-gray-500/15 text-gray-500"];
                  return (
                    <tr key={r.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer transition-colors ${sel.has(r.id) ? "bg-blue-500/5" : ""}`} onClick={() => open(r.id)}>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.title}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${t.textSub}`}>{when(r.start_at || r.created_at)}</td>
                      <td className="px-3 py-2.5 min-w-[160px]">
                        <div className={`font-medium ${t.text} flex items-center gap-1.5`}>{r.source === "teams" ? <Video className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" /> : <Mic className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}<span className="truncate">{r.title || "Meeting"}</span></div>
                        {r.status === "failed" && r.error && <div className="text-[10px] text-red-500 truncate max-w-[280px]" title={r.error}>{r.error}</div>}
                        {r.transcript_source === "groq-whisper" && <div className={`text-[10px] ${t.textMuted}`}>free transcription · speakers assigned by AI</div>}
                      </td>
                      <td className={`px-3 py-2.5 hidden sm:table-cell ${t.textSub}`}>{r.company || <span className={t.textMuted}>No company</span>}</td>
                      <td className={`px-3 py-2.5 hidden lg:table-cell ${t.textSub}`}>{r.opportunity ? <><div className="truncate max-w-[180px]">{r.opportunity}</div><div className="text-[10px] font-mono text-blue-400">{r.lead_code}</div></> : <span className={t.textMuted}>—</span>}</td>
                      <td className={`px-3 py-2.5 hidden md:table-cell ${t.textSub}`}>{r.recorded_by || "—"}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${t.textSub}`}>{mins(r.duration_sec)}</td>
                      <td className={`px-3 py-2.5 hidden md:table-cell whitespace-nowrap ${t.textMuted}`}>{r.source === "teams" ? (r.has_audio ? "In Teams" : "—") : r.has_audio ? mb(r.audio_bytes) : "Deleted"}</td>
                      <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${sc}`}>{sl}</span></td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5 justify-end">
                          {r.status === "failed" && r.source === "recording" && <button onClick={() => retry(r.id)} title="Transcribe again" aria-label="Retry" className={`p-1.5 rounded-lg ${t.textMuted} hover:text-blue-500 hover:bg-blue-500/10`}><RotateCcw className="w-3.5 h-3.5" /></button>}
                          <button onClick={() => del([r.id])} title="Delete recording" aria-label="Delete" className={`p-1.5 rounded-lg ${t.textMuted} hover:text-red-500 hover:bg-red-500/10`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination — always shown */}
        {total > 0 && (() => {
          const pages = Math.max(1, Math.ceil(total / PAGE));
          const nums = Array.from(new Set([0, page - 1, page, page + 1, pages - 1].filter(n => n >= 0 && n < pages))).sort((x, y) => x - y);
          return (
            <div className={`flex flex-wrap items-center justify-between gap-2 pt-3 text-xs ${t.textMuted}`}>
              <div className="flex items-center gap-2">
                <span>Showing {page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}</span>
                <select value={PAGE} onChange={e => setPAGE(Number(e.target.value))} className={`text-xs rounded-lg border px-2 py-1 ${t.inputBg}`} aria-label="Rows per page">
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page" className={`p-1.5 rounded-lg border ${t.border} disabled:opacity-40`}><ChevronLeft className="w-3.5 h-3.5" /></button>
                {nums.map((n, i) => (
                  <span key={n} className="flex items-center gap-1">
                    {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
                    <button onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined}
                      className={`min-w-[30px] h-[30px] px-2 rounded-lg border transition-colors ${n === page ? "bg-blue-600 border-blue-600 text-white font-semibold" : `${t.border} hover:border-blue-400`}`}>{n + 1}</button>
                  </span>
                ))}
                <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page" className={`p-1.5 rounded-lg border ${t.border} disabled:opacity-40`}><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
