import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock3, Plus, Trash2, ListChecks, Users2, Sparkles, X, CalendarDays, RefreshCw } from "lucide-react";
import { fmtINR, useCurrUnit } from "../../lib/money";
import { appConfirm, appToast } from "../../lib/dialog";

// IB Phase 2 on the mandate / deal panel: Milestones · Roadshow & investors (with matching).
// Amounts from investors / roadshows are in ₹ Cr on the server; shown in the user's chosen unit.

const crToText = (cr: any) => (cr === null || cr === undefined || cr === "" ? "—" : fmtINR(Number(cr) * 1e7));
const inputCls = "w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const chip = (on: boolean) => `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${on ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-500/10"}`;
const INTEREST_TONE: Record<string, string> = { High: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Low: "bg-orange-500/15 text-orange-600 dark:text-orange-400", Pass: "bg-red-500/15 text-red-600 dark:text-red-400", "Not yet known": "bg-gray-500/15 text-gray-500" };
const STATUS_TONE: Record<string, string> = { Done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Planned: "bg-sky-500/15 text-sky-600 dark:text-sky-400", Cancelled: "bg-gray-500/15 text-gray-500 line-through" };
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—");
const toLocalInput = (d: any) => { if (!d) return ""; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

async function api(path: string, method = "GET", body?: any) {
  const r = await fetch(`/api/ib${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

export default function MandateWorkspace({ deal, onChanged }: { deal: any; onChanged?: () => void }) {
  useCurrUnit();
  const [tab, setTab] = useState<"milestones" | "roadshow">("milestones");
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-1 p-1.5 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => setTab("milestones")} className={chip(tab === "milestones")}><span className="inline-flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Milestones</span></button>
        <button onClick={() => setTab("roadshow")} className={chip(tab === "roadshow")}><span className="inline-flex items-center gap-1.5"><Users2 className="w-3.5 h-3.5" /> Roadshow & Investors</span></button>
      </div>
      <div className="p-3">{tab === "milestones" ? <Milestones deal={deal} onChanged={onChanged} /> : <Roadshow deal={deal} onChanged={onChanged} />}</div>
    </div>
  );
}

