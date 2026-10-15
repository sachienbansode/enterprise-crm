import { useState, useEffect, useCallback, useRef } from "react";
import { X, Maximize2, Minimize2, TrendingUp, Briefcase, Search, AlertCircle, ArrowRight, Flag, IndianRupee, User, ArrowLeft, ChevronRight, Layers, FileText } from "lucide-react";
import { DEAL_KINDS, kindOf, type DealKind, type KindField } from "./dealKinds";
import { StageFlowPrompt } from "./StagePath";



// ─── Shared styling ───────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";
const selectCls = inputCls;

const F = ({ label, children, span2, hint, req, bad }: { label: string; children: React.ReactNode; span2?: boolean; hint?: React.ReactNode; req?: boolean; bad?: boolean }) => (
  <div className={span2 ? "sm:col-span-2" : ""}>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}{req && <span className="text-red-500"> *</span>}</label>
    <div className={bad ? "rounded-lg ring-2 ring-red-500/70" : ""}>{children}</div>
    {hint && <div className="text-[11px] text-gray-500 mt-1">{hint}</div>}
  </div>
);

// ─── Form building blocks ─────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, tone }: { title: string; icon?: any; children: React.ReactNode; tone?: "amber" | "red" }) => (
  <section className={tone ? `rounded-xl border p-3 sm:p-4 ${tone === "red" ? "border-red-500/40 bg-red-500/5" : "border-amber-500/40 bg-amber-500/5"}` : ""}>
    <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2.5 ${tone === "red" ? "text-red-500" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
      {Icon && <Icon size={13} />} {title}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  </section>
);

const PRIORITY_TONE: Record<string, string> = {
  Low: "border-gray-400 text-gray-600 dark:text-gray-300 bg-gray-500/10",
  Medium: "border-sky-500 text-sky-600 dark:text-sky-300 bg-sky-500/10",
  High: "border-orange-500 text-orange-600 dark:text-orange-300 bg-orange-500/10",
  Critical: "border-red-500 text-red-600 dark:text-red-300 bg-red-500/10",
};

