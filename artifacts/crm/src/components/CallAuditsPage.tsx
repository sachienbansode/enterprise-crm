import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, PhoneCall, Upload, Shuffle, Download, Search, X, RefreshCw, Play, Pause, RotateCcw, RotateCw, Sparkles, FileText, CheckCircle2, AlertTriangle, Trash2, ExternalLink, Info } from "lucide-react";
import { appConfirm, appToast } from "../lib/dialog";
import { openRecord } from "../lib/openRecord";
import { MList, MCard } from "./MobileCard";

// Call Recording Audits — the AMC CRO team listens to sampled call recordings, fills a checklist and records observations.
// A non-compliant call (or one marked "action required") raises a Service Request for the action owner automatically.
const inputCls = "w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const STATE_TONE: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300", "Action open": "bg-red-500/15 text-red-600 dark:text-red-400",
  Audited: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", Passed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Ready to close": "bg-violet-500/15 text-violet-700 dark:text-violet-300", Closed: "bg-gray-500/15 text-gray-600 dark:text-gray-300", "Not sampled": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
};
const OUT_TONE: Record<string, string> = { Satisfactory: "text-emerald-600 dark:text-emerald-400", "Needs improvement": "text-amber-600 dark:text-amber-400", "Non-compliant": "text-red-600 dark:text-red-400" };
const STATES = ["Pending", "Action open", "Ready to close", "Closed", "Passed", "Not sampled", ""];
const fmtDate = (d: any) => d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
const fmtDur = (s: any) => s ? `${Math.floor(Number(s) / 60)}:${String(Math.round(Number(s) % 60)).padStart(2, "0")}` : "";