// ── Milestones ────────────────────────────────────────────────────────────────
function Milestones({ deal, onChanged }: { deal: any; onChanged?: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [suggested, setSuggested] = useState("general");
  const [templates, setTemplates] = useState<any[]>([]);
  const [tpl, setTpl] = useState("");
  const [adding, setAdding] = useState(false);
  const [newT, setNewT] = useState(""); const [newDue, setNewDue] = useState("");
  const load = useCallback(() => api(`/deals/${deal.id}/milestones`).then(d => { setRows(d.data); setSuggested(d.suggested_template); }).catch(e => { setRows([]); appToast(e.message, "error"); }), [deal.id]);
  useEffect(() => { load(); api("/milestone-templates").then(setTemplates).catch(() => {}); }, [load]);
  useEffect(() => { setTpl(suggested); }, [suggested]);

  const done = (rows || []).filter(r => r.status === "Done" || r.status === "Not needed").length, total = (rows || []).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const next = (rows || []).find(r => r.status !== "Done" && r.status !== "Not needed");
  const today = new Date(new Date().toDateString());

  const applyTpl = async () => {
    try { const d = await api(`/deals/${deal.id}/milestones/template`, "POST", { template: tpl }); setRows(d.data); appToast(d.added ? `${d.added} milestones added` : "All template steps are already there", "success"); onChanged?.(); }
    catch (e: any) { appToast(e.message, "error"); }
  };
  const cycle = async (r: any) => {
    const to = r.status === "Pending" ? "In progress" : r.status === "In progress" ? "Done" : "Pending";
    setRows(rs => rs!.map(x => x.id === r.id ? { ...x, status: to } : x));
    try { const u = await api(`/milestones/${r.id}`, "PATCH", { status: to }); setRows(rs => rs!.map(x => x.id === r.id ? u : x)); onChanged?.(); }
    catch (e: any) { appToast(e.message, "error"); load(); }
  };
  const setDue = async (r: any, v: string) => {
    try { const u = await api(`/milestones/${r.id}`, "PATCH", { due_date: v }); setRows(rs => rs!.map(x => x.id === r.id ? u : x)); } catch (e: any) { appToast(e.message, "error"); }
  };
  const remove = async (r: any) => {
    if (!(await appConfirm({ title: "Remove milestone", message: `Remove "${r.title}"?`, confirmLabel: "Remove", tone: "danger" }))) return;
    try { await api(`/milestones/${r.id}`, "DELETE"); setRows(rs => rs!.filter(x => x.id !== r.id)); } catch (e: any) { appToast(e.message, "error"); }
  };
  const add = async () => {
    if (!newT.trim()) return;
    try { const r = await api(`/deals/${deal.id}/milestones`, "POST", { title: newT.trim(), due_date: newDue || null }); setRows(rs => [...(rs || []), r]); setNewT(""); setNewDue(""); setAdding(false); }
    catch (e: any) { appToast(e.message, "error"); }
  };

  if (!rows) return <div className="text-xs text-gray-500 py-4 text-center">Loading…</div>;
  return (
    <div className="space-y-3">
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-gray-800 dark:text-gray-100">{done} of {total} done</span>
            <span className="text-gray-500 dark:text-gray-400">{next ? <>Next: <b className="text-gray-700 dark:text-gray-200">{next.title}</b>{next.due_date ? ` · ${fmtDate(next.due_date)}` : ""}</> : "All milestones complete"}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      {total === 0 && <div className="text-xs text-gray-500 dark:text-gray-400">No milestones yet. Start from the checklist for this kind of mandate, then adjust the dates.</div>}
      <div className="flex flex-wrap items-center gap-2">
        <select value={tpl} onChange={e => setTpl(e.target.value)} className={`${inputCls} !w-auto !py-1.5 text-xs`} aria-label="Milestone template">
          {templates.map(t => <option key={t.id} value={t.id}>{t.label} checklist ({t.steps})</option>)}
        </select>
        <button onClick={applyTpl} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium">{total ? "Add missing steps" : "Add checklist"}</button>
        <button onClick={() => setAdding(a => !a)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Milestone</button>
      </div>
      {adding && (
        <div className="flex flex-wrap gap-2 items-center">
          <input autoFocus value={newT} onChange={e => setNewT(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="e.g. Anchor investor meetings" className={`${inputCls} flex-1 min-w-[180px]`} />
          <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Due date" />
          <button onClick={add} disabled={!newT.trim()} className="text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-40">Add</button>
        </div>
      )}
      <ol className="space-y-1">
        {rows.map((r, i) => {
          const overdue = r.due_date && r.status !== "Done" && r.status !== "Not needed" && new Date(r.due_date) < today;
          return (
            <li key={r.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-500/5">
              <button onClick={() => cycle(r)} title={`${r.status} — click to change`} aria-label={`${r.title}: ${r.status}`} className="flex-shrink-0">
                {r.status === "Done" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : r.status === "In progress" ? <Clock3 className="w-5 h-5 text-amber-500" /> : <Circle className="w-5 h-5 text-gray-400" />}
              </button>
              <span className="text-[11px] w-5 text-gray-400 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0 sm:flex sm:items-center sm:gap-2">
                <span className={`block sm:flex-1 min-w-0 text-sm leading-snug ${r.status === "Done" ? "text-gray-400 line-through" : "text-gray-800 dark:text-gray-100"}`}>{r.title}
                  {r.status === "In progress" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 no-underline">In progress</span>}
                </span>
                <input type="date" value={r.due_date ? String(r.due_date).slice(0, 10) : ""} onChange={e => setDue(r, e.target.value)} aria-label={`Due date for ${r.title}`}
                  className={`block text-[11px] sm:text-xs bg-transparent border-0 p-0 w-[118px] sm:text-right ${overdue ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400"}`} />
              </div>
              <button onClick={() => remove(r)} aria-label={`Remove ${r.title}`} className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Roadshow & investors ──────────────────────────────────────────────────────
const MODES = ["One-on-one", "Group meeting", "Video call", "Call", "NDR", "Site visit"];
const INTEREST = ["Not yet known", "High", "Medium", "Low", "Pass"];
function Roadshow({ deal, onChanged }: { deal: any; onChanged?: () => void }) {
  const [data, setData] = useState<{ data: any[]; summary: any } | null>(null);
  const [matches, setMatches] = useState<{ data: any[]; basis: any } | null>(null);
  const [investors, setInvestors] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api(`/deals/${deal.id}/roadshow`).then(setData).catch(e => appToast(e.message, "error"));
    api(`/deals/${deal.id}/investor-matches`).then(setMatches).catch(() => setMatches({ data: [], basis: {} }));
  }, [deal.id]);
  useEffect(() => { load(); api("/investors").then(d => setInvestors(d.data || [])).catch(() => {}); }, [load]);

  const open = (m?: any, investor?: any) => setForm(m ? { ...m, meeting_date: toLocalInput(m.meeting_date) } : {
    investor_id: investor?.id || "", meeting_date: toLocalInput(new Date(Date.now() + 2 * 86400000).setHours(11, 0, 0, 0)), mode: "One-on-one", status: "Planned", interest: "Not yet known", indicative_cr: "", feedback: "", next_step: "", location: "",
  });
  const save = async () => {
    if (!form.investor_id) return appToast("Choose the investor", "error");
    setBusy(true);
    try {
      const body = { ...form, meeting_date: form.meeting_date ? new Date(form.meeting_date).toISOString() : null };
      if (form.id) await api(`/roadshow/${form.id}`, "PATCH", body); else await api(`/deals/${deal.id}/roadshow`, "POST", body);
      appToast(form.id ? "Meeting updated" : "Added to the roadshow", "success"); setForm(null); load(); onChanged?.();
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await appConfirm({ title: "Remove meeting", message: "Remove this roadshow meeting?", confirmLabel: "Remove", tone: "danger" }))) return;
    try { await api(`/roadshow/${form.id}`, "DELETE"); setForm(null); load(); } catch (e: any) { appToast(e.message, "error"); }
  };
  const s = data?.summary;
  const coverage = s?.coverage;
  const sorted = useMemo(() => [...(data?.data || [])].sort((a, b) => (a.status === "Planned" ? 0 : 1) - (b.status === "Planned" ? 0 : 1) || new Date(a.meeting_date || 0).getTime() - new Date(b.meeting_date || 0).getTime()), [data]);

  if (!data) return <div className="text-xs text-gray-500 py-4 text-center">Loading…</div>;
  return (
    <div className="space-y-3">
      {/* Demand vs size */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Meetings" value={`${s.done} done`} sub={`${s.planned} planned`} />
        <Tile label="Interest" value={<span className="text-emerald-600 dark:text-emerald-400">{s.high} high</span>} sub={`${s.medium} medium · ${s.low} low · ${s.pass} pass`} />
        <Tile label="Indicative Demand" value={crToText(s.demand_cr)} sub={s.size_cr ? `vs size ${crToText(s.size_cr)}` : "add the mandate size"} />
        <Tile label="Coverage" value={coverage == null ? "—" : `${coverage.toFixed(2)}×`} sub={coverage == null ? "" : coverage >= 1 ? "covered" : `${Math.round(coverage * 100)}% of size`}
          tone={coverage == null ? "" : coverage >= 1 ? "text-emerald-600 dark:text-emerald-400" : coverage >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-red-500"} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Roadshow / NDR meetings</div>
        <div className="flex gap-1.5">
          <button onClick={load} aria-label="Refresh" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => open()} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Meeting</button>
        </div>
      </div>
      {sorted.length === 0 && <div className="text-xs text-gray-500 dark:text-gray-400">No roadshow meetings yet — add one, or pick from the suggested investors below.</div>}
      <div className="space-y-1.5">
        {sorted.map(m => (
          <button key={m.id} onClick={() => open(m)} className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 hover:border-blue-400/60 transition-colors">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{m.investor_name}</span>
              <span className="text-[11px] text-gray-500">{m.investor_type}</span>
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_TONE[m.status] || ""}`}>{m.status}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${INTEREST_TONE[m.interest] || ""}`}>{m.interest === "Not yet known" ? "Interest ?" : m.interest}</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
              <span>{m.meeting_date ? new Date(m.meeting_date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "No date"} · {m.mode}</span>
              {m.indicative_cr != null && <span>Indicative <b className="text-gray-700 dark:text-gray-200">{crToText(m.indicative_cr)}</b></span>}
            </div>
            {m.feedback && <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">“{m.feedback}”</div>}
          </button>
        ))}
      </div>

      {/* Suggested investors */}
      <div className="pt-1">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 mb-1"><Sparkles className="w-3.5 h-3.5 text-violet-500" /> Suggested investors</div>
        {matches?.basis && <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">Matched on {[matches.basis.sector && `sector ${matches.basis.sector}`, matches.basis.deal_type && `deal type ${matches.basis.deal_type}`, matches.basis.size_cr && `size ${crToText(matches.basis.size_cr)}`].filter(Boolean).join(" · ") || "relationship and past interest (set the company sector and deal size for better matches)"}</div>}
        {(matches?.data || []).length === 0 && <div className="text-xs text-gray-500">No matching investors yet — add investors under Investment Banking → Investors.</div>}
        <div className="space-y-1">
          {(matches?.data || []).slice(0, 8).map(i => (
            <div key={i.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-500/5">
              <div className="w-10 flex-shrink-0">
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${i.score}%` }} /></div>
                <div className="text-[10px] text-gray-500 text-center mt-0.5">{i.score}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{i.name} <span className="text-[11px] font-normal text-gray-500">{i.investor_type}</span></div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{i.why.join(" · ")}</div>
              </div>
              {i.on_roadshow ? <span className="text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap">On roadshow</span>
                : <button onClick={() => open(undefined, i)} className="text-[11px] px-2 py-1 rounded-lg border border-violet-400/50 text-violet-600 dark:text-violet-400 whitespace-nowrap">+ Roadshow</button>}
            </div>
          ))}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150" onClick={() => !busy && setForm(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-lg bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">{form.id ? "Roadshow meeting" : "Add to roadshow"}</div>
              <button onClick={() => setForm(null)} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <Field label="Investor *">
                <select value={form.investor_id} disabled={!!form.id} onChange={e => setForm({ ...form, investor_id: e.target.value })} className={inputCls}>
                  <option value="">Choose…</option>
                  {investors.map(i => <option key={i.id} value={i.id}>{i.name} — {i.investor_type}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date & Time"><input type="datetime-local" value={form.meeting_date || ""} onChange={e => setForm({ ...form, meeting_date: e.target.value })} className={inputCls} /></Field>
                <Field label="Format"><select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} className={inputCls}>{MODES.map(x => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Status"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}>{["Planned", "Done", "Cancelled"].map(x => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Interest"><select value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value })} className={inputCls}>{INTEREST.map(x => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Indicative Demand (₹ Cr)"><input inputMode="decimal" value={form.indicative_cr ?? ""} onChange={e => setForm({ ...form, indicative_cr: e.target.value })} className={inputCls} placeholder="e.g. 25" /></Field>
                <Field label="Location"><input value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Mumbai / Teams" /></Field>
              </div>
              <Field label="Feedback"><textarea rows={3} value={form.feedback || ""} onChange={e => setForm({ ...form, feedback: e.target.value })} className={inputCls} placeholder="What the investor liked, concerns, price view…" /></Field>
              <Field label="Next Step"><input value={form.next_step || ""} onChange={e => setForm({ ...form, next_step: e.target.value })} className={inputCls} placeholder="e.g. Share peer comparison by Friday" /></Field>
            </div>
            <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
              {form.id && <button onClick={remove} className="px-3 py-2.5 rounded-xl text-sm text-red-500 border border-red-500/30">Remove</button>}
              <button onClick={() => setForm(null)} className="ml-auto px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
              <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Tile = ({ label, value, sub, tone = "" }: { label: string; value: any; sub?: string; tone?: string }) => (
  <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    <div className={`text-sm font-bold text-gray-900 dark:text-white ${tone}`}>{value}</div>
    {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{sub}</div>}
  </div>
);
const Field = ({ label, children }: { label: string; children: any }) => (
  <label className="block"><span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</span>{children}</label>
);
