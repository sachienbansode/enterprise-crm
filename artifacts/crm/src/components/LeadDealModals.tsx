import { useState, useEffect, useCallback, useRef } from "react";
import { X, TrendingUp, Briefcase, Search, AlertCircle } from "lucide-react";



// ─── Shared styling ───────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";
const selectCls = inputCls;

const F = ({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) => (
  <div className={span2 ? "sm:col-span-2" : ""}>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
    {children}
  </div>
);

// ─── Client picker (searchable) ───────────────────────────────────────────────
function ClientPicker({ value, onChange, apiBase = "", initialName = "" }: { value: string; onChange: (id: string, name: string) => void; apiBase?: string; initialName?: string }) {
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
};

export function LeadModal({ open, onClose, onSaved, vertical, verticalId, editLead, currentUser, apiBase = "" }: LeadModalProps) {
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
      fetch(`${apiBase}/api/config/dropdowns?entity=lead&field=source`).then(r => r.json()),
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
      });
    } else {
      setForm({ ...BLANK_LEAD, assigned_rm_id: currentUser?.id || "" });
    }
    setError("");
  }, [open, editLead, currentUser]);

  const set = useCallback((k: string, v: any) => setForm(f => ({ ...f, [k]: v })), []);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Lead name is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        name: form.name, vertical, stage: form.stage || stages[0]?.stage_id || "new",
        priority: form.priority, value_estimate: form.value_estimate ? Number(form.value_estimate) : null,
        // source / sub-source are fixed once the lead exists
        ...(isEdit ? {} : { source: form.source || null, sub_source: form.sub_source || null }),
        product: form.product || null, deal_type: form.deal_type || null,
        assigned_rm_id: form.assigned_rm_id || null, client_id: form.client_id || null,
        expected_close: form.expected_close || null, notes: form.notes || null,
        updated_by: currentUser?.name || "System",
      };
      const url = isEdit ? `${apiBase}/api/leads/${editLead.id}` : `${apiBase}/api/leads`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save"); }
      const saved = await res.json().catch(() => null);
      onSaved(saved); onClose();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Edit Lead" : "New Lead"} — {vertical}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isEdit && (
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 text-xs">
              <div><div className="text-gray-500">Lead ID</div><div className="font-mono font-semibold text-gray-900 dark:text-gray-100">{editLead.lead_code || "—"}</div></div>
              <div><div className="text-gray-500">Vertical</div><div className="font-semibold text-gray-900 dark:text-gray-100">{editLead.vertical || vertical}</div></div>
              <div><div className="text-gray-500">Opened on</div><div className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(editLead.opened_at || editLead.created_at)}</div></div>
              <div><div className="text-gray-500">Created by</div><div className="font-semibold text-gray-900 dark:text-gray-100">{editLead.created_by_name || "—"}</div></div>
            </div>
          )}
          {/* Name */}
          <F label="Lead Name *" span2>
            <input value={form.name} onChange={e => set("name", e.target.value)} disabled={isEdit} title={isEdit ? "Lead name can't be changed after creation" : undefined} className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="e.g. Mr. Rahul Sharma - Equity A/c Opening" />
          </F>
          {/* Stage */}
          <F label="Stage">
            <select value={form.stage} onChange={e => set("stage", e.target.value)} className={selectCls}>
              <option value="">— Select stage —</option>
              {stages.map(s => <option key={s.stage_id} value={s.stage_id}>{s.label}</option>)}
            </select>
          </F>
          {/* Priority */}
          <F label="Priority">
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={selectCls}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </F>
          {/* Source */}
          <F label="Lead Source">
            <select value={form.source} onChange={e => set("source", e.target.value)} disabled={isEdit} title={isEdit ? "Source can't be changed after the lead is created" : undefined} className={`${selectCls} disabled:opacity-60 disabled:cursor-not-allowed`}>
              <option value="">— Select source —</option>
              {withCurrent(sources, form.source).map(s => <option key={s}>{s}</option>)}
            </select>
          </F>
          {/* Sub-source */}
          <F label="Sub-Source">
            <input value={form.sub_source} onChange={e => set("sub_source", e.target.value)} disabled={isEdit} className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder={isEdit ? "—" : "e.g. LinkedIn, Friend referral…"} />
          </F>
          {/* Product */}
          <F label="Product / Segment">
            <select value={form.product} onChange={e => set("product", e.target.value)} className={selectCls}>
              <option value="">— Select product —</option>
              {withCurrent(products, form.product).map(p => <option key={p}>{p}</option>)}
            </select>
          </F>
          {/* Deal Type */}
          <F label="Deal Type">
            <select value={form.deal_type} onChange={e => set("deal_type", e.target.value)} className={selectCls}>
              <option value="">— Select type —</option>
              {withCurrent(dealTypes, form.deal_type).map(t => <option key={t}>{t}</option>)}
            </select>
          </F>
          {/* Value estimate */}
          <F label="Estimated Value (₹)">
            <input type="number" value={form.value_estimate} onChange={e => set("value_estimate", e.target.value)} className={inputCls} placeholder="0" />
            {form.value_estimate && <div className="text-[11px] text-gray-500 mt-1">= {inWords(form.value_estimate)}</div>}
          </F>
          {/* Expected Close */}
          <F label="Expected Close Date">
            <input type="date" value={form.expected_close} onChange={e => set("expected_close", e.target.value)} className={inputCls} />
          </F>
          {/* RM */}
          <F label="Assigned RM" span2>
            <select value={form.assigned_rm_id} onChange={e => set("assigned_rm_id", e.target.value)} className={selectCls}>
              <option value="">— None —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </F>
          {/* Client */}
          <F label="Linked Client" span2>
            <ClientPicker
              value={form.client_id}
              onChange={(id, name) => setForm(f => ({ ...f, client_id: id, client_name: name }))}
              apiBase={apiBase}
              initialName={form.client_name}
            />
          </F>
          {/* Notes */}
          <F label="Notes" span2>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputCls} placeholder="Notes about this lead…" />
          </F>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          {error ? (
            <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle size={14} /> {error}</div>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2">
              {saving ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : <><TrendingUp size={14} /> {isEdit ? "Save Changes" : "Create Lead"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DEAL FORM MODAL ─────────────────────────────────────────────────────────
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

  const isEdit = !!editDeal;

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

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Deal name is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        name: form.name, vertical,
        stage: form.stage || stages[0]?.stage_id || "Active",
        type: form.type || null, deal_type: form.deal_type || null,
        value: form.value ? Number(form.value) : null,
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
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save"); }
      onSaved(); onClose();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-violet-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Edit Deal" : "New Deal"} — {vertical}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="Deal Name *" span2>
            <input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} placeholder="e.g. ABC Corp - IPO Subscription ₹50L" />
          </F>
          <F label="Stage">
            <select value={form.stage} onChange={e => set("stage", e.target.value)} className={selectCls}>
              <option value="">— Select stage —</option>
              {stages.map(s => <option key={s.stage_id} value={s.stage_id}>{s.label}</option>)}
            </select>
          </F>
          <F label="Deal Type">
            <select value={form.deal_type} onChange={e => set("deal_type", e.target.value)} className={selectCls}>
              <option value="">— Select type —</option>
              {dealTypes.map(t => <option key={t}>{t}</option>)}
            </select>
          </F>
          <F label="Type / Category">
            <input value={form.type} onChange={e => set("type", e.target.value)} className={inputCls} placeholder="e.g. IPO, Block, QIP" />
          </F>
          <F label="Deal Value (₹)">
            <input type="number" value={form.value} onChange={e => set("value", e.target.value)} className={inputCls} placeholder="0" />
            {form.value && <div className="text-[11px] text-gray-500 mt-1">= {inWords(form.value)}</div>}
          </F>
          <F label="Expected Close Date">
            <input type="date" value={form.expected_close} onChange={e => set("expected_close", e.target.value)} className={inputCls} />
          </F>
          <F label="Assigned RM">
            <select value={form.rm_id} onChange={e => set("rm_id", e.target.value)} className={selectCls}>
              <option value="">— None —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </F>
          <F label="Linked Client" span2>
            <ClientPicker
              value={form.client_id}
              onChange={(id, name) => setForm(f => ({ ...f, client_id: id, client_name: name }))}
              apiBase={apiBase}
              initialName={form.client_name}
            />
          </F>
          <F label="Notes" span2>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputCls} placeholder="Notes about this deal…" />
          </F>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          {error ? (
            <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle size={14} /> {error}</div>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2">
              {saving ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : <><Briefcase size={14} /> {isEdit ? "Save Changes" : "Create Deal"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