/** Pill buttons for short choice lists (stage, priority). */
function Pills({ options, value, onChange, tone }: { options: { id: string; label: string; won?: boolean; lost?: boolean }[]; value: string; onChange: (v: string) => void; tone?: (id: string) => string | undefined }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = o.id === value;
        const toneCls = tone?.(o.id) || (o.lost ? "border-red-500 text-red-600 dark:text-red-300 bg-red-500/10" : o.won ? "border-emerald-500 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10" : "border-violet-500 text-violet-700 dark:text-violet-200 bg-violet-500/15");
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={on}
            className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${on ? `${toneCls} font-semibold` : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const UNITS = [{ id: "cr", label: "Cr", mult: 1e7 }, { id: "l", label: "L", mult: 1e5 }, { id: "r", label: "₹", mult: 1 }];
/** Amount + unit (Cr / L / ₹). The form keeps plain rupees; users type "4,800 Cr" naturally. */
function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (rupees: string) => void; placeholder?: string }) {
  const pick = (r: number) => (r >= 1e7 ? "cr" : r >= 1e5 ? "l" : r > 0 ? "r" : "cr");
  const [unit, setUnit] = useState(() => pick(Number(value) || 0));
  const mult = UNITS.find(u => u.id === unit)!.mult;
  const shown = value === "" ? "" : String(Math.round((Number(value) / mult) * 100) / 100);
  return (
    <div className="flex">
      <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500"><IndianRupee size={13} /></span>
      <input type="number" inputMode="decimal" min={0} step="any" value={shown} placeholder={placeholder || "0"}
        onChange={e => onChange(e.target.value === "" ? "" : String(Math.round(Number(e.target.value) * mult)))}
        className={`${inputCls} rounded-none min-w-0`} />
      <select value={unit} onChange={e => setUnit(e.target.value)} aria-label="Unit"
        className="px-2 text-sm rounded-r-lg border border-l-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none">
        {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
      </select>
    </div>
  );
}

/** Shell shared by both forms: full-screen on phones, wide dialog on desktop, sticky header & footer. */
function ModalShell({ icon: Icon, title, subtitle, onClose, children, footer, onBack }: { icon: any; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; onBack?: () => void }) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white dark:bg-gray-950 sm:rounded-2xl shadow-2xl w-full h-full flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 fade-in duration-200 transition-[max-width,height] overflow-hidden border border-gray-200 dark:border-gray-800 ${wide ? "sm:max-w-6xl sm:h-[96vh]" : "sm:max-w-3xl sm:h-auto sm:max-h-[92vh]"}`}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            {onBack ? <button onClick={onBack} aria-label="Back" className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 flex items-center justify-center flex-shrink-0"><ArrowLeft size={18} /></button>
              : <div className="w-8 h-8 rounded-lg bg-violet-600/15 text-violet-500 flex items-center justify-center flex-shrink-0"><Icon size={16} /></div>}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{title}</h2>
              {subtitle && <div className="text-[11px] text-gray-500 truncate">{subtitle}</div>}
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={() => setWide(w => !w)} aria-label={wide ? "Exit full screen" : "Expand"} title={wide ? "Exit full screen" : "Expand"} className="hidden sm:inline-flex p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">{wide ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">{footer}</div>}
      </div>
    </div>
  );
}

function Footer({ error, saving, onClose, onSave, icon: Icon, label }: { error: string; saving: boolean; onClose: () => void; onSave: () => void; icon: any; label: string }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
      {error ? <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"><AlertCircle size={14} className="flex-shrink-0" /> {error}</div> : <div className="text-[11px] text-gray-400 hidden sm:block">Fields marked * are required · Esc to close</div>}
      <div className="flex gap-2 sm:gap-3">
        <button onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
        <button onClick={onSave} disabled={saving} className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
          {saving ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : <><Icon size={14} /> {label}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Client picker (searchable) ───────────────────────────────────────────────
export function ClientPicker({ value, onChange, apiBase = "", initialName = "" }: { value: string; onChange: (id: string, name: string) => void; apiBase?: string; initialName?: string }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedName, setSelectedName] = useState(initialName);
  useEffect(() => { setSelectedName(value ? initialName : ""); }, [value, initialName]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!search || search.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      fetch(`${apiBase}/api/clients?search=${encodeURIComponent(search)}&limit=10`)
        .then(r => r.json()).then(d => setResults(d.data || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search, apiBase]);

  const select = (client: any) => {
    onChange(client.id, client.name);
    setSelectedName(`${client.name} (${client.client_code})`);
    setSearch("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => { onChange("", ""); setSelectedName(""); };

  return (
    <div ref={ref} className="relative">
      {selectedName ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-300">
          <span className="flex-1 truncate">{selectedName}</span>
          <button onClick={clear} className="text-violet-400 hover:text-violet-600"><X size={12} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className={inputCls + " pl-8"}
            placeholder="Search client by name or code…"
          />
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 max-h-48 overflow-y-auto">
          {results.map((c: any) => (
            <button key={c.id} onClick={() => select(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white truncate">{c.name}</span>
              <span className="text-xs text-gray-400">{c.client_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LEAD FORM MODAL ─────────────────────────────────────────────────────────
interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (saved?: any) => void;
  vertical: string;
  verticalId: string;
  editLead?: any;
  currentUser?: any;
  apiBase?: string;
  defaultClientId?: string;
  defaultClientName?: string;
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

// "₹2000Cr" / "₹48.5L" / "₹12M" / "1,25,000" → rupees (number) for the edit form
export function parseMoneyToRupees(v: any): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return String(v);
  const m = String(v).replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|lakh|lac|l|k|mn|m)?/i);
  if (!m) return "";
  const n = parseFloat(m[1]);
  const u = (m[2] || "").toLowerCase();
  const mult = u.startsWith("cr") ? 1e7 : u === "l" || u.startsWith("la") ? 1e5 : u === "k" ? 1e3 : u === "m" || u === "mn" ? 1e6 : 1;
  return String(Math.round(n * mult));
}

// Keep a saved value selectable even if it is no longer in the configured dropdown list
const withCurrent = (list: string[], current: string) => (current && !list.includes(current) ? [current, ...list] : list);

// 20000000000 → "₹2,000 Cr" so large rupee amounts are readable while typing
const inWords = (v: any) => {
  const n = Number(v); if (!n) return "";
  if (n >= 1e7) return `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const BLANK_LEAD = {
  name: "", stage: "", priority: "Medium", value_estimate: "", source: "",
  sub_source: "", product: "", deal_type: "", assigned_rm_id: "", client_id: "",
  client_name: "", expected_close: "", notes: "",
  opportunity_type: "", next_action: "", next_action_date: "", lost_reason: "", lost_comment: "", expected_fee: "", probability: "",
};

export function LeadModal({ open, onClose, onSaved, vertical, verticalId, editLead, currentUser, apiBase = "", defaultClientId, defaultClientName }: LeadModalProps) {
  const isIB = verticalId === "ib"; // Investment Banking / ECM opportunity fields
  const [oppTypes, setOppTypes] = useState<string[]>([]);
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  const [form, setForm] = useState({ ...BLANK_LEAD });
  const [stages, setStages] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [dealTypes, setDealTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!editLead;

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch(`${apiBase}/api/config/pipeline-stages?entity=lead&vertical=${verticalId}`).then(r => r.json()),
      fetch(`${apiBase}/api/config/dropdowns?entity=lead&field=${verticalId === "ib" ? "source_ib" : "source"}`).then(r => r.json()),
      fetch(`${apiBase}/api/config/dropdowns?entity=lead&field=product`).then(r => r.json()),
      fetch(`${apiBase}/api/config/dropdowns?entity=deal&field=type`).then(r => r.json()),
      fetch(`${apiBase}/api/users`).then(r => r.json()),
    ]).then(([stageRows, sourceRows, productRows, typeRows, userRows]) => {
      setStages(Array.isArray(stageRows) ? stageRows : []);
      setSources(Array.isArray(sourceRows) ? sourceRows.map((r: any) => r.value) : []);
      setProducts(Array.isArray(productRows) ? productRows.map((r: any) => r.value) : []);
      setDealTypes(Array.isArray(typeRows) ? typeRows.map((r: any) => r.value) : []);
      setUsers(Array.isArray(userRows) ? userRows : userRows?.data || []);
    }).catch(() => {});
    if (verticalId === "ib") {
      fetch(`${apiBase}/api/config/dropdowns?entity=lead&field=opportunity_type`).then(r => r.json()).then(d => setOppTypes(Array.isArray(d) ? d.map((r: any) => r.value) : [])).catch(() => {});
      fetch(`${apiBase}/api/config/dropdowns?entity=lead&field=lost_reason`).then(r => r.json()).then(d => setLostReasons(Array.isArray(d) ? d.map((r: any) => r.value) : [])).catch(() => {});
    }
  }, [open, verticalId, apiBase]);

  useEffect(() => {
    if (!open) return;
    if (editLead) {
      setForm({
        name: editLead.name || "",
        stage: editLead.stage || "",
        priority: editLead.priority || "Medium",
        value_estimate: parseMoneyToRupees(editLead.value_estimate),
        source: editLead.source || "",
        sub_source: editLead.sub_source || "",
        product: editLead.product || "",
        deal_type: editLead.deal_type || "",
        assigned_rm_id: editLead.assigned_rm_id || "",
        client_id: editLead.client_id || "",
        client_name: editLead.client_name || "",
        expected_close: editLead.expected_close ? editLead.expected_close.split("T")[0] : "",
        notes: editLead.notes || "",
        opportunity_type: editLead.opportunity_type || "",
        next_action: editLead.next_action || "",
        next_action_date: editLead.next_action_date ? String(editLead.next_action_date).split("T")[0] : "",
        lost_reason: editLead.lost_reason || "", lost_comment: "",
        expected_fee: editLead.expected_fee != null ? String(Math.round(Number(editLead.expected_fee))) : "",
        probability: editLead.probability != null ? String(editLead.probability) : "",
      });
    } else {
      setForm({ ...BLANK_LEAD, assigned_rm_id: currentUser?.id || "", client_id: defaultClientId || "", client_name: defaultClientName || "" });
    }
    setError("");
  }, [open, editLead, currentUser, defaultClientId, defaultClientName]);

  const set = useCallback((k: string, v: any) => setForm(f => ({ ...f, [k]: v })), []);

  const [bad, setBad] = useState<string | null>(null); // field to highlight after a failed save
  useEffect(() => { if (bad && String((form as any)[bad] || "").trim()) { setBad(null); setError(""); } }, [form, bad]);
  // New records start on the first stage (instead of an empty "Select stage")
  useEffect(() => { if (open && !editLead && !form.stage && stages[0]) set("stage", stages[0].stage_id); }, [open, editLead, stages, form.stage, set]);

  // Stage workflow answer from the server: confirm a skip, or go to a mandatory stage first
  const [skipAsk, setSkipAsk] = useState<any>(null);
  useEffect(() => { if (!open) setSkipAsk(null); }, [open]);
  const handleSave = async (opts: { skip_confirmed?: boolean; stage?: string; stage_comment?: string } = {}) => {
    setBad(null); setSkipAsk(null);
    if (!form.name.trim()) { setBad("name"); setError(isIB ? "Opportunity name is required." : "Lead name is required."); return; }
    const st = stages.find(s => s.stage_id === (form.stage || stages[0]?.stage_id));
    if (isIB && st?.is_lost && !form.lost_reason) { setBad("lost_reason"); setError("Choose why this opportunity was lost."); return; }
    // A comment is needed whenever the opportunity is being put into Lost (new, or moved there in this edit)
    const enteringLost = isIB && st?.is_lost && (!isEdit || editLead.stage !== st.stage_id);
    if (enteringLost && form.lost_comment.trim().length < 10) { setBad("lost_comment"); setError("Add a comment on why it was lost (at least 10 characters)."); return; }
    if (isIB && st && !st.is_won && !st.is_lost && !form.next_action.trim()) { setBad("next_action"); setError("Add the next action — every active opportunity needs one."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        name: form.name, vertical, stage: opts.stage || form.stage || stages[0]?.stage_id || "new", skip_confirmed: !!opts.skip_confirmed, stage_comment: opts.stage_comment,
        priority: form.priority, value_estimate: form.value_estimate ? Number(form.value_estimate) : null,
        // source / sub-source are fixed once the lead exists
        ...(isEdit ? {} : { source: form.source || null, sub_source: form.sub_source || null }),
        product: form.product || null, deal_type: form.deal_type || null,
        assigned_rm_id: form.assigned_rm_id || null, client_id: form.client_id || null,
        expected_close: form.expected_close || null, notes: form.notes || null,
        updated_by: currentUser?.name || "System",
        ...(isIB ? {
          opportunity_type: form.opportunity_type || null, next_action: form.next_action || null, next_action_date: form.next_action_date || null,
          lost_reason: form.lost_reason || null, lost_comment: form.lost_comment.trim() || null, expected_fee: form.expected_fee ? Number(form.expected_fee) : null,
          probability: form.probability !== "" ? Math.max(0, Math.min(100, Number(form.probability))) : null,
        } : {}),
      };
      const url = isEdit ? `${apiBase}/api/leads/${editLead.id}` : `${apiBase}/api/leads`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        if (e.code === "CONFIRM_SKIP" || e.code === "NEED_SKIP_COMMENT") { setSkipAsk({ stageId: opts.stage || form.stage, code: e.code, skip: e.skip, stage: e.stage, from: editLead ? (stages.find((x: any) => x.stage_id === editLead.stage)?.label || editLead.stage) : "New" }); return; }
        throw new Error(e.error || "Failed to save");
      }
      const saved = await res.json().catch(() => null);
      onSaved(saved); onClose();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (!open) return null;
  const curStage = stages.find(s => s.stage_id === form.stage);
  const noun = isIB ? "Opportunity" : "Lead";
  const lockedHint = isEdit ? "Fixed once created" : undefined;

  return (
    <ModalShell icon={TrendingUp} onClose={onClose}
      title={`${isEdit ? "Edit" : "New"} ${noun}`}
      subtitle={isEdit ? `${editLead.lead_code || ""} · ${editLead.vertical || vertical} · opened ${fmtDate(editLead.opened_at || editLead.created_at)} · by ${editLead.created_by_name || "—"}` : vertical}
      footer={<>{skipAsk && <div className="mb-3"><StageFlowPrompt prompt={skipAsk} stages={stages.map((x: any) => ({ id: x.stage_id, label: x.label }))} busy={saving}
        onMove={(_id, extra) => handleSave({ skip_confirmed: true, stage_comment: extra?.stage_comment })} onCancel={() => setSkipAsk(null)} /></div>}<Footer error={error} saving={saving} onClose={onClose} onSave={() => handleSave()} icon={TrendingUp} label={isEdit ? "Save changes" : `Create ${noun.toLowerCase()}`} /></>}>

      <Section title={isIB ? "Opportunity" : "Lead"}>
        <F label={`${noun} name`} req span2 bad={bad === "name"} hint={lockedHint}>
          <input value={form.name} onChange={e => set("name", e.target.value)} disabled={isEdit} autoFocus={!isEdit}
            className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder={isIB ? "e.g. ABC Ltd — IPO" : "e.g. Mr. Rahul Sharma - Equity A/c Opening"} />
        </F>
        <F label={isIB ? "Company" : "Linked client"} span2>
          <ClientPicker value={form.client_id} onChange={(id, name) => setForm(f => ({ ...f, client_id: id, client_name: name }))} apiBase={apiBase} initialName={form.client_name} />
        </F>
        {isIB ? (
          <F label="Opportunity Type">
            <select value={form.opportunity_type} onChange={e => set("opportunity_type", e.target.value)} className={selectCls}>
              <option value="">— Select —</option>
              {withCurrent(oppTypes, form.opportunity_type).map(t => <option key={t}>{t}</option>)}
            </select>
          </F>
        ) : (<>
          <F label="Product / Segment">
            <select value={form.product} onChange={e => set("product", e.target.value)} className={selectCls}>
              <option value="">— Select —</option>
              {withCurrent(products, form.product).map(p => <option key={p}>{p}</option>)}
            </select>
          </F>
          <F label="Deal Type">
            <select value={form.deal_type} onChange={e => set("deal_type", e.target.value)} className={selectCls}>
              <option value="">— Select —</option>
              {withCurrent(dealTypes, form.deal_type).map(t => <option key={t}>{t}</option>)}
            </select>
          </F>
        </>)}
        <F label="Source" hint={lockedHint}>
          <select value={form.source} onChange={e => set("source", e.target.value)} disabled={isEdit} className={`${selectCls} disabled:opacity-60 disabled:cursor-not-allowed`}>
            <option value="">— Select —</option>
            {withCurrent(sources, form.source).map(x => <option key={x}>{x}</option>)}
          </select>
        </F>
        <F label="Sub-source" span2={!isIB ? false : undefined}>
          <input value={form.sub_source} onChange={e => set("sub_source", e.target.value)} disabled={isEdit} className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder={isEdit ? "—" : "e.g. referred by CA firm, LinkedIn"} />
        </F>
      </Section>

      <Section title="Stage & priority" icon={Flag}>
        <F label="Stage" span2>
          <Pills value={form.stage} onChange={v => set("stage", v)} options={stages.map(x => ({ id: x.stage_id, label: x.label, won: x.is_won, lost: x.is_lost }))} />
        </F>
        <F label="Priority" span2>
          <Pills value={form.priority} onChange={v => set("priority", v)} options={PRIORITIES.map(p => ({ id: p, label: p }))} tone={id => PRIORITY_TONE[id]} />
        </F>
      </Section>

      {isIB && curStage?.is_lost ? (
        <Section title="Why was it lost?" tone="red">
          <F label="Lost Reason" req span2 bad={bad === "lost_reason"}>
            <select value={form.lost_reason} onChange={e => set("lost_reason", e.target.value)} className={selectCls}>
              <option value="">— Choose a reason —</option>
              {withCurrent(lostReasons, form.lost_reason).map(r => <option key={r}>{r}</option>)}
            </select>
          </F>
          {(!isEdit || editLead?.stage !== form.stage) ? (
            <F label="Comment" req span2 bad={bad === "lost_comment"} hint="What happened? Saved to the opportunity's History (min 10 characters)">
              <textarea value={form.lost_comment} onChange={e => set("lost_comment", e.target.value)} rows={3} className={inputCls} placeholder="e.g. Promoter wants to wait for FY27 results before going ahead" />
            </F>
          ) : editLead?.lost_comment ? (
            <F label="Comment" span2><div className="text-xs opacity-80 whitespace-pre-wrap">{editLead.lost_comment}</div></F>
          ) : null}
        </Section>
      ) : isIB && !curStage?.is_won ? (
        <Section title="Next step" icon={ArrowRight} tone="amber">
          <F label="Next Action" req bad={bad === "next_action"} hint="Every active opportunity needs one — it drives My Day and reminders">
            <input value={form.next_action} onChange={e => set("next_action", e.target.value)} className={inputCls} placeholder="e.g. Send pitch deck to CFO" />
          </F>
          <F label="By When">
            <input type="date" value={form.next_action_date} onChange={e => set("next_action_date", e.target.value)} className={inputCls} />
          </F>
        </Section>
      ) : null}

      <Section title="Value" icon={IndianRupee}>
        <F label={isIB ? "Transaction size" : "Estimated value"} hint={form.value_estimate ? `= ${inWords(form.value_estimate)}` : undefined}>
          <MoneyInput value={form.value_estimate} onChange={v => set("value_estimate", v)} />
        </F>
        {isIB ? (
          <F label="Expected Fee" hint={form.expected_fee ? `= ${inWords(form.expected_fee)}${form.value_estimate && Number(form.value_estimate) ? ` · ${(Number(form.expected_fee) / Number(form.value_estimate) * 100).toFixed(2)}% of size` : ""}` : undefined}>
            <MoneyInput value={form.expected_fee} onChange={v => set("expected_fee", v)} />
          </F>
        ) : (
          <F label="Expected Close">
            <input type="date" value={form.expected_close} onChange={e => set("expected_close", e.target.value)} className={inputCls} />
          </F>
        )}
        {isIB && (
          <F label={`Probability — ${form.probability === "" ? "auto from stage" : `${form.probability}%`}`} span2>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={5} value={form.probability === "" ? 0 : Number(form.probability)}
                onChange={e => set("probability", e.target.value)} className="flex-1 accent-violet-600" aria-label="Probability" />
              {form.probability !== "" && <button type="button" onClick={() => set("probability", "")} className="text-[11px] text-violet-600 hover:underline whitespace-nowrap">Use auto</button>}
            </div>
          </F>
        )}
      </Section>

      <Section title="Ownership & timing" icon={User}>
        <F label="Assigned RM">
          <select value={form.assigned_rm_id} onChange={e => set("assigned_rm_id", e.target.value)} className={selectCls}>
            <option value="">— None —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </F>
        {isIB && (
          <F label="Expected Close">
            <input type="date" value={form.expected_close} onChange={e => set("expected_close", e.target.value)} className={inputCls} />
          </F>
        )}
        <F label="Notes" span2>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputCls} placeholder={`Anything the team should know about this ${noun.toLowerCase()}…`} />
        </F>
      </Section>
    </ModalShell>
  );
}

