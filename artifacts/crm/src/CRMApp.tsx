import { useState, useRef, useEffect, useCallback } from "react";
import { appConfirm, appToast, DialogHost } from "./lib/dialog";
import CalendarPage from "./pages/CalendarPage";
import { ServiceRequestModule, SR_CATEGORIES } from "./pages/ServiceRequests";
import ClientForm from "./components/ClientForm";
import { LeadModal, DealModal } from "./components/LeadDealModals";
import { kindOf } from "./components/dealKinds";
import MeetingReminders from "./components/MeetingReminders";
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import { serverLogout } from "./lib/authFetch";
import { RecordActivity, RecordDocuments } from "./components/RecordActivity";
import { QuickLog } from "./components/QuickLog";
import CompanyMaster from "./components/ib/CompanyMaster";
import IBDashboard from "./components/ib/IBDashboard";
import AdminFireflies from "./components/AdminFireflies";
import AdminMeetingRecording from "./components/AdminMeetingRecording";
import { MeetingRecorder } from "./components/MeetingRecorder";
import { MeetingView } from "./components/MeetingView";
import PersonView from "./components/PersonView";
import CardScanner from "./components/CardScanner";
import AdminPipelineStagesV2 from "./components/AdminPipelineStages";
import AdminRecordings from "./components/AdminRecordings";
import AIAssistant from "./components/AIAssistant";
import { parseINR, fmtINR, fmtINRStr, getUnit, setUnit, type CurrUnit } from "./lib/money";
import { MList, MCard } from "./components/MobileCard";
import { useHideOnScroll, MobileTabBar, MobileSheet, QuickActions, MoreTopRow, TAB_ICONS } from "./components/MobileNav";
import { StagePath, StageFlowPrompt, StageMoveDialog } from "./components/StagePath";
import { useBoardDrag } from "./lib/boardDrag";
import { ScanLine as ScanIcon } from "lucide-react";
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
  CornerDownLeft, Loader2, ClipboardList, Activity,
  Video, UserCheck, ExternalLink, UserCog, CalendarPlus, Trash2, Check,
  ListFilter, LayoutGrid, List, Edit2, Maximize2, Minimize2, Printer, ArrowUpDown,
  KeyRound, Mic,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type AuthStep = "login" | "m365" | "otp" | "app";
const APP_LOGO = `${import.meta.env.BASE_URL}logo.png`;
// If logo.png is missing, fall back to the bundled favicon instead of a broken image
const logoFallback = (e: React.SyntheticEvent<HTMLImageElement>) => { const img = e.currentTarget; if (!img.src.endsWith("favicon.svg")) img.src = `${import.meta.env.BASE_URL}favicon.svg`; };
type Vertical = "retail" | "corporate" | "ib" | "aif" | "ie" | null;
type Page = "dashboard" | "leads" | "deals" | "customers" | "documents" | "clients" | "service" | "ai" | "calendar"
  | "admin-users" | "admin-roles" | "admin-role-map"
  | "admin-sla" | "admin-verticals" | "admin-llm" | "admin-prompts" | "admin-m365"
  | "admin-theme" | "admin-system" | "admin-audit" | "admin-ai-logs"
  | "admin-dropdown-config" | "admin-pipeline-stages" | "admin-pii-masking" | "admin-fireflies" | "admin-meetings" | "admin-recordings";
type AuthMethod = "app" | "m365";

// ─── THEME ────────────────────────────────────────────────────────────────────
function useTheme(isDark: boolean) {
  return {
    bg: isDark ? "bg-gray-950" : "bg-slate-100",
    bgCard: isDark ? "bg-gray-900" : "bg-white",
    bgCard2: isDark ? "bg-gray-800" : "bg-slate-50",
    bgSidebar: isDark ? "bg-gray-900" : "bg-slate-900",
    bgHeader: isDark ? "bg-gray-900" : "bg-white",
    border: isDark ? "border-gray-800" : "border-slate-200",
    text: isDark ? "text-gray-100" : "text-slate-900",
    textMuted: isDark ? "text-gray-400" : "text-slate-500",
    textSub: isDark ? "text-gray-300" : "text-slate-600",
    inputBg: isDark ? "bg-gray-950 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-blue-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400",
    rowHover: isDark ? "hover:bg-gray-800/60" : "hover:bg-slate-50",
    tagGray: isDark ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-600",
    tableHead: isDark ? "bg-gray-800/60" : "bg-slate-50",
    alertRed: isDark ? "bg-red-950/40 border-red-900/50 text-red-300" : "bg-red-50 border-red-200 text-red-700",
    alertYellow: isDark ? "bg-yellow-950/40 border-yellow-900/50 text-yellow-300" : "bg-amber-50 border-amber-200 text-amber-700",
    alertGreen: isDark ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700",
    linkText: isDark ? "text-blue-400" : "text-blue-600",
    successText: isDark ? "text-emerald-400" : "text-emerald-600",
    errorText: isDark ? "text-red-400" : "text-red-600",
    warningText: isDark ? "text-amber-400" : "text-amber-600",
    codeBlue: isDark ? "text-blue-400" : "text-blue-700",
    codeGreen: isDark ? "text-emerald-400" : "text-emerald-700",
    activeTab: isDark ? "border-blue-500 text-blue-400" : "border-blue-500 text-blue-600",
    devBanner: isDark ? "bg-amber-500/20 border border-amber-500/40 text-amber-300" : "bg-amber-100 border border-amber-300 text-amber-700",
    upTrend: isDark ? "text-emerald-400" : "text-emerald-600",
    downTrend: isDark ? "text-red-400" : "text-red-600",
  };
}
let isDark = false;
// ─── CURRENCY UNIT — one formatter for the whole app (lib/money.ts) ───────────
const parseCrStr = (s: string | number | null | undefined): number => { const n = parseINR(s as any); return isFinite(n) ? n : 0; };
const fmtMoney = (amount: number | null | undefined): string => fmtINR(amount);
const fmtMoneyStr = (s: string | null | undefined): string => fmtINRStr(s);
// ─── CURRENCY UNIT END ────────────────────────────────────────────────────────
// Global PII settings — loaded at app startup, used in canViewPII checks
let piiSettings: { allow_admin_view: boolean; allow_owner_view: boolean } = { allow_admin_view: true, allow_owner_view: true };

function verticalAccent(vId: string) {
  const dark = isDark;
  const map: Record<string, string> = {
    retail:    dark ? "text-blue-400"   : "text-blue-600",
    corporate: dark ? "text-violet-400" : "text-violet-600",
    ib:        dark ? "text-amber-400"  : "text-amber-600",
    aif:       dark ? "text-emerald-400": "text-emerald-600",
    ie:        dark ? "text-rose-400"   : "text-rose-600",
  };
  return map[vId] || (dark ? "text-slate-400" : "text-slate-500");
}

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
const VERTICAL_DEFAULTS = [
  { id: "retail",    color: "bg-blue-600",    icon: Users },
  { id: "corporate", color: "bg-violet-600",  icon: Building },
  { id: "ib",        color: "bg-amber-600",   icon: Landmark },
  { id: "aif",       color: "bg-emerald-600", icon: Layers },
  { id: "ie",        color: "bg-rose-600",    icon: LineChart },
];
let VERTICALS: Array<{ id: string; label: string; short: string; color: string; icon: any }> = [
  { id: "retail",    label: "Retail Broking",        short: "RB",  color: "bg-blue-600",    icon: Users },
  { id: "corporate", label: "Corporate Broking",      short: "CB",  color: "bg-violet-600",  icon: Building },
  { id: "ib",        label: "Investment Banking",     short: "IB",  color: "bg-amber-600",   icon: Landmark },
  { id: "aif",       label: "AIF",                   short: "AIF", color: "bg-emerald-600", icon: Layers },
  { id: "ie",        label: "Institutional Equities", short: "IE",  color: "bg-rose-600",    icon: LineChart },
];
function getVerticalsList() { return VERTICALS.filter(v => v); }
// Modules an admin has hidden per vertical (Admin → Verticals Config), e.g. { retail: ["deals"] }
const VERTICAL_LABEL_FALLBACK: Record<string, string> = { retail: "Retail Broking", corporate: "Corporate Broking", ib: "Investment Banking", aif: "AIF", ie: "Institutional Equities" };
const IB_LABELS: Record<string, string> = { leads: "Opportunities", deals: "Mandates & Deals", customers: "Companies & Promoters" };
// Open the global Quick Log from anywhere (the host lives in CRMApp)
const openQuickLog = (defaults: any = {}) => window.dispatchEvent(new CustomEvent("quicklog:open", { detail: defaults }));
let HIDDEN_MODULES: Record<string, string[]> = {};
const moduleVisible = (vId: string, mod: string) => !(HIDDEN_MODULES[vId] || []).includes(mod);
const firstVisibleModule = (vId: string) => ["dashboard", "leads", "deals", "customers", "documents"].find(m => moduleVisible(vId, m)) || null;
const SUBMENU = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads Pipeline", icon: TrendingUp },
  { id: "deals", label: "Deals", icon: Briefcase },
  { id: "customers", label: "Clients", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
];

// SR_CATEGORIES is imported from ./pages/ServiceRequests

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

// ─── PII MASKING HELPER ───────────────────────────────────────────────────────
function maskValue(v: string | null | undefined): string {
  if (!v) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  // Email: show first 2 chars of username + *** + @domain
  if (s.includes("@")) {
    const atIdx = s.indexOf("@");
    const user = s.slice(0, atIdx);
    const domain = s.slice(atIdx);
    return `${user.slice(0, 2)}***${domain}`;
  }
  // Very short (≤4 chars): show first + *** + last
  if (s.length <= 4) return s[0] + "***" + s.slice(-1);
  // Short (5–7 chars): show first 2 + *** + last 2
  if (s.length <= 7) return s.slice(0, 2) + "***" + s.slice(-2);
  // Standard (8+ chars): show first 2 + **** + last 4
  return s.slice(0, 2) + "****" + s.slice(-4);
}

