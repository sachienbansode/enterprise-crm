import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Download, Eye, FileText, Filter, History,
  MessageSquare, Paperclip, Plus, RefreshCw, Search, Send, Upload,
  User, Users, X, AlertCircle, CheckCheck, Tag, Hash, CornerDownLeft,
  Loader2, Activity, Info, Edit2, Check, Zap, XCircle, Star,
  ListFilter, BarChart3, Mail, Phone, Building, Shield, ArrowUpDown,
} from "lucide-react";

// ─── Shared helpers ────────────────────────────────────────────────────────────
const API_BASE = (() => {
  const d = (window as any).__REPLIT_DEV_DOMAIN__ || "";
  if (d) return `https://${d}`;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "";
  return "";
})();

function fmtTs(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function fmtDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
function maskValue(v: string | null | undefined): string {
  if (!v) return "—";
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  if (/^\d{10}$/.test(v)) return `${v.slice(0, 2)}******${v.slice(-2)}`;
  if (v.length > 5) return `${v.slice(0, 2)}${"*".repeat(Math.min(v.length - 3, 6))}${v.slice(-1)}`;
  return v;
}

export const SR_CATEGORIES: Record<string, string[]> = {
  "Account Issues":       ["Account Activation", "Account Closure Request", "Profile Update", "Nomination Change", "Address Update"],
  "Trade Issues":         ["Order Not Executed", "Wrong Trade", "Settlement Query", "Margin Query", "Corporate Action"],
  "KYC / Documentation":  ["KYC Update", "Document Submission", "FATCA Declaration", "Risk Profile Change", "CKYC Linking"],
  "Payment / Funds":      ["Fund Not Credited", "Payout Delay", "Cheque Return", "Bank Mandate Update", "UPI Issues"],
  "Demat / Holdings":     ["Holding Mismatch", "DP Transfer", "Pledge Request", "Dematerialisation", "Rematerialisation"],
  "Compliance":           ["SEBI Grievance", "Exchange Complaint", "SCORES Filing", "Regulatory Query", "Audit Query"],
  "AIF":                  ["Capital Call", "Distribution Query", "NAV Discrepancy", "Investor Statement", "AIF Onboarding"],
  "IB Advisory":          ["Deal Query", "Mandate Letter", "Valuation Request", "Due Diligence", "Pitch Deck Request"],
  "Technical Support":    ["Login Issue", "App Crash", "Report Error", "API Issue", "Dashboard Bug"],
  "General Enquiry":      ["Product Information", "Fee Structure", "Research Report", "Advisory Query", "Other"],
};
const SR_STATUSES   = ["Open", "In Progress", "Escalated", "Resolved", "Closed", "Reopened"];
const SR_PRIORITIES = ["Critical", "High", "Medium", "Low"];
const SR_CHANNELS   = ["Email", "Phone", "Chat", "Portal", "WhatsApp", "Branch", "SCORES"];
const SR_PAGE_SIZE  = 20;

// ─── SLA helpers ───────────────────────────────────────────────────────────────
function slaInfo(deadline: string | null, status: string) {
  if (!deadline || status === "Closed" || status === "Resolved") {
    return { text: "—", color: "text-gray-400", bg: "bg-gray-400/10", urgent: false, pct: 100 };
  }
  const now   = Date.now();
  const end   = new Date(deadline).getTime();
  const diff  = end - now;
  const hrs   = Math.abs(diff) / 3600000;

  if (diff < 0) {
    let breachText: string;
    if (hrs >= 24) {
      const days = Math.floor(hrs / 24);
      const remH = Math.floor(hrs % 24);
      breachText = remH > 0 ? `Breached ${days}d ${remH}h ago` : `Breached ${days}d ago`;
    } else {
      const h = Math.floor(hrs), m = Math.round((hrs - h) * 60);
      breachText = `Breached ${h}h ${m}m ago`;
    }
    return { text: breachText, color: "text-red-500", bg: "bg-red-500/10", urgent: true, pct: 0 };
  }
  const h = Math.floor(hrs), m = Math.round((hrs - Math.floor(hrs)) * 60);
  if (hrs < 1)   return { text: `${m}m left`, color: "text-red-400", bg: "bg-red-400/10", urgent: true, pct: 5 };
  if (hrs < 4)   return { text: `${h}h ${m}m left`, color: "text-amber-400", bg: "bg-amber-400/10", urgent: false, pct: 30 };
  if (hrs < 12)  return { text: `${h}h ${m}m left`, color: "text-amber-300", bg: "bg-amber-300/10", urgent: false, pct: 60 };
  if (hrs < 24)  return { text: `${h}h ${m}m left`, color: "text-emerald-400", bg: "bg-emerald-400/10", urgent: false, pct: 90 };
  const days = Math.floor(hrs / 24), remH = Math.floor(hrs % 24);
  return { text: remH > 0 ? `${days}d ${remH}h left` : `${days}d left`, color: "text-emerald-400", bg: "bg-emerald-400/10", urgent: false, pct: 95 };
}
function statusBadge(s: string) {
  const map: Record<string, string> = {
    "Open":        "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "In Progress": "bg-violet-500/15 text-violet-400 border-violet-500/30",
    "Escalated":   "bg-red-500/15 text-red-400 border-red-500/30",
    "Resolved":    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "Closed":      "bg-gray-500/15 text-gray-400 border-gray-500/30",
    "Reopened":    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return map[s] || "bg-gray-500/15 text-gray-400 border-gray-500/30";
}
function priorityBadge(p: string) {
  const map: Record<string, string> = {
    "Critical": "bg-red-600/20 text-red-400 border-red-600/40",
    "High":     "bg-orange-500/20 text-orange-400 border-orange-500/40",
    "Medium":   "bg-amber-500/20 text-amber-400 border-amber-500/40",
    "Low":      "bg-slate-500/20 text-slate-400 border-slate-500/40",
  };
  return map[p] || "bg-slate-500/20 text-slate-400 border-slate-500/40";
}
function priorityDot(p: string) {
  return p === "Critical" ? "bg-red-500" : p === "High" ? "bg-orange-500" : p === "Medium" ? "bg-amber-400" : "bg-slate-400";
}
function avatarInitials(name: string) {
  return (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Multi-select filter dropdown ─────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, t }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; t: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${t.inputBg} whitespace-nowrap ${selected.length ? "border-blue-500 text-blue-400" : ""}`}>
        {label}{selected.length > 0 && <span className="bg-blue-600 text-white rounded-full px-1.5 py-0 text-[9px] font-bold">{selected.length}</span>}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className={`absolute z-50 top-full left-0 mt-1 min-w-[180px] ${t.bgCard} border ${t.border} rounded-xl shadow-xl overflow-hidden`}>
          {options.map(opt => (
            <button key={opt} onClick={() => toggle(opt)} className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs ${t.rowHover} ${t.text}`}>
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt) ? "bg-blue-600 border-blue-600" : t.border}`}>
                {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              {opt}
            </button>
          ))}
          {selected.length > 0 && <button onClick={() => onChange([])} className={`w-full text-left px-3 py-1.5 text-[10px] text-red-400 border-t ${t.border}`}>Clear</button>}
        </div>
      )}
    </div>
  );
}

// ─── User search dropdown ──────────────────────────────────────────────────────
function UserDropdown({ value, onChange, t, placeholder = "Select user…" }: { value: string; onChange: (id: string, name: string) => void; t: any; placeholder?: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { fetch(`${API_BASE}/api/users/active`).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => {
    if (value && users.length) { const u = users.find(u => u.id === value); if (u) setSelectedName(u.name); }
  }, [value, users]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative" ref={ref}>
      <div className={`flex items-center border rounded-xl px-3 py-2 ${t.inputBg} cursor-pointer`} onClick={() => setOpen(!open)}>
        <span className={`text-xs flex-1 ${selectedName ? t.text : t.textMuted}`}>{selectedName || placeholder}</span>
        <ChevronDown className={`w-3 h-3 ${t.textMuted}`} />
      </div>
      {open && (
        <div className={`absolute z-50 top-full left-0 right-0 mt-1 ${t.bgCard} border ${t.border} rounded-xl shadow-xl max-h-52 overflow-hidden`}>
          <div className={`p-2 border-b ${t.border}`}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className={`w-full text-xs px-2 py-1.5 rounded-lg border ${t.inputBg} outline-none`} />
          </div>
          <div className="overflow-y-auto max-h-40">
            {filtered.map(u => (
              <button key={u.id} onClick={() => { onChange(u.id, u.name); setSelectedName(u.name); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 text-xs ${t.rowHover} ${u.id === value ? "bg-blue-600/10 text-blue-400" : t.text} flex items-center gap-2`}>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">{avatarInitials(u.name)}</div>
                <div><div className="font-medium truncate">{u.name}</div><div className={`text-[9px] ${t.textMuted}`}>{u.role}</div></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stats Banner ──────────────────────────────────────────────────────────────