// ─── DEAL FORM MODAL ─────────────────────────────────────────────────────────
// One input for a kind-specific detail (stored on deals.details)
function KindInput({ fd, value, onChange }: { fd: KindField; value: any; onChange: (v: any) => void }) {
  return (
    <F label={fd.label} span2={fd.span2 || fd.type === "pills"}>
      {fd.type === "pills" ? <Pills value={String(value)} onChange={v => onChange(v === value ? "" : v)} options={fd.options.map(o => ({ id: o, label: o }))} />
        : fd.type === "select" ? <select value={value} onChange={e => onChange(e.target.value)} className={selectCls}><option value="">— Select —</option>{fd.options.map(o => <option key={o}>{o}</option>)}</select>
        : fd.type === "money" ? <MoneyInput value={String(value)} onChange={onChange} />
        : fd.type === "date" ? <input type="date" value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
        : fd.type === "pct" ? <div className="relative"><input type="number" inputMode="decimal" step="0.01" min={0} max={100} value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span></div>
        : fd.type === "number" ? <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
        : <input value={value} onChange={e => onChange(e.target.value)} className={inputCls} placeholder={(fd as any).placeholder} />}
    </F>
  );
}
interface DealModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  vertical: string;
  verticalId: string;
  editDeal?: any;
  currentUser?: any;
  apiBase?: string;
}