async function api(path: string, method = "GET", body?: any) {
  const r = await fetch(`/api/call-audits${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

/** Same rule as the server: Yes ÷ (Yes + No); a "No" on a critical point = Non-compliant. */
function evaluate(meta: any, checklist: Record<string, any>) {
  let yes = 0, no = 0, critical = false;
  for (const c of meta?.checklist || []) { const v = checklist[c.id]?.v; if (v === "yes") yes++; else if (v === "no") { no++; if (c.critical) critical = true; } }
  const score = yes + no ? Math.round((yes / (yes + no)) * 100) : null;
  return { score, outcome: critical ? "Non-compliant" : score === null ? "" : score < 80 ? "Needs improvement" : "Satisfactory" };
}

export default function CallAuditsPage({ t }: { t: any; isDark?: boolean }) {
  const [meta, setMeta] = useState<any>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [kpis, setKpis] = useState<any>({});
  const [state, setState] = useState("Pending");
  const [search, setSearch] = useState(""); const [batch, setBatch] = useState("");
  const [open, setOpen] = useState<any | null>(null);
  const [showUpload, setShowUpload] = useState(false); const [showSample, setShowSample] = useState(false); const [showHow, setShowHow] = useState(false);

  const loadMeta = () => api("/meta").then(setMeta).catch(e => appToast(e.message, "error"));
  const load = useCallback(() => {
    const q = new URLSearchParams(); if (state) q.set("state", state); if (search) q.set("search", search); if (batch) q.set("batch", batch);
    api(`/?${q}`).then(d => { setRows(d.data); setKpis(d.kpis); }).catch(e => { setRows([]); appToast(e.message, "error"); });
  }, [state, search, batch]);
  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  const refresh = () => { load(); loadMeta(); };
  const exportCsv = async () => {
    try {
      const r = await fetch("/api/call-audits/export.csv"); if (!r.ok) throw new Error("Export failed");
      const u = URL.createObjectURL(await r.blob()); const el = document.createElement("a");
      el.href = u; el.download = `call-audits-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
    } catch (e: any) { appToast(e.message, "error"); }
  };

  const tiles: [string, any, string][] = [
    ["In sample", kpis.sampled ?? "—", ""], ["To audit", kpis.pending ?? "—", "text-amber-600 dark:text-amber-400"],
    ["Audited", kpis.sampled ? `${kpis.audited} · ${kpis.coverage}%` : kpis.audited ?? "—", "text-emerald-600 dark:text-emerald-400"],
    ["Issues identified", kpis.issues ?? "—", "text-red-600 dark:text-red-400"], ["Actions open", kpis.actions_open ?? "—", "text-red-600 dark:text-red-400"],
    ["Ready to close", kpis.ready_to_close ?? "—", "text-violet-600 dark:text-violet-300"],
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`m-toolbar px-4 py-3 border-b ${t.border} flex items-center gap-2 flex-wrap flex-shrink-0`}>
        <div className="m-title flex items-center gap-2 mr-auto">
          <PhoneCall className={`w-4 h-4 ${t.textMuted}`} />
          <span className={`text-sm font-bold ${t.text}`}>Call Recording Audits</span>
          <button onClick={() => setShowHow(v => !v)} title="How it works" className={`p-1 rounded ${t.textMuted} hover:bg-gray-500/10`}><Info className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={refresh} className={`text-xs px-2.5 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`} title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
        <button onClick={exportCsv} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1.5`}><Download className="w-3.5 h-3.5" /> Export</button>
        <button onClick={() => setShowSample(true)} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1.5`}><Shuffle className="w-3.5 h-3.5" /> Pick sample</button>
        <button onClick={() => setShowUpload(true)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Add recordings</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {showHow && (
          <div className="m-4 mb-0 rounded-xl bg-sky-500/10 text-sky-900 dark:text-sky-100 text-[13px] p-3 space-y-1">
            <div><b>1. Upload</b> call recordings from the telephone / dialer system (date, time and number are read from file names like 20261114_103522_9876543210.mp3).</div>
            <div><b>2. Sample</b> — tick "Add to the audit sample" while uploading, or upload everything and use <b>Pick sample</b> for a random or risk-based pick.</div>
            <div><b>3. Audit</b> — listen (speed 1×–2×, ±10 s), optionally transcribe and run the AI pre-check, then answer each checklist point Yes / No / N.A. A "No" on a critical point (★) makes the call Non-compliant.</div>
            <div><b>4. Result</b> — <b>Passed</b>, or <b>Issues identified</b> (automatic when any point is "No"). Issues need an issue category and comments, and raise a Service Request (category Call Audit) for the action owner automatically, with the audit reference. The audit shows "Action open" until its SRs are resolved.</div>
            <div><b>Call ID</b> — every audit names the call it covers (the telephone system's Call ID; one audit per Call ID), plus agent / extension, line, investor, folio, ARN and transaction reference in Call details.</div>
            <div><b>6. Close</b> — once all SRs are resolved the audit shows "Ready to close"; the auditor closes it with closure remarks. Closed audits can't be changed.</div>
            <div><b>5. More SRs</b> — after the audit, "Raise SR" creates further SRs with the same reference (e.g. for training or another team). Export gives the full audit register.</div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 pb-2">
          {tiles.map(([l, v, tone]) => (
            <div key={l} className={`rounded-xl border ${t.border} px-3 py-2`}>
              <div className={`text-[11px] ${t.textMuted}`}>{l}</div>
              <div className={`text-lg font-bold ${tone || t.text}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {STATES.map(s => (
              <button key={s || "all"} onClick={() => setState(s)} className={`text-xs px-2.5 py-1 rounded-full ${state === s ? "bg-blue-600 text-white" : `${t.bgCard2} ${t.textMuted}`}`}>{s || "All"}</button>
            ))}
          </div>
          <div className={`flex items-center gap-2 ${t.bgCard2} rounded-lg px-3 py-1.5 flex-1 min-w-40 max-w-xs ml-auto`}>
            <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Code, employee, number, client…" className={`bg-transparent text-xs ${t.text} outline-none w-full`} />
            {search && <button onClick={() => setSearch("")} className={t.textMuted}><X className="w-3 h-3" /></button>}
          </div>
          {!!meta?.batches?.length && (
            <select value={batch} onChange={e => setBatch(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
              <option value="">All samples</option>
              {meta.batches.map((b: any) => <option key={b.sample_batch} value={b.sample_batch}>{b.sample_batch} ({b.n})</option>)}
            </select>
          )}
        </div>
        {!rows ? <div className={`text-xs ${t.textMuted} p-6 text-center`}>Loading…</div> : !rows.length ? (
          <div className={`text-sm ${t.textMuted} p-10 text-center`}>
            {state === "Pending" ? "Nothing waiting to be audited." : "No calls here."} {kpis.total === 0 && <>Start with <b>Upload recordings</b>.</>}
          </div>
        ) : (<>
          <MList>
            {rows.map(r => (
              <MCard key={r.id} onClick={() => setOpen(r)} title={`${r.audit_code} · ${r.employee_name || "Employee not set"}`}
                sub={[r.call_id ? `Call ${r.call_id}` : "Call ID not set", fmtDate(r.call_date), r.call_time, r.phone || r.caller_name].filter(Boolean).join(" · ")}
                badge={<span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${STATE_TONE[r.state] || ""}`}>{r.state}</span>}
                value={r.result ? <span className={r.result === "Passed" ? OUT_TONE.Satisfactory : OUT_TONE["Non-compliant"]}>{r.result}{r.issue_category ? ` · ${r.issue_category}` : ""}</span> : undefined}
                left={r.team || ""} right={r.sr_code || r.sample_batch || ""} />
            ))}
          </MList>
          <table className="hidden md:table w-full text-xs">
            <thead><tr className={`text-left ${t.textMuted} border-b ${t.border}`}>
              {["Audit", "Call ID", "Call", "Employee", "Caller", "Purpose", "Sample", "Status", "Result", "Action SR"].map(h => <th key={h} className="px-3 py-2 font-medium uppercase text-[10px] tracking-wide">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} onClick={() => setOpen(r)} className={`border-b ${t.border} ${t.rowHover} cursor-pointer`}>
                  <td className="px-3 py-2 font-mono text-blue-500 whitespace-nowrap">{r.audit_code}{!r.has_audio && <span className={`ml-1 ${t.textMuted}`} title="No recording uploaded">·</span>}</td>
                  <td className={`px-3 py-2 font-mono ${r.call_id ? t.text : "text-amber-500"} whitespace-nowrap`}>{r.call_id || "not set"}<div className={`font-sans ${t.textMuted}`}>{[r.agent_id && `Agent ${r.agent_id}`, r.line_number].filter(Boolean).join(" · ")}</div></td>
                  <td className={`px-3 py-2 ${t.text} whitespace-nowrap`}>{fmtDate(r.call_date)} {r.call_time}<div className={t.textMuted}>{[r.direction, fmtDur(r.duration_sec)].filter(Boolean).join(" · ")}</div></td>
                  <td className={`px-3 py-2 ${t.text}`}>{r.employee_name || "—"}<div className={t.textMuted}>{r.team}</div></td>
                  <td className={`px-3 py-2 ${t.text}`}>{r.client_name || r.caller_name || r.phone || "—"}<div className={t.textMuted}>{[r.folio_no && `Folio ${r.folio_no}`, r.arn_code && `ARN ${r.arn_code}`, r.caller_type, r.client_name ? r.phone : ""].filter(Boolean).join(" · ")}</div></td>
                  <td className={`px-3 py-2 ${t.textMuted}`}>{r.call_purpose || "—"}</td>
                  <td className={`px-3 py-2 ${t.textMuted}`}>{r.sample_batch || "—"}<div>{r.sample_reason}</div></td>
                  <td className="px-3 py-2"><span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${STATE_TONE[r.state] || ""}`}>{r.state}</span></td>
                  <td className="px-3 py-2">{r.result ? <span className={`font-semibold ${r.result === "Passed" ? OUT_TONE.Satisfactory : OUT_TONE["Non-compliant"]}`}>{r.result}{r.score != null ? ` · ${Number(r.score)}%` : ""}</span> : <span className={t.textMuted}>—</span>}
                    {r.issue_category && <div className="text-red-500/80">{r.issue_category}</div>}
                    {r.auditor_name && <div className={t.textMuted}>{r.auditor_name}</div>}</td>
                  <td className="px-3 py-2">{r.srs?.length ? r.srs.map((x: any) => <div key={x.id} className="font-mono text-blue-500 whitespace-nowrap">{x.sr_code}<span className={`ml-1 ${t.textMuted} font-sans`}>{x.status}</span></div>) : <span className={t.textMuted}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}
      </div>
      {open && meta && <AuditPanel t={t} meta={meta} row={open} onClose={() => setOpen(null)} onSaved={r => { setOpen(r); load(); }} onDeleted={() => { setOpen(null); refresh(); }} />}
      {showUpload && meta && <UploadModal t={t} meta={meta} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); refresh(); }} />}
      {showSample && meta && <SampleModal t={t} meta={meta} onClose={() => setShowSample(false)} onDone={b => { setShowSample(false); setBatch(b); setState("Pending"); refresh(); }} />}
    </div>
  );
}

function Shell({ title, onClose, children, wide }: { title: any; onClose: () => void; children: any; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/55 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full ${wide ? "sm:max-w-6xl" : "sm:max-w-xl"} bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] flex flex-col`}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 min-w-0 font-semibold text-gray-900 dark:text-white">{title}</div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const L = ({ label, children, span2 }: { label: string; children: any; span2?: boolean }) => (
  <label className={`block ${span2 ? "sm:col-span-2" : ""}`}><span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>{children}</label>
);
function EmployeePicker({ meta, id, name, onChange }: { meta: any; id?: string | null; name?: string | null; onChange: (id: string | null, name: string) => void }) {
  return (
    <>
      <input list="ca-users" value={name || ""} className={inputCls} placeholder="Name of the person on the call"
        onChange={e => { const u = (meta.users || []).find((x: any) => x.name === e.target.value); onChange(u?.id || null, e.target.value); }} />
      <datalist id="ca-users">{(meta.users || []).map((u: any) => <option key={u.id} value={u.name}>{u.role}</option>)}</datalist>
      {name && !id && <span className="text-[10px] text-gray-500">Not a CRM user — an action SR needs an owner who is.</span>}
    </>
  );
}

function ClientPicker({ id, name, onChange }: { id?: string | null; name?: string | null; onChange: (id: string | null, name: string) => void }) {
  const [q, setQ] = useState(name || ""); const [list, setList] = useState<any[]>([]); const [open, setOpen] = useState(false);
  useEffect(() => { setQ(name || ""); }, [name]);
  useEffect(() => {
    if (!open || q.trim().length < 2) { setList([]); return; }
    const h = setTimeout(() => fetch(`/api/clients?search=${encodeURIComponent(q.trim())}&limit=8`).then(r => r.json()).then(d => setList(d.data || [])).catch(() => setList([])), 250);
    return () => clearTimeout(h);
  }, [q, open]);
  return (
    <div className="relative">
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); if (!e.target.value) onChange(null, ""); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
        className={inputCls} placeholder="Search name, code, PAN, mobile" />
      {id && <span className="text-[10px] text-emerald-600">Linked to the client record</span>}
      {open && !!list.length && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-56 overflow-y-auto">
          {list.map(c => <button key={c.id} onMouseDown={() => { onChange(c.id, c.name); setQ(c.name); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-500/10 text-gray-800 dark:text-gray-100">{c.name} <span className="text-[11px] text-gray-500">{c.client_code}</span></button>)}
        </div>
      )}
    </div>
  );
}

function UploadModal({ t, meta, onClose, onDone }: { t: any; meta: any; onClose: () => void; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"file" | "path">("file");
  const [folder, setFolder] = useState(""); const [paths, setPaths] = useState("");
  const pathList = paths.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const [d, setD] = useState<any>({ vertical: meta.businesses?.includes("AMC") ? "AMC" : meta.businesses?.[0] || "AMC", team: "", call_purpose: "", caller_type: "", direction: "Outbound", employee_id: null, employee_name: "",
    in_sample: true, sample_batch: `Sample ${new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`, sample_reason: "Random" });
  const [busy, setBusy] = useState<number | null>(null);
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));
  const pick = (list: FileList | null) => setFiles(f => [...f, ...Array.from(list || []).filter(x => /^audio\/|\.(mp3|wav|m4a|ogg|webm|aac|amr)$/i.test(x.type || x.name))]);
  const common = () => { const q = new URLSearchParams(); Object.entries(d).forEach(([k, v]) => { if (v !== "" && v !== null && v !== undefined && !(k === "sample_batch" && !d.in_sample)) q.set(k, String(v)); }); return q; };
  const join = (dir: string, name: string) => dir ? `${dir.replace(/[\\/]+$/, "")}${dir.includes("/") && !dir.includes("\\") ? "/" : "\\"}${name}` : "";
  const go = async () => {
    if (mode === "path") {
      if (!pathList.length) return appToast("Enter at least one file name and path", "error");
      let ok = 0;
      for (let i = 0; i < pathList.length; i++) {
        setBusy(i);
        // a line can be "CALL-ID, path" (e.g. pasted from the telephone system's export) or just the path
        const m = pathList[i].match(/^([^,\\/]{2,80}?)\s*[,;\t]\s*(.+)$/);
        const q = common(); q.set("recording_path", (m ? m[2] : pathList[i]).slice(0, 500)); if (m) q.set("call_id", m[1].trim());
        const r = await fetch(`/api/call-audits/upload?${q}`, { method: "POST", headers: { "Content-Type": "application/octet-stream" } });
        if (r.ok) ok++; else { const e = await r.json().catch(() => ({})); appToast(`${pathList[i]}: ${e.error || "failed"}`, "error"); }
      }
      setBusy(null); appToast(`${ok} call${ok === 1 ? "" : "s"} added by file path`, ok ? "success" : "error"); if (ok) onDone(); return;
    }
    if (!files.length) return appToast("Choose one or more recordings", "error");
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setBusy(i);
      const f = files[i];
      const q = common(); q.set("name", f.name); q.set("mime", f.type || "audio/mpeg");
      if (folder.trim()) q.set("recording_path", join(folder.trim(), f.name).slice(0, 500));
      const dur = await new Promise<number | null>(res => { try { const a = new Audio(URL.createObjectURL(f)); a.onloadedmetadata = () => res(isFinite(a.duration) ? Math.round(a.duration) : null); a.onerror = () => res(null); setTimeout(() => res(null), 4000); } catch { res(null); } });
      if (dur) q.set("duration_sec", String(dur));
      const r = await fetch(`/api/call-audits/upload?${q}`, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: f });
      if (r.ok) ok++; else { const e = await r.json().catch(() => ({})); appToast(`${f.name}: ${e.error || "upload failed"}`, "error"); }
    }
    setBusy(null);
    appToast(`${ok} recording${ok === 1 ? "" : "s"} uploaded${d.in_sample ? ` to ${d.sample_batch}` : ""}`, ok ? "success" : "error");
    if (ok) onDone();
  };
  return (
    <Shell title="Add call recordings" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex gap-1">
          {([["file", "Upload recordings"], ["path", "Enter file name & path"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mode === k ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-500/10"}`}>{l}</button>
          ))}
        </div>
        {mode === "path" ? (
          <L label="One call per line — the Call ID, a comma, then the file name and path (or just the path)">
            <textarea rows={5} value={paths} onChange={e => setPaths(e.target.value)} className={`${inputCls} font-mono text-xs`}
              placeholder={"TTML-88213457, \\\\recorder01\\calls\\2026\\11\\20261114_103522_9876543210.wav\nTTML-88213502, /mnt/ttml/2026-11-14/20261114_104010_9123456780.mp3"} />
            <span className="text-[10px] text-gray-500">{pathList.length} recording{pathList.length === 1 ? "" : "s"} · the auditor opens the file from that location, or uploads it later in the audit screen</span>
          </L>
        ) : (<>
        <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files); }}
          className="block rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-5 text-center cursor-pointer hover:border-blue-500">
          <Upload className="w-6 h-6 mx-auto text-gray-400" />
          <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">Drop recordings here or tap to choose</div>
          <div className="text-[11px] text-gray-500">mp3, wav, m4a, ogg · date, time and number are read from the file name when present</div>
          <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.amr" multiple className="hidden" onChange={e => pick(e.target.files)} />
        </label>
        {!!files.length && (
          <div className="max-h-32 overflow-y-auto text-xs space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                {busy === i ? <RefreshCw className="w-3 h-3 animate-spin" /> : busy !== null && i < busy ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <FileText className="w-3 h-3 text-gray-400" />}
                <span className="flex-1 truncate">{f.name}</span><span className="text-gray-400">{(f.size / 1048576).toFixed(1)} MB</span>
                {busy === null && <button onClick={() => setFiles(x => x.filter((_, j) => j !== i))} className="text-gray-400"><X className="w-3 h-3" /></button>}
              </div>
            ))}
          </div>
        )}
        <L label="Folder on the recorder server / shared drive (optional — saved with each file name)">
          <input value={folder} onChange={e => setFolder(e.target.value)} className={`${inputCls} font-mono text-xs`} placeholder="\\\\recorder01\\calls\\2026\\11" />
        </L>
        </>)}
        <div className="text-[11px] text-gray-500">Applied to every file (each one can be changed while auditing):</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Employee on the call"><EmployeePicker meta={meta} id={d.employee_id} name={d.employee_name} onChange={(id, n) => setD((x: any) => ({ ...x, employee_id: id, employee_name: n }))} /></L>
          <L label="Team"><select value={d.team} onChange={e => set("team", e.target.value)} className={inputCls}><option value="">—</option>{meta.teams.map((x: string) => <option key={x}>{x}</option>)}</select></L>
          <L label="Call purpose"><select value={d.call_purpose} onChange={e => set("call_purpose", e.target.value)} className={inputCls}><option value="">—</option>{meta.purposes.map((x: string) => <option key={x}>{x}</option>)}</select></L>
          <L label="Caller type"><select value={d.caller_type} onChange={e => set("caller_type", e.target.value)} className={inputCls}><option value="">—</option>{meta.caller_types.map((x: string) => <option key={x}>{x}</option>)}</select></L>
          <L label="Direction"><select value={d.direction} onChange={e => set("direction", e.target.value)} className={inputCls}><option>Outbound</option><option>Inbound</option></select></L>
          <L label="Business"><select value={d.vertical} onChange={e => set("vertical", e.target.value)} className={inputCls}>{meta.businesses.map((x: string) => <option key={x}>{x}</option>)}</select></L>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100"><input type="checkbox" checked={d.in_sample} onChange={e => set("in_sample", e.target.checked)} /> Add to the audit sample</label>
        {d.in_sample && (
          <div className="grid sm:grid-cols-2 gap-3">
            <L label="Sample name"><input value={d.sample_batch} onChange={e => set("sample_batch", e.target.value)} className={inputCls} /></L>
            <L label="Why sampled"><select value={d.sample_reason} onChange={e => set("sample_reason", e.target.value)} className={inputCls}>{meta.sample_reasons.map((x: string) => <option key={x}>{x}</option>)}</select></L>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
        <button onClick={onClose} className={`text-sm px-4 py-2 rounded-lg ${t.textMuted}`}>Cancel</button>
        {(() => { const n = mode === "path" ? pathList.length : files.length; return (
        <button onClick={go} disabled={busy !== null || !n} className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">
          {busy !== null ? `Saving ${busy + 1} of ${n}…` : mode === "path" ? `Add ${n || ""} call${n === 1 ? "" : "s"}` : `Upload ${n || ""}`}</button>); })()}
      </div>
    </Shell>
  );
}

