import { useCallback, useEffect, useMemo, useState } from "react";
import { appConfirm } from "../../lib/dialog";
import {
  Building2, Search, Plus, RefreshCw, X, Edit2, Mic, CheckCircle2, AlertTriangle, Users, TrendingUp,
  Phone, FileText, CheckSquare, Trash2, Globe, Clock, Star, ScanLine, ChevronRight, Maximize2, Minimize2,
} from "lucide-react";
import { LeadModal } from "../LeadDealModals";
import { RecordDocuments } from "../RecordActivity";

// Investment Banking company & promoter master — CIN-keyed, with Source · Date · Updated-by on key data,
// and a Company 360 view (people, opportunities, relationship timeline, tasks, documents) on one screen.

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent";
const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const STRENGTH = ["Cold", "Warm", "Strong"];
const LISTED = ["Listed", "Unlisted", "SME Listed"];
const ROLES = ["Promoter", "Management", "CFO", "CS", "Board", "Other"];
const quickLog = (detail: any) => window.dispatchEvent(new CustomEvent("quicklog:open", { detail }));

const d = (v: any) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const ago = (v: any) => {
  if (!v) return "—";
  const days = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days}d ago` : d(v);
};
const cr = (v: any) => (v === null || v === undefined || v === "" ? "—" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`);
const money = (n: number) => !n ? "—" : n >= 1e7 ? `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr` : n >= 1e5 ? `₹${(n / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })} L` : `₹${n.toLocaleString("en-IN")}`;
const rupees = (v: any) => {
  const m = String(v ?? "").replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lakh|lac|k)?/i);
  if (!m) return 0; const n = parseFloat(m[1]); const u = (m[2] || "").toLowerCase();
  return n * (u.startsWith("cr") ? 1e7 : u === "l" || u.startsWith("la") ? 1e5 : u === "k" ? 1e3 : 1);
};
const strengthCls = (s: string) => s === "Strong" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : s === "Cold" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

const F = ({ label, children, span2, hint }: { label: string; children: React.ReactNode; span2?: boolean; hint?: React.ReactNode }) => (
  <div className={span2 ? "sm:col-span-2" : ""}>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
    {children}
    {hint && <div className="text-[11px] mt-1">{hint}</div>}
  </div>
);