const BLANK_DEAL = {
  name: "", stage: "", type: "", deal_type: "", value: "", client_id: "",
  client_name: "", rm_id: "", expected_close: "", notes: "",
};

export function DealModal({ open, onClose, onSaved, vertical, verticalId, editDeal, currentUser, apiBase = "" }: DealModalProps) {
  const [form, setForm] = useState({ ...BLANK_DEAL });
  const [stages, setStages] = useState<any[]>([]);
  const [dealTypes, setDealTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Step 1 for a new deal: what kind of deal? → the form then asks only what matters for that kind
  const kinds = DEAL_KINDS[verticalId] || [];
  const [step, setStep] = useState<"kind" | "form">("form");
  const [kind, setKind] = useState<DealKind | null>(null);
  const [details, setDetails] = useState<Record<string, any>>({});

  const isEdit = !!editDeal;

  useEffect(() => {
    if (!open) return;
    if (editDeal) { setKind(kindOf(verticalId, editDeal) || null); setDetails(editDeal.details || {}); setStep("form"); }
    else { setKind(null); setDetails({}); setStep(kinds.length ? "kind" : "form"); }
  }, [open, editDeal, verticalId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch(`${apiBase}/api/config/pipeline-stages?entity=deal&vertical=${verticalId}`).then(r => r.json()),
      fetch(`${apiBase}/api/config/dropdowns?entity=deal&field=type`).then(r => r.json()),
      fetch(`${apiBase}/api/users`).then(r => r.json()),
    ]).then(([stageRows, typeRows, userRows]) => {
      setStages(Array.isArray(stageRows) ? stageRows : []);
      setDealTypes(Array.isArray(typeRows) ? typeRows.map((r: any) => r.value) : []);
      setUsers(Array.isArray(userRows) ? userRows : userRows?.data || []);
    }).catch(() => {});
  }, [open, verticalId, apiBase]);

  useEffect(() => {
    if (!open) return;
    if (editDeal) {
      setForm({
        name: editDeal.name || "",
        stage: editDeal.stage || "",
        type: editDeal.type || "",
        deal_type: editDeal.deal_type || "",
        value: parseMoneyToRupees(editDeal.value),
        client_id: editDeal.client_id || "",
        client_name: editDeal.client_name || "",
        rm_id: editDeal.rm_id || "",
        expected_close: editDeal.expected_close ? editDeal.expected_close.split("T")[0] : "",
        notes: editDeal.notes || "",
      });
    } else {
      setForm({ ...BLANK_DEAL, rm_id: currentUser?.id || "" });
    }
    setError("");
  }, [open, editDeal, currentUser]);

  const set = useCallback((k: string, v: any) => setForm(f => ({ ...f, [k]: v })), []);

  const [bad, setBad] = useState<string | null>(null);
  useEffect(() => { if (bad && String((form as any)[bad] || "").trim()) { setBad(null); setError(""); } }, [form, bad]);
  useEffect(() => { if (open && !editDeal && !form.stage && stages[0]) set("stage", stages[0].stage_id); }, [open, editDeal, stages, form.stage, set]);
  const isIB = verticalId === "ib";

  // Stage workflow answer from the server: confirm a skip, or go to a mandatory stage first
  const [skipAsk, setSkipAsk] = useState<any>(null);
  useEffect(() => { if (!open) setSkipAsk(null); }, [open]);
  const handleSave = async (opts: { skip_confirmed?: boolean; stage?: string; stage_comment?: string } = {}) => {
    setBad(null); setSkipAsk(null);
    if (!form.name.trim()) { setBad("name"); setError(isIB ? "Mandate name is required." : "Deal name is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        name: form.name, vertical,
        stage: opts.stage || form.stage || stages[0]?.stage_id || "Active", skip_confirmed: !!opts.skip_confirmed, stage_comment: opts.stage_comment,
        type: form.type || kind?.label || null, deal_type: form.deal_type || kind?.dealType || null,
        value: form.value ? Number(form.value) : null,
        details: { ...details, ...(kind ? { kind: kind.id } : {}) },
        client_id: form.client_id || null, rm_id: form.rm_id || null,
        expected_close: form.expected_close || null, notes: form.notes || null,
        updated_by: currentUser?.name || "System",
      };
      const url = isEdit ? `${apiBase}/api/deals/${editDeal.id}` : `${apiBase}/api/deals`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        if (e.code === "CONFIRM_SKIP" || e.code === "NEED_SKIP_COMMENT") { setSkipAsk({ stageId: opts.stage || form.stage, code: e.code, skip: e.skip, stage: e.stage, from: editDeal ? (stages.find((x: any) => x.stage_id === editDeal.stage)?.label || editDeal.stage) : "New" }); return; }
        throw new Error(e.error || "Failed to save");
      }
      onSaved(); onClose();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (!open) return null;
  const noun = isIB ? "Mandate / Deal" : "Deal";
  const chooseKind = (k: DealKind | null) => {
    setKind(k); setStep("form");
    if (k) setForm(f => ({ ...f, deal_type: f.deal_type || k.dealType }));
  };

  if (step === "kind") return (
    <ModalShell icon={Briefcase} onClose={onClose} title={`New ${isIB ? "mandate" : "deal"}`} subtitle={vertical}>
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">What kind of {isIB ? "mandate" : "deal"}?</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Each kind asks only for the details that matter for it.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 -mt-2">
        {kinds.map(k => (
          <button key={k.id} onClick={() => chooseKind(k)} className="group flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-violet-500 hover:bg-violet-500/5 text-left transition-colors">
            <span className="w-10 h-10 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-300 flex items-center justify-center flex-shrink-0"><Layers size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">{k.label}</span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{k.sub}</span>
            </span>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-violet-500 flex-shrink-0" />
          </button>
        ))}
        <button onClick={() => chooseKind(null)} className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-left hover:border-violet-500">
          <span className="w-10 h-10 rounded-xl bg-gray-500/10 text-gray-500 flex items-center justify-center flex-shrink-0"><FileText size={18} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-900 dark:text-white">Something else</span><span className="block text-[11px] text-gray-500">General form</span></span>
          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        </button>
      </div>
      <div className="text-center"><button onClick={onClose} className="text-sm text-violet-600 dark:text-violet-400 font-medium px-4 py-2">Cancel</button></div>
    </ModalShell>
  );

  return (
    <ModalShell icon={Briefcase} onClose={onClose} onBack={!isEdit && kinds.length ? () => setStep("kind") : undefined}
      title={`${isEdit ? "Edit" : "New"} ${kind ? kind.label : noun}`}
      subtitle={isEdit ? `${editDeal.deal_code || ""} · ${editDeal.vertical || vertical}` : `${vertical}${kind ? ` · ${kind.sub}` : isIB ? " · signed or near-signed work being executed" : ""}`}
      footer={<>{skipAsk && <div className="mb-3"><StageFlowPrompt prompt={skipAsk} stages={stages.map((x: any) => ({ id: x.stage_id, label: x.label }))} busy={saving}
        onMove={(_id, extra) => handleSave({ skip_confirmed: true, stage_comment: extra?.stage_comment })} onCancel={() => setSkipAsk(null)} /></div>}<Footer error={error} saving={saving} onClose={onClose} onSave={() => handleSave()} icon={Briefcase} label={isEdit ? "Save changes" : `Create ${isIB ? "mandate" : "deal"}`} /></>}>

      <Section title={isIB ? "Mandate" : "Deal"}>
        <F label={isIB ? "Mandate name" : "Deal name"} req span2 bad={bad === "name"}>
          <input value={form.name} onChange={e => set("name", e.target.value)} autoFocus={!isEdit} className={inputCls} placeholder={isIB ? "e.g. ABC Ltd — IPO (BRLM)" : "e.g. ABC Corp - IPO Subscription ₹50L"} />
        </F>
        <F label={isIB ? "Company" : "Linked client"} span2>
          <ClientPicker value={form.client_id} onChange={(id, name) => setForm(f => ({ ...f, client_id: id, client_name: name }))} apiBase={apiBase} initialName={form.client_name} />
        </F>
        {!kind && (<>
        <F label="Deal Type">
          <select value={form.deal_type} onChange={e => set("deal_type", e.target.value)} className={selectCls}>
            <option value="">— Select —</option>
            {withCurrent(dealTypes, form.deal_type).map(t => <option key={t}>{t}</option>)}
          </select>
        </F>
        <F label="Sub-type / Product (optional)">
          <input value={form.type} onChange={e => set("type", e.target.value)} className={inputCls} placeholder="e.g. Fresh issue + OFS, Block, QIP" />
        </F>
        </>)}
      </Section>

      {kind && kind.fields.length > 0 && (
        <Section title={`${kind.label} details`} icon={Layers}>
          {kind.fields.map(fd => <KindInput key={fd.k} fd={fd} value={details[fd.k] ?? ""} onChange={v => setDetails(d => ({ ...d, [fd.k]: v }))} />)}
        </Section>
      )}

      <Section title="Stage" icon={Flag}>
        <F label="Current Stage" span2>
          <Pills value={form.stage} onChange={v => set("stage", v)} options={stages.map(x => ({ id: x.stage_id, label: x.label, won: x.is_won, lost: x.is_lost }))} />
        </F>
      </Section>

      <Section title="Value & timing" icon={IndianRupee}>
        <F label={kind?.valueLabel || (isIB ? "Transaction size / fee base" : "Deal value")} hint={form.value ? `= ${inWords(form.value)}` : undefined}>
          <MoneyInput value={form.value} onChange={v => set("value", v)} />
        </F>
        <F label="Expected Close">
          <input type="date" value={form.expected_close} onChange={e => set("expected_close", e.target.value)} className={inputCls} />
        </F>
      </Section>

      <Section title="Ownership" icon={User}>
        <F label="Assigned RM">
          <select value={form.rm_id} onChange={e => set("rm_id", e.target.value)} className={selectCls}>
            <option value="">— None —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </F>
        <div className="hidden sm:block" />
        <F label="Notes" span2>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputCls} placeholder={isIB ? "Scope, fee terms, key dates…" : "Notes about this deal…"} />
        </F>
      </Section>
    </ModalShell>
  );
}