function SampleModal({ t, meta, onClose, onDone }: { t: any; meta: any; onClose: () => void; onDone: (batch: string) => void }) {
  const [d, setD] = useState<any>({ count: 10, batch: `Sample ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, reason: "Random", from: "", to: "", team: "", employee: "" });
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));
  const go = async () => {
    try {
      const r = await api("/sample", "POST", d);
      if (!r.picked) return appToast("No un-sampled recordings match — upload more or widen the dates", "error");
      appToast(`${r.picked} call${r.picked === 1 ? "" : "s"} picked for ${d.batch}`, "success"); onDone(d.batch);
    } catch (e: any) { appToast(e.message, "error"); }
  };
  return (
    <Shell title="Pick an audit sample" onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="text-[13px] text-gray-600 dark:text-gray-300">Picks calls at random from uploaded recordings that are not yet in a sample.</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="How many calls"><input type="number" min={1} max={500} value={d.count} onChange={e => set("count", e.target.value)} className={inputCls} /></L>
          <L label="Why sampled"><select value={d.reason} onChange={e => set("reason", e.target.value)} className={inputCls}>{meta.sample_reasons.map((x: string) => <option key={x}>{x}</option>)}</select></L>
          <L label="Sample name" span2><input value={d.batch} onChange={e => set("batch", e.target.value)} className={inputCls} /></L>
          <L label="Calls from"><input type="date" value={d.from} onChange={e => set("from", e.target.value)} className={inputCls} /></L>
          <L label="Calls to"><input type="date" value={d.to} onChange={e => set("to", e.target.value)} className={inputCls} /></L>
          <L label="Team (optional)"><select value={d.team} onChange={e => set("team", e.target.value)} className={inputCls}><option value="">Any</option>{meta.teams.map((x: string) => <option key={x}>{x}</option>)}</select></L>
          <L label="Employee (optional)"><input value={d.employee} onChange={e => set("employee", e.target.value)} className={inputCls} placeholder="Any" /></L>
        </div>
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
        <button onClick={onClose} className={`text-sm px-4 py-2 rounded-lg ${t.textMuted}`}>Cancel</button>
        <button onClick={go} className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5"><Shuffle className="w-4 h-4" /> Pick</button>
      </div>
    </Shell>
  );
}

function Player({ id, path, hasAudio, onAttached }: { id: string; path?: string | null; hasAudio?: boolean; onAttached: (r: any) => void }) {
  const [up, setUp] = useState(false);
  const attach = async (f?: File) => {
    if (!f) return; setUp(true);
    try {
      const r = await fetch(`/api/call-audits/${id}/audio?${new URLSearchParams({ name: f.name, mime: f.type || "audio/mpeg" })}`, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: f });
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Upload failed");
      appToast("Recording attached", "success"); onAttached(d);
    } catch (e: any) { appToast(e.message, "error"); } finally { setUp(false); }
  };
  const copy = () => { try { navigator.clipboard.writeText(path || ""); appToast("Path copied", "success"); } catch { /* ignore */ } };
  const pathRow = path ? (
    <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300 mt-2"><span className="flex-shrink-0">File:</span>
      <code className="flex-1 min-w-0 truncate" title={path}>{path}</code>
      <button onClick={copy} className="text-blue-600 flex-shrink-0">Copy</button></div>) : null;
  const attachBtn = (label: string) => (
    <label className="text-[11px] text-blue-600 cursor-pointer inline-flex items-center gap-1">{up ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {label}
      <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.amr" className="hidden" onChange={e => attach(e.target.files?.[0])} /></label>);
  return <PlayerInner id={id} hasAudio={!!hasAudio} pathRow={pathRow} attachBtn={attachBtn} />;
}
function PlayerInner({ id, hasAudio, pathRow, attachBtn }: { id: string; hasAudio: boolean; pathRow: any; attachBtn: (l: string) => any }) {
  // <audio> can't send the sign-in token, so the recording is fetched with it and played from memory
  const [src, setSrc] = useState(""); const [err, setErr] = useState(!hasAudio);
  useEffect(() => {
    if (!hasAudio) return; let url = "", gone = false;
    fetch(`/api/call-audits/${id}/audio`).then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(b => { if (!gone) { url = URL.createObjectURL(b); setSrc(url); } }).catch(() => !gone && setErr(true));
    return () => { gone = true; if (url) URL.revokeObjectURL(url); };
  }, [id, hasAudio]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false); const [rate, setRate] = useState(1); const [pos, setPos] = useState(0); const [dur, setDur] = useState(0);
  useEffect(() => { if (a.current) a.current.playbackRate = rate; }, [rate]);
  const skip = (s: number) => { if (a.current) a.current.currentTime = Math.max(0, Math.min(dur || 1e9, a.current.currentTime + s)); };
  if (err) return (
    <div className="text-xs text-gray-600 dark:text-gray-300 rounded-xl bg-gray-500/10 p-3">
      <div>{pathRow ? "Recording not uploaded — open it from the location below to listen." : "No recording uploaded for this call."}</div>
      {pathRow}<div className="mt-2">{attachBtn("Upload the recording")}</div>
    </div>);
  return (
    <div className="rounded-xl bg-gray-100 dark:bg-gray-900 p-3">
      {!src && <div className="text-[11px] text-gray-500 mb-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Loading the recording…</div>}
      <audio ref={a} src={src || undefined} preload="metadata" onError={() => src && setErr(true)}
        onLoadedMetadata={e => setDur(e.currentTarget.duration)} onTimeUpdate={e => setPos(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <div className="flex items-center gap-2">
        <button onClick={() => skip(-10)} className="p-1.5 text-gray-600 dark:text-gray-300" title="Back 10 s"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={() => (playing ? a.current?.pause() : a.current?.play())} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}</button>
        <button onClick={() => skip(10)} className="p-1.5 text-gray-600 dark:text-gray-300" title="Forward 10 s"><RotateCw className="w-4 h-4" /></button>
        <input type="range" min={0} max={dur || 0} step={0.5} value={pos} onChange={e => { if (a.current) a.current.currentTime = Number(e.target.value); }} className="flex-1 min-w-0" />
        <span className="text-[11px] tabular-nums text-gray-500 whitespace-nowrap">{fmtDur(pos) || "0:00"} / {fmtDur(dur) || "—"}</span>
      </div>
      <div className="flex gap-1 mt-2 justify-end">
        <span className="mr-auto">{attachBtn("Replace")}</span>
        {[1, 1.25, 1.5, 2].map(r => <button key={r} onClick={() => setRate(r)} className={`text-[11px] px-2 py-0.5 rounded ${rate === r ? "bg-blue-600 text-white" : "text-gray-500 bg-gray-500/10"}`}>{r}×</button>)}
      </div>
      {pathRow}
    </div>
  );
}

function AuditPanel({ t, meta, row, onClose, onSaved, onDeleted }: { t: any; meta: any; row: any; onClose: () => void; onSaved: (r: any) => void; onDeleted: () => void }) {
  const [r, setR] = useState<any>(row);
  const [full, setFull] = useState<any>(null);
  const [det, setDet] = useState<any>({});
  const [ck, setCk] = useState<Record<string, any>>(row.checklist || {});
  const [f, setF] = useState<any>({ result: row.result || "", issue_category: row.issue_category || "", outcome: row.outcome || "", severity: row.severity || "",
    observations: row.observations || "", recommendation: row.recommendation || "",
    action_owner_id: row.action_owner_id || "", action_due: row.action_due ? String(row.action_due).slice(0, 10) : "" });
  const [busy, setBusy] = useState(""); const [tab, setTab] = useState<"check" | "details">("check");
  useEffect(() => { api(`/${row.id}`).then(d => { setFull(d); setR(d); }).catch(() => {}); }, [row.id]);
  const ev = useMemo(() => evaluate(meta, ck), [meta, ck]);
  const [callId, setCallId] = useState<string>(row.call_id || "");
  const [closeNote, setCloseNote] = useState("");
  const closed = !!r.closed_at;
  const closeAudit = async () => {
    setBusy("close");
    try { const d = await api(`/${r.id}/close`, "POST", { remarks: closeNote }); setR(d); onSaved(d); appToast(`${r.audit_code} closed`, "success"); }
    catch (e: any) { appToast(e.message, "error"); } finally { setBusy(""); }
  };
  const failedIds = (meta.checklist || []).filter((c: any) => ck[c.id]?.v === "no").map((c: any) => c.id);
  const forced = failedIds.length > 0;                       // any "No" = issues identified
  const issues = forced || f.result === "Issues identified";
  const result = issues ? "Issues identified" : f.result === "Passed" ? "Passed" : (ev.score !== null ? "Passed" : "");
  const issueCat = f.issue_category || (forced ? meta.issue_for?.[failedIds[0]] || "" : "");
  const outcome = !issues ? "Satisfactory" : (f.outcome && f.outcome !== "Satisfactory" ? f.outcome : ev.outcome && ev.outcome !== "Satisfactory" ? ev.outcome : "Needs improvement");
  const willRaise = !r.sr_id && issues;
  const [srForm, setSrForm] = useState<any | null>(null);
  const ownerDefault = r.employee_id || "";
  const setC = (id: string, v: string) => setCk(x => ({ ...x, [id]: { ...(x[id] || {}), v: x[id]?.v === v ? "" : v } }));
  const ai = full?.ai_check;

  const saveDetails = async () => {
    if (!Object.keys(det).length) return;
    try { const d = await api(`/${r.id}`, "PUT", det); setR(d); setDet({}); appToast("Call details saved", "success"); onSaved(d); } catch (e: any) { appToast(e.message, "error"); }
  };
  const save = async () => {
    setBusy("save");
    try {
      if (Object.keys(det).length) { const d = await api(`/${r.id}`, "PUT", det); setR(d); setDet({}); }
      const d = await api(`/${r.id}/audit`, "POST", { checklist: ck, ...f, call_id: callId, result, issue_category: issueCat, outcome, action_owner_id: f.action_owner_id || ownerDefault || null });
      appToast(d.sr_created ? `Audit saved — ${d.sr_created} raised for ${d.action_owner_name}` : "Audit saved", "success");
      onSaved(d);
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(""); }
  };
  const raiseSr = async () => {
    setBusy("sr");
    try {
      const d = await api(`/${r.id}/sr`, "POST", srForm);
      appToast(`${d.sr_created} raised with reference ${r.audit_code}`, "success"); setSrForm(null); setR(d); onSaved(d);
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(""); }
  };
  const transcribe = async () => {
    setBusy("tr");
    try { const d = await api(`/${r.id}/transcribe`, "POST"); setFull((x: any) => ({ ...x, transcript: d.transcript, transcript_source: d.source })); }
    catch (e: any) { appToast(e.message, "error"); } finally { setBusy(""); }
  };
  const aiCheck = async () => {
    setBusy("ai");
    try {
      const d = await api(`/${r.id}/ai-check`, "POST"); setFull((x: any) => ({ ...x, ai_check: d }));
      // fill only unanswered points with the AI's suggestion — the auditor confirms
      setCk(x => { const n = { ...x }; for (const [k, v] of Object.entries<any>(d.points || {})) if (!n[k]?.v && ["yes", "no", "na"].includes(v.v)) n[k] = { v: v.v, note: n[k]?.note || "" }; return n; });
      appToast("AI suggestions filled in the unanswered points — check each one", "info");
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(""); }
  };
  const del = async () => {
    if (!(await appConfirm({ title: "Delete recording", message: `Delete ${r.audit_code} and its recording? Only calls not yet audited can be deleted.`, confirmLabel: "Delete", tone: "danger" }))) return;
    try { await api(`/${r.id}`, "DELETE"); appToast("Deleted", "success"); onDeleted(); } catch (e: any) { appToast(e.message, "error"); }
  };
  const dv = (k: string) => (k in det ? det[k] : r[k] ?? "");
  const sd = (k: string, v: any) => setDet((x: any) => ({ ...x, [k]: v }));

  return (
    <Shell wide onClose={onClose} title={<span className="flex items-center gap-2 flex-wrap">{r.audit_code}
      <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${STATE_TONE[r.state] || ""}`}>{r.state}</span>
      <span className="text-xs font-normal text-gray-500 truncate">{[fmtDate(r.call_date), r.call_time, r.employee_name, r.phone].filter(Boolean).join(" · ")}</span></span>}>
      <div className="flex-1 overflow-y-auto grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: listen + transcript */}
        <div className="p-4 space-y-3 lg:border-r border-gray-200 dark:border-gray-800">
          <Player key={`${r.id}-${r.audio_bytes || 0}`} id={r.id} path={r.recording_path} hasAudio={r.has_audio} onAttached={d => { setR(d); setFull((x: any) => ({ ...(x || {}), ...d, transcript: x?.transcript })); onSaved(d); }} />
          {r.audio_name && <div className="text-[11px] text-gray-500 truncate">{r.audio_name}</div>}
          <div className="flex gap-2 flex-wrap">
            <button onClick={transcribe} disabled={!!busy || !r.has_audio} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 disabled:opacity-50">
              {busy === "tr" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} {full?.transcript ? "Transcribe again" : "Transcribe"}</button>
            <button onClick={aiCheck} disabled={!!busy || !full?.transcript} title={full?.transcript ? "" : "Transcribe first"} className="text-xs px-3 py-1.5 rounded-lg border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 flex items-center gap-1.5 disabled:opacity-50">
              {busy === "ai" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI pre-check</button>
          </div>
          {ai?.summary && <div className="rounded-lg bg-violet-500/10 text-violet-900 dark:text-violet-100 text-[12px] p-2.5"><b>AI pre-check:</b> {ai.summary}{ai.suggested_outcome && <> · suggests <b>{ai.suggested_outcome}</b></>}</div>}
          {full?.transcript ? (
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Transcript {full.transcript_source && `· ${full.transcript_source}`}</div>
              <div className="text-[12px] whitespace-pre-wrap text-gray-800 dark:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 max-h-72 overflow-y-auto">{full.transcript}</div>
            </div>
          ) : <div className="text-[11px] text-gray-500">Transcription is optional — it uses the meeting-transcription setup and the AI pre-check needs it. The auditor's answers are what count.</div>}
          {r.audited_at && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-[13px] space-y-1.5">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Audit outcome</div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-700 dark:text-gray-200">
                <span className="text-gray-500">Call ID</span><span className="font-mono">{r.call_id || "—"}</span>
                <span className="text-gray-500">Result</span><span className={`font-semibold ${r.result === "Passed" ? OUT_TONE.Satisfactory : OUT_TONE["Non-compliant"]}`}>{r.result}{r.issue_category ? ` — ${r.issue_category}` : ""}</span>
                <span className="text-gray-500">Score</span><span>{r.score != null ? `${Number(r.score)}%` : "—"} · {r.outcome} · {r.severity}</span>
                <span className="text-gray-500">SRs</span><span>{r.srs?.length ? r.srs.map((x: any) => `${x.sr_code} (${x.status})`).join(", ") : "None"}</span>
                <span className="text-gray-500">Audited</span><span>{r.auditor_name} · {new Date(r.audited_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                {closed && <><span className="text-gray-500">Closed</span><span>{r.closed_by_name} · {new Date(r.closed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  {r.closure_remarks && <><span className="text-gray-500">Remarks</span><span>{r.closure_remarks}</span></>}</>}
              </div>
              {r.state === "Ready to close" && (
                <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-[11px] text-violet-600 dark:text-violet-300">All SRs from this audit are resolved — close the audit with what was done.</div>
                  <textarea rows={2} value={closeNote} onChange={e => setCloseNote(e.target.value)} className={inputCls} placeholder="Closure remarks (e.g. investor called back with the correct disclosure; RM retrained on 21 Nov)" />
                  <div className="flex justify-end"><button onClick={closeAudit} disabled={!!busy} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
                    {busy === "close" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Close audit</button></div>
                </div>
              )}
            </div>
          )}
          {(!!r.srs?.length || r.audited_at) && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <div className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-1">Service Requests from this audit</span>
                {r.audited_at && !closed && !srForm && <button onClick={() => setSrForm({ subject: `Call audit ${r.audit_code}: ${r.issue_category || "follow-up"}`, details: "", owner_id: r.action_owner_id || r.employee_id || "", priority: r.severity || "Medium", due: "" })}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-600 text-white flex items-center gap-1"><Plus className="w-3 h-3" /> Raise SR</button>}</div>
              {!r.srs?.length && !srForm && <div className="text-[11px] text-gray-500">None yet.</div>}
              {(r.srs || []).map((x: any) => (
                <button key={x.id} onClick={() => openRecord("sr", { id: x.id })} className={`w-full text-left rounded-lg border p-2 text-[13px] flex items-center gap-2 ${["Resolved", "Closed"].includes(x.status) ? "border-gray-200 dark:border-gray-800" : "border-red-300 dark:border-red-800"}`}>
                  {["Resolved", "Closed"].includes(x.status) ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className="flex-1 min-w-0"><b className="font-mono">{x.sr_code}</b> · {x.status} · {x.assignee || "—"}<span className="block text-[11px] text-gray-500 truncate">{x.subject}</span></span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
              {srForm && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] text-gray-500">The SR carries reference {r.audit_code} with the call details and audit findings.</div>
                  <L label="Subject"><input value={srForm.subject} onChange={e => setSrForm((x: any) => ({ ...x, subject: e.target.value }))} className={inputCls} /></L>
                  <L label="What needs to be done"><textarea rows={2} value={srForm.details} onChange={e => setSrForm((x: any) => ({ ...x, details: e.target.value }))} className={inputCls} /></L>
                  <div className="grid grid-cols-2 gap-2">
                    <L label="For"><select value={srForm.owner_id} onChange={e => setSrForm((x: any) => ({ ...x, owner_id: e.target.value }))} className={inputCls}>
                      <option value="">— choose —</option>{(meta.users || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></L>
                    <L label="Priority"><select value={srForm.priority} onChange={e => setSrForm((x: any) => ({ ...x, priority: e.target.value }))} className={inputCls}>{meta.severities.slice().reverse().map((x: string) => <option key={x}>{x}</option>)}</select></L>
                    <L label="Due by (default 7 days)"><input type="date" value={srForm.due} onChange={e => setSrForm((x: any) => ({ ...x, due: e.target.value }))} className={inputCls} /></L>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setSrForm(null)} className="text-xs px-3 py-1.5 rounded-lg text-gray-500">Cancel</button>
                    <button onClick={raiseSr} disabled={!!busy || !srForm.owner_id} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1">
                      {busy === "sr" && <RefreshCw className="w-3 h-3 animate-spin" />} Raise SR</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Right: checklist / details */}
        <div className="p-4 space-y-3">
          <div className="flex gap-1">
            {([["check", "Checklist & findings"], ["details", "Call details"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === k ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-500/10"}`}>{l}</button>
            ))}
          </div>
          {tab === "details" ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Call identification</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Call ID * (telephone system)"><input value={callId} onChange={e => { setCallId(e.target.value); sd("call_id", e.target.value); }} className={`${inputCls} font-mono`} placeholder="e.g. TTML-88213457" /></L>
                <L label="Agent / extension ID"><input value={dv("agent_id")} onChange={e => sd("agent_id", e.target.value)} className={inputCls} /></L>
                <L label="Line / DID number"><input value={dv("line_number")} onChange={e => sd("line_number", e.target.value)} className={inputCls} /></L>
                <L label="Investor / client"><ClientPicker id={dv("client_id")} name={"client_id" in det ? det.__client_name : r.client_name} onChange={(id, n) => setDet((x: any) => ({ ...x, client_id: id, __client_name: n }))} /></L>
                <L label="Folio number"><input value={dv("folio_no")} onChange={e => sd("folio_no", e.target.value)} className={inputCls} /></L>
                <L label="Distributor ARN"><input value={dv("arn_code")} onChange={e => sd("arn_code", e.target.value)} className={inputCls} placeholder="ARN-" /></L>
                <L label="Transaction / application reference" span2><input value={dv("txn_ref")} onChange={e => sd("txn_ref", e.target.value)} className={inputCls} /></L>
              </div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 pt-1">Call details</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Call date"><input type="date" value={String(dv("call_date")).slice(0, 10)} onChange={e => sd("call_date", e.target.value)} className={inputCls} /></L>
                <L label="Time"><input type="time" value={dv("call_time")} onChange={e => sd("call_time", e.target.value)} className={inputCls} /></L>
                <L label="Direction"><select value={dv("direction")} onChange={e => sd("direction", e.target.value)} className={inputCls}><option value="">—</option><option>Outbound</option><option>Inbound</option></select></L>
                <L label="Phone number"><input value={dv("phone")} onChange={e => sd("phone", e.target.value)} className={inputCls} /></L>
                <L label="Caller name"><input value={dv("caller_name")} onChange={e => sd("caller_name", e.target.value)} className={inputCls} /></L>
                <L label="Caller type"><select value={dv("caller_type")} onChange={e => sd("caller_type", e.target.value)} className={inputCls}><option value="">—</option>{meta.caller_types.map((x: string) => <option key={x}>{x}</option>)}</select></L>
                <L label="Employee on the call"><EmployeePicker meta={meta} id={dv("employee_id")} name={dv("employee_name")} onChange={(id, n) => setDet((x: any) => ({ ...x, employee_id: id, employee_name: n }))} /></L>
                <L label="Team"><select value={dv("team")} onChange={e => sd("team", e.target.value)} className={inputCls}><option value="">—</option>{meta.teams.map((x: string) => <option key={x}>{x}</option>)}</select></L>
                <L label="Call purpose"><select value={dv("call_purpose")} onChange={e => sd("call_purpose", e.target.value)} className={inputCls}><option value="">—</option>{meta.purposes.map((x: string) => <option key={x}>{x}</option>)}</select></L>
                <L label="Business"><select value={dv("vertical")} onChange={e => sd("vertical", e.target.value)} className={inputCls}>{meta.businesses.map((x: string) => <option key={x}>{x}</option>)}</select></L>
                <L label="Recording file name & path (recorder server / shared drive)" span2><input value={dv("recording_path")} onChange={e => sd("recording_path", e.target.value)} className={`${inputCls} font-mono text-xs`} /></L>
                <L label="Recording reference (dialer / TTML id)"><input value={dv("recording_ref")} onChange={e => sd("recording_ref", e.target.value)} className={inputCls} /></L>
                <L label="Duration (seconds)"><input type="number" value={dv("duration_sec")} onChange={e => sd("duration_sec", e.target.value)} className={inputCls} /></L>
                <L label="Sample"><input value={dv("sample_batch")} onChange={e => sd("sample_batch", e.target.value)} className={inputCls} /></L>
                <L label="Why sampled"><select value={dv("sample_reason")} onChange={e => sd("sample_reason", e.target.value)} className={inputCls}><option value="">—</option>{meta.sample_reasons.map((x: string) => <option key={x}>{x}</option>)}</select></L>
              </div>
              <div className="flex items-center gap-2">
                {!r.audited_at && <button onClick={del} className="text-xs px-3 py-1.5 rounded-lg text-red-600 flex items-center gap-1.5 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
                <button onClick={saveDetails} disabled={!Object.keys(det).length} className="ml-auto text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40">Save details</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-xl border p-3 flex flex-wrap items-end gap-3 ${callId ? "border-gray-200 dark:border-gray-800" : "border-amber-400 bg-amber-500/5"}`}>
                <L label="Call ID being audited *"><input value={callId} disabled={closed} onChange={e => setCallId(e.target.value)} className={`${inputCls} font-mono w-56`} placeholder="from the telephone system" /></L>
                <div className="text-[11px] text-gray-500 pb-2 min-w-0">{[fmtDate(r.call_date), r.call_time, r.direction, r.phone, r.employee_name, r.client_name, r.folio_no && `Folio ${r.folio_no}`].filter(x => x && x !== "—").join(" · ") || "Add call details in the Call details tab"}</div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {meta.checklist.map((c: any) => {
                  const v = ck[c.id]?.v || ""; const sug = ai?.points?.[c.id];
                  return (
                    <div key={c.id} className={`px-3 py-2 ${v === "no" ? "bg-red-500/5" : ""}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 text-[13px] text-gray-800 dark:text-gray-100">{c.critical && <span className="text-red-500 mr-1" title="Critical — a No makes the call Non-compliant">★</span>}{c.label}</div>
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                          {(["yes", "no", "na"] as const).map(o => (
                            <button key={o} onClick={() => setC(c.id, o)} className={`text-[11px] px-2.5 py-1 font-semibold ${v === o ? (o === "yes" ? "bg-emerald-600 text-white" : o === "no" ? "bg-red-600 text-white" : "bg-gray-500 text-white") : "text-gray-500"}`}>
                              {o === "na" ? "N.A." : o === "yes" ? "Yes" : "No"}</button>
                          ))}
                        </div>
                      </div>
                      {sug?.why && <div className="text-[11px] text-violet-600 dark:text-violet-300 mt-0.5">AI: {sug.v?.toUpperCase()} — {sug.why}</div>}
                      {v === "no" && <input value={ck[c.id]?.note || ""} onChange={e => setCk(x => ({ ...x, [c.id]: { ...x[c.id], note: e.target.value } }))} placeholder="What happened (time in the call, words used)…" className={`${inputCls} mt-1.5 text-xs py-1.5`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Score</span><b className="text-gray-900 dark:text-white">{ev.score === null ? "—" : `${ev.score}%`}</b>
                {ev.outcome && <span className={`font-semibold ${OUT_TONE[ev.outcome]}`}>{ev.outcome}</span>}
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Call result</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => !forced && setF((x: any) => ({ ...x, result: "Passed" }))} disabled={forced}
                    className={`py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 ${result === "Passed" ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    <CheckCircle2 className="w-4 h-4" /> Passed</button>
                  <button onClick={() => setF((x: any) => ({ ...x, result: "Issues identified" }))}
                    className={`py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 ${issues ? "bg-red-600 border-red-600 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    <AlertTriangle className="w-4 h-4" /> Issues identified</button>
                </div>
                {forced && <div className="text-[11px] text-gray-500 mt-1">A checklist point is answered "No", so the call can't be passed.</div>}
              </div>
              {issues ? (
                <div className="rounded-xl border border-red-300 dark:border-red-900 bg-red-500/5 p-3 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <L label="Issue category *"><select value={issueCat} onChange={e => setF((x: any) => ({ ...x, issue_category: e.target.value }))} className={inputCls}>
                      <option value="">— choose —</option>{(meta.issue_categories || []).map((x: string) => <option key={x}>{x}</option>)}</select></L>
                    <L label="Outcome"><select value={outcome} onChange={e => setF((x: any) => ({ ...x, outcome: e.target.value }))} className={inputCls}>
                      {meta.outcomes.filter((x: string) => x !== "Satisfactory").map((x: string) => <option key={x}>{x}</option>)}</select></L>
                    <L label="Comments *" span2><textarea rows={3} value={f.observations} onChange={e => setF((x: any) => ({ ...x, observations: e.target.value }))} className={inputCls} placeholder="What was heard, at what point in the call" /></L>
                    <L label="Recommendation / action expected" span2><textarea rows={2} value={f.recommendation} onChange={e => setF((x: any) => ({ ...x, recommendation: e.target.value }))} className={inputCls} placeholder="e.g. call the investor back with the correct disclosure; refresher training" /></L>
                    <L label="Severity"><select value={f.severity} onChange={e => setF((x: any) => ({ ...x, severity: e.target.value }))} className={inputCls}><option value="">As per outcome ({outcome === "Non-compliant" ? "High" : "Medium"})</option>{meta.severities.map((x: string) => <option key={x}>{x}</option>)}</select></L>
                    {!r.sr_id && <L label="Action owner (SR is raised for)"><select value={f.action_owner_id || ownerDefault} onChange={e => setF((x: any) => ({ ...x, action_owner_id: e.target.value }))} className={inputCls}>
                      <option value="">— choose —</option>{(meta.users || []).map((u: any) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}</select></L>}
                    {!r.sr_id && <L label="Due by (default 7 days)"><input type="date" value={f.action_due} onChange={e => setF((x: any) => ({ ...x, action_due: e.target.value }))} className={inputCls} /></L>}
                  </div>
                  {willRaise && <div className="text-[11px] text-red-600 dark:text-red-400">Saving raises a Service Request automatically (category Call Audit · {issueCat || "issue category"}) for the action owner, with reference {r.audit_code}.</div>}
                  {r.sr_id && <div className="text-[11px] text-gray-500">The automatic SR {r.sr_code} is already raised — use "Raise SR" on the left for another one.</div>}
                </div>
              ) : (
                <L label="Comments (optional)"><textarea rows={2} value={f.observations} onChange={e => setF((x: any) => ({ ...x, observations: e.target.value }))} className={inputCls} placeholder="Anything worth noting" /></L>
              )}
              <div className="flex items-center gap-2">
                {r.audited_at && <span className="text-[11px] text-gray-500">Audited by {r.auditor_name} · {new Date(r.audited_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                {closed ? <span className="ml-auto text-[11px] text-gray-500">Closed — no further changes</span> :
                <button onClick={save} disabled={!!busy || !callId.trim()} title={callId.trim() ? "" : "Enter the Call ID first"} className="ml-auto text-sm px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
                  {busy === "save" && <RefreshCw className="w-4 h-4 animate-spin" />}{willRaise ? "Save & raise SR" : r.audited_at ? "Update audit" : "Save audit"}</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