// ─── Company list ─────────────────────────────────────────────────────────────
export default function CompanyMaster({ t, isDark, loggedUser }: { t: any; isDark: boolean; loggedUser?: any }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(() => { try { const v = sessionStorage.getItem("ib_open_company"); sessionStorage.removeItem("ib_open_company"); return v; } catch { return null; } });
  const [form, setForm] = useState<any | null>(null); // null = closed; {} = new; company = edit

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams(); if (search) q.set("search", search); if (sector) q.set("sector", sector);
    fetch(`/api/ib/companies?${q}`).then(r => r.json()).then(d => setRows(d.data || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, [search, sector]);
  useEffect(() => { const h = setTimeout(load, 180); return () => clearTimeout(h); }, [load]);
  useEffect(() => { fetch("/api/config/dropdowns?entity=client&field=sector").then(r => r.json()).then(d => setSectors(Array.isArray(d) ? d.map((x: any) => x.value) : [])).catch(() => {}); }, []);
  // "Open company" from a contact page / card scan while this screen is already showing
  useEffect(() => {
    const h = (e: any) => { if (e.detail?.id) { setOpenId(e.detail.id); load(); setTimeout(() => { try { sessionStorage.removeItem("ib_open_company"); } catch { /* ignore */ } }, 0); } };
    window.addEventListener("company:open", h); return () => window.removeEventListener("company:open", h);
  }, [load]);
  useEffect(() => { const h = () => load(); window.addEventListener("company:changed", h); return () => window.removeEventListener("company:changed", h); }, [load]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className={`px-4 sm:px-5 py-3 border-b ${t.border} flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0`}>
          <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-white" /></div>
          <div className="mr-2">
            <div className={`text-sm font-bold ${t.text} uppercase`}>Companies & Promoters</div>
            <div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${rows.length} companies · Investment Banking`}</div>
          </div>
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5 flex-1 min-w-[180px] sm:flex-none sm:w-72`}>
            <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} className={`bg-transparent text-xs ${t.text} outline-none w-full`} placeholder="Company, CIN, group or promoter…" aria-label="Search companies" />
          </div>
          <select value={sector} onChange={e => setSector(e.target.value)} className={`text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} aria-label="Sector">
            <option value="">All sectors</option>
            {sectors.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={load} aria-label="Refresh" className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("cardscan:open", { detail: {} }))} className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5" /> Scan card</button>
            <button onClick={() => setForm({})} className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Company</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && !rows.length ? (
            <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : !rows.length ? (
            <div className={`p-10 text-center text-sm ${t.textMuted}`}>No companies yet. Add the first one with <b>New Company</b>.</div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 ${t.tableHead}`}>
                <tr className={`border-b ${t.border}`}>
                  {(openId ? ["Company", "Relationship", "Open opps"] : ["Company", "CIN", "Sector", "Key people", "Relationship", "Open opps", "Last contact"]).map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2.5`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${openId === c.id ? (isDark ? "bg-amber-950/20" : "bg-amber-50") : ""}`}>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${t.text}`}>{c.name}</div>
                      <div className={`text-[10px] ${t.textMuted}`}>{[c.client_code, c.listed_status, c.group_name].filter(Boolean).join(" · ")}</div>
                    </td>
                    {!openId && <>
                    <td className={`px-4 py-3 font-mono text-[10px] ${t.textSub}`}>{c.cin || "—"}</td>
                    <td className={`px-4 py-3 ${t.textSub}`}>{c.sector || "—"}</td>
                    <td className={`px-4 py-3 ${t.textSub}`}>{c.promoters || "—"}</td>
                    </>}
                    <td className="px-4 py-3">
                      {c.relationship_strength ? <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${strengthCls(c.relationship_strength)}`}>{c.relationship_strength}</span> : <span className={t.textMuted}>—</span>}
                      <div className={`text-[10px] mt-0.5 ${t.textMuted}`}>{c.relationship_owner || "—"}</div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${t.text}`}>{c.open_opps}</td>
                    {!openId && <td className={`px-4 py-3 ${t.textMuted}`}>{ago(c.last_interaction)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {openId && <Company360 id={openId} t={t} isDark={isDark} loggedUser={loggedUser} onClose={() => setOpenId(null)} onEdit={c => setForm(c)} onChanged={load} />}
      {form && <CompanyForm t={t} edit={form.id ? form : null} sectors={sectors} loggedUser={loggedUser} onClose={() => setForm(null)}
        onSaved={c => { setForm(null); load(); setOpenId(c.id); window.dispatchEvent(new CustomEvent("company:changed", { detail: c.id })); }} />}
    </div>
  );
}

// ─── New / edit company ───────────────────────────────────────────────────────
function CompanyForm({ t, edit, sectors, loggedUser, onClose, onSaved }: { t: any; edit: any | null; sectors: string[]; loggedUser?: any; onClose: () => void; onSaved: (c: any) => void }) {
  const isEdit = !!edit;
  const dt = (v: any) => (v ? String(v).slice(0, 10) : "");
  const [f, setF] = useState<any>(() => isEdit ? {
    name: edit.name || "", cin: edit.cin || "", sector: edit.sector || "", industry: edit.industry || "", group_name: edit.group_name || "",
    website: edit.website || "", listed_status: edit.listed_status || "", exchange_symbol: edit.exchange_symbol || "", hq_city: edit.hq_city || "",
    date_of_incorporation: dt(edit.date_of_incorporation), relationship_owner_id: edit.relationship_owner_id || "", relationship_strength: edit.relationship_strength || "Warm",
    info_source: edit.info_source || "", info_as_of: dt(edit.info_as_of), notes: edit.notes || "",
    fin_year: edit.fin_year || "", revenue_cr: edit.revenue_cr ?? "", ebitda_cr: edit.ebitda_cr ?? "", pat_cr: edit.pat_cr ?? "", net_worth_cr: edit.net_worth_cr ?? "",
    valuation_cr: edit.valuation_cr ?? "", fin_source: edit.fin_source || "", fin_as_of: dt(edit.fin_as_of),
  } : { relationship_strength: "Warm", relationship_owner_id: loggedUser?.id || "", listed_status: "Unlisted", people: [{ name: "", designation: "", role_type: "Promoter", email: "", mobile: "" }] });
  const [users, setUsers] = useState<any[]>([]);
  const [check, setCheck] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => { fetch("/api/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : d?.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    const h = setTimeout(() => {
      const q = new URLSearchParams({ cin: f.cin || "", name: f.name || "", exclude: edit?.id || "" });
      if (!f.cin && (f.name || "").length < 3) { setCheck(null); return; }
      fetch(`/api/ib/companies/check?${q}`).then(r => r.json()).then(setCheck).catch(() => {});
    }, 350);
    return () => clearTimeout(h);
  }, [f.cin, f.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setError("");
    if (!String(f.name || "").trim()) return setError("Company name is required.");
    const cin = String(f.cin || "").trim().toUpperCase();
    if (cin && !CIN_RE.test(cin)) return setError("CIN looks invalid — it has 21 characters, e.g. L17110MH1973PLC019786.");
    if (check?.cinMatch) return setError(`This CIN already belongs to ${check.cinMatch.name}.`);
    setSaving(true);
    try {
      const body = { ...f, cin };
      if (body.people) body.people = body.people.filter((p: any) => p.name?.trim());
      const r = await fetch(isEdit ? `/api/ib/companies/${edit.id}` : "/api/ib/companies", { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      onSaved(d);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const cinHint = (() => {
    const cin = String(f.cin || "").trim().toUpperCase();
    if (!cin) return <span className="text-gray-400">The CIN is the master key — it stops duplicate companies.</span>;
    if (!CIN_RE.test(cin)) return <span className="text-amber-600">{cin.length}/21 characters — check the CIN</span>;
    if (check?.cinMatch) return <span className="text-red-500">Already in the CRM: {check.cinMatch.name} ({check.cinMatch.client_code})</span>;
    return <span className="text-emerald-600">Valid CIN · {cin[0] === "L" ? "listed" : "unlisted"} company</span>;
  })();

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /><h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? `Edit ${edit.name}` : "New Company"}</h2></div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <F label="Company name *" span2 hint={check?.similar?.length ? <span className="text-amber-600">Similar names already in the CRM: {check.similar.map((s: any) => s.name).join(", ")}</span> : null}>
              <input value={f.name || ""} onChange={e => set("name", e.target.value)} className={inputCls} placeholder="e.g. ABC Industries Limited" />
            </F>
            <F label="CIN" hint={cinHint}><input value={f.cin || ""} onChange={e => set("cin", e.target.value.toUpperCase())} maxLength={21} className={`${inputCls} font-mono`} placeholder="L17110MH1973PLC019786" /></F>
            <F label="Sector">
              <select value={f.sector || ""} onChange={e => set("sector", e.target.value)} className={inputCls}>
                <option value="">— Select —</option>{sectors.map(s => <option key={s}>{s}</option>)}
                {f.sector && !sectors.includes(f.sector) && <option>{f.sector}</option>}
              </select>
            </F>
            <F label="Industry / sub-sector"><input value={f.industry || ""} onChange={e => set("industry", e.target.value)} className={inputCls} /></F>
            <F label="Group"><input value={f.group_name || ""} onChange={e => set("group_name", e.target.value)} className={inputCls} placeholder="Business group, if any" /></F>
            <F label="Listing status">
              <select value={f.listed_status || ""} onChange={e => set("listed_status", e.target.value)} className={inputCls}><option value="">—</option>{LISTED.map(s => <option key={s}>{s}</option>)}</select>
            </F>
            <F label="NSE / BSE symbol"><input value={f.exchange_symbol || ""} onChange={e => set("exchange_symbol", e.target.value.toUpperCase())} className={inputCls} /></F>
            <F label="Headquarters city"><input value={f.hq_city || ""} onChange={e => set("hq_city", e.target.value)} className={inputCls} /></F>
            <F label="Website"><input value={f.website || ""} onChange={e => set("website", e.target.value)} className={inputCls} placeholder="https://" /></F>
            <F label="Date of incorporation"><input type="date" value={f.date_of_incorporation || ""} onChange={e => set("date_of_incorporation", e.target.value)} className={inputCls} /></F>
          </section>

          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Relationship</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Relationship owner">
                <select value={f.relationship_owner_id || ""} onChange={e => set("relationship_owner_id", e.target.value)} className={inputCls}>
                  <option value="">—</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </F>
              <F label="Relationship strength">
                <div className="flex gap-1.5">
                  {STRENGTH.map(s => <button key={s} type="button" onClick={() => set("relationship_strength", s)} className={`flex-1 text-xs py-2 rounded-lg border ${f.relationship_strength === s ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>{s}</button>)}
                </div>
              </F>
              <F label="Company info source"><input value={f.info_source || ""} onChange={e => set("info_source", e.target.value)} className={inputCls} placeholder="e.g. MCA21, company website, promoter" /></F>
              <F label="Info as of"><input type="date" value={f.info_as_of || ""} onChange={e => set("info_as_of", e.target.value)} className={inputCls} /></F>
            </div>
          </section>

          <section>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Financials & valuation <span className="normal-case font-normal">(₹ crore)</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <F label="Financial year"><input value={f.fin_year || ""} onChange={e => set("fin_year", e.target.value.toUpperCase())} className={inputCls} placeholder="FY26" /></F>
              {[["revenue_cr", "Revenue"], ["ebitda_cr", "EBITDA"], ["pat_cr", "PAT"], ["net_worth_cr", "Net worth"], ["valuation_cr", "Valuation"]].map(([k, l]) => (
                <F key={k} label={l}><input type="number" value={f[k] ?? ""} onChange={e => set(k, e.target.value)} className={inputCls} /></F>
              ))}
              <F label="Source"><input value={f.fin_source || ""} onChange={e => set("fin_source", e.target.value)} className={inputCls} placeholder="Annual report, DRHP, CMIE…" /></F>
              <F label="As of"><input type="date" value={f.fin_as_of || ""} onChange={e => set("fin_as_of", e.target.value)} className={inputCls} /></F>
            </div>
            <div className="text-[11px] text-gray-400 mt-1.5">Your name and today's date are recorded automatically when financials change.</div>
          </section>

          {!isEdit && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Promoters / management</div>
                <button type="button" onClick={() => set("people", [...(f.people || []), { name: "", designation: "", role_type: "Management", email: "", mobile: "" }])} className="text-xs text-amber-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add person</button>
              </div>
              <div className="space-y-2">
                {(f.people || []).map((p: any, i: number) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                    {(["name", "designation", "email", "mobile"] as const).map(k => (
                      <input key={k} value={p[k]} onChange={e => set("people", f.people.map((x: any, j: number) => j === i ? { ...x, [k]: e.target.value } : x))} className={inputCls} placeholder={k[0].toUpperCase() + k.slice(1)} aria-label={k} />
                    ))}
                    <select value={p.role_type} onChange={e => set("people", f.people.map((x: any, j: number) => j === i ? { ...x, role_type: e.target.value } : x))} className={inputCls} aria-label="Role">
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}
          <F label="Notes" span2><textarea value={f.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls} /></F>
        </div>
        <div className="px-5 py-3.5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-sm text-red-600 min-w-0">{error}</div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
            <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium">{saving ? "Saving…" : isEdit ? "Save changes" : "Create company"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Company 360 ──────────────────────────────────────────────────────────────
type Tab = "overview" | "people" | "opportunities" | "meetings" | "timeline" | "tasks" | "documents";

function Company360({ id, t, isDark, loggedUser, onClose, onEdit, onChanged }: { id: string; t: any; isDark: boolean; loggedUser?: any; onClose: () => void; onEdit: (c: any) => void; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [oppOpen, setOppOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<any>(null);
  const [person, setPerson] = useState<any | null>(null);
  const [newTask, setNewTask] = useState({ title: "", due_date: "", owner_id: "" });
  const [users, setUsers] = useState<any[]>([]);

  const [meetings, setMeetings] = useState<any[]>([]);
  // Opens read-only; Edit allows changes to the company and its people. Expand = full screen.
  const [editMode, setEditMode] = useState(false);
  const [wide, setWide] = useState(false);
  useEffect(() => { setEditMode(false); }, [id]);
  const load = useCallback(() => {
    fetch(`/api/ib/companies/${id}`).then(r => r.json()).then(setData).catch(() => {});
    fetch(`/api/meetings?client_id=${id}`).then(r => r.json()).then(d => setMeetings(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);
  useEffect(() => { setData(null); setTab("overview"); load(); }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("quicklog:saved", h); window.addEventListener("company:changed", h);
    return () => { window.removeEventListener("quicklog:saved", h); window.removeEventListener("company:changed", h); };
  }, [load]);
  useEffect(() => { fetch("/api/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : d?.data || [])).catch(() => {}); }, []);

  const c = data?.company;
  const openOpps = useMemo(() => (data?.opportunities || []).filter((o: any) => !["closed", "lost", "won"].includes(o.stage)), [data]);
  const openTasks = (data?.tasks || []).filter((x: any) => x.status === "Open");
  const today = new Date(new Date().toDateString());

  const toggleTask = async (task: any) => {
    await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: task.status === "Done" ? "Open" : "Done" }) });
    load();
  };
  const addTask = async () => {
    if (!newTask.title.trim()) return;
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newTask, owner_id: newTask.owner_id || loggedUser?.id, client_id: id, vertical: "Investment Banking" }) });
    setNewTask({ title: "", due_date: "", owner_id: "" }); load();
  };
  const savePerson = async () => {
    if (!person?.name?.trim()) return;
    const r = await fetch(person.id ? `/api/ib/people/${person.id}` : `/api/ib/companies/${id}/people`, { method: person.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(person) });
    if (r.ok) { setPerson(null); load(); onChanged(); }
  };
  const delPerson = async (p: any) => {
    if (!(await appConfirm({ title: `Remove ${p.name}?`, message: "They will be removed from this company.", confirmLabel: "Remove", tone: "danger" }))) return;
    await fetch(`/api/ib/people/${p.id}`, { method: "DELETE" }); load(); onChanged();
  };

  const card = `${t.bgCard2} rounded-xl p-3`;
  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: "overview", label: "Overview" }, { id: "people", label: "People", n: data?.people?.length },
    { id: "opportunities", label: "Opportunities", n: data?.opportunities?.length }, { id: "meetings", label: "Meetings", n: meetings.length }, { id: "timeline", label: "Timeline", n: data?.timeline?.length },
    { id: "tasks", label: "Tasks", n: openTasks.length }, { id: "documents", label: "Documents", n: data?.documents?.length },
  ];

  return (
    <>
    {wide && <div className="hidden md:block fixed inset-0 z-50 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setWide(false)} />}
    <div className={`fixed inset-0 z-[46] ${wide ? "md:z-[51] md:inset-y-6 md:inset-x-[6%] md:rounded-2xl md:shadow-2xl md:border animate-in zoom-in-95 fade-in duration-200" : "md:static md:z-auto md:w-[600px] lg:w-[680px] border-l animate-in slide-in-from-right-8 fade-in duration-300"} flex-shrink-0 ${t.border} ${t.bgCard} flex flex-col overflow-hidden`}>
      {!c ? <div className={`p-6 text-xs ${t.textMuted} flex items-center`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading company…</div> : (<>
        <div className={`px-4 py-3 border-b ${t.border} flex-shrink-0`}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className={`text-base font-bold ${t.text} leading-tight`}>{c.name}</div>
              <div className={`text-[11px] ${t.textMuted} mt-0.5 flex flex-wrap gap-x-2`}>
                <span className="font-mono">{c.cin || "No CIN"}</span><span>{c.client_code}</span>{c.sector && <span>{c.sector}</span>}{c.listed_status && <span>{c.listed_status}{c.exchange_symbol ? ` · ${c.exchange_symbol}` : ""}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {c.relationship_strength
                  ? <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${strengthCls(c.relationship_strength)}`}>{c.relationship_strength} relationship</span>
                  : <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.bgCard2} ${t.textMuted}`}>No relationship set</span>}
                <span className={`text-[11px] ${t.textMuted}`}>Owner: <b className={t.text}>{c.relationship_owner || "—"}</b></span>
              </div>
            </div>
            {editMode ? (<>
              <button onClick={() => onEdit(c)} className={`text-xs px-2 py-1 rounded-lg border ${t.border} ${t.textSub} flex items-center gap-1`}><Edit2 className="w-3 h-3" /> Details</button>
              <button onClick={() => setEditMode(false)} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</button>
            </>) : (
              <button onClick={() => setEditMode(true)} className="text-xs px-2 py-1 rounded-lg bg-amber-600 text-white flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
            )}
            <button onClick={() => setWide(w => !w)} aria-label={wide ? "Exit full screen" : "Expand"} title={wide ? "Exit full screen" : "Expand to full screen"} className={`hidden md:inline-flex p-1 ${t.textMuted}`}>{wide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            <button onClick={() => { setWide(false); onClose(); }} aria-label="Close" className={`p-1 ${t.textMuted}`}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <button onClick={() => window.dispatchEvent(new CustomEvent("recorder:open", { detail: { client_id: c.id, client_name: c.name, title: `Meeting with ${c.name}` } }))} className="text-xs py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white" /> Record</button>
            <button onClick={() => quickLog({ client_id: c.id, client_name: c.name })} className="text-xs py-2 rounded-lg bg-violet-600 text-white flex items-center justify-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Quick Log</button>
            <button onClick={() => setOppOpen(true)} className={`text-xs py-2 rounded-lg border ${t.border} ${t.textSub} flex items-center justify-center gap-1.5`}><TrendingUp className="w-3.5 h-3.5" /> Opportunity</button>
            <button onClick={() => { setEditMode(true); setPerson({ name: "", designation: "", role_type: "Promoter", email: "", mobile: "" }); }} className={`text-xs py-2 rounded-lg border ${t.border} ${t.textSub} flex items-center justify-center gap-1.5`}><Users className="w-3.5 h-3.5" /> Person</button>
          </div>
        </div>
        <div className={`flex gap-1 px-3 border-b ${t.border} overflow-x-auto flex-shrink-0`}>
          {tabs.map(x => (
            <button key={x.id} onClick={() => setTab(x.id)} className={`text-xs px-2.5 py-2 -mb-px border-b-2 whitespace-nowrap ${tab === x.id ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold" : `border-transparent ${t.textMuted}`}`}>
              {x.label}{x.n ? <span className="ml-1 opacity-70">{x.n}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "overview" && (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ["Open opportunities", openOpps.length], ["Pipeline value", money(openOpps.reduce((s: number, o: any) => s + rupees(o.value_estimate), 0))],
                ["Expected fee", money(openOpps.reduce((s: number, o: any) => s + Number(o.expected_fee || 0), 0))], ["Last contact", ago(data.interactions[0]?.occurred_at)],
              ].map(([l, v]) => (
                <div key={l as string} className={card}><div className={`text-[10px] uppercase ${t.textMuted}`}>{l}</div><div className={`text-sm font-bold ${t.text} mt-0.5`}>{v}</div></div>
              ))}
            </div>
            {openOpps.some((o: any) => o.next_action) && (
              <div>
                <div className={`text-[11px] font-bold uppercase ${t.textMuted} mb-1.5`}>Next actions</div>
                <div className="space-y-1.5">
                  {openOpps.filter((o: any) => o.next_action).map((o: any) => {
                    const overdue = o.next_action_date && new Date(o.next_action_date) < today;
                    return (
                      <div key={o.id} className={`rounded-lg border px-2.5 py-1.5 text-xs ${overdue ? t.alertRed : `${t.border} ${t.text}`}`}>
                        <b>{o.next_action}</b> <span className="opacity-75">· {o.name}{o.next_action_date ? ` · ${overdue ? "overdue since" : "by"} ${d(o.next_action_date)}` : ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className={card}>
              <div className="flex items-center justify-between mb-2">
                <div className={`text-[11px] font-bold uppercase ${t.textMuted}`}>Financials {c.fin_year ? `· ${c.fin_year}` : ""}</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[["Revenue", c.revenue_cr], ["EBITDA", c.ebitda_cr], ["PAT", c.pat_cr], ["Net worth", c.net_worth_cr], ["Valuation", c.valuation_cr]].map(([l, v]) => (
                  <div key={l}><div className={t.textMuted}>{l}</div><div className={`font-semibold ${t.text}`}>{cr(v)}</div></div>
                ))}
              </div>
              <div className={`text-[10px] mt-2 ${t.textMuted} flex items-center gap-1`}>
                <Clock className="w-3 h-3" /> Source: <b>{c.fin_source || "—"}</b> · as of {d(c.fin_as_of)} · updated by {c.fin_updated_by || "—"} {c.fin_updated_at ? `on ${d(c.fin_updated_at)}` : ""}
                {c.fin_as_of && (Date.now() - new Date(c.fin_as_of).getTime()) > 400 * 86400000 && <span className="text-amber-500 ml-1 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> over a year old</span>}
              </div>
            </div>
            <div className={card}>
              <div className={`text-[11px] font-bold uppercase ${t.textMuted} mb-2`}>Company</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {[["Group", c.group_name], ["Industry", c.industry], ["HQ", c.hq_city], ["Incorporated", c.date_of_incorporation ? d(c.date_of_incorporation) : null],
                  ["Website", c.website], ["Verticals", (c.verticals || []).join(", ").toUpperCase()]].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2"><span className={t.textMuted}>{l}</span><span className={`font-medium ${t.text} text-right truncate`}>{v || "—"}</span></div>
                ))}
              </div>
              <div className={`text-[10px] mt-2 ${t.textMuted}`}>Source: <b>{c.info_source || "—"}</b> · as of {d(c.info_as_of)} · updated by {c.info_updated_by || "—"} {c.info_updated_at ? `on ${d(c.info_updated_at)}` : ""}</div>
              {c.notes && <div className={`text-xs mt-2 ${t.textSub} whitespace-pre-wrap`}>{c.notes}</div>}
            </div>
            {data.people.length > 0 && (
              <div>
                <div className={`text-[11px] font-bold uppercase ${t.textMuted} mb-1.5`}>Key people</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.people.slice(0, 6).map((p: any) => <button key={p.id} onClick={() => window.dispatchEvent(new CustomEvent("person:open", { detail: { id: p.id } }))} className={`text-xs px-2 py-1 rounded-lg ${t.bgCard2} ${t.text} hover:ring-1 hover:ring-amber-500`}>{p.name} <span className={t.textMuted}>· {p.designation || p.role_type}</span></button>)}
                </div>
              </div>
            )}
          </>)}

          {tab === "people" && (
            <div className="space-y-2">
              {data.people.map((p: any) => (
                <div key={p.id} className={`${card} flex items-start gap-3`}>
                  <button onClick={() => window.dispatchEvent(new CustomEvent("person:open", { detail: { id: p.id } }))} className="flex items-start gap-3 flex-1 min-w-0 text-left" aria-label={`Open ${p.name}`}>
                  <div className="w-8 h-8 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center text-xs font-bold flex-shrink-0">{p.name.split(" ").map((x: string) => x[0]).join("").slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className={`font-semibold ${t.text}`}>{p.name} {p.is_key && <Star className="inline w-3 h-3 text-amber-500" />}</div>
                    <div className={t.textMuted}>{[p.designation, p.role_type].filter(Boolean).join(" · ")}</div>
                    <div className={`${t.textSub} mt-0.5 break-all`}>{[p.email, p.mobile].filter(Boolean).join(" · ") || "No contact details"}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 mt-2 flex-shrink-0 ${t.textMuted}`} />
                  </button>
                  {editMode && <button onClick={() => setPerson(p)} aria-label="Edit person" className={`p-1 ${t.textMuted}`}><Edit2 className="w-3.5 h-3.5" /></button>}
                  {editMode && <button onClick={() => delPerson(p)} aria-label="Remove person" className="p-1 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
              {!data.people.length && <div className={`text-xs ${t.textMuted}`}>No promoters or management added yet.</div>}
              {editMode && <div className="flex gap-4">
                <button onClick={() => setPerson({ name: "", designation: "", role_type: "Promoter", email: "", mobile: "" })} className="text-xs text-amber-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add person</button>
                <button onClick={() => window.dispatchEvent(new CustomEvent("cardscan:open", { detail: { client_id: c.id, client_name: c.name } }))} className="text-xs text-sky-600 flex items-center gap-1"><ScanLine className="w-3 h-3" /> Scan a card</button>
              </div>}
              {!editMode && <div className={`text-[11px] ${t.textMuted}`}>Click <b>Edit</b> to add, change or remove people.</div>}
            </div>
          )}

          {tab === "opportunities" && (
            <div className="space-y-2">
              {data.opportunities.map((o: any) => {
                const overdue = o.next_action_date && new Date(o.next_action_date) < today && !["closed", "lost"].includes(o.stage);
                return (
                  <button key={o.id} onClick={() => setEditOpp(o)} className={`${card} w-full text-left`}>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-semibold ${t.text} flex-1 min-w-0 truncate`}>{o.name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.stage === "lost" ? "bg-red-500/15 text-red-500" : o.stage === "closed" ? "bg-emerald-500/15 text-emerald-500" : "bg-blue-500/15 text-blue-500"}`}>{o.stage_label}</span>
                    </div>
                    <div className={`text-[11px] ${t.textMuted} mt-0.5`}>{[o.lead_code, o.opportunity_type, o.value_estimate ? money(rupees(o.value_estimate)) : null, o.expected_fee ? `fee ${money(Number(o.expected_fee))}` : null, o.rm_name].filter(Boolean).join(" · ")}</div>
                    {o.next_action && <div className={`text-[11px] mt-1 ${overdue ? "text-red-500 font-semibold" : t.textSub}`}>→ {o.next_action}{o.next_action_date ? ` · ${d(o.next_action_date)}` : ""}</div>}
                    {o.lost_reason && <div className="text-[11px] mt-1 text-red-500">Lost: {o.lost_reason}</div>}
                  </button>
                );
              })}
              {!data.opportunities.length && <div className={`text-xs ${t.textMuted}`}>No opportunities yet.</div>}
              <button onClick={() => setOppOpen(true)} className="text-xs text-amber-600 flex items-center gap-1"><Plus className="w-3 h-3" /> New opportunity</button>
            </div>
          )}

          {tab === "meetings" && (
            <div className="space-y-2">
              <button onClick={() => window.dispatchEvent(new CustomEvent("recorder:open", { detail: { client_id: c.id, client_name: c.name, title: `Meeting with ${c.name}` } }))} className="text-xs text-red-500 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Record a meeting</button>
              {meetings.map(mt => {
                const names = Object.values<any>(mt.speakers || {}).map(s => s.name).filter((n: string) => !/^Speaker \d+$/.test(n));
                const st: any = ({ scheduled: ["Teams · waiting for transcript", "text-sky-500"], recording: ["Recording", "text-red-500"], transcribing: ["Transcribing…", "text-amber-500"], transcribed: ["Transcript ready", "text-emerald-500"], no_transcript: ["No transcript", t.textMuted], failed: ["Failed", "text-red-500"] } as Record<string, string[]>)[mt.status] || [mt.status, t.textMuted];
                return (
                  <button key={mt.id} onClick={() => window.dispatchEvent(new CustomEvent("meeting:open", { detail: { id: mt.id } }))} className={`${card} w-full text-left`}>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-semibold ${t.text} flex-1 min-w-0 truncate`}>{mt.source === "teams" ? "🎥 " : "🎙 "}{mt.title}</div>
                      <span className={`text-[10px] ${st[1]}`}>{st[0]}</span>
                    </div>
                    <div className={`text-[11px] ${t.textMuted} mt-0.5`}>{d(mt.start_at)}{mt.duration_sec ? ` · ${Math.round(mt.duration_sec / 60)} min` : ""}{names.length ? ` · ${names.slice(0, 4).join(", ")}` : ""}</div>
                  </button>
                );
              })}
              {!meetings.length && <div className={`text-xs ${t.textMuted}`}>No meetings yet. Record one, or book a Teams meeting from the CRM and its transcript is added after the call.</div>}
            </div>
          )}

          {tab === "timeline" && (
            <ol className="space-y-3">
              {data.timeline.map((it: any, i: number) => (
                <li key={i} className="flex gap-2.5">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${it.kind === "interaction" ? "bg-violet-500/15 text-violet-500" : it.kind === "opportunity" ? "bg-blue-500/15 text-blue-500" : it.kind === "document" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
                    {it.kind === "interaction" ? <Phone className="w-3 h-3" /> : it.kind === "opportunity" ? <TrendingUp className="w-3 h-3" /> : it.kind === "document" ? <FileText className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div><b className={t.text}>{it.by || "—"}</b> <span className={t.textMuted}>
                      {it.kind === "interaction" ? `logged a ${String(it.type).toLowerCase()}${it.source === "fireflies" ? " (Fireflies)" : it.source === "voice" ? " (voice)" : it.source === "recording" ? " (recorded)" : it.source === "teams" ? " (Teams)" : ""}` : it.kind === "opportunity" ? "opened an opportunity" : it.kind === "document" ? "added a document" : "completed a task"}
                      {" · "}{d(it.at)}</span></div>
                    <div className={`${t.text} font-medium mt-0.5`}>{it.title}{it.stage ? <span className={t.textMuted}> · {it.stage}</span> : null}</div>
                    {it.summary && <div className={`mt-1 rounded-lg px-2.5 py-1.5 ${t.bgCard2} ${t.textSub} whitespace-pre-wrap`}>{it.summary}</div>}
                    {it.meeting_id && <button onClick={() => window.dispatchEvent(new CustomEvent("meeting:open", { detail: { id: it.meeting_id } }))} className="mt-1 text-[11px] text-violet-500 hover:underline">Open transcript →</button>}
                  </div>
                </li>
              ))}
              {!data.timeline.length && <div className={`text-xs ${t.textMuted}`}>Nothing yet — use Quick Log after your next call or meeting.</div>}
            </ol>
          )}

          {tab === "tasks" && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_140px_auto] gap-1.5">
                <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="New task…" className={`text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} />
                <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} className={`text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} aria-label="Due date" />
                <select value={newTask.owner_id} onChange={e => setNewTask(p => ({ ...p, owner_id: e.target.value }))} className={`text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} aria-label="Owner">
                  <option value="">Me</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button onClick={addTask} disabled={!newTask.title.trim()} className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white disabled:opacity-40">Add</button>
              </div>
              {data.tasks.map((x: any) => {
                const overdue = x.status === "Open" && x.due_date && new Date(x.due_date) < today;
                return (
                  <div key={x.id} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 ${t.bgCard2}`}>
                    <button onClick={() => toggleTask(x)} aria-label={x.status === "Done" ? "Reopen task" : "Complete task"} className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${x.status === "Done" ? "bg-emerald-500 border-emerald-500" : t.border}`}>
                      {x.status === "Done" && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className={`${t.text} ${x.status === "Done" ? "line-through opacity-60" : ""}`}>{x.title}</div>
                      <div className={`text-[10px] ${overdue ? "text-red-500 font-semibold" : t.textMuted}`}>{x.owner_name || "—"}{x.due_date ? ` · ${overdue ? "overdue · " : ""}${d(x.due_date)}` : ""}</div>
                    </div>
                  </div>
                );
              })}
              {!data.tasks.length && <div className={`text-xs ${t.textMuted}`}>No tasks.</div>}
            </div>
          )}

          {tab === "documents" && <RecordDocuments type="client" id={c.id} vertical="Investment Banking" clientId={c.id} t={t} onChange={load} />}
        </div>
      </>)}

      {person && (
        <div className="fixed inset-0 animate-in fade-in duration-200 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setPerson(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{person.id ? "Edit person" : "Add promoter / management"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <F label="Name *" span2><input value={person.name || ""} onChange={e => setPerson({ ...person, name: e.target.value })} className={inputCls} /></F>
              <F label="Designation"><input value={person.designation || ""} onChange={e => setPerson({ ...person, designation: e.target.value })} className={inputCls} /></F>
              <F label="Role"><select value={person.role_type || "Promoter"} onChange={e => setPerson({ ...person, role_type: e.target.value })} className={inputCls}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></F>
              <F label="Email"><input type="email" value={person.email || ""} onChange={e => setPerson({ ...person, email: e.target.value })} className={inputCls} /></F>
              <F label="Mobile"><input value={person.mobile || ""} onChange={e => setPerson({ ...person, mobile: e.target.value })} className={inputCls} /></F>
              <F label="LinkedIn" span2><input value={person.linkedin || ""} onChange={e => setPerson({ ...person, linkedin: e.target.value })} className={inputCls} /></F>
              <label className="sm:col-span-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><input type="checkbox" checked={!!person.is_key} onChange={e => setPerson({ ...person, is_key: e.target.checked })} /> Key decision-maker</label>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1"><Globe className="w-3 h-3" /> Fireflies meetings are matched to this company by these e-mail addresses.</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPerson(null)} className="px-3 py-2 text-sm text-gray-500">Cancel</button>
              <button onClick={savePerson} disabled={!person.name?.trim()} className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white disabled:opacity-40">Save</button>
            </div>
          </div>
        </div>
      )}
      <LeadModal open={oppOpen || !!editOpp} onClose={() => { setOppOpen(false); setEditOpp(null); }} onSaved={() => { load(); onChanged(); }}
        vertical="Investment Banking" verticalId="ib" editLead={editOpp ? { ...editOpp, client_name: c?.name } : undefined} currentUser={loggedUser}
        defaultClientId={c?.id} defaultClientName={c?.name} />
    </div>
    </>
  );
}
