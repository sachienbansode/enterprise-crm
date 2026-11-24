import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Bell, PhoneCall, Search, X, RefreshCw, CheckCircle2, Circle, AlarmClock, CalendarDays, Video, TrendingUp, Clock, AlertTriangle,
  ExternalLink, Download, MessageSquarePlus, ChevronDown, Briefcase, History, Users } from "lucide-react";
import { appToast } from "../lib/dialog";
import { openRecord } from "../lib/openRecord";
import { MList, MCard } from "./MobileCard";

// My Workspace — each representative's daily page: everything to do (tasks, opportunity follow-ups, reminders, meetings),
// their open opportunities with the latest update, and one place to record a new update.
const inputCls = "w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (n: number, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return ymd(d); };
const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return ymd(d); };
const fmtDay = (s?: string | null) => s ? new Date(`${String(s).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }) : "No date";
const fmtTime = (s?: string | null) => s ? new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtAgo = (s?: string | null) => { if (!s) return ""; const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
const KIND: Record<string, { label: string; icon: any; tone: string }> = {
  task: { label: "Task", icon: ClipboardList, tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  follow_up: { label: "Follow-up", icon: TrendingUp, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  reminder: { label: "Reminder", icon: Bell, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  meeting: { label: "Meeting", icon: Video, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};
const PRI_TONE: Record<string, string> = { High: "text-red-600 dark:text-red-400", Medium: "text-amber-600 dark:text-amber-400", Low: "text-gray-500" };
const UPDATE_TYPES = ["Call", "Meeting", "Email", "Note", "Site Visit"];
const PRESETS: [string, string][] = [["overdue", "Overdue"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "Next 7 days"], ["month", "This month"], ["open", "All open"], ["custom", "Custom"]];

async function api(path: string, method = "GET", body?: any) {
  const r = await fetch(`/api/workspace${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}
const openRec = (x: { lead_id?: string; deal_id?: string; vertical?: string; deal_code?: string; kind?: string; id?: string; code?: string }) => {
  if (x.kind === "deal" && x.id) return openRecord("deal", { id: x.id, vertical: x.vertical, deal_code: x.code });
  if (x.kind === "lead" && x.id) return openRecord("lead", { id: x.id, vertical: x.vertical });
  if (x.lead_id) return openRecord("lead", { id: x.lead_id, vertical: x.vertical });
  if (x.deal_id) return openRecord("deal", { id: x.deal_id, vertical: x.vertical, deal_code: x.deal_code });
};

export default function WorkspacePage({ t, loggedUser }: { t: any; isDark?: boolean; loggedUser?: any }) {
  const [tab, setTab] = useState<"todo" | "opps" | "updates">("todo");
  const [user, setUser] = useState("");            // team member being viewed (managers); "" = me
  const [team, setTeam] = useState<any[]>([]);
  const [sum, setSum] = useState<any>(null);
  const [opps, setOpps] = useState<any[] | null>(null);
  const [modal, setModal] = useState<null | { kind: "update"; rec?: any; doneTaskId?: string } | { kind: "task" | "reminder"; rec?: any }>(null);
  const [rev, setRev] = useState(0);
  const q = user ? `user=${user}` : "";
  const refresh = () => setRev(r => r + 1);

  useEffect(() => { api("/team").then(d => setTeam(d.data || [])).catch(() => {}); }, []);
  useEffect(() => { api(`/summary?${q}`).then(setSum).catch(e => appToast(e.message, "error")); }, [q, rev]);
  useEffect(() => { api(`/opportunities?${q}`).then(d => setOpps(d.data)).catch(() => setOpps([])); }, [q, rev]);
  const viewingOther = !!sum && sum.user && !sum.user.self;
  const first = String(loggedUser?.name || "").split(" ")[0];
  const hr = new Date().getHours();

  const tiles: [string, any, string, () => void][] = sum ? [
    ["Overdue", sum.overdue, sum.overdue ? "text-red-600 dark:text-red-400" : "", () => { setTab("todo"); window.dispatchEvent(new CustomEvent("ws:preset", { detail: "overdue" })); }],
    ["Due today", sum.today, sum.today ? "text-amber-600 dark:text-amber-400" : "", () => { setTab("todo"); window.dispatchEvent(new CustomEvent("ws:preset", { detail: "today" })); }],
    ["Next 7 days", sum.week, "", () => { setTab("todo"); window.dispatchEvent(new CustomEvent("ws:preset", { detail: "week" })); }],
    ["Meetings today", sum.meetings_today, "", () => { setTab("todo"); window.dispatchEvent(new CustomEvent("ws:preset", { detail: "today" })); }],
    ["Need an update", sum.needs_update, sum.needs_update ? "text-violet-600 dark:text-violet-300" : "", () => { setTab("opps"); window.dispatchEvent(new CustomEvent("ws:attention")); }],
    ["No next action", sum.no_next_action, sum.no_next_action ? "text-violet-600 dark:text-violet-300" : "", () => { setTab("opps"); window.dispatchEvent(new CustomEvent("ws:attention")); }],
  ] : [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`m-toolbar px-4 py-3 border-b ${t.border} flex items-center gap-2 flex-wrap flex-shrink-0`}>
        <div className="m-title mr-auto min-w-0">
          <div className={`text-sm font-bold ${t.text} flex items-center gap-2`}><ClipboardList className={`w-4 h-4 ${t.textMuted}`} />{viewingOther ? `${sum.user.name}'s Workspace` : "My Workspace"}</div>
          <div className={`text-[11px] ${t.textMuted}`}>{viewingOther ? "Viewing a team member — changes you make are recorded under your name" : `Good ${hr < 12 ? "morning" : hr < 17 ? "afternoon" : "evening"}${first ? `, ${first}` : ""} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`}</div>
        </div>
        {team.length > 0 && (
          <label className={`flex items-center gap-1.5 text-xs ${t.textMuted}`}><Users className="w-3.5 h-3.5" />
            <select value={user} onChange={e => setUser(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none max-w-[180px]`}>
              <option value="">My workspace</option>
              {team.filter(u => u.id !== loggedUser?.id).map(u => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
            </select>
          </label>
        )}
        <button onClick={refresh} title="Refresh" className={`text-xs px-2.5 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
        <button onClick={() => setModal({ kind: "reminder" })} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1.5`}><Bell className="w-3.5 h-3.5" /><span className="hidden sm:inline">Reminder</span></button>
        <button onClick={() => setModal({ kind: "task" })} className={`text-xs px-3 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1.5`}><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Task</span></button>
        <button onClick={() => setModal({ kind: "update" })} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white flex items-center gap-1.5"><MessageSquarePlus className="w-3.5 h-3.5" /> Record update</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-4 pb-2">
          {(sum ? tiles : Array.from({ length: 6 }, (_, i) => [String(i), "—", "", () => {}] as any)).map(([l, v, tone, go]: any) => (
            <button key={l} onClick={go} className={`text-left rounded-xl border ${t.border} px-3 py-2 hover:border-blue-400 transition-colors`}>
              <div className={`text-[11px] ${t.textMuted}`}>{sum ? l : ""}</div>
              <div className={`text-lg font-bold ${tone || t.text}`}>{v}</div>
            </button>
          ))}
        </div>
        <div className="px-4 flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {([["todo", "To-do", ClipboardList], ["opps", `Opportunities${opps ? ` (${opps.length})` : ""}`, Briefcase], ["updates", "Updates", History]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${tab === k ? "border-blue-600 text-blue-600 dark:text-blue-400" : `border-transparent ${t.textMuted}`}`}><I className="w-3.5 h-3.5" />{l}</button>
          ))}
        </div>
        {tab === "todo" && <TodoTab t={t} q={q} rev={rev} onChanged={refresh} onUpdate={(rec, doneTaskId) => setModal({ kind: "update", rec, doneTaskId })} />}
        {tab === "opps" && <OppsTab t={t} q={q} rev={rev} onUpdate={rec => setModal({ kind: "update", rec })} onTask={rec => setModal({ kind: "task", rec })} />}
        {tab === "updates" && <UpdatesTab t={t} q={q} rev={rev} />}
      </div>
      {modal?.kind === "update" && <UpdateModal opps={opps || []} rec={modal.rec} doneTaskId={(modal as any).doneTaskId} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {(modal?.kind === "task" || modal?.kind === "reminder") && <TaskModal kind={modal.kind} opps={opps || []} rec={modal.rec} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
    </div>
  );
}

// ─── To-do ─────────────────────────────────────────────────────────────────────
function TodoTab({ t, q, rev, onChanged, onUpdate }: { t: any; q: string; rev: number; onChanged: () => void; onUpdate: (rec: any, doneTaskId?: string) => void }) {
  const [preset, setPreset] = useState("open");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [priority, setPriority] = useState(""); const [vertical, setVertical] = useState(""); const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [snooze, setSnooze] = useState<string | null>(null);
  const [showF, setShowF] = useState(false); // phones: priority / vertical / status / type behind a "Filters" button

  useEffect(() => { const h = (e: any) => { setPreset(e.detail); setStatus("open"); }; window.addEventListener("ws:preset", h); return () => window.removeEventListener("ws:preset", h); }, []);
  const range = useMemo(() => {
    const today = ymd(new Date());
    if (preset === "overdue") return { from: "", to: addDays(-1) };
    if (preset === "today") return { from: today, to: today };
    if (preset === "tomorrow") return { from: addDays(1), to: addDays(1) };
    if (preset === "week") return { from: today, to: addDays(7) };
    if (preset === "month") { const d = new Date(); return { from: ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to: ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }; }
    if (preset === "custom") return { from, to };
    return { from: "", to: "" };
  }, [preset, from, to]);
  const load = useCallback(() => {
    const p = new URLSearchParams(q);
    if (range.from) p.set("from", range.from); if (range.to) p.set("to", range.to);
    if (types.length) p.set("type", types.join(",")); if (priority) p.set("priority", priority); if (vertical) p.set("vertical", vertical);
    p.set("status", status); if (search.trim()) p.set("search", search.trim());
    api(`/todo?${p}`).then(d => setItems(d.items)).catch(e => { setItems([]); appToast(e.message, "error"); });
  }, [q, range, types, priority, vertical, status, search]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load, rev]);
  const verticals = useMemo(() => Array.from(new Set((items || []).map(x => x.vertical).filter(Boolean))).sort(), [items]);

  const today = ymd(new Date()), tomorrow = addDays(1), weekEnd = addDays(7);
  const groups = useMemo(() => {
    const g: [string, string, any[]][] = [["overdue", "Overdue", []], ["today", "Today", []], ["tomorrow", "Tomorrow", []], ["week", "This week", []], ["later", "Later", []], ["none", "No date", []], ["done", "Completed", []]];
    const at = (k: string) => g.find(x => x[0] === k)![2];
    for (const it of items || []) {
      if (it.done) at("done").push(it);
      else if (!it.date) at("none").push(it);
      else if (it.date < today) at("overdue").push(it);
      else if (it.date === today) at("today").push(it);
      else if (it.date === tomorrow) at("tomorrow").push(it);
      else if (it.date <= weekEnd) at("week").push(it);
      else at("later").push(it);
    }
    return g.filter(x => x[2].length);
  }, [items, today, tomorrow, weekEnd]);

  const toggleDone = async (it: any) => {
    if (it.kind === "follow_up") return onUpdate({ kind: "lead", id: it.lead_id, name: it.lead_name, code: it.lead_code, vertical: it.vertical, client_name: it.client_name, next_action: it.title });
    if (it.kind === "meeting") return;
    try {
      await api(`/tasks/${it.id}`, "PATCH", { status: it.done ? "Open" : "Done" });
      appToast(it.done ? "Reopened" : "Done", "success"); onChanged();
      // a task about an opportunity: offer to record what happened
      if (!it.done && it.lead_id) setTimeout(() => appToast("Tip: use Record update to note the outcome and the next step for this opportunity", "info"), 400);
    } catch (e: any) { appToast(e.message, "error"); }
  };
  const moveTo = async (it: any, date: string) => {
    setSnooze(null);
    try {
      if (it.kind === "follow_up") await api(`/followups/${it.lead_id}`, "POST", { next_date: date });
      else if (it.kind === "reminder" && it.time) { const old = new Date(it.time); const nd = new Date(`${date}T00:00:00`); nd.setHours(old.getHours(), old.getMinutes()); await api(`/tasks/${it.id}`, "PATCH", { remind_at: nd.toISOString() }); }
      else await api(`/tasks/${it.id}`, "PATCH", { due_date: date });
      appToast(`Moved to ${fmtDay(date)}`, "success"); onChanged();
    } catch (e: any) { appToast(e.message, "error"); }
  };
  const exportCsv = () => {
    const cols = ["date", "time", "kind", "title", "priority", "lead_code", "lead_name", "client_name", "vertical", "done"];
    const esc = (v: any) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(","), ...(items || []).map(x => cols.map(k => esc(k === "time" ? fmtTime(x.time) : x[k])).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `todo-${today}.csv`; a.click();
  };
  const chip = (on: boolean) => `text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${on ? "bg-blue-600 text-white" : `${t.bgCard2} ${t.textMuted}`}`;

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-1 sm:flex-wrap items-center overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5">
        {PRESETS.map(([k, l]) => <button key={k} onClick={() => { setPreset(k); if (k === "overdue") setStatus("open"); }} className={chip(preset === k)}>{l}</button>)}
        {preset === "custom" && <span className="flex items-center gap-1 ml-1">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={`text-xs px-2 py-1 rounded-lg border ${t.border} ${t.inputBg}`} />
          <span className={`text-xs ${t.textMuted}`}>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={`text-xs px-2 py-1 rounded-lg border ${t.border} ${t.inputBg}`} /></span>}
      </div>
      <div className="flex sm:hidden gap-2">
        <div className={`flex items-center gap-2 ${t.bgCard2} rounded-lg px-3 py-1.5 flex-1`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className={`bg-transparent text-xs ${t.text} outline-none w-full`} />
        </div>
        <button onClick={() => setShowF(v => !v)} className={`text-xs px-3 py-1.5 rounded-lg border ${showF || types.length || priority || vertical || status !== "open" ? "border-blue-600 text-blue-600" : `${t.border} ${t.textMuted}`}`}>Filters{types.length || priority || vertical || status !== "open" ? " •" : ""}</button>
      </div>
      <div className={`${showF ? "flex" : "hidden"} sm:flex gap-2 flex-wrap items-center`}>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(KIND).map(([k, v]) => (
            <button key={k} onClick={() => setTypes(x => x.includes(k) ? x.filter(y => y !== k) : [...x, k])} className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border ${types.includes(k) ? "border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300" : `${t.border} ${t.textMuted}`}`}>
              <v.icon className="w-3 h-3" />{v.label}s</button>
          ))}
        </div>
        <select value={priority} onChange={e => setPriority(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}><option value="">Any priority</option>{["High", "Medium", "Low"].map(x => <option key={x}>{x}</option>)}</select>
        <select value={vertical} onChange={e => setVertical(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}><option value="">All verticals</option>{verticals.map(x => <option key={x}>{x}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}><option value="open">Open</option><option value="done">Completed</option><option value="all">Open + completed</option></select>
        <div className={`hidden sm:flex items-center gap-2 ${t.bgCard2} rounded-lg px-3 py-1.5 flex-1 min-w-40 max-w-xs ml-auto`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search to-dos, clients, opportunities…" className={`bg-transparent text-xs ${t.text} outline-none w-full`} />
          {search && <button onClick={() => setSearch("")} className={t.textMuted}><X className="w-3 h-3" /></button>}
        </div>
        <button onClick={exportCsv} title="Export" className={`text-xs px-2.5 py-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><Download className="w-3.5 h-3.5" /></button>
      </div>
      {!items ? <div className={`text-xs ${t.textMuted} py-8 text-center`}>Loading…</div> : !groups.length ? (
        <div className={`text-sm ${t.textMuted} py-12 text-center flex flex-col items-center gap-2`}><CheckCircle2 className="w-8 h-8 text-emerald-500" />Nothing here{search ? ` for "${search}"` : ""} — all caught up.</div>
      ) : groups.map(([k, label, list]) => (
        <div key={k}>
          <div className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${k === "overdue" ? "text-red-600 dark:text-red-400" : t.textMuted}`}>{k === "overdue" && <AlertTriangle className="w-3.5 h-3.5" />}{label} · {list.length}</div>
          <div className={`rounded-xl border ${t.border} divide-y divide-gray-100 dark:divide-gray-800`}>
            {list.map(it => {
              const K = KIND[it.kind]; const late = !it.done && it.date && it.date < today;
              return (
                <div key={it.key} className={`px-3 py-2.5 flex items-start gap-3 ${it.done ? "opacity-60" : ""}`}>
                  <button onClick={() => toggleDone(it)} disabled={it.kind === "meeting"} title={it.kind === "follow_up" ? "Record what happened and the next step" : it.done ? "Reopen" : "Mark done"} className="pt-0.5 disabled:opacity-30">
                    {it.done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className={`w-5 h-5 ${t.textMuted} hover:text-blue-500`} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${K.tone}`}><K.icon className="w-3 h-3" />{K.label}</span>
                      <span className={`text-sm ${t.text} ${it.done ? "line-through" : ""}`}>{it.title}</span>
                      {it.priority && it.priority !== "Medium" && <span className={`text-[10px] font-semibold ${PRI_TONE[it.priority]}`}>{it.priority}</span>}
                    </div>
                    <div className={`text-[11px] ${t.textMuted} flex flex-wrap gap-x-2`}>
                      <span className={late ? "text-red-600 dark:text-red-400 font-medium" : ""}>{fmtDay(it.date)}{it.time ? ` · ${fmtTime(it.time)}` : ""}</span>
                      {(it.lead_code || it.deal_code) && <button onClick={() => openRec(it)} className="text-blue-600 dark:text-blue-400 hover:underline">{it.lead_code || it.deal_code} {it.lead_name || it.deal_name}</button>}
                      {it.client_name && <span>{it.client_name}</span>}
                      {it.vertical && <span>{it.vertical}</span>}
                    </div>
                    {it.last_update?.text && <div className={`text-[11px] ${t.textMuted} truncate`}>Last update {fmtAgo(it.last_update.occurred_at)}: {it.last_update.text}</div>}
                    {it.notes && <div className={`text-[11px] ${t.textMuted} truncate`}>{it.notes}</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 relative">
                    {it.kind === "meeting" && it.join_url && <a href={it.join_url} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 rounded-lg bg-emerald-600 text-white">Join</a>}
                    {(it.lead_id || it.deal_id) && it.kind !== "meeting" && !it.done && (
                      <button onClick={() => onUpdate(it.lead_id ? { kind: "lead", id: it.lead_id, name: it.lead_name, code: it.lead_code, vertical: it.vertical, client_name: it.client_name, next_action: it.kind === "follow_up" ? it.title : "" }
                        : { kind: "deal", id: it.deal_id, name: it.deal_name, code: it.deal_code, vertical: it.vertical }, it.kind === "task" ? it.id : undefined)}
                        title="Record update" className={`p-1.5 rounded-lg ${t.textMuted} hover:bg-gray-500/10`}><MessageSquarePlus className="w-4 h-4" /></button>
                    )}
                    {!it.done && it.kind !== "meeting" && (
                      <button onClick={() => setSnooze(snooze === it.key ? null : it.key)} title="Move to another day" className={`p-1.5 rounded-lg ${t.textMuted} hover:bg-gray-500/10`}><AlarmClock className="w-4 h-4" /></button>
                    )}
                    {snooze === it.key && (
                      <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1.5 text-sm">
                        {([["Tomorrow", addDays(1)], ["In 3 days", addDays(3)], ["Next Monday", nextMonday()], ["Next week", addDays(7)]] as [string, string][]).map(([l, d]) => (
                          <button key={l} onClick={() => moveTo(it, d)} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-500/10 text-gray-800 dark:text-gray-100 flex justify-between">{l}<span className="text-[11px] text-gray-400">{fmtDay(d)}</span></button>
                        ))}
                        <label className="block px-2.5 py-1.5 text-[11px] text-gray-500">Pick a date
                          <input type="date" min={today} onChange={e => e.target.value && moveTo(it, e.target.value)} className={`${inputCls} mt-1 text-xs py-1`} /></label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── My opportunities ──────────────────────────────────────────────────────────
function OppsTab({ t, q, rev, onUpdate, onTask }: { t: any; q: string; rev: number; onUpdate: (rec: any) => void; onTask: (rec: any) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [search, setSearch] = useState(""); const [vertical, setVertical] = useState(""); const [attention, setAttention] = useState(false); const [sort, setSort] = useState("next");
  const [kind, setKind] = useState("");
  useEffect(() => { const h = () => setAttention(true); window.addEventListener("ws:attention", h); return () => window.removeEventListener("ws:attention", h); }, []);
  useEffect(() => {
    const p = new URLSearchParams(q); if (search.trim()) p.set("search", search.trim()); if (vertical) p.set("vertical", vertical); if (attention) p.set("attention", "1"); p.set("sort", sort);
    const h = setTimeout(() => api(`/opportunities?${p}`).then(d => setRows(d.data)).catch(() => setRows([])), 250);
    return () => clearTimeout(h);
  }, [q, search, vertical, attention, sort, rev]);
  const verticals = useMemo(() => Array.from(new Set((rows || []).map(x => x.vertical))).sort(), [rows]);
  const list = (rows || []).filter(r => !kind || r.kind === kind);
  const today = ymd(new Date());
  const nextCell = (r: any) => {
    const d = r.next_action_date ? String(r.next_action_date).slice(0, 10) : "";
    if (!r.next_action && !d) return <span className="text-amber-600 dark:text-amber-400">No next action</span>;
    return <span className={d && d < today ? "text-red-600 dark:text-red-400" : ""}>{r.next_action || "Follow up"}{d ? ` · ${fmtDay(d)}` : ""}</span>;
  };
  const flagChips = (r: any) => r.flags.map((f: string) => <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded ${f === "overdue" ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{f === "overdue" ? "Follow-up overdue" : f === "stale" ? `No update ${r.idle_days}d` : "No next action"}</span>);
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <div className={`flex items-center gap-2 ${t.bgCard2} rounded-lg px-3 py-1.5 flex-1 min-w-40 max-w-xs`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Opportunity, code, client…" className={`bg-transparent text-xs ${t.text} outline-none w-full`} />
          {search && <button onClick={() => setSearch("")} className={t.textMuted}><X className="w-3 h-3" /></button>}
        </div>
        <select value={kind} onChange={e => setKind(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}><option value="">Opportunities + deals</option><option value="lead">Opportunities</option><option value="deal">Deals</option></select>
        <select value={vertical} onChange={e => setVertical(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}><option value="">All verticals</option>{verticals.map(x => <option key={x}>{x}</option>)}</select>
        <select value={sort} onChange={e => setSort(e.target.value)} className={`text-xs px-2 py-1.5 rounded-lg border ${t.border} ${t.inputBg} outline-none`}><option value="next">Next action date</option><option value="idle">Longest without update</option><option value="name">Name</option></select>
        <button onClick={() => setAttention(a => !a)} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${attention ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300" : `${t.border} ${t.textMuted}`}`}><AlertTriangle className="w-3.5 h-3.5" /> Needs attention</button>
      </div>
      {!rows ? <div className={`text-xs ${t.textMuted} py-8 text-center`}>Loading…</div> : !list.length ? (
        <div className={`text-sm ${t.textMuted} py-12 text-center`}>{attention ? "Every opportunity has a next action and a recent update." : "No open opportunities assigned."}</div>
      ) : (<>
        <MList>
          {list.map(r => (
            <MCard key={`${r.kind}${r.id}`} onClick={() => onUpdate(r)} title={r.name} sub={[r.code, r.client_name, r.stage].filter(Boolean).join(" · ")}
              badge={<span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-600 dark:text-gray-300">{r.kind === "deal" ? "Deal" : "Opportunity"}</span>}
              value={nextCell(r)} chips={flagChips(r)} left={r.last_text ? `${r.last_type || "Update"} ${fmtAgo(r.last_at)}: ${String(r.last_text).slice(0, 60)}` : "No updates yet"} right="" />
          ))}
        </MList>
        <table className="hidden md:table w-full text-xs">
          <thead><tr className={`text-left ${t.textMuted} border-b ${t.border}`}>
            {["Opportunity", "Stage", "Next action", "Latest update", "Idle", ""].map(h => <th key={h} className="px-3 py-2 font-medium uppercase text-[10px] tracking-wide">{h}</th>)}
          </tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={`${r.kind}${r.id}`} className={`border-b ${t.border} ${t.rowHover} align-top`}>
                <td className="px-3 py-2 max-w-[260px]">
                  <button onClick={() => openRec(r)} className="text-left"><div className={`font-medium ${t.text} hover:text-blue-600`}>{r.name}</div></button>
                  <div className={t.textMuted}><span className="font-mono text-blue-500">{r.code}</span>{r.client_name ? ` · ${r.client_name}` : ""} · {r.vertical}{r.kind === "deal" ? " · Deal" : ""}</div>
                  <div className="flex gap-1 flex-wrap mt-1">{flagChips(r)}</div>
                </td>
                <td className={`px-3 py-2 ${t.textMuted} whitespace-nowrap`}>{r.stage}{r.value ? <div>{r.value}</div> : null}</td>
                <td className={`px-3 py-2 ${t.text} max-w-[220px]`}>{nextCell(r)}{r.open_tasks ? <div className={t.textMuted}>{r.open_tasks} open task{r.open_tasks > 1 ? "s" : ""}</div> : null}</td>
                <td className={`px-3 py-2 max-w-[320px] ${t.textMuted}`}>{r.last_text ? <><div className={t.text}>{String(r.last_text).slice(0, 140)}{String(r.last_text).length > 140 ? "…" : ""}</div><div>{r.last_type} · {fmtAgo(r.last_at)}{r.last_by ? ` · ${r.last_by}` : ""}</div></> : "No updates yet"}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${r.idle_days >= 14 ? "text-amber-600 dark:text-amber-400" : t.textMuted}`}>{r.idle_days}d</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => onUpdate(r)} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white flex items-center gap-1"><MessageSquarePlus className="w-3.5 h-3.5" /> Update</button>
                    <button onClick={() => onTask(r)} title="Add a task" className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><Plus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openRec(r)} title="Open" className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted}`}><ExternalLink className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>)}
    </div>
  );
}

// ─── Updates (history) ─────────────────────────────────────────────────────────
function UpdatesTab({ t, q, rev }: { t: any; q: string; rev: number }) {
  const [rows, setRows] = useState<any[] | null>(null); const [search, setSearch] = useState(""); const [from, setFrom] = useState(addDays(-30)); const [to, setTo] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(q); if (search.trim()) p.set("search", search.trim()); if (from) p.set("from", from); if (to) p.set("to", to);
    const h = setTimeout(() => api(`/updates?${p}`).then(d => setRows(d.data)).catch(() => setRows([])), 250); return () => clearTimeout(h);
  }, [q, search, from, to, rev]);
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <div className={`flex items-center gap-2 ${t.bgCard2} rounded-lg px-3 py-1.5 flex-1 min-w-40 max-w-xs`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search updates…" className={`bg-transparent text-xs ${t.text} outline-none w-full`} />
        </div>
        <span className={`text-xs ${t.textMuted} flex items-center gap-1`}><CalendarDays className="w-3.5 h-3.5" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={`text-xs px-2 py-1 rounded-lg border ${t.border} ${t.inputBg}`} /> to
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={`text-xs px-2 py-1 rounded-lg border ${t.border} ${t.inputBg}`} /></span>
      </div>
      {!rows ? <div className={`text-xs ${t.textMuted} py-8 text-center`}>Loading…</div> : !rows.length ? <div className={`text-sm ${t.textMuted} py-12 text-center`}>No updates in this period.</div> : (
        <div className={`rounded-xl border ${t.border} divide-y divide-gray-100 dark:divide-gray-800`}>
          {rows.map(u => (
            <div key={u.id} className="px-3 py-2.5">
              <div className={`text-[11px] ${t.textMuted} flex flex-wrap gap-x-2`}>
                <span className="font-semibold">{u.type}</span><span>{new Date(u.occurred_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {(u.lead_code || u.deal_code) && <button onClick={() => openRec(u)} className="text-blue-600 dark:text-blue-400 hover:underline">{u.lead_code || u.deal_code} {u.lead_name || u.deal_name}</button>}
                {u.client_name && <span>{u.client_name}</span>}{u.created_by_name && <span>· {u.created_by_name}</span>}
              </div>
              <div className={`text-sm ${t.text} whitespace-pre-wrap`}>{u.opportunity_update || u.summary || u.title}</div>
              {u.next_follow_up && <div className={`text-[11px] ${t.textMuted}`}>Next follow-up {fmtDay(u.next_follow_up)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────
function Shell({ title, onClose, children, footer }: any) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/55 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-lg bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 min-w-0 font-semibold text-gray-900 dark:text-white">{title}</div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}
const L = ({ label, children }: any) => <label className="block"><span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</span>{children}</label>;

/** Pick one of my opportunities / deals (type to search). */
function OppPicker({ opps, value, onChange }: { opps: any[]; value: any; onChange: (r: any) => void }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const list = opps.filter(o => !q || `${o.code} ${o.name} ${o.client_name || ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  if (value) return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1"><div className="text-gray-900 dark:text-white truncate">{value.name}</div><div className="text-[11px] text-gray-500">{[value.code, value.client_name, value.vertical].filter(Boolean).join(" · ")}</div></div>
      <button onClick={() => onChange(null)} className="text-[11px] text-blue-600">Change</button>
    </div>
  );
  return (
    <div className="relative">
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} className={inputCls} placeholder="Search my opportunities and deals" />
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-60 overflow-y-auto">
          {!list.length && <div className="px-3 py-2 text-xs text-gray-500">No match among your open opportunities</div>}
          {list.map(o => <button key={`${o.kind}${o.id}`} onMouseDown={() => { onChange(o); setQ(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-500/10 text-gray-800 dark:text-gray-100">
            {o.name} <span className="text-[11px] text-gray-500">{o.code}{o.client_name ? ` · ${o.client_name}` : ""}{o.kind === "deal" ? " · Deal" : ""}</span></button>)}
        </div>
      )}
    </div>
  );
}

function UpdateModal({ opps, rec, doneTaskId, onClose, onSaved }: { opps: any[]; rec?: any; doneTaskId?: string; onClose: () => void; onSaved: () => void }) {
  const [sel, setSel] = useState<any>(rec || null);
  const [type, setType] = useState("Call"); const [text, setText] = useState("");
  const [next, setNext] = useState(""); const [date, setDate] = useState(addDays(3)); const [mkTask, setMkTask] = useState(false); const [noNext, setNoNext] = useState(false);
  const [hist, setHist] = useState<any[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!sel) { setHist([]); return; }
    // keep the current next action as the starting point
    const cur = opps.find(o => o.kind === (sel.kind || "lead") && o.id === sel.id) || sel;
    setNext(""); setDate(addDays(3));
    if (cur.next_action) setNext("");
    fetch(`/api/workspace/updates?${sel.kind === "deal" ? "deal_id" : "lead_id"}=${sel.id}`).then(r => r.json()).then(d => setHist((d.data || []).slice(0, 4))).catch(() => setHist([]));
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = sel ? (opps.find(o => o.kind === (sel.kind || "lead") && o.id === sel.id) || sel) : null;
  const save = async () => {
    if (!sel) return appToast("Choose the opportunity", "error");
    if (!text.trim()) return appToast("Write what happened", "error");
    if (!noNext && !next.trim()) return appToast("Add the next action, or tick 'No next action'", "error");
    setBusy(true);
    try {
      await api("/update", "POST", { [sel.kind === "deal" ? "deal_id" : "lead_id"]: sel.id, type, update: text, next_action: noNext ? null : next, next_date: noNext ? null : date, create_task: mkTask, no_next: noNext, done_task_id: doneTaskId });
      appToast("Update recorded", "success"); onSaved();
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <Shell title="Record update" onClose={onClose} footer={<>
      <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
      <button onClick={save} disabled={busy} className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">{busy && <RefreshCw className="w-4 h-4 animate-spin" />}Save update</button></>}>
      <L label="Opportunity / deal"><OppPicker opps={opps} value={sel} onChange={setSel} /></L>
      {cur && (cur.next_action || cur.next_action_date) && <div className="text-[11px] text-gray-500">Current next action: <b className="text-gray-700 dark:text-gray-200">{cur.next_action || "Follow up"}</b>{cur.next_action_date ? ` · ${fmtDay(String(cur.next_action_date).slice(0, 10))}` : ""}</div>}
      <div className="flex gap-1 flex-wrap">{UPDATE_TYPES.map(x => <button key={x} onClick={() => setType(x)} className={`text-xs px-2.5 py-1 rounded-full ${type === x ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>{x === "Call" ? <PhoneCall className="w-3 h-3 inline mr-1" /> : null}{x}</button>)}</div>
      <L label="What happened *"><textarea rows={3} value={text} onChange={e => setText(e.target.value)} className={inputCls} placeholder="e.g. Spoke to the CFO — interested in a QIP in Q4; wants our fee proposal" autoFocus /></L>
      {!noNext && <>
        <L label="Next action *"><input value={next} onChange={e => setNext(e.target.value)} className={inputCls} placeholder={cur?.next_action ? `e.g. ${cur.next_action}` : "e.g. Send fee proposal"} /></L>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <L label="By when"><input type="date" value={date} min={ymd(new Date())} onChange={e => setDate(e.target.value)} className={inputCls} /></L>
          <div className="flex gap-1 pb-0.5">{([["Tomorrow", 1], ["+3d", 3], ["+1w", 7], ["+2w", 14]] as [string, number][]).map(([l, n]) => <button key={l} onClick={() => setDate(addDays(n))} className={`text-[11px] px-2 py-1.5 rounded-lg ${date === addDays(n) ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>{l}</button>)}</div>
        </div>
        {sel?.kind !== "deal" && <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={mkTask} onChange={e => setMkTask(e.target.checked)} /> Also add it to my to-do list as a task</label>}
      </>}
      {sel?.kind !== "deal" && <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={noNext} onChange={e => setNoNext(e.target.checked)} /> No next action (clears the follow-up)</label>}
      {doneTaskId && <div className="text-[11px] text-emerald-600">The task you started from will be marked done.</div>}
      {hist.length > 0 && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-2.5 space-y-1.5">
          <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Earlier updates</div>
          {hist.map(h => <div key={h.id} className="text-[12px] text-gray-700 dark:text-gray-300"><span className="text-gray-400">{h.type} · {fmtAgo(h.occurred_at)}{h.created_by_name ? ` · ${h.created_by_name}` : ""}:</span> {h.opportunity_update || h.summary || h.title}</div>)}
        </div>
      )}
    </Shell>
  );
}

function TaskModal({ kind, opps, rec, onClose, onSaved }: { kind: "task" | "reminder"; opps: any[]; rec?: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(""); const [notes, setNotes] = useState(""); const [date, setDate] = useState(kind === "task" ? addDays(1) : ymd(new Date()));
  const [time, setTime] = useState(() => { const d = new Date(Date.now() + 3600000); return `${String(d.getHours()).padStart(2, "0")}:00`; });
  const [priority, setPriority] = useState("Medium"); const [sel, setSel] = useState<any>(rec || null); const [busy, setBusy] = useState(false); const [more, setMore] = useState(!!rec);
  const save = async () => {
    if (!title.trim()) return appToast(kind === "task" ? "What's the task?" : "What should we remind you about?", "error");
    setBusy(true);
    try {
      const link = sel ? { [sel.kind === "deal" ? "deal_id" : "lead_id"]: sel.id, client_id: sel.client_id, vertical: sel.vertical } : {};
      if (kind === "reminder") await api("/reminders", "POST", { title, notes, remind_at: new Date(`${date}T${time}:00`).toISOString(), priority, ...link });
      else {
        const r = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, due_date: date, priority, ...link }) });
        const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Could not save");
        if (notes.trim()) await api(`/tasks/${d.id}`, "PATCH", { notes });
      }
      appToast(kind === "task" ? "Task added" : `Reminder set for ${fmtDay(date)} ${time}`, "success"); onSaved();
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <Shell title={kind === "task" ? "New task" : "New reminder"} onClose={onClose} footer={<>
      <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
      <button onClick={save} disabled={busy} className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50">{kind === "task" ? "Add task" : "Set reminder"}</button></>}>
      <L label={kind === "task" ? "Task *" : "Remind me to *"}><input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} autoFocus placeholder={kind === "task" ? "e.g. Share pitch deck" : "e.g. Call back the CFO"} /></L>
      <div className="grid grid-cols-2 gap-2">
        <L label={kind === "task" ? "Due date" : "Date"}><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></L>
        {kind === "reminder" ? <L label="Time"><input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} /></L>
          : <L label="Priority"><select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>{["High", "Medium", "Low"].map(x => <option key={x}>{x}</option>)}</select></L>}
      </div>
      <button onClick={() => setMore(m => !m)} className="text-xs text-blue-600 flex items-center gap-1"><ChevronDown className={`w-3.5 h-3.5 transition-transform ${more ? "rotate-180" : ""}`} /> Link to an opportunity, notes</button>
      {more && <>
        <L label="Opportunity / deal (optional)"><OppPicker opps={opps} value={sel} onChange={setSel} /></L>
        <L label="Notes"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} /></L>
        {kind === "reminder" && <L label="Priority"><select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>{["High", "Medium", "Low"].map(x => <option key={x}>{x}</option>)}</select></L>}
      </>}
      {kind === "reminder" && <div className="text-[11px] text-gray-500 flex items-center gap-1"><Bell className="w-3 h-3" /> You'll get a notification at that time; it also shows in your to-do list.</div>}
    </Shell>
  );
}
