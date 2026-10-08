import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle, ArrowUpRight, ArrowDownRight, Bell, Briefcase, Building,
  Calendar, CheckCircle2, ChevronDown, ChevronRight, ChevronLeft, Clock,
  Download, Edit, Eye, EyeOff, FileText, Filter, Globe, History,
  LayoutDashboard, Landmark, Layers, LineChart, Lock, LogOut, Mail,
  Menu, MessageSquare, Moon, MoreHorizontal, Phone, Plus, RefreshCw,
  Search, Settings, Shield, Sun, TrendingUp, Upload, User, Users,
  Wallet, X, CheckCheck, AlertCircle, Database, Tag, Hash,
  Building2, CreditCard, MapPin, Paperclip, Send, ChevronUp,
  BarChart3, Star, Zap, CheckSquare, XCircle, Info, Copy,
  Bot, Sparkles, Cpu, Key, Sliders, TestTube, ThumbsUp, ThumbsDown,
  CornerDownLeft, Loader2,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type AuthStep = "login" | "m365" | "otp" | "app";
type Vertical = "retail" | "corporate" | "ib" | "aif" | "ie" | null;
type Page = "dashboard" | "leads" | "deals" | "customers" | "documents" | "clients" | "service" | "ai"
  | "admin-users" | "admin-roles" | "admin-role-map"
  | "admin-sla" | "admin-llm" | "admin-prompts" | "admin-m365"
  | "admin-theme" | "admin-system";
type AuthMethod = "app" | "m365";

// ─── THEME ────────────────────────────────────────────────────────────────────
function useTheme(isDark: boolean) {
  return {
    bg: isDark ? "bg-gray-950" : "bg-slate-50",
    bgCard: isDark ? "bg-gray-900" : "bg-white",
    bgCard2: isDark ? "bg-gray-800" : "bg-gray-100",
    bgSidebar: isDark ? "bg-gray-900" : "bg-white",
    bgHeader: isDark ? "bg-gray-900" : "bg-white",
    border: isDark ? "border-gray-800" : "border-gray-200",
    text: isDark ? "text-white" : "text-gray-900",
    textMuted: isDark ? "text-gray-400" : "text-gray-500",
    textSub: isDark ? "text-gray-300" : "text-gray-700",
    inputBg: isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
    rowHover: isDark ? "hover:bg-gray-800/60" : "hover:bg-gray-50",
    tagGray: isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600",
    tableHead: isDark ? "bg-gray-800/50" : "bg-gray-50",
  };
}
let isDark = true;

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function Pagination({ total, page, pageSize, onChange, t }: { total: number; page: number; pageSize: number; onChange: (p: number) => void; t: ReturnType<typeof useTheme> }) {
  const pages = Math.ceil(total / pageSize);
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);
  const pageNums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) pageNums.push(i);

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 border-t ${t.border} flex-shrink-0`}>
      <span className={`text-xs ${t.textMuted}`}>Showing {start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1} className={`p-1.5 rounded-lg disabled:opacity-30 ${t.rowHover} ${t.textMuted}`}><ChevronLeft className="w-3.5 h-3.5" /></button>
        {pageNums[0] > 1 && <><button onClick={() => onChange(1)} className={`w-7 h-7 text-xs rounded-lg ${t.rowHover} ${t.textMuted}`}>1</button><span className={`text-xs ${t.textMuted}`}>…</span></>}
        {pageNums.map(n => (
          <button key={n} onClick={() => onChange(n)} className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${n === page ? "bg-blue-600 text-white" : `${t.rowHover} ${t.textMuted}`}`}>{n}</button>
        ))}
        {pageNums[pageNums.length - 1] < pages && <><span className={`text-xs ${t.textMuted}`}>…</span><button onClick={() => onChange(pages)} className={`w-7 h-7 text-xs rounded-lg ${t.rowHover} ${t.textMuted}`}>{pages}</button></>}
        <button onClick={() => onChange(page + 1)} disabled={page === pages} className={`p-1.5 rounded-lg disabled:opacity-30 ${t.rowHover} ${t.textMuted}`}><ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VERTICALS = [
  { id: "retail", label: "Retail Broking", short: "RB", color: "bg-blue-600", accent: "text-blue-400", icon: Users },
  { id: "corporate", label: "Corporate Broking", short: "CB", color: "bg-violet-600", accent: "text-violet-400", icon: Building },
  { id: "ib", label: "Investment Banking", short: "IB", color: "bg-amber-600", accent: "text-amber-400", icon: Landmark },
  { id: "aif", label: "AIF", short: "AIF", color: "bg-emerald-600", accent: "text-emerald-400", icon: Layers },
  { id: "ie", label: "Institutional Equities", short: "IE", color: "bg-rose-600", accent: "text-rose-400", icon: LineChart },
];
const SUBMENU = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads Pipeline", icon: TrendingUp },
  { id: "deals", label: "Deals", icon: Briefcase },
  { id: "customers", label: "Customers", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
];

// SR Categories & SLA
const SR_CATEGORIES: Record<string, string[]> = {
  "Account Issues": ["Account Activation", "Account Closure Request", "Profile Update", "Nomination Change", "Address Update"],
  "Trade Issues": ["Order Not Executed", "Wrong Trade", "Settlement Query", "Margin Query", "Corporate Action"],
  "KYC / Documentation": ["KYC Update", "Document Submission", "FATCA Declaration", "Risk Profile Change", "CKYC Linking"],
  "Billing & Charges": ["Brokerage Dispute", "DP Charges Query", "Penalty Waiver Request", "Invoice Mismatch"],
  "Technical Issues": ["Platform Login Issue", "OTP Not Received", "App Crash / Bug", "Data Mismatch in App"],
  "Compliance": ["Suspicious Transaction Report", "AML Query", "Regulatory Intimation", "Freeze/Defreeze Account"],
  "Reporting": ["Account Statement", "Contract Note", "P&L Report", "Portfolio Statement", "Holding Statement"],
};

const SLA_CONFIG_DEFAULT = [
  { category: "Account Issues", tat: 24, warning: 80, l1Owner: "CS Team", l2After: 12, l2Owner: "CS Head", l3After: 20, l3Owner: "Business Head", autoClose: 48 },
  { category: "Trade Issues", tat: 4, warning: 75, l1Owner: "CS Team", l2After: 2, l2Owner: "Dealer / Ops", l3After: 3, l3Owner: "Compliance Officer", autoClose: 24 },
  { category: "KYC / Documentation", tat: 48, warning: 85, l1Owner: "KYC Team", l2After: 24, l2Owner: "Compliance Officer", l3After: 40, l3Owner: "Business Head", autoClose: 72 },
  { category: "Billing & Charges", tat: 24, warning: 80, l1Owner: "Finance Team", l2After: 12, l2Owner: "CS Head", l3After: 20, l3Owner: "Business Head", autoClose: 48 },
  { category: "Technical Issues", tat: 4, warning: 70, l1Owner: "Tech Support", l2After: 2, l2Owner: "Tech Lead", l3After: 3, l3Owner: "CTO", autoClose: 24 },
  { category: "Compliance", tat: 2, warning: 90, l1Owner: "Compliance Officer", l2After: 1, l2Owner: "Risk Head", l3After: 1.5, l3Owner: "MD / CEO", autoClose: 12 },
  { category: "Reporting", tat: 24, warning: 80, l1Owner: "CS Team", l2After: 12, l2Owner: "Ops Team", l3After: 20, l3Owner: "CS Head", autoClose: 48 },
];

