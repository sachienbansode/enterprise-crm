import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Landmark, X, RefreshCw, Mail, Phone } from "lucide-react";
import { fmtINR, useCurrUnit } from "../../lib/money";
import { appConfirm, appToast } from "../../lib/dialog";
import { MList, MCard } from "../MobileCard";

// Investment Banking → Investors: the investor database used for matching and roadshows.
const crToText = (cr: any) => (cr === null || cr === undefined || cr === "" ? "—" : fmtINR(Number(cr) * 1e7));
const inputCls = "w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const SECTORS = ["Sector agnostic", "Financial Services", "Technology", "Healthcare", "Pharmaceuticals", "Consumer", "Retail", "Food & Beverage", "Manufacturing", "Chemicals",
  "Infrastructure", "Energy", "Real Estate", "Auto & Components", "Logistics", "Media", "Telecom", "Metals & Mining", "Textiles", "Agriculture"];
const REL_TONE: Record<string, string> = { Hot: "bg-red-500/15 text-red-600 dark:text-red-400", Warm: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Cold: "bg-sky-500/15 text-sky-600 dark:text-sky-400" };

async function api(path: string, method = "GET", body?: any) {
  const r = await fetch(`/api/ib${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

export default function InvestorsPage({ t }: { t: any; isDark?: boolean }) {
  useCurrUnit();
  const [rows, setRows] = useState<any[] | null>(null);
  const [search, setSearch] = useState(""); const [type, setType] = useState(""); const [dealType, setDealType] = useState("");
  const [opts, setOpts] = useState<{ types: string[]; deal_types: string[] }>({ types: [], deal_types: [] });
  const [edit, setEdit] = useState<any | null>(null);
  const [view, setView] = useState<any | null>(null);
  const load = useCallback(() => {
    const q = new URLSearchParams(); if (search) q.set("search", search); if (type) q.set("type", type); if (dealType) q.set("deal_type", dealType);
    api(`/investors?${q}`).then(d => setRows(d.data)).catch(e => { setRows([]); appToast(e.message, "error"); });
  }, [search, type, dealType]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);
  useEffect(() => { api("/investor-options").then(setOpts).catch(() => {}); }, []);
  const openView = (i: any) => api(`/investors/${i.id}`).then(setView).catch(e => appToast(e.message, "error"));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`m-toolbar px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-wrap flex-shrink-0`}>
        <div className="m-title w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center"><Landmark className="w-3.5 h-3.5 text-white" /></div>
        <div className="m-title"><div className={`text-sm font-bold ${t.text}`}>Investors</div><div className={`text-[10px] ${t.textMuted}`}>{rows ? `${rows.length} investors` : "Loading…"} · used for mandate matching and roadshows</div></div>
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${t.border} flex-1 min-w-[200px] max-w-sm`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, contact, city, sector…" className={`bg-transparent text-xs outline-none flex-1 ${t.text}`} />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg}`} aria-label="Investor type"><option value="">All Types</option>{opts.types.map(x => <option key={x}>{x}</option>)}</select>
        <select value={dealType} onChange={e => setDealType(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg}`} aria-label="Deal type"><option value="">All Deal Types</option>{opts.deal_types.map(x => <option key={x}>{x}</option>)}</select>
        <div className="ml-auto flex gap-2">
          <button onClick={load} aria-label="Refresh" className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEdit({ name: "", investor_type: "Mutual Fund", relationship: "Warm", sectors: [], deal_types: [], country: "India" })} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Investor</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {rows && rows.length === 0 && <div className={`text-sm ${t.textMuted} text-center py-12`}>No investors found. Add mutual funds, insurers, FPIs, AIFs, PE funds and family offices you work with.</div>}
        <MList>
          {(rows || []).map(i => (
            <MCard key={i.id} onClick={() => openView(i)} title={i.name} sub={`${i.investor_type}${i.city ? ` · ${i.city}` : ""}`}
              badge={<span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${REL_TONE[i.relationship] || ""}`}>{i.relationship}</span>}
              value={i.ticket_min_cr != null || i.ticket_max_cr != null ? `${crToText(i.ticket_min_cr)} – ${crToText(i.ticket_max_cr)}` : undefined}
              chips={(i.deal_types || []).slice(0, 4).map((d: string) => <span key={d} className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{d}</span>)}
              left={i.contact_name || ""} right={i.meetings ? `${i.meetings} meeting${i.meetings > 1 ? "s" : ""}` : ""} />
          ))}
        </MList>
        <table className="hidden md:table w-full text-xs">
          <thead><tr className={`text-left ${t.textMuted} border-b ${t.border}`}>
            {["Investor", "Type", "City", "AUM", "Ticket Size", "Sectors", "Deal Types", "Contact", "Relationship", "Meetings"].map(h => <th key={h} className="px-3 py-2 font-medium uppercase text-[10px] tracking-wide">{h}</th>)}
          </tr></thead>
          <tbody>
            {(rows || []).map(i => (
              <tr key={i.id} onClick={() => openView(i)} className={`border-b ${t.border} ${t.rowHover} cursor-pointer`}>
                <td className={`px-3 py-2.5 font-semibold ${t.text}`}>{i.name}</td>
                <td className={`px-3 py-2.5 ${t.textMuted}`}>{i.investor_type}</td>
                <td className={`px-3 py-2.5 ${t.textMuted}`}>{i.city || "—"}</td>
                <td className={`px-3 py-2.5 ${t.text}`}>{crToText(i.aum_cr)}</td>
                <td className={`px-3 py-2.5 ${t.text} whitespace-nowrap`}>{i.ticket_min_cr != null || i.ticket_max_cr != null ? `${crToText(i.ticket_min_cr)} – ${crToText(i.ticket_max_cr)}` : "—"}</td>
                <td className={`px-3 py-2.5 ${t.textMuted} max-w-[200px] truncate`}>{(i.sectors || []).join(", ") || "—"}</td>
                <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{(i.deal_types || []).map((d: string) => <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 whitespace-nowrap">{d}</span>)}</div></td>
                <td className={`px-3 py-2.5 ${t.textMuted}`}>{i.contact_name || "—"}</td>
                <td className="px-3 py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${REL_TONE[i.relationship] || ""}`}>{i.relationship}</span></td>
                <td className={`px-3 py-2.5 ${t.textMuted}`}>{i.meetings || 0}{i.last_met ? ` · ${new Date(i.last_met).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view && <InvestorView inv={view} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} />}
      {edit && <InvestorForm inv={edit} opts={opts} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function InvestorView({ inv, onClose, onEdit }: { inv: any; onClose: () => void; onEdit: () => void }) {
  const row = (l: string, v: any) => v ? <div className="flex justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 text-sm"><span className="text-gray-500">{l}</span><span className="text-right text-gray-900 dark:text-gray-100">{v}</span></div> : null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex justify-end animate-in fade-in duration-150" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md h-full bg-white dark:bg-gray-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-start gap-2 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 min-w-0"><div className="text-lg font-bold text-gray-900 dark:text-white">{inv.name}</div><div className="text-xs text-gray-500">{inv.investor_type}{inv.city ? ` · ${inv.city}` : ""}{inv.country && inv.country !== "India" ? `, ${inv.country}` : ""}</div></div>
          <button onClick={onEdit} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white">Edit</button>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            {row("Relationship", <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${REL_TONE[inv.relationship] || ""}`}>{inv.relationship}</span>)}
            {row("AUM", crToText(inv.aum_cr))}
            {row("Ticket Size", inv.ticket_min_cr != null || inv.ticket_max_cr != null ? `${crToText(inv.ticket_min_cr)} – ${crToText(inv.ticket_max_cr)}` : null)}
            {row("Sectors", (inv.sectors || []).join(", "))}
            {row("Deal Types", (inv.deal_types || []).join(", "))}
            {row("Contact", [inv.contact_name, inv.contact_designation].filter(Boolean).join(", "))}
            {row("Website", inv.website)}
          </div>
          {(inv.contact_email || inv.contact_phone) && (
            <div className="flex gap-2">
              {inv.contact_email && <a href={`mailto:${inv.contact_email}`} className="flex-1 text-xs py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-200"><Mail className="w-3.5 h-3.5" /> E-mail</a>}
              {inv.contact_phone && <a href={`tel:${inv.contact_phone}`} className="flex-1 text-xs py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-200"><Phone className="w-3.5 h-3.5" /> Call</a>}
            </div>
          )}
          {inv.notes && <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{inv.notes}</div>}
          <div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Roadshow history ({(inv.meetings || []).length})</div>
            {(inv.meetings || []).length === 0 && <div className="text-xs text-gray-500">No meetings yet.</div>}
            <div className="space-y-1.5">
              {(inv.meetings || []).map((m: any) => (
                <div key={m.id} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs">
                  <div className="flex gap-2"><b className="text-gray-900 dark:text-white">{m.deal_code}</b><span className="text-gray-500 truncate">{m.deal_name}</span><span className="ml-auto text-gray-500">{m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : ""}</span></div>
                  <div className="text-gray-500 mt-0.5">{m.status} · interest {m.interest}{m.indicative_cr != null ? ` · ${crToText(m.indicative_cr)}` : ""}</div>
                  {m.feedback && <div className="text-gray-600 dark:text-gray-300 mt-0.5">“{m.feedback}”</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const F = ({ l, children, span }: any) => <label className={`block ${span ? "sm:col-span-2" : ""}`}><span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{l}</span>{children}</label>;

function InvestorForm({ inv, opts, onClose, onSaved }: { inv: any; opts: { types: string[]; deal_types: string[] }; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<any>({ ...inv, sectors: inv.sectors || [], deal_types: inv.deal_types || [] });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const toggle = (k: "sectors" | "deal_types", v: string) => setF((x: any) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y: string) => y !== v) : [...x[k], v] }));
  const save = async () => {
    if (!String(f.name || "").trim()) return appToast("Enter the investor's name", "error");
    setBusy(true);
    try { if (f.id) await api(`/investors/${f.id}`, "PATCH", f); else await api("/investors", "POST", f); appToast(f.id ? "Investor updated" : "Investor added", "success"); onSaved(); }
    catch (e: any) { appToast(e.message, "error"); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await appConfirm({ title: "Remove investor", message: `Remove ${f.name} from the investor list? Roadshow history is kept.`, confirmLabel: "Remove", tone: "danger" }))) return;
    try { await api(`/investors/${f.id}`, "DELETE"); onSaved(); } catch (e: any) { appToast(e.message, "error"); }
  };
  const pills = (k: "sectors" | "deal_types", list: string[]) => (
    <div className="flex flex-wrap gap-1.5">{list.map(v => <button type="button" key={v} onClick={() => toggle(k, v)} className={`text-[11px] px-2 py-1 rounded-full border ${f[k].includes(v) ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>{v}</button>)}</div>
  );
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150" onClick={() => !busy && onClose()}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-2xl bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="font-semibold text-gray-900 dark:text-white">{f.id ? "Edit Investor" : "New Investor"}</div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 overflow-y-auto grid sm:grid-cols-2 gap-3">
          <F l="Investor Name *" span><input value={f.name || ""} onChange={e => set("name", e.target.value)} className={inputCls} placeholder="e.g. Arcadia Mutual Fund" /></F>
          <F l="Type"><select value={f.investor_type} onChange={e => set("investor_type", e.target.value)} className={inputCls}>{opts.types.map(x => <option key={x}>{x}</option>)}</select></F>
          <F l="Relationship"><select value={f.relationship} onChange={e => set("relationship", e.target.value)} className={inputCls}>{["Hot", "Warm", "Cold"].map(x => <option key={x}>{x}</option>)}</select></F>
          <F l="City"><input value={f.city || ""} onChange={e => set("city", e.target.value)} className={inputCls} /></F>
          <F l="Country"><input value={f.country || ""} onChange={e => set("country", e.target.value)} className={inputCls} /></F>
          <F l="AUM (₹ Cr)"><input inputMode="decimal" value={f.aum_cr ?? ""} onChange={e => set("aum_cr", e.target.value)} className={inputCls} /></F>
          <div className="grid grid-cols-2 gap-2">
            <F l="Ticket Min (₹ Cr)"><input inputMode="decimal" value={f.ticket_min_cr ?? ""} onChange={e => set("ticket_min_cr", e.target.value)} className={inputCls} /></F>
            <F l="Ticket Max (₹ Cr)"><input inputMode="decimal" value={f.ticket_max_cr ?? ""} onChange={e => set("ticket_max_cr", e.target.value)} className={inputCls} /></F>
          </div>
          <F l="Deal Types" span>{pills("deal_types", opts.deal_types)}</F>
          <F l="Sectors" span>{pills("sectors", SECTORS)}</F>
          <F l="Contact Person"><input value={f.contact_name || ""} onChange={e => set("contact_name", e.target.value)} className={inputCls} /></F>
          <F l="Designation"><input value={f.contact_designation || ""} onChange={e => set("contact_designation", e.target.value)} className={inputCls} /></F>
          <F l="Email"><input type="email" value={f.contact_email || ""} onChange={e => set("contact_email", e.target.value)} className={inputCls} /></F>
          <F l="Phone"><input type="tel" value={f.contact_phone || ""} onChange={e => set("contact_phone", e.target.value)} className={inputCls} /></F>
          <F l="Website" span><input value={f.website || ""} onChange={e => set("website", e.target.value)} className={inputCls} /></F>
          <F l="Notes" span><textarea rows={2} value={f.notes || ""} onChange={e => set("notes", e.target.value)} className={inputCls} placeholder="Mandate preferences, holding period, past allocations…" /></F>
        </div>
        <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-gray-800">
          {f.id && <button onClick={remove} className="px-3 py-2.5 rounded-xl text-sm text-red-500 border border-red-500/30">Remove</button>}
          <button onClick={onClose} className="ml-auto px-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</button>
          <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