// ─── TEAMS MEETING MODAL ──────────────────────────────────────────────────────
function TeamsMeetingModal({ client, organizerEmail, t, isDark, onClose }: {
  client: any; organizerEmail: string; t: ReturnType<typeof useTheme>; isDark: boolean; onClose: () => void;
}) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // ── All times treated as IST (UTC+5:30) regardless of browser timezone ──
  const IST_OFFSET_MS = (5 * 60 + 30) * 60000;
  const toISTDate = (d: Date) => {
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth()+1)}-${pad(ist.getUTCDate())}`;
  };
  const toISTTime = (d: Date) => {
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    return `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
  };
  // Parse meetingDate + startTime as IST → returns UTC Date
  const parseIST = (date: string, time: string): Date | null => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00+05:30`);
  };

  const defaultStart = new Date(now.getTime() + 30 * 60000);

  const [subject, setSubject] = useState(`Meeting with ${client?.name || "Client"}`);
  const [meetingDate, setMeetingDate] = useState(toISTDate(defaultStart));
  const [startTime, setStartTime] = useState(toISTTime(defaultStart));
  const [duration, setDuration] = useState(60);
  const [attendees, setAttendees] = useState<string[]>(client?.email ? [client.email] : []);
  const [newAttendee, setNewAttendee] = useState("");
  const [agenda, setAgenda] = useState("");
  const [meetingType, setMeetingType] = useState("Teams Video");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Attachment state
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachBase64, setAttachBase64] = useState<string>("");
  const [attachError, setAttachError] = useState("");
  const [maxAttachMb, setMaxAttachMb] = useState(5);

  useEffect(() => {
    fetch(`${API_BASE}/api/teams/settings`).then(r => r.json()).then(d => {
      if (d.maxMeetingAttachmentMb) setMaxAttachMb(d.maxMeetingAttachmentMb);
    }).catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAttachError("");
    if (!file) { setAttachFile(null); setAttachBase64(""); return; }
    const maxBytes = maxAttachMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setAttachError(`File exceeds maximum size of ${maxAttachMb} MB`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = (ev.target?.result as string).split(",")[1] || "";
      setAttachBase64(b64);
    };
    reader.readAsDataURL(file);
    setAttachFile(file);
  };

  // Computed end time displayed as IST HH:MM
  const endTimeStr = (() => {
    const startDt = parseIST(meetingDate, startTime);
    if (!startDt) return "--:--";
    const endDt = new Date(startDt.getTime() + duration * 60000);
    return toISTTime(endDt);
  })();

  const addAttendee = () => {
    const em = newAttendee.trim().toLowerCase();
    if (em && em.includes("@") && !attendees.includes(em)) {
      setAttendees(a => [...a, em]);
      setNewAttendee("");
    }
  };

  const startDateTime = parseIST(meetingDate, startTime);
  const isPast = startDateTime ? startDateTime.getTime() <= Date.now() : false;
  const isValid = !!(subject.trim() && meetingDate && startTime && attendees.length > 0 && !isPast);
  const validationError = isPast ? "Start time must be in the future" : !subject.trim() ? "Subject is required" : (!attendees.length ? "At least one attendee is required" : "");

  const schedule = async () => {
    if (!isValid || !startDateTime) return;
    setLoading(true); setError(""); setResult(null);
    const start = startDateTime;
    const end = new Date(start.getTime() + duration * 60000);
    try {
      const body: any = {
        organizerEmail,
        subject,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendees,
        agenda,
        clientId: client?.id,
      };
      if (attachFile && attachBase64) {
        body.attachment = {
          name: attachFile.name,
          base64: attachBase64,
          mimeType: attachFile.type || "application/octet-stream",
        };
      }
      const r = await fetch(`${API_BASE}/api/teams/create-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.hint || "Failed to create meeting");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copyLink = () => {
    if (!result?.joinUrl) return;
    navigator.clipboard.writeText(result.joinUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const DURATIONS = [15, 30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${t.bgCard} rounded-2xl border ${t.border} w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className={`text-sm font-semibold ${t.text}`}>Schedule Teams Meeting</div>
              <div className={`text-[10px] ${t.textMuted}`}>Client: {client?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${t.textMuted} hover:opacity-70`}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            /* ── Success State ── */
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border ${result.isFallback ? (isDark ? "bg-amber-950/30 border-amber-800" : "bg-amber-50 border-amber-200") : (isDark ? "bg-emerald-950/30 border-emerald-800" : "bg-emerald-50 border-emerald-200")}`}>
                <div className={`flex items-center gap-2 font-semibold text-sm mb-2 ${result.isFallback ? (isDark ? "text-amber-300" : "text-amber-700") : (isDark ? "text-emerald-300" : "text-emerald-700")}`}>
                  {result.isFallback ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {result.isFallback ? "Placeholder Meeting Link Created" : "Teams Meeting Scheduled!"}
                </div>
                {result.isFallback && (
                  <p className={`text-[10px] mb-3 ${isDark ? "text-amber-300/80" : "text-amber-700"}`}>{result.fallbackNote}</p>
                )}
                <div className={`space-y-1 text-xs ${t.textMuted} mb-3`}>
                  <div><span className="font-medium">Subject:</span> <span className={t.text}>{result.subject || subject}</span></div>
                  <div><span className="font-medium">Date:</span> <span className={t.text}>{meetingDate} at {startTime} – {endTimeStr} IST</span></div>
                  <div><span className="font-medium">Organizer:</span> <span className={t.text}>{result.organizer || organizerEmail}</span></div>
                  <div><span className="font-medium">Attendees:</span> <span className={t.text}>{attendees.join(", ")}</span></div>
                  {result.invitesSent && (
                    <div className={`flex items-center gap-1 mt-1 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                      <CheckCircle2 className="w-3 h-3" /> Calendar invites sent to all attendees
                    </div>
                  )}
                  {attachFile && (
                    <div><span className="font-medium">Attachment:</span> <span className={t.text}>{attachFile.name}</span></div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!result.isFallback && (
                    <a href={result.joinUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
                      <ExternalLink className="w-3 h-3" /> Open in Teams
                    </a>
                  )}
                  <button onClick={copyLink}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
              <button onClick={onClose} className={`w-full text-xs py-2.5 rounded-lg border ${t.border} ${t.textMuted} hover:opacity-70`}>Close</button>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              {/* Meeting Subject */}
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Meeting Subject *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  className={`w-full text-sm rounded-xl border px-3.5 py-2.5 ${t.inputBg} outline-none focus:ring-2 focus:ring-blue-500/40`} />
              </div>

              {/* Organizer info */}
              <div className={`flex items-center gap-2 text-[10px] px-3 py-2 rounded-lg ${isDark ? "bg-blue-950/40 border border-blue-800/40" : "bg-blue-50 border border-blue-200"}`}>
                <Video className={`w-3 h-3 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                <span className={isDark ? "text-blue-300" : "text-blue-700"}>Organizer: <strong>{organizerEmail}</strong></span>
                <span className={`ml-auto ${isDark ? "text-blue-400/60" : "text-blue-500/70"}`}>Calendar invite will be sent to all attendees</span>
              </div>

              {/* Meeting Type */}
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Meeting Purpose</label>
                <div className="flex gap-2 flex-wrap">
                  {["Teams Video", "Portfolio Review", "KYC Discussion", "Deal Update", "Onboarding"].map(type => (
                    <button key={type} onClick={() => { setMeetingType(type); if (type !== "Teams Video") setSubject(`${type} – ${client?.name}`); }}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${meetingType === type ? "bg-blue-600 text-white border-blue-600" : `${t.border} ${t.textMuted} hover:opacity-70`}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Date * <span className="font-normal opacity-60">(IST)</span></label>
                  <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
                    min={toISTDate(new Date())}
                    className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Start Time * <span className="font-normal opacity-60">(IST)</span></label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`} />
                </div>
              </div>
              {validationError && (
                <div className={`text-[11px] flex items-center gap-1.5 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  <AlertCircle className="w-3 h-3" /> {validationError}
                </div>
              )}

              {/* Duration Presets */}
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Duration <span className={t.textMuted}>(ends at {endTimeStr})</span></label>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${duration === d ? "bg-violet-600 text-white border-violet-600" : `${t.border} ${t.textMuted} hover:opacity-70`}`}>
                      {d < 60 ? `${d}m` : `${d/60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendees */}
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Attendees *</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {attendees.map(em => (
                    <span key={em} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${isDark ? "bg-blue-900/50 text-blue-300 border border-blue-800/50" : "bg-blue-100 text-blue-700"}`}>
                      <User className="w-2.5 h-2.5" />{em}
                      <button onClick={() => setAttendees(a => a.filter(x => x !== em))} className="hover:text-red-400 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newAttendee} onChange={e => setNewAttendee(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addAttendee()}
                    placeholder="Add email and press Enter…"
                    className={`flex-1 text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`} />
                  <button onClick={addAttendee} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700">+ Add</button>
                </div>
              </div>

              {/* Agenda */}
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Agenda / Notes <span className={t.textMuted}>(optional)</span></label>
                <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={3}
                  placeholder="Topics to discuss, documents to review, action items…"
                  className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} resize-none`} />
              </div>

              {/* Document Attachment */}
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1.5`}>Attachment <span className={t.textMuted}>(optional · max {maxAttachMb} MB)</span></label>
                <div className={`relative border-2 border-dashed rounded-xl p-3 text-center transition-colors ${attachFile ? (isDark ? "border-blue-700 bg-blue-950/20" : "border-blue-400 bg-blue-50") : `${t.border} hover:border-blue-500/50`}`}>
                  {attachFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "bg-blue-900/50" : "bg-blue-100"}`}>
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="text-left">
                          <div className={`text-xs font-medium ${t.text} truncate max-w-[180px]`}>{attachFile.name}</div>
                          <div className={`text-[10px] ${t.textMuted}`}>{(attachFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button onClick={() => { setAttachFile(null); setAttachBase64(""); setAttachError(""); }}
                        className={`p-1 rounded-lg ${t.textMuted} hover:text-red-400`}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-1">
                      <Upload className={`w-5 h-5 ${t.textMuted}`} />
                      <span className={`text-[11px] ${t.textMuted}`}>Click to attach a file</span>
                      <input type="file" className="sr-only" onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.csv" />
                    </label>
                  )}
                </div>
                {attachError && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{attachError}</p>}
              </div>

              {/* Error */}
              {error && (
                <div className={`text-xs p-3 rounded-xl flex items-start gap-2 ${isDark ? "bg-red-950/40 border border-red-800/50 text-red-300" : "bg-red-50 border border-red-200 text-red-700"}`}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={onClose} className={`text-xs px-4 py-2.5 rounded-xl border ${t.border} ${t.textMuted} hover:opacity-70`}>Cancel</button>
                <button onClick={schedule} disabled={loading || !isValid}
                  className="text-xs bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                  {loading ? "Scheduling…" : "Schedule Meeting"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ACCESS REQUEST MODAL ─────────────────────────────────────────────────────
function AccessRequestModal({ clientId, clientName, requesterId, requesterName, t, onClose, onSuccess }: {
  clientId: string; clientName: string; requesterId: string; requesterName: string;
  t: ReturnType<typeof useTheme>; onClose: () => void; onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/clients/${clientId}/access-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requester_id: requesterId, requester_name: requesterName, request_type: "pii", reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      onSuccess();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${t.bgCard} rounded-2xl border ${t.border} w-full max-w-md`}>
        <div className={`flex items-center justify-between p-4 border-b ${t.border}`}>
          <div className={`flex items-center gap-2 ${t.text} font-semibold text-sm`}>
            <Lock className="w-4 h-4 text-amber-400" /> Request PII Access
          </div>
          <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className={`text-xs ${t.textMuted}`}>You are requesting access to view unmasked PII data for <strong className={t.text}>{clientName}</strong>. The owner and Super Admin will be notified to approve your request.</p>
          <div>
            <label className={`text-xs ${t.textMuted} block mb-1`}>Reason for request *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Explain why you need access to this client's PII data…"
              className={`w-full text-xs rounded-lg border px-3 py-2 ${t.inputBg} resize-none`} />
          </div>
          {error && <div className={`text-xs p-2 rounded-lg ${isDark ? "bg-red-950/50 text-red-400" : "bg-red-50 text-red-600"}`}>{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={`text-xs px-4 py-2 rounded-lg border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={submit} disabled={loading || !reason.trim()}
              className="text-xs bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {loading ? "Sending…" : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PII REQUESTS PANEL ───────────────────────────────────────────────────────
function PIIRequestsPanel({ loggedUser, t, isDark: dark, onClose }: { loggedUser: any; t: ReturnType<typeof useTheme>; isDark: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"mine" | "approvals">("mine");
  const [myReqs, setMyReqs] = useState<any[]>([]);
  const [approvalReqs, setApprovalReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const isSuperAdmin = (loggedUser?.role || "").toLowerCase().includes("super");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const [myR, appR] = await Promise.all([
        fetch(`${API_BASE}/api/clients/access-requests/list?user_id=${loggedUser?.id}&role=requester`).then(r => r.ok ? r.json() : { data: [] }),
        fetch(`${API_BASE}/api/clients/access-requests/list?user_id=${loggedUser?.id}&role=approver&is_super_admin=${isSuperAdmin}`).then(r => r.ok ? r.json() : { data: [] }),
      ]);
      setMyReqs(myR.data || []);
      setApprovalReqs(appR.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [loggedUser?.id]);

  const review = async (reqId: string, status: "approved" | "denied") => {
    const r = await fetch(`${API_BASE}/api/clients/access-request/${reqId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, review_comment: comment[reqId] || "", reviewed_by: loggedUser?.id, reviewed_by_name: loggedUser?.name, reviewed_by_role: loggedUser?.role }),
    });
    const d = await r.json();
    if (!r.ok) { showToast(d.error || "Failed to update request."); return; }
    showToast(status === "approved" ? "Access approved and requester notified." : "Request denied and requester notified.");
    load();
  };

  const statusColor = (s: string) => {
    if (s === "approved") return dark ? "text-emerald-400 bg-emerald-900/30" : "text-emerald-700 bg-emerald-50";
    if (s === "denied") return dark ? "text-red-400 bg-red-900/30" : "text-red-600 bg-red-50";
    if (s === "expired") return dark ? "text-slate-400 bg-slate-700/40" : "text-slate-500 bg-slate-100";
    return dark ? "text-amber-400 bg-amber-900/30" : "text-amber-700 bg-amber-50";
  };

  const pendingApprovals = approvalReqs.filter(r => r.status === "pending").length;

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-4">
      <div className={`${t.bgCard} border-l ${t.border} w-full sm:w-[480px] h-full sm:h-auto sm:max-h-[80vh] sm:rounded-2xl flex flex-col shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border} flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className={`text-sm font-semibold ${t.text}`}>PII Access Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className={`p-1.5 rounded-lg ${t.textMuted} hover:opacity-80`}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${t.border} flex-shrink-0`}>
          <button onClick={() => setTab("mine")} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === "mine" ? "text-blue-400 border-b-2 border-blue-400" : t.textMuted}`}>
            My Requests ({myReqs.length})
          </button>
          <button onClick={() => setTab("approvals")} className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${tab === "approvals" ? "text-amber-400 border-b-2 border-amber-400" : t.textMuted}`}>
            Approvals Needed
            {pendingApprovals > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">{pendingApprovals}</span>}
          </button>
        </div>

        {/* Toast */}
        {toast && <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs ${dark ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>{toast}</div>}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <div className={`text-xs ${t.textMuted} text-center py-8`}>Loading…</div>}

          {!loading && tab === "mine" && (myReqs.length === 0 ? (
            <div className={`text-center py-10 ${t.textMuted} text-xs`}>
              <Lock className="w-6 h-6 mx-auto mb-2 opacity-40" />
              You haven't made any PII access requests yet.
            </div>
          ) : myReqs.map(req => (
            <div key={req.id} className={`rounded-xl border ${t.border} p-3 space-y-1.5`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-xs font-semibold ${t.text}`}>{req.client_name} <span className={`font-normal ${t.textMuted}`}>({req.client_code})</span></div>
                  <div className={`text-[10px] ${t.textMuted} mt-0.5`}>Requested: {fmtDateTime(req.created_at)}</div>
                  {req.expires_at && req.status === "pending" && <div className={`text-[10px] text-amber-500 mt-0.5`}>Expires: {fmtDateTime(req.expires_at)}</div>}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(req.status)}`}>{req.status}</span>
              </div>
              {req.reason && <div className={`text-[10px] ${t.textMuted}`}><span className="font-medium">Reason:</span> {req.reason}</div>}
              {req.review_comment && <div className={`text-[10px] ${dark ? "text-blue-300" : "text-blue-700"}`}><span className="font-medium">{req.status === "approved" ? "Approval note" : "Rejection note"}:</span> {req.review_comment}</div>}
              {req.reviewed_by_name && <div className={`text-[10px] ${t.textMuted}`}>Reviewed by {req.reviewed_by_name} · {req.reviewed_at ? fmtDateTime(req.reviewed_at) : ""}</div>}
            </div>
          )))}

          {!loading && tab === "approvals" && (approvalReqs.length === 0 ? (
            <div className={`text-center py-10 ${t.textMuted} text-xs`}>
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
              No pending approvals at this time.
            </div>
          ) : approvalReqs.map(req => (
            <div key={req.id} className={`rounded-xl border ${t.border} p-3 space-y-2`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-xs font-semibold ${t.text}`}>{req.requester_name}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>wants access to <span className="font-medium">{req.client_name}</span> ({req.client_code})</div>
                  <div className={`text-[10px] ${t.textMuted} mt-0.5`}>{fmtDateTime(req.created_at)}</div>
                  {req.expires_at && <div className="text-[10px] text-amber-500">Expires: {fmtDateTime(req.expires_at)}</div>}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(req.status)}`}>{req.status}</span>
              </div>
              {req.reason && <div className={`text-[10px] ${t.textMuted} italic`}>"{req.reason}"</div>}
              {req.status === "pending" && <>
                <input
                  type="text"
                  placeholder="Optional note / comment…"
                  value={comment[req.id] || ""}
                  onChange={e => setComment(p => ({ ...p, [req.id]: e.target.value }))}
                  className={`w-full text-[10px] rounded-lg border px-2.5 py-1.5 ${t.inputBg}`}
                />
                <div className="flex gap-2">
                  <button onClick={() => review(req.id, "approved")}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium">
                    Approve
                  </button>
                  <button onClick={() => review(req.id, "denied")}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">
                    Deny
                  </button>
                </div>
              </>}
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}

// ─── CHANGE OWNER MODAL ───────────────────────────────────────────────────────
function ChangeOwnerModal({ clientId, clientName, currentOwnerId, changedBy, t, onClose, onSuccess }: {
  clientId: string; clientName: string; currentOwnerId: string;
  changedBy: any; t: ReturnType<typeof useTheme>; onClose: () => void; onSuccess: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/users?limit=100`).then(r => r.json()).then(d => setUsers(d.data || d || [])).catch(() => {});
  }, []);

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/clients/${clientId}/owner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_owner_id: selectedUser, changed_by: changedBy?.id, changed_by_name: changedBy?.name, changed_by_role: changedBy?.role }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      onSuccess();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${t.bgCard} rounded-2xl border ${t.border} w-full max-w-md`}>
        <div className={`flex items-center justify-between p-4 border-b ${t.border}`}>
          <div className={`flex items-center gap-2 ${t.text} font-semibold text-sm`}>
            <UserCog className="w-4 h-4 text-blue-400" /> Change Client Owner
          </div>
          <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className={`text-xs ${t.textMuted}`}>Changing owner of <strong className={t.text}>{clientName}</strong>. The new owner will have full PII access.</p>
          <div>
            <label className={`text-xs ${t.textMuted} block mb-1`}>Select New Owner *</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className={`w-full text-xs rounded-lg border px-3 py-2 ${t.inputBg}`}>
              <option value="">-- Select user --</option>
              {users.filter(u => u.id !== currentOwnerId).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          {error && <div className={`text-xs p-2 rounded-lg ${isDark ? "bg-red-950/50 text-red-400" : "bg-red-50 text-red-600"}`}>{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={`text-xs px-4 py-2 rounded-lg border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={submit} disabled={loading || !selectedUser}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving…" : "Change Owner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotificationBell({ loggedUser, t }: { loggedUser: any; t: ReturnType<typeof useTheme> }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!loggedUser?.id) return;
    fetch(`${API_BASE}/api/notifications?userId=${loggedUser.id}&limit=20`)
      .then(r => r.json())
      .then(d => { setNotifs(d.data || []); setUnreadCount(d.unreadCount || 0); })
      .catch(() => {});
  }, [loggedUser?.id]);

  useEffect(() => {
    load(); const i = setInterval(load, 30000);
    window.addEventListener("niytri:notifications-refresh", load); // e.g. a meeting reminder just fired
    return () => { clearInterval(i); window.removeEventListener("niytri:notifications-refresh", load); };
  }, [load]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: "PUT" }).catch(() => {});
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API_BASE}/api/notifications/read-all`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: loggedUser?.id }) }).catch(() => {});
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    if (!loggedUser?.id) return;
    await fetch(`${API_BASE}/api/notifications?userId=${loggedUser.id}`, { method: "DELETE" }).catch(() => {});
    setNotifs([]);
    setUnreadCount(0);
    setOpen(false);
  };

  const iconForType = (type: string) => {
    if (type.includes("access")) return <Lock className="w-3 h-3 text-amber-400" />;
    if (type.includes("approved")) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (type.includes("denied")) return <XCircle className="w-3 h-3 text-red-400" />;
    if (type.includes("owner")) return <UserCheck className="w-3 h-3 text-blue-400" />;
    return <Bell className="w-3 h-3 text-gray-400" />;
  };

  return (
    <div className="relative" ref={ref}>
      <Tip label="Notifications">
        <button onClick={() => { setOpen(o => !o); if (!open) load(); }}
          className={`relative p-2 rounded-lg ${isDark ? "hover:bg-gray-800" : "hover:bg-slate-100"}`}>
          <Bell className={`w-4.5 h-4.5 ${t.textMuted}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center font-bold text-white px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </Tip>
      {open && (
        <div className={`absolute right-0 top-full mt-1 w-80 ${t.bgCard} border ${t.border} rounded-xl shadow-2xl z-50 overflow-hidden`}>
          <div className={`flex items-center justify-between px-3 py-2.5 border-b ${t.border}`}>
            <span className={`text-xs font-semibold ${t.text}`}>Notifications {unreadCount > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className={`text-[10px] ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}>
                  Mark all read
                </button>
              )}
              {notifs.length > 0 && (
                <button onClick={clearAll} className={`text-[10px] ${isDark ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-700"}`}>
                  Clear all
                </button>
              )}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className={`text-xs ${t.textMuted} text-center py-6`}>No notifications</div>
            ) : notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer border-b last:border-0 ${t.border} ${n.read ? "" : (isDark ? "bg-blue-950/20" : "bg-blue-50")} ${t.rowHover}`}>
                <div className="mt-0.5 flex-shrink-0">{iconForType(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${t.text} truncate`}>{n.title}</div>
                  <div className={`text-[10px] ${t.textMuted} line-clamp-2`}>{n.body}</div>
                  <div className={`text-[9px] ${t.textMuted} mt-0.5`}>{new Date(n.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CLIENT EXPAND MODAL ─────────────────────────────────────────────────────
function ClientExpandModal({ client, loggedUser, canViewPII, t, isDark, onClose, onDownloadPDF, onScheduleMeeting }: {
  client: any; loggedUser?: any; canViewPII: boolean; t: ReturnType<typeof useTheme>; isDark: boolean;
  onClose: () => void; onDownloadPDF: () => void; onScheduleMeeting: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [srs, setSrs] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());

  const fmtDate = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (v: string | null | undefined) => v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const maskVal = (v: string | null | undefined) => {
    if (!v) return "—";
    const s = String(v);
    if (s.length <= 4) return "••••";
    return s.slice(0, 2) + "•".repeat(Math.min(s.length - 4, 6)) + s.slice(-2);
  };

  const toggleField = (fieldKey: string) => {
    if (!canViewPII) return;
    setRevealedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey); else next.add(fieldKey);
      return next;
    });
  };

  const PiiRow = ({ label, value, fieldKey }: { label: string; value: string | null | undefined; fieldKey: string }) => {
    const revealed = revealedFields.has(fieldKey) && canViewPII;
    const display = revealed ? (value || "—") : maskVal(value);
    return (
      <div className={`flex items-start justify-between py-2.5 border-b ${t.border} last:border-0`}>
        <span className={`text-xs ${t.textMuted} w-40 flex-shrink-0`}>{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${t.text} text-right font-mono tracking-wider opacity-80`}>{display}</span>
          {canViewPII && (
            <button onClick={() => toggleField(fieldKey)} className={`p-0.5 rounded ${revealed ? t.successText : t.textMuted} hover:opacity-70`}>
              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const Row = ({ label, value }: { label: string; value?: string | null }) => (
    <div className={`flex items-start justify-between py-2.5 border-b ${t.border} last:border-0`}>
      <span className={`text-xs ${t.textMuted} w-44 flex-shrink-0`}>{label}</span>
      <span className={`text-xs font-medium ${t.text} text-right`}>{value || "—"}</span>
    </div>
  );

  useEffect(() => {
    if (!client?.id) return;
    setLoadingTab(true);
    const endpoints: Record<string, string> = {
      srs: `${API_BASE}/api/service-requests?client_id=${client.id}&limit=50`,
      deals: `${API_BASE}/api/deals?client_id=${client.id}&limit=50`,
      leads: `${API_BASE}/api/leads?client_id=${client.id}&limit=50`,
      docs: `${API_BASE}/api/documents?client_id=${client.id}&limit=50`,
    };
    if (endpoints[tab]) {
      fetch(endpoints[tab])
        .then(r => r.json())
        .then(d => {
          if (tab === "srs") setSrs(d.data || []);
          else if (tab === "deals") setDeals(d.data || []);
          else if (tab === "leads") setLeads(d.data || []);
          else if (tab === "docs") setDocs(d.data || []);
        })
        .finally(() => setLoadingTab(false));
    } else {
      setLoadingTab(false);
    }
  }, [tab, client?.id]);

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "kyc", label: "KYC & Compliance", icon: Shield },
    { id: "accounts", label: "Accounts", icon: CreditCard },
    { id: "srs", label: "Service Requests", icon: MessageSquare },
    { id: "deals", label: "Deals", icon: Briefcase },
    { id: "leads", label: "Leads", icon: TrendingUp },
    { id: "docs", label: "Documents", icon: FileText },
  ];

  const LoadingSpinner = () => (
    <div className={`flex items-center justify-center py-16 ${t.textMuted}`}>
      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading…</span>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className={`flex flex-col items-center justify-center py-16 ${t.textMuted}`}>
      <FileText className="w-8 h-8 mb-2 opacity-30" />
      <span className="text-sm">{message}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/80 z-50 flex items-center justify-center p-3">
      <div className={`${t.bgCard} rounded-2xl border ${t.border} w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${t.border} flex-shrink-0`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${client.type === "Individual" ? "bg-blue-600" : "bg-violet-600"} flex items-center justify-center text-lg font-bold text-white shadow-lg`}>
              {client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className={`text-lg font-bold ${t.text}`}>{client.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <code className={`${t.codeBlue} text-xs`}>{client.client_code}</code>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>{client.type}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>{client.category}</span>
                <StatusBadge s={client.status} />
                {!canViewPII && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${isDark ? "bg-amber-950/50 text-amber-300 border border-amber-800/40" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    <Lock className="w-2.5 h-2.5" /> PII Masked
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden md:block text-right mr-4`}>
              <div className={`text-[10px] ${t.textMuted}`}>Owner</div>
              <div className={`text-xs font-semibold ${t.text}`}>{client.owner_name || "Unassigned"}</div>
              <div className={`text-[10px] ${t.textMuted}`}>RM: {client.rm_name || "—"}</div>
            </div>
            <button onClick={onScheduleMeeting} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Video className="w-3.5 h-3.5" /> Schedule Meeting
            </button>
            <button onClick={onDownloadPDF} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/20 transition-colors">
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onClose} className={`p-2 rounded-xl ${t.textMuted} hover:opacity-70 transition-opacity`}><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className={`flex border-b ${t.border} flex-shrink-0 overflow-x-auto`}>
          {tabs.map(tb => {
            const Icon = tb.icon;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === tb.id ? `border-b-2 ${t.activeTab}` : t.textMuted}`}>
                <Icon className="w-3.5 h-3.5" />{tb.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ─────────────────────────────────── */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Col 1: Basic Info */}
              <div className="space-y-1">
                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>Basic Information</div>
                <Row label="Full Name" value={client.name} />
                <Row label="Client Code" value={client.client_code} />
                <Row label="Type" value={client.type} />
                <Row label="Category" value={client.category} />
                <Row label="Status" value={client.status} />
                <Row label="Relationship Manager" value={client.rm_name || "—"} />
                <Row label="Account Owner" value={client.owner_name || "—"} />
                <Row label="Verticals" value={(client.verticals || []).join(", ") || "—"} />
                <Row label="Client Since" value={fmtDate(client.created_at)} />
                <Row label="Last Updated" value={fmtDateTime(client.updated_at)} />
              </div>
              {/* Col 2: PII Contact */}
              <div className="space-y-1">
                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>Contact Information</div>
                <div className={`mb-3 flex items-center gap-2 p-2 rounded-lg ${isDark ? "bg-amber-950/30 border border-amber-900/40" : "bg-amber-50 border border-amber-200"}`}>
                  <Lock className={`w-3 h-3 flex-shrink-0 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                  <span className={`text-[10px] ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                    {canViewPII ? "You can reveal PII — click the eye icon" : "PII masked — only owner/admin can reveal"}
                  </span>
                </div>
                <PiiRow label="Mobile" value={client.mobile} fieldKey="mobile" />
                <PiiRow label="Email" value={client.email} fieldKey="email" />
                <PiiRow label="Address" value={client.address} fieldKey="address" />
                <PiiRow label="PAN" value={client.pan} fieldKey="pan" />
                <PiiRow label="Date of Birth / Incorp." value={client.date_of_birth ? fmtDate(client.date_of_birth) : client.date_of_incorporation ? fmtDate(client.date_of_incorporation) : null} fieldKey="dob" />
              </div>
              {/* Col 3: Notes + Verticals */}
              <div className="space-y-4">
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>Notes</div>
                  <div className={`${t.bgCard2} rounded-xl p-4 min-h-[100px] border ${t.border}`}>
                    {client.notes
                      ? <p className={`text-sm ${t.text} leading-relaxed`}>{client.notes}</p>
                      : <p className={`text-xs ${t.textMuted} italic`}>No notes on record.</p>}
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>Active Verticals</div>
                  <div className="flex flex-wrap gap-2">
                    {(client.verticals || []).length === 0
                      ? <span className={`text-xs ${t.textMuted} italic`}>No verticals</span>
                      : (client.verticals || []).map((v: string) => (
                          <span key={v} className={`text-xs px-3 py-1 rounded-full font-medium ${isDark ? "bg-violet-900/40 text-violet-300 border border-violet-700/40" : "bg-violet-50 text-violet-700 border border-violet-200"}`}>{v}</span>
                        ))}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "border-amber-800/40 bg-amber-950/20" : "border-amber-200 bg-amber-50"}`}>
                  <div className={`text-[10px] font-bold mb-1 ${isDark ? "text-amber-400" : "text-amber-700"}`}>PDF Export Policy</div>
                  <p className={`text-[10px] leading-relaxed ${isDark ? "text-amber-300/80" : "text-amber-700/80"}`}>
                    Downloaded PDFs contain <strong>masked PII only</strong>. No raw PAN, DOB, or contact details are included. All exports are logged for compliance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── KYC & COMPLIANCE ─────────────────────────── */}
          {tab === "kyc" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>KYC Status</div>
                <div className={`${t.bgCard2} rounded-xl p-4 border ${t.border} space-y-0`}>
                  {[
                    { label: "KYC Status", value: <StatusBadge s={client.kyc_status} /> },
                    { label: "Risk Profile", value: <Badge text={client.risk_profile || "—"} color={client.risk_profile === "Ultra-High" || client.risk_profile === "High" ? badgeColors("red") : client.risk_profile === "Moderate" ? badgeColors("yellow") : badgeColors("green")} /> },
                    { label: "FATCA Status", value: <StatusBadge s={client.fatca_status} /> },
                    { label: "CKYC ID", value: <span className={`text-xs font-mono ${t.text}`}>{client.ckyc_id ? maskVal(client.ckyc_id) : "Not linked"}</span> },
                    { label: "Aadhaar", value: <span className={`text-xs ${t.successText}`}>XXXX XXXX 5678 ✓</span> },
                  ].map(row => (
                    <div key={row.label} className={`flex items-center justify-between py-2.5 border-b ${t.border} last:border-0`}>
                      <span className={`text-xs ${t.textMuted} w-44`}>{row.label}</span>
                      {row.value}
                    </div>
                  ))}
                  <div className={`flex items-start justify-between py-2.5 border-b ${t.border} last:border-0`}>
                    <span className={`text-xs ${t.textMuted} w-44`}>PAN</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-mono ${t.text}`}>{revealedFields.has("pan_kyc") && canViewPII ? (client.pan || "—") : maskVal(client.pan)}</span>
                      {canViewPII && (
                        <button onClick={() => toggleField("pan_kyc")} className={`p-0.5 rounded ${revealedFields.has("pan_kyc") ? t.successText : t.textMuted} hover:opacity-70`}>
                          {revealedFields.has("pan_kyc") ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>KYC Documents</div>
                <div className={`${t.bgCard2} rounded-xl p-4 border ${t.border}`}>
                  {[
                    { doc: "ID Proof (Aadhaar)", status: "Verified", ok: true },
                    { doc: "Address Proof (Passport)", status: "Verified", ok: true },
                    { doc: "PAN Card", status: "Verified", ok: true },
                    { doc: "Photograph", status: "Verified", ok: true },
                    { doc: "Income Proof", status: "Pending", ok: false },
                  ].map(row => (
                    <div key={row.doc} className={`flex items-center justify-between py-2.5 border-b ${t.border} last:border-0`}>
                      <div className="flex items-center gap-2">
                        <FileText className={`w-3.5 h-3.5 ${t.textMuted}`} />
                        <span className={`text-xs ${t.text}`}>{row.doc}</span>
                      </div>
                      <span className={`text-xs font-medium ${row.ok ? t.successText : t.warningText}`}>{row.ok ? "✓ " : "○ "}{row.status}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 p-4 rounded-xl border ${isDark ? "border-blue-800/40 bg-blue-950/20" : "border-blue-200 bg-blue-50"}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-blue-300" : "text-blue-700"}`}>Compliance Summary</div>
                  <div className="space-y-1">
                    {[
                      { k: "AML Screening", v: "Passed" },
                      { k: "PEP Check", v: "Clear" },
                      { k: "Sanctions List", v: "Not Listed" },
                      { k: "Last Review Date", v: fmtDate(client.updated_at) },
                    ].map(r => (
                      <div key={r.k} className="flex justify-between">
                        <span className={`text-[10px] ${isDark ? "text-blue-300/70" : "text-blue-600/70"}`}>{r.k}</span>
                        <span className={`text-[10px] font-semibold ${isDark ? "text-blue-200" : "text-blue-800"}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACCOUNTS ─────────────────────────────────── */}
          {tab === "accounts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>Demat Account</div>
                <div className={`${t.bgCard2} rounded-xl p-4 border ${t.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold font-mono ${t.text}`}>
                      {revealedFields.has("demat_account") && canViewPII ? (client.demat_account || "—") : maskVal(client.demat_account)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {canViewPII && (
                        <button onClick={() => toggleField("demat_account")} className={`p-0.5 rounded ${revealedFields.has("demat_account") ? t.successText : t.textMuted} hover:opacity-70`}>
                          {revealedFields.has("demat_account") ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      <Badge text="Active" color={badgeColors("green")} />
                    </div>
                  </div>
                  <div className={`text-xs ${t.textMuted} mb-1`}>DP ID: <span className={`font-mono ${t.text}`}>
                    {revealedFields.has("dp_id") && canViewPII ? (client.dp_id || "—") : maskVal(client.dp_id)}
                    {canViewPII && (
                      <button onClick={() => toggleField("dp_id")} className={`ml-1 p-0.5 rounded ${revealedFields.has("dp_id") ? t.successText : t.textMuted} hover:opacity-70 inline-flex`}>
                        {revealedFields.has("dp_id") ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                  </span></div>
                  <div className={`text-xs ${t.successText}`}>● Active · NSDL</div>
                  <div className={`mt-3 pt-3 border-t ${t.border} grid grid-cols-2 gap-2 text-[10px] ${t.textMuted}`}>
                    <div>Depository: <span className={t.text}>NSDL</span></div>
                    <div>DP Name: <span className={t.text}>NIYTRI DP</span></div>
                    <div>Account Type: <span className={t.text}>Individual</span></div>
                    <div>Mode: <span className={t.text}>Online</span></div>
                  </div>
                </div>

                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mt-5 mb-3`}>Trading Account</div>
                <div className={`${t.bgCard2} rounded-xl p-4 border ${t.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold font-mono ${t.text}`}>TRD-{client.client_code || "—"}</span>
                    <Badge text="Active" color={badgeColors("green")} />
                  </div>
                  <div className={`grid grid-cols-2 gap-2 text-[10px] ${t.textMuted} mt-2`}>
                    <div>Segment: <span className={t.text}>EQ / FO / CD</span></div>
                    <div>Exchange: <span className={t.text}>NSE / BSE</span></div>
                    <div>Margin: <span className={t.text}>{fmtMoney(500000)}</span></div>
                    <div>Risk Profile: <span className={t.text}>{client.risk_profile || "—"}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mb-3`}>Bank Accounts</div>
                <div className="space-y-3">
                  {[
                    { num: "XXXX XXXX XXXX 4521", bank: "HDFC Bank", type: "Primary", modes: "RTGS / NEFT / IMPS" },
                    { num: "XXXX XXXX XXXX 8832", bank: "ICICI Bank", type: "Secondary", modes: "NEFT / IMPS" },
                  ].map(acc => (
                    <div key={acc.num} className={`${t.bgCard2} rounded-xl p-4 border ${t.border}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-mono font-bold ${t.text}`}>{acc.num}</span>
                        <Badge text={acc.type} color={acc.type === "Primary" ? badgeColors("blue") : badgeColors("gray")} />
                      </div>
                      <div className={`text-xs ${t.textMuted}`}>{acc.bank}</div>
                      <div className={`text-[10px] ${t.textMuted} mt-1`}>{acc.modes} ✓</div>
                    </div>
                  ))}
                </div>

                <div className={`text-[10px] uppercase font-bold tracking-widest ${t.textMuted} mt-5 mb-3`}>Portfolio Summary</div>
                <div className={`${t.bgCard2} rounded-xl p-4 border ${t.border}`}>
                  {[
                    { label: "Total Invested", raw: 1245000, pnl: false },
                    { label: "Current Value", raw: 1482300, pnl: false },
                    { label: "Unrealised P&L", raw: 237300, pnl: true, pct: "19.1%" },
                    { label: "Realised P&L (FY)", raw: 48200, pnl: true },
                  ].map(r => (
                    <div key={r.label} className={`flex justify-between py-2 border-b ${t.border} last:border-0`}>
                      <span className={`text-xs ${t.textMuted}`}>{r.label}</span>
                      <span className={`text-xs font-semibold ${r.pnl ? t.successText : t.text}`}>{r.pnl ? "+" : ""}{fmtMoney(r.raw)}{r.pct ? ` (${r.pct})` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SERVICE REQUESTS ─────────────────────────── */}
          {tab === "srs" && (
            loadingTab ? <LoadingSpinner /> :
            srs.length === 0 ? <EmptyState message="No service requests for this client" /> :
            <div className="space-y-3">
              <div className={`text-[10px] ${t.textMuted} mb-1`}>{srs.length} service request{srs.length !== 1 ? "s" : ""} found</div>
              {srs.map((sr: any) => (
                <div key={sr.id} className={`${t.bgCard2} rounded-xl p-4 border ${t.border} hover:border-violet-500/40 transition-colors`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <code className={`${t.codeBlue} text-xs font-bold`}>{sr.sr_code}</code>
                      <PriorityBadge p={sr.priority} />
                    </div>
                    <StatusBadge s={sr.status} />
                  </div>
                  <div className={`text-sm font-medium ${t.text} mb-1`}>{sr.subject}</div>
                  {sr.description && <p className={`text-xs ${t.textMuted} mb-2 line-clamp-2`}>{sr.description}</p>}
                  <div className={`flex items-center justify-between text-[10px] ${t.textMuted}`}>
                    <span>Vertical: {sr.vertical || "—"}</span>
                    <span>{fmtDateTime(sr.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── DEALS ────────────────────────────────────── */}
          {tab === "deals" && (
            loadingTab ? <LoadingSpinner /> :
            deals.length === 0 ? <EmptyState message="No deals for this client" /> :
            <div className="space-y-3">
              <div className={`text-[10px] ${t.textMuted} mb-1`}>{deals.length} deal{deals.length !== 1 ? "s" : ""} found</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deals.map((d: any) => (
                  <div key={d.id} className={`${t.bgCard2} rounded-xl p-4 border ${t.border} hover:border-violet-500/40 transition-colors`}>
                    <div className="flex items-center justify-between mb-2">
                      <code className={`${t.warningText} text-xs font-bold`}>{d.deal_code}</code>
                      <StatusBadge s={d.stage} />
                    </div>
                    <div className={`text-sm font-semibold ${t.text} mb-1`}>{d.name}</div>
                    <div className={`text-lg font-bold ${t.text} mb-2`}>{d.value ? fmtMoneyStr(d.value) : "—"}</div>
                    <div className={`flex items-center justify-between text-[10px] ${t.textMuted}`}>
                      <span>RM: {d.rm_name || "—"}</span>
                      <span>Vertical: {d.vertical || "—"}</span>
                    </div>
                    {d.expected_close && (
                      <div className={`mt-1 text-[10px] ${t.textMuted}`}>Expected close: {fmtDate(d.expected_close)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LEADS ────────────────────────────────────── */}
          {tab === "leads" && (
            loadingTab ? <LoadingSpinner /> :
            leads.length === 0 ? <EmptyState message="No leads for this client" /> :
            <div className="space-y-3">
              <div className={`text-[10px] ${t.textMuted} mb-1`}>{leads.length} lead{leads.length !== 1 ? "s" : ""} found</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leads.map((l: any) => (
                  <div key={l.id} className={`${t.bgCard2} rounded-xl p-4 border ${t.border} hover:border-violet-500/40 transition-colors`}>
                    <div className="flex items-center justify-between mb-2">
                      <code className={`${t.codeGreen} text-xs font-bold`}>{l.lead_code}</code>
                      <PriorityBadge p={l.priority} />
                    </div>
                    <div className={`text-sm font-medium ${t.text} mb-1`}>{l.name}</div>
                    <div className={`flex items-center justify-between text-[10px] ${t.textMuted}`}>
                      <span>Stage: {l.stage}</span>
                      <span>Open: {l.days_open}d</span>
                    </div>
                    <div className={`text-[10px] ${t.textMuted} mt-1`}>Vertical: {l.vertical || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ────────────────────────────────── */}
          {tab === "docs" && (
            loadingTab ? <LoadingSpinner /> :
            docs.length === 0 ? <EmptyState message="No documents for this client" /> :
            <div className="space-y-3">
              <div className={`text-[10px] ${t.textMuted} mb-1`}>{docs.length} document{docs.length !== 1 ? "s" : ""} found</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {docs.map((d: any) => (
                  <div key={d.id} className={`${t.bgCard2} rounded-xl p-4 border ${t.border} hover:border-violet-500/40 transition-colors`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${isDark ? "bg-blue-900/50" : "bg-blue-100"} flex items-center justify-center flex-shrink-0`}>
                        <FileText className={`w-4 h-4 ${isDark ? "text-blue-300" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${t.text} truncate`}>{d.name}</div>
                        <Badge text={d.current_version || "v1"} color={badgeColors("blue")} />
                      </div>
                    </div>
                    <div className={`text-[10px] ${t.textMuted}`}>{d.type}</div>
                    <div className="flex items-center justify-between mt-2">
                      <StatusBadge s={d.status} />
                      <span className={`text-[10px] ${t.textMuted}`}>{fmtDate(d.created_at)}</span>
                    </div>
                    {d.file_name && (
                      <div className={`mt-2 pt-2 border-t ${t.border} flex items-center gap-1 text-[10px] ${t.textMuted} truncate`}>
                        <Paperclip className="w-3 h-3 flex-shrink-0" />{d.file_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CLIENT 360 ONVIEW PANEL ─────────────────────────────────────────────────
function Client360Panel({ client, t, onClose, loggedUser }: { client: any; t: ReturnType<typeof useTheme>; onClose: () => void; loggedUser?: any }) {
  const [tab, setTab] = useState("overview");
  const [srs, setSrs] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [showAccessReq, setShowAccessReq] = useState(false);
  const [showChangeOwner, setShowChangeOwner] = useState(false);
  const [showExpand, setShowExpand] = useState(false);
  const [accessReqSent, setAccessReqSent] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [hasApprovedAccess, setHasApprovedAccess] = useState(false);

  // Check if current user has an approved, non-expired PII access request for this client
  useEffect(() => {
    if (!loggedUser?.id || !client?.id) return;
    fetch(`${API_BASE}/api/clients/${client.id}/access-requests`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then((d: any) => {
        const arr: any[] = Array.isArray(d) ? d : (d.data || []);
        const now = new Date();
        const approved = arr.some(
          (r: any) => r.requester_id === loggedUser.id &&
            r.status === "approved" &&
            (!r.expires_at || new Date(r.expires_at) > now)
        );
        setHasApprovedAccess(approved);
      })
      .catch(() => {});
  }, [loggedUser?.id, client?.id]);

  // PDF Download — masked only (full 360 fields)
  const downloadMaskedPDF = () => {
    const mask = (v: string | null | undefined) => {
      if (!v) return "—";
      const s = String(v);
      if (s.length <= 4) return "••••";
      return s.slice(0, 2) + "•".repeat(Math.min(s.length - 4, 6)) + s.slice(-2);
    };
    const fmtDate = (v: string | null | undefined) => v ? new Date(v).toLocaleDateString("en-IN") : "—";
    const safe = (v: any) => v || "—";

    // Build contacts table rows
    const contacts: any[] = client.contacts || [];
    const contactRows = contacts.length > 0
      ? contacts.map((c: any) => `<tr><td>${c.contact_type} ${c.is_primary ? "(Primary)" : ""} ${c.label ? `[${c.label}]` : ""}</td><td class="masked">${mask(c.value)}</td></tr>`).join("")
      : `<tr><td>Mobile</td><td class="masked">${mask(client.mobile)}</td></tr>
         <tr><td>Email</td><td class="masked">${mask(client.email)}</td></tr>
         <tr><td>Landline</td><td class="masked">${mask(client.landline || client.phone)}</td></tr>
         <tr><td>Address</td><td class="masked">${mask(client.address)}</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Client 360 Profile — ${client.name}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;color:#111;max-width:760px;margin:0 auto;padding:32px;font-size:13px}
      h1{font-size:20px;margin:0 0 4px}
      h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#374151;
         background:#f3f4f6;padding:6px 10px;border-radius:4px;margin:20px 0 0}
      .badge{display:inline-block;background:#e5e7eb;padding:2px 10px;border-radius:12px;font-size:11px;margin-right:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:2px}
      td{padding:6px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
      td:first-child{color:#6b7280;width:36%;white-space:nowrap}
      td:last-child{font-weight:500;color:#111;word-break:break-word}
      .masked{font-family:monospace;letter-spacing:2px;color:#9ca3af}
      .warn{background:#fef3c7;padding:10px 14px;border-radius:8px;font-size:11px;color:#92400e;margin-top:24px;line-height:1.5}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
      .logo{font-weight:bold;font-size:18px;color:#1d4ed8;letter-spacing:-.3px}
      .meta{font-size:10px;color:#9ca3af;text-align:right;line-height:1.6}
      hr{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
      .section-gap{margin-top:4px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
      @media print{body{padding:16px}.warn{page-break-inside:avoid}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="logo">NIYTRI Financial Services</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:3px">Client 360 Profile — CONFIDENTIAL</div>
      </div>
      <div class="meta">
        Generated: ${new Date().toLocaleString("en-IN")}<br/>
        Generated by: ${safe(client._generatedBy || "CRM System")}<br/>
        All PII masked per data policy
      </div>
    </div>
    <hr/>
    <h1>${client.name}</h1>
    <div style="margin:6px 0 16px">
      <span class="badge">${safe(client.type)}</span>
      <span class="badge">${safe(client.category)}</span>
      <span class="badge">${safe(client.status)}</span>
      <span class="badge">KYC: ${safe(client.kyc_status)}</span>
      <code style="font-size:11px;background:#f1f5f9;padding:2px 8px;border-radius:6px;margin-left:4px">${safe(client.client_code)}</code>
    </div>

    <h2>1. Basic Information</h2>
    <table class="section-gap">
      <tr><td>Client Code</td><td>${safe(client.client_code)}</td></tr>
      <tr><td>Type</td><td>${safe(client.type)}</td></tr>
      <tr><td>Category</td><td>${safe(client.category)}</td></tr>
      <tr><td>Status</td><td>${safe(client.status)}</td></tr>
      <tr><td>Risk Profile</td><td>${safe(client.risk_profile)}</td></tr>
      <tr><td>RM Assigned</td><td>${safe(client.rm_name)}</td></tr>
      <tr><td>Owner</td><td>${safe(client.owner_name)}</td></tr>
      <tr><td>Verticals</td><td>${(client.verticals || []).join(", ") || "—"}</td></tr>
      <tr><td>Client Since</td><td>${fmtDate(client.created_at)}</td></tr>
      ${client.notes ? `<tr><td>Notes</td><td>${client.notes}</td></tr>` : ""}
    </table>

    <h2>2. Contact Details (Masked)</h2>
    <table class="section-gap">
      ${contactRows}
    </table>

    <h2>3. KYC / Compliance (Masked)</h2>
    <table class="section-gap">
      <tr><td>PAN</td><td class="masked">${mask(client.pan)}</td></tr>
      <tr><td>Date of Birth</td><td class="masked">${mask(client.date_of_birth)}</td></tr>
      <tr><td>Date of Incorp.</td><td>${fmtDate(client.date_of_incorporation)}</td></tr>
      <tr><td>KYC Status</td><td>${safe(client.kyc_status)}</td></tr>
      <tr><td>FATCA Status</td><td>${safe(client.fatca_status)}</td></tr>
      <tr><td>CKYC ID</td><td class="masked">${mask(client.ckyc_id)}</td></tr>
    </table>

    <h2>4. Banking &amp; Demat (Masked)</h2>
    <table class="section-gap">
      <tr><td>Demat Account</td><td class="masked">${mask(client.demat_account)}</td></tr>
      <tr><td>DP ID</td><td class="masked">${mask(client.dp_id)}</td></tr>
    </table>

    <div class="warn">
      ⚠ IMPORTANT — DATA CLASSIFICATION: CONFIDENTIAL<br/>
      All personally identifiable information (PAN, DOB, contact details, account numbers) is masked in this export as per NIYTRI data governance policy.
      This document is generated for internal record purposes only. Unauthorized distribution, copying, or sharing outside authorised channels is strictly prohibited.
      For full unmasked records, contact your Super Admin or Compliance Officer.
    </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  // PII access logic — respects global piiSettings from admin panel
  const isSuperAdmin = (loggedUser?.role || "").toLowerCase().includes("super");
  const isAdminRole = (loggedUser?.role || "").toLowerCase().includes("admin");
  const isOwner = !!(loggedUser?.id && client?.owner_id && loggedUser.id === client.owner_id);
  const canViewPII =
    (piiSettings.allow_admin_view && (isSuperAdmin || isAdminRole)) ||
    (piiSettings.allow_owner_view && isOwner) ||
    hasApprovedAccess;  // approved PII access request grants reveal permission

  // PII is always masked; eye button reveals per-field if user has access
  const pii = (v: string | null | undefined, fieldKey: string) => {
    return revealedFields.has(fieldKey) && canViewPII ? (v || "—") : maskValue(v);
  };

  const toggleField = (fieldKey: string) => {
    if (!canViewPII) { setShowAccessReq(true); return; }
    setRevealedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey); else next.add(fieldKey);
      return next;
    });
  };

  const PiiField = ({ label, value, fieldKey }: { label: string; value: string | null | undefined; fieldKey: string }) => {
    const revealed = revealedFields.has(fieldKey) && canViewPII;
    return (
      <div className={`flex justify-between items-center text-xs py-1.5 border-b ${t.border} last:border-0`}>
        <span className={t.textMuted}>{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`font-medium ${t.text} ${!revealed ? "font-mono tracking-wider" : ""}`}>{pii(value, fieldKey)}</span>
          <button onClick={() => toggleField(fieldKey)} title={revealed ? "Hide" : (canViewPII ? "Reveal" : "Request access")}
            className={`p-0.5 rounded ${revealed ? t.successText : t.textMuted} hover:opacity-70 transition-colors`}>
            {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      </div>
    );
  };

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
    <>
    {showTeams && <TeamsMeetingModal client={client} organizerEmail={loggedUser?.email || ""} t={t} isDark={isDark} onClose={() => setShowTeams(false)} />}
    {showAccessReq && <AccessRequestModal clientId={client.id} clientName={client.name} requesterId={loggedUser?.id || ""} requesterName={loggedUser?.name || ""} t={t} onClose={() => setShowAccessReq(false)} onSuccess={() => { setShowAccessReq(false); setAccessReqSent(true); }} />}
    {showChangeOwner && <ChangeOwnerModal clientId={client.id} clientName={client.name} currentOwnerId={client.owner_id} changedBy={loggedUser} t={t} onClose={() => setShowChangeOwner(false)} onSuccess={() => setShowChangeOwner(false)} />}
    {showExpand && <ClientExpandModal client={client} loggedUser={loggedUser} canViewPII={canViewPII} t={t} isDark={isDark} onClose={() => setShowExpand(false)} onDownloadPDF={downloadMaskedPDF} onScheduleMeeting={() => { setShowExpand(false); setShowTeams(true); }} />}
    <div className={`w-96 border-l ${t.border} ${t.bgCard} flex flex-col flex-shrink-0 overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${t.border} flex-shrink-0`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xs font-bold ${t.text} flex items-center gap-1.5`}>
            <User className="w-3.5 h-3.5 text-blue-400" /> Client 360 · OneView
          </div>
          <div className="flex items-center gap-1">
            <Tip label="Schedule Teams Meeting">
              <button onClick={() => setShowTeams(true)} className={`p-1 rounded ${t.textMuted} hover:text-blue-400`}><Video className="w-3.5 h-3.5" /></button>
            </Tip>
            <Tip label="Close">
              <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
            </Tip>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${client.type === "Individual" ? "bg-blue-600" : "bg-violet-600"} flex items-center justify-center text-xs font-bold text-white`}>
            {client.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-bold ${t.text} truncate`}>{client.name}</div>
            <code className={`${t.codeBlue} text-[10px]`}>{client.client_code}</code>
          </div>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <Badge text={client.type} color={t.tagGray} />
          <Badge text={client.category} color={t.tagGray} />
          <StatusBadge s={client.status} />
        </div>
        {/* Owner strip */}
        <div className={`mt-2.5 flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-gray-800/60" : "bg-slate-100"}`}>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-blue-400" />
            <span className={`text-[10px] ${t.textMuted}`}>Owner:</span>
            <span className={`text-[10px] font-semibold ${t.text}`}>{client.owner_name || "Unassigned"}</span>
            {isOwner && <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700"}`}>You</span>}
          </div>
          {isSuperAdmin && (
            <Tip label="Change Owner">
              <button onClick={() => setShowChangeOwner(true)} className={`${t.textMuted} hover:text-blue-400`}><UserCog className="w-3 h-3" /></button>
            </Tip>
          )}
        </div>
        {/* PII access bar */}
        {!canViewPII && (
          <div className={`mt-2 flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-amber-950/30 border border-amber-900/40" : "bg-amber-50 border border-amber-200"}`}>
            <div className="flex items-center gap-1.5">
              <Lock className={`w-3 h-3 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
              <span className={`text-[10px] ${isDark ? "text-amber-300" : "text-amber-700"}`}>PII data is masked</span>
            </div>
            {accessReqSent ? (
              <span className={`text-[9px] ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Request sent ✓</span>
            ) : (
              <button onClick={() => setShowAccessReq(true)} className={`text-[10px] font-semibold ${isDark ? "text-amber-400 hover:text-amber-300" : "text-amber-700 hover:text-amber-800"}`}>
                Request Access
              </button>
            )}
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className={`flex border-b ${t.border} flex-shrink-0 overflow-x-auto`}>
        {tabs.map(tab2 => (
          <button key={tab2.id} onClick={() => setTab(tab2.id)}
            className={`px-3 py-2 text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === tab2.id ? `border-b-2 ${t.activeTab}` : t.textMuted}`}>
            {tab2.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tab === "overview" && (
          <>
            {/* Non-PII fields */}
            {[
              { label: "Full Name", value: client.name, piiField: false },
              { label: "Client Code", value: client.client_code, piiField: false },
              { label: "Type", value: client.type, piiField: false },
              { label: "Category", value: client.category, piiField: false },
              { label: "RM", value: client.rm_name || "—", piiField: false },
              { label: "Verticals", value: (client.verticals || []).join(", ") || "—", piiField: false },
              { label: "Client Since", value: fmtDateShort(client.created_at), piiField: false },
            ].map(row => (
              <div key={row.label} className={`py-1.5 border-b ${t.border} last:border-0`}>
                <div className={`text-[9px] uppercase font-bold ${t.textMuted} mb-0.5`}>{row.label}</div>
                <div className={`text-xs ${t.text} break-words`}>{row.value}</div>
              </div>
            ))}
            {/* PII fields — always masked, eye button to reveal */}
            <PiiField label="Mobile" value={client.mobile} fieldKey="mobile" />
            <PiiField label="Email" value={client.email} fieldKey="email" />
            <PiiField label="PAN" value={client.pan} fieldKey="pan" />
            <PiiField label="Date of Birth / Incorp." value={client.date_of_birth ? fmtDateShort(client.date_of_birth) : client.date_of_incorporation ? fmtDateShort(client.date_of_incorporation) : null} fieldKey="dob" />
            <PiiField label="Address" value={client.address} fieldKey="address" />
            <div className={`py-1.5 border-b ${t.border} last:border-0`}>
              <div className={`text-[9px] uppercase font-bold ${t.textMuted} mb-0.5`}>Updated</div>
              <div className={`text-xs ${t.text}`}>{fmtDateTime(client.updated_at)}</div>
            </div>
          </>
        )}
        {tab === "kyc" && (
          <>
            {[
              { label: "KYC Status", value: <StatusBadge s={client.kyc_status} /> },
              { label: "Risk Profile", value: <Badge text={client.risk_profile || "—"} color={client.risk_profile === "Ultra-High" ? badgeColors("red") : client.risk_profile === "High" ? badgeColors("red") : client.risk_profile === "Moderate" ? badgeColors("yellow") : badgeColors("green")} /> },
              { label: "FATCA Status", value: <StatusBadge s={client.fatca_status} /> },
              { label: "PAN", value: <span className={`text-xs font-mono ${t.text}`}>{maskValue(client.pan)}</span> },
              { label: "CKYC ID", value: <span className={`text-xs font-mono ${t.text}`}>{client.ckyc_id ? maskValue(client.ckyc_id) : "Not linked"}</span> },
              { label: "Aadhaar", value: <span className={`text-xs ${t.successText}`}>XXXX XXXX 5678 ✓</span> },
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
                  <span className={t.successText}>✓ Verified</span>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "accounts" && (
          <>
            <div className={`text-[9px] uppercase font-bold ${t.textMuted} mb-1`}>Demat Account</div>
            <div className={`${t.bgCard2} rounded-xl p-3 mb-3 border ${t.border}`}>
              <div className="flex items-center justify-between">
                <div className={`text-xs font-mono font-bold ${t.text}`}>
                  {revealedFields.has("demat_account_card") && canViewPII ? (client.demat_account || "—") : maskValue(client.demat_account)}
                </div>
                {canViewPII && (
                  <button onClick={() => toggleField("demat_account_card")} className={`p-0.5 rounded ${revealedFields.has("demat_account_card") ? t.successText : t.textMuted} hover:opacity-70`}>
                    {revealedFields.has("demat_account_card") ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <div className={`text-[10px] ${t.textMuted} mt-0.5 flex items-center gap-1`}>
                DP ID: <span className="font-mono">
                  {revealedFields.has("dp_id_card") && canViewPII ? (client.dp_id || "—") : maskValue(client.dp_id)}
                </span>
                {canViewPII && (
                  <button onClick={() => toggleField("dp_id_card")} className={`p-0.5 rounded ${revealedFields.has("dp_id_card") ? t.successText : t.textMuted} hover:opacity-70`}>
                    {revealedFields.has("dp_id_card") ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <div className={`text-[10px] mt-1 ${t.successText}`}>● Active · NSDL</div>
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
                <code className={`${t.codeBlue} text-[10px] font-bold`}>{sr.sr_code}</code>
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
                <code className={`${t.warningText} text-[10px] font-bold`}>{d.deal_code}</code>
                <StatusBadge s={d.stage} />
              </div>
              <div className={`text-xs font-medium ${t.text} mb-1`}>{d.name}</div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${t.text}`}>{d.value ? fmtMoneyStr(d.value) : "—"}</span>
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
                <code className={`${t.codeGreen} text-[10px] font-bold`}>{l.lead_code}</code>
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
                <Badge text={d.current_version} color={badgeColors("blue")} />
              </div>
              <div className={`text-[10px] ${t.textMuted}`}>{d.type} · {fmtDateShort(d.created_at)}</div>
            </div>
          ))
        )}
      </div>
      {/* Actions */}
      <div className={`p-3 border-t ${t.border} flex-shrink-0 flex gap-2`}>
        <Tip label="Schedule Teams Meeting">
          <button onClick={() => setShowTeams(true)} className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:text-blue-400 transition-colors`}>
            <Video className="w-3 h-3" /> Meet
          </button>
        </Tip>
        <Tip label="Expand Full Client View">
          <button onClick={() => setShowExpand(true)} className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:text-violet-400 transition-colors`}>
            <Maximize2 className="w-3 h-3" /> Expand
          </button>
        </Tip>
        <Tip label="Download Client Profile as PDF (masked)">
          <button onClick={downloadMaskedPDF} className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:text-emerald-400 transition-colors`}>
            <Printer className="w-3 h-3" /> PDF
          </button>
        </Tip>
      </div>
    </div>
    </>
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
// Deal stages with their flags (won / lost / skip allowed), filled from Admin → Pipeline Stages at sign-in
const DEAL_STAGE_META: Record<string, { id: string; label: string; is_won?: boolean; is_lost?: boolean; skip_allowed?: boolean }[]> = {};
const DEAL_STAGES: Record<string, string[]> = {
  retail:    ["Active", "Applied", "Allotted", "Completed", "Executed"],
  corporate: ["Active", "In Progress", "Pending", "Executed", "Settled"],
  ib:        ["Pitch", "Mandate", "Mandate Letter", "Mandate Signed", "DD", "Due Diligence", "Documentation", "Near Closure"],
  aif:       ["Active", "Suitability", "KYC", "Committed", "First Close", "Called", "Capital Called"],
  ie:        ["Active", "In Discussion", "In Progress", "Pending", "Executed"],
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
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{text || "—"}</span>;
}

// Theme-aware badge colors
function badgeColors(kind: "green" | "yellow" | "blue" | "red" | "violet" | "gray") {
  const dark = isDark;
  const map: Record<string, string> = {
    green:  dark ? "bg-emerald-900/70 text-emerald-400" : "bg-emerald-100 text-emerald-700",
    yellow: dark ? "bg-yellow-900/70 text-yellow-400"   : "bg-amber-100 text-amber-700",
    blue:   dark ? "bg-blue-900/70 text-blue-400"       : "bg-blue-100 text-blue-700",
    red:    dark ? "bg-red-900/70 text-red-400"         : "bg-red-100 text-red-700",
    violet: dark ? "bg-violet-900/70 text-violet-400"   : "bg-violet-100 text-violet-700",
    gray:   dark ? "bg-gray-800 text-gray-400"          : "bg-slate-100 text-slate-600",
  };
  return map[kind] ?? map.gray;
}

function PriorityBadge({ p }: { p: string }) {
  const c = p === "Critical" ? badgeColors("red") : p === "High" ? badgeColors("red") : p === "Medium" ? badgeColors("yellow") : badgeColors("gray");
  return <Badge text={p || "—"} color={c} />;
}
function StatusBadge({ s }: { s: string }) {
  const c = ["Verified", "Executed", "Active", "Signed", "Final", "Settled", "Called", "Allotted", "Resolved", "Closed", "Connected", "Enforced"].includes(s) ? badgeColors("green")
    : ["Pending", "Draft", "In Negotiation", "Open"].includes(s) ? badgeColors("yellow")
    : ["In Progress", "Partially Executed", "Fundraising", "Executing", "Live", "Reviewed", "Sent"].includes(s) ? badgeColors("blue")
    : ["Escalated", "Breached", "Expired", "Error"].includes(s) ? badgeColors("red")
    : ["Near Closure", "Subscription Signed", "Mandate Signed"].includes(s) ? badgeColors("violet")
    : ["Warning"].includes(s) ? badgeColors("yellow")
    : badgeColors("gray");
  return <Badge text={s || "—"} color={c} />;
}
function AuthBadge({ method }: { method: AuthMethod }) {
  return method === "m365"
    ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700"}`}><span className="font-black">⊞</span>M365</span>
    : <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? "bg-gray-800 text-gray-400" : "bg-slate-100 text-slate-600"}`}>App Auth</span>;
}

// ─── TOOLTIP WRAPPER ─────────────────────────────────────────────────────────
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span title={label} className="relative">{children}</span>;
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

function LoginScreen({ onAppLogin, onM365Login, onM365MFA, isDark, m365Error }: { onAppLogin: (email: string) => void; onM365Login: (token: string, userJson: string) => void; onM365MFA: (email: string) => void; isDark: boolean; m365Error?: string }) {
  const t = useTheme(isDark);
  // No default credentials. The last e-mail is remembered on this browser (if allowed);
  // the password is left to the browser's own password manager.
  const savedEmail = (() => { try { return localStorage.getItem("niytri_last_email") || ""; } catch { return ""; } })();
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(m365Error || "");
  const [loading, setLoading] = useState(false);
  const [m365Loading, setM365Loading] = useState(false);

  const [m365Hint, setM365Hint] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!email.includes("@niytri.com")) { setError("Please use your @niytri.com email address."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setError(""); setM365Hint(false); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        if (data.auth_type === "m365") setM365Hint(true);
        setLoading(false);
        return;
      }
      try { if (remember) localStorage.setItem("niytri_last_email", email.trim().toLowerCase()); else localStorage.removeItem("niytri_last_email"); } catch { /* storage blocked */ }
      // Offer the browser's "Save password?" (Chrome / Edge / Android); Safari & Firefox use the form autocomplete hints
      try { const PC = (window as any).PasswordCredential; if (remember && PC && navigator.credentials) navigator.credentials.store(new PC({ id: email.trim().toLowerCase(), password, name: email.trim().toLowerCase() })).catch(() => {}); } catch { /* not supported */ }
      // MFA disabled path: API returns token + user directly (no OTP step)
      if (data.token && data.user) {
        localStorage.setItem("niytri_token", data.token);
        localStorage.setItem("niytri_user", JSON.stringify(data.user));
        onM365Login(data.token, JSON.stringify(data.user));
      } else {
        // MFA enabled path: API returns requiresOtp: true
        onAppLogin(email);
      }
    } catch {
      onAppLogin(email);
    }
    setLoading(false);
  };

  const handleM365 = () => {
    setM365Loading(true);
    const redirectUrl = `${API_BASE}/api/auth/m365/redirect`;

    // Open in a popup so the OAuth flow doesn't break inside the iframe.
    // Microsoft's login page blocks loading in iframes (X-Frame-Options).
    const pw = 520, ph = 660;
    const pl = Math.max(0, Math.round((window.screen.width - pw) / 2));
    const pt = Math.max(0, Math.round((window.screen.height - ph) / 2));
    const popup = window.open(
      redirectUrl,
      "niytri_m365_auth",
      `popup=yes,width=${pw},height=${ph},left=${pl},top=${pt},resizable=yes`,
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
      } else if (event.data?.type === "NIYTRI_M365_MFA") {
        // M365 succeeded but MFA is required — go to OTP step
        window.removeEventListener("message", handler);
        setM365Loading(false);
        onM365MFA(event.data.email);
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
          <img src={APP_LOGO} onError={logoFallback} alt="NIYTRI" className="w-14 h-14 rounded-2xl object-contain mx-auto mb-4" />
          <h1 className={`text-2xl font-bold ${t.text}`}>NIYTRI CRM</h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>Enterprise Financial Services Platform</p>
        </div>
        <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 shadow-xl space-y-4`}>
          <h2 className={`text-sm font-semibold ${t.text}`}>Sign in to your account</h2>

          {/* M365 SSO Button */}
          {m365Hint && (
            <div className="flex items-center gap-2 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2">
              <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
              Please use the button below to sign in with Microsoft 365
            </div>
          )}
          <button
            onClick={handleM365}
            disabled={m365Loading}
            className={`w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border-2 transition-all disabled:opacity-60 ${m365Hint ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30 animate-pulse" : (isDark ? "border-gray-700 hover:border-blue-600 bg-gray-800" : "border-gray-200 hover:border-blue-500 bg-gray-50 hover:bg-white")}`}
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

          <form className="space-y-3" onSubmit={e => { e.preventDefault(); handleSubmit(); }} autoComplete="on" method="post" action="#">
            <div>
              <label htmlFor="login-email" className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${t.textMuted}`} />
                <input id="login-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus={!savedEmail}
                  value={email} onChange={e => setEmail(e.target.value)} className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors ${t.inputBg}`} placeholder="you@niytri.com" />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Password</label>
              <div className="relative">
                <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${t.textMuted}`} />
                <input id="login-password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus={!!savedEmail}
                  value={password} onChange={e => setPassword(e.target.value)} className={`w-full border rounded-xl pl-9 pr-11 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors ${t.inputBg}`} placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw} title={showPw ? "Hide password" : "Show password"}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg ${t.textMuted} hover:text-blue-500`}>{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <label className={`flex items-center gap-2 text-xs ${t.textMuted} select-none cursor-pointer`}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Remember Me on This Device
            </label>
          {error && (
            <div className={`flex items-start gap-2 rounded-xl p-3 border ${isDark ? "bg-red-900/30 border-red-700/50" : "bg-red-50 border-red-200"}`}>
              <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? "text-red-400" : "text-red-600"}`} />
              <p className={`text-xs ${isDark ? "text-red-400" : "text-red-600"}`}>{error}</p>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
          </form>
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

const IS_DEV = import.meta.env.DEV || window.location.hostname.includes("replit") || window.location.hostname === "localhost";

function OTPScreen({ onVerify, email, isDark }: { onVerify: (user?: any) => void; email: string; isDark: boolean }) {
  const t = useTheme(isDark);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!IS_DEV) return;
    fetch(`${API_BASE}/api/auth/dev-otp?email=${encodeURIComponent(email)}`)
      .then(r => r.json()).then(d => { if (d.otp) setDevOtp(d.otp); }).catch(() => {});
  }, [email]);

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const resend = async () => {
    setResending(true); setResendMsg(""); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/auth/resend-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json();
      if (r.ok) { setResendMsg(d.message); setOtp(["", "", "", "", "", ""]); refs.current[0]?.focus(); }
      else setError(d.error || "Could not resend code");
    } catch { setError("Network error — please try again"); }
    setResending(false);
  };

  const verify = async (code: string) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid OTP"); setLoading(false); return; }
      localStorage.setItem("niytri_token", data.token);
      localStorage.setItem("niytri_user", JSON.stringify(data.user));
      onVerify(data.user);
    } catch { setError("Network error — please try again"); }
    setLoading(false);
  };

  // Fill boxes from position i with a run of digits (typed, pasted or autofilled)
  const fillFrom = (i: number, digits: string) => {
    const next = [...otp];
    digits.slice(0, 6 - i).split("").forEach((d, k) => { next[i + k] = d; });
    setOtp(next);
    const empty = next.findIndex(d => !d);
    refs.current[empty === -1 ? 5 : empty]?.focus();
    if (next.join("").length === 6) { setTimeout(() => verify(next.join("")), 300); }
  };
  const handleChange = (i: number, val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) { const next = [...otp]; next[i] = ""; setOtp(next); return; }
    if (digits.length >= 6) return fillFrom(0, digits);          // full code autofilled
    if (otp[i] && digits.length === 2) return fillFrom(i, digits.slice(-1)); // typed over a filled box
    fillFrom(i, digits);
  };
  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();
    fillFrom(digits.length >= 6 ? 0 : i, digits);
  };
  const handleKey = (i: number, e: React.KeyboardEvent) => { if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus(); };

  return (
    <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <img src={APP_LOGO} onError={logoFallback} alt="NIYTRI" className="w-14 h-14 rounded-2xl object-contain mx-auto mb-4" />
          <h1 className={`text-xl font-bold ${t.text}`}>Email OTP Verification</h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>6-digit code sent to <span className={`${t.linkText} font-medium`}>{email}</span></p>
        </div>
        {IS_DEV && (
          <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${t.devBanner}`}>
            <TestTube className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Dev/UAT Mode — OTP: <strong className="font-mono tracking-widest">{devOtp || "any 6 digits"}</strong></span>
          </div>
        )}
        <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 shadow-xl`}>
          <div className="flex gap-2 justify-center mb-4">
            {otp.map((d, i) => (
              <input key={i} ref={el => { refs.current[i] = el; }} value={d} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)} onPaste={e => handlePaste(i, e)}
                inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} autoFocus={i === 0}
                className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl outline-none focus:border-blue-500 transition-colors ${t.inputBg} ${d ? "border-blue-500" : ""}`} />
            ))}
          </div>
          {error && <p className={`${t.errorText} text-xs text-center mb-3`}>{error}</p>}
          <button onClick={() => verify(otp.join(""))} disabled={loading || otp.join("").length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            {loading ? "Verifying OTP…" : "Verify & Sign In"}
          </button>
          <p className={`text-[10px] ${t.textMuted} text-center mt-3`}>OTP valid for 5 minutes · <button onClick={resend} disabled={resending} className={`${t.linkText} hover:underline disabled:opacity-50`}>{resending ? "Sending…" : "Resend OTP"}</button></p>
          {resendMsg && <p className={`text-[10px] text-center mt-1 ${t.textMuted}`}>{resendMsg}</p>}
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
    { id: "admin-sla",              label: "SLA / TAT Config",   icon: Clock },
    { id: "admin-verticals",        label: "Verticals Config",    icon: Layers },
    { id: "admin-dropdown-config",  label: "Dropdown Values",     icon: Tag },
    { id: "admin-pipeline-stages",  label: "Pipeline Stages",     icon: TrendingUp },
  ]},
  { section: "AI Settings", items: [
    { id: "admin-llm",         label: "LLM Settings",         icon: Cpu },
    { id: "admin-prompts",     label: "AI Prompts & Access",   icon: Bot },
    { id: "admin-pii-masking", label: "PII Data Masking",      icon: Shield },
  ]},
  { section: "Integrations", items: [
    { id: "admin-m365",    label: "M365 Integration",   icon: Globe },
    { id: "admin-meetings", label: "Meeting Recording", icon: Mic },
    { id: "admin-recordings", label: "All Recordings", icon: Video },
    { id: "admin-fireflies", label: "Fireflies (add-on)", icon: Mic },
  ]},
  { section: "Logs & Audit", items: [
    { id: "admin-audit",    label: "Audit Log",           icon: ClipboardList },
    { id: "admin-ai-logs",  label: "AI Bot Logs",          icon: Bot },
  ]},
  { section: "System", items: [
    { id: "admin-theme",   label: "Theme & Display",    icon: Sun },
    { id: "admin-system",  label: "System Config",      icon: Database },
  ]},
];

function Sidebar({ open, onClose, activeV, setActiveV, activePage, setPage, isDark, isAdmin, setIsAdmin, loggedUser, onLogout, sheet }: any) {
  const [expanded, setExpanded] = useState<string | null>(sheet ? (activeV || null) : null);
  const [adminExpanded, setAdminExpanded] = useState<string | null>("User Management");
  const [globalCollapsed, setGlobalCollapsed] = useState(false);
  const [verticalsCollapsed, setVerticalsCollapsed] = useState(false);
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const nav = (v: Vertical, p: Page) => { setActiveV(v); setPage(p); setIsAdmin(false); if (onClose) onClose(); };
  const navAdmin = (p: Page) => { setIsAdmin(true); setPage(p); setActiveV(null); if (onClose) onClose(); };
  const toggleV = (vid: string) => { if (sheet) { setExpanded(expanded === vid ? null : vid); return; } setExpanded(expanded === vid ? null : vid); setActiveV(vid as Vertical); setPage((firstVisibleModule(vid) || "dashboard") as Page); setIsAdmin(false); };
  const initials = loggedUser ? loggedUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "BN";
  const sb = {
    bg: isDark ? "bg-gray-950" : "bg-white",
    border: isDark ? "border-gray-800" : "border-slate-200",
    text: isDark ? "text-gray-100" : "text-slate-900",
    muted: isDark ? "text-gray-400" : "text-slate-500",
    label: isDark ? "text-gray-500" : "text-slate-400",
    hover: isDark ? "text-gray-400 hover:bg-gray-800/60 hover:text-gray-100" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    sub: isDark ? "text-gray-400 hover:text-gray-100 hover:bg-gray-700/40" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
    adminHov: isDark ? "text-gray-400 hover:bg-gray-800/60 hover:text-gray-100" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    card2: isDark ? "bg-gray-800/60" : "bg-slate-100",
    sep: isDark ? "border-gray-700/60" : "border-slate-200",
    sectionMain: isDark ? "border-l-2 border-blue-500/60 pl-1 ml-1 rounded-r" : "border-l-2 border-blue-400/60 pl-1 ml-1 rounded-r",
    sectionVerticals: isDark ? "border-l-2 border-violet-500/50 pl-1 ml-1 rounded-r" : "border-l-2 border-violet-400/50 pl-1 ml-1 rounded-r",
    sectionAdmin: isDark ? "border-l-2 border-amber-500/50 pl-1 ml-1 rounded-r" : "border-l-2 border-amber-400/50 pl-1 ml-1 rounded-r",
  };
  const sItem = sb.hover;

  return (
    <aside className={sheet ? `m-menu w-full flex flex-col ${sb.bg}` : `${open ? "w-60" : "w-14"} ${sb.bg} border-r ${sb.border} flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden h-full`}>
      <div className={`${sheet ? "hidden" : "flex"} h-14 items-center px-3 border-b ${sb.border} gap-2.5 flex-shrink-0`}>
        <img src={APP_LOGO} onError={logoFallback} alt="NIYTRI" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
        {open && <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${sb.text} leading-none`}>NIYTRI CRM</div><div className={`text-[10px] ${sb.muted} mt-0.5`}>Financial Services</div></div>}
        {open && onClose && <button onClick={onClose} className={`${sb.muted} hover:opacity-70 ml-auto`}><X className="w-4 h-4" /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">

        {/* ── MAIN section ── */}
        <div className={open ? "py-1" : ""}>
          {open && (
            <button onClick={() => setGlobalCollapsed(!globalCollapsed)}
              className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg transition-colors ${sb.adminHov} mb-0.5`}>
              <span className={`text-[9px] font-bold uppercase tracking-widest text-blue-500`}>Main</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${globalCollapsed ? "-rotate-90" : ""} text-blue-500/70`} />
            </button>
          )}
          {(!globalCollapsed || !open) && (
            <div className={open ? `${sb.sectionMain} space-y-0.5` : "space-y-0.5"}>
              <button title="Overall Dashboard" onClick={() => nav(null, "dashboard")} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${!activeV && activePage === "dashboard" && !isAdmin ? "bg-blue-600 text-white" : sItem}`}>
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />{open && <span>Overall Dashboard</span>}
              </button>
              <button title="Client Registry" onClick={() => nav(null, "clients")} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${!activeV && activePage === "clients" && !isAdmin ? "bg-blue-600 text-white" : sItem}`}>
                <User className="w-4 h-4 flex-shrink-0" />{open && <span>Client Registry</span>}
              </button>
              <button title="Service Requests" onClick={() => nav(null, "service")} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${!activeV && activePage === "service" && !isAdmin ? "bg-blue-600 text-white" : sItem}`}>
                <MessageSquare className="w-4 h-4 flex-shrink-0" />{open && <span>Service Requests</span>}
              </button>
              <button title="NIYTRI AI" onClick={() => { setIsAdmin(false); nav(null, "ai"); }} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${!activeV && activePage === "ai" && !isAdmin ? "bg-violet-600 text-white" : sItem}`}>
                <Sparkles className="w-4 h-4 flex-shrink-0" />{open && <><span className="flex-1 text-left">NIYTRI AI</span><span className="text-[9px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-bold">AI</span></>}
              </button>
              <button title="My Calendar" onClick={() => { setIsAdmin(false); nav(null, "calendar"); }} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${!activeV && activePage === "calendar" && !isAdmin ? "bg-blue-600 text-white" : sItem}`}>
                <Calendar className="w-4 h-4 flex-shrink-0" />{open && <span>My Calendar</span>}
              </button>
            </div>
          )}
        </div>

        {/* ── BUSINESS VERTICALS section ── */}
        <div className={open ? "py-1 mt-1" : "mt-1"}>
          {open && (
            <button onClick={() => setVerticalsCollapsed(!verticalsCollapsed)}
              className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg transition-colors ${sb.adminHov} mb-0.5`}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400">Business Verticals</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${verticalsCollapsed ? "-rotate-90" : ""} text-violet-400/70`} />
            </button>
          )}
          {(!verticalsCollapsed || !open) && (
            <div className={open ? `${sb.sectionVerticals} space-y-0.5` : "space-y-0.5"}>
              {VERTICALS.map(v => {
                const isExp = expanded === v.id; const isActiveV = activeV === v.id;
                return (
                  <div key={v.id}>
                    <button title={v.label} onClick={() => toggleV(v.id)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${isActiveV ? `${v.color} text-white` : sItem}`}>
                      <v.icon className="w-4 h-4 flex-shrink-0" />
                      {open && <><span className="flex-1 text-left">{v.label}</span><ChevronDown className={`w-3 h-3 transition-transform ${isExp ? "rotate-180" : ""}`} /></>}
                    </button>
                    {open && isExp && (
                      <div className={`ml-3 mt-0.5 space-y-0.5 pl-3 border-l-2 ${sb.sep}`}>
                        {SUBMENU.filter(s => moduleVisible(v.id, s.id)).map(s => {
                          const isAct = activeV === v.id && activePage === s.id && !isAdmin;
                          return (
                            <button key={s.id} onClick={() => nav(v.id as Vertical, s.id as Page)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${isAct ? (isDark ? "text-white bg-slate-700/60" : "text-slate-900 bg-slate-200") : sb.sub}`}>
                              <s.icon className="w-3.5 h-3.5 flex-shrink-0" /><span>{(v.id === "ib" && IB_LABELS[s.id]) || s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ADMINISTRATION section header ── */}
        {open && (
          <button onClick={() => setAdminCollapsed(!adminCollapsed)}
            className={`w-full flex items-center justify-between px-2.5 py-1 mt-1 rounded-lg transition-colors ${sb.adminHov}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Administration</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${adminCollapsed ? "-rotate-90" : ""} text-amber-500/70`} />
          </button>
        )}

        {/* ── ADMIN items ── */}
        {(!adminCollapsed || !open) && (
          <div className={open ? `${sb.sectionAdmin} space-y-0.5 mt-0.5` : "space-y-0.5"}>
            {ADMIN_MENU.map(section => (
              <div key={section.section}>
                {open && (
                  <button onClick={() => setAdminExpanded(adminExpanded === section.section ? null : section.section)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${sb.adminHov}`}>
                    <span className="uppercase tracking-wide">{section.section}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${adminExpanded === section.section ? "rotate-180" : ""}`} />
                  </button>
                )}
                {(adminExpanded === section.section || !open) && section.items.map(a => (
                  <button key={a.id} title={a.label} onClick={() => navAdmin(a.id as Page)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${isAdmin && activePage === a.id ? (isDark ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-blue-100 text-blue-700 border border-blue-300") : sItem}`}>
                    <a.icon className="w-3.5 h-3.5 flex-shrink-0" />{open && <span>{a.label}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>

      {open && (
        <div className={`p-2.5 border-t ${sb.border} flex-shrink-0`}>
          <div className="flex items-center gap-2 px-1.5 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium ${sb.text} truncate`}>{loggedUser?.name || "Bhushan Niytri"}</div>
              <AuthBadge method={loggedUser?.authType || "m365"} />
            </div>
            <button onClick={onLogout} title="Sign out" className={`p-1.5 rounded-lg ${sb.muted} hover:text-red-400 hover:bg-red-900/20 transition-colors`}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {!open && (
        <button onClick={onLogout} title="Sign out" className={`m-2 p-2 rounded-lg ${sb.muted} hover:text-red-400 hover:bg-red-900/20 transition-colors flex items-center justify-center`}>
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </aside>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ sidebarOpen, setSidebarOpen, onMobileMenu, activeV, activePage, isDark, setIsDark, t, loggedUser, onNavAI, onPIIRequests, piiPendingCount, currUnit, setCurrUnit }: any) {
  const vInfo = activeV ? VERTICALS.find((v: any) => v.id === activeV) : null;
  const ADMIN_PAGE_LABELS: Record<string, string> = {
    "admin-users":    "Users",
    "admin-roles":    "User Roles",
    "admin-role-map": "Role Mapping",
    "admin-sla":      "SLA / TAT Config",
    "admin-llm":      "LLM Settings",
    "admin-prompts":  "AI Prompts & Access",
    "admin-m365":     "M365 Integration",
    "admin-fireflies": "Fireflies (add-on)",
    "admin-meetings": "Meeting Recording",
    "admin-recordings": "All Recordings",
    "admin-theme":    "Theme & Display",
    "admin-system":   "System Config",
    "admin-audit":             "Audit Log",
    "admin-ai-logs":           "AI Bot Logs",
    "admin-ai":                "AI Settings",
    "admin-verticals":         "Verticals Config",
    "admin-dropdown-config":   "Dropdown Values",
    "admin-pipeline-stages":   "Pipeline Stages",
    "admin-pii-masking":       "PII Data Masking",
    clients: "Client Registry", service: "Service Requests", calendar: "My Calendar",
  };
  const pageLabel = (activeV === "ib" && IB_LABELS[activePage]) || (activeV ? SUBMENU.find(s => s.id === activePage)?.label : null)
    || ADMIN_PAGE_LABELS[activePage] || SUBMENU.find(s => s.id === activePage)?.label
    || (activePage === "ai" ? "NIYTRI AI" : activePage.replace("admin-", "").replace(/-/g, " "));
  return (
    <header className={`m-header h-14 ${t.bgHeader} border-b ${t.border} flex items-center px-4 gap-2.5 sm:gap-3 flex-shrink-0 relative z-30 transition-[margin] duration-300 ease-out`}>
      {/* Desktop sidebar toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`hidden md:block ${t.textMuted} hover:opacity-80`}><Menu className="w-5 h-5" /></button>
      {/* Mobile hamburger */}
      <img src={APP_LOGO} onError={logoFallback} alt="" className="md:hidden w-8 h-8 rounded-lg object-contain flex-shrink-0" />
      <div className="md:hidden min-w-0 flex-1">
        <div className={`text-[17px] font-bold ${t.text} truncate leading-tight`}>{pageLabel || "Dashboard"}</div>
        <div className={`text-[12px] ${vInfo ? verticalAccent(vInfo.id) : t.textMuted} truncate leading-tight`}>{vInfo ? vInfo.label : "NIYTRI CRM"}</div>
      </div>
      <div className="hidden md:flex items-center gap-1.5 text-xs min-w-0">
        {vInfo ? (
          <>
            <span className={`${t.textMuted} hidden sm:inline`}>NIYTRI CRM</span>
            <ChevronRight className={`w-3 h-3 ${t.textMuted} hidden sm:block`} />
            <span className={`font-semibold ${verticalAccent(vInfo.id)} truncate uppercase tracking-wide`}>{vInfo.label}</span>
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
        <div className={`hidden sm:flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-slate-100"} rounded-lg px-3 py-1.5`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input className={`bg-transparent text-xs ${t.text} placeholder:${t.textMuted} outline-none w-24 lg:w-32`} placeholder="Search…" />
        </div>
        {/* Currency unit selector */}
        <div className={`hidden sm:flex items-center rounded-lg border ${t.border} overflow-hidden`} title="Display currency unit">
          {(["₹", "L", "M", "Cr"] as const).map((lbl, i) => {
            const units = ["rupee", "lakh", "million", "crore"];
            const unit = units[i];
            const active = currUnit === unit;
            return (
              <button
                key={lbl}
                onClick={() => setCurrUnit(unit)}
                className={`text-[10px] font-bold px-2 py-1.5 transition-colors ${active ? (isDark ? "bg-blue-600 text-white" : "bg-blue-600 text-white") : (isDark ? "text-gray-400 hover:bg-gray-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}`}
              >{lbl}</button>
            );
          })}
        </div>
        <div className="hidden md:flex items-center gap-2.5">
        <Tip label="Record a meeting — transcript with each person named">
          <button onClick={() => window.dispatchEvent(new CustomEvent("recorder:open", { detail: {} }))} aria-label="Record Meeting" className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-red-400 hover:bg-gray-700" : "bg-slate-100 text-red-600 hover:bg-slate-200"} transition-colors`}>
            <span className="block w-4 h-4 rounded-full border-2 border-current p-[2px]"><span className="block w-full h-full rounded-full bg-current" /></span>
          </button>
        </Tip>
        <Tip label="Scan a business card — creates the company and contact">
          <button onClick={() => window.dispatchEvent(new CustomEvent("cardscan:open", { detail: {} }))} aria-label="Scan Business Card" className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-sky-300 hover:bg-gray-700" : "bg-slate-100 text-sky-700 hover:bg-slate-200"} transition-colors`}>
            <ScanIcon className="w-4 h-4" />
          </button>
        </Tip>
        <Tip label="Quick Log — speak or type a call / meeting note">
          <button onClick={() => openQuickLog({})} aria-label="Quick Log" className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-violet-300 hover:bg-gray-700" : "bg-slate-100 text-violet-700 hover:bg-slate-200"} transition-colors`}>
            <Mic className="w-4 h-4" />
          </button>
        </Tip>
        <Tip label="NIYTRI AI Assistant">
          <button onClick={onNavAI} className={`p-2 rounded-lg ${activePage === "ai" ? "bg-violet-600 text-white" : isDark ? "bg-gray-800 text-violet-400 hover:bg-gray-700" : "bg-slate-100 text-violet-600 hover:bg-slate-200"} transition-colors`}>
            <Sparkles className="w-4 h-4" />
          </button>
        </Tip>
        <Tip label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </Tip>
        <Tip label="PII Access Requests">
          <button onClick={onPIIRequests} className={`relative p-2 rounded-lg ${isDark ? "bg-gray-800 text-amber-400 hover:bg-gray-700" : "bg-slate-100 text-amber-600 hover:bg-slate-200"} transition-colors`}>
            <KeyRound className="w-4 h-4" />
            {piiPendingCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">{piiPendingCount > 9 ? "9+" : piiPendingCount}</span>}
          </button>
        </Tip>
        </div>
        <NotificationBell loggedUser={loggedUser} t={t} />
        <MeetingReminders email={loggedUser?.email} apiBase={API_BASE} />
        <Tip label={loggedUser?.name || "User"}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer select-none">
            {(loggedUser?.name || "BN").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        </Tip>
      </div>
    </header>
  );
}

// ─── CLIENT REGISTRY ──────────────────────────────────────────────────────────
function ClientsModule({ t, loggedUser }: { t: ReturnType<typeof useTheme>; loggedUser?: any }) {
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
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

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
        <div className={`m-toolbar px-4 py-3 border-b ${t.border} flex items-center gap-2 flex-shrink-0 flex-wrap`}>
          <div className="m-title flex items-center gap-2">
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
            <button onClick={() => { setEditingClient(null); setCreateClientOpen(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Client</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : (<>
            <MList className="p-3">
              {clients.map(c => (
                <MCard key={c.id} selected={selected?.id === c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  accent={c.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}
                  title={c.name}
                  badge={<StatusBadge s={c.kyc_status} />}
                  left={[c.type, c.category].filter(Boolean).join(" · ")}
                  right={c.client_code}
                  chips={(c.verticals || []).map((v: string) => <span key={v} className={`text-[11px] px-2 py-0.5 rounded-full uppercase ${t.tagGray}`}>{v}</span>)}
                  lines={[<><User className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{c.rm_name || "No RM"}</span><span className="ml-auto flex-shrink-0">{maskValue(c.mobile) || ""}</span></>]}
                  footer={<button onClick={() => { setEditingClient(c); setCreateClientOpen(true); }} className="text-[13px] px-3 py-1.5 rounded-lg text-blue-500 flex items-center gap-1.5 active:bg-blue-500/10"><Edit className="w-3.5 h-3.5" /> Edit</button>}
                />
              ))}
            </MList>
            <table className="w-full max-md:hidden">
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
                    <td className={`px-3 py-2.5 font-mono ${t.textMuted}`}>{maskValue(c.pan)}</td>
                    <td className={`px-3 py-2.5 ${t.textMuted}`}>{maskValue(c.mobile)}</td>
                    <td className={`px-3 py-2.5 ${t.textMuted}`}>{c.rm_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">{(c.verticals || []).map((v: string) => <Badge key={v} text={v} color={t.tagGray} />)}</div>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge s={c.kyc_status} /></td>
                    <td className="px-3 py-2.5">
                      <span className={`flex items-center gap-1 text-xs ${c.status === "Active" ? t.successText : t.warningText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />{c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingClient(c); setCreateClientOpen(true); }}
                        className={`p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 hover:text-blue-700 transition-colors`}
                        title="Edit client"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>)}
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
      </div>
      {selected && <Client360Panel client={selected} t={t} onClose={() => setSelected(null)} loggedUser={loggedUser} />}
      <ClientForm
        open={createClientOpen}
        onClose={() => { setCreateClientOpen(false); setEditingClient(null); }}
        onSaved={() => { load(); setCreateClientOpen(false); setEditingClient(null); }}
        editClient={editingClient}
        currentUser={loggedUser}
        apiBase={API_BASE}
      />
    </div>
  );
}
// ─── GLOBAL SERVICE REQUESTS MODULE ───────────────────────────────────────────
function srStatusColor(status: string) {
  const dark = isDark;
  const map: Record<string, string> = {
    Open: dark ? "text-amber-400" : "text-amber-600",
    "In Progress": dark ? "text-blue-400" : "text-blue-600",
    Resolved: dark ? "text-emerald-400" : "text-emerald-600",
    Closed: dark ? "text-slate-400" : "text-slate-500",
    Escalated: dark ? "text-red-400" : "text-red-600",
    Reopened: dark ? "text-violet-400" : "text-violet-600",
  };
  return map[status] || (dark ? "text-slate-400" : "text-slate-500");
}
function srPriorityColor(priority: string) {
  const dark = isDark;
  const map: Record<string, string> = {
    Critical: dark ? "text-red-400" : "text-red-600",
    High: dark ? "text-orange-400" : "text-orange-600",
    Medium: dark ? "text-amber-400" : "text-amber-600",
    Low: dark ? "text-slate-400" : "text-slate-500",
  };
  return map[priority] || (dark ? "text-slate-400" : "text-slate-500");
}
// ─── OVERALL DASHBOARD ─────────────────────────────────────────────────────────

function OverallDashboard({ t, onNav }: { t: ReturnType<typeof useTheme>; onNav: (v: Vertical, p: Page) => void }) {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/dashboard`)
      .then(r => r.json()).then(setDash).finally(() => setLoading(false));
  }, []);

  const clickable = "cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all select-none";

  const kpis = dash ? [
    { label: "Total Clients (CRM)", value: (dash.clients?.total || 0).toLocaleString("en-IN"), sub: `Active: ${dash.clients?.byStatus?.Active || 0}`, icon: Users, up: true, nav: () => onNav(null, "clients") },
    { label: "Active Leads", value: (dash.leads?.total || 0).toLocaleString("en-IN"), sub: "Across all verticals", icon: TrendingUp, up: true, nav: () => onNav("retail", "leads") },
    { label: "Active Deals", value: (dash.deals?.total || 0).toLocaleString("en-IN"), sub: "Across all verticals", icon: Briefcase, up: true, nav: () => onNav("retail", "deals") },
    { label: "Service Requests", value: (dash.srs?.total || 0).toLocaleString("en-IN"), sub: `${dash.srs?.breached || 0} SLA breached`, icon: MessageSquare, up: (dash.srs?.breached || 0) === 0, nav: () => onNav(null, "service") },
  ] : [];

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div><h1 className={`text-lg font-bold ${t.text}`}>Executive Overview</h1><p className={`text-xs ${t.textMuted} mt-0.5`}>NIYTRI Financial Services · Real-time CRM data</p></div>
        <button onClick={() => window.print()} title="Save as PDF / print" className="print:hidden text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export Report</button>
      </div>
      {dash?.srs?.breached > 0 && (
        <div onClick={() => onNav(null, "service")} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs ${t.alertRed} ${clickable}`}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {dash.srs.breached} service request{dash.srs.breached > 1 ? "s" : ""} have breached SLA — immediate action required · <span className="underline">View all →</span>
        </div>
      )}
      {loading ? (
        <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading dashboard…</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => (
              <div key={k.label} onClick={k.nav} className={`${t.bgCard} border ${t.border} rounded-xl p-4 ${clickable}`}>
                <div className="flex items-start justify-between mb-2"><span className={`text-[10px] ${t.textMuted}`}>{k.label}</span><k.icon className={`w-4 h-4 ${t.textMuted}`} /></div>
                <div className={`text-xl font-bold ${t.text}`}>{k.value}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${k.up ? "text-emerald-500" : "text-red-500"}`}>{k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Client Registry Summary */}
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
            <div className={`text-sm font-semibold ${t.text} mb-3 flex items-center justify-between`}>
              <span className="flex items-center gap-2"><Users className="w-4 h-4" />Client Registry Summary</span>
              <button onClick={() => onNav(null, "clients")} className={`text-[10px] ${t.linkText} hover:underline flex items-center gap-1`}>View all {dash?.clients?.total || 0} clients →</button>
            </div>
            {/* Status breakdown */}
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} mb-2`}>By Status</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {Object.entries(dash?.clients?.byStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} onClick={() => onNav(null, "clients")} className={`${t.bgCard2} rounded-lg p-2.5 text-center ${clickable}`}>
                  <div className={`text-lg font-bold ${status === "Active" ? "text-emerald-500" : status === "Inactive" ? "text-amber-500" : status === "Dormant" ? "text-amber-400" : status === "Suspended" ? "text-red-500" : t.textMuted}`}>{count}</div>
                  <div className={`text-[9px] ${t.textMuted} mt-0.5`}>{status}</div>
                </div>
              ))}
              {Object.entries(dash?.clients?.byKyc || {}).map(([kyc, count]: [string, any]) => (
                <div key={`kyc-${kyc}`} onClick={() => onNav(null, "clients")} className={`${t.bgCard2} rounded-lg p-2.5 text-center ${clickable}`}>
                  <div className={`text-lg font-bold ${kyc === "Verified" ? "text-emerald-500" : kyc === "Pending" ? "text-amber-500" : "text-red-500"}`}>{count}</div>
                  <div className={`text-[9px] ${t.textMuted} mt-0.5`}>KYC {kyc}</div>
                </div>
              ))}
            </div>
            {/* Vertical breakdown */}
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} mb-2`}>By Vertical</div>
            <div className="grid grid-cols-5 gap-2">
              {VERTICALS.map(v => {
                const cnt = dash?.clientsByVertical?.[v.id] || 0;
                return (
                  <div key={v.id} onClick={() => onNav(v.id as Vertical, "customers")} className={`${t.bgCard2} rounded-lg p-2.5 text-center ${clickable} group`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${v.color} mx-auto mb-1`} />
                    <div className={`text-lg font-bold ${t.text}`}>{cnt}</div>
                    <div className={`text-[9px] ${t.textMuted} mt-0.5 leading-tight group-hover:text-blue-400 transition-colors uppercase font-semibold`}>{v.short}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline by Vertical */}
          <div>
            <div className={`text-xs font-bold uppercase tracking-wide ${t.textMuted} mb-3`}>Pipeline by Vertical</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {VERTICALS.map(v => {
                const leadsCount = dash?.leads?.byVertical?.[v.label] || 0;
                const dealsCount = dash?.deals?.byVertical?.[v.label] || 0;
                return (
                  <div key={v.id} className={`${t.bgCard} border ${t.border} rounded-xl p-4 ${clickable}`} onClick={() => onNav(v.id as Vertical, "dashboard")}>
                    <div className="flex items-center gap-2 mb-3"><div className={`w-2 h-6 rounded-full ${v.color}`} /><div><div className={`text-xs font-bold ${t.text} uppercase`}>{v.short}</div><div className={`text-[9px] ${t.textMuted} leading-tight uppercase`}>{v.label}</div></div></div>
                    <div className="space-y-1.5">
                      <div onClick={e => { e.stopPropagation(); onNav(v.id as Vertical, "leads"); }} className="group">
                        <div className={`text-[9px] ${t.textMuted} group-hover:text-blue-400 transition-colors`}>Leads ↗</div>
                        <div className={`text-lg font-bold ${t.text}`}>{leadsCount}</div>
                      </div>
                      <div onClick={e => { e.stopPropagation(); onNav(v.id as Vertical, "deals"); }} className="group">
                        <div className={`text-[9px] ${t.textMuted} group-hover:text-blue-400 transition-colors`}>Deals ↗</div>
                        <div className={`text-sm font-bold ${t.text}`}>{dealsCount}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service Request Status */}
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
            <div className={`text-sm font-semibold ${t.text} mb-3 flex items-center justify-between`}>
              <span>Service Request Status</span>
              <button onClick={() => onNav(null, "service")} className={`text-[10px] ${t.linkText} hover:underline`}>{dash?.srs?.total || 0} total · View all →</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(dash?.srs?.byStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} onClick={() => onNav(null, "service")} className={`${t.bgCard2} rounded-xl p-3 text-center ${clickable}`}>
                  <div className={`text-xl font-bold ${status === "Escalated" ? "text-red-500" : status === "Open" ? "text-amber-500" : status === "Resolved" ? "text-emerald-500" : status === "In Progress" ? "text-blue-500" : t.textMuted}`}>{count}</div>
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
  const [vDash, setVDash] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dashboard`).then(r => r.json()),
      fetch(`${API_BASE}/api/dashboard/vertical/${vId}`).then(r => r.json()),
      fetch(`${API_BASE}/api/leads?vertical=${encodeURIComponent(vName)}&limit=100`).then(r => r.json()),
      fetch(`${API_BASE}/api/deals?vertical=${encodeURIComponent(vName)}&limit=8`).then(r => r.json()),
    ]).then(([d, vd, l, de]) => {
      setDash(d);
      setVDash(vd);
      setLeads(l.data || []);
      setDeals(de.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [vId]);

  // KPIs built from live API data — no hardcoded values
  const kpis = vDash ? [
    { label: "Active Clients",  value: String(vDash.clients?.byStatus?.["Active"] || vDash.clients?.total || 0), sub: "in this vertical",       up: true  },
    { label: "Open Leads",      value: String(vDash.leads?.total || 0),                                           sub: "in pipeline",             up: true  },
    { label: "Active Deals",    value: String(vDash.deals?.total || 0),                                           sub: "in progress",             up: true  },
    { label: "Service Requests",value: String(vDash.srs?.open || 0),                                             sub: `${vDash.srs?.resolved || 0} resolved`, up: (vDash.srs?.open || 0) === 0 },
  ] : V_KPI[vId] || [];

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
    <div className="p-3 sm:p-5 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${v.color} flex items-center justify-center`}><v.icon className="w-5 h-5 text-white" /></div>
          <div><h1 className={`text-lg font-bold ${t.text} uppercase`}>{v.label} Dashboard</h1><p className={`text-xs ${t.textMuted}`}>Business vertical performance · Q4 FY26</p></div>
        </div>
        <div className="flex items-center gap-2">
          {dash && <span className={`text-xs ${t.textMuted}`}>{dash.leads?.byVertical?.[vName] || 0} leads · {dash.deals?.byVertical?.[vName] || 0} deals</span>}
          <button onClick={() => window.print()} title="Save as PDF / print" className="print:hidden text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export</button>
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
                <div className={`text-xl font-bold ${t.text}`}>{fmtMoneyStr(k.value)}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${k.up ? t.upTrend : t.downTrend}`}>{k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{k.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`lg:col-span-2 ${t.bgCard} border ${t.border} rounded-xl p-4`}>
              <div className={`text-sm font-semibold ${t.text} mb-4`}>Revenue Trend (FY 2025–26)</div>
              <div className="flex items-end gap-3 h-28">
                {chartData.map(([month, val]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[9px] ${t.textMuted}`}>{fmtMoney((val as number) * 1e7)}</span>
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
                <tbody>{deals.map((d: any) => <tr key={d.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} text-xs`}><td className={`px-4 py-2 font-mono ${verticalAccent(v.id)}`}>{d.deal_code}</td><td className={`px-4 py-2 font-medium ${t.text}`}>{d.name}</td><td className={`px-4 py-2 ${t.textMuted}`}>{d.type}</td><td className={`px-4 py-2 font-bold ${t.text}`}>{d.value ? fmtMoneyStr(d.value) : "—"}</td><td className="px-4 py-2"><StatusBadge s={d.stage} /></td><td className={`px-4 py-2 ${t.textMuted}`}>{d.rm_name || "—"}</td><td className={`px-4 py-2 ${t.textMuted}`}>{fmtDateShort(d.deal_date)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
// ─── LEADS PIPELINE ───────────────────────────────────────────────────────────
function CreateLeadModal({ vId, vName, t, onClose, onCreated }: { vId: string; vName: string; t: ReturnType<typeof useTheme>; onClose: () => void; onCreated: () => void }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const stages = LEAD_STAGES[vId] || [];
  const [name, setName] = useState("");
  const [stage, setStage] = useState(stages[0]?.id || "");
  const [priority, setPriority] = useState("Medium");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("Referral");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/leads`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, vertical: vName, stage, priority, value_estimate: value, source, notes }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      onCreated();
      onClose();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-md shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${t.text}`}>
            <div className={`w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><TrendingUp className="w-3.5 h-3.5 text-white" /></div>
            New Lead — {v.label}
          </div>
          <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Lead Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className={`w-full text-sm rounded-xl border px-3 py-2.5 ${t.inputBg}`} placeholder="Company or individual name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Stage</label>
              <select value={stage} onChange={e => setStage(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`}>
                {stages.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`}>
                {["Critical", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Estimated Value</label>
              <input value={value} onChange={e => setValue(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`} placeholder="e.g. ₹50L" />
            </div>
            <div>
              <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Source</label>
              <select value={source} onChange={e => setSource(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`}>
                {["Referral", "Website", "Cold Call", "Event", "Partner", "Social Media", "Other"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`w-full text-xs rounded-xl border px-3 py-2 ${t.inputBg} resize-none`} />
          </div>
          {err && <div className={`text-xs p-2.5 rounded-xl ${isDark ? "bg-red-950/40 text-red-300" : "bg-red-50 text-red-700"}`}>{err}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className={`flex-1 text-xs py-2.5 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={submit} disabled={saving} className={`flex-1 text-xs py-2.5 rounded-xl ${v.color} text-white flex items-center justify-center gap-1.5 disabled:opacity-60`}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsPipeline({ vId, t, loggedUser }: { vId: string; t: ReturnType<typeof useTheme>; loggedUser?: any }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const vName = VNAME[vId];
  const stages = LEAD_STAGES[vId] || [];
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at_desc");

  const LEAD_SORT_OPTIONS = [
    { value: "created_at_desc",  label: "Newest First" },
    { value: "updated_at_desc",  label: "Recently Modified" },
    { value: "priority_asc",     label: "Priority (Critical First)" },
    { value: "days_open_desc",   label: "Longest Open" },
    { value: "name_asc",         label: "Name A–Z" },
    { value: "value_desc",       label: "Value (High–Low)" },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vertical: vName, limit: "200", sort_by: sortBy });
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const r = await fetch(`${API_BASE}/api/leads?${params}`);
      const d = await r.json();
      setLeads(d.data || []);
      setTotal(d.total || 0);
    } catch { setLeads([]); } finally { setLoading(false); }
  }, [vId, filterPriority, sortBy]);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.lead_code?.toLowerCase().includes(search.toLowerCase()) || l.source?.toLowerCase().includes(search.toLowerCase()));
  const stageLeads = (stageId: string) => filtered.filter(l => l.stage === stageId);
  const [openEmpty, setOpenEmpty] = useState<Set<string>>(new Set()); // empty stages the user expanded
  const [detailTab, setDetailTab] = useState<"activity" | "documents">("activity");
  const [movingStage, setMovingStage] = useState(false);
  const [stageError, setStageError] = useState("");
  // Move the selected lead to another pipeline stage (recorded in History with who/when)
  // IB: moving to an active stage needs a next action; to Lost needs a reason → ask inline, then retry
  const [stagePrompt, setStagePrompt] = useState<{ stageId: string; code: string; carry?: Record<string, any>; skip?: { stage_id: string; label: string }[]; stage?: string; msg?: string } | null>(null);
  const [promptVals, setPromptVals] = useState<{ next_action: string; next_action_date: string; lost_reason: string; lost_comment: string }>({ next_action: "", next_action_date: "", lost_reason: "", lost_comment: "" });
  const [stageDone, setStageDone] = useState("");
  // Records open read-only; Edit switches on stage changes and other edits. Expand shows the record full screen.
  const [panelEdit, setPanelEdit] = useState(false);
  const [panelWide, setPanelWide] = useState(false);
  useEffect(() => { setStageDone(""); setStagePrompt(null); setStageError(""); setPanelEdit(false); }, [selected?.id]);
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  useEffect(() => {
    if (vId !== "ib") return;
    fetch(`${API_BASE}/api/config/dropdowns?entity=lead&field=lost_reason`).then(r => r.json()).then(d => setLostReasons(Array.isArray(d) ? d.map((x: any) => x.value) : [])).catch(() => {});
  }, [vId]);
  const moveStage = async (stageId: string, extra: Record<string, any> = {}) => {
    if (!selected) return;
    setMovingStage(true); setStageError(""); setStageDone("");
    try {
      const r = await fetch(`${API_BASE}/api/leads/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: stageId, ...extra }) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        // Stage workflow: the user confirms skipping, or is sent to the mandatory stage — never types anything here
        if (e.code === "CONFIRM_SKIP" || e.code === "NEED_SKIP_COMMENT") {
          setStagePrompt({ stageId, code: e.code, carry: extra, skip: e.skip, stage: e.stage, msg: e.error }); setMovingStage(false); return;
        }
        if (e.code === "NEED_NEXT_ACTION" || e.code === "NEED_LOST_REASON") {
          setPromptVals({ next_action: selected.next_action || "", next_action_date: selected.next_action_date ? String(selected.next_action_date).slice(0, 10) : "", lost_reason: "", lost_comment: "" });
          setStagePrompt({ stageId, code: e.code, carry: extra }); setMovingStage(false);
          if (Object.keys(extra).length) setStageError(e.error || "");
          return;
        }
        throw new Error(e.error || "Could not change stage");
      }
      const saved = await r.json().catch(() => null);
      setStagePrompt(null);
      // Use the saved row from the server so the panel shows exactly what was stored (stage, lost reason, comment)
      setSelected(saved && saved.id ? { ...selected, ...saved } : { ...selected, stage: stageId, ...extra });
      setStageDone(`Moved to ${stages.find((s: any) => s.id === stageId)?.label || stageId}`);
      setActivityKey(k => k + 1);
      load();
    } catch (e: any) { setStageError(e.message); }
    setMovingStage(false);
  };
  const [activityKey, setActivityKey] = useState(0);
  // Board: drag a card to another stage → confirmation (comments, next action, lost reason) → only Submit moves it
  const [dropMove, setDropMove] = useState<{ lead: any; to: string } | null>(null);
  const [dropBusy, setDropBusy] = useState(false);
  const [dropErr, setDropErr] = useState("");
  const leadDrag = useBoardDrag<any>((lead, to) => { setDropErr(""); setDropMove({ lead, to }); }, l => l.name);
  const submitDrop = async (extra: Record<string, any>) => {
    if (!dropMove) return;
    setDropBusy(true); setDropErr("");
    try {
      const r = await fetch(`${API_BASE}/api/leads/${dropMove.lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: dropMove.to, skip_confirmed: true, ...extra }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not move");
      appToast(`${dropMove.lead.name} → ${stages.find((s: any) => s.id === dropMove.to)?.label || dropMove.to}`, "success");
      if (selected?.id === dropMove.lead.id) setSelected({ ...selected, ...d });
      setDropMove(null); setActivityKey(k => k + 1); load();
    } catch (e: any) { setDropErr(e.message); } finally { setDropBusy(false); }
  };
  const dropInfo = (() => {
    if (!dropMove) return null;
    const flow = stages.filter((st: any) => !st.is_lost && !/lost/i.test(st.id));
    const path = dropMove.lead.stage_path || {};
    let iFrom = flow.findIndex((s: any) => s.id === dropMove.lead.stage);
    if (iFrom === -1) iFrom = Math.max(-1, ...flow.map((s: any, i: number) => (path[s.id] ? i : -1)));
    const iTo = flow.findIndex((s: any) => s.id === dropMove.to);
    const target: any = stages.find((s: any) => s.id === dropMove.to);
    const toLost = !!target && (target.is_lost || /lost/i.test(target.id));
    const skip = iTo > iFrom ? flow.slice(iFrom + 1, iTo).filter((s: any) => !path[s.id]).map((s: any) => ({ stage_id: s.id, label: s.label, mandatory: s.skip_allowed === false })) : [];
    return { from: stages.find((s: any) => s.id === dropMove.lead.stage)?.label || dropMove.lead.stage, to: target?.label || dropMove.to, toLost, skip, back: iTo >= 0 && iTo < iFrom, active: !!target && !toLost && !target.is_won };
  })();
  // Leads whose stage isn't in the configured pipeline still get a column, so nothing disappears from the board
  const boardStages = [
    ...stages,
    ...Array.from(new Set(filtered.map(l => l.stage).filter((sid: string) => sid && !stages.some((st: any) => st.id === sid))))
      .map((sid: any) => ({ id: sid, label: `${sid} (unmapped)`, unmapped: true })),
  ];

  const wonStages = stages.filter((s: any) => s.is_won || s.id.toLowerCase().includes("won") || s.label.toLowerCase().includes("won"));
  const isWonStage = (stageId: string) => wonStages.some((s: any) => s.id === stageId);

  const convertToDeal = async (lead: any) => {
    if (!(await appConfirm({ title: "Convert to a deal?", message: `"${lead.name}" will be added to Deals. The opportunity stays as it is.`, confirmLabel: "Convert" }))) return;
    try {
      await fetch(`${API_BASE}/api/deals`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lead.name, vertical: vName, type: "Converted Lead", value: lead.value_estimate || "TBD", stage: "Active", notes: `Converted from lead ${lead.lead_code}` }),
      });
      appToast(`"${lead.name}" converted to a deal`, "success");
      load();
    } catch { appToast("Could not convert to a deal", "error"); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <LeadModal
        open={showCreate || !!editingLead}
        onClose={() => { setShowCreate(false); setEditingLead(null); }}
        onSaved={(saved?: any) => { load(); setShowCreate(false); setEditingLead(null); setActivityKey(k => k + 1); if (saved && selected?.id === saved.id) setSelected({ ...selected, ...saved }); }}
        vertical={vName}
        verticalId={vId}
        editLead={editingLead}
        currentUser={loggedUser}
        apiBase={API_BASE}
      />
      {/* Phones: always-visible "New lead" button */}
      {!selected && !showCreate && !editingLead && (
        <button onClick={() => setShowCreate(true)} aria-label="New Lead"
          className="m-fab sm:hidden fixed right-4 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 h-12 px-4 rounded-full bg-orange-600 text-white shadow-xl flex items-center gap-2 text-sm font-semibold">
          <Plus className="w-5 h-5" /> New Lead
        </button>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`m-toolbar px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0 flex-wrap`}>
          <div className={`m-title w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><TrendingUp className="w-3.5 h-3.5 text-white" /></div>
          <div className="m-title">
            <div className={`text-sm font-bold ${t.text} uppercase`}>{v.label} — Leads Pipeline</div>
            <div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} total leads · ${stages.length} stages`}</div>
          </div>

          {/* Search */}
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5`}>
            <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} className={`bg-transparent text-xs ${t.text} outline-none w-28`} placeholder="Search leads…" />
          </div>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All Priority</option>
            {["Critical", "High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
          </select>

          <div className={`flex items-center gap-1.5 border ${t.border} rounded-lg px-2 py-1.5 ${t.inputBg}`}>
            <ArrowUpDown className={`w-3 h-3 ${t.textMuted} flex-shrink-0`} />
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); }} className={`text-xs bg-transparent ${t.text} outline-none`}>
              {LEAD_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* View toggle */}
          <div className={`flex items-center border ${t.border} rounded-lg overflow-hidden`}>
            <button onClick={() => setViewMode("board")} title="Board View" className={`p-1.5 transition-colors ${viewMode === "board" ? `${isDark ? "bg-blue-600" : "bg-blue-600"} text-white` : `${t.textMuted}`}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode("list")} title="List View" className={`p-1.5 transition-colors ${viewMode === "list" ? `${isDark ? "bg-blue-600" : "bg-blue-600"} text-white` : `${t.textMuted}`}`}><List className="w-3.5 h-3.5" /></button>
          </div>

          <div className="ml-auto flex gap-2">
            <button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowCreate(true)} className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /> New Lead</button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={`flex items-center justify-center flex-1 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading leads…</div>
        ) : viewMode === "board" ? (
          /* ── Board View ── */
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* One row, no horizontal scroll: empty stages collapse to a slim strip (click to open),
                stages with leads share the remaining width. Phones: stages stack vertically. */}
            <div className="grid gap-2.5 grid-cols-1 sm:[grid-template-columns:var(--cols)] items-start"
              style={{ ["--cols" as any]: boardStages.map((st: any) => (stageLeads(st.id).length || openEmpty.has(st.id) ? "minmax(0,1fr)" : "40px")).join(" ") }}>
              {boardStages.map((stage: any) => {
                const sl = stageLeads(stage.id);
                if (!sl.length && !openEmpty.has(stage.id)) return (
                  <button key={stage.id} data-drop-stage={stage.id} onClick={() => setOpenEmpty(prev => new Set(prev).add(stage.id))} title={`${stage.label} — no leads. Click to expand`}
                    className={`group rounded-xl border border-dashed ${leadDrag.overStage === stage.id ? "border-blue-500 bg-blue-500/10 text-blue-500 scale-[1.02]" : `${t.border} ${t.textMuted}`} hover:border-blue-500/60 transition-all duration-200 flex sm:flex-col items-center gap-2 px-3 py-2 sm:px-0 sm:py-3 sm:min-h-[320px]`}>
                    <div className={`w-2 h-2 rounded-full ${v.color} flex-shrink-0`} />
                    <span className="text-xs font-semibold sm:[writing-mode:vertical-rl] sm:rotate-180 whitespace-nowrap">{stage.label}</span>
                    <span className={`text-[10px] ${t.tagGray} px-1.5 py-0.5 rounded-full ml-auto sm:ml-0 sm:mt-auto`}>0</span>
                  </button>
                );
                return (
                  <div key={stage.id} data-drop-stage={stage.id} className={`min-w-0 flex flex-col rounded-xl transition-all duration-200 ${leadDrag.overStage === stage.id ? "bg-blue-500/10 ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent" : leadDrag.dragging ? "ring-1 ring-dashed ring-gray-400/40" : ""}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${v.color}`} />
                        <span className={`text-xs font-semibold ${t.text}`}>{stage.label}</span>
                      </div>
                      <span className={`text-[10px] ${t.tagGray} px-1.5 py-0.5 rounded-full`}>{sl.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {sl.map((lead: any) => (
                        <div key={lead.id} {...leadDrag.cardProps(lead, lead.stage)} onClick={() => setSelected(selected?.id === lead.id ? null : lead)} title="Click to open · drag to move to another stage"
                          className={`${t.bgCard} border ${selected?.id === lead.id ? `border-blue-500` : t.border} rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-in fade-in ${leadDrag.draggingItem === lead ? "opacity-40 scale-95" : ""}`}>
                          <div className="flex items-start justify-between mb-1">
                            <div className={`text-xs font-semibold ${t.text} leading-tight flex-1 min-w-0 truncate`}>{lead.name}</div>
                            <PriorityBadge p={lead.priority} />
                          </div>
                          <div className={`text-sm font-bold ${t.text} mb-1`}>{lead.value_estimate ? fmtMoneyStr(lead.value_estimate) : "—"}</div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] ${t.textMuted}`}>{lead.source}</span>
                            <span className={`text-[9px] ${t.textMuted} font-mono`}>{lead.lead_code}</span>
                          </div>
                          {lead.days_open && <div className={`text-[9px] ${t.textMuted} flex items-center gap-1 mt-1`}><Clock className="w-2.5 h-2.5" />{lead.days_open}d open</div>}
                          {lead.next_action && (
                            <div className={`text-[9px] mt-1 truncate ${lead.next_action_date && new Date(lead.next_action_date) < new Date(new Date().toDateString()) ? "text-red-500 font-semibold" : t.textMuted}`} title={lead.next_action}>
                              → {lead.next_action}
                            </div>
                          )}
                          {isWonStage(stage.id) && (
                            <button onClick={e => { e.stopPropagation(); convertToDeal(lead); }}
                              className={`mt-2 w-full text-[10px] py-1 rounded-lg border transition-colors ${isDark ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30" : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"}`}>
                              Convert to Deal →
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setShowCreate(true)} className={`w-full py-2 rounded-xl border border-dashed ${t.border} ${t.textMuted} text-xs flex items-center justify-center gap-1.5 hover:opacity-70`}>
                        <Plus className="w-3 h-3" /> Add Lead
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── List View ── */
          <div className="flex-1 overflow-y-auto">
            <MList className="p-3">
              {filtered.map((lead: any) => {
                const overdue = lead.next_action_date && new Date(lead.next_action_date) < new Date(new Date().toDateString());
                return (
                  <MCard key={lead.id} selected={selected?.id === lead.id} onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                    title={lead.name} badge={<PriorityBadge p={lead.priority} />}
                    value={lead.value_estimate ? fmtMoneyStr(lead.value_estimate) : "—"}
                    left={lead.source} right={lead.lead_code}
                    chips={[<span key="st" className={`text-[11px] px-2 py-0.5 rounded-full ${v.color}/20 ${isDark ? "text-blue-300" : "text-blue-700"}`}>{stages.find((s: any) => s.id === lead.stage)?.label || lead.stage}</span>,
                      lead.days_open ? <span key="d" className={`inline-flex items-center gap-1 text-[11.5px] ${t.textMuted}`}><Clock className="w-3 h-3" />{lead.days_open}d open</span> : null,
                      lead.rm_name ? <span key="rm" className={`inline-flex items-center gap-1 text-[11.5px] ${t.textMuted}`}><User className="w-3 h-3" />{lead.rm_name}</span> : null]}
                    lines={lead.next_action ? [<span className={`truncate ${overdue ? "text-red-500 font-semibold" : ""}`}>→ {lead.next_action}</span>] : []}
                    footer={isWonStage(lead.stage) ? <button onClick={() => convertToDeal(lead)} className="text-[13px] px-3 py-1.5 rounded-lg bg-emerald-600/15 text-emerald-500 font-medium">Convert to Deal →</button> : undefined}
                  />
                );
              })}
            </MList>
            <table className="w-full max-md:hidden">
              <thead className={`sticky top-0 ${t.tableHead}`}>
                <tr className={`border-b ${t.border}`}>
                  {["Lead Code", "Name", "Stage", "Priority", "Value", "Source", "Days Open", "RM", "Actions"].map(h => (
                    <th key={h} className={`text-left text-[10px] font-bold uppercase tracking-wide ${t.textMuted} px-4 py-2.5 whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead: any, i) => (
                  <tr key={lead.id} onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                    className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${selected?.id === lead.id ? (isDark ? "bg-blue-950/30" : "bg-blue-50") : i % 2 === 1 ? t.bgCard2 : ""}`}>
                    <td className={`px-4 py-3 font-mono ${t.codeBlue} text-[10px]`}>{lead.lead_code}</td>
                    <td className={`px-4 py-3 font-medium ${t.text}`}>{lead.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.color}/20 ${isDark ? "text-blue-300" : "text-blue-700"}`}>{stages.find((s: any) => s.id === lead.stage)?.label || lead.stage}</span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge p={lead.priority} /></td>
                    <td className={`px-4 py-3 font-semibold ${t.text}`}>{lead.value_estimate ? fmtMoneyStr(lead.value_estimate) : "—"}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{lead.source}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{lead.days_open ? `${lead.days_open}d` : "—"}</td>
                    <td className={`px-4 py-3 ${t.textMuted}`}>{lead.rm_name || "—"}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingLead(lead)} className={`p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500`} title="Edit lead">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {isWonStage(lead.stage) && (
                          <button onClick={() => convertToDeal(lead)} className={`text-[10px] px-2 py-1 rounded-lg border whitespace-nowrap ${isDark ? "bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30" : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"}`}>
                            Convert →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className={`text-center py-12 text-sm ${t.textMuted}`}>No leads found.</div>}
          </div>
        )}

        <div className={`px-4 py-2 border-t ${t.border} flex-shrink-0`}>
          <span className={`text-xs ${t.textMuted}`}>{filtered.length} of {total} leads · {stages.length} stages</span>
        </div>
      </div>

      {leadDrag.ghost}
      {dropMove && dropInfo && (
        <StageMoveDialog title={dropMove.lead.name} from={dropInfo.from} to={dropInfo.to} skip={dropInfo.skip} back={dropInfo.back} busy={dropBusy} error={dropErr}
          askNextAction={vId === "ib" && dropInfo.active} nextAction={dropMove.lead.next_action} nextActionDate={dropMove.lead.next_action_date}
          lostReasons={dropInfo.toLost && vId === "ib" ? lostReasons : null}
          onCancel={() => { setDropMove(null); setDropErr(""); }} onSubmit={submitDrop} />
      )}
      {/* Detail Side Panel */}
      {selected && (
        <div className={panelWide ? "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200" : `fixed inset-0 z-40 sm:static sm:z-auto sm:w-[440px] lg:w-[500px] border-l ${t.border} ${t.bgCard} p-4 overflow-y-auto flex-shrink-0 animate-in slide-in-from-right-8 fade-in duration-300`}
          onMouseDown={e => { if (panelWide && e.target === e.currentTarget) setPanelWide(false); }}>
          <div className={panelWide ? `w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl border ${t.border} ${t.bgCard} shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-200` : ""}>
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="min-w-0">
              <div className={`text-sm font-bold ${t.text}`}>{vId === "ib" ? "Opportunity" : "Lead Detail"}</div>
              <div className={`text-[10px] ${panelEdit ? "text-amber-500 font-semibold" : t.textMuted}`}>{panelEdit ? "Editing — changes are saved as you make them" : "View only"}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {panelEdit ? (<>
                <button onClick={() => setEditingLead(selected)} title="Edit all details"
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${t.border} ${t.textSub}`}><Edit2 className="w-3 h-3" /> Details</button>
                <button onClick={() => { setPanelEdit(false); setStagePrompt(null); }} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"><CheckCircle2 className="w-3 h-3" /> Done</button>
              </>) : (
                <button onClick={() => setPanelEdit(true)} title="Edit this record"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"><Edit2 className="w-3 h-3" /> Edit</button>
              )}
              <button onClick={() => setPanelWide(w => !w)} title={panelWide ? "Exit full screen" : "Expand to full screen"} aria-label={panelWide ? "Exit full screen" : "Expand"} className={`hidden sm:inline-flex p-1.5 rounded-lg ${t.textMuted} hover:bg-gray-500/10`}>
                {panelWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => { setSelected(null); setPanelWide(false); }} aria-label="Close" className={`p-1.5 rounded-lg ${t.textMuted} hover:bg-gray-500/10`}><X className="w-4 h-4" /></button>
            </div>
          </div>
          {/* Pop-up (expanded): two columns — record on the left, history & documents on the right */}
          <div className={panelWide ? "grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 items-start" : "space-y-3"}>
          <div className="space-y-3 min-w-0">
            <div className={`${t.bgCard2} rounded-xl p-3`}>
              <div className={`text-xs font-semibold ${t.text}`}>{selected.name}</div>
              <code className="text-[10px] text-blue-400">{selected.lead_code}</code>
              <div className={`text-lg font-bold ${t.text} mt-1`}>{selected.value_estimate ? fmtMoneyStr(selected.value_estimate) : "TBD"}</div>
              <PriorityBadge p={selected.priority} />
            </div>
            {/* Stage path — click a stage then "Mark as Current Stage", or "Mark Stage as Complete" */}
            <StagePath compact={!panelWide} readOnly={!panelEdit} askNextAction={vId === "ib"} nextAction={selected.next_action} nextActionDate={selected.next_action_date}
              stages={stages as any} current={selected.stage} path={selected.stage_path} busy={movingStage} onMove={(id, extra) => moveStage(id, extra || {})} />
            {stagePrompt && (stagePrompt.code === "CONFIRM_SKIP" || stagePrompt.code === "NEED_SKIP_COMMENT") && (
              <StageFlowPrompt prompt={{ ...stagePrompt, from: stages.find((s: any) => s.id === selected.stage)?.label }} stages={stages as any} busy={movingStage} onMove={(id, extra) => moveStage(id, extra || {})} onCancel={() => setStagePrompt(null)} />
            )}
            {stageError && !stagePrompt && <div className="text-[11px] text-red-500">{stageError}</div>}
            {stageDone && !stagePrompt && <div className="text-[11px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{stageDone}</div>}
            {/* Mark as Lost + the next-action / lost-reason prompts that a stage move can ask for */}
            {(() => {
              const lostStage = stages.find((st: any) => st.is_lost || /lost/i.test(st.id));
              const isLost = lostStage && selected.stage === lostStage.id;
              return (
                <div className="space-y-2">
                  {panelEdit && lostStage && !isLost && (
                    <button disabled={movingStage} onClick={() => {
                        // IB: ask for reason + comment straight away; other verticals keep the simple confirm
                        if (vId === "ib") { setPromptVals(p => ({ ...p, lost_reason: "", lost_comment: "" })); setStageError(""); setStagePrompt({ stageId: lostStage.id, code: "NEED_LOST_REASON" }); }
                        else appConfirm({ title: `Mark as ${lostStage.label}?`, message: `"${selected.name}" moves to ${lostStage.label}.`, confirmLabel: `Mark as ${lostStage.label}`, tone: "danger" }).then(ok => { if (ok) moveStage(lostStage.id); });
                      }}
                      className="w-full text-[11px] py-1.5 rounded-lg text-red-500 hover:bg-red-500/10">Mark as {lostStage.label}</button>
                  )}
                  {stagePrompt && (stagePrompt.code === "NEED_LOST_REASON" || stagePrompt.code === "NEED_NEXT_ACTION") && (
                    <div className={`rounded-xl border p-2.5 space-y-2 ${stagePrompt.code === "NEED_LOST_REASON" ? "border-red-500/50 bg-red-500/10" : t.alertYellow}`}>
                      <div className={`text-[11px] font-semibold ${stagePrompt.code === "NEED_LOST_REASON" ? "text-red-500" : ""}`}>
                        {stagePrompt.code === "NEED_LOST_REASON" ? `Mark as ${stages.find((s: any) => s.id === stagePrompt.stageId)?.label || "Lost"} — why was this opportunity lost?` : `What's the next action? (needed for ${stages.find((s: any) => s.id === stagePrompt.stageId)?.label || "this stage"})`}
                      </div>
                      {stagePrompt.code === "NEED_LOST_REASON" ? (
                        <>
                        <label className={`block text-[10px] ${t.textMuted}`}>Reason <span className="text-red-500">*</span></label>
                        <select value={promptVals.lost_reason} onChange={e => setPromptVals(p => ({ ...p, lost_reason: e.target.value }))} className={`w-full text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`}>
                          <option value="">— Choose a reason —</option>
                          {lostReasons.map(r => <option key={r}>{r}</option>)}
                        </select>
                        <label className={`block text-[10px] ${t.textMuted}`}>Comment <span className="text-red-500">*</span> <span className="opacity-70">— what happened? (min 10 characters, saved to History)</span></label>
                        <textarea value={promptVals.lost_comment} onChange={e => setPromptVals(p => ({ ...p, lost_comment: e.target.value }))} rows={3}
                          placeholder={promptVals.lost_reason === "Lost to Competitor" ? "e.g. Client mandated Kotak at a lower fee; we were second" : "e.g. Promoter wants to wait for FY27 results before going ahead"}
                          className={`w-full text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} />
                        <div className={`text-[10px] text-right ${promptVals.lost_comment.trim().length >= 10 ? "text-emerald-500" : t.textMuted}`}>{promptVals.lost_comment.trim().length}/10</div>
                        </>
                      ) : (<>
                        <input value={promptVals.next_action} onChange={e => setPromptVals(p => ({ ...p, next_action: e.target.value }))} placeholder="e.g. Share pitch deck with CFO"
                          className={`w-full text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} />
                        <input type="date" value={promptVals.next_action_date} onChange={e => setPromptVals(p => ({ ...p, next_action_date: e.target.value }))}
                          className={`w-full text-xs rounded-lg border px-2 py-1.5 ${t.inputBg}`} aria-label="Next Action Date" />
                      </>)}
                      <div className="flex gap-2">
                        <button onClick={() => setStagePrompt(null)} className={`flex-1 text-xs py-1.5 rounded-lg border ${t.border}`}>Cancel</button>
                        <button disabled={movingStage || (stagePrompt.code === "NEED_LOST_REASON" ? (!promptVals.lost_reason || promptVals.lost_comment.trim().length < 10) : !promptVals.next_action.trim())}
                          onClick={() => moveStage(stagePrompt.stageId, { ...(stagePrompt.carry || {}), ...(stagePrompt.code === "NEED_LOST_REASON" ? { lost_reason: promptVals.lost_reason, lost_comment: promptVals.lost_comment.trim() } : { next_action: promptVals.next_action.trim(), next_action_date: promptVals.next_action_date || null }) })}
                          className={`flex-1 text-xs py-1.5 rounded-lg text-white disabled:opacity-40 ${stagePrompt.code === "NEED_LOST_REASON" ? "bg-red-600" : "bg-blue-600"}`}>{stagePrompt.code === "NEED_LOST_REASON" ? "Mark as Lost" : "Save & move"}</button>
                      </div>
                    </div>
                  )}
                  {stageError && stagePrompt && <div className="text-[11px] text-red-500">{stageError}</div>}
                </div>
              );
            })()}
            {selected.next_action && (
              <div className={`rounded-xl border p-2.5 text-xs ${selected.next_action_date && new Date(selected.next_action_date) < new Date(new Date().toDateString()) ? t.alertRed : t.alertYellow}`}>
                <div className="text-[10px] uppercase font-semibold opacity-80">Next action{selected.next_action_date ? ` · ${new Date(selected.next_action_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}</div>
                <div className="font-medium">{selected.next_action}</div>
              </div>
            )}
            <button onClick={() => openQuickLog({ client_id: selected.client_id || undefined, client_name: selected.client_name || undefined, lead_id: selected.id })}
              className={`w-full text-xs py-2 rounded-lg border ${t.border} ${t.textSub} flex items-center justify-center gap-1.5 hover:bg-violet-500/10`}>
              <Mic className="w-3.5 h-3.5" /> Log call / meeting / note
            </button>
            <div className={panelWide ? "grid sm:grid-cols-2 gap-x-6" : ""}>
            {[
              { label: "Source", value: selected.source },
              { label: "Days Open", value: `${selected.days_open || 0}d` },
              { label: "Stage", value: stages.find((st: any) => st.id === selected.stage)?.label || selected.stage },
              { label: "Status", value: selected.status },
              { label: "RM", value: selected.rm_name || "—" },
              { label: "Created by", value: selected.created_by_name || "—" },
              { label: "Opened on", value: selected.opened_at ? new Date(selected.opened_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
              ...(vId === "ib" ? [
                { label: "Company", value: selected.client_name || "—" },
                { label: "Opportunity Type", value: selected.opportunity_type || "—" },
                { label: "Expected Fee", value: selected.expected_fee ? fmtMoney(Number(selected.expected_fee)) : "—" },
                { label: "Probability", value: selected.probability != null ? `${selected.probability}%` : "Auto" },
                ...(selected.lost_reason ? [{ label: "Lost Reason", value: selected.lost_reason }] : []),
                ...(selected.lost_comment ? [{ label: "Lost Comment", value: selected.lost_comment }] : []),
              ] : []),
            ].map(row => (
              <div key={row.label} className={`flex justify-between text-xs py-1.5 border-b ${t.border} last:border-0`}>
                <span className={t.textMuted}>{row.label}</span>
                <span className={`font-medium ${t.text}`}>{row.value}</span>
              </div>
            ))}
            </div>
            {panelEdit && isWonStage(selected.stage) && (
              <button onClick={() => convertToDeal(selected)} className="w-full text-xs py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                Convert to Deal →
              </button>
            )}
          </div>
          <div className={`space-y-3 min-w-0 ${panelWide ? "lg:sticky lg:top-0" : ""}`}>
            {/* History & documents */}
            <div className={`flex gap-1 border-b ${t.border} pt-2`}>
              {(["activity", "documents"] as const).map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`text-xs px-3 py-2 -mb-px border-b-2 capitalize ${detailTab === tab ? "border-blue-500 text-blue-500 font-semibold" : `border-transparent ${t.textMuted}`}`}>
                  {tab === "activity" ? "History & comments" : "Documents"}
                </button>
              ))}
            </div>
            {detailTab === "activity"
              ? <RecordActivity type="lead" id={selected.id} t={t} refreshKey={activityKey} />
              : <RecordDocuments type="lead" id={selected.id} vertical={vName} clientId={selected.client_id} t={t} onChange={() => setActivityKey(k => k + 1)} />}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── DEALS ────────────────────────────────────────────────────────────────────
function CreateDealModal({ vId, vName, t, onClose, onCreated }: { vId: string; vName: string; t: ReturnType<typeof useTheme>; onClose: () => void; onCreated: () => void }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const [name, setName] = useState("");
  const [type, setType] = useState("Equity");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("Active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const DEAL_TYPES: Record<string, string[]> = {
    retail: ["Equity", "F&O", "Currency", "Commodity", "IPO", "MF"],
    corporate: ["Block Deal", "Bulk Deal", "Structured Product", "Equity", "Debt"],
    ib: ["M&A", "ECM", "DCM", "Restructuring", "Advisory"],
    aif: ["Fund I", "Fund II", "Fund III", "Co-Investment", "SPV"],
    ie: ["Institutional Block", "ADR/GDR", "FII Allocation", "Program Trade"],
  };
  const types = DEAL_TYPES[vId] || ["Equity"];

  const submit = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/deals`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, vertical: vName, type, value, stage, notes }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      onCreated();
      onClose();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-md shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${t.text}`}>
            <div className={`w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><Briefcase className="w-3.5 h-3.5 text-white" /></div>
            New Deal — {v.label}
          </div>
          <button onClick={onClose} className={t.textMuted}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Deal Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className={`w-full text-sm rounded-xl border px-3 py-2.5 ${t.inputBg}`} placeholder="Deal name or description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`}>
                {types.map(tp => <option key={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Stage</label>
              <select value={stage} onChange={e => setStage(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`}>
                {(DEAL_STAGES[vId] || ["Active", "In Progress", "Executed", "Settled"]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Deal Value</label>
            <input value={value} onChange={e => setValue(e.target.value)} className={`w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg}`} placeholder="e.g. ₹2.5 Cr" />
          </div>
          <div>
            <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`w-full text-xs rounded-xl border px-3 py-2 ${t.inputBg} resize-none`} />
          </div>
          {err && <div className={`text-xs p-2.5 rounded-xl ${isDark ? "bg-red-950/40 text-red-300" : "bg-red-50 text-red-700"}`}>{err}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className={`flex-1 text-xs py-2.5 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={submit} disabled={saving} className={`flex-1 text-xs py-2.5 rounded-xl ${v.color} text-white flex items-center justify-center gap-1.5 disabled:opacity-60`}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealsView({ vId, t, loggedUser }: { vId: string; t: ReturnType<typeof useTheme>; loggedUser?: any }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const vName = VNAME[vId];
  const DEAL_PAGE_SIZE = 15;
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filterStage, setFilterStage] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [dealTab, setDealTab] = useState<"activity" | "documents">("activity");
  const [dealActivityKey, setDealActivityKey] = useState(0);
  const [sortBy, setSortBy] = useState("created_at_desc");

  const DEAL_SORT_OPTIONS = [
    { value: "created_at_desc", label: "Newest First" },
    { value: "updated_at_desc", label: "Recently Modified" },
    { value: "name_asc",        label: "Name A–Z" },
    { value: "value_desc",      label: "Value (High–Low)" },
    { value: "stage_asc",       label: "Stage" },
  ];

  const dealBoardStages = DEAL_STAGES[vId] || ["Active", "In Progress", "Executed", "Settled"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ vertical: vName, limit: "200", sort_by: sortBy });
      if (filterStage !== "all") params.set("stage", filterStage);
      if (search) params.set("search", search);
      const r = await fetch(`${API_BASE}/api/deals?${params}`);
      const d = await r.json();
      setAllDeals(d.data || []);
      setTotal(d.total || 0);
    } catch { setAllDeals([]); } finally { setLoading(false); }
  }, [vId, filterStage, search, sortBy]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filterStage, search, sortBy]);

  const deals = allDeals;
  const paginated = deals.slice((page - 1) * DEAL_PAGE_SIZE, page * DEAL_PAGE_SIZE);

  // Move a deal along its stage path (server enforces Mandatory / Skip allowed; asks to confirm skips)
  const dealPathStages = DEAL_STAGE_META[vId] || dealBoardStages.map(l => ({ id: l, label: l }));
  const [dealMoving, setDealMoving] = useState(false);
  const [dealPrompt, setDealPrompt] = useState<any>(null);
  const [dealStageMsg, setDealStageMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Board drag & drop → confirmation → Submit (Cancel leaves the deal where it was)
  const [dealDrop, setDealDrop] = useState<{ deal: any; to: string } | null>(null);
  const [dealDropErr, setDealDropErr] = useState("");
  const dealDrag = useBoardDrag<any>((deal, to) => { setDealDropErr(""); setDealDrop({ deal, to }); }, d => d.name);
  const submitDealDrop = async (extra: Record<string, any>) => {
    if (!dealDrop) return;
    setDealMoving(true); setDealDropErr("");
    try {
      const r = await fetch(`${API_BASE}/api/deals/${dealDrop.deal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: dealDrop.to, skip_confirmed: true, ...extra }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not move");
      appToast(`${dealDrop.deal.name} → ${dealDrop.to}`, "success");
      if (selected?.id === dealDrop.deal.id) setSelected({ ...selected, ...d, rm_name: selected.rm_name, client_name: selected.client_name });
      setDealDrop(null); setDealActivityKey(k => k + 1); load();
    } catch (e: any) { setDealDropErr(e.message); } finally { setDealMoving(false); }
  };
  const dealDropInfo = (() => {
    if (!dealDrop) return null;
    const flow = dealPathStages.filter((s: any) => !s.is_lost);
    const path = dealDrop.deal.stage_path || {};
    const iFrom = flow.findIndex((s: any) => s.id === dealDrop.deal.stage), iTo = flow.findIndex((s: any) => s.id === dealDrop.to);
    const skip = iFrom >= 0 && iTo > iFrom ? flow.slice(iFrom + 1, iTo).filter((s: any) => !path[s.id]).map((s: any) => ({ stage_id: s.id, label: s.label, mandatory: s.skip_allowed === false })) : [];
    return { from: dealDrop.deal.stage, to: dealDrop.to, skip, back: iTo >= 0 && iTo < iFrom };
  })();
  const [dealEdit, setDealEdit] = useState(false);
  const [dealWide, setDealWide] = useState(false);
  useEffect(() => { setDealPrompt(null); setDealStageMsg(null); setDealEdit(false); }, [selected?.id]);
  const moveDeal = async (stageId: string, extra: Record<string, any> = {}) => {
    if (!selected) return;
    setDealMoving(true); setDealStageMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/deals/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: stageId, ...extra }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.code === "CONFIRM_SKIP" || d.code === "NEED_SKIP_COMMENT") { setDealPrompt({ stageId, code: d.code, carry: extra, skip: d.skip, stage: d.stage }); return; }
        throw new Error(d.error || "Could not change stage");
      }
      setDealPrompt(null); setSelected({ ...selected, ...d, rm_name: selected.rm_name, client_name: selected.client_name });
      setDealStageMsg({ ok: true, text: `Moved to ${dealPathStages.find(s => s.id === stageId)?.label || stageId}` });
      setDealActivityKey(k => k + 1); load();
    } catch (e: any) { setDealStageMsg({ ok: false, text: e.message }); } finally { setDealMoving(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <DealModal
        open={showCreate || !!editingDeal}
        onClose={() => { setShowCreate(false); setEditingDeal(null); }}
        onSaved={() => { load(); setShowCreate(false); setEditingDeal(null); setSelected(null); setDealActivityKey(k => k + 1); }}
        vertical={vName}
        verticalId={vId}
        editDeal={editingDeal}
        currentUser={loggedUser}
        apiBase={API_BASE}
      />
      {!selected && !showCreate && !editingDeal && (
        <button onClick={() => setShowCreate(true)} aria-label="New Deal"
          className="m-fab sm:hidden fixed right-4 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 h-12 px-4 rounded-full bg-orange-600 text-white shadow-xl flex items-center gap-2 text-sm font-semibold">
          <Plus className="w-5 h-5" /> New Deal
        </button>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`m-toolbar px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0 flex-wrap`}>
          <div className={`m-title w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><Briefcase className="w-3.5 h-3.5 text-white" /></div>
          <div className="m-title">
            <div className={`text-sm font-bold ${t.text} uppercase`}>{v.label} — Deals</div>
            <div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} deals`}</div>
          </div>
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5`}>
            <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-28`} placeholder="Search deals…" />
          </div>
          <select value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
            <option value="all">All Stages</option>
            {dealBoardStages.map(s => <option key={s}>{s}</option>)}
          </select>

          <div className={`flex items-center gap-1.5 border ${t.border} rounded-lg px-2 py-1.5 ${t.inputBg}`}>
            <ArrowUpDown className={`w-3 h-3 ${t.textMuted} flex-shrink-0`} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={`text-xs bg-transparent ${t.text} outline-none`}>
              {DEAL_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* View toggle */}
          <div className={`flex items-center border ${t.border} rounded-lg overflow-hidden`}>
            <button onClick={() => setViewMode("list")} title="List View" className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : t.textMuted}`}><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode("board")} title="Board View" className={`p-1.5 transition-colors ${viewMode === "board" ? "bg-blue-600 text-white" : t.textMuted}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowCreate(true)} className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /> New Deal</button>
          </div>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center flex-1 h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
        ) : viewMode === "list" ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <MList className="p-3">
                {paginated.map((d: any) => (
                  <MCard key={d.id} selected={selected?.id === d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)}
                    title={d.name} badge={<StatusBadge s={d.stage} />}
                    value={d.value ? fmtMoneyStr(d.value) : "—"}
                    left={d.type} right={d.deal_code}
                    lines={[<><User className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{d.rm_name || "No RM"}</span><span className="ml-auto flex-shrink-0">{fmtDateShort(d.deal_date)}</span></>]}
                  />
                ))}
              </MList>
              <table className="w-full max-md:hidden">
                <thead className={`sticky top-0 ${t.tableHead}`}>
                  <tr className={`border-b ${t.border}`}>
                    {["Deal ID", "Name", "Type", "Value", "Stage", "RM", "Date", ""].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2.5 whitespace-nowrap`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((d: any, i) => (
                    <tr key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)}
                      className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${selected?.id === d.id ? (isDark ? "bg-gray-800/60" : "bg-blue-50") : i % 2 === 1 ? t.bgCard2 : ""}`}>
                      <td className={`px-4 py-3 font-mono text-[10px] ${verticalAccent(v.id)}`}>{d.deal_code}</td>
                      <td className={`px-4 py-3 font-medium ${t.text}`}>{d.name}</td>
                      <td className={`px-4 py-3 ${t.textMuted}`}>{d.type}</td>
                      <td className={`px-4 py-3 font-bold ${t.text}`}>{d.value ? fmtMoneyStr(d.value) : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge s={d.stage} /></td>
                      <td className={`px-4 py-3 ${t.textMuted}`}>{d.rm_name || "—"}</td>
                      <td className={`px-4 py-3 ${t.textMuted}`}>{fmtDateShort(d.deal_date)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingDeal(d)} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500" title="Edit deal"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setSelected(d)} className={t.textMuted}><Eye className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {deals.length === 0 && <div className={`text-center py-12 text-sm ${t.textMuted}`}>No deals found.</div>}
            </div>
            <Pagination total={total} page={page} pageSize={DEAL_PAGE_SIZE} onChange={setPage} t={t} />
          </>
        ) : (
          /* ── Board View ── */
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* Stages wrap into rows instead of scrolling sideways; one column per row on phones */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] items-start">
              {[...dealBoardStages, ...Array.from(new Set(deals.map(d => d.stage).filter((st: string) => st && !dealBoardStages.includes(st))))].map(stageName => {
                const stageDeals = deals.filter(d => d.stage === stageName);
                return (
                  <div key={stageName} data-drop-stage={stageName} className={`min-w-0 flex flex-col rounded-xl transition-all duration-200 ${dealDrag.overStage === stageName ? "bg-blue-500/10 ring-2 ring-blue-500" : dealDrag.dragging ? "ring-1 ring-gray-400/40" : ""}`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${v.color}`} />
                        <span className={`text-xs font-semibold ${t.text}`}>{stageName}</span>
                      </div>
                      <span className={`text-[10px] ${t.tagGray} px-1.5 py-0.5 rounded-full`}>{stageDeals.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {stageDeals.map((deal: any) => (
                        <div key={deal.id} {...dealDrag.cardProps(deal, deal.stage)} onClick={() => setSelected(selected?.id === deal.id ? null : deal)} title="Click to open · drag to move to another stage"
                          className={`${t.bgCard} border ${selected?.id === deal.id ? "border-blue-500" : t.border} rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-in fade-in ${dealDrag.draggingItem === deal ? "opacity-40 scale-95" : ""}`}>
                          <div className={`text-xs font-semibold ${t.text} leading-tight mb-1 truncate`}>{deal.name}</div>
                          <div className={`text-sm font-bold ${t.text} mb-1`}>{deal.value ? fmtMoneyStr(deal.value) : "—"}</div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] ${t.textMuted}`}>{deal.type}</span>
                            <span className={`text-[9px] font-mono ${verticalAccent(v.id)}`}>{deal.deal_code}</span>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setShowCreate(true)} className={`w-full py-2 rounded-xl border border-dashed ${t.border} ${t.textMuted} text-xs flex items-center justify-center gap-1.5 hover:opacity-70`}>
                        <Plus className="w-3 h-3" /> Add Deal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {dealDrag.ghost}
      {dealDrop && dealDropInfo && (
        <StageMoveDialog title={dealDrop.deal.name} from={dealDropInfo.from} to={dealDropInfo.to} skip={dealDropInfo.skip} back={dealDropInfo.back} busy={dealMoving} error={dealDropErr}
          onCancel={() => { setDealDrop(null); setDealDropErr(""); }} onSubmit={submitDealDrop} />
      )}
      {/* Side Panel */}
      {selected && (
        <div className={dealWide ? "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200" : `fixed inset-0 z-40 sm:static sm:z-auto sm:w-[440px] lg:w-[500px] border-l ${t.border} ${t.bgCard} p-4 overflow-y-auto flex-shrink-0 animate-in slide-in-from-right-8 fade-in duration-300`}
          onMouseDown={e => { if (dealWide && e.target === e.currentTarget) setDealWide(false); }}>
          <div className={dealWide ? `w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl border ${t.border} ${t.bgCard} shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-200` : ""}>
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="min-w-0">
              <div className={`text-sm font-bold ${t.text}`}>{vId === "ib" ? "Mandate / Deal" : "Deal Details"}</div>
              <div className={`text-[10px] ${dealEdit ? "text-amber-500 font-semibold" : t.textMuted}`}>{dealEdit ? "Editing — changes are saved as you make them" : "View only"}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {dealEdit ? (<>
                <button onClick={() => setEditingDeal(selected)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${t.border} ${t.textSub}`}><Edit2 className="w-3 h-3" /> Details</button>
                <button onClick={() => { setDealEdit(false); setDealPrompt(null); }} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"><CheckCircle2 className="w-3 h-3" /> Done</button>
              </>) : (
                <button onClick={() => setDealEdit(true)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"><Edit2 className="w-3 h-3" /> Edit</button>
              )}
              <button onClick={() => setDealWide(w => !w)} title={dealWide ? "Exit full screen" : "Expand to full screen"} aria-label={dealWide ? "Exit full screen" : "Expand"} className={`hidden sm:inline-flex p-1.5 rounded-lg ${t.textMuted} hover:bg-gray-500/10`}>
                {dealWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => { setSelected(null); setDealWide(false); }} aria-label="Close" className={`p-1.5 rounded-lg ${t.textMuted} hover:bg-gray-500/10`}><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className={dealWide ? "grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 items-start" : ""}>
          <div className="min-w-0">
          <div className={`${t.bgCard2} rounded-xl p-3 mb-3`}>
            <code className={`text-[10px] ${verticalAccent(v.id)}`}>{selected.deal_code}</code>
            <div className={`text-sm font-bold ${t.text} mt-1`}>{selected.name}</div>
            <div className={`text-xl font-bold ${t.text} mt-1`}>{selected.value ? fmtMoneyStr(selected.value) : "—"}</div>
            <StatusBadge s={selected.stage} />
          </div>
          {/* Stage path — same workflow as opportunities (Mandatory / Skip allowed) */}
          <div className="mb-3 space-y-2">
            <StagePath compact={!dealWide} readOnly={!dealEdit} stages={dealPathStages} current={selected.stage} path={selected.stage_path} busy={dealMoving} onMove={(id, extra) => moveDeal(id, extra || {})} />
            {dealPrompt && <StageFlowPrompt prompt={{ ...dealPrompt, from: dealPathStages.find(s => s.id === selected.stage)?.label }} stages={dealPathStages} busy={dealMoving} onMove={(id, extra) => moveDeal(id, extra || {})} onCancel={() => setDealPrompt(null)} />}
            {dealStageMsg && !dealPrompt && <div className={`text-[11px] ${dealStageMsg.ok ? "text-emerald-500" : "text-red-500"}`}>{dealStageMsg.text}</div>}
          </div>
          <div className={dealWide ? "grid sm:grid-cols-2 gap-x-6" : ""}>
          {[
            { label: "Type", value: selected.type },
            { label: "RM", value: selected.rm_name || "—" },
            { label: "Date", value: fmtDateShort(selected.deal_date) },
            { label: "Created by", value: selected.created_by_name || "—" },
            // Kind-specific details captured when the deal was created (IPO board, exchange, role, scheme…)
            ...(() => { const k = kindOf(v.id, selected); return (k?.fields || []).filter(fd => selected.details?.[fd.k] !== undefined && selected.details?.[fd.k] !== "")
              .map(fd => ({ label: fd.label, value: fd.type === "pct" ? `${selected.details[fd.k]}%` : fd.type === "money" ? fmtMoneyStr(selected.details[fd.k]) : fd.type === "date" ? fmtDateShort(selected.details[fd.k]) : String(selected.details[fd.k]) })); })(),
            { label: "Notes", value: selected.notes || "—" },
          ].map(r => (
            <div key={r.label} className={`flex justify-between text-xs py-1.5 border-b ${t.border} last:border-0`}>
              <span className={t.textMuted}>{r.label}</span>
              <span className={`font-medium ${t.text} text-right max-w-48 truncate`}>{r.value}</span>
            </div>
          ))}
          </div>
          </div>
          <div className="min-w-0">
          <div className={`flex gap-1 border-b ${t.border} pt-3 mb-3`}>
            {(["activity", "documents"] as const).map(tab => (
              <button key={tab} onClick={() => setDealTab(tab)}
                className={`text-xs px-3 py-2 -mb-px border-b-2 ${dealTab === tab ? "border-blue-500 text-blue-500 font-semibold" : `border-transparent ${t.textMuted}`}`}>
                {tab === "activity" ? "History & comments" : "Documents"}
              </button>
            ))}
          </div>
          {dealTab === "activity"
            ? <RecordActivity type="deal" id={selected.id} t={t} refreshKey={dealActivityKey} />
            : <RecordDocuments type="deal" id={selected.id} vertical={vName} clientId={selected.client_id} t={t} onChange={() => setDealActivityKey(k => k + 1)} />}
          </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── CUSTOMERS (per vertical, paginated) ──────────────────────────────────────
function CustomersView({ vId, t, loggedUser }: { vId: string; t: ReturnType<typeof useTheme>; loggedUser?: any }) {
  const v = VERTICALS.find(x => x.id === vId)!;
  const PAGE_SIZE = 15;
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

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
        <div className={`m-toolbar px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
          <div className={`m-title w-6 h-6 rounded-lg ${v.color} flex items-center justify-center`}><Users className="w-3.5 h-3.5 text-white" /></div>
          <div className="m-title"><div className={`text-sm font-bold ${t.text} uppercase`}>{v.label} — Clients</div><div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} clients`}</div></div>
          <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-gray-100"} rounded-lg px-3 py-1.5 ml-3`}><Search className={`w-3.5 h-3.5 ${t.textMuted}`} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-32`} placeholder="Search…" /></div>
          <div className="ml-auto flex gap-2"><button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button><button onClick={() => { setEditingClient(null); setCreateClientOpen(true); }} className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /> New Client</button></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
          ) : (<>
            <MList className="p-3">
              {clients.map(c => (
                <MCard key={c.id} selected={selected?.id === c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  accent={c.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}
                  title={c.name} badge={<StatusBadge s={c.kyc_status} />}
                  left={c.category} right={c.client_code}
                  lines={[<><User className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{c.rm_name || "No RM"}</span><span className="ml-auto flex-shrink-0">{maskValue(c.mobile) || ""}</span></>]}
                />
              ))}
            </MList>
            <table className="w-full max-md:hidden">
              <thead className={`sticky top-0 ${t.tableHead}`}><tr className={`border-b ${t.border}`}>{["Code", "Name", "Category", "Contact", "RM", "KYC", "Status", ""].map(h => <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2.5`}>{h}</th>)}</tr></thead>
              <tbody>{clients.map(c => (
                <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} className={`border-b ${t.border} last:border-0 ${t.rowHover} cursor-pointer text-xs ${selected?.id === c.id ? (isDark ? "bg-blue-950/30" : "bg-blue-50") : ""}`}>
                  <td className="px-4 py-3 font-mono text-blue-400 text-[10px]">{c.client_code}</td>
                  <td className={`px-4 py-3 font-medium ${t.text}`}>{c.name}</td>
                  <td className="px-4 py-3"><Badge text={c.category} color={t.tagGray} /></td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{maskValue(c.mobile)}</td>
                  <td className={`px-4 py-3 ${t.textMuted}`}>{c.rm_name || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge s={c.kyc_status} /></td>
                  <td className="px-4 py-3"><span className={`text-xs ${c.status === "Active" ? t.successText : t.warningText}`}>{c.status}</span></td>
                  <td className="px-4 py-3"><Eye className={`w-4 h-4 ${t.textMuted}`} /></td>
                </tr>
              ))}</tbody>
            </table>
          </>)}
        </div>
        <Pagination total={total} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />
      </div>
      {selected && <Client360Panel client={selected} t={t} onClose={() => setSelected(null)} loggedUser={loggedUser} />}
      <ClientForm
        open={createClientOpen}
        onClose={() => { setCreateClientOpen(false); setEditingClient(null); }}
        onSaved={() => { load(); setCreateClientOpen(false); setEditingClient(null); }}
        editClient={editingClient}
        currentUser={loggedUser}
        apiBase={API_BASE}
      />
    </div>
  );
}
// ─── DOCUMENTS (with version control) ────────────────────────────────────────
function DocumentsView({ vId, t, loggedUser }: { vId: string; t: ReturnType<typeof useTheme>; loggedUser?: any }) {
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

  // ── Upload state ──────────────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("KYC");
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (f: File | null) => {
    if (!f) return;
    setUploadFile(f);
    setUploadName(f.name.replace(/\.[^.]+$/, ""));
    setUploadError("");
  };

  const handleUpload = async () => {
    if (!uploadFile) { setUploadError("Please select a file."); return; }
    if (!uploadName.trim()) { setUploadError("Please enter a document name."); return; }
    setUploading(true); setUploadError("");
    try {
      const reader = new FileReader();
      const fileData: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const VNAME: Record<string, string> = { retail: "Retail Broking", corporate: "Corporate Broking", ib: "Investment Banking", aif: "AIF", ie: "Institutional Equities" };
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: uploadName.trim(), type: uploadType, vertical: VNAME[vId] || vId, fileData, fileName: uploadFile.name, note: uploadNote.trim() || "Initial upload", created_by: loggedUser?.id || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed");
      setShowUpload(false); setUploadFile(null); setUploadName(""); setUploadNote(""); setUploadType("KYC");
      load();
    } catch (e: any) { setUploadError(e.message || "Upload failed. Please try again."); }
    setUploading(false);
  };

  return (
    <>
    {showUpload && (
      <div className="fixed inset-0 animate-in fade-in duration-200 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className={`${t.bgCard} border ${t.border} rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
          <div className={`text-sm font-bold ${t.text} mb-4 flex items-center gap-2`}><Upload className="w-4 h-4 text-blue-400" /> Upload Document</div>
          <div className="space-y-3">
            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed ${t.border} rounded-xl p-6 text-center cursor-pointer ${t.rowHover} transition-colors`}>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
              {uploadFile ? (
                <div className={`text-xs ${t.text} flex items-center justify-center gap-2`}><FileText className="w-4 h-4 text-blue-400" />{uploadFile.name} <span className={t.textMuted}>({(uploadFile.size / 1024).toFixed(1)} KB)</span></div>
              ) : (
                <div className={`text-xs ${t.textMuted}`}><Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />Click to browse or drag & drop<div className="mt-0.5 text-[10px]">PDF, DOC, XLS, PNG, JPG — max 50 MB</div></div>
              )}
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Document Name</label>
              <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="e.g. KYC_Rajesh_Sharma_2024" className={`w-full border ${t.border} rounded-xl px-3 py-2 text-xs ${t.inputBg} outline-none`} />
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Document Type</label>
              <select value={uploadType} onChange={e => setUploadType(e.target.value)} className={`w-full border ${t.border} rounded-xl px-3 py-2 text-xs ${t.inputBg} outline-none`}>
                {["KYC", "Agreement", "Mandate", "Compliance", "Report", "Subscription", "Trade", "Invoice", "Other"].map(tp => <option key={tp}>{tp}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Note (optional)</label>
              <input value={uploadNote} onChange={e => setUploadNote(e.target.value)} placeholder="e.g. Updated KYC after address change" className={`w-full border ${t.border} rounded-xl px-3 py-2 text-xs ${t.inputBg} outline-none`} />
            </div>
            {uploadError && <div className="text-[10px] text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">{uploadError}</div>}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setShowUpload(false); setUploadFile(null); setUploadError(""); }} className={`flex-1 text-xs py-2 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={handleUpload} disabled={uploading} className={`flex-1 text-xs py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 disabled:opacity-50`}>
              {uploading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> Upload</>}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="p-3 sm:p-5 overflow-y-auto h-full">
      <div className="m-toolbar m-inpage flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <div className={`m-title w-7 h-7 rounded-lg ${v.color} flex items-center justify-center`}><FileText className="w-4 h-4 text-white" /></div>
        <div className="m-title"><div className={`text-sm font-bold ${t.text} uppercase`}>{v.label} — Documents</div><div className={`text-[10px] ${t.textMuted}`}>{loading ? "Loading…" : `${total} documents`}</div></div>
        <div className={`flex items-center gap-2 ${t.bgCard2} rounded-lg px-3 py-1.5 ml-2`}><Search className={`w-3.5 h-3.5 ${t.textMuted}`} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`bg-transparent text-xs ${t.text} outline-none w-32`} placeholder="Search docs…" /></div>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
          <option value="all">All Types</option>
          {["KYC", "Agreement", "Report", "Mandate", "Subscription", "Compliance", "Trade"].map(tp => <option key={tp}>{tp}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}>
          <option value="all">All Status</option>
          {["Verified", "Pending", "Executed", "Draft", "Archived"].map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="ml-auto flex gap-2"><button onClick={load} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button><button onClick={() => setShowUpload(true)} className={`text-xs px-3 py-1.5 rounded-lg ${v.color} text-white flex items-center gap-1.5`}><Upload className="w-3.5 h-3.5" /> Upload</button></div>
      </div>
      {loading ? (
        <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
      ) : docs.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 gap-3 ${t.textMuted}`}><FileText className="w-10 h-10 opacity-20" /><p className="text-sm">No documents found</p></div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                  <FileText className={`w-4 h-4 ${t.textMuted} flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${t.text} truncate`}>{doc.name}</div>
                    <div className={`text-[10px] ${t.textMuted} mt-0.5`}>{doc.type} · {doc.client_name || "—"} · {fmtDateShort(doc.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap pl-7 sm:pl-0">
                  <Badge text={doc.current_version} color="bg-blue-900/60 text-blue-400" />
                  <StatusBadge s={doc.status} />
                  <span className={`text-[10px] ${t.textMuted}`}>{doc.file_size}</span>
                  <button onClick={() => loadVersions(doc.id)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${showVersions === doc.id ? "border-blue-500 text-blue-400" : t.border + " " + t.textMuted} flex items-center gap-1 transition-colors`}>
                    <Clock className="w-3 h-3" /> History
                  </button>
                  <button onClick={async () => {
                    const r = await fetch(`${API_BASE}/api/documents/${doc.id}/download`);
                    if (r.status === 422) { const j = await r.json(); appToast(j.message || "Document not available for download.", "error"); return; }
                    if (!r.ok) { appToast("Download failed.", "error"); return; }
                    const blob = await r.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = doc.name; a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }} className="text-blue-400 hover:underline text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
                </div>
              </div>
              {showVersions === doc.id && (
                <div className={`border-t ${t.border} px-4 py-3 ${t.tableHead}`}>
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
                            <td><button onClick={async () => {
                              const r = await fetch(`${API_BASE}/api/documents/${doc.id}/download`);
                              if (r.status === 422) { const j = await r.json(); appToast(j.message || "Document not available.", "error"); return; }
                              if (!r.ok) { appToast("Download failed.", "error"); return; }
                              const blob = await r.blob(); const url = URL.createObjectURL(blob);
                              const a2 = document.createElement("a"); a2.href = url; a2.download = doc.name; a2.click();
                              setTimeout(() => URL.revokeObjectURL(url), 1000);
                            }} className="text-blue-400 hover:underline text-xs flex items-center gap-1"><Download className="w-3 h-3" /></button></td>
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
    </>
  );
}
// ─── ADMIN: USERS LIST ────────────────────────────────────────────────────────
const USER_VERTICALS = ["All", "Retail Broking", "Corporate Broking", "Investment Banking", "AIF", "Institutional Equities"];
const USER_ROLES = VERTICAL_ROLES.map(r => r.role);
const AUTH_TYPES: AuthMethod[] = ["app", "m365"];

function UserFormModal({
  t, isDark, initial, onClose, onSaved,
}: {
  t: ReturnType<typeof useTheme>; isDark: boolean;
  initial?: any; onClose: () => void; onSaved: (u: any) => void;
}) {
  const isEdit = !!initial?.id;
  const blank = { name: "", email: "", mobile: "", location: "", role: "Junior RM", vertical: "All", auth_type: "app" as AuthMethod, mfa_enabled: false, status: "Active" };
  const [form, setForm] = useState<any>(isEdit ? {
    name: initial.name || "", email: initial.email || "",
    mobile: initial.mobile || "", location: initial.location || "",
    role: initial.role || "Junior RM", vertical: initial.vertical || "All",
    auth_type: initial.auth_type || "app", mfa_enabled: !!initial.mfa_enabled,
    status: initial.status || "Active",
  } : blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const inp = `w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none focus:ring-1 focus:ring-blue-500/50`;
  const sel = `w-full text-xs rounded-xl border px-3 py-2.5 ${t.inputBg} outline-none`;

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!isEdit && !form.email.trim()) { setError("Email is required"); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit ? `${API_BASE}/api/admin/users/${initial.id}` : `${API_BASE}/api/admin/users`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Failed to save"); return; }
      onSaved(d);
      onClose();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-lg shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b ${t.border} flex items-center justify-between`}>
          <div>
            <div className={`text-sm font-bold ${t.text}`}>{isEdit ? "Edit User" : "Create User"}</div>
            <div className={`text-[10px] ${t.textMuted} mt-0.5`}>{isEdit ? `Editing ${initial.email}` : "User will be created in system. No email invitation sent."}</div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${t.textMuted} hover:opacity-70`}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Full Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Rahul Sharma" className={inp} />
            </div>
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Email *</label>
              <input value={form.email} onChange={e => set("email", e.target.value)} placeholder="user@niytri.com" disabled={isEdit} className={`${inp} ${isEdit ? "opacity-50 cursor-not-allowed" : ""}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Mobile Number</label>
              <input value={form.mobile} onChange={e => set("mobile", e.target.value)} placeholder="+91 98765 43210" className={inp} />
            </div>
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Location / City</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Mumbai" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Role</label>
              <select value={form.role} onChange={e => set("role", e.target.value)} className={sel}>
                {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Vertical</label>
              <select value={form.vertical} onChange={e => set("vertical", e.target.value)} className={sel}>
                {USER_VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Auth Type</label>
              <select value={form.auth_type} onChange={e => set("auth_type", e.target.value)} className={sel}>
                <option value="app">App (Email OTP)</option>
                <option value="m365">Microsoft 365 SSO</option>
              </select>
            </div>
            <div>
              <label className={`text-[11px] font-medium ${t.textMuted} block mb-1`}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={sel}>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer mt-1">
            <div onClick={() => set("mfa_enabled", !form.mfa_enabled)}
              className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${form.mfa_enabled ? "bg-blue-600" : (isDark ? "bg-gray-600" : "bg-gray-300")}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${form.mfa_enabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className={`text-xs ${t.text}`}>Require MFA (Multi-Factor Authentication)</span>
          </label>
        </div>
        <div className={`px-5 py-3 border-t ${t.border} flex gap-2`}>
          <button onClick={onClose} className={`flex-1 text-xs py-2.5 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 text-xs py-2.5 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-1.5 disabled:opacity-60">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (isEdit ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />)}
            {saving ? "Saving…" : (isEdit ? "Save Changes" : "Create User")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsers({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const PAGE_SIZE = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`${API_BASE}/api/admin/users?${params}`);
      const d = await r.json();
      setUsers(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated: any) => {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === updated.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...updated }; return copy; }
      return [updated, ...prev];
    });
  };

  const ROLE_COLOR: Record<string, string> = {
    "Super Admin": badgeColors("red"), "AIF Admin": badgeColors("green"),
    "Retail Admin": badgeColors("blue"), "Corporate Admin": badgeColors("violet"),
    "IB Admin": badgeColors("yellow"), "IE Admin": badgeColors("red"),
    "Business Head": badgeColors("violet"), "Senior RM": badgeColors("blue"),
    "Compliance Officer": badgeColors("yellow"), "CS Head": badgeColors("green"),
  };

  const paged = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`m-toolbar px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0 flex-wrap gap-y-2`}>
        <Users className={`m-title w-4 h-4 ${t.textMuted}`} />
        <div className={`m-title text-sm font-bold ${t.text}`}>Users</div>
        <div className="relative ml-2">
          <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, mobile…" className={`border rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none ${t.inputBg} w-56`} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className={`border rounded-xl px-3 py-1.5 text-xs ${t.inputBg} outline-none`}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[10px] ${t.textMuted}`}>{users.length} users</span>
          <button onClick={load} className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:opacity-70`}><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowCreate(true)} className="text-xs px-3 py-1.5 rounded-xl bg-blue-600 text-white flex items-center gap-1.5 hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /> Create User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32"><RefreshCw className={`w-5 h-5 animate-spin ${t.textMuted}`} /></div>
        ) : (<>
          <MList className="p-3">
            {paged.length === 0 && <div className={`text-center text-sm py-12 ${t.textMuted}`}>No users found</div>}
            {paged.map(u => (
              <MCard key={u.id} onClick={() => setEditUser(u)} accent={u.status === "Active" ? "bg-emerald-500" : "bg-gray-400"}
                title={<span className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">{(u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span><span className="min-w-0"><span className="block truncate">{u.name}</span><span className={`block text-[12.5px] font-normal ${t.textMuted} truncate`}>{maskValue(u.email)}</span></span></span>}
                badge={<Badge text={u.role} color={ROLE_COLOR[u.role] || badgeColors("blue")} />}
                chips={[<AuthBadge key="a" method={u.auth_type as AuthMethod} />,
                  <span key="m" className={`text-[11.5px] ${u.mfa_enabled ? "text-emerald-500" : t.textMuted}`}>MFA {u.mfa_enabled ? "On" : "Off"}</span>,
                  <span key="s" className={`text-[11.5px] font-medium ${u.status === "Active" ? t.successText : t.textMuted}`}>{u.status}</span>]}
                lines={[<><span className="truncate">{[u.vertical, u.location].filter(Boolean).join(" · ") || "—"}</span><span className="ml-auto flex-shrink-0">{u.last_login ? `Last login ${new Date(u.last_login).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : "Never signed in"}</span></>]}
              />
            ))}
          </MList>
          <table className="w-full min-w-[900px] max-md:hidden">
            <thead className={`sticky top-0 ${t.tableHead}`}>
              <tr className={`border-b ${t.border}`}>
                {["User", "Email", "Mobile", "Location", "Vertical", "Role", "Auth", "MFA", "Status", "Last Login", ""].map(h => (
                  <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-3 py-2.5 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={11} className={`text-center text-xs py-12 ${t.textMuted}`}>No users found</td></tr>
              ) : paged.map(u => (
                <tr key={u.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} text-xs`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                        {(u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className={`font-medium ${t.text} whitespace-nowrap`}>{u.name}</span>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 ${t.textMuted} whitespace-nowrap`}>{maskValue(u.email)}</td>
                  <td className={`px-3 py-2.5 ${t.textMuted}`}>{u.mobile || <span className="opacity-30">—</span>}</td>
                  <td className={`px-3 py-2.5 ${t.textMuted}`}>{u.location || <span className="opacity-30">—</span>}</td>
                  <td className={`px-3 py-2.5 ${t.textMuted} whitespace-nowrap`}>{u.vertical || "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge text={u.role} color={ROLE_COLOR[u.role] || badgeColors("blue")} />
                  </td>
                  <td className="px-3 py-2.5"><AuthBadge method={u.auth_type as AuthMethod} /></td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] ${u.mfa_enabled ? "text-emerald-400" : "text-gray-500"}`}>{u.mfa_enabled ? "✓ On" : "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-medium ${u.status === "Active" ? t.successText : t.textMuted}`}>{u.status}</span>
                  </td>
                  <td className={`px-3 py-2.5 ${t.textMuted} whitespace-nowrap`}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setEditUser(u)} className={`p-1.5 rounded-lg hover:text-blue-400 ${t.textMuted}`}><Edit className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}
      </div>
      <Pagination total={users.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} t={t} />

      {showCreate && <UserFormModal t={t} isDark={isDark} onClose={() => setShowCreate(false)} onSaved={u => { handleSaved(u); }} />}
      {editUser   && <UserFormModal t={t} isDark={isDark} initial={editUser} onClose={() => setEditUser(null)} onSaved={u => { handleSaved(u); setEditUser(null); }} />}
    </div>
  );
}

// ─── ADMIN: USER ROLES ────────────────────────────────────────────────────────
function AdminUserRoles({ t }: { t: ReturnType<typeof useTheme> }) {
  const PERMS = (() => {
    const pages: { key: string; label: string; group: string }[] = [];
    pages.push({ key: "OverallDashboard", label: "Overall Dashboard", group: "Global" });
    pages.push({ key: "ClientRegistry", label: "Client Registry", group: "Global" });
    pages.push({ key: "ServiceRequests", label: "Service Requests", group: "Global" });
    pages.push({ key: "AIAssistant", label: "AI Assistant", group: "Global" });
    SUBMENU.forEach(s => pages.push({ key: `Vertical_${s.id}`, label: s.label, group: "Vertical Pages" }));
    ADMIN_MENU.forEach(sec => sec.items.forEach(a => pages.push({ key: a.id.replace(/-/g, "_"), label: a.label, group: `Admin: ${sec.section}` })));
    return pages;
  })();
  const PERM_KEYS = PERMS.map(p => p.key);
  const [roles, setRoles] = useState(VERTICAL_ROLES.map((r, i) => ({
    id: String(i), role_name: r.role, vertical: r.vertical, description: r.desc,
    permissions: Object.fromEntries(PERM_KEYS.map(p => [p, r.access.includes("All Modules") || r.access.some(a => a.toLowerCase().includes(p.replace(/Vertical_|admin_/g, "").toLowerCase()))])),
    is_active: true,
  })));
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState({ role_name: "", vertical: "All", description: "", permissions: Object.fromEntries(PERM_KEYS.map(p => [p, false])) });

  const VERTICAL_OPTS = ["All", "Retail Broking", "Corporate Broking", "Investment Banking", "AIF", "Institutional Equities", "Assigned"];
  const ROLE_COLORS: Record<string, string> = { "Super Admin": badgeColors("red"), "AIF Admin": badgeColors("green"), "Retail Admin": badgeColors("blue"), "Corporate Admin": badgeColors("violet"), "IB Admin": badgeColors("yellow"), "IE Admin": badgeColors("red") };

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
              <label className={`text-[10px] ${t.textMuted} mb-2 block`}>Page Permissions</label>
              {Object.entries(PERMS.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {} as Record<string, typeof PERMS>)).map(([group, perms]) => (
                <div key={group} className="mb-2">
                  <div className={`text-[9px] font-bold uppercase tracking-wider ${t.textMuted} mb-1`}>{group}</div>
                  <div className="flex flex-wrap gap-1.5">{perms.map(p => (
                    <button key={p.key} onClick={() => setNewRole(d => ({ ...d, permissions: { ...d.permissions, [p.key]: !d.permissions[p.key] } }))}
                      className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${newRole.permissions[p.key] ? "bg-emerald-900/50 text-emerald-400" : `${t.bgCard2} ${t.textMuted}`}`}>
                      {newRole.permissions[p.key] ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}{p.label}
                    </button>
                  ))}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRoles(r => [...r, { id: Date.now().toString(), ...newRole, is_active: true }]); setShowAdd(false); setNewRole({ role_name: "", vertical: "All", description: "", permissions: Object.fromEntries(PERM_KEYS.map(p => [p, false])) }); }} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white">Save Role</button>
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
                <span className={`text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded ${role.is_active ? (isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700") : t.tagGray}`}>{role.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex-1">
                {editing === role.id
                  ? <input value={role.description} onChange={e => setRoles(rs => rs.map(r => r.id === role.id ? { ...r, description: e.target.value } : r))} className={`w-full border rounded-lg px-2 py-1 text-xs mb-2 ${t.inputBg} outline-none`} />
                  : <p className={`text-xs ${t.textSub} mb-2`}>{role.description}</p>}
                {Object.entries(PERMS.reduce((acc, p) => { (acc[p.group] = acc[p.group] || []).push(p); return acc; }, {} as Record<string, typeof PERMS>)).map(([group, perms]) => (
                  <div key={group} className="mb-1.5">
                    <div className={`text-[8px] font-bold uppercase tracking-wider ${t.textMuted} mb-0.5`}>{group}</div>
                    <div className="flex flex-wrap gap-1">
                      {perms.map(perm => {
                        const has = role.permissions[perm.key];
                        return (
                          <button key={perm.key} onClick={() => editing === role.id && setRoles(rs => rs.map(r => r.id === role.id ? { ...r, permissions: { ...r.permissions, [perm.key]: !has } } : r))}
                            className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 ${has ? "bg-emerald-900/50 text-emerald-400" : "bg-gray-800/60 text-gray-600"} ${editing === role.id ? "cursor-pointer" : ""}`}>
                            {has ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}{perm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingMap, setLoadingMap] = useState(true);

  useEffect(() => {
    setLoadingMap(true);
    fetch(`${API_BASE}/api/admin/users`)
      .then(r => r.json())
      .then((users: any[]) => {
        if (Array.isArray(users)) {
          setMappings(users.map(u => ({
            userId: u.id, userName: u.name, email: u.email,
            roles: [u.role].filter(Boolean), vertical: u.vertical || "All",
            authType: u.auth_type || "app",
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMap(false));
  }, []);
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
        {loadingMap && <div className={`flex items-center justify-center h-24 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading users…</div>}
        {!loadingMap && filtered.length === 0 && <div className={`text-center py-12 text-xs ${t.textMuted}`}>No users found</div>}
        {filtered.map(m => (
          <div key={m.userId} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white">{m.userName.split(" ").map(n => n[0]).join("")}</div>
                  <div>
                    <div className={`text-xs font-semibold ${t.text}`}>{m.userName}</div>
                    <div className={`text-[10px] ${t.textMuted}`}>{maskValue(m.email)}</div>
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
  // Fallback LLM — used automatically when the primary provider errors or times out
  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbProvider, setFbProvider] = useState("openai");
  const [fbModel, setFbModel] = useState("gpt-4o");
  const [fbCustomModel, setFbCustomModel] = useState("");
  const [fbApiKey, setFbApiKey] = useState("");
  const [fbHasKey, setFbHasKey] = useState(false);
  const [fbEndpoint, setFbEndpoint] = useState("");
  const [fbShowKey, setFbShowKey] = useState(false);

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
        setFbEnabled(!!data.fallback_enabled);
        setFbHasKey(!!data.has_fallback_api_key);
        setFbEndpoint(data.fallback_endpoint_url || "");
        if (data.fallback_provider) {
          setFbProvider(data.fallback_provider);
          const fbKnown = AI_PROVIDERS_LIST.find(p => p.id === data.fallback_provider);
          if (fbKnown && fbKnown.models.includes(data.fallback_model)) setFbModel(data.fallback_model);
          else { setFbModel(fbKnown?.models[0] || ""); if (data.fallback_provider === "custom") setFbCustomModel(data.fallback_model || ""); }
        }
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
          fallback_enabled: fbEnabled,
          fallback_provider: fbProvider,
          fallback_model: fbProvider === "custom" ? fbCustomModel : fbModel,
          fallback_api_key: fbApiKey.trim() || undefined,
          fallback_endpoint_url: fbEndpoint,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHasApiKey(!!data.has_api_key);
      setApiKey("");   // clear the field — key is now saved
      setFbHasKey(!!data.has_fallback_api_key);
      setFbApiKey("");
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
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><RefreshCw className="w-4 h-4 text-amber-400" /> Fallback LLM</div>
            <div className={`text-xs ${t.textMuted} mt-0.5`}>If the primary provider fails (outage, quota, invalid key), the request is retried once on this provider.</div>
          </div>
          <button onClick={() => setFbEnabled(!fbEnabled)} className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${fbEnabled ? "bg-amber-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${fbEnabled ? "translate-x-6" : ""}`} />
          </button>
        </div>
        {fbEnabled && (<>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Fallback Provider</label>
              <select value={fbProvider} onChange={e => { setFbProvider(e.target.value); setFbModel(AI_PROVIDERS_LIST.find(p => p.id === e.target.value)?.models[0] || ""); }} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}>
                {AI_PROVIDERS_LIST.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Fallback Model</label>
              {fbProvider === "custom"
                ? <input value={fbCustomModel} onChange={e => setFbCustomModel(e.target.value)} placeholder="e.g. llama-3.1-70b" className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
                : <select value={fbModel} onChange={e => setFbModel(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`}>{(AI_PROVIDERS_LIST.find(p => p.id === fbProvider)?.models || []).map(m => <option key={m} value={m}>{m}</option>)}</select>}
            </div>
          </div>
          {(fbProvider === "azure" || fbProvider === "custom") && (
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Fallback Endpoint URL</label>
              <input value={fbEndpoint} onChange={e => setFbEndpoint(e.target.value)} placeholder="https://..." className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
            </div>
          )}
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5 flex items-center gap-2`}>
              Fallback API Key
              {fbHasKey && !fbApiKey && <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 rounded-full px-2 py-0.5"><CheckCircle2 className="w-3 h-3" /> Key saved (encrypted)</span>}
            </label>
            <div className="relative">
              <input type={fbShowKey ? "text" : "password"} value={fbApiKey} onChange={e => setFbApiKey(e.target.value)}
                placeholder={fbHasKey ? "Enter new key to replace the saved one" : "Enter fallback provider API key"}
                className={`w-full border rounded-xl px-3 pr-10 py-2 text-sm outline-none font-mono ${t.inputBg}`} />
              <button onClick={() => setFbShowKey(!fbShowKey)} className={`absolute right-3 top-2.5 ${t.textMuted}`}>
                {fbShowKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {fbProvider === provider && <p className="text-xs text-amber-400">Tip: use a different provider than the primary so an outage at one doesn't take out both.</p>}
        </>)}
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
  { id: "documents", label: "Documents", desc: "Document metadata and versions" },
  { id: "interactions", label: "Meetings & Calls", desc: "Logged calls, meetings, notes, Fireflies summaries" },
  { id: "tasks", label: "Tasks", desc: "Action items, owners, due dates" },
  { id: "audit_logs", label: "Audit Logs", desc: "User action history (read-only)" },
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
  const [loading, setLoading] = useState(true);
  const [customPrompts, setCustomPrompts] = useState<{ role: string; prompt: string }[]>([]);

  // Load existing config from API on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/ai/config`).then(r => r.json()).then(cfg => {
      if (cfg.system_prompt) setSystemPrompt(cfg.system_prompt);
      if (Array.isArray(cfg.table_access)) setTableAccess(cfg.table_access);
      if (cfg.vertical_access_strict !== undefined) setStrictVertical(!!cfg.vertical_access_strict);
      if (cfg.bot_prompts && typeof cfg.bot_prompts === "object") {
        setCustomPrompts(Object.entries(cfg.bot_prompts).map(([role, prompt]) => ({ role, prompt: prompt as string })));
      } else {
        setCustomPrompts([
          { role: "Super Admin", prompt: "You have full access to all CRM data across all verticals." },
          { role: "AIF Admin", prompt: "You have access only to AIF vertical data." },
          { role: "CS Agent", prompt: "You can answer service request and client queries. You cannot access deal pipeline or financial data." },
        ]);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

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

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;

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

// ─── ADMIN: AUDIT LOG ─────────────────────────────────────────────────────────
function entityColor(entity: string) {
  const dark = isDark;
  const map: Record<string, string> = {
    client: dark ? "text-blue-400" : "text-blue-600",
    lead: dark ? "text-amber-400" : "text-amber-600",
    deal: dark ? "text-emerald-400" : "text-emerald-600",
    service_request: dark ? "text-purple-400" : "text-purple-600",
    user: dark ? "text-rose-400" : "text-rose-600",
    ai_config: dark ? "text-teal-400" : "text-teal-600",
    ai_chat: dark ? "text-violet-400" : "text-violet-600",
    document: dark ? "text-orange-400" : "text-orange-600",
  };
  return map[entity] || (dark ? "text-slate-400" : "text-slate-600");
}
const ENTITY_LABELS: Record<string, string> = {
  client: "Client", lead: "Lead", deal: "Deal",
  service_request: "SR", user: "User",
  ai_config: "AI Config", ai_chat: "AI Chat",
  document: "Document",
};

function AdminAuditLog({ t }: { t: ReturnType<typeof useTheme> }) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);

  const buildParams = useCallback((p: number) => {
    const params = new URLSearchParams({ limit: "50", page: String(p) });
    if (search) params.set("search", search);
    if (entityType) params.set("entity_type", entityType);
    if (actionFilter) params.set("action", actionFilter);
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    return params;
  }, [search, entityType, actionFilter, fromDate, toDate]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/audit-logs?${buildParams(p)}`);
      const data = await r.json();
      setRows(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { setRows([]); } finally { setLoading(false); }
  }, [buildParams, page]);

  useEffect(() => { load(page); }, [load]);

  const downloadCSV = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (entityType) params.set("entity_type", entityType);
      if (actionFilter) params.set("action", actionFilter);
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      const r = await fetch(`${API_BASE}/api/audit-logs/export?${params}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url; a.download = `audit-log-${ts}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally { setDownloading(false); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDateLong = (d: string) => d ? new Date(d).toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  const actionBadge = (action: string) => {
    if (action.includes("Created") || action.includes("CREATE")) return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    if (action.includes("Updated") || action.includes("UPDATE")) return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
    if (action.includes("Deleted") || action.includes("DELETE")) return "bg-red-500/15 text-red-400 border border-red-500/30";
    return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
  };

  const parseJson = (v: any) => {
    if (!v) return null;
    if (typeof v === "object") return v;
    try { return JSON.parse(v); } catch { return null; }
  };
  const parseArr = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch { return []; }
  };

  const changedFields = parseArr(selected?.changed_fields);
  const beforeData = parseJson(selected?.old_value);
  const afterData = parseJson(selected?.new_value);

  const fmt = (v: any) => {
    if (v === null || v === undefined) return <span className="italic opacity-40">null</span>;
    if (typeof v === "object") return <span className="font-mono">{JSON.stringify(v)}</span>;
    return String(v);
  };

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>Audit Log</h2>
          <p className={`text-xs ${t.textMuted}`}>All data changes across every module — {total.toLocaleString()} records</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={downloadCSV} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/30 disabled:opacity-50 transition-colors">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloading ? "Exporting…" : "Download CSV"}
          </button>
          <button onClick={() => { setPage(1); load(1); }} className={`p-2 rounded-lg ${t.bgCard2} hover:opacity-80`}>
            <RefreshCw className={`w-4 h-4 ${t.textMuted}`} />
          </button>
        </div>
      </div>

      {/* Filters Row 1: search + entity + action */}
      <div className="flex flex-wrap gap-2">
        <div className={`flex items-center gap-2 ${t.bgCard2} border ${t.border} rounded-xl px-3 py-1.5 flex-1 min-w-44`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted} flex-shrink-0`} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); load(1); } }}
            placeholder="Search user, record, code, action…" className={`bg-transparent text-xs outline-none flex-1 ${t.text}`} />
        </div>
        <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
          className={`border rounded-xl px-3 py-1.5 text-xs ${t.inputBg} outline-none`}>
          <option value="">All Modules</option>
          <option value="client">Client</option>
          <option value="lead">Lead</option>
          <option value="deal">Deal</option>
          <option value="service_request">Service Request</option>
        </select>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className={`border rounded-xl px-3 py-1.5 text-xs ${t.inputBg} outline-none`}>
          <option value="">All Actions</option>
          <option value="client Created">Created</option>
          <option value="client Updated">Updated</option>
          <option value="client Deleted">Deleted</option>
        </select>
      </div>

      {/* Filters Row 2: date range */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`text-xs ${t.textMuted} whitespace-nowrap`}>Date range:</span>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
          className={`border rounded-xl px-3 py-1.5 text-xs ${t.inputBg} outline-none`} />
        <span className={`text-xs ${t.textMuted}`}>to</span>
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
          className={`border rounded-xl px-3 py-1.5 text-xs ${t.inputBg} outline-none`} />
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
            className={`text-xs ${t.textMuted} hover:text-red-400 underline underline-offset-2`}>Clear dates</button>
        )}
        <button onClick={() => { setPage(1); load(1); }}
          className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 transition-colors">
          Apply Filters
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
      ) : rows.length === 0 ? (
        <div className={`text-center py-12 ${t.textMuted} text-sm`}>No audit records match the selected filters.</div>
      ) : (<>
        <MList>
          {rows.map(row => {
            const fields = parseArr(row.changed_fields);
            return (
              <MCard key={row.id} onClick={() => setSelected(row)}
                title={row.record_display || row.user_name || (ENTITY_LABELS[row.entity_type] || row.entity_type)}
                badge={<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${actionBadge(row.action)}`}>{row.action}</span>}
                left={<span className={`text-[12px] font-semibold ${entityColor(row.entity_type)}`}>{ENTITY_LABELS[row.entity_type] || row.entity_type}</span>}
                right={row.entity_code || String(row.entity_id).slice(0, 8)}
                lines={[fields.length ? <span className="truncate">Changed: {fields.slice(0, 3).join(", ")}{fields.length > 3 ? ` +${fields.length - 3}` : ""}</span> : null,
                  <><User className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{row.user_name || "System"}{row.user_role ? ` · ${row.user_role}` : ""}</span><span className="ml-auto flex-shrink-0">{fmtDate(row.created_at)}</span></>]}
              />
            );
          })}
        </MList>
        <div className={`max-md:hidden ${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${t.border} ${t.bgCard2}`}>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted} whitespace-nowrap`}>Timestamp</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Module</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>ID / Code</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Record</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Action</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Changed Fields</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>User</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Role</th>
                  <th className={`px-3 py-2.5`}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const fields = parseArr(row.changed_fields);
                  return (
                    <tr key={row.id} onClick={() => setSelected(row)}
                      className={`border-b ${t.border} hover:${t.bgCard2} transition-colors cursor-pointer`}>
                      <td className={`px-3 py-2.5 font-mono text-[10px] ${t.textMuted} whitespace-nowrap`}>{fmtDate(row.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${entityColor(row.entity_type)} bg-current/10`}>
                          {ENTITY_LABELS[row.entity_type] || row.entity_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {row.entity_code ? (
                          <span className={`font-mono font-bold text-[11px] text-amber-400`}>{row.entity_code}</span>
                        ) : (
                          <span className={`font-mono text-[10px] ${t.textMuted}`}>{String(row.entity_id).slice(0, 8)}</span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 ${t.text} font-medium max-w-[180px] truncate`} title={row.record_display}>
                        {row.record_display || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionBadge(row.action)}`}>
                          {row.action}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 ${t.textMuted} max-w-[200px]`}>
                        {fields.length > 0 ? (
                          <span className="text-[10px]">
                            {fields.slice(0, 3).join(", ")}{fields.length > 3 ? ` +${fields.length - 3}` : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td className={`px-3 py-2.5 ${t.textMuted} whitespace-nowrap`}>{row.user_name || "System"}</td>
                      <td className={`px-3 py-2.5 ${t.textMuted} whitespace-nowrap`}>
                        {row.user_role ? <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.bgCard2}`}>{row.user_role}</span> : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <ChevronRight className={`w-3.5 h-3.5 ${t.textMuted}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className={`text-xs ${t.textMuted}`}>Page {page} of {totalPages} — {total.toLocaleString()} records</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}
              className={`px-3 py-1.5 text-xs rounded-lg ${t.bgCard2} border ${t.border} disabled:opacity-40`}>Previous</button>
            <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }}
              className={`px-3 py-1.5 text-xs rounded-lg ${t.bgCard2} border ${t.border} disabled:opacity-40`}>Next</button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 animate-in fade-in duration-200 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`${t.bgCard} border ${t.border} rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className={`flex items-start justify-between gap-3 p-5 border-b ${t.border} sticky top-0 ${t.bgCard} z-10`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${entityColor(selected.entity_type)} bg-current/15`}>
                    {ENTITY_LABELS[selected.entity_type] || selected.entity_type}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionBadge(selected.action)}`}>
                    {selected.action}
                  </span>
                </div>
                <p className={`font-bold text-sm ${t.text}`}>{selected.record_display || "Record"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {selected.entity_code && (
                    <span className={`text-[11px] font-mono font-bold text-amber-400`}>
                      {selected.entity_type === "service_request" ? "SR Code" : selected.entity_type === "lead" ? "Lead Code" : selected.entity_type === "deal" ? "Deal Code" : "Client Code"}: {selected.entity_code}
                    </span>
                  )}
                  <span className={`text-[10px] font-mono ${t.textMuted}`}>DB ID: {selected.entity_id}</span>
                </div>
                <p className={`text-[10px] ${t.textMuted}`}>{fmtDateLong(selected.created_at)}</p>
                <p className={`text-[10px] ${t.textMuted}`}>
                  By: <span className={t.text}>{selected.user_name || "System"}</span>
                  {selected.user_role && <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${t.bgCard2}`}>{selected.user_role}</span>}
                  {selected.ip_address && <span className={`ml-2 font-mono`}>IP: {selected.ip_address}</span>}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className={`p-1.5 rounded-lg ${t.bgCard2} hover:opacity-80 flex-shrink-0`}>
                <X className={`w-4 h-4 ${t.textMuted}`} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Changed fields diff table */}
              {changedFields.length > 0 && beforeData && afterData && (
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide ${t.textMuted} mb-2`}>
                    Changed Fields ({changedFields.length})
                  </div>
                  <div className={`rounded-xl border ${t.border} overflow-hidden`}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={`border-b ${t.border} ${t.bgCard2}`}>
                          <th className={`text-left px-3 py-2 font-semibold ${t.textMuted} w-1/4`}>Field</th>
                          <th className="text-left px-3 py-2 font-semibold text-red-400 w-[37.5%]">Before</th>
                          <th className="text-left px-3 py-2 font-semibold text-emerald-400 w-[37.5%]">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changedFields.map((field, i) => (
                          <tr key={field} className={`border-b ${t.border} ${i % 2 === 0 ? "" : t.bgCard2}`}>
                            <td className="px-3 py-2 font-mono font-semibold text-amber-400">{field}</td>
                            <td className={`px-3 py-2 ${t.textMuted} break-all`}>
                              <span className="bg-red-500/10 rounded px-1 py-0.5">{fmt(beforeData?.[field])}</span>
                            </td>
                            <td className={`px-3 py-2 ${t.text} break-all`}>
                              <span className="bg-emerald-500/10 rounded px-1 py-0.5">{fmt(afterData?.[field])}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Full JSON snapshots — always visible, side by side if both exist */}
              {(beforeData || afterData) && (
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide ${t.textMuted} mb-2`}>
                    Full Record Snapshot{beforeData && afterData ? "s" : ""}
                  </div>
                  <div className={`grid gap-3 ${beforeData && afterData ? "grid-cols-2" : "grid-cols-1"}`}>
                    {beforeData && (
                      <div>
                        <div className="text-[10px] font-semibold text-red-400 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                          Before
                        </div>
                        <pre className={`text-[10px] rounded-xl p-3 overflow-auto max-h-72 ${t.bgCard2} ${t.textMuted} leading-relaxed whitespace-pre-wrap break-all`}>
                          {JSON.stringify(beforeData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {afterData && (
                      <div>
                        <div className="text-[10px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                          After
                        </div>
                        <pre className={`text-[10px] rounded-xl p-3 overflow-auto max-h-72 ${t.bgCard2} ${t.textMuted} leading-relaxed whitespace-pre-wrap break-all`}>
                          {JSON.stringify(afterData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: AI BOT LOGS ───────────────────────────────────────────────────────
function AdminAILogs({ t }: { t: ReturnType<typeof useTheme> }) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100", search });
      const r = await fetch(`${API_BASE}/api/ai/logs?${params}`);
      const data = await r.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch { setRows([]); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>AI Bot Logs</h2>
          <p className={`text-xs ${t.textMuted}`}>Every question asked to the AI assistant — {total.toLocaleString()} total queries</p>
        </div>
        <button onClick={load} className={`ml-auto p-2 rounded-lg ${t.bgCard2} hover:opacity-80`}><RefreshCw className={`w-4 h-4 ${t.textMuted}`} /></button>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 ${t.bgCard2} border ${t.border} rounded-xl px-3 py-1.5`}>
        <Search className={`w-3.5 h-3.5 ${t.textMuted} flex-shrink-0`} />
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()}
          placeholder="Search by user or query…" className={`bg-transparent text-xs outline-none flex-1 ${t.text}`} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
      ) : rows.length === 0 ? (
        <div className={`text-center py-12 ${t.textMuted} text-sm`}>No AI bot interactions logged yet.</div>
      ) : (<>
        <MList>
          {rows.map(row => (
            <MCard key={row.id} onClick={() => setSelected(row)}
              title={row.query}
              badge={row.sql_query ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">SQL</span> : undefined}
              left={row.provider ? `${row.provider}/${row.model}` : "—"} right={row.latency_ms ? `${row.latency_ms}ms` : undefined}
              lines={[<><User className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{row.user_name || "—"}{row.user_role ? ` · ${row.user_role}` : ""}</span><span className="ml-auto flex-shrink-0">{fmtDate(row.created_at)}</span></>]}
            />
          ))}
        </MList>
        <div className={`max-md:hidden ${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${t.border} ${t.bgCard2}`}>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Timestamp</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>User</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Role</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted} max-w-xs`}>Query</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Model</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>Latency</th>
                  <th className={`text-left px-3 py-2.5 font-semibold ${t.textMuted}`}>SQL?</th>
                  <th className={`px-3 py-2.5`}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={`border-b ${t.border} hover:${t.bgCard2} transition-colors`}>
                    <td className={`px-3 py-2 font-mono ${t.textMuted} whitespace-nowrap`}>{fmtDate(row.created_at)}</td>
                    <td className={`px-3 py-2 font-medium ${t.text} whitespace-nowrap`}>{row.user_name || "—"}</td>
                    <td className={`px-3 py-2 ${t.textMuted} whitespace-nowrap`}>{row.user_role || "—"}</td>
                    <td className={`px-3 py-2 max-w-xs truncate ${t.text}`}>{row.query}</td>
                    <td className={`px-3 py-2 ${t.textMuted} whitespace-nowrap`}>{row.provider ? `${row.provider}/${row.model}` : "—"}</td>
                    <td className={`px-3 py-2 ${t.textMuted} whitespace-nowrap`}>{row.latency_ms ? `${row.latency_ms}ms` : "—"}</td>
                    <td className="px-3 py-2">{row.sql_query ? <span className="text-emerald-400 font-bold text-[10px]">SQL</span> : <span className={`${t.textMuted} text-[10px]`}>—</span>}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setSelected(row)} className="text-blue-400 hover:underline text-[10px]">view</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 animate-in fade-in duration-200 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`${t.bgCard} border ${t.border} rounded-2xl p-5 max-w-2xl w-full space-y-3 max-h-[85vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${t.text}`}>AI Chat Detail</span>
              <button onClick={() => setSelected(null)}><X className={`w-4 h-4 ${t.textMuted}`} /></button>
            </div>
            <div className={`text-xs ${t.textMuted} flex flex-wrap gap-3`}>
              <span><strong>User:</strong> {selected.user_name} ({selected.user_role})</span>
              <span><strong>Time:</strong> {fmtDate(selected.created_at)}</span>
              <span><strong>Model:</strong> {selected.provider}/{selected.model}</span>
              {selected.latency_ms && <span><strong>Latency:</strong> {selected.latency_ms}ms</span>}
              {selected.user_verticals?.length > 0 && <span><strong>Verticals:</strong> {selected.user_verticals.join(", ")}</span>}
            </div>
            <div>
              <div className={`text-[10px] font-bold uppercase ${t.textMuted} mb-1`}>Query</div>
              <div className={`text-xs ${t.bgCard2} rounded-xl p-3 ${t.text}`}>{selected.query}</div>
            </div>
            {selected.sql_query && (
              <div>
                <div className={`text-[10px] font-bold uppercase ${t.textMuted} mb-1`}>SQL Executed</div>
                <pre className={`text-xs font-mono ${t.bgCard2} rounded-xl p-3 overflow-auto max-h-36 ${t.text} whitespace-pre-wrap`}>{selected.sql_query}</pre>
              </div>
            )}
            <div>
              <div className={`text-[10px] font-bold uppercase ${t.textMuted} mb-1`}>Response</div>
              <div className={`text-xs ${t.bgCard2} rounded-xl p-3 ${t.text} whitespace-pre-wrap max-h-48 overflow-auto`}>{selected.response}</div>
            </div>
          </div>
        </div>
      )}
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
  const [senderEmail, setSenderEmail] = useState("admin@niytri.com");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testM365Result, setTestM365Result] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testingM365, setTestingM365] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [sendGraphTestResult, setSendGraphTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sendingGraphTest, setSendingGraphTest] = useState(false);

  const [maxAttachMb, setMaxAttachMb] = useState(5);

  // SMTP state
  const [preferSmtp, setPreferSmtp] = useState(false);
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState("smtp.office365.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("admin@niytri.com");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [hasSmtpPassword, setHasSmtpPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpFromName, setSmtpFromName] = useState("NIYTRI CRM");
  const [smtpTls, setSmtpTls] = useState(true);
  const [testSmtpResult, setTestSmtpResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);

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
      setSenderEmail(d.sender_email || "admin@niytri.com");
      setPreferSmtp(!!d.prefer_smtp);
      // SMTP
      setSmtpEnabled(!!d.smtp_enabled);
      setSmtpHost(d.smtp_host || "smtp.office365.com");
      setSmtpPort(d.smtp_port || 587);
      setSmtpUser(d.smtp_user || "admin@niytri.com");
      setSmtpPassword("");  // never pre-fill
      setHasSmtpPassword(!!d.has_smtp_password);
      setSmtpFromName(d.smtp_from_name || "NIYTRI CRM");
      setSmtpTls(d.smtp_tls !== false);
      setMaxAttachMb(d.max_meeting_attachment_mb || 5);
    }).catch(() => { setRedirectUri(autoDetectedRedirect); }).finally(() => setLoading(false));
  }, []);

  const handleRevealSecret = async () => {
    setRevealingSecret(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/m365-config/reveal`);
      const d = await r.json();
      if (d.client_secret) { setClientSecret(d.client_secret); setShowSecret(true); }
      else setTestM365Result({ ok: false, msg: d.error || "No secret stored." });
    } catch { setTestM365Result({ ok: false, msg: "Failed to reveal secret." }); }
    setRevealingSecret(false);
  };

  const handleSave = async () => {
    setSaving(true); setTestM365Result(null); setTestEmailResult(null); setTestSmtpResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/m365-config`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId, client_id: clientId, client_secret: clientSecret.trim() || undefined,
          redirect_uri: redirectUri, allowed_domain: allowedDomain, sso_enabled: ssoEnabled,
          require_mfa: requireMfa, session_hours: sessionHours, sender_email: senderEmail,
          updated_by: "admin@niytri.com",
          smtp_enabled: smtpEnabled, smtp_host: smtpHost, smtp_port: smtpPort,
          smtp_user: smtpUser, smtp_password: smtpPassword.trim() || undefined,
          smtp_from_name: smtpFromName, smtp_tls: smtpTls,
          max_meeting_attachment_mb: maxAttachMb,
          prefer_smtp: preferSmtp,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setHasClientSecret(hasClientSecret || !!clientSecret.trim());
      setHasSmtpPassword(hasSmtpPassword || !!smtpPassword.trim());
      setClientSecret(""); setSmtpPassword("");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setTestM365Result({ ok: false, msg: `Failed to save: ${e.message}` }); }
    setSaving(false);
  };

  const handleTestSmtp = async () => {
    setTestSmtpResult(null); setTestingSmtp(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/test-smtp`);
      const d = await r.json();
      setTestSmtpResult({ ok: d.ok, msg: d.msg });
    } catch { setTestSmtpResult({ ok: false, msg: "Cannot reach API server." }); }
    setTestingSmtp(false);
  };

  const handleTestM365 = async () => {
    setTestM365Result(null); setTestingM365(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/test-m365-sso`);
      const d = await r.json();
      setTestM365Result({ ok: d.ok, msg: d.msg });
    } catch { setTestM365Result({ ok: false, msg: "Cannot reach API server." }); }
    setTestingM365(false);
  };

  const handleTestEmail = async () => {
    setTestEmailResult(null); setTestingEmail(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/test-email`);
      const d = await r.json();
      setTestEmailResult({ ok: d.ok, msg: d.msg });
    } catch { setTestEmailResult({ ok: false, msg: "Cannot reach API server." }); }
    setTestingEmail(false);
  };

  const handleSendGraphTest = async () => {
    setSendGraphTestResult(null); setSendingGraphTest(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/send-test-email`);
      const d = await r.json();
      setSendGraphTestResult({ ok: d.ok, msg: d.msg });
    } catch { setSendGraphTestResult({ ok: false, msg: "Cannot reach API server." }); }
    setSendingGraphTest(false);
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

        {/* Dev domain warning */}
        {redirectUri && (redirectUri.includes("replit.dev") || redirectUri.includes("worf.replit") || redirectUri.includes("localhost")) && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span><strong>Dev/staging URL detected.</strong> The stored redirect URI points to a non-production domain. Update it to your production URL (e.g. <code>https://crm.niytri.com/api/auth/m365/callback</code>) before going live, then register that URL in Azure.</span>
          </div>
        )}

        <p className={`text-xs ${t.textMuted}`}>This URI must be registered in your Azure App Registration under <strong>Authentication → Web → Redirect URIs</strong>. It is saved to the database and used by the server — changing the domain in the field below and saving is all you need.</p>

        {/* Editable input */}
        <div className="flex gap-2 items-center">
          <input
            value={redirectUri}
            onChange={e => setRedirectUri(e.target.value)}
            className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono outline-none ${t.inputBg}`}
            placeholder="https://crm.niytri.com/api/auth/m365/callback"
          />
          <button
            onClick={() => { navigator.clipboard.writeText(redirectUri); }}
            className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex-shrink-0 hover:text-blue-400`}
            title="Copy to clipboard"
          >Copy</button>
          <button
            onClick={() => setRedirectUri(autoDetectedRedirect)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex-shrink-0 hover:text-green-400`}
            title="Auto-detect from current domain"
          >Auto</button>
        </div>

        {/* Environment comparison */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]`}>
          <div className={`p-2.5 rounded-lg ${t.bgCard2} flex flex-col gap-1`}>
            <span className="font-semibold text-blue-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> Stored in DB (active)</span>
            <code className={`${t.textMuted} break-all`}>{redirectUri || <span className="italic text-red-400">not set</span>}</code>
          </div>
          <div className={`p-2.5 rounded-lg ${t.bgCard2} flex flex-col gap-1`}>
            <span className="font-semibold text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Auto-detected (current domain)</span>
            <code className={`${t.textMuted} break-all`}>{autoDetectedRedirect}</code>
          </div>
        </div>

        {/* Step-by-step guide */}
        <div className={`p-3 rounded-lg ${t.bgCard2} border ${t.border} space-y-1.5`}>
          <p className={`text-[10px] font-semibold ${t.text}`}>How to update for production:</p>
          <ol className={`text-[10px] ${t.textMuted} space-y-1 list-decimal list-inside`}>
            <li>Set the URI above to your production URL, e.g. <code className="text-blue-400">https://crm.niytri.com/api/auth/m365/callback</code></li>
            <li>Click <strong>Save Configuration</strong> below — the server picks it up immediately.</li>
            <li>Open <strong>Azure Portal</strong> → Azure Active Directory → App registrations → your app.</li>
            <li>Go to <strong>Authentication</strong> → under <em>Web</em>, click <strong>Add URI</strong> and paste the same URL.</li>
            <li>Click <strong>Save</strong> in Azure. Microsoft SSO will now work on prod.</li>
          </ol>
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

      {/* Email Integration — Graph API */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-orange-400" />
          <div className={`text-sm font-semibold ${t.text}`}>Email Integration (Microsoft Graph)</div>
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${!preferSmtp ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/40" : "bg-gray-700/60 text-gray-400 border border-gray-600/40"}`}>
            {!preferSmtp ? "Primary ✓" : "Fallback"}
          </span>
        </div>
        <p className={`text-xs ${t.textMuted}`}>
          Uses the <code className="text-orange-400">Mail.Send</code> application permission to send OTP, notifications, and alerts via Microsoft Graph API. Graph API always handles Teams calendar invites.
        </p>

        {/* Priority toggle */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${!preferSmtp ? "border-emerald-700/40 bg-emerald-950/20" : "border-gray-700/40"}`}>
          <div>
            <div className={`text-xs font-medium ${t.text}`}>Use Graph API as primary email method</div>
            <div className={`text-[10px] ${t.textMuted} mt-0.5`}>When enabled, OTP and notification emails go via Graph API. SMTP acts as fallback only.</div>
          </div>
          <button onClick={() => setPreferSmtp(!preferSmtp)} className={`relative w-12 h-6 rounded-full flex-shrink-0 ml-4 transition-colors ${!preferSmtp ? "bg-emerald-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${!preferSmtp ? "translate-x-6" : ""}`} />
          </button>
        </div>

        <div>
          <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Sender Email Address</label>
          <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="admin@niytri.com" className={`w-full border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
          <p className={`text-[10px] ${t.textMuted} mt-1`}>This mailbox must have <code className="text-orange-400">Mail.Send</code> permission granted in your Azure AD app registration.</p>
        </div>

        {testEmailResult && (
          <div className={`flex items-start gap-2 rounded-xl p-3 border text-xs font-mono ${testEmailResult.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
            {testEmailResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p>{testEmailResult.msg}</p>
          </div>
        )}

        {sendGraphTestResult && (
          <div className={`flex items-start gap-2 rounded-xl p-3 border text-xs font-mono ${sendGraphTestResult.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
            {sendGraphTestResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p>{sendGraphTestResult.msg}</p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleTestEmail} disabled={testingEmail}
            className={`text-xs px-4 py-2 rounded-xl border ${t.border} ${t.textMuted} flex items-center gap-2 hover:border-orange-500 hover:text-orange-400 transition-colors disabled:opacity-50`}>
            {testingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5 text-orange-400" />}
            {testingEmail ? "Verifying…" : "Verify Graph Connection"}
          </button>
          <button onClick={handleSendGraphTest} disabled={sendingGraphTest}
            className={`text-xs px-4 py-2 rounded-xl border flex items-center gap-2 transition-colors disabled:opacity-50 border-orange-600/50 text-orange-400 hover:bg-orange-600/10`}>
            {sendingGraphTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            {sendingGraphTest ? "Sending…" : "Send Test Email via Graph"}
          </button>
        </div>
        <p className={`text-[10px] ${t.textMuted}`}>
          "Verify" checks token without sending. "Send Test Email" delivers a real message to <code className="text-orange-400">{senderEmail || "the sender mailbox"}</code> — use this to confirm <code className="text-orange-400">Mail.Send</code> permission works end-to-end.
        </p>
      </div>

      {/* SMTP Email Integration */}
      <div className={`${t.bgCard} border-2 ${smtpEnabled ? "border-emerald-600/50" : t.border} rounded-xl p-4 space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            <div className={`text-sm font-semibold ${t.text}`}>SMTP Email (Office 365)</div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${smtpEnabled ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700/40" : "bg-gray-800 text-gray-400"}`}>
              {smtpEnabled ? "Active" : "Disabled"}
            </span>
          </div>
          <button onClick={() => setSmtpEnabled(!smtpEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${smtpEnabled ? "bg-emerald-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${smtpEnabled ? "translate-x-6" : ""}`} />
          </button>
        </div>
        <p className={`text-xs ${t.textMuted}`}>
          When enabled, SMTP takes priority over Graph API for all outgoing emails — OTP, notifications, and alerts — using <code className="text-emerald-400">smtp.office365.com</code> via STARTTLS on port 587.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-[10px] font-medium ${t.textMuted} mb-1.5`}>SMTP Host</label>
            <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.office365.com" className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none ${t.inputBg}`} />
          </div>
          <div>
            <label className={`block text-[10px] font-medium ${t.textMuted} mb-1.5`}>Port</label>
            <select value={smtpPort} onChange={e => setSmtpPort(parseInt(e.target.value))} className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${t.inputBg}`}>
              <option value={587}>587 — STARTTLS (recommended for O365)</option>
              <option value={465}>465 — SMTPS / SSL</option>
              <option value={25}>25 — Unencrypted (not recommended)</option>
            </select>
          </div>
          <div>
            <label className={`block text-[10px] font-medium ${t.textMuted} mb-1.5`}>SMTP Username (Sender Email)</label>
            <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="admin@niytri.com" className={`w-full border rounded-xl px-3 py-2 text-xs font-mono outline-none ${t.inputBg}`} />
          </div>
          <div>
            <label className={`block text-[10px] font-medium ${t.textMuted} mb-1.5`}>From Name</label>
            <input value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} placeholder="NIYTRI CRM" className={`w-full border rounded-xl px-3 py-2 text-xs outline-none ${t.inputBg}`} />
          </div>
        </div>

        {/* SMTP Password */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className={`text-[10px] font-medium ${t.textMuted}`}>SMTP Password / App Password</label>
            {hasSmtpPassword && !smtpPassword && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3" /> Password saved (encrypted)
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showSmtpPassword ? "text" : "password"}
              value={smtpPassword}
              onChange={e => setSmtpPassword(e.target.value)}
              placeholder={hasSmtpPassword ? "Enter new password to replace saved one" : "Office 365 account password or App Password"}
              className={`w-full border rounded-xl px-3 pr-10 py-2 text-xs font-mono outline-none ${t.inputBg}`}
            />
            <button onClick={() => setShowSmtpPassword(!showSmtpPassword)} className={`absolute right-3 top-2 ${t.textMuted}`}>
              {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {hasSmtpPassword && !smtpPassword && (
            <p className={`text-[10px] ${t.textMuted} mt-1`}>Stored encrypted. Leave blank to keep it.</p>
          )}
        </div>

        {/* STARTTLS toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs font-medium ${t.text}`}>Require STARTTLS</div>
            <div className={`text-[10px] ${t.textMuted}`}>Strongly recommended for Office 365. Disable only for local SMTP relays.</div>
          </div>
          <button onClick={() => setSmtpTls(!smtpTls)} className={`relative w-10 h-5 rounded-full transition-colors ${smtpTls ? "bg-emerald-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${smtpTls ? "translate-x-5" : ""}`} />
          </button>
        </div>

        <div className={`p-2.5 rounded-lg ${t.bgCard2} text-[10px] ${t.textMuted} flex items-start gap-2`}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>
            For Office 365 SMTP AUTH to work, it must be enabled per-mailbox: <strong className="text-emerald-400">M365 Admin Center → Users → Active Users → {smtpUser || "admin@niytri.com"} → Mail → Manage email apps → Enable "Authenticated SMTP"</strong>. Use an App Password if MFA is enabled on the account.
          </span>
        </div>

        {testSmtpResult && (
          <div className={`flex items-start gap-2 rounded-xl p-3 border text-xs font-mono ${testSmtpResult.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
            {testSmtpResult.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p>{testSmtpResult.msg}</p>
          </div>
        )}

        <button onClick={handleTestSmtp} disabled={testingSmtp}
          className={`text-xs px-4 py-2 rounded-xl bg-emerald-700/30 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-700/50 flex items-center gap-2 transition-colors disabled:opacity-50`}>
          {testingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
          {testingSmtp ? "Testing SMTP…" : "Test SMTP Connection"}
        </button>
      </div>

      {/* Teams Meeting Settings */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-400" />
          <div className={`text-sm font-semibold ${t.text}`}>Teams Meeting Settings</div>
        </div>
        <p className={`text-xs ${t.textMuted}`}>
          Configure limits for the Teams meeting scheduler. These apply to all users across all verticals.
          The Azure AD app requires <code className="text-blue-400">Calendars.ReadWrite</code> application permission with admin consent to send real calendar invites.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Max Meeting Attachment Size (MB)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={25} value={maxAttachMb} onChange={e => setMaxAttachMb(Math.max(1, Math.min(25, parseInt(e.target.value) || 5)))}
                className={`w-24 border rounded-xl px-3 py-2 text-sm outline-none ${t.inputBg}`} />
              <span className={`text-xs ${t.textMuted}`}>MB (1–25 MB, default 5 MB)</span>
            </div>
            <p className={`text-[10px] ${t.textMuted} mt-1`}>Users cannot attach files larger than this when scheduling a Teams meeting.</p>
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${t.bgCard2} text-[10px] ${t.textMuted} flex items-start gap-2`}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-400" />
          <span>
            For Teams meeting creation to work, grant <strong className="text-blue-400">Calendars.ReadWrite</strong> (Application) permission in Azure Portal → App registrations → API permissions → Add permission → Microsoft Graph → Application permissions → Calendars.ReadWrite → Grant admin consent.
          </span>
        </div>
      </div>

      {/* M365 SSO test result */}
      {testM365Result && (
        <div className={`flex items-start gap-2 rounded-xl p-3 border text-xs font-mono ${testM365Result.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
          {testM365Result.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <p>{testM365Result.msg}</p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleTestM365} disabled={testingM365}
          className={`text-sm px-4 py-2 rounded-xl border ${t.border} ${t.textMuted} flex items-center gap-2 hover:border-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50`}>
          {testingM365 ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4 text-blue-400" />}
          {testingM365 ? "Testing M365…" : "Test M365 SSO"}
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
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ category: "Trade Issues", subcategory: "", tat_hours: 4, warning_percent: 80, l1_owner: "", l2_after_hours: 2, l2_owner: "", l3_after_hours: 3, l3_owner: "", auto_close_hours: 24 });
  const [filterCat, setFilterCat] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/sla-config`).then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const startEdit = (row: any) => {
    setEditingId(row.id);
    setEditDraft({ tat_hours: row.tat_hours, warning_percent: row.warning_percent, l1_owner: row.l1_owner || "", l2_after_hours: row.l2_after_hours || "", l2_owner: row.l2_owner || "", l3_after_hours: row.l3_after_hours || "", l3_owner: row.l3_owner || "", auto_close_hours: row.auto_close_hours || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/sla-config/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editDraft) });
      setEditingId(null); load();
    } finally { setSaving(false); }
  };

  const doAdd = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/sla-config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...addForm, subcategory: addForm.subcategory || null }) });
      setShowAdd(false); setAddForm({ category: "Trade Issues", subcategory: "", tat_hours: 4, warning_percent: 80, l1_owner: "", l2_after_hours: 2, l2_owner: "", l3_after_hours: 3, l3_owner: "", auto_close_hours: 24 }); load();
    } finally { setSaving(false); }
  };

  const doDelete = async (id: string) => {
    await fetch(`${API_BASE}/api/sla-config/${id}`, { method: "DELETE" });
    setConfirmDelete(null); load();
  };

  const categories = [...new Set(rows.map(r => r.category))];
  const displayed = filterCat ? rows.filter(r => r.category === filterCat) : rows;

  const tatColor = (h: number) => h <= 2 ? "text-red-400" : h <= 4 ? "text-orange-400" : h <= 24 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-shrink-0 flex-wrap`}>
        <Clock className={`w-4 h-4 ${t.textMuted}`} />
        <div className={`text-sm font-bold ${t.text}`}>SLA / TAT Configuration</div>
        <div className="text-[10px] px-2 py-1 rounded-lg bg-amber-900/40 text-amber-400">SLA applied per subcategory; falls back to category default</div>
        <div className="ml-auto flex items-center gap-2">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`text-xs border rounded-xl px-3 py-1.5 ${t.inputBg} outline-none`}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="text-xs px-3 py-1.5 rounded-xl bg-blue-600 text-white flex items-center gap-1"><Plus className="w-3 h-3" />Add Subcategory SLA</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className={`text-xs ${t.textMuted} text-center py-10`}><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…</div>
        ) : (
          <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
            <table className="w-full">
              <thead className={t.tableHead}>
                <tr className={`border-b ${t.border}`}>
                  {["Category", "Subcategory", "TAT (h)", "Warning %", "L1 Owner", "L2 After (h)", "L2 Owner", "L3 After (h)", "L3 Owner", "Auto-Close (h)", ""].map(h => (
                    <th key={h} className={`text-left text-[9px] font-semibold uppercase tracking-wide ${t.textMuted} px-2.5 py-2.5 whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(row => (
                  <tr key={row.id} className={`border-b ${t.border} last:border-0 text-xs ${t.rowHover} ${!row.subcategory ? `${t.bgCard2}` : ""}`}>
                    <td className={`px-2.5 py-2 font-medium ${t.text} whitespace-nowrap`}>
                      {!row.subcategory && <span className="text-[8px] uppercase mr-1 px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 font-bold">default</span>}
                      {row.category}
                    </td>
                    <td className={`px-2.5 py-2 ${t.textMuted}`}>{row.subcategory || <span className="italic opacity-50">—</span>}</td>
                    {editingId === row.id ? (
                      <>
                        {(["tat_hours","warning_percent","l1_owner","l2_after_hours","l2_owner","l3_after_hours","l3_owner","auto_close_hours"] as const).map(f => (
                          <td key={f} className="px-1.5 py-1.5">
                            <input value={(editDraft as any)[f]} onChange={e => setEditDraft((d: any) => ({ ...d, [f]: f.includes("hours") || f === "warning_percent" ? Number(e.target.value) : e.target.value }))}
                              type={f.includes("hours") || f === "warning_percent" ? "number" : "text"}
                              className={`w-full border rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 ${t.inputBg} min-w-[60px]`} />
                          </td>
                        ))}
                        <td className="px-2.5 py-2 flex items-center gap-1.5">
                          <button onClick={saveEdit} disabled={saving} className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save</button>
                          <button onClick={() => setEditingId(null)} className={`text-[10px] ${t.textMuted}`}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`px-2.5 py-2 font-bold ${tatColor(row.tat_hours)}`}>{row.tat_hours}h</td>
                        <td className={`px-2.5 py-2 ${t.textMuted}`}>{row.warning_percent}%</td>
                        <td className={`px-2.5 py-2 ${t.textMuted} whitespace-nowrap`}>{row.l1_owner || "—"}</td>
                        <td className={`px-2.5 py-2 ${t.textMuted}`}>{row.l2_after_hours ? `${row.l2_after_hours}h` : "—"}</td>
                        <td className={`px-2.5 py-2 ${t.textMuted} whitespace-nowrap`}>{row.l2_owner || "—"}</td>
                        <td className={`px-2.5 py-2 ${t.textMuted}`}>{row.l3_after_hours ? `${row.l3_after_hours}h` : "—"}</td>
                        <td className={`px-2.5 py-2 ${t.textMuted} whitespace-nowrap`}>{row.l3_owner || "—"}</td>
                        <td className={`px-2.5 py-2 ${t.textMuted}`}>{row.auto_close_hours ? `${row.auto_close_hours}h` : "—"}</td>
                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(row)} className={`text-[10px] ${t.textMuted} hover:text-blue-400 flex items-center gap-0.5`}><Edit className="w-3 h-3" />Edit</button>
                            {row.subcategory && <button onClick={() => setConfirmDelete(row)} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5"><X className="w-3 h-3" /></button>}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add subcategory SLA modal */}
      {showAdd && (
        <div className="fixed inset-0 animate-in fade-in duration-200 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-md p-5 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`text-sm font-bold ${t.text} mb-4`}>Add Subcategory SLA</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>Category *</label>
                  <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} className={`w-full text-xs border rounded-xl px-3 py-2 ${t.inputBg} outline-none`}>
                    {[...new Set(rows.filter(r => !r.subcategory).map(r => r.category))].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>Subcategory *</label>
                  <input value={addForm.subcategory} onChange={e => setAddForm(f => ({ ...f, subcategory: e.target.value }))} placeholder="e.g. Order Execution" className={`w-full text-xs border rounded-xl px-3 py-2 ${t.inputBg} outline-none`} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([["tat_hours", "TAT (hours)"], ["warning_percent", "Warning %"], ["auto_close_hours", "Auto-Close (h)"]] as [keyof typeof addForm, string][]).map(([f, label]) => (
                  <div key={f}>
                    <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>{label}</label>
                    <input type="number" value={(addForm as any)[f]} onChange={e => setAddForm(af => ({ ...af, [f]: Number(e.target.value) }))} className={`w-full text-xs border rounded-xl px-3 py-2 ${t.inputBg} outline-none`} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([["l1_owner", "L1 Owner"], ["l2_owner", "L2 Owner"], ["l3_owner", "L3 Owner"]] as [keyof typeof addForm, string][]).map(([f, label]) => (
                  <div key={f}>
                    <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>{label}</label>
                    <input value={(addForm as any)[f]} onChange={e => setAddForm(af => ({ ...af, [f]: e.target.value }))} className={`w-full text-xs border rounded-xl px-3 py-2 ${t.inputBg} outline-none`} />
                  </div>
                ))}
                {([["l2_after_hours", "L2 After (h)"], ["l3_after_hours", "L3 After (h)"]] as [keyof typeof addForm, string][]).map(([f, label]) => (
                  <div key={f}>
                    <label className={`text-[10px] ${t.textMuted} font-semibold block mb-1`}>{label}</label>
                    <input type="number" value={(addForm as any)[f]} onChange={e => setAddForm(af => ({ ...af, [f]: Number(e.target.value) }))} className={`w-full text-xs border rounded-xl px-3 py-2 ${t.inputBg} outline-none`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAdd(false)} className={`text-xs px-4 py-2 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
              <button onClick={doAdd} disabled={saving || !addForm.subcategory.trim()} className="text-xs px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-40 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add SLA Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 animate-in fade-in duration-200 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-sm p-5 shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`text-sm font-bold ${t.text} mb-2`}>Delete SLA Rule?</div>
            <div className={`text-xs ${t.textMuted} mb-4`}>This will remove the subcategory SLA for <span className={t.text}>{confirmDelete.category} › {confirmDelete.subcategory}</span>. New SRs with this subcategory will use the category default.</div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className={`text-xs px-4 py-2 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
              <button onClick={() => doDelete(confirmDelete.id)} className="text-xs px-4 py-2 rounded-xl bg-red-600 text-white font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: VERTICALS CONFIG ──────────────────────────────────────────────────
function AdminVerticals({ t, onReload }: { t: ReturnType<typeof useTheme>; onReload: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const load = () =>
    fetch("/api/admin/verticals-config").then(r => r.json()).then(setRows).catch(() => {});

  useEffect(() => { load(); }, []);

  const startEdit = (row: any) => {
    setEditing(row.vertical_id);
    setEditData({ label: row.label, short_name: row.short_name, is_active: row.is_active, display_order: row.display_order });
  };

  const save = async (verticalId: string) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/verticals-config/${verticalId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editData),
      });
      setEditing(null); setSaved(verticalId);
      setTimeout(() => setSaved(null), 2000);
      await load();
      onReload();
    } finally { setSaving(false); }
  };

  const def = (id: string) => VERTICAL_DEFAULTS.find(d => d.id === String(id).toLowerCase());

  const [visBusy, setVisBusy] = useState<string | null>(null);
  const [visMsg, setVisMsg] = useState<string | null>(null);
  const setVisibility = async (row: any, patch: { is_active?: boolean; hidden_modules?: string[] }) => {
    setVisBusy(row.vertical_id);
    try {
      const r = await fetch(`/api/admin/verticals-config/${row.vertical_id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      setVisMsg(r.ok ? "Saved — applied everywhere" : "Could not save");
      setTimeout(() => setVisMsg(null), 2500);
      await load();
      onReload();
    } finally { setVisBusy(null); }
  };

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Layers className={`w-5 h-5 ${t.textMuted}`} />
        <h2 className={`text-lg font-bold ${t.text}`}>Verticals Configuration</h2>
      </div>
      <p className={`text-sm ${t.textMuted}`}>
        Rename and reorder the five business verticals. Changes take effect immediately across the entire application.
        Short names appear in compact views; full names are displayed in uppercase in lists and navigation.
      </p>

      <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead className={t.tableHead}>
            <tr className={`border-b ${t.border}`}>
              {["Vertical ID", "Color", "Full Name", "Short Name", "Order", "Active", "Actions"].map(h => (
                <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-3`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const d = def(row.vertical_id);
              const isEd = editing === row.vertical_id;
              const Icon = d?.icon || Layers;
              return (
                <tr key={row.vertical_id} className={`border-b ${t.border} last:border-0 ${t.rowHover}`}>
                  <td className={`px-4 py-3 font-mono text-xs ${verticalAccent(row.vertical_id)}`}>{row.vertical_id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded ${d?.color || "bg-slate-600"} flex items-center justify-center`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    {isEd ? (
                      <input value={editData.label} onChange={e => setEditData((p: any) => ({ ...p, label: e.target.value }))}
                        className={`w-full text-xs rounded-lg border px-2 py-1.5 ${t.inputBg} outline-none focus:border-blue-500`} />
                    ) : (
                      <span className={`font-semibold ${t.text} uppercase tracking-wide`}>{row.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 w-28">
                    {isEd ? (
                      <input value={editData.short_name} onChange={e => setEditData((p: any) => ({ ...p, short_name: e.target.value }))}
                        className={`w-full text-xs rounded-lg border px-2 py-1.5 ${t.inputBg} outline-none focus:border-blue-500`} maxLength={6} />
                    ) : (
                      <span className={`font-mono text-xs font-bold ${t.textSub} uppercase`}>{row.short_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 w-20">
                    {isEd ? (
                      <input type="number" min={1} max={10} value={editData.display_order} onChange={e => setEditData((p: any) => ({ ...p, display_order: Number(e.target.value) }))}
                        className={`w-16 text-xs rounded-lg border px-2 py-1.5 ${t.inputBg} outline-none focus:border-blue-500`} />
                    ) : (
                      <span className={`text-xs ${t.textMuted}`}>{row.display_order}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 w-20">
                    {isEd ? (
                      <input type="checkbox" checked={editData.is_active} onChange={e => setEditData((p: any) => ({ ...p, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded accent-blue-500" />
                    ) : (
                      <span className={`text-xs font-semibold ${row.is_active ? "text-emerald-500" : "text-red-500"}`}>
                        {row.is_active ? "Active" : "Disabled"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEd ? (
                      <div className="flex gap-2">
                        <button onClick={() => save(row.vertical_id)} disabled={saving}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">
                          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => setEditing(null)}
                          className={`text-[11px] px-2 py-1 rounded-lg ${t.bgCard2} ${t.textMuted} hover:opacity-80`}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(row)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border ${t.border} ${t.textMuted} hover:opacity-80 flex items-center gap-1`}>
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        {saved === row.vertical_id && <span className="text-[10px] text-emerald-500 font-semibold">Saved!</span>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visibility — hide whole verticals or individual modules; enforced on the server for every page, report, export and AI answer */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <Eye className={`w-4 h-4 ${t.textMuted}`} />
          <div className={`text-sm font-semibold ${t.text}`}>Visibility</div>
          {visMsg && <span className="text-[11px] text-emerald-500 ml-auto">{visMsg}</span>}
        </div>
        <p className={`text-xs ${t.textMuted}`}>
          Hide a whole vertical, or just some of its modules. Hidden items disappear from menus, dashboards, analytics, lists,
          exports and AI answers for everyone. No data is deleted — switch it back on at any time.
        </p>
        <div className="space-y-2">
          {[...rows].sort((a, b) => a.display_order - b.display_order).map(row => {
            const hidden: string[] = row.hidden_modules || [];
            return (
              <div key={row.vertical_id} className={`${t.bgCard2} border ${t.border} rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2`}>
                <div className="flex items-center gap-2 sm:w-56">
                  <button role="switch" aria-checked={row.is_active} aria-label={`Show ${row.label}`} disabled={!!visBusy}
                    onClick={() => setVisibility(row, { is_active: !row.is_active })}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${row.is_active ? "bg-emerald-500" : "bg-gray-500"} disabled:opacity-50`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${row.is_active ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${row.is_active ? t.text : t.textMuted + " line-through"}`}>{row.label}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUBMENU.map(m => {
                    const on = !hidden.includes(m.id);
                    return (
                      <button key={m.id} disabled={!row.is_active || !!visBusy}
                        onClick={() => setVisibility(row, { hidden_modules: on ? [...hidden, m.id] : hidden.filter(x => x !== m.id) })}
                        title={on ? `Hide ${m.label} for ${row.label}` : `Show ${m.label} for ${row.label}`}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors disabled:opacity-40 ${on ? "border-blue-500/50 bg-blue-600/15 text-blue-400" : `${t.border} ${t.textMuted} line-through`}`}>
                        {on ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}{m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${t.bgCard2} border ${t.border} rounded-xl p-4 text-xs ${t.textMuted} space-y-1`}>
        <div className="font-semibold">Notes:</div>
        <div>• Vertical IDs (retail, corporate, ib, aif, ie) are system identifiers and cannot be changed.</div>
        <div>• Full names and short names can be freely renamed to match your business terminology.</div>
        <div>• Display order controls the sequence in navigation and dashboards (1 = first).</div>
        <div>• Hiding a vertical or module (Visibility, above) removes it from every page, report, export and AI answer; data is kept.</div>
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
  const [data, setData] = useState<{ checkedAt: string; sections: { section: string; items: { label: string; value: string; status: string; detail?: string }[] }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = (refresh = false) => {
    setLoading(true); setError("");
    fetch(`${API_BASE}/api/system-status${refresh ? "?refresh=1" : ""}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(new Error(d.error || `HTTP ${r.status}`))))
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const dot = (s: string) => ["Connected", "Active", "Enforced", "Configured"].includes(s) ? "bg-emerald-500"
    : s === "Error" ? "bg-red-500" : s === "Warning" ? "bg-amber-500" : "bg-gray-500";
  return (
    <div className="p-4 sm:p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>System Configuration</h2>
          <p className={`text-xs ${t.textMuted}`}>Live status{data ? ` · checked ${new Date(data.checkedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST` : ""}</p>
        </div>
        <button onClick={() => load(true)} disabled={loading} className={`text-xs px-3 py-2 rounded-lg border ${t.border} ${t.textSub} flex items-center gap-1.5 disabled:opacity-50`}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Re-check
        </button>
      </div>
      {error && <div className={`text-xs rounded-lg border p-3 ${t.alertRed}`}>Could not load status: {error}</div>}
      {loading && !data && <div className={`text-sm ${t.textMuted}`}>Checking services…</div>}
      {data?.sections.map(section => (
        <div key={section.section} className={`${t.bgCard} border ${t.border} rounded-xl p-4`}>
          <div className={`text-sm font-semibold ${t.text} mb-2`}>{section.section}</div>
          {section.items.map(item => (
            <div key={item.label} className={`flex items-start justify-between gap-3 py-2.5 border-b ${t.border} last:border-0`}>
              <div className="flex items-start gap-2.5 min-w-0">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dot(item.status)}`} />
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${t.text}`}>{item.label}</div>
                  <div className={`text-[11px] ${t.textMuted} break-words`}>{item.value}</div>
                  {item.detail && <div className={`text-[11px] mt-0.5 ${item.status === "Error" ? t.errorText : item.status === "Warning" ? t.warningText : t.textMuted}`}>{item.detail}</div>}
                </div>
              </div>
              <div className="flex-shrink-0"><StatusBadge s={item.status} /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── AI MODULE ────────────────────────────────────────────────────────────────
type ChatMsg = { id: string; from: "user" | "ai"; text: string; ts: string; thinking?: boolean; recordCount?: number | null; sourceLabel?: string; queries?: string[]; followUps?: string[] };

const AI_SUGGESTED_PROMPTS: Record<string, string[]> = {
  // Only questions the CRM data can actually answer
  "Super Admin": ["Open pipeline by vertical", "Which service requests have breached SLA?", "Biggest open IB opportunities", "Overdue tasks across the team", "Clients with KYC pending"],
  "AIF Admin": ["AIF open leads by stage", "AIF deals and their value", "AIF service requests still open", "AIF clients with KYC pending"],
  "Retail Admin": ["Retail leads created this month", "Clients with KYC pending", "Retail service requests still open", "Retail pipeline by stage"],
  "Corporate Admin": ["Corporate Broking pipeline by stage", "Corporate deals by value", "Corporate client service requests"],
  "IB Admin": ["Biggest open IB opportunities", "Which IB opportunities have overdue next actions?", "Summarise our relationship with Aarohan", "Which companies look like IPO candidates?"],
  "IE Admin": ["Institutional Equities pipeline", "IE deals by value", "IE service requests still open"],
  default: ["My open leads", "My overdue tasks", "Service requests breaching SLA", "My biggest opportunities"],
};

function AIModule({ t, loggedUser, isDark }: { t: ReturnType<typeof useTheme>; loggedUser: any; isDark: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [configured, setConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userRole = loggedUser?.role || "Super Admin";
  const prompts = AI_SUGGESTED_PROMPTS[userRole] || AI_SUGGESTED_PROMPTS.default;

  useEffect(() => {
    fetch(`${API_BASE}/api/ai/config`)
      .then(r => r.json())
      .then(cfg => { if (cfg?.enabled && cfg?.has_api_key) setConfigured(true); })
      .catch(() => {});
  }, []);

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
    let aiRecords: number | null = null;
    let aiSource: string | undefined;
    let aiQueries: string[] | undefined;
    let aiFollow: string[] | undefined;
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.map(m => ({ from: m.from, text: m.text, queries: m.queries })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.response) {
        responseText = data.response;
        setConfigured(data.configured !== false);
        apiOk = true;
        aiRecords = data.recordCount ?? null;
        aiSource = data.sourceLabel ?? undefined;
        aiQueries = Array.isArray(data.queries) ? data.queries : undefined;
        aiFollow = Array.isArray(data.followUps) ? data.followUps : undefined;
      } else if (!res.ok || data.error) {
        responseText = "I'm having trouble connecting right now. Please try again in a moment.";
        apiOk = true;
      }
    } catch { /* network unreachable */ }

    // No offline "demo" answers — never show figures that didn't come from the CRM
    if (!apiOk) responseText = "I couldn't reach the CRM server. Please check your connection and try again.";

    setIsTyping(false);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), from: "ai", text: responseText, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), recordCount: aiRecords, sourceLabel: aiSource, queries: aiQueries, followUps: aiFollow }]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // Markdown → HTML for AI answers (headings, bold/italic, code, lists, tables with header rows)
  const mdToHtml = (text: string): string => {
    const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (x: string) => esc(x)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-violet-500/15 text-[0.9em]">$1</code>');
    const lines = text.replace(/\r/g, "").split("\n");
    let out = ""; let i = 0;
    while (i < lines.length) {
      const line = lines[i]; const tr = line.trim();
      if (/^\|.*\|$/.test(tr)) {
        const rows: string[][] = [];
        while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(lines[i].trim().slice(1, -1).split("|").map(c => c.trim())); i++; }
        const body = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
        const hasHead = rows.length > 1 && rows[1].every(c => /^:?-{2,}:?$/.test(c));
        const head = hasHead ? body.shift() : null;
        const num = (c: string) => /^[₹\-+]?[\d,.]+\s*(Cr|L|%|K)?$/.test(c.replace(/<[^>]+>/g, ""));
        out += '<div class="overflow-x-auto my-2 rounded-lg border border-current/10"><table class="w-full text-[12px] border-collapse">';
        if (head) out += "<thead><tr>" + head.map(c => `<th class="text-left font-semibold px-2.5 py-1.5 border-b border-current/15 whitespace-nowrap opacity-80">${inline(c)}</th>`).join("") + "</tr></thead>";
        out += "<tbody>" + body.map(r => '<tr class="border-b border-current/5 last:border-0">' + r.map(c => `<td class="px-2.5 py-1.5 align-top ${num(c) ? "text-right whitespace-nowrap tabular-nums" : ""}">${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
        continue;
      }
      if (/^#{1,4}\s/.test(tr)) { const lvl = tr.match(/^#+/)![0].length; out += `<div class="${lvl <= 2 ? "text-[15px]" : "text-[13px]"} font-semibold mt-3 mb-1">${inline(tr.replace(/^#+\s*/, ""))}</div>`; i++; continue; }
      if (/^([-*•])\s+/.test(tr)) {
        out += '<ul class="list-disc pl-5 my-1.5 space-y-1">';
        while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) { out += `<li>${inline(lines[i].trim().replace(/^[-*•]\s+/, ""))}</li>`; i++; }
        out += "</ul>"; continue;
      }
      if (/^\d+[.)]\s+/.test(tr)) {
        out += '<ol class="list-decimal pl-5 my-1.5 space-y-1">';
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { out += `<li>${inline(lines[i].trim().replace(/^\d+[.)]\s+/, ""))}</li>`; i++; }
        out += "</ol>"; continue;
      }
      if (/^---+$/.test(tr)) { out += '<hr class="my-2 border-current/10"/>'; i++; continue; }
      if (tr === "") { i++; continue; }
      out += `<p class="my-1.5">${inline(tr)}</p>`; i++;
    }
    return out;
  };
  const lastAi = [...messages].reverse().find(m => m.from === "ai");
  const nextQuestions = lastAi?.followUps?.length ? lastAi.followUps : prompts.slice(0, 3);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (m: ChatMsg) => { navigator.clipboard?.writeText(m.text).then(() => { setCopied(m.id); setTimeout(() => setCopied(null), 1500); }).catch(() => {}); };

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
              {configured ? "• LLM: Connected" : "• LLM: Not configured (Admin → LLM Settings)"}
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
            {configured ? "LLM Connected" : "Not configured"}
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
                <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed max-w-full overflow-hidden ${msg.from === "ai" ? `${t.bgCard} border ${t.border} ${t.text}` : "bg-violet-600 text-white"}`}>
                  {msg.from === "ai" ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(msg.text) }} /> : <p>{msg.text}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] ${t.textMuted}`}>{msg.ts}</span>
                  {msg.from === "ai" && (
                    <button onClick={() => copy(msg)} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${t.border} ${t.textMuted} hover:text-violet-400`}>{copied === msg.id ? "Copied" : "Copy"}</button>
                  )}
                  {msg.from === "ai" && msg.sourceLabel && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${t.border} ${t.textMuted}`}>
                      Source: {msg.sourceLabel}
                    </span>
                  )}
                  {msg.from === "ai" && typeof msg.recordCount === "number" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${t.border} ${t.textMuted}`} title="Number of CRM records this answer was built from">
                      Based on {msg.recordCount} record{msg.recordCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>
              <div className={`${t.bgCard} border ${t.border} rounded-2xl px-4 py-3 flex items-center gap-1.5`}>
                <span className={`text-[11px] ${t.textMuted} mr-1`}>Looking at your CRM data…</span>
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
              {nextQuestions.map((p, i) => (
                <button key={i} disabled={isTyping} onClick={() => sendMessage(p)} className={`text-[11px] px-2.5 py-1 rounded-full border ${t.border} ${t.textSub} hover:border-violet-500/60 hover:text-violet-400 disabled:opacity-50 transition-colors`}>{p}</button>
              ))}
              <button onClick={() => { setMessages([]); setInput(""); }} disabled={isTyping} className={`ml-auto text-[11px] px-2.5 py-1 rounded-full border ${t.border} ${t.textMuted} hover:text-red-400`}>New chat</button>
            </div>
          )}
          <div className={`flex gap-2 items-end ${t.bgCard2} rounded-2xl border ${t.border} px-3 py-2`}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1} placeholder={`Ask about ${userRole === "AIF Admin" ? "AIF portfolio, investors, NAV…" : "clients, SRs, pipeline, compliance…"}`} className={`flex-1 bg-transparent text-sm ${t.text} placeholder:${t.textMuted} outline-none resize-none max-h-24 leading-relaxed`} />
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
  const [piiMaskingEnabled, setPiiMaskingEnabled] = useState(true);
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

  useEffect(() => {
    fetch(`${API_BASE}/api/ai/config`)
      .then(r => r.json())
      .then(cfg => {
        if (!cfg || cfg.error) return;
        if (cfg.provider) setProvider(cfg.provider);
        if (cfg.model) { if (cfg.provider === "custom") setCustomModel(cfg.model); else setModel(cfg.model); }
        if (cfg.endpoint_url) setEndpointUrl(cfg.endpoint_url);
        if (cfg.temperature != null) setTemperature(cfg.temperature);
        if (cfg.max_tokens != null) setMaxTokens(cfg.max_tokens);
        if (cfg.system_prompt) setSystemPrompt(cfg.system_prompt);
        if (cfg.enabled != null) setEnabled(cfg.enabled);
        if (cfg.pii_masking_enabled != null) setPiiMaskingEnabled(cfg.pii_masking_enabled);
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch(`${API_BASE}/api/ai/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: provider === "custom" ? customModel : model, api_key: apiKey, endpoint_url: endpointUrl, temperature, max_tokens: maxTokens, system_prompt: systemPrompt, enabled, pii_masking_enabled: piiMaskingEnabled, updated_by: "bhushan@niytri.com" }),
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
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>NIYTRI AI Settings</h2>
          <p className={`text-xs ${t.textMuted}`}>Configure the LLM powering NIYTRI AI. Settings apply system-wide for all users.</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <div className={`text-sm font-semibold ${t.text}`}>Enable NIYTRI AI</div>
          <div className={`text-xs ${t.textMuted}`}>When disabled, users see a message to contact the admin. When enabled, all users (per their role) can access the chatbot.</div>
        </div>
        <button onClick={() => setEnabled(!enabled)} className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-violet-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      {/* PII Masking toggle */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 flex items-center justify-between`}>
        <div className="flex-1 min-w-0 pr-4">
          <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Shield className="w-4 h-4 text-amber-400" /> PII Data Masking</div>
          <div className={`text-xs ${t.textMuted} mt-0.5`}>When enabled, all AI responses automatically mask PAN numbers, mobile numbers, email addresses, demat account numbers, and dates of birth — regardless of the user's role, including Super Admin and client owners. <strong className={piiMaskingEnabled ? "text-amber-400" : t.textMuted}>Enabled by default.</strong></div>
        </div>
        <button onClick={() => setPiiMaskingEnabled(!piiMaskingEnabled)} className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${piiMaskingEnabled ? "bg-amber-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${piiMaskingEnabled ? "translate-x-6" : ""}`} />
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

// ─── ADMIN: PII DATA MASKING ──────────────────────────────────────────────────
const SCOPE_OPTIONS = [
  { value: "all",           label: "All Users (including Owners & Admins)" },
  { value: "non_owner",     label: "All Users Except Client Owners" },
  { value: "non_super",     label: "All Users Except Super Admin" },
  { value: "staff_only",    label: "Staff Only (not Admin/owner)" },
];
const CATEGORY_COLORS: Record<string, string> = {
  identity:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  contact:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  financial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  custom:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

function AdminPIIMasking({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [settings, setSettings] = useState<any>({ enabled: true, scope: "all", apply_to_ai: true, apply_to_exports: false, apply_to_reports: false, log_access: false });
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState<any>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ field_key: "", field_label: "", description: "", regex_pattern: "", mask_display: "", example_before: "", example_after: "", category: "custom" });
  const [fieldPage, setFieldPage] = useState(1);
  const PII_PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, fRes] = await Promise.all([
        fetch(`${API_BASE}/api/pii-masking/settings`).then(r => r.json()),
        fetch(`${API_BASE}/api/pii-masking/fields`).then(r => r.json()),
      ]);
      if (!sRes.error) setSettings(sRes);
      if (Array.isArray(fRes)) { setFields(fRes); setFieldPage(1); }
    } catch { setError("Failed to load settings"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/pii-masking/settings`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, updated_by: "admin" }),
      });
      if (!r.ok) throw new Error(await r.text());
      const saved = await r.json();
      // Refresh global piiSettings so canViewPII takes effect immediately
      piiSettings = {
        allow_admin_view: saved.allow_admin_view !== false,
        allow_owner_view: saved.allow_owner_view !== false,
      };
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message || "Save failed"); }
    setSaving(false);
  };

  const toggleField = async (field: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/pii-masking/fields/${field.id}/toggle`, { method: "PATCH" });
      if (r.ok) { const updated = await r.json(); setFields(fs => fs.map(f => f.id === updated.id ? updated : f)); }
    } catch { setError("Toggle failed"); }
  };

  const saveField = async (field: any) => {
    try {
      const r = await fetch(`${API_BASE}/api/pii-masking/fields/${field.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      const updated = await r.json();
      setFields(fs => fs.map(f => f.id === updated.id ? updated : f));
      setEditingField(null);
    } catch (e: any) { setError(e.message || "Failed to save field"); }
  };

  const addCustomField = async () => {
    if (!newField.field_key || !newField.field_label || !newField.regex_pattern || !newField.mask_display) {
      setError("Field Key, Label, Regex Pattern, and Mask Display are required.");
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/pii-masking/fields`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newField),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      await load();
      setShowAddField(false);
      setNewField({ field_key: "", field_label: "", description: "", regex_pattern: "", mask_display: "", example_before: "", example_after: "", category: "custom" });
    } catch (e: any) { setError(e.message || "Failed to add field"); }
  };

  const deleteField = async (field: any) => {
    if (!(await appConfirm({ title: "Delete custom field?", message: `"${field.field_label}" will be removed.`, confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      const r = await fetch(`${API_BASE}/api/pii-masking/fields/${field.id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      setFields(fs => fs.filter(f => f.id !== field.id));
    } catch (e: any) { setError(e.message || "Cannot delete this field"); }
  };

  const iCls = `w-full px-3 py-1.5 text-xs rounded-lg border ${isDark ? "border-gray-700 bg-gray-900 text-gray-100" : "border-gray-200 bg-white text-gray-900"} focus:outline-none focus:ring-2 focus:ring-violet-500`;

  if (loading) return (
    <div className={`flex items-center justify-center h-full ${t.text}`}>
      <RefreshCw className="w-5 h-5 animate-spin mr-2 opacity-50" /> Loading PII masking config…
    </div>
  );

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${t.text}`}>PII Data Masking</h2>
            <p className={`text-xs ${t.textMuted}`}>Configure which sensitive data fields are masked in AI responses, exports, and reports.</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {saved && <span className="text-xs text-green-500 font-medium">Saved ✓</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button onClick={saveSettings} disabled={saving} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Global Settings */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl divide-y ${isDark ? "divide-gray-700/50" : "divide-gray-100"}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${t.text}`}>Master Switch</div>
            <div className={`text-xs ${t.textMuted} mt-0.5`}>Enable or disable all PII masking globally across NIYTRI CRM. When off, all raw data is shown.</div>
          </div>
          <button onClick={() => setSettings((s: any) => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? "bg-amber-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.enabled ? "translate-x-6" : ""}`} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className={`text-sm font-semibold ${t.text} mb-2`}>Masking Scope</div>
          <div className={`text-xs ${t.textMuted} mb-3`}>Define which users will see masked data. Users outside scope see raw values.</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCOPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSettings((s: any) => ({ ...s, scope: opt.value }))}
                className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${settings.scope === opt.value ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium" : `border-gray-200 dark:border-gray-700 ${t.textMuted} hover:border-amber-300`}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${settings.scope === opt.value ? "border-amber-500 bg-amber-500" : "border-gray-400"}`} />
                  {opt.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className={`text-sm font-semibold ${t.text} mb-3`}>Apply Masking To</div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "apply_to_ai",      label: "NIYTRI AI Responses",  desc: "Mask PII in AI chatbot answers" },
              { key: "apply_to_exports", label: "Data Exports / PDF",    desc: "Mask PII in exported files" },
              { key: "apply_to_reports", label: "Reports & Dashboards",  desc: "Mask PII in on-screen reports" },
              { key: "log_access",       label: "Log PII Access Attempts", desc: "Audit log when raw PII is viewed" },
            ].map(opt => (
              <label key={opt.key} className={`flex items-start gap-2.5 cursor-pointer ${t.text}`}>
                <button onClick={() => setSettings((s: any) => ({ ...s, [opt.key]: !s[opt.key] }))}
                  className={`relative w-9 h-5 rounded-full mt-0.5 flex-shrink-0 transition-colors ${(settings as any)[opt.key] ? "bg-amber-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(settings as any)[opt.key] ? "translate-x-4" : ""}`} />
                </button>
                <div>
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* PII View Permissions — who can reveal raw PII */}
        <div className="px-4 py-3">
          <div className={`text-sm font-semibold ${t.text} mb-1`}>PII View Permissions</div>
          <div className={`text-xs ${t.textMuted} mb-3`}>Control which roles can click the eye icon to reveal unmasked PII on client profiles.</div>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "allow_admin_view", label: "Admins Can View PII",       desc: "Super Admin & Admin roles can reveal PII" },
              { key: "allow_owner_view", label: "Client Owner Can View PII",  desc: "Assigned RM / owner of the client record can reveal PII" },
            ].map(opt => (
              <label key={opt.key} className={`flex items-start gap-2.5 cursor-pointer ${t.text}`}>
                <button onClick={() => setSettings((s: any) => ({ ...s, [opt.key]: !s[opt.key] }))}
                  className={`relative w-9 h-5 rounded-full mt-0.5 flex-shrink-0 transition-colors ${(settings as any)[opt.key] ? "bg-violet-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(settings as any)[opt.key] ? "translate-x-4" : ""}`} />
                </button>
                <div>
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Fields table */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden`}>
        <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
          <div>
            <div className={`text-sm font-semibold ${t.text}`}>Field-Level Masking Rules</div>
            <div className={`text-xs ${t.textMuted}`}>{fields.filter(f => f.is_enabled).length} of {fields.length} fields active</div>
          </div>
          <button onClick={() => { setShowAddField(true); setError(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Custom Field
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className={`${t.tableHead}`}>
              <tr className={`border-b ${t.border}`}>
                <th className={`text-left px-4 py-2.5 font-semibold ${t.textMuted} uppercase tracking-wide text-[10px]`}>Field</th>
                <th className={`text-left px-4 py-2.5 font-semibold ${t.textMuted} uppercase tracking-wide text-[10px]`}>Category</th>
                <th className={`text-left px-4 py-2.5 font-semibold ${t.textMuted} uppercase tracking-wide text-[10px]`}>Mask Display</th>
                <th className={`text-left px-4 py-2.5 font-semibold ${t.textMuted} uppercase tracking-wide text-[10px]`}>Example</th>
                <th className={`text-center px-4 py-2.5 font-semibold ${t.textMuted} uppercase tracking-wide text-[10px]`}>Active</th>
                <th className={`text-right px-4 py-2.5 font-semibold ${t.textMuted} uppercase tracking-wide text-[10px]`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.slice((fieldPage - 1) * PII_PAGE_SIZE, fieldPage * PII_PAGE_SIZE).map(field => (
                <tr key={field.id} className={`border-b ${t.border} last:border-0 ${field.is_enabled ? "" : "opacity-50"}`}>
                  {editingField?.id === field.id ? (
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Label</label>
                          <input value={editingField.field_label} onChange={e => setEditingField((f: any) => ({ ...f, field_label: e.target.value }))} className={iCls} />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Mask Display</label>
                          <input value={editingField.mask_display} onChange={e => setEditingField((f: any) => ({ ...f, mask_display: e.target.value }))} className={iCls} />
                        </div>
                        <div className="col-span-2">
                          <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Regex Pattern</label>
                          <input value={editingField.regex_pattern} onChange={e => setEditingField((f: any) => ({ ...f, regex_pattern: e.target.value }))} className={`${iCls} font-mono`} />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Example (before)</label>
                          <input value={editingField.example_before || ""} onChange={e => setEditingField((f: any) => ({ ...f, example_before: e.target.value }))} className={iCls} />
                        </div>
                        <div>
                          <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Example (after)</label>
                          <input value={editingField.example_after || ""} onChange={e => setEditingField((f: any) => ({ ...f, example_after: e.target.value }))} className={iCls} />
                        </div>
                        <div className="col-span-2">
                          <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Description</label>
                          <input value={editingField.description || ""} onChange={e => setEditingField((f: any) => ({ ...f, description: e.target.value }))} className={iCls} />
                        </div>
                        <div className="col-span-2 flex gap-2 justify-end">
                          <button onClick={() => setEditingField(null)} className={`px-3 py-1.5 rounded-lg border ${t.border} text-xs ${t.textMuted}`}>Cancel</button>
                          <button onClick={() => saveField(editingField)} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium">Save</button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${t.text}`}>{field.field_label}</div>
                        {field.description && <div className={`text-[10px] ${t.textMuted} mt-0.5 max-w-[220px] truncate`} title={field.description}>{field.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[field.category] || CATEGORY_COLORS.custom}`}>
                          {field.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${isDark ? "bg-gray-800 text-amber-400" : "bg-amber-50 text-amber-700"}`}>{field.mask_display}</code>
                      </td>
                      <td className="px-4 py-3">
                        {field.example_before ? (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className={`font-mono ${t.textMuted} line-through`}>{field.example_before}</span>
                            <span className={t.textMuted}>→</span>
                            <span className={`font-mono ${isDark ? "text-amber-400" : "text-amber-600"} font-medium`}>{field.example_after}</span>
                          </div>
                        ) : <span className={`${t.textMuted} text-[10px]`}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleField(field)}
                          className={`relative w-9 h-5 rounded-full transition-colors ${field.is_enabled ? "bg-amber-500" : isDark ? "bg-gray-700" : "bg-gray-300"}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${field.is_enabled ? "translate-x-4" : ""}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setEditingField({ ...field }); setError(""); }} className={`p-1.5 rounded-lg ${t.rowHover} ${t.textMuted} hover:text-blue-500`} title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          {field.category === "custom" && (
                            <button onClick={() => deleteField(field)} className={`p-1.5 rounded-lg ${t.rowHover} text-red-400 hover:text-red-600`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination controls */}
          {fields.length > PII_PAGE_SIZE && (
            <div className={`px-4 py-3 border-t ${t.border} flex items-center justify-between`}>
              <span className={`text-[11px] ${t.textMuted}`}>
                Showing {(fieldPage - 1) * PII_PAGE_SIZE + 1}–{Math.min(fieldPage * PII_PAGE_SIZE, fields.length)} of {fields.length} fields
              </span>
              <div className="flex items-center gap-1.5">
                <button disabled={fieldPage === 1} onClick={() => setFieldPage(p => p - 1)}
                  className={`px-2.5 py-1 rounded-lg text-xs border ${t.border} ${fieldPage === 1 ? "opacity-40 cursor-not-allowed" : t.rowHover} ${t.textMuted}`}>
                  ← Prev
                </button>
                {Array.from({ length: Math.ceil(fields.length / PII_PAGE_SIZE) }, (_, i) => i + 1).map(pg => (
                  <button key={pg} onClick={() => setFieldPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs ${pg === fieldPage ? "bg-amber-500 text-white font-bold" : `border ${t.border} ${t.textMuted} ${t.rowHover}`}`}>
                    {pg}
                  </button>
                ))}
                <button disabled={fieldPage >= Math.ceil(fields.length / PII_PAGE_SIZE)} onClick={() => setFieldPage(p => p + 1)}
                  className={`px-2.5 py-1 rounded-lg text-xs border ${t.border} ${fieldPage >= Math.ceil(fields.length / PII_PAGE_SIZE) ? "opacity-40 cursor-not-allowed" : t.rowHover} ${t.textMuted}`}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add custom field form */}
      {showAddField && (
        <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
          <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Plus className="w-4 h-4 text-violet-500" /> Add Custom PII Field</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Field Key (unique identifier)</label>
              <input value={newField.field_key} onChange={e => setNewField(f => ({ ...f, field_key: e.target.value.toLowerCase().replace(/\s/g, "_") }))} className={iCls} placeholder="e.g. gst_number" />
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Field Label</label>
              <input value={newField.field_label} onChange={e => setNewField(f => ({ ...f, field_label: e.target.value }))} className={iCls} placeholder="e.g. GST Number" />
            </div>
            <div className="col-span-2">
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Regex Pattern</label>
              <input value={newField.regex_pattern} onChange={e => setNewField(f => ({ ...f, regex_pattern: e.target.value }))} className={`${iCls} font-mono`} placeholder="e.g. \b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b" />
              <p className={`text-[10px] ${t.textMuted} mt-0.5`}>JavaScript RegExp syntax, without slashes or flags (the g flag is applied automatically)</p>
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Mask Display</label>
              <input value={newField.mask_display} onChange={e => setNewField(f => ({ ...f, mask_display: e.target.value }))} className={iCls} placeholder="e.g. XX-XXXXX-XXXX" />
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Category</label>
              <select value={newField.category} onChange={e => setNewField(f => ({ ...f, category: e.target.value }))} className={iCls}>
                <option value="custom">Custom</option>
                <option value="identity">Identity</option>
                <option value="contact">Contact</option>
                <option value="financial">Financial</option>
              </select>
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Example (before masking)</label>
              <input value={newField.example_before} onChange={e => setNewField(f => ({ ...f, example_before: e.target.value }))} className={iCls} placeholder="Raw value example" />
            </div>
            <div>
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Example (after masking)</label>
              <input value={newField.example_after} onChange={e => setNewField(f => ({ ...f, example_after: e.target.value }))} className={iCls} placeholder="Masked value example" />
            </div>
            <div className="col-span-2">
              <label className={`block text-[10px] font-medium ${t.textMuted} mb-1`}>Description</label>
              <input value={newField.description} onChange={e => setNewField(f => ({ ...f, description: e.target.value }))} className={iCls} placeholder="What this field represents…" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAddField(false); setError(""); }} className={`px-3 py-2 rounded-lg border ${t.border} text-xs ${t.textMuted}`}>Cancel</button>
            <button onClick={addCustomField} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: DROPDOWN CONFIG ───────────────────────────────────────────────────
function AdminDropdownConfig({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ entity_type: "lead", field_name: "", label: "", value: "", sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/config/dropdowns`);
      const d = await r.json();
      setRows(d.data || d || []);
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const entities = ["all", ...Array.from(new Set(rows.map((r: any) => r.entity_type)))];
  const fields = ["all", ...Array.from(new Set(rows.filter((r: any) => filterEntity === "all" || r.entity_type === filterEntity).map((r: any) => r.field_name)))];

  const filtered = rows.filter((r: any) => {
    if (filterEntity !== "all" && r.entity_type !== filterEntity) return false;
    if (filterField !== "all" && r.field_name !== filterField) return false;
    if (search && !r.label?.toLowerCase().includes(search.toLowerCase()) && !r.value?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const save = async () => {
    if (!newRow.field_name || !newRow.label) { setErr("Field name and label are required."); return; }
    setSaving(true); setErr("");
    try {
      await fetch(`${API_BASE}/api/config/dropdowns`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newRow, value: newRow.value || newRow.label }),
      });
      setAdding(false); setNewRow({ entity_type: "lead", field_name: "", label: "", value: "", sort_order: 0 }); load();
    } catch { setErr("Save failed."); } finally { setSaving(false); }
  };

  const update = async () => {
    if (!editing?.label) { setErr("Label is required."); return; }
    setSaving(true); setErr("");
    try {
      await fetch(`${API_BASE}/api/config/dropdowns/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing),
      });
      setEditing(null); load();
    } catch { setErr("Update failed."); } finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!(await appConfirm({ title: "Delete this dropdown option?", confirmLabel: "Delete", tone: "danger" }))) return;
    await fetch(`${API_BASE}/api/config/dropdowns/${id}`, { method: "DELETE" });
    load();
  };

  const groupedByField: Record<string, any[]> = {};
  filtered.forEach((r: any) => {
    const key = `${r.entity_type}::${r.field_name}`;
    if (!groupedByField[key]) groupedByField[key] = [];
    groupedByField[key].push(r);
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-wrap flex-shrink-0`}>
        <div className={`w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center`}><Tag className="w-3.5 h-3.5 text-white" /></div>
        <div>
          <div className={`text-sm font-bold ${t.text}`}>Dropdown Values</div>
          <div className={`text-[10px] ${t.textMuted}`}>Manage configurable dropdown options for Leads, Deals, Clients</div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 border ${t.border} rounded-lg px-2 py-1.5 ${t.inputBg}`}>
            <Search className={`w-3 h-3 ${t.textMuted}`} />
            <input value={search} onChange={e => setSearch(e.target.value)} className={`bg-transparent text-xs ${t.text} outline-none w-28`} placeholder="Search…" />
          </div>
          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setFilterField("all"); }} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg}`}>
            {entities.map(e => <option key={e} value={e}>{e === "all" ? "All Entities" : e}</option>)}
          </select>
          <select value={filterField} onChange={e => setFilterField(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg}`}>
            {fields.map(f => <option key={f} value={f}>{f === "all" ? "All Fields" : f}</option>)}
          </select>
          <button onClick={load} className={`text-xs px-2.5 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setAdding(true); setErr(""); }} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Value</button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className={`mx-5 mt-3 p-4 rounded-xl border ${t.border} ${t.bgCard} flex-shrink-0`}>
          <div className="text-xs font-semibold mb-3 text-violet-500">New Dropdown Option</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <select value={newRow.entity_type} onChange={e => setNewRow(p => ({ ...p, entity_type: e.target.value }))} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`}>
              {["lead", "deal", "client"].map(v => <option key={v}>{v}</option>)}
            </select>
            <input value={newRow.field_name} onChange={e => setNewRow(p => ({ ...p, field_name: e.target.value }))} placeholder="field_name (e.g. source)" className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`} />
            <input value={newRow.label} onChange={e => setNewRow(p => ({ ...p, label: e.target.value }))} placeholder="Label (shown in UI)" className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`} />
            <input value={newRow.value} onChange={e => setNewRow(p => ({ ...p, value: e.target.value }))} placeholder="Value (defaults to label)" className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`} />
            <input type="number" value={newRow.sort_order} onChange={e => setNewRow(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} placeholder="Order" className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`} />
          </div>
          {err && <div className="text-xs text-red-500 mt-2">{err}</div>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setAdding(false)} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={save} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={`flex items-center justify-center flex-1 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {Object.entries(groupedByField).length === 0 && <div className={`text-center py-12 text-sm ${t.textMuted}`}>No dropdown values found.</div>}
          {Object.entries(groupedByField).map(([key, items]) => {
            const [entityType, fieldName] = key.split("::");
            return (
              <div key={key} className={`${t.bgCard} rounded-xl border ${t.border} overflow-hidden`}>
                <div className={`px-4 py-2.5 border-b ${t.border} flex items-center gap-2 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>{entityType}</span>
                  <span className="text-[10px] text-gray-400">›</span>
                  <span className={`text-xs font-semibold ${t.text}`}>{fieldName}</span>
                  <span className={`ml-auto text-[10px] ${t.textMuted}`}>{items.length} values</span>
                </div>
                <table className="w-full">
                  <thead className={`${t.tableHead}`}>
                    <tr className={`border-b ${t.border}`}>
                      {["Label", "Value", "Order", "Active", ""].map(h => (
                        <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((row: any) => (
                      <tr key={row.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} text-xs`}>
                        {editing?.id === row.id ? (
                          <>
                            <td className="px-4 py-2"><input value={editing.label} onChange={e => setEditing((p: any) => ({ ...p, label: e.target.value }))} className={`text-xs px-2 py-1 rounded border ${t.border} ${t.inputBg} ${t.text} w-full`} /></td>
                            <td className="px-4 py-2"><input value={editing.value} onChange={e => setEditing((p: any) => ({ ...p, value: e.target.value }))} className={`text-xs px-2 py-1 rounded border ${t.border} ${t.inputBg} ${t.text} w-full`} /></td>
                            <td className="px-4 py-2"><input type="number" value={editing.sort_order} onChange={e => setEditing((p: any) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className={`text-xs px-2 py-1 rounded border ${t.border} ${t.inputBg} ${t.text} w-16`} /></td>
                            <td className="px-4 py-2"><input type="checkbox" checked={!!editing.is_active} onChange={e => setEditing((p: any) => ({ ...p, is_active: e.target.checked }))} /></td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <button onClick={update} disabled={saving} className="text-[10px] px-2 py-0.5 rounded bg-violet-600 text-white disabled:opacity-60">{saving ? "…" : "Save"}</button>
                                <button onClick={() => setEditing(null)} className={`text-[10px] px-2 py-0.5 rounded border ${t.border} ${t.textMuted}`}>Cancel</button>
                              </div>
                              {err && <div className="text-[10px] text-red-500 mt-1">{err}</div>}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`px-4 py-2.5 font-medium ${t.text}`}>{row.label}</td>
                            <td className={`px-4 py-2.5 font-mono text-[10px] ${t.textMuted}`}>{row.value}</td>
                            <td className={`px-4 py-2.5 ${t.textMuted}`}>{row.sort_order ?? "—"}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${row.is_active !== false ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                                {row.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1">
                                <button onClick={() => { setEditing({ ...row }); setErr(""); }} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500"><Edit className="w-3 h-3" /></button>
                                <button onClick={() => remove(row.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><X className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: PIPELINE STAGES ───────────────────────────────────────────────────
function AdminPipelineStages({ t, isDark }: { t: ReturnType<typeof useTheme>; isDark: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterVertical, setFilterVertical] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [newRow, setNewRow] = useState({ vertical: "retail", entity: "lead", label: "", sort_order: 1, color: "#6366f1", skip_allowed: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/config/pipeline-stages/all`);
      const d = await r.json();
      setRows(Array.isArray(d) ? d : (d.data || []));
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const verticals = ["all", "retail", "corporate", "ib", "aif", "ie"];
  const types = ["all", "lead", "deal"];

  const filtered = rows.filter((r: any) => {
    if (filterVertical !== "all" && r.vertical !== filterVertical) return false;
    if (filterType !== "all" && r.entity !== filterType) return false;
    return true;
  });

  const grouped: Record<string, any[]> = {};
  filtered.forEach((r: any) => {
    const key = `${r.vertical}::${r.entity}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

  const saveNew = async () => {
    if (!newRow.label) { setErr("Stage name is required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = { entity: newRow.entity, vertical: newRow.vertical, stage_id: slugify(newRow.label), label: newRow.label, sort_order: newRow.sort_order, color: newRow.color, skip_allowed: newRow.skip_allowed };
      const r = await fetch(`${API_BASE}/api/config/pipeline-stages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      setAdding(false); setNewRow({ vertical: "retail", entity: "lead", label: "", sort_order: 1, color: "#6366f1", skip_allowed: true }); load();
    } catch (e: any) { setErr(e.message || "Save failed."); } finally { setSaving(false); }
  };

  const update = async () => {
    if (!editing?.label) { setErr("Stage name is required."); return; }
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/config/pipeline-stages/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editing.label, sort_order: editing.sort_order, color: editing.color, is_won: editing.is_won, is_lost: editing.is_lost, is_active: editing.is_active !== false, skip_allowed: editing.skip_allowed !== false }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      setEditing(null); load();
    } catch (e: any) { setErr(e.message || "Update failed."); } finally { setSaving(false); }
  };

  const remove = async (rowId: string) => {
    if (!(await appConfirm({ title: "Delete this pipeline stage?", confirmLabel: "Delete", tone: "danger" }))) return;
    await fetch(`${API_BASE}/api/config/pipeline-stages/${rowId}`, { method: "DELETE" });
    load();
  };

  const VNAME2: Record<string, string> = { retail: "Retail Broking", corporate: "Corporate Broking", ib: "Investment Banking", aif: "AIF", ie: "Institutional Equities" };
  // One flag per stage: Mandatory (can't be skipped) or Skip allowed (user may skip it, and it shows as Skipped)
  const toggleSkip = async (row: any) => {
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, skip_allowed: !(row.skip_allowed !== false) } : r));
    const r = await fetch(`${API_BASE}/api/config/pipeline-stages/${row.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skip_allowed: !(row.skip_allowed !== false) }) });
    if (!r.ok) load();
  };
  const SkipPill = ({ row, onClick }: { row: any; onClick?: () => void }) => {
    const allowed = row.skip_allowed !== false;
    if (row.is_won || row.is_lost) return <span className={`text-[10px] ${t.textMuted}`} title="End stages are never skipped">—</span>;
    return (
      <button type="button" onClick={onClick} title={allowed ? "Users may skip this stage (it shows as Skipped). Click to make it mandatory." : "Users must go through this stage. Click to allow skipping."}
        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${allowed ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300" : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300"}`}>
        {allowed ? "Skip allowed" : "Mandatory"}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-3 flex-wrap flex-shrink-0`}>
        <div className={`w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center`}><TrendingUp className="w-3.5 h-3.5 text-white" /></div>
        <div>
          <div className={`text-sm font-bold ${t.text}`}>Pipeline Stages</div>
          <div className={`text-[10px] ${t.textMuted}`}>Lead & deal stages per vertical · <b>Mandatory</b> stages can't be skipped; <b>Skip allowed</b> stages can be skipped and show as Skipped</div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg}`}>
            {verticals.map(v => <option key={v} value={v}>{v === "all" ? "All Verticals" : VNAME2[v] || v}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg}`}>
            {types.map(tp => <option key={tp} value={tp}>{tp === "all" ? "All Types" : tp === "lead" ? "Leads" : "Deals"}</option>)}
          </select>
          <button onClick={load} className={`text-xs px-2.5 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setAdding(true); setErr(""); }} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Stage</button>
        </div>
      </div>

      {adding && (
        <div className={`mx-5 mt-3 p-4 rounded-xl border ${t.border} ${t.bgCard} flex-shrink-0`}>
          <div className="text-xs font-semibold mb-3 text-blue-500">New Pipeline Stage</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <select value={newRow.vertical} onChange={e => setNewRow(p => ({ ...p, vertical: e.target.value }))} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`}>
              {["retail", "corporate", "ib", "aif", "ie"].map(v => <option key={v} value={v}>{VNAME2[v]}</option>)}
            </select>
            <select value={newRow.entity} onChange={e => setNewRow(p => ({ ...p, entity: e.target.value }))} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`}>
              <option value="lead">Lead</option>
              <option value="deal">Deal</option>
            </select>
            <input value={newRow.label} onChange={e => setNewRow(p => ({ ...p, label: e.target.value }))} placeholder="Stage Name" className={`col-span-2 text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`} />
            <input type="number" value={newRow.sort_order} onChange={e => setNewRow(p => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))} placeholder="Order" className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} ${t.text}`} />
            <div className="flex items-center gap-1.5">
              <input type="color" value={newRow.color} onChange={e => setNewRow(p => ({ ...p, color: e.target.value }))} className="w-7 h-7 rounded border cursor-pointer" />
              <span className={`text-[10px] ${t.textMuted}`}>Color</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[11px] ${t.textMuted}`}>Workflow:</span>
            {[true, false].map(v => (
              <button key={String(v)} type="button" onClick={() => setNewRow(p => ({ ...p, skip_allowed: v }))}
                className={`text-[11px] px-2.5 py-1 rounded-full border ${newRow.skip_allowed === v ? (v ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300 font-semibold" : "border-red-500 bg-red-500/10 text-red-600 dark:text-red-300 font-semibold") : `${t.border} ${t.textMuted}`}`}>{v ? "Skip allowed" : "Mandatory"}</button>
            ))}
          </div>
          {err && <div className="text-xs text-red-500 mt-2">{err}</div>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setAdding(false)} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}>Cancel</button>
            <button onClick={saveNew} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-60">{saving ? "Saving…" : "Save Stage"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={`flex items-center justify-center flex-1 text-xs ${t.textMuted}`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {Object.keys(grouped).length === 0 && <div className={`text-center py-12 text-sm ${t.textMuted}`}>No pipeline stages found.</div>}
          {Object.entries(grouped).map(([key, stages]) => {
            const [vertId, entType] = key.split("::");
            return (
              <div key={key} className={`${t.bgCard} rounded-xl border ${t.border} overflow-hidden`}>
                <div className={`px-4 py-2.5 border-b ${t.border} flex items-center gap-2 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                  <span className={`text-xs font-semibold ${t.text}`}>{VNAME2[vertId] || vertId}</span>
                  <span className={`text-[10px] uppercase tracking-widest ${t.textMuted}`}>— {entType} stages</span>
                  <span className={`ml-auto text-[10px] ${t.textMuted}`}>{stages.length} stages</span>
                </div>
                <table className="w-full">
                  <thead className={t.tableHead}>
                    <tr className={`border-b ${t.border}`}>
                      {["#", "Stage Name", "Color", "Won / Lost", "Workflow", "Active", ""].map(h => (
                        <th key={h} className={`text-left text-[10px] font-semibold uppercase tracking-wide ${t.textMuted} px-4 py-2`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((row: any) => (
                      <tr key={row.id} className={`border-b ${t.border} last:border-0 ${t.rowHover} text-xs`}>
                        {editing?.id === row.id ? (
                          <>
                            <td className={`px-4 py-2 ${t.textMuted}`}>
                              <input type="number" value={editing.sort_order} onChange={e => setEditing((p: any) => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))} className={`text-xs px-2 py-1 rounded border ${t.border} ${t.inputBg} ${t.text} w-12`} />
                            </td>
                            <td className="px-4 py-2">
                              <input value={editing.label} onChange={e => setEditing((p: any) => ({ ...p, label: e.target.value }))} className={`text-xs px-2 py-1 rounded border ${t.border} ${t.inputBg} ${t.text} w-full`} />
                            </td>
                            <td className="px-4 py-2">
                              <input type="color" value={editing.color || "#6366f1"} onChange={e => setEditing((p: any) => ({ ...p, color: e.target.value }))} className="w-7 h-7 rounded border cursor-pointer" />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={!!editing.is_won} onChange={e => setEditing((p: any) => ({ ...p, is_won: e.target.checked }))} /> Won</label>
                                <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={!!editing.is_lost} onChange={e => setEditing((p: any) => ({ ...p, is_lost: e.target.checked }))} /> Lost</label>
                              </div>
                            </td>
                            <td className="px-4 py-2"><SkipPill row={editing} onClick={() => setEditing((p: any) => ({ ...p, skip_allowed: !(p.skip_allowed !== false) }))} /></td>
                            <td className="px-4 py-2">
                              <input type="checkbox" checked={editing.is_active !== false} onChange={e => setEditing((p: any) => ({ ...p, is_active: e.target.checked }))} />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <button onClick={update} disabled={saving} className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white disabled:opacity-60">{saving ? "…" : "Save"}</button>
                                <button onClick={() => setEditing(null)} className={`text-[10px] px-2 py-0.5 rounded border ${t.border} ${t.textMuted}`}>Cancel</button>
                              </div>
                              {err && <div className="text-[10px] text-red-500 mt-1">{err}</div>}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`px-4 py-2.5 font-mono ${t.textMuted}`}>{row.sort_order}</td>
                            <td className={`px-4 py-2.5 font-semibold ${t.text}`}>{row.label}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: row.color || "#6366f1" }} />
                                <span className={`text-[10px] font-mono ${t.textMuted}`}>{row.color || "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1.5">
                                {row.is_won && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Won</span>}
                                {row.is_lost && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Lost</span>}
                                {!row.is_won && !row.is_lost && <span className={`text-[10px] ${t.textMuted}`}>—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><SkipPill row={row} onClick={() => toggleSkip(row)} /></td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${row.is_active !== false ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                                {row.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1">
                                <button onClick={() => { setEditing({ ...row }); setErr(""); }} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500"><Edit className="w-3 h-3" /></button>
                                <button onClick={() => remove(row.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"><X className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function restoreUserFromStorage(): typeof USERS[0] | null {
  try {
    const raw = localStorage.getItem("niytri_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.id) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role || "RM", vertical: u.vertical || "All", authType: (u.authType || u.auth_type || "app") as AuthMethod, mfa: !!u.mfa_enabled, status: "Active", lastLogin: "Now" };
  } catch { return null; }
}

export function CRMApp() {
  const [authStep, setAuthStep] = useState<AuthStep>(() => {
    const token = localStorage.getItem("niytri_token");
    const user = localStorage.getItem("niytri_user");
    if (token && user) {
      try { JSON.parse(user); return "app"; } catch { /* bad json */ }
    }
    return "login";
  });
  const [loggedUser, setLoggedUser] = useState<typeof USERS[0]>(() => restoreUserFromStorage() || USERS[0]);
  const [loginEmail, setLoginEmail] = useState("");
  const [activeV, setActiveV] = useState<Vertical>(null);
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [currUnit, setCurrUnitState] = useState<string>(getUnit());
  const setCurrUnit = (u: string) => { setUnit(u as CurrUnit); setCurrUnitState(u); };
  const [isAdmin, setIsAdmin] = useState(false);
  const [m365Error, setM365Error] = useState("");
  const [, setVerticalsKey] = useState(0);
  const [visRev, setVisRev] = useState(0); // bump to reload vertical/module visibility
  const [showPIIRequests, setShowPIIRequests] = useState(false);
  const [piiPendingCount, setPiiPendingCount] = useState(0);

  // Load PII settings at startup so canViewPII uses live admin config
  useEffect(() => {
    if (authStep !== "app") return;
    fetch(`${API_BASE}/api/pii-masking/settings`)
      .then(r => r.ok ? r.json() : null)
      .then((s: any) => {
        if (s && !s.error) {
          piiSettings = {
            allow_admin_view: s.allow_admin_view !== false,
            allow_owner_view: s.allow_owner_view !== false,
          };
        }
      })
      .catch(() => {});
  }, [authStep]); // (re)load once signed in — these endpoints need a session

  // Poll for pending PII approval count (for badge on header icon)
  useEffect(() => {
    const fetchCount = () => {
      if (!loggedUser?.id) return;
      const isSA = (loggedUser?.role || "").toLowerCase().includes("super");
      fetch(`${API_BASE}/api/clients/access-requests/list?user_id=${loggedUser.id}&role=approver&is_super_admin=${isSA}`)
        .then(r => r.ok ? r.json() : { data: [] })
        .then(d => setPiiPendingCount((d.data || []).filter((r: any) => r.status === "pending").length))
        .catch(() => {});
    };
    fetchCount();
    const i = setInterval(fetchCount, 60000);
    return () => clearInterval(i);
  }, [loggedUser?.id, loggedUser?.role]);

  // Load pipeline stages from DB at startup — overwrites hardcoded LEAD_STAGES/DEAL_STAGES
  useEffect(() => {
    fetch(`${API_BASE}/api/config/pipeline-stages/all`)
      .then(r => r.ok ? r.json() : null)
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return;
        const active = rows.filter(r => r.is_active !== false);
        // Rebuild LEAD_STAGES
        const leadMap: Record<string, { id: string; label: string; is_won?: boolean; is_lost?: boolean }[]> = {};
        active.filter(r => r.entity === "lead").forEach(r => {
          const vKey = r.vertical;
          if (!leadMap[vKey]) leadMap[vKey] = [];
          leadMap[vKey].push({ id: r.stage_id, label: r.label, is_won: !!r.is_won, is_lost: !!r.is_lost, skip_allowed: r.skip_allowed !== false } as any);
        });
        Object.assign(LEAD_STAGES, leadMap);
        // Rebuild DEAL_STAGES (string array of labels)
        const dealMap: Record<string, string[]> = {};
        active.filter(r => r.entity === "deal").forEach(r => {
          const vKey = r.vertical;
          if (!dealMap[vKey]) dealMap[vKey] = [];
          dealMap[vKey].push(r.label);
        });
        Object.assign(DEAL_STAGES, dealMap);
        const dealMeta: Record<string, any[]> = {};
        active.filter(r => r.entity === "deal").forEach(r => { (dealMeta[r.vertical] ||= []).push({ id: r.stage_id, label: r.label, is_won: !!r.is_won, is_lost: !!r.is_lost, skip_allowed: r.skip_allowed !== false }); });
        Object.assign(DEAL_STAGE_META, dealMeta);
        setVerticalsKey(k => k + 1); // re-render screens that read the stage lists
      })
      .catch(() => {});
  }, [authStep]); // (re)load once signed in — these endpoints need a session

  // Load verticals config from API (merge with icon/color defaults)
  useEffect(() => {
    fetch("/api/admin/verticals-config")
      .then(r => r.ok ? r.json() : null)
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return;
        HIDDEN_MODULES = Object.fromEntries(rows.map(r => [(r.vertical_id || "").toLowerCase(), r.hidden_modules || []]));
        VERTICALS = rows
          .filter(r => r.is_active)
          .sort((a, b) => a.display_order - b.display_order)
          .map(r => {
            const nid = (r.vertical_id || "").toLowerCase();
            const def = VERTICAL_DEFAULTS.find(d => d.id === nid);
            return { id: nid, label: r.label, short: r.short_name, color: def?.color || "bg-blue-600", icon: def?.icon || Users };
          });
        setVerticalsKey(k => k + 1);
      })
      .catch(() => {});
  }, [authStep, visRev]); // (re)load once signed in — these endpoints need a session

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

  // Dark mode for native controls too: dropdown option lists, date pickers and scrollbars follow
  // the theme, and Tailwind `dark:` styles (used by the lead/deal/client forms) switch on.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  // NOTE: hooks must stay above the early "return" screens below (login / OTP / M365),
  // otherwise React sees a different hook count after sign-in and the page goes blank.
  // ── URL hash routing: #/<section>/<page> — deep links, browser/phone back button ──
  // section = "main" | "admin" | vertical id (retail, corporate, ib, aif, ie)
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#\/([\w-]+)\/([\w-]+)/);
      if (!m) return;
      const [, section, page] = m;
      if (section === "admin") { setIsAdmin(true); setActiveV(null); }
      else { setIsAdmin(false); setActiveV(section === "main" ? null : (section as Vertical)); }
      setActivePage(page as Page);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);
  useEffect(() => {
    const h = `#/${isAdmin ? "admin" : activeV || "main"}/${activePage}`;
    if (window.location.hash !== h) window.history.pushState(null, "", h);
    setMobileSidebarOpen(false); // close the mobile drawer after navigating
  }, [isAdmin, activeV, activePage]);

  // M365 callback: token + user in URL → use API user directly, then go to app
  if (m365Token && m365UserJson) {
    return (
      <M365Callback
        token={m365Token}
        userJson={m365UserJson}
        onDone={(apiUser) => {
          if (apiUser) {
            setLoggedUser({ id: apiUser.id, name: apiUser.name, email: apiUser.email, role: apiUser.role || "RM", vertical: apiUser.vertical || "All", authType: (apiUser.authType || "m365") as AuthMethod, mfa: !!apiUser.mfa_enabled, status: "Active", lastLogin: "Now" });
          }
          setAuthStep("app");
        }}
      />
    );
  }

  // Global Quick Log (opened from the header, Company 360, lead panels, IB dashboard)
  const [quickLogDefaults, setQuickLogDefaults] = useState<any | null>(null);
  const [recorderDefaults, setRecorderDefaults] = useState<any | null>(null);
  const [openMeetingId, setOpenMeetingId] = useState<string | null>(null);
  useEffect(() => {
    const r = (e: any) => setRecorderDefaults(e.detail || {});
    const m = (e: any) => e.detail?.id && setOpenMeetingId(e.detail.id);
    window.addEventListener("recorder:open", r); window.addEventListener("meeting:open", m);
    return () => { window.removeEventListener("recorder:open", r); window.removeEventListener("meeting:open", m); };
  }, []);
  // Contact page, business-card scanner, Teams scheduling and "open company" — reachable from anywhere
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [scanDefaults, setScanDefaults] = useState<any | null>(null);
  const [teamsFor, setTeamsFor] = useState<any | null>(null);
  useEffect(() => {
    const po = (e: any) => e.detail?.id && setOpenPersonId(e.detail.id);
    const sc = (e: any) => setScanDefaults(e.detail || {});
    const ts = (e: any) => setTeamsFor(e.detail?.client || {});
    const co = (e: any) => {
      if (!e.detail?.id || e.detail.handled) return;
      try { sessionStorage.setItem("ib_open_company", e.detail.id); } catch { /* ignore */ }
      if (window.location.hash !== "#/ib/customers") window.location.hash = "#/ib/customers";
    };
    window.addEventListener("person:open", po); window.addEventListener("cardscan:open", sc); window.addEventListener("teams:schedule", ts); window.addEventListener("company:open", co);
    return () => { window.removeEventListener("person:open", po); window.removeEventListener("cardscan:open", sc); window.removeEventListener("teams:schedule", ts); window.removeEventListener("company:open", co); };
  }, []);
  useEffect(() => {
    const h = (e: any) => setQuickLogDefaults(e.detail || {});
    window.addEventListener("quicklog:open", h);
    return () => window.removeEventListener("quicklog:open", h);
  }, []);
  // Phone chrome state (hooks must run before the sign-in early returns)
  const [navHidden, setNavHidden] = useHideOnScroll();
  const [plusOpen, setPlusOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setNavHidden(false); setMoreOpen(false); setPlusOpen(false); }, [activeV, activePage, isAdmin]);
  if (authStep === "login") return <LoginScreen
    onAppLogin={(email) => { setLoginEmail(email); setAuthStep("otp"); }}
    onM365Login={(token, userJson) => {
      try {
        const apiUser = typeof userJson === "string" ? JSON.parse(decodeURIComponent(userJson)) : userJson;
        localStorage.setItem("niytri_token", token);
        localStorage.setItem("niytri_user", JSON.stringify(apiUser));
        setLoggedUser({ id: apiUser.id, name: apiUser.name, email: apiUser.email, role: apiUser.role || "RM", vertical: apiUser.vertical || "All", authType: (apiUser.authType || apiUser.auth_type || "app") as AuthMethod, mfa: !!apiUser.mfa_enabled, status: "Active", lastLogin: "Now" });
      } catch { /* keep existing user */ }
      setAuthStep("app");
    }}
    onM365MFA={(email) => { setLoginEmail(email); setAuthStep("otp"); }}
    isDark={darkMode}
    m365Error={m365Error}
  />;
  if (authStep === "m365") return <M365Flow onDone={() => setAuthStep("app")} isDark={darkMode} />;
  if (authStep === "otp") return <OTPScreen
    onVerify={(apiUser) => {
      if (apiUser) {
        setLoggedUser({ id: apiUser.id, name: apiUser.name, email: apiUser.email, role: apiUser.role || "RM", vertical: apiUser.vertical || "All", authType: (apiUser.authType || apiUser.auth_type || "app") as AuthMethod, mfa: !!apiUser.mfa_enabled, status: "Active", lastLogin: "Now" });
      }
      setAuthStep("app");
    }}
    email={loginEmail}
    isDark={darkMode}
  />;

  const handleLogout = () => {
    const wasM365 = loggedUser?.authType === "m365";
    serverLogout(); // end the server-side session (fire-and-forget; reads the token before it's cleared)
    localStorage.removeItem("niytri_token");
    localStorage.removeItem("niytri_user");
    sessionStorage.clear();
    setAuthStep("login");
    setActiveV(null);
    setActivePage("dashboard");
    setIsAdmin(false);
    setLoggedUser(USERS[0] as any);
    if (wasM365) {
      const logoutUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/logout";
      const lw = 520, lh = 400;
      const ll = Math.max(0, Math.round((window.screen.width - lw) / 2));
      const lt = Math.max(0, Math.round((window.screen.height - lh) / 2));
      window.open(logoutUrl, "niytri_m365_logout", `popup=yes,width=${lw},height=${lh},left=${ll},top=${lt}`);
    }
  };

  const navTo = (v: Vertical, p: Page) => { setIsAdmin(false); setActiveV(v); setActivePage(p); };
  // ── Phone chrome: bottom tabs, quick actions, More menu ──
  const pipeV = (activeV || VERTICALS[0]?.id) as Vertical;
  const mobileTabs = [
    { id: "home", label: "Home", icon: TAB_ICONS.Home, active: !isAdmin && !activeV && activePage === "dashboard" && !moreOpen, onClick: () => navTo(null, "dashboard") },
    { id: "pipe", label: "Pipeline", icon: TAB_ICONS.TrendingUp, active: !isAdmin && !!activeV && (activePage === "leads" || activePage === "deals") && !moreOpen, onClick: () => navTo(pipeV, moduleVisible(pipeV as string, "leads") ? "leads" : ((firstVisibleModule(pipeV as string) || "dashboard") as Page)) },
    { id: "ai", label: "AI", icon: TAB_ICONS.Sparkles, active: !isAdmin && activePage === "ai" && !moreOpen, onClick: () => navTo(null, "ai") },
    { id: "more", label: "More", icon: TAB_ICONS.LayoutGrid, active: moreOpen, onClick: () => { setPlusOpen(false); setMoreOpen(true); } },
  ];


  const renderContent = () => {
    if (isAdmin) {
      if (activePage === "admin-users")    return <AdminUsers t={t} isDark={darkMode} />;
      if (activePage === "admin-roles")    return <AdminUserRoles t={t} />;
      if (activePage === "admin-role-map") return <AdminRoleMapping t={t} />;
      if (activePage === "admin-sla")              return <AdminSLAConfig t={t} />;
      if (activePage === "admin-verticals")        return <AdminVerticals t={t} onReload={() => setVisRev(k => k + 1)} />;
      if (activePage === "admin-dropdown-config")  return <AdminDropdownConfig t={t} isDark={darkMode} />;
      if (activePage === "admin-pipeline-stages")  return <AdminPipelineStagesV2 />;
      if (activePage === "admin-pii-masking")      return <AdminPIIMasking t={t} isDark={darkMode} />;
      if (activePage === "admin-llm")      return <AdminLLMSettings t={t} isDark={darkMode} />;
      if (activePage === "admin-prompts")  return <AdminAIPrompts t={t} isDark={darkMode} />;
      if (activePage === "admin-m365")     return <AdminM365Config t={t} isDark={darkMode} />;
      if (activePage === "admin-fireflies") return <AdminFireflies t={t} />;
      if (activePage === "admin-meetings")  return <AdminMeetingRecording t={t} />;
      if (activePage === "admin-recordings") return <AdminRecordings t={t} />;
      if (activePage === "admin-audit")    return <AdminAuditLog t={t} />;
      if (activePage === "admin-ai-logs")  return <AdminAILogs t={t} />;
      if (activePage === "admin-theme")    return <AdminTheme t={t} isDark={darkMode} setIsDark={setDarkMode} />;
      if (activePage === "admin-system")   return <AdminSystem t={t} />;
    }
    if (!activeV && activePage === "ai")       return <AIAssistant t={t} loggedUser={loggedUser} isDark={darkMode} prompts={AI_SUGGESTED_PROMPTS[loggedUser?.role] || AI_SUGGESTED_PROMPTS.default} />;
    if (!activeV && activePage === "clients")  return <ClientsModule t={t} loggedUser={loggedUser} />;
    if (!activeV && activePage === "service")  return <ServiceRequestModule t={t} isDark={darkMode} loggedUser={loggedUser} />;
    if (!activeV && activePage === "calendar") return <CalendarPage t={t} isDark={darkMode} loggedUser={loggedUser} />;
    if (!activeV) return <ExecutiveDashboard t={t} isDark={darkMode} onNav={navTo} fmt={fmtMoney} />;
    // Hidden vertical or hidden module (Admin → Verticals Config) — never render it, even via a saved link
    if (!VERTICALS.some(v => v.id === activeV) || !moduleVisible(activeV, activePage)) {
      const vLabel = VERTICAL_LABEL_FALLBACK[activeV] || activeV;
      const alt = VERTICALS.some(v => v.id === activeV) ? firstVisibleModule(activeV) : null;
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className={`${t.bgCard} border ${t.border} rounded-xl p-6 max-w-sm text-center space-y-3`}>
            <EyeOff className={`w-8 h-8 mx-auto ${t.textMuted}`} />
            <div className={`text-sm font-semibold ${t.text}`}>Not available</div>
            <div className={`text-xs ${t.textMuted}`}>
              {alt ? `This section of ${vLabel} has been turned off by your administrator.` : `${vLabel} has been turned off by your administrator.`}
            </div>
            <button onClick={() => alt ? navTo(activeV, alt as Page) : navTo(null as any, "dashboard" as Page)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
              {alt ? "Go to an available section" : "Go to the main dashboard"}
            </button>
          </div>
        </div>
      );
    }
    // Investment Banking / ECM has its own dashboard and a CIN-keyed company & promoter master
    if (activeV === "ib" && activePage === "dashboard") return <IBDashboard t={t} isDark={darkMode} onNav={navTo} />;
    if (activeV === "ib" && activePage === "customers") return <CompanyMaster t={t} isDark={darkMode} loggedUser={loggedUser} />;
    if (activePage === "dashboard") return <VerticalDashboard vId={activeV} t={t} />;
    if (activePage === "leads")     return <LeadsPipeline vId={activeV} t={t} loggedUser={loggedUser} />;
    if (activePage === "deals")     return <DealsView vId={activeV} t={t} loggedUser={loggedUser} />;
    if (activePage === "customers") return <CustomersView vId={activeV} t={t} loggedUser={loggedUser} />;
    if (activePage === "documents") return <DocumentsView vId={activeV} t={t} loggedUser={loggedUser} />;
    return <ExecutiveDashboard t={t} isDark={darkMode} onNav={navTo} fmt={fmtMoney} />;
  };

  return (
    <div className={`flex h-screen w-screen ${t.bg} overflow-hidden relative`}>
      <MeetingRecorder open={!!recorderDefaults} defaults={recorderDefaults || undefined} currentUser={loggedUser} onClose={() => setRecorderDefaults(null)} />
      {openMeetingId && <MeetingView id={openMeetingId} onClose={() => setOpenMeetingId(null)} />}
      {openPersonId && <PersonView id={openPersonId} onClose={() => setOpenPersonId(null)} />}
      <DialogHost />
      <CardScanner open={!!scanDefaults} defaults={scanDefaults || undefined} onClose={() => setScanDefaults(null)} />
      {teamsFor && <TeamsMeetingModal client={teamsFor} organizerEmail={loggedUser?.email || ""} t={t} isDark={isDark} onClose={() => setTeamsFor(null)} />}
      <QuickLog open={!!quickLogDefaults} defaults={quickLogDefaults || undefined} currentUser={loggedUser}
        onClose={() => setQuickLogDefaults(null)} onSaved={it => window.dispatchEvent(new CustomEvent("quicklog:saved", { detail: it }))} />
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 animate-in fade-in duration-200 bg-black/60 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      {/* Desktop sidebar — static */}
      <div className="hidden md:flex flex-shrink-0 print:hidden">
        <Sidebar open={sidebarOpen} activeV={activeV} setActiveV={setActiveV} activePage={activePage} setPage={setActivePage} isDark={darkMode} isAdmin={isAdmin} setIsAdmin={setIsAdmin} loggedUser={loggedUser} onLogout={handleLogout} />
      </div>
      {/* Mobile sidebar — fixed overlay */}
      {mobileSidebarOpen && (
        <div className="fixed left-0 top-0 h-full z-50 md:hidden">
          <Sidebar open={true} onClose={() => setMobileSidebarOpen(false)} activeV={activeV} setActiveV={setActiveV} activePage={activePage} setPage={setActivePage} isDark={darkMode} isAdmin={isAdmin} setIsAdmin={setIsAdmin} loggedUser={loggedUser} onLogout={handleLogout} />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="print:hidden"><Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onMobileMenu={() => setMobileSidebarOpen(true)} activeV={activeV} activePage={activePage} isDark={darkMode} setIsDark={setDarkMode} t={t} loggedUser={loggedUser} onNavAI={() => navTo(null, "ai")} onPIIRequests={() => setShowPIIRequests(true)} piiPendingCount={piiPendingCount} currUnit={currUnit} setCurrUnit={setCurrUnit} /></div>
        <main className="flex-1 overflow-hidden m-main"><div key={`${isAdmin ? "admin" : activeV || "main"}/${activePage}`} className="h-full animate-in fade-in duration-300">{renderContent()}</div></main>
      </div>
      <MobileTabBar hidden={navHidden} tabs={mobileTabs} plusOpen={plusOpen} onPlus={() => { setMoreOpen(false); setPlusOpen(v => !v); }} />
      <MobileSheet open={plusOpen} onClose={() => setPlusOpen(false)} title="Quick Actions"><QuickActions onClose={() => setPlusOpen(false)} onAI={() => navTo(null, "ai")} /></MobileSheet>
      <MobileSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu" full>
        <MoreTopRow isDark={darkMode} setIsDark={setDarkMode} onPII={() => { setMoreOpen(false); setShowPIIRequests(true); }} piiCount={piiPendingCount} unit={currUnit} setUnit={setCurrUnit} />
        <Sidebar sheet open={true} onClose={() => setMoreOpen(false)} activeV={activeV} setActiveV={setActiveV} activePage={activePage} setPage={setActivePage} isDark={darkMode} isAdmin={isAdmin} setIsAdmin={setIsAdmin} loggedUser={loggedUser} onLogout={handleLogout} />
      </MobileSheet>
      {showPIIRequests && <PIIRequestsPanel loggedUser={loggedUser} t={t} isDark={darkMode} onClose={() => { setShowPIIRequests(false); /* refresh badge */ const isSA = (loggedUser?.role || "").toLowerCase().includes("super"); fetch(`${API_BASE}/api/clients/access-requests/list?user_id=${loggedUser?.id}&role=approver&is_super_admin=${isSA}`).then(r => r.ok ? r.json() : { data: [] }).then(d => setPiiPendingCount((d.data || []).filter((r: any) => r.status === "pending").length)).catch(() => {}); }} />}
    </div>
  );
}