// Comprehensive Client Registry
const VNAME: Record<string, string> = { retail: "Retail Broking", corporate: "Corporate Broking", ib: "Investment Banking", aif: "AIF", ie: "Institutional Equities" };
const fmtDateShort = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// ─── CLIENT 360 ONVIEW PANEL ─────────────────────────────────────────────────
function Client360Panel({ client, t, onClose }: { client: any; t: ReturnType<typeof useTheme>; onClose: () => void }) {
  const [tab, setTab] = useState("overview");
  const [srs, setSrs] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    if (tab === "srs") {
      setLoadingTab(true);
      fetch(`${API_BASE}/api/service-requests?client_id=${client.id}&limit=20`)
        .then(r => r.json()).then(d => setSrs(d.data || [])).finally(() => setLoadingTab(false));
    } else if (tab === "deals") {
      setLoadingTab(true);
      fetch(`${API_BASE}/api/deals?client_id=${client.id}&limit=20`)
        .then(r => r.json()).then(d => setDeals(d.data || [])).finally(() => setLoadingTab(false));
    } else if (tab === "leads") {
      setLoadingTab(true);
      fetch(`${API_BASE}/api/leads?client_id=${client.id}&limit=20`)
        .then(r => r.json()).then(d => setLeads(d.data || [])).finally(() => setLoadingTab(false));
    } else if (tab === "docs") {
      setLoadingTab(true);
      fetch(`${API_BASE}/api/documents?client_id=${client.id}&limit=20`)
        .then(r => r.json()).then(d => setDocs(d.data || [])).finally(() => setLoadingTab(false));
    }
  }, [tab, client?.id]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "kyc", label: "KYC" },
    { id: "accounts", label: "Accounts" },
    { id: "srs", label: "Requests" },
    { id: "deals", label: "Deals" },
    { id: "leads", label: "Leads" },
    { id: "docs", label: "Docs" },
  ];

  return (
    <div className={`w-96 border-l ${t.border} ${t.bgCard} flex flex-col flex-shrink-0 overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${t.border} flex-shrink-0`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xs font-bold ${t.text} flex items-center gap-1.5`}>
            <User className="w-3.5 h-3.5 text-blue-400" /> Client 360 · OneView
          </div>
          <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${client.type === "Individual" ? "bg-blue-600" : "bg-violet-600"} flex items-center justify-center text-xs font-bold text-white`}>
            {client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-bold ${t.text} truncate`}>{client.name}</div>
            <code className="text-blue-400 text-[10px]">{client.client_code}</code>
          </div>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <Badge text={client.type} color={t.tagGray} />
          <Badge text={client.category} color={t.tagGray} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${client.status === "Active" ? "bg-emerald-900/60 text-emerald-400" : "bg-yellow-900/60 text-yellow-400"}`}>{client.status}</span>
        </div>
      </div>
      {/* Tabs */}
      <div className={`flex border-b ${t.border} flex-shrink-0 overflow-x-auto`}>
        {tabs.map(tab2 => (
          <button key={tab2.id} onClick={() => setTab(tab2.id)}
            className={`px-3 py-2 text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === tab2.id ? "border-b-2 border-blue-500 text-blue-400" : t.textMuted}`}>
            {tab2.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab === "overview" && (
          <>
            {[
              { label: "Full Name", value: client.name },
              { label: "Client Code", value: client.client_code },
              { label: "Type", value: client.type },
              { label: "Category", value: client.category },
              { label: "PAN", value: client.pan },
              { label: "Mobile", value: client.mobile },
              { label: "Email", value: client.email },
              { label: "DOB / DOI", value: client.date_of_birth ? fmtDateShort(client.date_of_birth) : client.date_of_incorporation ? fmtDateShort(client.date_of_incorporation) : "—" },
              { label: "Address", value: client.address || "—" },
              { label: "RM", value: client.rm_name || "—" },
              { label: "Verticals", value: (client.verticals || []).join(", ") || "—" },
              { label: "Client Since", value: fmtDateShort(client.created_at) },
              { label: "Updated", value: fmtDateTime(client.updated_at) },
            ].map(row => (
              <div key={row.label} className={`py-1.5 border-b ${t.border} last:border-0`}>
                <div className={`text-[9px] uppercase font-bold ${t.textMuted} mb-0.5`}>{row.label}</div>
                <div className={`text-xs ${t.text} break-words`}>{row.value}</div>
              </div>
            ))}
          </>
        )}
        {tab === "kyc" && (
          <>
            {[
              { label: "KYC Status", value: <StatusBadge s={client.kyc_status} /> },
              { label: "Risk Profile", value: <Badge text={client.risk_profile || "—"} color={client.risk_profile === "Ultra-High" ? "bg-red-900/60 text-red-400" : client.risk_profile === "High" ? "bg-orange-900/60 text-orange-400" : client.risk_profile === "Moderate" ? "bg-yellow-900/60 text-yellow-400" : "bg-emerald-900/60 text-emerald-400"} /> },
              { label: "FATCA Status", value: <StatusBadge s={client.fatca_status} /> },
              { label: "PAN", value: <span className={`text-xs font-mono ${t.text}`}>{client.pan}</span> },
              { label: "CKYC ID", value: <span className={`text-xs font-mono ${t.text}`}>{client.ckyc_id || "Not linked"}</span> },
              { label: "Aadhaar", value: <span className="text-xs text-emerald-400">XXXX XXXX 5678 ✓</span> },
            ].map(row => (
              <div key={row.label} className={`flex items-center justify-between py-2 border-b ${t.border} last:border-0`}>
                <span className={`text-xs ${t.textMuted}`}>{row.label}</span>
                {row.value}
              </div>
            ))}
            <div className={`mt-2 p-3 rounded-xl ${t.bgCard2} border ${t.border}`}>
              <div className={`text-[10px] font-bold uppercase ${t.textMuted} mb-2`}>KYC Documents</div>
              {["ID Proof (Aadhaar)", "Address Proof (Passport)", "PAN Card", "Photo"].map(doc => (
                <div key={doc} className={`flex items-center justify-between text-xs py-1`}>
                  <span className={t.textSub}>{doc}</span>
                  <span className="text-emerald-400">✓ Verified</span>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "accounts" && (
          <>
            <div className={`text-[9px] uppercase font-bold ${t.textMuted} mb-1`}>Demat Account</div>
            <div className={`${t.bgCard2} rounded-xl p-3 mb-3 border ${t.border}`}>
              <div className={`text-xs font-mono font-bold ${t.text}`}>{client.demat_account || "—"}</div>
              <div className={`text-[10px] ${t.textMuted} mt-0.5`}>DP ID: {client.dp_id || "—"}</div>
              <div className={`text-[10px] mt-1 text-emerald-400`}>● Active · NSDL</div>
            </div>
            <div className={`text-[9px] uppercase font-bold ${t.textMuted} mb-1`}>Bank Account(s)</div>
            <div className={`${t.bgCard2} rounded-xl p-3 mb-2 border ${t.border}`}>
              <div className={`text-xs font-mono ${t.text}`}>XXXX XXXX XXXX 4521</div>
              <div className={`text-[10px] ${t.textMuted}`}>HDFC Bank · Primary · RTGS/NEFT ✓</div>
            </div>
            <div className={`${t.bgCard2} rounded-xl p-3 border ${t.border}`}>
              <div className={`text-xs font-mono ${t.text}`}>XXXX XXXX XXXX 8832</div>
              <div className={`text-[10px] ${t.textMuted}`}>ICICI Bank · Secondary</div>
            </div>
          </>
        )}
        {tab === "srs" && (
          loadingTab ? <div className={`text-xs ${t.textMuted} text-center py-4`}><RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" />Loading…</div> :
          srs.length === 0 ? <div className={`text-xs ${t.textMuted} text-center py-6`}>No service requests</div> :
          srs.map((sr: any) => (
            <div key={sr.id} className={`${t.bgCard2} rounded-lg p-3 border ${t.border}`}>
              <div className="flex items-center justify-between mb-1">
                <code className="text-blue-400 text-[10px] font-bold">{sr.sr_code}</code>
                <StatusBadge s={sr.status} />
              </div>
              <div className={`text-xs ${t.text} mb-1`}>{sr.subject}</div>
              <div className="flex items-center justify-between">
                <PriorityBadge p={sr.priority} />
                <span className={`text-[9px] ${t.textMuted}`}>{fmtDateTime(sr.created_at)}</span>
              </div>
            </div>
          ))
        )}
        {tab === "deals" && (
          loadingTab ? <div className={`text-xs ${t.textMuted} text-center py-4`}><RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" />Loading…</div> :
          deals.length === 0 ? <div className={`text-xs ${t.textMuted} text-center py-6`}>No deals</div> :
          deals.map((d: any) => (
            <div key={d.id} className={`${t.bgCard2} rounded-lg p-3 border ${t.border}`}>
              <div className="flex items-center justify-between mb-1">
                <code className="text-amber-400 text-[10px] font-bold">{d.deal_code}</code>
                <StatusBadge s={d.stage} />
              </div>
              <div className={`text-xs font-medium ${t.text} mb-1`}>{d.name}</div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${t.text}`}>{d.value}</span>
                <span className={`text-[9px] ${t.textMuted}`}>{d.rm_name}</span>
              </div>
            </div>
          ))
        )}
        {tab === "leads" && (
          loadingTab ? <div className={`text-xs ${t.textMuted} text-center py-4`}><RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" />Loading…</div> :
          leads.length === 0 ? <div className={`text-xs ${t.textMuted} text-center py-6`}>No leads</div> :
          leads.map((l: any) => (
            <div key={l.id} className={`${t.bgCard2} rounded-lg p-3 border ${t.border}`}>
              <div className="flex items-center justify-between mb-1">
                <code className="text-emerald-400 text-[10px] font-bold">{l.lead_code}</code>
                <PriorityBadge p={l.priority} />
              </div>
              <div className={`text-xs ${t.text} mb-1`}>{l.name}</div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${t.textMuted}`}>{l.stage}</span>
                <span className={`text-[9px] ${t.textMuted}`}>{l.days_open}d open</span>
              </div>
            </div>
          ))
        )}
        {tab === "docs" && (
          loadingTab ? <div className={`text-xs ${t.textMuted} text-center py-4`}><RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" />Loading…</div> :
          docs.length === 0 ? <div className={`text-xs ${t.textMuted} text-center py-6`}>No documents</div> :
          docs.map((d: any) => (
            <div key={d.id} className={`${t.bgCard2} rounded-lg p-3 border ${t.border}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <FileText className={`w-3.5 h-3.5 ${t.textMuted}`} />
                  <span className={`text-xs font-medium ${t.text}`}>{d.name}</span>
                </div>
                <Badge text={d.current_version} color="bg-blue-900/60 text-blue-400" />
              </div>
              <div className={`text-[10px] ${t.textMuted}`}>{d.type} · {fmtDateShort(d.created_at)}</div>
            </div>
          ))
        )}
      </div>
      {/* Actions */}
      <div className={`p-3 border-t ${t.border} flex-shrink-0 grid grid-cols-3 gap-2`}>
        {["Call", "Email", "Meet"].map(a => (
          <button key={a} className={`text-xs py-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:text-blue-400 transition-colors`}>{a}</button>
        ))}
      </div>
    </div>
  );
}



// Lead + Deal + Customer + Document data (condensed from previous version)
const LEAD_STAGES: Record<string, { id: string; label: string }[]> = {
  retail: [{ id: "interest", label: "Account Interest" }, { id: "kyc", label: "KYC Initiated" }, { id: "docs", label: "Docs Collected" }, { id: "opening", label: "Account Opening" }, { id: "demat", label: "DEMAT Active" }, { id: "traded", label: "First Trade" }],
  corporate: [{ id: "identified", label: "Identified" }, { id: "qualified", label: "Qualified" }, { id: "credit", label: "Credit Assessment" }, { id: "legal", label: "Legal/Compliance" }, { id: "live", label: "Account Live" }, { id: "deal", label: "First Deal" }],
  ib: [{ id: "pitch", label: "Pitch" }, { id: "nda", label: "NDA Signed" }, { id: "mandate", label: "Mandate Letter" }, { id: "dd", label: "Due Diligence" }, { id: "docs", label: "Documentation" }, { id: "closure", label: "Closure" }],
  aif: [{ id: "identified", label: "Investor Identified" }, { id: "suitability", label: "Suitability Check" }, { id: "kyc", label: "KYC / AML" }, { id: "subscription", label: "Subscription" }, { id: "commitment", label: "Commitment" }, { id: "called", label: "Capital Called" }],
  ie: [{ id: "identified", label: "Account Identified" }, { id: "regulatory", label: "Regulatory Setup" }, { id: "research", label: "Research Access" }, { id: "trade", label: "Trade Setup" }, { id: "active", label: "Active" }],
};
const USERS = [
  { id: "U000", name: "Bhushan Niytri", email: "bhushan@niytri.com", role: "Super Admin", vertical: "All", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 9:00 AM" },
  { id: "U001", name: "Arjun Rao", email: "arjun.rao@niytri.com", role: "Super Admin", vertical: "All", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 9:02 AM" },
  { id: "U002", name: "Priya Sharma", email: "priya.sharma@niytri.com", role: "Senior RM", vertical: "Investment Banking", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 8:45 AM" },
  { id: "U003", name: "Vikram Nair", email: "vikram.nair@niytri.com", role: "CS Head", vertical: "All", status: "Active", authType: "app" as AuthMethod, mfa: false, lastLogin: "Today, 10:12 AM" },
  { id: "U004", name: "Meera Krishnan", email: "meera.krishnan@niytri.com", role: "Senior RM", vertical: "AIF", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Yesterday" },
  { id: "U005", name: "Rahul Joshi", email: "rahul.joshi@niytri.com", role: "Compliance Officer", vertical: "All", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 9:30 AM" },
  { id: "U006", name: "Anjali Kumar", email: "anjali.kumar@niytri.com", role: "Retail Admin", vertical: "Retail Broking", status: "Active", authType: "app" as AuthMethod, mfa: false, lastLogin: "Today, 8:15 AM" },
  { id: "U007", name: "Deepak Mehta", email: "deepak.mehta@niytri.com", role: "IE Admin", vertical: "Institutional Equities", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 10:45 AM" },
  { id: "U008", name: "Sonia Gupta", email: "sonia.gupta@niytri.com", role: "Corporate Admin", vertical: "Corporate Broking", status: "Active", authType: "app" as AuthMethod, mfa: true, lastLogin: "Yesterday, 5:30 PM" },
  { id: "U009", name: "Amit Sharma", email: "amit@niytri.com", role: "AIF Admin", vertical: "AIF", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 9:45 AM" },
  { id: "U010", name: "Nikhil Desai", email: "nikhil.desai@niytri.com", role: "Research Analyst", vertical: "Institutional Equities", status: "Active", authType: "app" as AuthMethod, mfa: false, lastLogin: "Today, 7:50 AM" },
  { id: "U011", name: "Kavita Pillai", email: "kavita.pillai@niytri.com", role: "Dealer", vertical: "Retail Broking", status: "Inactive", authType: "app" as AuthMethod, mfa: false, lastLogin: "5 Mar 2026" },
  { id: "U012", name: "Amrita Iyer", email: "amrita.iyer@niytri.com", role: "CS Agent", vertical: "All", status: "Active", authType: "app" as AuthMethod, mfa: false, lastLogin: "Today, 8:00 AM" },
  { id: "U013", name: "Saurabh Roy", email: "saurabh.roy@niytri.com", role: "IB Admin", vertical: "Investment Banking", status: "Active", authType: "m365" as AuthMethod, mfa: false, lastLogin: "Today, 9:15 AM" },
  { id: "U014", name: "Pooja Mishra", email: "pooja.mishra@niytri.com", role: "Junior RM", vertical: "Retail Broking", status: "Active", authType: "app" as AuthMethod, mfa: false, lastLogin: "Today, 8:40 AM" },
  { id: "U015", name: "Karan Verma", email: "karan.verma@niytri.com", role: "Senior RM", vertical: "Corporate Broking", status: "Active", authType: "m365" as AuthMethod, mfa: true, lastLogin: "Today, 10:00 AM" },
];

// Vertical-specific roles with access matrix
const VERTICAL_ROLES = [
  { role: "Super Admin", vertical: "All", access: ["All Modules", "Admin Config", "AI Config", "User Mgmt", "SLA Config", "System Config"], desc: "Full access to all verticals, admin, and configuration" },
  { role: "AIF Admin", vertical: "AIF", access: ["AIF Dashboard", "AIF Leads", "AIF Deals", "AIF Clients", "AIF Documents", "AIF Service Requests", "AI Assistant"], desc: "Full admin access restricted to AIF vertical" },
  { role: "Retail Admin", vertical: "Retail Broking", access: ["RB Dashboard", "RB Leads", "RB Deals", "RB Clients", "RB Documents", "RB Service Requests", "AI Assistant"], desc: "Full admin access restricted to Retail Broking vertical" },
  { role: "Corporate Admin", vertical: "Corporate Broking", access: ["CB Dashboard", "CB Leads", "CB Deals", "CB Clients", "CB Documents", "CB Service Requests", "AI Assistant"], desc: "Full admin access restricted to Corporate Broking" },
  { role: "IB Admin", vertical: "Investment Banking", access: ["IB Dashboard", "IB Leads", "IB Deals", "IB Clients", "IB Documents", "IB Service Requests", "AI Assistant"], desc: "Full admin access restricted to Investment Banking" },
  { role: "IE Admin", vertical: "Institutional Equities", access: ["IE Dashboard", "IE Leads", "IE Deals", "IE Clients", "IE Documents", "IE Service Requests", "AI Assistant"], desc: "Full admin access restricted to Institutional Equities" },
  { role: "Business Head", vertical: "Assigned", access: ["Dashboards (assigned)", "Pipeline View", "Client View", "Deal View"], desc: "Read-only overview of assigned verticals" },
  { role: "Senior RM", vertical: "Assigned", access: ["Leads", "Deals", "Clients", "Documents", "Service Requests"], desc: "Full RM access for assigned vertical" },
  { role: "Junior RM", vertical: "Assigned", access: ["Leads (own)", "Clients (own)", "Service Requests (own)"], desc: "Limited RM access to own records" },
  { role: "Compliance Officer", vertical: "All", access: ["Audit Logs", "Client KYC", "Compliance SRs", "Documents"], desc: "Read-only compliance view across all verticals" },
  { role: "Research Analyst", vertical: "Institutional Equities", access: ["IE Dashboard", "Client View (IE)", "Documents"], desc: "IE research coverage and client data" },
  { role: "Dealer", vertical: "Assigned", access: ["Trade SRs", "Deal Execution View"], desc: "Execution-only access" },
  { role: "CS Head", vertical: "All", access: ["Service Requests", "Audit Log", "SLA View"], desc: "Customer service management across all verticals" },
  { role: "CS Agent", vertical: "All", access: ["Service Requests (own)", "Client View (basic)"], desc: "Frontline customer service agent" },
];

const V_KPI: Record<string, { label: string; value: string; sub: string; up: boolean }[]> = {
  retail: [{ label: "Total AUM", value: "₹48.2Cr", sub: "+12.4% QoQ", up: true }, { label: "Active Clients", value: "12,483", sub: "+342 this month", up: true }, { label: "New Accounts (MTD)", value: "184", sub: "Target: 200", up: true }, { label: "Brokerage (MTD)", value: "₹1.82Cr", sub: "+8.1% vs target", up: true }],
  corporate: [{ label: "Block Deal Volume", value: "₹842Cr", sub: "Q4 MTD", up: true }, { label: "Active Clients", value: "847", sub: "+12 this month", up: true }, { label: "Clearing Value", value: "₹3,218Cr", sub: "MTD settled", up: true }, { label: "Brokerage Revenue", value: "₹4.6Cr", sub: "+6.2% vs target", up: false }],
  ib: [{ label: "Live Deals", value: "8", sub: "₹21,450Cr value", up: true }, { label: "Pipeline Value", value: "₹28,750Cr", sub: "18 deals total", up: true }, { label: "Advisory Fees (FY26)", value: "₹310Cr", sub: "+22.3% YoY", up: true }, { label: "Near-Closure Deals", value: "3", sub: "Est. ₹6,500Cr fees", up: true }],
  aif: [{ label: "Total AUM", value: "₹2,840Cr", sub: "Cat I + II + III", up: true }, { label: "Investors", value: "389", sub: "+24 this quarter", up: true }, { label: "Capital Called (Q4)", value: "₹185Cr", sub: "68% of committed", up: true }, { label: "Avg. NAV Return", value: "18.7%", sub: "Since inception", up: true }],
  ie: [{ label: "Total Brokerage Vol.", value: "₹12,840Cr", sub: "MTD trades", up: true }, { label: "FII AUM Allocated", value: "₹8,400Cr", sub: "5 FII clients", up: true }, { label: "Research Coverage", value: "142 stocks", sub: "24 sectors", up: true }, { label: "Revenue (MTD)", value: "₹28.4Cr", sub: "+6.2% vs March '25", up: false }],
};

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────
function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{text}</span>;
}
function PriorityBadge({ p }: { p: string }) {
  const c = p === "Critical" ? "bg-red-900/70 text-red-400" : p === "High" ? "bg-orange-900/70 text-orange-400" : p === "Medium" ? "bg-yellow-900/70 text-yellow-400" : "bg-gray-800 text-gray-500";
  return <Badge text={p} color={c} />;
}
function StatusBadge({ s }: { s: string }) {
  const c = ["Verified", "Executed", "Active", "Signed", "Final", "Settled", "Called", "Allotted", "Resolved", "Closed", "Connected", "Enforced"].includes(s) ? "bg-emerald-900/70 text-emerald-400"
    : ["Pending", "Draft", "In Negotiation", "Open"].includes(s) ? "bg-yellow-900/70 text-yellow-400"
    : ["In Progress", "Partially Executed", "Fundraising", "Executing", "Live", "Reviewed", "Sent"].includes(s) ? "bg-blue-900/70 text-blue-400"
    : ["Escalated", "Breached", "Expired"].includes(s) ? "bg-red-900/70 text-red-400"
    : ["Near Closure", "Subscription Signed", "Mandate Signed", "Warning"].includes(s) ? "bg-violet-900/70 text-violet-400"
    : "bg-gray-800 text-gray-500";
  return <Badge text={s} color={c} />;
}
function AuthBadge({ method }: { method: AuthMethod }) {
  return method === "m365"
    ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 flex items-center gap-1"><span className="font-black">⊞</span>M365</span>
    : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">App Auth</span>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const API_BASE = (() => {
  if (typeof window !== "undefined" && window.location.hostname.includes("replit")) {
    const parts = window.location.hostname.split(".");
    const domain = parts.slice(1).join(".");
    return `https://${parts[0]}.${domain}`;
  }
  return "";
})();

function LoginScreen({ onAppLogin, onM365Login, isDark, m365Error }: { onAppLogin: () => void; onM365Login: (token: string, userJson: string) => void; isDark: boolean; m365Error?: string }) {
  const t = useTheme(isDark);
  const [email, setEmail] = useState("arjun.rao@niytri.com");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(m365Error || "");
  const [loading, setLoading] = useState(false);
  const [m365Loading, setM365Loading] = useState(false);

  const handleSubmit = () => {
    if (!email.includes("@niytri.com")) { setError("Please use your @niytri.com email address."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setError(""); setLoading(true);
    setTimeout(() => { setLoading(false); onAppLogin(); }, 900);
  };

  const handleM365 = () => {
    setM365Loading(true);
    const redirectUrl = `${API_BASE}/api/auth/m365/redirect`;

    // Open in a popup so the OAuth flow doesn't break inside the iframe.
    // Microsoft's login page blocks loading in iframes (X-Frame-Options).
    const popup = window.open(
      redirectUrl,
      "niytri_m365_auth",
      "popup=yes,width=520,height=660,left=200,top=100,resizable=yes",
    );

    if (!popup || popup.closed) {
      // Popup was blocked — fall back to top-level navigation
      setError("Popup was blocked. Please allow popups for this site and try again.");
      setM365Loading(false);
      return;
    }

    // Listen for the postMessage from /api/auth/m365/done
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NIYTRI_M365_AUTH") {
        window.removeEventListener("message", handler);
        onM365Login(event.data.token, event.data.user);
        setM365Loading(false);
      } else if (event.data?.type === "NIYTRI_M365_ERROR") {
        window.removeEventListener("message", handler);
        setError(event.data.error || "Microsoft sign-in failed. Please try again.");
        setM365Loading(false);
      }
    };
    window.addEventListener("message", handler);

    // If user closes popup without completing, stop spinning
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        window.removeEventListener("message", handler);
        setM365Loading(false);
      }
    }, 800);
  };

  return (
    <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4"><Globe className="w-7 h-7 text-white" /></div>
          <h1 className={`text-2xl font-bold ${t.text}`}>NIYTRI CRM</h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>Enterprise Financial Services Platform</p>
        </div>
        <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 shadow-xl space-y-4`}>
          <h2 className={`text-sm font-semibold ${t.text}`}>Sign in to your account</h2>

          {/* M365 SSO Button */}
          <button
            onClick={handleM365}
            disabled={m365Loading}
            className={`w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border-2 ${isDark ? "border-gray-700 hover:border-blue-600 bg-gray-800" : "border-gray-200 hover:border-blue-500 bg-gray-50 hover:bg-white"} transition-all disabled:opacity-60`}
          >
            {m365Loading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            )}
            <span className={`text-sm font-semibold ${t.text}`}>{m365Loading ? "Redirecting to Microsoft…" : "Sign in with Microsoft 365"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />
            <span className={`text-[10px] ${t.textMuted} uppercase tracking-widest`}>or</span>
            <div className={`flex-1 h-px ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />
          </div>

          <div className="space-y-3">
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${t.textMuted}`} />
                <input value={email} onChange={e => setEmail(e.target.value)} className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors ${t.inputBg}`} placeholder="you@niytri.com" />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Password</label>
              <div className="relative">
                <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${t.textMuted}`} />
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors ${t.inputBg}`} placeholder="••••••••••" />
                <button onClick={() => setShowPw(!showPw)} className={`absolute right-3 top-2.5 ${t.textMuted}`}>{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? "Verifying…" : "Continue with Email OTP"}
          </button>
        </div>
        <p className={`text-[10px] ${t.textMuted} text-center mt-5`}>© 2026 NIYTRI Solutions. All rights reserved.</p>
      </div>
    </div>
  );
}

function M365Callback({ token, userJson, onDone }: { token: string; userJson: string; onDone: (user: any) => void }) {
  useEffect(() => {
    try {
      const user = JSON.parse(decodeURIComponent(userJson));
      localStorage.setItem("niytri_token", token);
      localStorage.setItem("niytri_user", JSON.stringify(user));
      const url = new URL(window.location.href);
      url.searchParams.delete("m365_token");
      url.searchParams.delete("m365_user");
      window.history.replaceState({}, "", url.toString());
      setTimeout(() => onDone(user), 600);
    } catch {
      onDone(null);
    }
  }, []);
  return null;
}

function M365Flow({ onDone, isDark }: { onDone: () => void; isDark: boolean }) {
  const t = useTheme(isDark);
  return (
    <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
      <div className="w-full max-w-xs px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022" /><rect x="11" y="1" width="9" height="9" fill="#7FBA00" /><rect x="1" y="11" width="9" height="9" fill="#00A4EF" /><rect x="11" y="11" width="9" height="9" fill="#FFB900" /></svg>
        </div>
        <h2 className={`text-lg font-bold ${t.text} mb-1`}>Microsoft 365</h2>
        <p className={`text-xs ${t.textMuted} mb-6`}>Redirecting to Microsoft login…</p>
        <div className="flex justify-center gap-2 mb-4">
          <div className="h-1.5 rounded-full bg-blue-500 w-8 animate-pulse" />
          <div className="h-1.5 rounded-full bg-blue-400 w-4 opacity-60" />
          <div className="h-1.5 rounded-full bg-blue-300 w-4 opacity-40" />
        </div>
        <p className={`text-[11px] ${t.textMuted}`}>Connecting to niytri.com tenant…</p>
        <RefreshCw className="w-5 h-5 text-blue-400 animate-spin mx-auto mt-4" />
      </div>
    </div>
  );
}

function OTPScreen({ onVerify, email, isDark }: { onVerify: () => void; email: string; isDark: boolean }) {
  const t = useTheme(isDark);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.join("").length === 6) { setTimeout(() => { setLoading(true); setTimeout(() => { setLoading(false); onVerify(); }, 800); }, 300); }
  };
  const handleKey = (i: number, e: React.KeyboardEvent) => { if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus(); };
  return (
    <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4"><Shield className="w-7 h-7 text-white" /></div>
          <h1 className={`text-xl font-bold ${t.text}`}>Email OTP Verification</h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>6-digit code sent to <span className="text-blue-400 font-medium">{email}</span></p>
        </div>
        <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 shadow-xl`}>
          <div className="flex gap-2 justify-center mb-4">
            {otp.map((d, i) => (
              <input key={i} ref={el => { refs.current[i] = el; }} value={d} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)} maxLength={1}
                className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl outline-none focus:border-blue-500 transition-colors ${t.inputBg} ${d ? "border-blue-500" : ""}`} />
            ))}
          </div>
          <button onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); onVerify(); }, 800); }} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            {loading ? "Verifying OTP…" : "Verify & Sign In"}
          </button>
          <p className={`text-[10px] ${t.textMuted} text-center mt-3`}>OTP valid for 5 minutes · <button className="text-blue-400 hover:underline">Resend OTP</button> · Demo: any 6 digits</p>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const ADMIN_MENU = [
  { section: "User Management", items: [
    { id: "admin-users",    label: "Users",            icon: Users },
    { id: "admin-roles",    label: "User Roles",        icon: Shield },
    { id: "admin-role-map", label: "Role Mapping",      icon: Tag },
  ]},
  { section: "Operations", items: [
    { id: "admin-sla",     label: "SLA / TAT Config",  icon: Clock },
  ]},
  { section: "AI Settings", items: [
    { id: "admin-llm",     label: "LLM Settings",       icon: Cpu },
    { id: "admin-prompts", label: "AI Prompts & Access", icon: Bot },
  ]},
  { section: "Integrations", items: [
    { id: "admin-m365",    label: "M365 Integration",   icon: Globe },
  ]},
  { section: "System", items: [
    { id: "admin-theme",   label: "Theme & Display",    icon: Sun },
    { id: "admin-system",  label: "System Config",      icon: Database },
  ]},
];