function SrStatsBanner({ stats, loading, t, onFilter }: { stats: any; loading: boolean; t: any; onFilter: (key: string, val: string) => void }) {
  const cards = [
    { label: "Open",           val: stats?.open || 0,           icon: AlertCircle,    color: "text-blue-400",    bg: "bg-blue-500/10",     border: "border-blue-500/20",    filterKey: "status", filterVal: "Open" },
    { label: "In Progress",    val: stats?.in_progress || 0,    icon: Activity,       color: "text-violet-400",  bg: "bg-violet-500/10",   border: "border-violet-500/20",  filterKey: "status", filterVal: "In Progress" },
    { label: "Escalated",      val: stats?.escalated || 0,      icon: ArrowUpRight,   color: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/20",     filterKey: "status", filterVal: "Escalated" },
    { label: "SLA Breached",   val: stats?.breached || 0,       icon: AlertTriangle,  color: "text-red-500",     bg: "bg-red-600/10",      border: "border-red-600/20",     filterKey: "sla_status", filterVal: "breached" },
    { label: "Resolved Today", val: stats?.resolved_today || 0, icon: CheckCircle2,   color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/20", filterKey: "status", filterVal: "Resolved" },
  ];
  return (
    <div className="grid grid-cols-5 gap-3 flex-shrink-0">
      {cards.map(c => (
        <button key={c.label} onClick={() => onFilter(c.filterKey, c.filterVal)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.bg} ${c.border} hover:opacity-80 transition-all text-left`}>
          <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <div>
            <div className={`text-lg font-bold ${c.color} leading-none`}>{loading ? "—" : c.val}</div>
            <div className={`text-[10px] ${t.textMuted} mt-0.5`}>{c.label}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Create SR Modal ───────────────────────────────────────────────────────────
function CreateSrModal({ t, isDark, loggedUser, onClose, onCreated }: { t: any; isDark: boolean; loggedUser: any; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    subject: "", description: "", category: Object.keys(SR_CATEGORIES)[0], subcategory: "",
    channel: "Portal", priority: "Medium", vertical: "", client_id: "", assigned_to: "",
  });
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDD, setShowClientDD] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [slaPreview, setSlaPreview] = useState<string | null>(null);
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [assignedName, setAssignedName] = useState("");
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [allSlaConfig, setAllSlaConfig] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/clients?limit=500`).then(r => r.json()).then(d => setClients(Array.isArray(d.data) ? d.data : [])).catch(() => {});
    fetch(`${API_BASE}/api/sla-config`).then(r => r.json()).then(d => setAllSlaConfig(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const arr = allSlaConfig;
    // prefer subcategory match, fall back to category-level
    let sla = form.subcategory ? arr.find((s: any) => s.category === form.category && s.subcategory === form.subcategory) : null;
    if (!sla) sla = arr.find((s: any) => s.category === form.category && !s.subcategory);
    if (sla) {
      const label = form.subcategory ? `${form.category} › ${form.subcategory}` : form.category;
      setSlaPreview(`SLA for "${label}": ${sla.tat_hours}h TAT · L1: ${sla.l1_owner}`);
    } else {
      setSlaPreview(null);
    }
  }, [form.category, form.subcategory, allSlaConfig]);

  const filteredClients = clients.filter(c => !clientSearch || c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.client_code?.toLowerCase().includes(clientSearch.toLowerCase()));

  const uploadAttachments = async (srId: string) => {
    for (const file of attachFiles) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file);
        });
        await fetch(`${API_BASE}/api/documents/upload`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, type: "Attachment", client_id: form.client_id || null, sr_id: srId, vertical: form.vertical, fileData: base64, fileName: file.name, created_by: loggedUser?.id }),
        });
      } catch {}
    }
  };

  const doSubmit = async () => {
    if (!form.subject.trim()) return;
    setSaving(true);
    setShowCreateConfirm(false);
    try {
      const r = await fetch(`${API_BASE}/api/service-requests`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, created_by: loggedUser?.id }),
      });
      if (r.ok) {
        const created = await r.json();
        if (attachFiles.length && created.id) await uploadAttachments(created.id);
        onCreated(); onClose();
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b ${t.border} flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-blue-400" /></div>
            <span className={`text-sm font-bold ${t.text}`}>New Service Request</span>
          </div>
          <button onClick={onClose} className={`${t.textMuted} hover:text-red-400 transition-colors`}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Subject *</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none`} placeholder="Brief one-line summary of the issue" />
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} resize-none outline-none`} placeholder="Provide full details of the request or issue…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, subcategory: "" }))} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none`}>
                {Object.keys(SR_CATEGORIES).map(c => <option key={c}>{c}</option>)}
              </select>
              {slaPreview && <div className="text-[9px] text-blue-400 mt-0.5 px-1">{slaPreview}</div>}
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Subcategory</label>
              <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none`}>
                <option value="">— select —</option>
                {(SR_CATEGORIES[form.category] || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Channel</label>
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none`}>
                {SR_CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none`}>
                {SR_PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Client</label>
            <div className={`flex items-center border rounded-xl px-3 py-2.5 ${t.inputBg} cursor-pointer`} onClick={() => setShowClientDD(!showClientDD)}>
              {selectedClient ? (
                <span className={`text-xs flex-1 ${t.text}`}><span className="text-blue-400 font-mono mr-1">{selectedClient.client_code}</span>{selectedClient.name}</span>
              ) : (
                <span className={`text-xs flex-1 ${t.textMuted}`}>Search client by name, code, PAN…</span>
              )}
              <ChevronDown className={`w-3 h-3 ${t.textMuted}`} />
            </div>
            {showClientDD && (
              <div className={`absolute z-50 top-full left-0 right-0 mt-1 ${t.bgCard} border ${t.border} rounded-xl shadow-xl`}>
                <div className={`p-2 border-b ${t.border}`}>
                  <input autoFocus value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search…" className={`w-full text-xs px-2 py-1.5 rounded-lg border ${t.inputBg} outline-none`} />
                </div>
                <div className="overflow-y-auto max-h-36">
                  {filteredClients.slice(0, 30).map(c => (
                    <button key={c.id} onClick={() => { setForm(f => ({ ...f, client_id: c.id })); setSelectedClient(c); setShowClientDD(false); setClientSearch(""); }}
                      className={`w-full text-left px-3 py-2 text-xs ${t.rowHover} ${t.text} flex items-center gap-2`}>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-emerald-500 flex items-center justify-center text-[9px] font-bold text-white">{avatarInitials(c.name)}</div>
                      <div><div className="font-medium">{c.name}</div><div className={`text-[9px] ${t.textMuted}`}>{c.client_code} · {c.pan || "—"}</div></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Assign To</label>
            <UserDropdown value={form.assigned_to} onChange={(id, name) => { setForm(f => ({ ...f, assigned_to: id })); setAssignedName(name); }} t={t} />
          </div>
          <div>
            <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Attachments</label>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => setAttachFiles(Array.from(e.target.files || []))} />
            <button onClick={() => fileRef.current?.click()} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-dashed ${t.border} ${t.textMuted} hover:border-blue-500 hover:text-blue-400 transition-all`}>
              <Paperclip className="w-3.5 h-3.5" /> {attachFiles.length ? `${attachFiles.length} file(s) selected` : "Attach files"}
            </button>
            {attachFiles.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {attachFiles.map((f, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[10px] ${t.textMuted}`}>
                    <FileText className="w-3 h-3" />{f.name}
                    <button onClick={() => setAttachFiles(a => a.filter((_, j) => j !== i))} className="text-red-400 ml-auto"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`px-5 py-4 border-t ${t.border} flex justify-end gap-2 flex-shrink-0`}>
          <button onClick={onClose} className={`text-xs px-4 py-2 rounded-xl border ${t.border} ${t.textMuted} hover:opacity-80`}>Cancel</button>
          <button onClick={() => setShowCreateConfirm(true)} disabled={saving || !form.subject.trim()} className="text-xs px-5 py-2 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-40 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create SR
          </button>
        </div>
      </div>
      {/* Confirmation dialog */}
      {showCreateConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowCreateConfirm(false)}>
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-sm p-5 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`text-sm font-bold ${t.text} mb-3`}>Confirm New Service Request</div>
            <div className={`text-xs ${t.textMuted} space-y-1 mb-4`}>
              <div>• Subject: <span className={t.text}>{form.subject}</span></div>
              <div>• Category: <span className={t.text}>{form.category}{form.subcategory ? ` › ${form.subcategory}` : ""}</span></div>
              <div>• Priority: <span className={t.text}>{form.priority}</span></div>
              {selectedClient && <div>• Client: <span className={t.text}>{selectedClient.name}</span></div>}
              {slaPreview && <div className="text-blue-400 pt-1">{slaPreview}</div>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateConfirm(false)} className={`text-xs px-4 py-2 rounded-xl border ${t.border} ${t.textMuted}`}>Back</button>
              <button onClick={doSubmit} disabled={saving} className="text-xs px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SR Detail Panel ───────────────────────────────────────────────────────────
function SrDetailPanel({ sr: initialSr, t, isDark, onClose, onUpdate, loggedUser }: { sr: any; t: any; isDark: boolean; onClose: () => void; onUpdate: (sr: any) => void; loggedUser?: any }) {
  const [sr, setSr] = useState<any>(initialSr);
  const [tab, setTab] = useState<"overview" | "conversation" | "documents" | "trail">("overview");
  const [messages, setMessages] = useState<any[]>([]);
  const [trail, setTrail] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [resolutionNote, setResolutionNote] = useState(sr.resolution_notes || "");
  const [assignedId, setAssignedId] = useState(sr.assigned_to || "");
  const [assignedName, setAssignedName] = useState(sr.assigned_to_name || "");
  // staged edits — nothing saved until Submit is clicked
  const [draftPriority, setDraftPriority] = useState(sr.priority || "Medium");
  const [draftStatus, setDraftStatus] = useState(sr.status || "Open");
  const [draftAssignedId, setDraftAssignedId] = useState(sr.assigned_to || "");
  const [draftAssignedName, setDraftAssignedName] = useState(sr.assigned_to_name || "");
  const [draftResolution, setDraftResolution] = useState(sr.resolution_notes || "");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const hasEditChanges =
    draftPriority !== (sr.priority || "Medium") ||
    draftStatus !== (sr.status || "Open") ||
    draftAssignedId !== (sr.assigned_to || "") ||
    draftResolution !== (sr.resolution_notes || "");
  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDetail = useCallback(async () => {
    try {
      const d = await fetch(`${API_BASE}/api/service-requests/${sr.id}`).then(r => r.json());
      setSr(d);
      setMessages(d.messages || []);
      setTrail(d.auditLog || []);
      setDocs(d.documents || []);
    } catch {}
  }, [sr.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { if (tab === "conversation") msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, tab]);

  const patch = async (body: any) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/service-requests/${sr.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, updated_by: loggedUser?.name || "Agent" }),
      });
      if (r.ok) { const updated = await r.json(); setSr(updated); onUpdate(updated); }
    } finally { setSaving(false); }
  };

  const doAction = async (action: "escalate" | "reopen", extra: any = {}) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/service-requests/${sr.id}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extra, [`${action}d_by`]: loggedUser?.name || "Agent" }),
      });
      if (r.ok) { await loadDetail(); onUpdate({ ...sr, status: action === "escalate" ? "Escalated" : "Reopened" }); }
    } finally { setSaving(false); }
  };

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    try {
      const r = await fetch(`${API_BASE}/api/service-requests/${sr.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender_id: loggedUser?.id, sender_name: loggedUser?.name || "Agent", from_type: "agent", message: newMsg.trim() }),
      });
      if (r.ok) { setNewMsg(""); await loadDetail(); }
    } finally { setSendingMsg(false); }
  };

  const uploadDoc = async (file: File) => {
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader(); reader.onload = () => res((reader.result as string).split(",")[1]); reader.onerror = rej; reader.readAsDataURL(file);
      });
      await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: "Attachment", client_id: sr.client_id, sr_id: sr.id, vertical: sr.vertical, fileData: base64, fileName: file.name, created_by: loggedUser?.id }),
      });
      await loadDetail();
    } catch {}
  };

  const sla = slaInfo(sr.sla_deadline, sr.status);
  const isClosed = sr.status === "Closed" || sr.status === "Resolved";
  const tabs = [
    { key: "overview",      label: "Overview",      icon: Info },
    { key: "conversation",  label: "Conversation",  icon: MessageSquare, badge: messages.length },
    { key: "documents",     label: "Documents",     icon: Paperclip, badge: docs.length },
    { key: "trail",         label: "Activity Trail",icon: History, badge: trail.length },
  ] as const;

  return (
    <div className={`flex flex-col h-full ${t.bgCard} border-l ${t.border} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b ${t.border} flex-shrink-0`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-bold font-mono ${t.textMuted}`}>{sr.sr_code}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadge(sr.status)}`}>{sr.status}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityBadge(sr.priority)}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityDot(sr.priority)}`} />{sr.priority}
              </span>
            </div>
            <div className={`text-sm font-semibold ${t.text} leading-snug`}>{sr.subject}</div>
            {sr.client_name && (
              <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${t.textMuted}`}>
                <User className="w-3 h-3" /> <span className="text-blue-400 font-mono">{sr.client_code}</span> · {sr.client_name}
              </div>
            )}
          </div>
          <button onClick={onClose} className={`${t.textMuted} hover:text-red-400 transition-colors flex-shrink-0`}><X className="w-4 h-4" /></button>
        </div>

        {/* SLA bar */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${sla.bg} border border-transparent mb-3`}>
          <Clock className={`w-3.5 h-3.5 ${sla.color} flex-shrink-0`} />
          <span className={`text-xs font-medium ${sla.color}`}>
            {sr.sla_deadline ? `SLA deadline: ${fmtTs(sr.sla_deadline)} · ` : ""}
            {sla.text}
          </span>
          <div className="flex-1 h-1 rounded-full bg-gray-700 ml-auto max-w-[80px]">
            <div className={`h-1 rounded-full ${sla.urgent ? "bg-red-500" : sla.pct < 40 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${sla.pct}%` }} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {!isClosed && sr.status !== "Escalated" && (
            <button onClick={() => doAction("escalate", { reason: "Escalated by agent" })} disabled={saving}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-600/30 text-red-400 hover:bg-red-600/25 transition-all">
              <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
            </button>
          )}
          {!isClosed && sr.status !== "Resolved" && (
            <button onClick={() => { patch({ status: "Resolved", resolution_notes: resolutionNote || "Resolved by agent" }); }} disabled={saving}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/25 transition-all">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
            </button>
          )}
          {sr.status === "Resolved" && (
            <button onClick={() => patch({ status: "Closed" })} disabled={saving}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl bg-gray-600/15 border border-gray-600/30 text-gray-400 hover:bg-gray-600/25 transition-all">
              <XCircle className="w-3.5 h-3.5" /> Close
            </button>
          )}
          {(sr.status === "Resolved" || sr.status === "Closed") && (
            <button onClick={() => doAction("reopen", { reason: "Reopened by agent" })} disabled={saving}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl bg-amber-600/15 border border-amber-600/30 text-amber-400 hover:bg-amber-600/25 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Reopen
            </button>
          )}
          {!isClosed && (
            <button onClick={() => patch({ status: "In Progress" })} disabled={saving || sr.status === "In Progress"}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl bg-violet-600/15 border border-violet-600/30 text-violet-400 hover:bg-violet-600/25 transition-all disabled:opacity-30">
              <Activity className="w-3.5 h-3.5" /> In Progress
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${t.border} flex-shrink-0 px-3`}>
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-all ${tab === tb.key ? "border-blue-500 text-blue-400" : `border-transparent ${t.textMuted} hover:${t.text}`}`}>
            <tb.icon className="w-3.5 h-3.5" />
            {tb.label}
            {(tb as any).badge > 0 && <span className={`text-[9px] px-1.5 py-0 rounded-full ${tab === tb.key ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300"}`}>{(tb as any).badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className={`rounded-xl border ${t.border} overflow-hidden`}>
              <div className={`px-4 py-2.5 text-[10px] font-bold uppercase ${t.textMuted} ${t.bgCard2} tracking-wider`}>Request Details</div>
              <div className="divide-y divide-gray-800/30">
                {[
                  { label: "Category",    val: `${sr.category}${sr.subcategory ? " › " + sr.subcategory : ""}`, field: null },
                  { label: "Channel",     val: sr.channel,   field: null },
                  { label: "Vertical",    val: sr.vertical || "—", field: null },
                  { label: "Created By",  val: sr.created_by_name || "—", field: null },
                  { label: "Created At",  val: fmtTs(sr.created_at), field: null },
                  { label: "Updated At",  val: fmtTs(sr.updated_at), field: null },
                  { label: "Resolved At", val: sr.resolved_at ? fmtTs(sr.resolved_at) : "—", field: null },
                ].map(row => (
                  <div key={row.label} className="flex items-center px-4 py-2.5 gap-3">
                    <span className={`text-[11px] ${t.textMuted} w-28 flex-shrink-0`}>{row.label}</span>
                    <span className={`text-[11px] ${t.text} flex-1`}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Editable fields */}
            <div className={`rounded-xl border ${t.border} overflow-hidden`}>
              <div className={`px-4 py-2.5 text-[10px] font-bold uppercase ${t.textMuted} ${t.bgCard2} tracking-wider flex items-center gap-2`}>
                Editable Fields
                {hasEditChanges && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">Unsaved changes</span>}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>Priority</label>
                  <select value={draftPriority} onChange={e => setDraftPriority(e.target.value)} disabled={isClosed}
                    className={`text-xs rounded-xl border px-3 py-2 ${t.inputBg} outline-none disabled:opacity-50 ${draftPriority !== (sr.priority || "Medium") ? "border-amber-500/60" : ""}`}>
                    {SR_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>Status</label>
                  <select value={draftStatus} onChange={e => setDraftStatus(e.target.value)} disabled={isClosed}
                    className={`text-xs rounded-xl border px-3 py-2 ${t.inputBg} outline-none disabled:opacity-50 ${draftStatus !== (sr.status || "Open") ? "border-amber-500/60" : ""}`}>
                    {SR_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>Assigned To</label>
                  <UserDropdown value={draftAssignedId} onChange={(id, name) => { setDraftAssignedId(id); setDraftAssignedName(name); }} t={t} placeholder={sr.assigned_to_name || "Select agent…"} />
                </div>
                <div>
                  <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>Resolution Notes</label>
                  <textarea value={draftResolution} onChange={e => setDraftResolution(e.target.value)} rows={3}
                    className={`w-full text-xs rounded-xl border px-3 py-2 ${t.inputBg} resize-none outline-none ${draftResolution !== (sr.resolution_notes || "") ? "border-amber-500/60" : ""}`}
                    placeholder="Add resolution notes…" />
                </div>
                {/* Submit button */}
                <div className="pt-1">
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={!hasEditChanges || isClosed || saving}
                    className="w-full text-xs py-2.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Submit Changes
                  </button>
                </div>
              </div>
            </div>
            {/* Submit confirmation dialog */}
            {showSubmitConfirm && (
              <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSubmitConfirm(false)}>
                <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-sm p-5 shadow-2xl`} onClick={e => e.stopPropagation()}>
                  <div className={`text-sm font-bold ${t.text} mb-2`}>Confirm Changes</div>
                  <div className={`text-xs ${t.textMuted} mb-4 space-y-1`}>
                    {draftPriority !== (sr.priority || "Medium") && <div>• Priority: <span className="text-amber-400">{sr.priority} → {draftPriority}</span></div>}
                    {draftStatus !== (sr.status || "Open") && <div>• Status: <span className="text-amber-400">{sr.status} → {draftStatus}</span></div>}
                    {draftAssignedId !== (sr.assigned_to || "") && <div>• Assigned To: <span className="text-amber-400">{draftAssignedName || "—"}</span></div>}
                    {draftResolution !== (sr.resolution_notes || "") && <div>• Resolution Notes updated</div>}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowSubmitConfirm(false)} className={`text-xs px-4 py-2 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
                    <button onClick={async () => {
                      setShowSubmitConfirm(false);
                      const body: any = {};
                      if (draftPriority !== (sr.priority || "Medium")) body.priority = draftPriority;
                      if (draftStatus !== (sr.status || "Open")) body.status = draftStatus;
                      if (draftAssignedId !== (sr.assigned_to || "")) body.assigned_to = draftAssignedId;
                      if (draftResolution !== (sr.resolution_notes || "")) body.resolution_notes = draftResolution;
                      await patch(body);
                      setDraftPriority(draftPriority); setDraftStatus(draftStatus);
                    }} className="text-xs px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />Confirm & Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className={`rounded-xl border ${t.border} overflow-hidden`}>
              <div className={`px-4 py-2.5 text-[10px] font-bold uppercase ${t.textMuted} ${t.bgCard2} tracking-wider`}>Description</div>
              <div className={`px-4 py-3 text-xs ${t.text} whitespace-pre-wrap`}>{sr.description || <span className={t.textMuted}>No description provided.</span>}</div>
            </div>

            {/* Client info */}
            {sr.client_name && (
              <div className={`rounded-xl border ${t.border} overflow-hidden`}>
                <div className={`px-4 py-2.5 text-[10px] font-bold uppercase ${t.textMuted} ${t.bgCard2} tracking-wider`}>Client</div>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{avatarInitials(sr.client_name)}</div>
                  <div>
                    <div className={`text-sm font-semibold ${t.text}`}>{sr.client_name}</div>
                    <div className={`text-[10px] ${t.textMuted}`}>{sr.client_code}{sr.client_email ? " · " + maskValue(sr.client_email) : ""}{sr.client_mobile ? " · " + maskValue(sr.client_mobile) : ""}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONVERSATION TAB */}
        {tab === "conversation" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className={`text-center py-10 ${t.textMuted} text-xs`}><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />No messages yet</div>
              )}
              {messages.map((m, i) => {
                const isAgent = m.from_type === "agent";
                const isSystem = m.from_type === "system";
                return (
                  <div key={i} className={`flex gap-3 ${isAgent ? "flex-row-reverse" : ""}`}>
                    {!isSystem && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${isAgent ? "bg-gradient-to-br from-blue-500 to-violet-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                        {avatarInitials(m.sender_name || "?")}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isSystem ? "mx-auto" : ""}`}>
                      {!isSystem && (
                        <div className={`flex items-center gap-2 mb-0.5 ${isAgent ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[10px] font-semibold ${t.text}`}>{m.sender_name || "Unknown"}</span>
                          <span className={`text-[9px] ${t.textMuted}`}>{fmtTs(m.created_at)}</span>
                        </div>
                      )}
                      <div className={`text-xs px-3 py-2 rounded-2xl ${isSystem ? `text-center ${t.textMuted} italic text-[10px]` : isAgent ? "bg-blue-600 text-white rounded-tr-sm" : `${t.bgCard2} ${t.text} rounded-tl-sm border ${t.border}`}`}>
                        {m.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />
            </div>
            {!isClosed && (
              <div className={`mt-4 border-t ${t.border} pt-3 flex-shrink-0`}>
                <div className="flex gap-2">
                  <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} rows={2} placeholder="Type a reply…"
                    className={`flex-1 text-xs rounded-xl border px-3 py-2 ${t.inputBg} resize-none outline-none`}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendMessage(); }} />
                  <button onClick={sendMessage} disabled={!newMsg.trim() || sendingMsg}
                    className="self-end p-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors">
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <div className={`text-[9px] ${t.textMuted} mt-1`}>Ctrl+Enter to send</div>
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {tab === "documents" && (
          <div className="space-y-3">
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => Array.from(e.target.files || []).forEach(uploadDoc)} />
            <div className="flex justify-between items-center">
              <span className={`text-xs ${t.textMuted}`}>{docs.length} attachment{docs.length !== 1 ? "s" : ""}</span>
              {!isClosed && (
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-600/30 text-blue-400 hover:bg-blue-600/25 transition-all">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              )}
            </div>
            {docs.length === 0 ? (
              <div className={`text-center py-10 ${t.textMuted} text-xs`}><Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />No documents attached</div>
            ) : (
              docs.map(doc => (
                <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${t.border} ${t.bgCard2}`}>
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-blue-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${t.text} truncate`}>{doc.name}</div>
                    <div className={`text-[10px] ${t.textMuted}`}>{doc.type} · {doc.uploaded_by_name || "Unknown"} · {fmtDate(doc.created_at)}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge(doc.status || "Active")}`}>{doc.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ACTIVITY TRAIL TAB */}
        {tab === "trail" && (
          <div className="space-y-3">
            {trail.length === 0 && messages.length === 0 ? (
              <div className={`text-center py-10 ${t.textMuted} text-xs`}><History className="w-8 h-8 mx-auto mb-2 opacity-30" />No activity yet</div>
            ) : (
              [...trail.map(a => ({ _type: "audit", ...a })), ...messages.map(m => ({ _type: "msg", ...m }))]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${item._type === "audit" ? "bg-blue-600/20 text-blue-400" : "bg-violet-600/20 text-violet-400"}`}>
                      {item._type === "audit" ? <Activity className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${t.text}`}>{item.user_name || item.sender_name || "System"}</span>
                        {item._type === "audit" && item.action && <span className={`text-[10px] px-1.5 py-0 rounded border ${statusBadge(item.action)}`}>{item.action}</span>}
                        <span className={`text-[9px] ${t.textMuted} ml-auto`}>{fmtTs(item.created_at)}</span>
                      </div>
                      <div className={`text-xs ${t.textMuted} mt-0.5`}>{item._type === "audit" ? item.details : item.message}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Service Request Module ───────────────────────────────────────────────
export function ServiceRequestModule({ t, isDark, loggedUser }: { t: any; isDark: boolean; loggedUser?: any }) {
  const [srs, setSrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [verticalFilter, setVerticalFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);
  const [mySrsOnly, setMySrsOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSr, setSelectedSr] = useState<any>(null);
  const totalPages = Math.ceil(totalCount / SR_PAGE_SIZE);

  const SR_SORT_OPTIONS = [
    { value: "created_at_desc",  label: "Newest First" },
    { value: "updated_at_desc",  label: "Recently Modified" },
    { value: "priority_asc",     label: "Priority (Critical First)" },
    { value: "sla_deadline_asc", label: "SLA Deadline (Soonest)" },
    { value: "subject_asc",      label: "Subject A–Z" },
  ];

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/service-requests/stats`);
      setStats(await r.json());
    } finally { setStatsLoading(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(SR_PAGE_SIZE) });
      if (search)                            params.set("search",     search);
      if (statusFilter.length === 1)         params.set("status",     statusFilter[0]);
      else if (statusFilter.length > 1)      params.set("status",     statusFilter.join(","));
      if (priorityFilter.length === 1)       params.set("priority",   priorityFilter[0]);
      else if (priorityFilter.length > 1)    params.set("priority",   priorityFilter.join(","));
      if (categoryFilter.length === 1)       params.set("category",   categoryFilter[0]);
      else if (categoryFilter.length > 1)    params.set("category",   categoryFilter.join(","));
      if (verticalFilter.length === 1)       params.set("vertical",   verticalFilter[0]);
      else if (verticalFilter.length > 1)    params.set("vertical",   verticalFilter.join(","));
      if (channelFilter.length === 1)        params.set("channel",    channelFilter[0]);
      else if (channelFilter.length > 1)     params.set("channel",    channelFilter.join(","));
      if (mySrsOnly && loggedUser?.id)       { params.set("assigned_to_me", "1"); params.set("user_id", loggedUser.id); }
      if (dateFrom)                          params.set("date_from",  dateFrom);
      if (dateTo)                            params.set("date_to",    dateTo);
      params.set("sort_by", sortBy);
      const r = await fetch(`${API_BASE}/api/service-requests?${params}`);
      const d = await r.json();
      setSrs(Array.isArray(d.data) ? d.data : []);
      setTotalCount(d.total || 0);
    } finally { setLoading(false); }
  }, [page, search, statusFilter, priorityFilter, categoryFilter, verticalFilter, channelFilter, mySrsOnly, loggedUser, dateFrom, dateTo, sortBy]);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  const onUpdate = (updated: any) => {
    setSrs(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    if (selectedSr?.id === updated.id) setSelectedSr((prev: any) => ({ ...prev, ...updated }));
    loadStats();
  };

  const handleStatFilter = (key: string, val: string) => {
    if (key === "status")     setStatusFilter([val]);
    if (key === "sla_status") {/* TODO: add sla filter */}
    setPage(1);
  };

  const hasFilters = statusFilter.length || priorityFilter.length || categoryFilter.length || verticalFilter.length || channelFilter.length || mySrsOnly || dateFrom || dateTo || search;
  const clearFilters = () => { setStatusFilter([]); setPriorityFilter([]); setCategoryFilter([]); setVerticalFilter([]); setChannelFilter([]); setMySrsOnly(false); setDateFrom(""); setDateTo(""); setSearch(""); setSortBy("created_at_desc"); setPage(1); };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (statusFilter[0])   params.set("status",   statusFilter[0]);
    if (priorityFilter[0]) params.set("priority", priorityFilter[0]);
    if (categoryFilter[0]) params.set("category", categoryFilter[0]);
    if (search)            params.set("search",   search);
    window.open(`${API_BASE}/api/service-requests/export.csv?${params}`, "_blank");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — list */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${selectedSr ? "max-w-[55%]" : ""}`}>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className={`text-lg font-bold ${t.text}`}>Service Requests</h1>
              <p className={`text-xs ${t.textMuted}`}>{totalCount.toLocaleString("en-IN")} total · {SR_SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Newest First"}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${t.border} ${t.textMuted} hover:text-blue-400 hover:border-blue-500/50 transition-all`}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button onClick={() => { load(); loadStats(); }} className={`p-2 rounded-xl border ${t.border} ${t.textMuted} hover:text-blue-400 transition-all`}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all">
                <Plus className="w-3.5 h-3.5" /> New SR
              </button>
            </div>
          </div>

          {/* Stats banner */}
          <SrStatsBanner stats={stats} loading={statsLoading} t={t} onFilter={handleStatFilter} />

          {/* Filter bar */}
          <div className={`flex items-center gap-2 flex-wrap p-3 rounded-xl border ${t.border} ${t.bgCard2}`}>
            <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 text-xs flex-1 min-w-[160px] ${t.inputBg}`}>
              <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search SR code, subject, client…"
                className="flex-1 bg-transparent outline-none text-xs" />
              {search && <button onClick={() => { setSearch(""); setPage(1); }} className={t.textMuted}><X className="w-3 h-3" /></button>}
            </div>
            <MultiSelect label="Status"   options={SR_STATUSES}               selected={statusFilter}   onChange={v => { setStatusFilter(v);   setPage(1); }} t={t} />
            <MultiSelect label="Priority" options={SR_PRIORITIES}             selected={priorityFilter} onChange={v => { setPriorityFilter(v); setPage(1); }} t={t} />
            <MultiSelect label="Category" options={Object.keys(SR_CATEGORIES)} selected={categoryFilter} onChange={v => { setCategoryFilter(v); setPage(1); }} t={t} />
            <MultiSelect label="Channel"  options={SR_CHANNELS}               selected={channelFilter}  onChange={v => { setChannelFilter(v);  setPage(1); }} t={t} />
            <button onClick={() => setMySrsOnly(!mySrsOnly)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all ${mySrsOnly ? "bg-blue-600 text-white border-blue-600" : `${t.border} ${t.textMuted}`}`}>
              <User className="w-3.5 h-3.5" /> My SRs
            </button>
            <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${t.inputBg}`}>
              <ArrowUpDown className={`w-3.5 h-3.5 ${t.textMuted} flex-shrink-0`} />
              <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className={`text-xs bg-transparent outline-none ${t.text}`}>
                {SR_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={`text-xs rounded-xl border px-2 py-1.5 ${t.inputBg} outline-none`} title="From date" />
              <span className={`text-[10px] ${t.textMuted}`}>to</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={`text-xs rounded-xl border px-2 py-1.5 ${t.inputBg} outline-none`} title="To date" />
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 px-2 py-1.5 rounded-xl border border-red-500/30">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className={`w-6 h-6 animate-spin ${t.textMuted}`} /></div>
          ) : srs.length === 0 ? (
            <div className={`text-center py-16 ${t.textMuted}`}>
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No service requests found</p>
              {hasFilters && <button onClick={clearFilters} className="mt-2 text-xs text-blue-400 underline">Clear filters</button>}
            </div>
          ) : (
            <div className={`rounded-xl border ${t.border} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className={`${t.tableHead} text-[10px] uppercase font-bold ${t.textMuted} tracking-wider`}>
                      <th className="px-3 py-2.5 text-left w-[90px]">SR Code</th>
                      <th className="px-3 py-2.5 text-left">Subject</th>
                      <th className="px-3 py-2.5 text-left w-[120px]">Client</th>
                      <th className="px-3 py-2.5 text-left w-[80px]">Priority</th>
                      <th className="px-3 py-2.5 text-left w-[100px]">Status</th>
                      <th className="px-3 py-2.5 text-left w-[120px]">SLA</th>
                      <th className="px-3 py-2.5 text-left w-[100px]">Assigned To</th>
                      <th className="px-3 py-2.5 text-left w-[90px]">Created</th>
                      <th className="px-3 py-2.5 w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/20">
                    {srs.map(sr => {
                      const sla = slaInfo(sr.sla_deadline, sr.status);
                      const isSelected = selectedSr?.id === sr.id;
                      return (
                        <tr key={sr.id} onClick={() => setSelectedSr(isSelected ? null : sr)}
                          className={`${t.rowHover} cursor-pointer transition-all ${isSelected ? "bg-blue-600/10 border-l-2 border-l-blue-500" : ""}`}>
                          <td className="px-3 py-2.5">
                            <span className={`text-[11px] font-mono font-bold ${t.codeBlue || "text-blue-400"}`}>{sr.sr_code}</span>
                          </td>
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <div className={`text-xs ${t.text} truncate font-medium`}>{sr.subject}</div>
                            <div className={`text-[9px] ${t.textMuted} mt-0.5`}>{sr.category}{sr.subcategory ? " › " + sr.subcategory : ""}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {sr.client_name ? (
                              <div>
                                <div className={`text-[11px] ${t.text} font-medium truncate max-w-[110px]`}>{sr.client_name}</div>
                                <div className={`text-[9px] font-mono ${t.textMuted}`}>{sr.client_code}</div>
                              </div>
                            ) : <span className={`text-[10px] ${t.textMuted}`}>—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityBadge(sr.priority)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${priorityDot(sr.priority)}`} />{sr.priority}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadge(sr.status)}`}>{sr.status}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className={`flex items-center gap-1 text-[10px] font-medium ${sla.color}`}>
                              <Clock className="w-3 h-3 flex-shrink-0" />{sla.text}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className={`text-[10px] ${t.text} truncate max-w-[90px]`}>{sr.assigned_to_name || <span className={`${t.textMuted} italic`}>Unassigned</span>}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className={`text-[10px] ${t.textMuted}`}>{fmtDate(sr.created_at)}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button className={`p-1.5 rounded-lg ${t.bgCard} border ${t.border} ${isSelected ? "text-blue-400" : t.textMuted} hover:text-blue-400 transition-colors`}>
                              <Eye className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-shrink-0">
              <span className={`text-xs ${t.textMuted}`}>Showing {(page - 1) * SR_PAGE_SIZE + 1}–{Math.min(page * SR_PAGE_SIZE, totalCount)} of {totalCount}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted} disabled:opacity-30`}><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1.5 rounded-lg text-xs border ${p === page ? "bg-blue-600 text-white border-blue-600" : `${t.border} ${t.textMuted}`}`}>{p}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted} disabled:opacity-30`}><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — detail */}
      {selectedSr && (
        <div className={`w-[45%] flex-shrink-0 border-l ${t.border} overflow-hidden`}>
          <SrDetailPanel sr={selectedSr} t={t} isDark={isDark} onClose={() => setSelectedSr(null)} onUpdate={onUpdate} loggedUser={loggedUser} />
        </div>
      )}

      {showCreate && <CreateSrModal t={t} isDark={isDark} loggedUser={loggedUser} onClose={() => setShowCreate(false)} onCreated={() => { load(); loadStats(); }} />}
    </div>
  );
}