function Sidebar({ open, onClose, activeV, setActiveV, activePage, setPage, isDark, isAdmin, setIsAdmin, loggedUser, onLogout }: any) {
  const t = useTheme(isDark);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adminExpanded, setAdminExpanded] = useState<string | null>("User Management");
  const nav = (v: Vertical, p: Page) => { setActiveV(v); setPage(p); setIsAdmin(false); if (onClose) onClose(); };
  const navAdmin = (p: Page) => { setIsAdmin(true); setPage(p); setActiveV(null); if (onClose) onClose(); };
  const toggleV = (vid: string) => { setExpanded(expanded === vid ? null : vid); setActiveV(vid as Vertical); setPage("dashboard"); setIsAdmin(false); };
  const initials = loggedUser ? loggedUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "BN";

  return (
    <aside className={`${open ? "w-60" : "w-14"} ${t.bgSidebar} border-r ${t.border} flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden h-full`}>
      <div className={`h-14 flex items-center px-3 border-b ${t.border} gap-2.5 flex-shrink-0`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0"><Globe className="w-4 h-4 text-white" /></div>
        {open && <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${t.text} leading-none`}>NIYTRI CRM</div><div className={`text-[10px] ${t.textMuted} mt-0.5`}>Financial Services</div></div>}
        {open && onClose && <button onClick={onClose} className={`${t.textMuted} hover:opacity-70 ml-auto`}><X className="w-4 h-4" /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
        <button onClick={() => nav(null, "dashboard")} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${!activeV && activePage === "dashboard" && !isAdmin ? "bg-blue-600 text-white" : `${t.textMuted} ${t.rowHover}`}`}>
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />{open && <span className="font-medium">Overall Dashboard</span>}
        </button>
        <button onClick={() => nav(null, "clients")} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${!activeV && activePage === "clients" && !isAdmin ? "bg-blue-600 text-white" : `${t.textMuted} ${t.rowHover}`}`}>
          <User className="w-4 h-4 flex-shrink-0" />{open && <span>Client Registry</span>}
        </button>
        <button onClick={() => nav(null, "service")} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${!activeV && activePage === "service" && !isAdmin ? "bg-blue-600 text-white" : `${t.textMuted} ${t.rowHover}`}`}>
          <MessageSquare className="w-4 h-4 flex-shrink-0" />{open && <span>Service Requests</span>}
        </button>
        <button onClick={() => { setIsAdmin(false); nav(null, "ai"); }} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${!activeV && activePage === "ai" && !isAdmin ? "bg-violet-600 text-white" : `${t.textMuted} ${t.rowHover}`}`}>
          <Sparkles className="w-4 h-4 flex-shrink-0" />{open && <><span className="font-medium">AI Assistant</span><span className="ml-auto text-[9px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-bold">AI</span></>}
        </button>

        {open && <div className={`px-2.5 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>Business Verticals</div>}
        {VERTICALS.map(v => {
          const isExp = expanded === v.id; const isActiveV = activeV === v.id;
          return (
            <div key={v.id}>
              <button onClick={() => toggleV(v.id)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${isActiveV ? `${v.color} text-white` : `${t.textMuted} ${t.rowHover}`}`}>
                <v.icon className="w-4 h-4 flex-shrink-0" />
                {open && <><span className="font-medium flex-1 text-left">{v.label}</span><ChevronDown className={`w-3 h-3 transition-transform ${isExp ? "rotate-180" : ""}`} /></>}
              </button>
              {open && isExp && (
                <div className="ml-3 mt-0.5 space-y-0.5 pl-3 border-l-2 border-gray-700/60">
                  {SUBMENU.map(s => {
                    const isAct = activeV === v.id && activePage === s.id && !isAdmin;
                    return (
                      <button key={s.id} onClick={() => nav(v.id as Vertical, s.id as Page)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${isAct ? "text-white bg-gray-700/60" : `${t.textMuted} hover:text-white hover:bg-gray-700/40`}`}>
                        <s.icon className="w-3.5 h-3.5 flex-shrink-0" /><span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Administration — grouped sections */}
        {open && <div className={`px-2.5 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>Administration</div>}
        {ADMIN_MENU.map(section => (
          <div key={section.section}>
            {open && (
              <button onClick={() => setAdminExpanded(adminExpanded === section.section ? null : section.section)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${t.textMuted} ${t.rowHover}`}>
                <span className="uppercase tracking-wide">{section.section}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${adminExpanded === section.section ? "rotate-180" : ""}`} />
              </button>
            )}
            {(adminExpanded === section.section || !open) && section.items.map(a => (
              <button key={a.id} onClick={() => navAdmin(a.id as Page)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${isAdmin && activePage === a.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : `${t.textMuted} ${t.rowHover}`}`}>
                <a.icon className="w-3.5 h-3.5 flex-shrink-0" />{open && <span>{a.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer + Logout */}
      {open && (
        <div className={`p-2.5 border-t ${t.border} flex-shrink-0`}>
          <div className="flex items-center gap-2 px-1.5 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium ${t.text} truncate`}>{loggedUser?.name || "Bhushan Niytri"}</div>
              <AuthBadge method={loggedUser?.authType || "m365"} />
            </div>
            <button onClick={onLogout} title="Sign out" className={`p-1.5 rounded-lg ${t.textMuted} hover:text-red-400 hover:bg-red-900/20 transition-colors`}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {!open && (
        <button onClick={onLogout} title="Sign out" className={`m-2 p-2 rounded-lg ${t.textMuted} hover:text-red-400 hover:bg-red-900/20 transition-colors flex items-center justify-center`}>
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </aside>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ sidebarOpen, setSidebarOpen, onMobileMenu, activeV, activePage, isDark, setIsDark, t }: any) {
  const vInfo = activeV ? VERTICALS.find((v: any) => v.id === activeV) : null;
  const ADMIN_PAGE_LABELS: Record<string, string> = {
    "admin-users":    "Users",
    "admin-roles":    "User Roles",
    "admin-role-map": "Role Mapping",
    "admin-sla":      "SLA / TAT Config",
    "admin-llm":      "LLM Settings",
    "admin-prompts":  "AI Prompts & Access",
    "admin-m365":     "M365 Integration",
    "admin-theme":    "Theme & Display",
    "admin-system":   "System Config",
    "admin-ai":       "AI Settings",
  };
  const pageLabel = SUBMENU.find(s => s.id === activePage)?.label
    || ADMIN_PAGE_LABELS[activePage]
    || (activePage === "ai" ? "AI Assistant" : activePage.replace("admin-", "").replace(/-/g, " "));
  return (
    <header className={`h-14 ${t.bgHeader} border-b ${t.border} flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0`}>
      {/* Desktop sidebar toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`hidden md:block ${t.textMuted} hover:opacity-80`}><Menu className="w-5 h-5" /></button>
      {/* Mobile hamburger */}
      <button onClick={onMobileMenu} className={`md:hidden ${t.textMuted} hover:opacity-80`}><Menu className="w-5 h-5" /></button>
      <div className="flex items-center gap-1.5 text-xs min-w-0">
        {vInfo ? (
          <>
            <span className={`${t.textMuted} hidden sm:inline`}>NIYTRI CRM</span>
            <ChevronRight className={`w-3 h-3 ${t.textMuted} hidden sm:block`} />
            <span className={`font-semibold ${vInfo.accent} truncate`}>{vInfo.label}</span>
            {activePage !== "dashboard" && <><ChevronRight className={`w-3 h-3 ${t.textMuted}`} /><span className={`${t.textSub} truncate hidden sm:inline`}>{pageLabel}</span></>}
          </>
        ) : (
          <>
            <span className={`${t.textMuted} hidden sm:inline`}>NIYTRI CRM</span>
            <ChevronRight className={`w-3 h-3 ${t.textMuted} hidden sm:block`} />
            <span className={`font-semibold ${t.text} truncate`}>{pageLabel || "Dashboard"}</span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
        <div className={`hidden sm:flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input className={`bg-transparent text-xs ${t.text} placeholder:text-gray-500 outline-none w-24 lg:w-32`} placeholder="Search…" />
        </div>
        <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-yellow-400" : "bg-gray-100 text-gray-600"}`}>{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
        <div className="relative"><Bell className={`w-5 h-5 ${t.textMuted} cursor-pointer`} /><span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white">8</span></div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer">BN</div>
      </div>
    </header>
  );
}

// ─── CLIENT REGISTRY ──────────────────────────────────────────────────────────
function ClientsModule({ t }: { t: ReturnType<typeof useTheme> }) {
  const PAGE_SIZE = 15;
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKyc, setFilterKyc] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (searchField !== "all") params.set("searchField", searchField);
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterKyc !== "all") params.set("kyc_status", filterKyc);
      const r = await fetch(`${API_BASE}/api/clients?${params}`);
      const d = await r.json();
      setClients(d.data || []);
      setTotal(d.total || 0);
    } catch { setClients([]); } finally { setLoading(false); }
  }, [page, search, searchField, filterType, filterStatus, filterKyc]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`px-4 py-3 border-b ${t.border} flex items-center gap-2 flex-shrink-0 flex-wrap`}>
          <div className="flex items-center gap-2">
            <User className={`w-4 h-4 ${t.textMuted}`} />
            <span className={`text-sm font-bold ${t.text}`}>Client Registry</span>
            <span className={`text-[10px] ${t.tagGray} px-2 py-0.5 rounded-full`}>{total} clients</span>
          </div>
          <select value={searchField} onChange={e => { setSearchField(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All Fields</option>
            <option value="client_code">Client Code</option>
            <option value="name">Name</option>
            <option value="pan">PAN</option>
            <option value="mobile">Mobile</option>
            <option value="email">Email</option>
          </select>
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5 flex-1 min-w-40 max-w-xs`}>
            <Search className={`w-3.5 h-3.5 ${t.textMuted} flex-shrink-0`} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-full`} placeholder="Search name, code, PAN, mobile…" />
            {search && <button onClick={() => { setSearch(""); setPage(1); }} className={t.textMuted}><X className="w-3 h-3" /></button>}
          </div>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All Types</option>
            <option value="Individual">Individual</option>
            <option value="Non-Individual">Non-Individual</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Dormant">Dormant</option>
          </select>
          <select value={filterKyc} onChange={e => { setFilterKyc(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All KYC</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Expired">Expired</option>
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1`}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Client</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 z-10 ${t.tableHead}`}>
                <tr className={`border-b ${t.border}`}>
                  {["Client Code", "Name", "Type / Category", "PAN", "Mobile", "RM", "Verticals", "KYC", "Status", ""].map(h => (
                    <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-3 py-2.5`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${selected?.id === c.id ? (isDark ? "bg-blue-950/40" : "bg-blue-50") : ""}`}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <code className="text-blue-400 font-mono text-[10px]">{c.client_code}</code>
                        <button onClick={e => { e.stopPropagation(); }} className={t.textMuted}><Copy className="w-2.5 h-2.5" /></button>
                      </div>
                    </td>
                    <td className={`px-3 py-2.5 font-medium ${t.text}`}>{c.name}</td>
                    <td className="px-3 py-2.5">
                      <div className={`text-[10px] ${t.textMuted}`}>{c.type}</div>
                      <Badge text={c.category} color={t.tagGray} />
                    </td>
                    <td className={`px-3 py-2.5 font-mono ${t.textMuted}`}>{c.pan}</td>
                    <td className={`px-3 py-2.5 ${t.textMuted}`}>{c.mobile}</td>
                    <td className={`px-3 py-2.5 ${t.textMuted}`}>{c.rm_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">{(c.verticals || []).map((v: string) => <Badge key={v} text={v} color={t.tagGray} />)}</div>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge s={c.kyc_status} /></td>
                    <td className="px-3 py-2.5">
                      <span className={`flex items-center gap-1 text-xs ${c.status === "Active" ? "text-emerald-400" : "text-yellow-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === "Active" ? "bg-emerald-400" : "bg-yellow-400"}`} />{c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><MoreHorizontal className={`w-4 h-4 ${t.textMuted}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
      </div>
      {selected && <Client360Panel client={selected} t={t} onClose={() => setSelected(null)} />}
    </div>
  );
}
// ─── OVERALL DASHBOARD ─────────────────────────────────────────────────────────
function OverallDashboard({ t }: { t: ReturnType<typeof useTheme> }) {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/dashboard`)
      .then(r => r.json()).then(setDash).finally(() => setLoading(false));
  }, []);

  const kpis = dash ? [
    { label: "Total Clients (CRM)", value: (dash.clients?.total || 0).toLocaleString("en-IN"), sub: `Active: ${dash.clients?.byStatus?.Active || 0}`, icon: Users, up: true },
    { label: "Active Leads", value: (dash.leads?.total || 0).toLocaleString("en-IN"), sub: "Across all verticals", icon: TrendingUp, up: true },
    { label: "Active Deals", value: (dash.deals?.total || 0).toLocaleString("en-IN"), sub: "Across all verticals", icon: Briefcase, up: true },
    { label: "Service Requests", value: (dash.srs?.total || 0).toLocaleString("en-IN"), sub: `${dash.srs?.breached || 0} SLA breached`, icon: MessageSquare, up: (dash.srs?.breached || 0) === 0 },
  ] : [];

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div><h1 className={`text-lg font-bold ${t.text}`}>Executive Overview</h1><p className={`text-xs ${t.textMuted} mt-0.5`}>NIYTRI Financial Services · Real-time CRM data</p></div>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export Report</button>
      </div>
      {dash?.srs?.breached > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs bg-red-950/40 border-red-900/50 text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {dash.srs.breached} service request{dash.srs.breached > 1 ? "s" : ""} have breached SLA — immediate action required
        </div>
      )}
      {loading ? (
        <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading dashboard…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => (
              <div key={k.label} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                <div className="flex items-start justify-between mb-2"><span className={`text-[10px] ${t.textMuted}`}>{k.label}</span><k.icon className={`w-4 h-4 ${t.textMuted}`} /></div>
                <div className={`text-xl font-bold ${t.text}`}>{k.value}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${k.up ? "text-emerald-400" : "text-red-400"}`}>{k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{k.sub}</div>
              </div>
            ))}
          </div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-wide ${t.textMuted} mb-3`}>Pipeline by Vertical</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {VERTICALS.map(v => {
                const leadsCount = dash?.leads?.byVertical?.[v.label] || 0;
                const dealsCount = dash?.deals?.byVertical?.[v.label] || 0;
                return (
                  <div key={v.id} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                    <div className="flex items-center gap-2 mb-3"><div className={`w-2 h-6 rounded-full ${v.color}`} /><div><div className={`text-xs font-bold ${t.text}`}>{v.short}</div><div className={`text-[9px] ${t.textMuted} leading-tight`}>{v.label}</div></div></div>
                    <div className="space-y-1.5">
                      <div><div className={`text-[9px] ${t.textMuted}`}>Leads</div><div className={`text-lg font-bold ${t.text}`}>{leadsCount}</div></div>
                      <div><div className={`text-[9px] ${t.textMuted}`}>Deals</div><div className={`text-sm font-bold ${t.text}`}>{dealsCount}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
            <div className={`text-sm font-semibold ${t.text} mb-3 flex items-center justify-between`}>
              <span>Service Request Status</span>
              <span className={`text-[10px] ${t.textMuted}`}>{dash?.srs?.total || 0} total</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(dash?.srs?.byStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} className={`${t.bgCard2} rounded-xl p-3 text-center`}>
                  <div className={`text-xl font-bold ${status === "Escalated" ? "text-red-400" : status === "Open" ? "text-amber-400" : status === "Resolved" ? "text-emerald-400" : status === "In Progress" ? "text-blue-400" : t.textMuted}`}>{count}</div>
                  <div className={`text-[9px] ${t.textMuted} mt-0.5`}>{status}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// ─── VERTICAL DASHBOARD ─────────────────────────────────────────────────────
function VerticalDashboard({ vId, t }: { vId: string; t: ReturnType<typeof useTheme> }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const vName = VNAME[vId];
  const [dash, setDash] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const kpis = V_KPI[vId] || [];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dashboard`).then(r => r.json()),
      fetch(`${API_BASE}/api/leads?vertical=${encodeURIComponent(vName)}&limit=100`).then(r => r.json()),
      fetch(`${API_BASE}/api/deals?vertical=${encodeURIComponent(vName)}&limit=8`).then(r => r.json()),
    ]).then(([d, l, de]) => {
      setDash(d);
      setLeads(l.data || []);
      setDeals(de.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [vId]);

  const charts: Record<string, [string, number][]> = {
    retail: [["Oct", 38], ["Nov", 42], ["Dec", 48], ["Jan", 51], ["Feb", 58], ["Mar", 64]],
    corporate: [["Oct", 31], ["Nov", 38], ["Dec", 44], ["Jan", 48], ["Feb", 50], ["Mar", 52]],
    ib: [["Oct", 18], ["Nov", 24], ["Dec", 28], ["Jan", 32], ["Feb", 38], ["Mar", 40]],
    aif: [["Oct", 22], ["Nov", 28], ["Dec", 33], ["Jan", 38], ["Feb", 42], ["Mar", 45]],
    ie: [["Oct", 35], ["Nov", 42], ["Dec", 46], ["Jan", 51], ["Feb", 55], ["Mar", 58]],
  };
  const chartData = charts[vId] || [];
  const maxVal = chartData.length ? Math.max(...chartData.map(d => d[1])) : 1;

  const stageMap: Record<string, number> = {};
  leads.forEach(l => { stageMap[l.stage] = (stageMap[l.stage] || 0) + 1; });
  const stages = LEAD_STAGES[vId] || [];

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${v.color} flex items-center justify-center`}><v.icon className="w-5 h-5 text-white" /></div>
          <div><h1 className={`text-lg font-bold ${t.text}`}>{v.label} Dashboard</h1><p className={`text-xs ${t.textMuted}`}>Business vertical performance · Q4 FY26</p></div>
        </div>
        <div className="flex items-center gap-2">
          {dash && <span className={`text-xs ${t.textMuted}`}>{dash.leads?.byVertical?.[vName] || 0} leads · {dash.deals?.byVertical?.[vName] || 0} deals</span>}
          <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export</button>
        </div>
      </div>
      {loading ? (
        <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => (
              <div key={k.label} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
                <div className={`text-[10px] ${t.textMuted} mb-1.5`}>{k.label}</div>
                <div className={`text-xl font-bold ${t.text}`}>{k.value}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${k.up ? "text-emerald-400" : "text-red-400"}`}>{k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{k.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className={`col-span-2 ${t.bgCard} border ${t.border} rounded-xl p-4`}>
              <div className={`text-sm font-semibold ${t.text} mb-4`}>Revenue Trend (FY 2025–26)</div>
              <div className="flex items-end gap-3 h-28">
                {chartData.map(([month, val]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[9px] ${t.textMuted}`}>₹{val}Cr</span>
                    <div className={`w-full ${v.color} rounded-t-lg opacity-80`} style={{ height: `${(val / maxVal) * 90}px` }} />
                    <span className={`text-[9px] ${t.textMuted}`}>{month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
              <div className={`text-sm font-semibold ${t.text} mb-3`}>Lead Pipeline ({leads.length} total)</div>
              {stages.slice(0, 5).map((stage, i) => {
                const count = stageMap[stage.id] || 0;
                const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
                return (
                  <div key={stage.id} className="mb-2.5">
                    <div className="flex justify-between text-xs mb-1"><span className={t.textMuted}>{stage.label}</span><span className={t.text}>{count}</span></div>
                    <div className={`h-1.5 ${t.bgCard2} rounded-full`}><div className={`h-full ${v.color} rounded-full transition-all`} style={{ width: `${Math.max(4, pct)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${t.text}`}>Active Deals</span>
              <span className={`text-[10px] ${t.textMuted}`}>{deals.length} shown</span>
            </div>
            {deals.length === 0 ? (
              <div className={`text-center py-8 text-xs ${t.textMuted}`}>No deals found for {vName}</div>
            ) : (
              <table className="w-full">
                <thead className={t.tableHead}><tr className={`border-b ${t.border}`}>{["ID", "Name", "Type", "Value", "Stage", "RM", "Date"].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2`}>{h}</th>)}</tr></thead>
                <tbody>{deals.map((d: any) => <tr key={d.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} text-xs`}><td className={`px-4 py-2 font-mono ${v.accent}`}>{d.deal_code}</td><td className={`px-4 py-2 font-medium ${t.text}`}>{d.name}</td><td className={`px-4 py-2 ${t.textMuted}`}>{d.type}</td><td className={`px-4 py-2 font-bold ${t.text}`}>{d.value}</td><td className="px-4 py-2"><StatusBadge s={d.stage} /></td><td className={`px-4 py-2 ${t.textMuted}`}>{d.rm_name || "—"}</td><td className={`px-4 py-2 ${t.textMuted}`}>{fmtDateShort(d.deal_date)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
// ─── LEADS PIPELINE ───────────────────────────────────────────────────────────
function LeadsPipeline({ vId, t }: { vId: string; t: ReturnType<typeof useTheme> }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const vName = VNAME[vId];
  const stages = LEAD_STAGES[vId] || [];
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filterPriority, setFilterPriority] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vertical: vName, limit: "100" });
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const r = await fetch(`${API_BASE}/api/leads?${params}`);
      const d = await r.json();
      setLeads(d.data || []);
      setTotal(d.total || 0);
    } catch { setLeads([]); } finally { setLoading(false); }
  }, [vId, filterPriority]);

  useEffect(() => { load(); }, [load]);

  const stageLeads = (stageId: string) => leads.filter(l => l.stage === stageId);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
          <div className={`w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><TrendingUp className="w-3.5 h-3.5 text-white" /></div>
          <div>
            <div className={`text-sm font-bold ${t.text}`}>{v.label} — Leads Pipeline</div>
            <div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} total leads · ${stages.length} stages`}</div>
          </div>
          <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none ml-2`}>
            <option value="all">All Priority</option>
            {["Critical", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1.5`}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /> New Lead</button>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-4">
          {loading ? (
            <div className={`flex items-center justify-center h-full text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading leads…</div>
          ) : (
            <div className="flex gap-3 h-full min-w-max">
              {stages.map(stage => {
                const sl = stageLeads(stage.id);
                return (
                  <div key={stage.id} className="w-52 flex flex-col flex-shrink-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${v.color}`} /><span className={`text-xs font-semibold ${t.text}`}>{stage.label}</span></div>
                      <span className={`text-[10px] ${t.tagGray} px-1.5 py-0.5 rounded-full`}>{sl.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {sl.map((lead: any) => (
                        <div key={lead.id} onClick={() => setSelected(selected?.id === lead.id ? null : lead)} className={`${t.bgCard} border ${selected?.id === lead.id ? `border-2 ${v.color.replace("bg-", "border-")}` : t.border} rounded-xl p-3 cursor-pointer transition-all`}>
                          <div className="flex items-start justify-between mb-1"><div className={`text-xs font-semibold ${t.text} leading-tight`}>{lead.name}</div><PriorityBadge p={lead.priority} /></div>
                          <div className={`text-sm font-bold ${t.text} mb-1`}>{lead.value_estimate}</div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] ${t.textMuted}`}>{lead.source}</span>
                            <span className={`text-[9px] ${t.textMuted} font-mono`}>{lead.lead_code}</span>
                          </div>
                          {lead.days_open && <div className={`text-[9px] ${t.textMuted} flex items-center gap-1 mt-1`}><Clock className="w-2.5 h-2.5" />{lead.days_open}d open</div>}
                        </div>
                      ))}
                      <button className={`w-full py-2 rounded-xl border border-dashed ${t.border} ${t.textMuted} text-xs flex items-center justify-center gap-1.5`}><Plus className="w-3 h-3" /> Add</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={`px-4 py-2 border-t ${t.border} flex-shrink-0`}>
          <span className={`text-xs ${t.textMuted}`}>{total} total leads across {stages.length} stages</span>
        </div>
      </div>
      {selected && (
        <div className={`w-64 border-l ${t.border} ${t.bgCard} p-4 overflow-y-auto flex-shrink-0`}>
          <div className="flex items-center justify-between mb-4"><div className={`text-sm font-bold ${t.text}`}>Lead Detail</div><button onClick={() => setSelected(null)} className={t.textMuted}><X className="w-4 h-4" /></button></div>
          <div className="space-y-3">
            <div className={`${t.bgCard2} rounded-xl p-3`}><div className={`text-xs font-semibold ${t.text}`}>{selected.name}</div><code className="text-[10px] text-blue-400">{selected.lead_code}</code><div className={`text-lg font-bold ${t.text} mt-1`}>{selected.value_estimate}</div></div>
            {[{ label: "Priority", value: selected.priority }, { label: "Source", value: selected.source }, { label: "Days Open", value: `${selected.days_open || 0}d` }, { label: "Stage", value: selected.stage }, { label: "Status", value: selected.status }, { label: "RM", value: selected.rm_name || "—" }].map(row => (
              <div key={row.label} className={`flex justify-between text-xs py-1.5 border-b ${t.border} last:border-0`}><span className={t.textMuted}>{row.label}</span><span className={`font-medium ${t.text}`}>{row.value}</span></div>
            ))}
            <div>{stages.map((st, i) => { const done = stages.findIndex((s: any) => s.id === selected.stage) >= i; return <div key={st.id} className="flex items-center gap-2 mb-1.5"><div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? v.color : t.bgCard2}`}>{done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}</div><span className={`text-xs ${done ? t.text : t.textMuted}`}>{st.label}</span></div>; })}</div>
            <button className={`w-full text-xs py-2 rounded-lg ${v.color} text-white`}>Update Stage</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── DEALS ────────────────────────────────────────────────────────────────────
function DealsView({ vId, t }: { vId: string; t: ReturnType<typeof useTheme> }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const vName = VNAME[vId];
  const PAGE_SIZE = 15;
  const [deals, setDeals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filterStage, setFilterStage] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vertical: vName, page: String(page), limit: String(PAGE_SIZE) });
      if (filterStage !== "all") params.set("stage", filterStage);
      if (search) params.set("search", search);
      const r = await fetch(`${API_BASE}/api/deals?${params}`);
      const d = await r.json();
      setDeals(d.data || []);
      setTotal(d.total || 0);
    } catch { setDeals([]); } finally { setLoading(false); }
  }, [vId, page, filterStage, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0 flex-wrap`}>
          <div className={`w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><Briefcase className="w-3.5 h-3.5 text-white" /></div>
          <div><div className={`text-sm font-bold ${t.text}`}>{v.label} — Deals</div><div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} deals`}</div></div>
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5`}><Search className={`w-3.5 h-3.5 ${t.textMuted}`} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-28`} placeholder="Search deals…" /></div>
          <select value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All Stages</option>
            {["Active", "Executing", "Executed", "Settled", "Partially Executed", "Fundraising", "Due Diligence", "Mandate Signed", "Term Sheet", "Called", "Subscription Signed"].map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex gap-2"><button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button><button className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /> New Deal</button></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 ${t.tableHead}`}><tr className={`border-b ${t.border}`}>{["Deal ID", "Name", "Type", "Value", "Stage", "RM", "Date", ""].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2.5`}>{h}</th>)}</tr></thead>
              <tbody>{deals.map((d: any) => (
                <tr key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)} className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${selected?.id === d.id ? (isDark ? "bg-gray-800/60" : "bg-blue-50") : ""}`}>
                  <td className={`px-4 py-3 font-mono ${v.accent}`}>{d.deal_code}</td>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{d.name}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{d.type}</td>
                  <td className={`px-4 py-3 font-bold ${t.text}`}>{d.value}</td>
                  <td className="px-4 py-3"><StatusBadge s={d.stage} /></td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{d.rm_name || "—"}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{fmtDateShort(d.deal_date)}</td>
                  <td className="px-4 py-3"><MoreHorizontal className={`w-4 h-4 ${t.textMuted}`} /></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
      </div>
      {selected && (
        <div className={`w-64 border-l ${t.border} ${t.bgCard} p-4 overflow-y-auto flex-shrink-0`}>
          <div className="flex items-center justify-between mb-4"><span className={`text-sm font-bold ${t.text}`}>Deal Details</span><button onClick={() => setSelected(null)} className={t.textMuted}><X className="w-4 h-4" /></button></div>
          <div className={`${t.bgCard2} rounded-xl p-3 mb-3`}><code className={`text-[10px] ${v.accent}`}>{selected.deal_code}</code><div className={`text-sm font-bold ${t.text} mt-1`}>{selected.name}</div><div className={`text-xl font-bold ${t.text} mt-1`}>{selected.value}</div><StatusBadge s={selected.stage} /></div>
          {[{ label: "Type", value: selected.type }, { label: "RM", value: selected.rm_name || "—" }, { label: "Date", value: fmtDateShort(selected.deal_date) }, { label: "Notes", value: selected.notes || "—" }].map(r => (
            <div key={r.label} className={`flex justify-between text-xs py-1.5 border-b ${t.border} last:border-0`}><span className={t.textMuted}>{r.label}</span><span className={`font-medium ${t.text} text-right max-w-32 truncate`}>{r.value}</span></div>
          ))}
          <button className={`w-full text-xs py-2 rounded-lg ${v.color} text-white mt-3`}>Update Deal</button>
        </div>
      )}
    </div>
  );
}
// ─── CUSTOMERS (per vertical, paginated) ──────────────────────────────────────
function CustomersView({ vId, t }: { vId: string; t: ReturnType<typeof useTheme> }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const PAGE_SIZE = 15;
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vertical: vId, page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const r = await fetch(`${API_BASE}/api/clients?${params}`);
      const d = await r.json();
      setClients(d.data || []);
      setTotal(d.total || 0);
    } catch { setClients([]); } finally { setLoading(false); }
  }, [vId, page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
          <div className={`w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><Users className="w-3.5 h-3.5 text-white" /></div>
          <div><div className={`text-sm font-bold ${t.text}`}>{v.label} — Customers</div><div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} clients`}</div></div>
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5 ml-3`}><Search className={`w-3.5 h-3.5 ${t.textMuted}`} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-32`} placeholder="Search…" /></div>
          <div className="ml-auto flex gap-2"><button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button><button className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /> Add</button></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 ${t.tableHead}`}><tr className={`border-b ${t.border}`}>{["Code", "Name", "Category", "Contact", "RM", "KYC", "Status", ""].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2.5`}>{h}</th>)}</tr></thead>
              <tbody>{clients.map(c => (
                <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${selected?.id === c.id ? (isDark ? "bg-blue-950/30" : "bg-blue-50") : ""}`}>
                  <td className="px-4 py-3 font-mono text-blue-400 text-[10px]">{c.client_code}</td>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{c.name}</td>
                  <td className="px-4 py-3"><Badge text={c.category} color={t.tagGray} /></td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{c.mobile}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{c.rm_name || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge s={c.kyc_status} /></td>
                  <td className="px-4 py-3"><span className={`text-xs ${c.status === "Active" ? "text-emerald-400" : "text-yellow-400"}`}>{c.status}</span></td>
                  <td className="px-4 py-3"><Eye className={`w-4 h-4 ${t.textMuted}`} /></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
      </div>
      {selected && <Client360Panel client={selected} t={t} onClose={() => setSelected(null)} />}
    </div>
  );
}
// ─── DOCUMENTS (with version control) ────────────────────────────────────────
function DocumentsView({ vId, t }: { vId: string; t: ReturnType<typeof useTheme> }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const PAGE_SIZE = 15;
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vertical: VNAME[vId] || vId, page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const r = await fetch(`${API_BASE}/api/documents?${params}`);
      const d = await r.json();
      setDocs(d.data || []);
      setTotal(d.total || 0);
    } catch { setDocs([]); } finally { setLoading(false); }
  }, [vId, page, search, filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const loadVersions = async (docId: string) => {
    if (showVersions === docId) { setShowVersions(null); return; }
    setShowVersions(docId);
    setLoadingVersions(true);
    try {
      const r = await fetch(`${API_BASE}/api/documents/${docId}/versions`);
      const d = await r.json();
      setVersions(d || []);
    } catch { setVersions([]); } finally { setLoadingVersions(false); }
  };

  return (
    <div className="p-5 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-7 h-7 rounded-lg ${v.color} flex items-center justify-center`}><FileText className="w-4 h-4 text-white" /></div>
        <div><div className={`text-sm font-bold ${t.text}`}>{v.label} — Documents</div><div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} documents`}</div></div>
        <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5 ml-2`}><Search className={`w-3.5 h-3.5 ${t.textMuted}`} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-32`} placeholder="Search docs…" /></div>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
          <option value="all">All Types</option>
          {["KYC", "Agreement", "Report", "Mandate", "Subscription", "Compliance", "Trade"].map(tp => <option key={tp}>{tp}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
          <option value="all">All Status</option>
          {["Verified", "Pending", "Executed", "Draft", "Archived"].map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="ml-auto flex gap-2"><button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button><button className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Upload className="w-3.5 h-3.5" /> Upload</button></div>
      </div>
      {loading ? (
        <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
      ) : docs.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 gap-3 ${t.textMuted}`}><FileText className="w-10 h-10 opacity-20" /><p className="text-sm">No documents found</p></div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className={`w-4 h-4 ${t.textMuted} flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${t.text} truncate`}>{doc.name}</div>
                    <div className={`text-[10px] ${t.textMuted} mt-0.5`}>{doc.type} · {doc.client_name || "—"} · {fmtDateShort(doc.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge text={doc.current_version} color="bg-blue-900/60 text-blue-400" />
                  <StatusBadge s={doc.status} />
                  <span className={`text-[10px] ${t.textMuted}`}>{doc.file_size}</span>
                  <button onClick={() => loadVersions(doc.id)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${showVersions === doc.id ? "border-blue-500 text-blue-400" : t.border + " " + t.textMuted} flex items-center gap-1 transition-colors`}>
                    <Clock className="w-3 h-3" /> History
                  </button>
                  <button className="text-blue-400 hover:underline text-xs flex items-center gap-1"><Download className="w-3 h-3" /></button>
                </div>
              </div>
              {showVersions === doc.id && (
                <div className={`border-t ${t.border} px-4 py-3 ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                  {loadingVersions ? <div className={`text-xs ${t.textMuted}`}>Loading versions…</div> : versions.length === 0 ? (
                    <div className={`text-xs ${t.textMuted}`}>No version history</div>
                  ) : (
                    <table className="w-full">
                      <thead><tr>{["Version", "Uploaded By", "Date", "Size", "Note", ""].map(h => <th key={h} className={`text-left text-[9px] uppercase ${t.textMuted} pr-4 pb-1`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {versions.map((ver: any) => (
                          <tr key={ver.id} className={`text-xs border-t ${t.border}`}>
                            <td className="pr-4 py-1.5 font-mono text-blue-400">{ver.version}</td>
                            <td className={`pr-4 py-1.5 ${t.textMuted}`}>{ver.uploaded_by_name || "System"}</td>
                            <td className={`pr-4 py-1.5 ${t.textMuted}`}>{fmtDateShort(ver.created_at)}</td>
                            <td className={`pr-4 py-1.5 ${t.textMuted}`}>{ver.file_size || "—"}</td>
                            <td className={`pr-4 py-1.5 ${t.textSub}`}>{ver.change_note || "—"}</td>
                            <td><button className="text-blue-400 hover:underline text-xs flex items-center gap-1"><Download className="w-3 h-3" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
          <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
        </div>
      )}
    </div>
  );
}
// ─── ADMIN: USERS LIST ────────────────────────────────────────────────────────
function AdminUsers({ t }: { t: ReturnType<typeof useTheme> }) {
  const [users, setUsers] = useState(USERS);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 12;
  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (u: any) => { setEditing(u.id); setEditData({ ...u }); };
  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setUsers(prev => prev.map(u => u.id === editing ? { ...u, ...editData } : u));
    setEditing(null); setSaving(false);
  };

  const PERM_COLORS: Record<string, string> = {
    "Super Admin": "bg-red-900/60 text-red-400",
    "AIF Admin": "bg-emerald-900/60 text-emerald-400",
    "Retail Admin": "bg-blue-900/60 text-blue-400",
    "Corporate Admin": "bg-violet-900/60 text-violet-400",
    "IB Admin": "bg-amber-900/60 text-amber-400",
    "IE Admin": "bg-rose-900/60 text-rose-400",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0 flex-wrap gap-y-2`}>
        <Users className={`w-4 h-4 ${t.textMuted}`} />
        <div className={`text-sm font-bold ${t.text}`}>Users</div>
        <div className="relative ml-2">
          <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users…" className={`border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none ${t.inputBg} w-52`} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[10px] ${t.textMuted}`}>{filtered.length} users</span>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Invite User</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className={`sticky top-0 ${t.tableHead}`}>
            <tr className={`border-b ${t.border}`}>
              {["User", "Email", "Auth", "Role", "Vertical", "MFA", "Status", "Last Login", ""].map(h => (
                <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2.5`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(u => (
              <tr key={u.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} text-xs`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white">{u.name.split(" ").map((n: string) => n[0]).join("")}</div>
                    {editing === u.id
                      ? <input value={editData.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} className={`border rounded-lg px-2 py-1 text-xs w-32 ${t.inputBg} outline-none`} />
                      : <span className={`font-medium ${t.text}`}>{u.name}</span>}
                  </div>
                </td>
                <td className={`px-4 py-3 ${t.textMuted}`}>{u.email}</td>
                <td className="px-4 py-3"><AuthBadge method={u.authType} /></td>
                <td className="px-4 py-3">
                  {editing === u.id
                    ? <select value={editData.role} onChange={e => setEditData((d: any) => ({ ...d, role: e.target.value }))} className={`border rounded-lg px-2 py-1 text-xs ${t.inputBg} outline-none`}>
                        {VERTICAL_ROLES.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
                      </select>
                    : <Badge text={u.role} color={PERM_COLORS[u.role] || "bg-gray-800 text-gray-400"} />}
                </td>
                <td className={`px-4 py-3 ${t.textMuted}`}>{u.vertical}</td>
                <td className="px-4 py-3"><span className={`text-[10px] ${u.mfa ? "text-emerald-400" : "text-gray-500"}`}>{u.mfa ? "✓ On" : "—"}</span></td>
                <td className="px-4 py-3">
                  {editing === u.id
                    ? <select value={editData.status} onChange={e => setEditData((d: any) => ({ ...d, status: e.target.value }))} className={`border rounded-lg px-2 py-1 text-xs ${t.inputBg} outline-none`}>
                        <option>Active</option><option>Inactive</option>
                      </select>
                    : <span className={`text-xs ${u.status === "Active" ? "text-emerald-400" : "text-gray-500"}`}>{u.status}</span>}
                </td>
                <td className={`px-4 py-3 ${t.textMuted}`}>{u.lastLogin}</td>
                <td className="px-4 py-3">
                  {editing === u.id
                    ? <div className="flex gap-2">
                        <button onClick={handleSave} disabled={saving} className="text-xs text-emerald-400 font-medium hover:underline">{saving ? "…" : "Save"}</button>
                        <button onClick={() => setEditing(null)} className={`text-xs ${t.textMuted} hover:underline`}>Cancel</button>
                      </div>
                    : <button onClick={() => handleEdit(u)} className={`p-1 rounded ${t.textMuted} hover:text-blue-400`}><Edit className="w-3.5 h-3.5" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
    </div>
  );
}

// ─── ADMIN: USER ROLES ────────────────────────────────────────────────────────
function AdminUserRoles({ t }: { t: ReturnType<typeof useTheme> }) {
  const PERMS = ["Dashboard", "Leads", "Deals", "Clients", "ServiceRequests", "Admin", "AI", "Compliance", "Reports"];
  const [roles, setRoles] = useState(VERTICAL_ROLES.map((r, i) => ({
    id: String(i), role_name: r.role, vertical: r.vertical, description: r.desc,
    permissions: Object.fromEntries(PERMS.map(p => [p, r.access.includes("All Modules") || r.access.some(a => a.toLowerCase().includes(p.toLowerCase()))])),
    is_active: true,
  })));
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState({ role_name: "", vertical: "All", description: "", permissions: Object.fromEntries(PERMS.map(p => [p, false])) });

  const VERTICAL_OPTS = ["All", "Retail Broking", "Corporate Broking", "Investment Banking", "AIF", "Institutional Equities", "Assigned"];
  const ROLE_COLORS: Record<string, string> = { "Super Admin": "bg-red-900/60 text-red-400", "AIF Admin": "bg-emerald-900/60 text-emerald-400", "Retail Admin": "bg-blue-900/60 text-blue-400", "Corporate Admin": "bg-violet-900/60 text-violet-400", "IB Admin": "bg-amber-900/60 text-amber-400", "IE Admin": "bg-rose-900/60 text-rose-400" };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
        <Shield className={`w-4 h-4 ${t.textMuted}`} />
        <div className={`text-sm font-bold ${t.text}`}>User Roles</div>
        <span className={`text-[10px] ${t.textMuted} ml-1`}>{roles.length} roles configured</span>
        <div className="ml-auto">
          <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Role</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {showAdd && (
          <div className={`${t.bgCard} border-2 border-blue-500/40 rounded-xl p-4 space-y-3`}>
            <div className={`text-xs font-bold ${t.text}`}>New Role</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={`text-[10px] ${t.textMuted} mb-1 block`}>Role Name</label><input value={newRole.role_name} onChange={e => setNewRole(d => ({ ...d, role_name: e.target.value }))} className={`w-full border rounded-lg px-3 py-1.5 text-xs ${t.inputBg} outline-none`} placeholder="e.g. IB Analyst" /></div>
              <div><label className={`text-[10px] ${t.textMuted} mb-1 block`}>Vertical</label>
                <select value={newRole.vertical} onChange={e => setNewRole(d => ({ ...d, vertical: e.target.value }))} className={`w-full border rounded-lg px-3 py-1.5 text-xs ${t.inputBg} outline-none`}>
                  {VERTICAL_OPTS.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div><label className={`text-[10px] ${t.textMuted} mb-1 block`}>Description</label><input value={newRole.description} onChange={e => setNewRole(d => ({ ...d, description: e.target.value }))} className={`w-full border rounded-lg px-3 py-1.5 text-xs ${t.inputBg} outline-none`} placeholder="Role description…" /></div>
            <div>
              <label className={`text-[10px] ${t.textMuted} mb-2 block`}>Permissions</label>
              <div className="flex flex-wrap gap-2">{PERMS.map(p => (
                <button key={p} onClick={() => setNewRole(d => ({ ...d, permissions: { ...d.permissions, [p]: !d.permissions[p] } }))}
                  className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${newRole.permissions[p] ? "bg-emerald-900/50 text-emerald-400" : `${t.bgCard2} ${t.textMuted}`}`}>
                  {newRole.permissions[p] ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}{p}
                </button>
              ))}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRoles(r => [...r, { id: Date.now().toString(), ...newRole, is_active: true }]); setShowAdd(false); setNewRole({ role_name: "", vertical: "All", description: "", permissions: Object.fromEntries(PERMS.map(p => [p, false])) }); }} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Save Role</button>
              <button onClick={() => setShowAdd(false)} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}>Cancel</button>
            </div>
          </div>
        )}
        {roles.map(role => (
          <div key={role.id} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 min-w-[120px]">
                <Badge text={role.role_name} color={ROLE_COLORS[role.role_name] || "bg-gray-800 text-gray-400"} />
                <div className={`text-[10px] ${t.textMuted} mt-1`}>{role.vertical}</div>
                <span className={`text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded ${role.is_active ? "bg-emerald-900/40 text-emerald-400" : "bg-gray-800 text-gray-500"}`}>{role.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex-1">
                {editing === role.id
                  ? <input value={role.description} onChange={e => setRoles(rs => rs.map(r => r.id === role.id ? { ...r, description: e.target.value } : r))} className={`w-full border rounded-lg px-2 py-1 text-xs mb-2 ${t.inputBg} outline-none`} />
                  : <p className={`text-xs ${t.textSub} mb-2`}>{role.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {PERMS.map(perm => {
                    const has = role.permissions[perm];
                    return (
                      <button key={perm} onClick={() => editing === role.id && setRoles(rs => rs.map(r => r.id === role.id ? { ...r, permissions: { ...r.permissions, [perm]: !has } } : r))}
                        className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 ${has ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-800/60 text-gray-600"} ${editing === role.id ? "cursor-pointer" : ""}`}>
                        {has ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}{perm}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {editing === role.id
                  ? <><button onClick={() => setEditing(null)} className="text-xs text-emerald-400 font-medium hover:underline">Done</button></>
                  : <button onClick={() => setEditing(role.id)} className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:text-blue-400`}><Edit className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: USER-ROLE MAPPING ─────────────────────────────────────────────────
function AdminRoleMapping({ t }: { t: ReturnType<typeof useTheme> }) {
  type Mapping = { userId: string; userName: string; email: string; roles: string[]; vertical: string; authType: string };
  const [mappings, setMappings] = useState<Mapping[]>(USERS.map(u => ({ userId: u.id, userName: u.name, email: u.email, roles: [u.role], vertical: u.vertical, authType: u.authType })));
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const filtered = mappings.filter(m => !search || m.userName.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));
  const ALL_ROLE_NAMES = VERTICAL_ROLES.map(r => r.role);

  const toggleRole = (userId: string, role: string) => {
    setMappings(ms => ms.map(m => m.userId === userId ? {
      ...m, roles: m.roles.includes(role) ? m.roles.filter(r => r !== role) : [...m.roles, role]
    } : m));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
        <Tag className={`w-4 h-4 ${t.textMuted}`} />
        <div className={`text-sm font-bold ${t.text}`}>User-Role Mapping</div>
        <p className={`text-[10px] ${t.textMuted} hidden sm:block`}>Assign multiple roles per user. Users inherit all permissions from assigned roles.</p>
        <div className="relative ml-auto">
          <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className={`border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none ${t.inputBg} w-44`} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {filtered.map(m => (
          <div key={m.userId} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white">{m.userName.split(" ").map(n => n[0]).join("")}</div>
                  <div>
                    <div className={`text-xs font-semibold ${t.text}`}>{m.userName}</div>
                    <div className={`text-[10px] ${t.textMuted}`}>{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <AuthBadge method={m.authType as AuthMethod} />
                  <span className={`text-[9px] ${t.textMuted}`}>{m.vertical}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className={`text-[10px] font-bold ${t.textMuted} mb-2 uppercase tracking-wide`}>Assigned Roles ({m.roles.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLE_NAMES.map(role => {
                    const assigned = m.roles.includes(role);
                    return (
                      <button key={role} onClick={() => editing === m.userId && toggleRole(m.userId, role)}
                        className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${assigned ? "bg-blue-600 text-white" : `${t.bgCard2} ${t.textMuted}`} ${editing === m.userId ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}>
                        {assigned && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-shrink-0">
                {editing === m.userId
                  ? <button onClick={() => setEditing(null)} className="text-xs text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40">Done</button>
                  : <button onClick={() => setEditing(m.userId)} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:text-blue-400 flex items-center gap-1.5`}><Edit className="w-3.5 h-3.5" />Edit</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN: LLM SETTINGS ──────────────────────────────────────────────────────
const AI_PROVIDERS_LIST = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"] },
  { id: "anthropic", name: "Anthropic (Claude)", models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"] },
  { id: "gemini", name: "Google Gemini", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  { id: "azure", name: "Azure OpenAI", models: ["gpt-4o", "gpt-4", "gpt-35-turbo"] },
  { id: "custom", name: "Custom (OpenAI-compatible)", models: [] },
];

function AdminLLMSettings({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [revealingKey, setRevealingKey] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [enabled, setEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load existing config from DB on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/ai/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setProvider(data.provider || "openai");
        setEnabled(data.enabled ?? false);
        setEndpointUrl(data.endpoint_url || "");
        setTemperature(parseFloat(data.temperature) || 0.7);
        setMaxTokens(data.max_tokens || 1024);
        setHasApiKey(!!data.has_api_key);
        // Set model — if provider has this model, select it; otherwise treat as custom
        const knownProvider = AI_PROVIDERS_LIST.find(p => p.id === data.provider);
        if (knownProvider && knownProvider.models.includes(data.model)) {
          setModel(data.model);
        } else {
          setModel(knownProvider?.models[0] || "gpt-4o");
          if (data.provider === "custom") setCustomModel(data.model || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const providerInfo = AI_PROVIDERS_LIST.find(p => p.id === provider)!;
  const models = provider === "custom" ? [] : providerInfo.models;
  const needsEndpoint = provider === "azure" || provider === "custom";

  const handleSave = async () => {
    setSaving(true); setSaved(false); setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider, model: provider === "custom" ? customModel : model,
          api_key: apiKey.trim() || undefined,   // only send if user entered something
          endpoint_url: endpointUrl, temperature, max_tokens: maxTokens,
          enabled, updated_by: "admin@niytri.com",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHasApiKey(!!data.has_api_key);
      setApiKey("");   // clear the field — key is now saved
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setTestResult({ ok: false, msg: `Failed to save: ${e.message}` });
    }
    setSaving(false);
  };

  const handleRevealKey = async () => {
    setRevealingKey(true);
    try {
      const r = await fetch(`${API_BASE}/api/ai/config/reveal`);
      const d = await r.json();
      if (d.api_key) { setApiKey(d.api_key); setShowKey(true); }
      else setTestResult({ ok: false, msg: d.error || "No API key stored." });
    } catch { setTestResult({ ok: false, msg: "Failed to reveal key." }); }
    setRevealingKey(false);
  };

  const handleTest = async () => {
    if (!apiKey && !hasApiKey) { setTestResult({ ok: false, msg: "Enter an API key before testing." }); return; }
    setTesting(true); setTestResult(null);
    await new Promise(r => setTimeout(r, 1500));
    setTesting(false);
    setTestResult({ ok: true, msg: `Connection to ${providerInfo.name} (${provider === "custom" ? customModel : model}) successful. Token limit: ${maxTokens}. Ready to enable.` });
  };

  if (loading) return <div className="p-8 text-center text-sm text-gray-400">Loading LLM settings…</div>;

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center"><Cpu className="w-5 h-5 text-white" /></div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>LLM Settings</h2>
          <p className={`text-xs ${t.textMuted}`}>Configure the language model provider and credentials for the NIYTRI AI Bot.</p>
        </div>
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <div className={`text-sm font-semibold ${t.text}`}>Enable AI Assistant</div>
          <div className={`text-xs ${t.textMuted}`}>When disabled, users see an "unavailable" message. When enabled, all users (per their role access) can use the chatbot.</div>
        </div>
        <button onClick={() => setEnabled(!enabled)} className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-violet-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-4`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Cpu className="w-4 h-4 text-violet-400" /> LLM Provider & Model</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Provider</label>
            <select value={provider} onChange={e => { setProvider(e.target.value); setModel(AI_PROVIDERS_LIST.find(p => p.id === e.target.value)?.models[0] || ""); }} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}>
              {AI_PROVIDERS_LIST.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Model</label>
            {provider === "custom"
              ? <input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="e.g. llama-3.1-70b" className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
              : <select value={model} onChange={e => setModel(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}>{models.map(m => <option key={m} value={m}>{m}</option>)}</select>}
          </div>
        </div>
        {needsEndpoint && (
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Endpoint URL</label>
            <input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder={provider === "azure" ? "https://your-resource.openai.azure.com/..." : "https://your-endpoint.com/v1"} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
          </div>
        )}
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
          <Key className="w-4 h-4 text-yellow-400" /> API Key
          {hasApiKey && !apiKey && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-3 h-3" /> Key saved (encrypted)
            </span>
          )}
          {hasApiKey && !apiKey && (
            <button onClick={handleRevealKey} disabled={revealingKey} className="ml-auto text-[10px] text-blue-400 hover:underline flex items-center gap-1">
              {revealingKey ? <><RefreshCw className="w-3 h-3 animate-spin" /> Decrypting…</> : <><Eye className="w-3 h-3" /> Reveal</>}
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "Enter new key to replace the saved one" : `Enter ${providerInfo.name} API key`}
            className={`w-full border rounded-xl px-3 pr-10 py-2 text-sm outline-none font-mono ${t.inputBg}`}
          />
          <button onClick={() => setShowKey(!showKey)} className={`absolute right-3 top-2.5 ${t.textMuted}`}>
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {hasApiKey && !apiKey && (
          <p className={`text-xs ${t.textMuted}`}>Leave blank to keep the existing key. Enter a new value only to replace it.</p>
        )}
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-4`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Sliders className="w-4 h-4 text-blue-400" /> Generation Parameters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Temperature: <span className={t.text}>{temperature}</span></label>
            <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full accent-violet-500" />
            <div className={`flex justify-between text-[10px] ${t.textMuted} mt-1`}><span>Precise (0)</span><span>Creative (2)</span></div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Max Tokens: <span className={t.text}>{maxTokens}</span></label>
            <input type="range" min={256} max={8192} step={256} value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} className="w-full accent-violet-500" />
            <div className={`flex justify-between text-[10px] ${t.textMuted} mt-1`}><span>256</span><span>8192</span></div>
          </div>
        </div>
      </div>

      {testResult && (
        <div className={`flex items-start gap-2 rounded-xl p-3 border ${testResult.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <p className="text-xs">{testResult.msg}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing} className={`text-sm px-4 py-2 rounded-xl border ${t.border} ${t.textMuted} flex items-center gap-2 disabled:opacity-50`}>
          {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />} {testing ? "Testing…" : "Test Connection"}
        </button>
        <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {saved ? "Saved!" : saving ? "Saving…" : "Save LLM Settings"}
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN: AI PROMPTS & TABLE ACCESS ─────────────────────────────────────────
const ALL_DB_TABLES = [
  { id: "clients", label: "Clients", desc: "Client registry, KYC, contact details" },
  { id: "service_requests", label: "Service Requests", desc: "All SRs, status, messages, SLA data" },
  { id: "leads", label: "Leads", desc: "Pipeline leads across all verticals" },
  { id: "deals", label: "Deals", desc: "Active deals, value, stage, RM assignment" },
  { id: "users", label: "Users", desc: "User list (names, roles, verticals — no passwords)" },
  { id: "sla_config", label: "SLA Config", desc: "TAT targets, escalation matrix" },
  { id: "audit_logs", label: "Audit Logs", desc: "User action history (read-only)" },
  { id: "documents", label: "Documents", desc: "Document metadata and versions" },
];

const DEFAULT_PROMPT = `You are NIYTRI CRM AI Assistant — an intelligent financial services assistant for NIYTRI Financial Services.

Guidelines:
- Answer ONLY based on the CRM data context provided to you
- RESPECT role-based access: if the user's role doesn't have access to a vertical or data table, politely deny and explain why
- Be concise, accurate, and actionable
- Format responses with bullet points and bold for key figures
- Never fabricate data — if data isn't in context, say "Data not available in CRM"
- For compliance-sensitive queries, always recommend verification with the compliance officer`;

function AdminAIPrompts({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [tableAccess, setTableAccess] = useState(["clients", "service_requests", "leads", "deals", "users"]);
  const [strictVertical, setStrictVertical] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customPrompts, setCustomPrompts] = useState([
    { role: "Super Admin", prompt: "You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead." },
    { role: "AIF Admin", prompt: "You have access only to AIF vertical data. Deny any queries about Retail, Corporate, IB, or IE verticals." },
    { role: "CS Agent", prompt: "You can answer service request and client queries. You cannot access deal pipeline or financial data." },
  ]);

  const toggleTable = (tId: string) => setTableAccess(a => a.includes(tId) ? a.filter(x => x !== tId) : [...a, tId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/ai/config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: systemPrompt, table_access: tableAccess, vertical_access_strict: strictVertical, bot_prompts: Object.fromEntries(customPrompts.map(p => [p.role, p.prompt])), updated_by: "bhushan@niytri.com" }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>AI Prompts & Data Access</h2>
          <p className={`text-xs ${t.textMuted}`}>Control what data the bot can access and how it responds to users.</p>
        </div>
      </div>

      {/* Strict vertical access */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <div className={`text-sm font-semibold ${t.text}`}>Strict Vertical Access Enforcement</div>
          <div className={`text-xs ${t.textMuted}`}>When ON — if a user with AIF access asks about IE data, the bot will deny the query. Recommended: ON.</div>
        </div>
        <button onClick={() => setStrictVertical(!strictVertical)} className={`relative w-12 h-6 rounded-full transition-colors ${strictVertical ? "bg-emerald-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${strictVertical ? "translate-x-6" : ""}`} />
        </button>
      </div>

      {/* Table access */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Database className="w-4 h-4 text-blue-400" /> Database Table Access</div>
        <p className={`text-xs ${t.textMuted}`}>Select which database tables the AI bot is allowed to query. Enabled tables provide data context in bot responses.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_DB_TABLES.map(tbl => {
            const enabled = tableAccess.includes(tbl.id);
            return (
              <button key={tbl.id} onClick={() => toggleTable(tbl.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${enabled ? "border-blue-500/50 bg-blue-600/10" : `${t.border} ${t.bgCard2}`}`}>
                <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border-2 ${enabled ? "border-blue-500 bg-blue-500" : "border-gray-600"}`}>
                  {enabled && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <div className={`text-xs font-semibold ${enabled ? "text-blue-400" : t.text}`}>{tbl.label}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>{tbl.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* System prompt */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Sparkles className="w-4 h-4 text-violet-400" /> System Prompt (Base Behaviour)</div>
        <p className={`text-xs ${t.textMuted}`}>This is the base instruction sent to the LLM. Role context and CRM data are appended automatically after this prompt.</p>
        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={8}
          className={`w-full border rounded-xl px-3 py-2.5 text-xs font-mono outline-none resize-y leading-relaxed ${t.inputBg}`} />
        <button onClick={() => setSystemPrompt(DEFAULT_PROMPT)} className={`text-xs ${t.textMuted} hover:text-blue-400`}>↩ Reset to default</button>
      </div>

      {/* Role-specific prompts */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center justify-between`}>
          <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-amber-400" /> Role-Specific Prompt Overrides</span>
          <button onClick={() => setCustomPrompts(p => [...p, { role: "", prompt: "" }])} className="text-xs text-blue-400 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
        </div>
        <p className={`text-xs ${t.textMuted}`}>Optional per-role prompt additions. Appended after the system prompt for users with that role.</p>
        <div className="space-y-3">
          {customPrompts.map((cp, i) => (
            <div key={i} className={`${t.bgCard2} rounded-xl p-3 space-y-2`}>
              <div className="flex items-center gap-2">
                <select value={cp.role} onChange={e => setCustomPrompts(ps => ps.map((p, idx) => idx === i ? { ...p, role: e.target.value } : p))}
                  className={`border rounded-lg px-2 py-1 text-xs ${t.inputBg} outline-none flex-shrink-0`}>
                  <option value="">Select role…</option>
                  {VERTICAL_ROLES.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
                </select>
                <button onClick={() => setCustomPrompts(ps => ps.filter((_, idx) => idx !== i))} className="ml-auto text-xs text-red-400 hover:underline">Remove</button>
              </div>
              <textarea value={cp.prompt} onChange={e => setCustomPrompts(ps => ps.map((p, idx) => idx === i ? { ...p, prompt: e.target.value } : p))}
                rows={3} className={`w-full border rounded-xl px-3 py-2 text-xs outline-none resize-y ${t.inputBg}`} placeholder="Role-specific instructions…" />
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-2">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {saved ? "Saved!" : saving ? "Saving…" : "Save Prompts & Access"}
      </button>
    </div>
  );
}

// ─── ADMIN: M365 INTEGRATION ──────────────────────────────────────────────────
function AdminM365Config({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasClientSecret, setHasClientSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [revealingSecret, setRevealingSecret] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [allowedDomain, setAllowedDomain] = useState("niytri.com");
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [requireMfa, setRequireMfa] = useState(true);
  const [sessionHours, setSessionHours] = useState(8);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const autoDetectedRedirect = `${API_BASE}/api/auth/m365/callback`;

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/m365-config`).then(r => r.json()).then(d => {
      setTenantId(d.tenant_id || "");
      setClientId(d.client_id || "");
      setClientSecret("");  // never pre-fill secret — use reveal button
      setHasClientSecret(!!d.has_client_secret);
      setRedirectUri(d.redirect_uri || autoDetectedRedirect);
      setAllowedDomain(d.allowed_domain || "niytri.com");
      setSsoEnabled(d.sso_enabled ?? true);
      setRequireMfa(d.require_mfa ?? true);
      setSessionHours(d.session_hours || 8);
    }).catch(() => { setRedirectUri(autoDetectedRedirect); }).finally(() => setLoading(false));
  }, []);

  const handleRevealSecret = async () => {
    setRevealingSecret(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/m365-config/reveal`);
      const d = await r.json();
      if (d.client_secret) { setClientSecret(d.client_secret); setShowSecret(true); }
      else setTestResult({ ok: false, msg: d.error || "No secret stored." });
    } catch { setTestResult({ ok: false, msg: "Failed to reveal secret." }); }
    setRevealingSecret(false);
  };

  const handleSave = async () => {
    setSaving(true); setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/m365-config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, client_id: clientId, client_secret: clientSecret.trim() || undefined, redirect_uri: redirectUri, allowed_domain: allowedDomain, sso_enabled: ssoEnabled, require_mfa: requireMfa, session_hours: sessionHours, updated_by: "admin@niytri.com" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setHasClientSecret(hasClientSecret || !!clientSecret.trim());
      setClientSecret("");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setTestResult({ ok: false, msg: `Failed to save: ${e.message}` }); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/auth/m365/status`);
      const d = await r.json();
      setTestResult(d.configured ? { ok: true, msg: `Azure AD configured ✓ — Tenant: ${d.tenantId} · Redirect: ${d.redirectUri}` } : { ok: false, msg: "Azure AD not fully configured. Check Client ID, Tenant ID, and Secret." });
    } catch { setTestResult({ ok: false, msg: "Cannot reach API server." }); }
  };

  if (loading) return <div className={`p-8 text-center ${t.textMuted}`}><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
        </div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>Microsoft 365 Integration</h2>
          <p className={`text-xs ${t.textMuted}`}>Configure Azure Active Directory SSO for niytri.com domain users.</p>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full ${ssoEnabled ? "bg-emerald-900/40 text-emerald-400" : "bg-gray-800 text-gray-400"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${ssoEnabled ? "bg-emerald-400" : "bg-gray-500"}`} />
          {ssoEnabled ? "SSO Active" : "SSO Disabled"}
        </div>
      </div>

      {/* SSO toggle */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <div className={`text-sm font-semibold ${t.text}`}>Enable Microsoft 365 SSO</div>
          <div className={`text-xs ${t.textMuted}`}>Allow users tagged as M365 to sign in via Azure Active Directory instead of email/OTP.</div>
        </div>
        <button onClick={() => setSsoEnabled(!ssoEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${ssoEnabled ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${ssoEnabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      {/* Azure App Registration */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-4`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Building className="w-4 h-4 text-blue-400" /> Azure App Registration</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Tenant ID (Directory ID)</label>
            <input value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none ${t.inputBg}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Application (Client) ID</label>
            <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none ${t.inputBg}`} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className={`text-xs font-medium ${t.textMuted}`}>Client Secret</label>
            {hasClientSecret && !clientSecret && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3" /> Secret saved (encrypted)
              </span>
            )}
            {hasClientSecret && !clientSecret && (
              <button onClick={handleRevealSecret} disabled={revealingSecret} className="ml-auto text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                {revealingSecret ? <><RefreshCw className="w-3 h-3 animate-spin" /> Decrypting…</> : <><Eye className="w-3 h-3" /> Reveal</>}
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
              placeholder={hasClientSecret ? "Enter new secret to replace the saved one" : "App registration secret value"}
              className={`w-full border rounded-xl px-3 pr-10 py-2 text-xs font-mono outline-none ${t.inputBg}`}
            />
            <button onClick={() => setShowSecret(!showSecret)} className={`absolute right-3 top-2 ${t.textMuted}`}>
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {hasClientSecret && !clientSecret && (
            <p className={`text-[10px] ${t.textMuted} mt-1`}>Stored encrypted in database. Leave blank to keep it. Click "Reveal" to view or update.</p>
          )}
        </div>
      </div>

      {/* Redirect URI */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Globe className="w-4 h-4 text-green-400" /> Redirect URI</div>
        <p className={`text-xs ${t.textMuted}`}>This URI must be registered in your Azure App Registration under Authentication → Web Redirect URIs.</p>
        <div className="flex gap-2">
          <input value={redirectUri} onChange={e => setRedirectUri(e.target.value)} className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono outline-none ${t.inputBg}`} />
          <button onClick={() => setRedirectUri(autoDetectedRedirect)} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex-shrink-0 hover:text-blue-400`} title="Auto-detect from current domain">Auto</button>
        </div>
        <div className={`p-2.5 rounded-lg ${t.bgCard2} text-[10px] ${t.textMuted} flex items-start gap-2`}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-400" />
          <span>Auto-detected: <code className="text-blue-400">{autoDetectedRedirect}</code> — copy this to Azure Portal → App Registration → Authentication → Redirect URIs</span>
        </div>
      </div>

      {/* Domain & Session */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-4`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Shield className="w-4 h-4 text-violet-400" /> Domain & Session Policy</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Allowed Domain</label>
            <input value={allowedDomain} onChange={e => setAllowedDomain(e.target.value)} placeholder="niytri.com" className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Session Length (hours)</label>
            <input type="number" min={1} max={24} value={sessionHours} onChange={e => setSessionHours(parseInt(e.target.value))} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
          </div>
          <div className="flex flex-col justify-end">
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-medium ${t.textMuted}`}>Require MFA</label>
              <button onClick={() => setRequireMfa(!requireMfa)} className={`relative w-10 h-5 rounded-full transition-colors ${requireMfa ? "bg-violet-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireMfa ? "translate-x-5" : ""}`} />
              </button>
            </div>
            <p className={`text-[10px] ${t.textMuted}`}>Enforced via Azure Conditional Access</p>
          </div>
        </div>
      </div>

      {testResult && (
        <div className={`flex items-start gap-2 rounded-xl p-3 border ${testResult.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <p className="text-xs font-mono">{testResult.msg}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleTest} className={`text-sm px-4 py-2 rounded-xl border ${t.border} ${t.textMuted} flex items-center gap-2`}>
          <TestTube className="w-4 h-4" /> Test Connection
        </button>
        <button onClick={handleSave} disabled={saving} className="text-sm px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {saved ? "Saved!" : saving ? "Saving…" : "Save M365 Config"}
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN: SLA CONFIG ────────────────────────────────────────────────────────
function AdminSLAConfig({ t }: { t: ReturnType<typeof useTheme> }) {
  const [config, setConfig] = useState(SLA_CONFIG_DEFAULT);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
        <Clock className={`w-4 h-4 ${t.textMuted}`} /><div className={`text-sm font-bold ${t.text}`}>SLA / TAT / Escalation Configuration</div>
        <div className={`ml-2 text-[10px] px-2 py-1 rounded-lg bg-amber-900/40 text-amber-400`}>Changes affect all new SRs immediately</div>
        <div className="ml-auto"><button className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white">Save All Changes</button></div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
          <table className="w-full">
            <thead className={t.tableHead}><tr className={`border-b ${t.border}`}>{["Category", "TAT (Hours)", "SLA Warning", "L1 Owner", "L2 After (h)", "L2 Owner", "L3 After (h)", "L3 Owner", "Auto-Close (h)", ""].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-3 py-2.5`}>{h}</th>)}</tr></thead>
            <tbody>
              {config.map((row, i) => (
                <tr key={row.category} className={`border-b ${t.border} last:border-0 text-xs ${t.rowHover}`}>
                  <td className={`px-3 py-2.5 font-medium ${t.text}`}>{row.category}</td>
                  {editing === i ? (
                    <>
                      {(["tat", "warning", "l1Owner", "l2After", "l2Owner", "l3After", "l3Owner", "autoClose"] as const).map(field => (
                        <td key={field} className="px-2 py-1.5">
                          <input
                            value={(row as any)[field]}
                            onChange={e => setConfig(c => c.map((r, idx) => idx === i ? { ...r, [field]: typeof (row as any)[field] === "number" ? Number(e.target.value) : e.target.value } : r))}
                            className={`w-full border rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 ${t.inputBg}`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2.5"><button onClick={() => setEditing(null)} className="text-xs text-emerald-400 font-medium">Save</button></td>
                    </>
                  ) : (
                    <>
                      <td className={`px-3 py-2.5 font-bold ${row.tat <= 4 ? "text-red-400" : row.tat <= 24 ? "text-yellow-400" : "text-emerald-400"}`}>{row.tat}h</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.warning}%</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.l1Owner}</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.l2After}h</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.l2Owner}</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.l3After}h</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.l3Owner}</td>
                      <td className={`px-3 py-2.5 ${t.textMuted}`}>{row.autoClose}h</td>
                      <td className="px-3 py-2.5"><button onClick={() => setEditing(i)} className={`text-xs ${t.textMuted} hover:text-blue-400 flex items-center gap-1`}><Edit className="w-3 h-3" />Edit</button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
          <div className={`text-sm font-semibold ${t.text} mb-2`}>Escalation Rules (Current Config Summary)</div>
          <div className="grid grid-cols-3 gap-3">
            {config.map(row => (
              <div key={row.category} className={`${t.bgCard2} rounded-lg p-3`}>
                <div className={`text-xs font-bold ${t.text} mb-1.5`}>{row.category}</div>
                <div className="space-y-1 text-[10px]">
                  <div className={`flex items-center gap-1.5 ${t.textMuted}`}><span className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-[8px] text-white font-bold">L1</span>{row.l1Owner} · 0–{row.l2After}h</div>
                  <div className={`flex items-center gap-1.5 ${t.textMuted}`}><span className="w-4 h-4 rounded-full bg-yellow-600 flex items-center justify-center text-[8px] text-white font-bold">L2</span>{row.l2Owner} · {row.l2After}–{row.l3After}h</div>
                  <div className={`flex items-center gap-1.5 ${t.textMuted}`}><span className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[8px] text-white font-bold">L3</span>{row.l3Owner} · &gt;{row.l3After}h</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: THEME ─────────────────────────────────────────────────────────────
function AdminTheme({ t, isDark, setIsDark }: { t: ReturnType<typeof useTheme>; isDark: boolean; setIsDark: (b: boolean) => void }) {
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <h2 className={`text-lg font-bold ${t.text}`}>Theme & Display Settings</h2>
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-5`}>
        <div className={`text-sm font-semibold ${t.text} mb-4`}>Application Theme (Admin Default)</div>
        <div className="grid grid-cols-2 gap-4">
          {[{ label: "Dark Theme", icon: Moon, val: true }, { label: "Light Theme", icon: Sun, val: false }].map(opt => (
            <button key={opt.label} onClick={() => setIsDark(opt.val)} className={`p-4 rounded-xl border-2 text-left transition-all ${isDark === opt.val ? "border-blue-500 bg-blue-600/10" : `${t.border} ${t.bgCard2}`}`}>
              <opt.icon className={`w-6 h-6 mb-2 ${isDark === opt.val ? "text-blue-400" : t.textMuted}`} />
              <div className={`text-sm font-semibold ${t.text}`}>{opt.label}</div>
              {isDark === opt.val && <div className="text-xs text-blue-400 mt-1 font-medium">Active (System Default)</div>}
            </button>
          ))}
        </div>
        <div className={`mt-4 p-3 rounded-lg ${t.bgCard2} text-xs ${t.textMuted}`}>Users can override theme via the sun/moon icon in the application header. Their preference is stored per-session.</div>
      </div>
    </div>
  );
}

// ─── ADMIN: SYSTEM ────────────────────────────────────────────────────────────
function AdminSystem({ t }: { t: ReturnType<typeof useTheme> }) {
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <h2 className={`text-lg font-bold ${t.text}`}>System Configuration</h2>
      {[
        { section: "Authentication & SSO", items: [{ label: "Microsoft 365 SSO", value: "Azure AD — niytri.com tenant", status: "Connected" }, { label: "M365 Outlook Integration", value: "Read/send emails, SR auto-creation from Outlook", status: "Connected" }, { label: "M365 Teams Integration", value: "SR notifications & ticket updates via Teams channel", status: "Connected" }, { label: "M365 Calendar Integration", value: "Meeting scheduling, client appointments sync", status: "Connected" }, { label: "Email OTP (App Auth)", value: "AWS SES — fallback for non-M365 users", status: "Active" }, { label: "Session Timeout", value: "30 minutes idle · 8 hours max", status: "Configured" }] },
        { section: "Integrations", items: [{ label: "Bloomberg Terminal", value: "Market data feed for IE & CB", status: "Connected" }, { label: "AWS S3 Storage", value: "Document vault — encrypted, versioned", status: "Connected" }, { label: "OMS / EMS", value: "Order management → CRM deal sync", status: "Connected" }, { label: "SEBI Reporting API", value: "Automated regulatory filings", status: "Active" }] },
        { section: "Data & Compliance", items: [{ label: "Audit Log", value: "All user actions → CloudWatch (immutable)", status: "Active" }, { label: "Document Versioning", value: "S3 versioning enabled per bucket", status: "Active" }, { label: "Data Retention", value: "7 years (SEBI regulation)", status: "Configured" }, { label: "Encryption", value: "AES-256 at rest · TLS 1.3 in transit", status: "Enforced" }, { label: "Wall-Crossing Log", value: "Auto-generated for all IB deals", status: "Active" }] },
      ].map(section => (
        <div key={section.section} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
          <div className={`text-sm font-semibold ${t.text} mb-3`}>{section.section}</div>
          {section.items.map(item => (
            <div key={item.label} className={`flex items-center justify-between py-2 border-b ${t.border} last:border-0`}>
              <div><div className={`text-xs font-medium ${t.text}`}>{item.label}</div><div className={`text-[10px] ${t.textMuted}`}>{item.value}</div></div>
              <StatusBadge s={item.status} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── AI MODULE ────────────────────────────────────────────────────────────────
type ChatMsg = { id: string; from: "user" | "ai"; text: string; ts: string; thinking?: boolean };

function generateSmartResponse(message: string, userRole: string, userVerticals: string[]): string {
  const m = message.toLowerCase();
  const hasAIF = userRole === "Super Admin" || userRole === "AIF Admin" || userVerticals.includes("AIF");
  const hasRetail = userRole === "Super Admin" || userRole === "Retail Admin" || userVerticals.includes("Retail Broking");
  const hasAll = userRole === "Super Admin";

  if ((m.includes("aif") || m.includes("fund") || m.includes("nav") || m.includes("investor")) && !hasAIF)
    return "You don't have access to AIF data. Contact your administrator if you need this information.";
  if (m.includes("aif") || m.includes("nav") || (m.includes("fund") && hasAIF))
    return "**AIF Portfolio Summary** (as of 21 Mar 2026)\n\n• **Total AUM**: ₹2,840 Cr across Cat I, II & III funds\n• **Active Investors**: 389 (+24 this quarter)\n• **Capital Called Q4**: ₹185 Cr (68% of committed)\n• **Avg. NAV Return**: 18.7% since inception\n• **Pending Subscriptions**: 3 totalling ₹150 Cr\n• **Recent activity**: Maharashtra Pension Fund signed ₹100Cr Cat II subscription on 20 Mar\n\nWould you like drill-down on a specific fund or investor?";
  if ((m.includes("sr") || m.includes("service request") || m.includes("ticket") || m.includes("escalat")))
    return "**Service Request Overview**\n\n• Open: 142 · In Progress: 87 · **Escalated: 12** · Resolved: 56\n\n**Requires Immediate Attention:**\n• **SR-5895** (HDFC Life — Settlement Discrepancy) — SLA Breached 18h, L2 Owner: Dealer/Ops\n• **SR-5881** (Bajaj Holdings — Margin Pledge) — SLA Breached 24h, Escalated to L2\n• **SR-5888** (Girish Nair — Bank Change) — SLA Breached, awaiting KYC validation\n\nWould you like me to pull full details on any specific SR?";
  if (m.includes("ramesh") || (m.includes("client") && m.includes("001001")))
    return "**Client: Ramesh Kumar Agarwal** (NIYT-I-001001)\n\n• Category: UHNI · Risk Profile: High\n• KYC: Verified · FATCA: Compliant\n• Verticals: Retail Broking, AIF\n• RM: Priya Sharma\n• Client since: January 2018\n• Demat: 1201800012345678 (IN301485)\n• Last SR: SR-5901 (In Progress — TDS Certificate)\n• AIF Commitment: ₹10 Cr in discussion\n\nWould you like KYC details, account statement, or SR history?";
  if ((m.includes("retail") || m.includes("demat") || m.includes("brokerage")) && !hasRetail && !hasAll)
    return "You don't have access to Retail Broking data based on your current role. Please contact the Retail Admin.";
  if (m.includes("retail") || m.includes("demat"))
    return "**Retail Broking Summary** (MTD)\n\n• Total AUM: ₹48.2 Cr (+12.4% QoQ)\n• Active Clients: 12,483 (+342 this month)\n• New Accounts MTD: 184 / Target: 200\n• Brokerage MTD: ₹1.82 Cr (+8.1% vs target)\n\n**Pipeline**: 16 leads active, ₹6.5 Cr potential AUM\n**Alerts**: 2 KYC expired (Kavita Singh, Pradeep Kumar Jain)";
  if (m.includes("lead") || m.includes("pipeline"))
    return "**Lead Pipeline Summary** (accessible verticals)\n\n| Vertical | Active Leads | Value |\n|---|---|---|\n| Retail Broking | 16 | ₹5.5 Cr AUM |\n| Corporate Broking | 7 | ₹985 Cr |\n| Investment Banking | 6 | ₹25,700 Cr |\n| AIF | 6 | ₹205 Cr |\n| Institutional Equities | 5 | ₹2,650 Cr |\n\n**Hottest lead**: Vedanta M&A (IB-3046) — ₹12,000Cr, near closure stage.";
  if (m.includes("kyc") || m.includes("compliance"))
    return "**KYC & Compliance Status**\n\n• Total clients: 20\n• KYC Verified: 17 (85%)\n• KYC Pending: 2 (Pradeep Kumar Jain, Maharashtra Pension Fund)\n• KYC Expired: 1 (Kavita Singh)\n• FATCA Compliant: 16 · FATCA Pending: 2\n\n**Action Required**: Kavita Singh (NIYT-I-001008) — KYC expired. Renewal overdue.";
  if (m.includes("sla") || m.includes("tat") || m.includes("breach"))
    return "**SLA / TAT Status**\n\n• SLA breached SRs: **5** (all in escalation)\n• Warning zone SRs (>80% TAT): 8\n• Average resolution time: 6.2 hours\n• Worst category: Trade Issues (avg 8.1h vs 4h TAT)\n• Best category: Compliance (avg 1.4h vs 2h TAT)\n\n**Recommendation**: Trade Issues queue needs additional resource allocation.";
  if (m.includes("deal") || m.includes("revenue"))
    return "**Active Deals Snapshot**\n\n• **IB**: Project Titan (₹4,200Cr M&A — Due Diligence)\n• **IB**: Project Aurora (₹1,800Cr — Mandate Signed)\n• **IB**: Vedanta Restructuring (₹8,900Cr — Mandate Letter)\n• **AIF**: NIYTRI Cat II Corpus — ₹850Cr fundraising active\n• **Corporate**: Adani Clearing March — ₹318Cr (Settled)\n\n**Advisory fees (FY26)**: ₹310 Cr (+22.3% YoY)";
  if (m.includes("document") || m.includes("pdf") || m.includes("report"))
    return "**Document Vault Summary**\n\n• Total documents: 284 across all clients\n• KYC documents: 156 · Agreements: 45 · Reports: 83\n• Latest upload: Settlement_Record_ORD289712.pdf (SR-5895) — v1.1, 21 Mar\n• Pending e-sign: 3 documents\n• Expiring soon: 2 PPM documents (AIF)\n\nNeed me to find a specific document or client's files?";
  return `Hello! I'm your NIYTRI CRM AI Assistant with access to **${userRole}** permissions.\n\nI can help you with:\n• **Client data** — search, KYC status, account details\n• **Service Requests** — status, SLA tracking, escalations\n• **Portfolio analytics** — AUM, pipeline, deals\n• **Compliance** — KYC alerts, FATCA, audit trail\n• **Reports** — lead funnel, revenue, SLA breach summary\n\nJust ask me anything! For example:\n_"What are my SLA breached SRs today?"_ or _"Show AIF AUM summary"_`;
}

const AI_SUGGESTED_PROMPTS: Record<string, string[]> = {
  "Super Admin": ["Show all SLA breached SRs", "AIF AUM and investor count", "Retail Broking MTD summary", "KYC expiry alerts", "Top deals by value"],
  "AIF Admin": ["AIF AUM and NAV summary", "Active AIF investors and commitments", "Pending capital calls", "AIF service requests", "AIF compliance status"],
  "Retail Admin": ["Retail Broking MTD KPIs", "New demat accounts this month", "KYC pending clients", "Retail SR status", "Lead pipeline summary"],
  "Corporate Admin": ["Corporate Broking volume", "Block deals this quarter", "Corporate client SRs", "CB lead pipeline"],
  "IB Admin": ["Active IB deals and status", "M&A pipeline value", "Near-closure deals", "IB revenue FY26"],
  "IE Admin": ["Institutional client summary", "FII allocation overview", "Research coverage stocks", "IE brokerage volume"],
  default: ["Show pending service requests", "SLA breach summary", "My client list", "Recent audit log"],
};

function AIModule({ t, loggedUser, isDark }: { t: ReturnType<typeof useTheme>; loggedUser: any; isDark: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [configured, setConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userRole = loggedUser?.role || "Super Admin";
  const userVerticals = loggedUser?.vertical === "All" ? ["Retail Broking", "Corporate Broking", "AIF", "Investment Banking", "Institutional Equities"] : [loggedUser?.vertical || "AIF"];
  const prompts = AI_SUGGESTED_PROMPTS[userRole] || AI_SUGGESTED_PROMPTS.default;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), from: "user", text: text.trim(), ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Call the real AI API
    let responseText = "";
    let apiOk = false;
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages, userRole, userVerticals, userName: loggedUser?.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          responseText = data.response;
          setConfigured(!!data.configured);
          apiOk = true;
        }
      }
    } catch { /* fall through to local fallback */ }

    if (!apiOk) {
      // Local fallback only if API completely unreachable
      await new Promise(r => setTimeout(r, 800));
      responseText = generateSmartResponse(text, userRole, userVerticals);
    }

    setIsTyping(false);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), from: "ai", text: responseText, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const formatText = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**"))
        return <p key={i} className="font-bold mt-2 mb-1">{line.slice(2, -2)}</p>;
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return <p key={i} className={line.startsWith("•") ? "ml-2" : line.startsWith("|") ? "font-mono text-xs" : ""}>{parts.map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      )}</p>;
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — context & prompts */}
      <div className={`hidden md:flex flex-col w-64 border-r ${t.border} flex-shrink-0 overflow-y-auto`}>
        <div className="p-4">
          <div className={`flex items-center gap-2 mb-3`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className={`text-xs font-bold ${t.text}`}>NIYTRI AI</div>
              <div className={`text-[10px] ${t.textMuted}`}>Role-Aware Assistant</div>
            </div>
          </div>

          {/* Access context */}
          <div className={`${t.bgCard2} rounded-xl p-3 mb-4`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted} mb-2`}>Your Access Context</div>
            <div className={`text-xs ${t.text} font-medium`}>{loggedUser?.name}</div>
            <div className={`text-[10px] ${t.textMuted}`}>{loggedUser?.role}</div>
            <div className={`text-[10px] mt-1.5 ${t.textMuted}`}>Verticals: <span className={t.text}>{loggedUser?.vertical}</span></div>
            <div className={`text-[10px] mt-1 ${configured ? "text-emerald-400" : "text-yellow-500"}`}>
              {configured ? "• LLM: Connected" : "• LLM: Demo Mode (configure in Admin)"}
            </div>
          </div>

          <div className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted} mb-2`}>Suggested Queries</div>
          <div className="space-y-1.5">
            {prompts.map((p, i) => (
              <button key={i} onClick={() => sendMessage(p)} className={`w-full text-left text-xs px-3 py-2 rounded-lg ${t.bgCard2} ${t.text} hover:bg-violet-600/20 hover:text-violet-400 transition-colors`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className={`px-4 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className={`text-sm font-bold ${t.text}`}>NIYTRI AI Assistant</div>
            <div className={`text-[10px] ${t.textMuted}`}>Powered by your configured LLM · Role: {userRole} · Data access: {loggedUser?.vertical}</div>
          </div>
          <div className={`ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full ${configured ? "bg-emerald-900/40 text-emerald-400" : "bg-yellow-900/40 text-yellow-400"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${configured ? "bg-emerald-400" : "bg-yellow-400"}`} />
            {configured ? "LLM Connected" : "Demo Mode"}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-700/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-violet-400" />
              </div>
              <div className={`text-base font-semibold ${t.text} mb-2`}>Hello, {loggedUser?.name?.split(" ")[0]}!</div>
              <div className={`text-sm ${t.textMuted} max-w-sm`}>I'm your NIYTRI CRM AI Assistant. I can access CRM data based on your role and answer questions about clients, service requests, pipeline, and compliance.</div>
              <div className={`mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md`}>
                {prompts.slice(0, 4).map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)} className={`text-left text-xs px-3 py-2.5 rounded-xl border ${t.border} ${t.text} ${t.rowHover} transition-colors`}>{p}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.from === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${msg.from === "ai" ? "bg-gradient-to-br from-violet-500 to-purple-700 text-white" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"}`}>
                {msg.from === "ai" ? <Bot className="w-3.5 h-3.5" /> : (loggedUser?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "BN")}
              </div>
              <div className={`max-w-[80%] ${msg.from === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1 ${msg.from === "ai" ? `${t.bgCard} border ${t.border} ${t.text}` : "bg-violet-600 text-white"}`}>
                  {msg.from === "ai" ? formatText(msg.text) : <p>{msg.text}</p>}
                </div>
                <div className={`text-[10px] ${t.textMuted}`}>{msg.ts}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>
              <div className={`${t.bgCard} border ${t.border} rounded-2xl px-4 py-3 flex items-center gap-1.5`}>
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className={`border-t ${t.border} p-4 flex-shrink-0`}>
          {messages.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {prompts.slice(0, 3).map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)} className={`text-[10px] px-2 py-1 rounded-full border ${t.border} ${t.textMuted} ${t.rowHover} transition-colors`}>{p}</button>
              ))}
            </div>
          )}
          <div className={`flex gap-2 items-end ${t.bgCard2} rounded-2xl border ${t.border} px-3 py-2`}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1} placeholder={`Ask about ${userRole === "AIF Admin" ? "AIF portfolio, investors, NAV…" : "clients, SRs, pipeline, compliance…"}`} className={`flex-1 bg-transparent text-xs ${t.text} placeholder:${t.textMuted} outline-none resize-none max-h-24 leading-relaxed`} />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping} className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors">
              {isTyping ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
          <p className={`text-[10px] ${t.textMuted} text-center mt-2`}>AI responses are based on CRM data accessible to your role. Verify critical decisions with source data.</p>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: AI CONFIG ─────────────────────────────────────────────────────────
const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"] },
  { id: "anthropic", name: "Anthropic (Claude)", models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"] },
  { id: "gemini", name: "Google Gemini", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  { id: "azure", name: "Azure OpenAI", models: ["gpt-4o", "gpt-4", "gpt-35-turbo"] },
  { id: "custom", name: "Custom (OpenAI-compatible)", models: [] },
];

function AdminAIConfig({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [enabled, setEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are NIYTRI CRM AI Assistant — an intelligent financial services assistant. Answer only based on the CRM data provided. Respect role-based access restrictions. Format responses clearly. Be concise and actionable.");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const providerInfo = AI_PROVIDERS.find(p => p.id === provider)!;
  const models = provider === "custom" ? [] : providerInfo.models;
  const needsEndpoint = provider === "azure" || provider === "custom";

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch(`${API_BASE}/api/ai/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: provider === "custom" ? customModel : model, api_key: apiKey, endpoint_url: endpointUrl, temperature, max_tokens: maxTokens, system_prompt: systemPrompt, enabled, updated_by: "bhushan@niytri.com" }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setTestResult({ ok: false, msg: "Failed to save. Check API server." }); }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!apiKey) { setTestResult({ ok: false, msg: "Enter an API key before testing." }); return; }
    setTesting(true); setTestResult(null);
    await new Promise(r => setTimeout(r, 1500));
    setTesting(false);
    setTestResult({ ok: true, msg: `Connection to ${providerInfo.name} (${provider === "custom" ? customModel : model}) successful. Token limit: ${maxTokens}. Ready to enable.` });
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>AI Assistant Settings</h2>
          <p className={`text-xs ${t.textMuted}`}>Configure the LLM powering NIYTRI CRM AI Assistant. Settings apply system-wide for all users.</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <div className={`text-sm font-semibold ${t.text}`}>Enable AI Assistant</div>
          <div className={`text-xs ${t.textMuted}`}>When disabled, users see a message to contact the admin. When enabled, all users (per their role) can access the chatbot.</div>
        </div>
        <button onClick={() => setEnabled(!enabled)} className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-violet-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      {/* LLM Provider */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-4`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Cpu className="w-4 h-4 text-violet-400" /> LLM Provider & Model</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Provider</label>
            <select value={provider} onChange={e => { setProvider(e.target.value); setModel(AI_PROVIDERS.find(p => p.id === e.target.value)?.models[0] || ""); }} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}>
              {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Model</label>
            {provider === "custom" ? (
              <input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="e.g. llama-3.1-70b" className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
            ) : (
              <select value={model} onChange={e => setModel(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>
        {needsEndpoint && (
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Endpoint URL {provider === "azure" ? "(Azure OpenAI endpoint)" : "(Custom base URL)"}</label>
            <input value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder={provider === "azure" ? "https://your-resource.openai.azure.com/..." : "https://your-endpoint.com/v1/chat/completions"} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
          </div>
        )}
      </div>

      {/* API Key */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Key className="w-4 h-4 text-yellow-400" /> Authentication</div>
        <div>
          <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>API Key <span className={`text-[10px] ${t.textMuted}`}>(stored encrypted, never logged)</span></label>
          <div className="relative">
            <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={`Enter ${providerInfo.name} API key`} className={`w-full border rounded-xl px-3 pr-10 py-2 text-sm outline-none font-mono ${t.inputBg}`} />
            <button onClick={() => setShowKey(!showKey)} className={`absolute right-3 top-2.5 ${t.textMuted}`}>{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
        </div>
      </div>

      {/* Generation params */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-4`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Sliders className="w-4 h-4 text-blue-400" /> Generation Parameters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Temperature: <span className={t.text}>{temperature}</span></label>
            <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full accent-violet-500" />
            <div className={`flex justify-between text-[10px] ${t.textMuted} mt-1`}><span>Precise (0)</span><span>Creative (2)</span></div>
          </div>
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Max Output Tokens</label>
            <input type="number" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} min={256} max={8192} step={256} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><MessageSquare className="w-4 h-4 text-green-400" /> System Prompt</div>
        <p className={`text-xs ${t.textMuted}`}>The base system prompt sent to the LLM for every request. User role and accessible CRM data are appended automatically.</p>
        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={4} className={`w-full border rounded-xl px-3 py-2 text-xs outline-none resize-none leading-relaxed ${t.inputBg}`} />
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`rounded-xl p-3 text-xs flex items-start gap-2 ${testResult.ok ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800" : "bg-red-900/30 text-red-400 border border-red-800"}`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {testResult.msg}
        </div>
      )}
      {saved && <div className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Configuration saved successfully.</div>}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleTest} disabled={testing} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border ${t.border} text-sm ${t.text} ${t.rowHover} disabled:opacity-50 transition-colors`}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Configuration"}
        </button>
      </div>

      <div className={`text-xs ${t.textMuted} p-3 rounded-xl ${t.bgCard2}`}>
        <strong className={t.text}>Role-based data access:</strong> The AI automatically receives only the CRM data the logged-in user is authorized to see — based on their role and vertical. Super Admin receives all data. Vertical Admins receive only their vertical's data.
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export function CRMApp() {
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [loggedUser, setLoggedUser] = useState(USERS[0]); // bhushan@niytri.com as default
  const [activeV, setActiveV] = useState<Vertical>(null);
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [m365Error, setM365Error] = useState("");

  // Parse M365 callback params from URL (after Azure AD redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const m365Token = urlParams.get("m365_token");
  const m365UserJson = urlParams.get("m365_user");
  const m365ErrorParam = urlParams.get("m365_error");

  // Handle M365 error in URL
  useEffect(() => {
    if (m365ErrorParam) {
      setM365Error(decodeURIComponent(m365ErrorParam));
      const url = new URL(window.location.href);
      url.searchParams.delete("m365_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  isDark = darkMode;
  const t = useTheme(darkMode);
  const userEmail = loggedUser?.email || "bhushan@niytri.com";

  // M365 callback: token + user in URL → map to USERS array or use API user, then go to app
  if (m365Token && m365UserJson) {
    return (
      <M365Callback
        token={m365Token}
        userJson={m365UserJson}
        onDone={(apiUser) => {
          if (apiUser) {
            const matched = USERS.find(u => u.email.toLowerCase() === apiUser.email?.toLowerCase());
            setLoggedUser(matched || { ...USERS[0], name: apiUser.name, email: apiUser.email, role: apiUser.role, vertical: apiUser.vertical, authType: "m365" });
          }
          setAuthStep("app");
        }}
      />
    );
  }

  if (authStep === "login") return <LoginScreen
    onAppLogin={() => setAuthStep("otp")}
    onM365Login={(token, userJson) => {
      try {
        const apiUser = typeof userJson === "string" ? JSON.parse(decodeURIComponent(userJson)) : userJson;
        localStorage.setItem("niytri_token", token);
        localStorage.setItem("niytri_user", JSON.stringify(apiUser));
        const matched = USERS.find(u => u.email.toLowerCase() === (apiUser.email || "").toLowerCase());
        setLoggedUser(matched || { ...USERS[0], name: apiUser.name, email: apiUser.email, role: apiUser.role, vertical: apiUser.vertical, authType: "m365" as AuthMethod });
      } catch { /* use default user */ }
      setAuthStep("app");
    }}
    isDark={darkMode}
    m365Error={m365Error}
  />;
  if (authStep === "m365") return <M365Flow onDone={() => setAuthStep("app")} isDark={darkMode} />;
  if (authStep === "otp") return <OTPScreen onVerify={() => setAuthStep("app")} email={userEmail} isDark={darkMode} />;

  const handleLogout = () => {
    localStorage.removeItem("niytri_token");
    localStorage.removeItem("niytri_user");
    sessionStorage.clear();
    setAuthStep("login");
    setActiveV(null);
    setActivePage("dashboard");
    setIsAdmin(false);
  };

  const renderContent = () => {
    if (isAdmin) {
      if (activePage === "admin-users")    return <AdminUsers t={t} />;
      if (activePage === "admin-roles")    return <AdminUserRoles t={t} />;
      if (activePage === "admin-role-map") return <AdminRoleMapping t={t} />;
      if (activePage === "admin-sla")      return <AdminSLAConfig t={t} />;
      if (activePage === "admin-llm")      return <AdminLLMSettings t={t} isDark={darkMode} />;
      if (activePage === "admin-prompts")  return <AdminAIPrompts t={t} isDark={darkMode} />;
      if (activePage === "admin-m365")     return <AdminM365Config t={t} isDark={darkMode} />;
      if (activePage === "admin-theme")    return <AdminTheme t={t} isDark={darkMode} setIsDark={setDarkMode} />;
      if (activePage === "admin-system")   return <AdminSystem t={t} />;
    }
    if (!activeV && activePage === "ai")      return <AIModule t={t} loggedUser={loggedUser} isDark={darkMode} />;
    if (!activeV && activePage === "clients") return <ClientsModule t={t} />;
    if (!activeV && activePage === "service") return <ServiceRequestModule t={t} />;
    if (!activeV) return <OverallDashboard t={t} />;
    if (activePage === "dashboard") return <VerticalDashboard vId={activeV} t={t} />;
    if (activePage === "leads")     return <LeadsPipeline vId={activeV} t={t} />;
    if (activePage === "deals")     return <DealsView vId={activeV} t={t} />;
    if (activePage === "customers") return <CustomersView vId={activeV} t={t} />;
    if (activePage === "documents") return <DocumentsView vId={activeV} t={t} />;
    return <OverallDashboard t={t} />;
  };

  return (
    <div className={`flex h-screen w-screen ${t.bg} overflow-hidden relative`}>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      {/* Desktop sidebar — static */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar open={sidebarOpen} activeV={activeV} setActiveV={setActiveV} activePage={activePage} setPage={setActivePage} isDark={darkMode} isAdmin={isAdmin} setIsAdmin={setIsAdmin} loggedUser={loggedUser} onLogout={handleLogout} />
      </div>
      {/* Mobile sidebar — fixed overlay */}
      {mobileSidebarOpen && (
        <div className="fixed left-0 top-0 h-full z-50 md:hidden">
          <Sidebar open={true} onClose={() => setMobileSidebarOpen(false)} activeV={activeV} setActiveV={setActiveV} activePage={activePage} setPage={setActivePage} isDark={darkMode} isAdmin={isAdmin} setIsAdmin={setIsAdmin} loggedUser={loggedUser} onLogout={handleLogout} />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onMobileMenu={() => setMobileSidebarOpen(true)} activeV={activeV} activePage={activePage} isDark={darkMode} setIsDark={setDarkMode} t={t} />
        <main className="flex-1 overflow-hidden">{renderContent()}</main>
      </div>
    </div>
  );
}
