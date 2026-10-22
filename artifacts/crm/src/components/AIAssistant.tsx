import { fmtINR, fmtINRStr, fmtAxisINR, useCurrUnit } from "../lib/money";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Sparkles, Send, Loader2, Plus, MessageSquare, Trash2, Search, Copy, Check, History, X, Database, BarChart3, Pencil } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { appConfirm, appToast } from "../lib/dialog";

// NIYTRI AI — chat assistant over CRM data (role-scoped on the server).
// Saved conversations (last 5 in the sidebar, all searchable), and answers with key figures, charts, tables and analysis.

type Msg = { id: string; from: "user" | "ai"; text: string; at?: string; recordCount?: number | null; sourceLabel?: string; followUps?: string[]; pending?: boolean };
type Conv = { id: string; title: string; updated_at: string; questions: number; preview?: string };

const PALETTE = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#db2777", "#0891b2", "#65a30d", "#dc2626"];
const inr = (n: number) => fmtINR(n);
// ₹ amounts written by the AI ("₹15,900 Cr", "₹85 L") follow the header unit too
const unitText = (x: string) => x.replace(/₹\s?[\d,]*\.?\d+\s?(?:Cr|crore|L|lakh|M|Mn)?\b/g, m => fmtINRStr(m));
const fmtBy = (f?: string) => (v: any) => { const n = Number(v); if (!isFinite(n)) return String(v); return f === "inr" ? inr(n) : f === "percent" ? `${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%` : n.toLocaleString("en-IN", { maximumFractionDigits: 2 }); };
const ago = (d?: string) => {
  if (!d) return ""; const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : m < 10080 ? `${Math.round(m / 1440)} d ago` : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// ─── Markdown (headings, bold, lists, tables) ───
function mdToHtml(text: string): string {
  text = unitText(text);
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (x: string) => esc(x).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-violet-500/15 text-[0.9em]">$1</code>');
  const lines = text.replace(/\r/g, "").split("\n"); let out = ""; let i = 0;
  while (i < lines.length) {
    const tr = lines[i].trim();
    if (/^\|.*\|$/.test(tr)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(lines[i].trim().slice(1, -1).split("|").map(c => c.trim())); i++; }
      const hasHead = rows.length > 1 && rows[1].every(c => /^:?-{2,}:?$/.test(c));
      const body = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c)));
      const head = hasHead ? body.shift() : null;
      const num = (c: string) => /^[₹\-+]?[\d,.]+\s*(Cr|L|%|K|d)?$/.test(c.replace(/<[^>]+>/g, ""));
      out += '<div class="overflow-x-auto my-2.5 rounded-xl border border-current/10"><table class="w-full text-[12.5px] border-collapse">';
      if (head) out += '<thead class="bg-current/[0.04]"><tr>' + head.map(c => `<th class="text-left font-semibold px-3 py-2 border-b border-current/10 whitespace-nowrap opacity-80">${inline(c)}</th>`).join("") + "</tr></thead>";
      out += "<tbody>" + body.map(r => '<tr class="border-b border-current/5 last:border-0 hover:bg-current/[0.03]">' + r.map(c => `<td class="px-3 py-1.5 align-top ${num(c) ? "text-right whitespace-nowrap tabular-nums" : ""}">${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
      continue;
    }
    if (/^#{1,4}\s/.test(tr)) { const lvl = tr.match(/^#+/)![0].length; out += `<div class="${lvl <= 2 ? "text-[15px]" : "text-[13.5px]"} font-semibold mt-3 mb-1">${inline(tr.replace(/^#+\s*/, ""))}</div>`; i++; continue; }
    if (/^([-*•])\s+/.test(tr)) { out += '<ul class="list-disc pl-5 my-1.5 space-y-1">'; while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) { out += `<li>${inline(lines[i].trim().replace(/^[-*•]\s+/, ""))}</li>`; i++; } out += "</ul>"; continue; }
    if (/^\d+[.)]\s+/.test(tr)) { out += '<ol class="list-decimal pl-5 my-1.5 space-y-1">'; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { out += `<li>${inline(lines[i].trim().replace(/^\d+[.)]\s+/, ""))}</li>`; i++; } out += "</ol>"; continue; }
    if (/^---+$/.test(tr)) { out += '<hr class="my-2 border-current/10"/>'; i++; continue; }
    if (!tr) { i++; continue; }
    out += `<p class="my-1.5">${inline(tr)}</p>`; i++;
  }
  return out;
}

// Split an answer into text / chart / kpi parts
function parts(text: string): { kind: "md" | "chart" | "kpi"; body: string }[] {
  const out: { kind: "md" | "chart" | "kpi"; body: string }[] = [];
  const re = /```(chart|kpi)\s*\n([\s\S]*?)```/g; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ kind: "md", body: text.slice(last, m.index) });
    out.push({ kind: m[1] as any, body: m[2].trim() }); last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "md", body: text.slice(last) });
  return out;
}

function Kpis({ body }: { body: string }) {
  let items: any[] = []; try { items = JSON.parse(body); } catch { return null; }
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div className={`grid gap-2 my-2.5 ${items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : items.length === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
      {items.slice(0, 4).map((k, i) => (
        <div key={i} className="rounded-xl border border-current/10 bg-gradient-to-br from-violet-500/[0.07] to-transparent px-3 py-2.5 animate-in fade-in zoom-in-95 duration-300" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="text-[10px] uppercase tracking-wide opacity-60 truncate">{String(k.label || "")}</div>
          <div className="text-[15px] sm:text-[17px] font-bold mt-0.5 leading-tight break-words">{unitText(String(k.value ?? ""))}</div>
          {k.sub && <div className="text-[11px] opacity-60 leading-snug">{String(k.sub)}</div>}
        </div>
      ))}
    </div>
  );
}

function AIChart({ body, dark }: { body: string; dark: boolean }) {
  let c: any = null; try { c = JSON.parse(body); } catch { return null; }
  if (!c || !Array.isArray(c.data) || !c.data.length) return null;
  const x = c.x || "name";
  const series: { key: string; label?: string; format?: string }[] = (Array.isArray(c.series) && c.series.length ? c.series : [{ key: "value" }]).slice(0, 3);
  const f = fmtBy(series[0].format);
  const axis = { fontSize: 11, fill: dark ? "#9ca3af" : "#6b7280" };
  const grid = dark ? "#1f2937" : "#e5e7eb";
  const tip = { contentStyle: { background: dark ? "#111827" : "#fff", border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12 }, formatter: (v: any, n: any) => [f(v), n] as any };
  const type = String(c.type || "bar");
  const h = type === "hbar" ? Math.min(380, 36 + c.data.length * 30) : 240;
  const label = (s: any) => s.label || s.key;
  const narrow = typeof window !== "undefined" && window.innerWidth < 640;
  // Short axis ticks: ₹16K Cr, ₹4.2 Cr, 12K, 40%
  const tickF = (v: any) => { const n = Number(v); if (!isFinite(n)) return String(v); const fm = series[0].format;
    const k = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}K` : m.toLocaleString("en-IN", { maximumFractionDigits: 1 }));
    if (fm === "inr") return fmtAxisINR(n);
    return fm === "percent" ? `${n}%` : k(n); };
  const xTick = (v: any) => { const t = String(v ?? ""); const max = narrow ? (c.data.length > 2 ? 9 : 14) : c.data.length > 4 ? 12 : 24; return t.length > max ? t.slice(0, max - 1) + "…" : t; };
  let chart: any;
  if (type === "pie") {
    const s = series[0];
    chart = (
      <PieChart>
        <Pie data={c.data} dataKey={s.key} nameKey={x} innerRadius="50%" outerRadius="82%" paddingAngle={2} labelLine={false}
          label={(e: any) => { if (e.percent < 0.06) return null; const r = e.innerRadius + (e.outerRadius - e.innerRadius) / 2, a = -e.midAngle * Math.PI / 180;
            return <text x={e.cx + r * Math.cos(a)} y={e.cy + r * Math.sin(a)} fill="#fff" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">{Math.round(e.percent * 100)}%</text>; }}>
          {c.data.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    );
  } else if (type === "line" || type === "area") {
    const C: any = type === "line" ? LineChart : AreaChart;
    chart = (
      <C data={c.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} tickFormatter={xTick} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={tickF} width={narrow ? 62 : 66} />
        <Tooltip {...tip} />{series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s, i) => type === "line"
          ? <Line key={s.key} type="monotone" dataKey={s.key} name={label(s)} stroke={PALETTE[i]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          : <Area key={s.key} type="monotone" dataKey={s.key} name={label(s)} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.18} strokeWidth={2} />)}
      </C>
    );
  } else {
    const horizontal = type === "hbar";
    chart = (
      <BarChart data={c.data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 8 : 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={tickF} /> : <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} interval={narrow && c.data.length > 6 ? "preserveStartEnd" : 0} tickFormatter={xTick} />}
        {horizontal ? <YAxis type="category" dataKey={x} tick={axis} tickLine={false} axisLine={false} width={narrow ? 92 : 130} tickFormatter={xTick} /> : <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={tickF} width={narrow ? 62 : 66} />}
        <Tooltip {...tip} cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} />{series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={label(s)} stackId={type === "stacked" ? "a" : undefined} fill={PALETTE[i]} radius={type === "stacked" ? 0 : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={44} />)}
      </BarChart>
    );
  }
  return (
    <div className="my-3 rounded-xl border border-current/10 p-3 animate-in fade-in slide-in-from-bottom-1 duration-500">
      {c.title && <div className="text-[12.5px] font-semibold mb-2 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-violet-500" />{String(c.title)}</div>}
      <div style={{ height: h }}><ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer></div>
    </div>
  );
}

function Answer({ text, dark }: { text: string; dark: boolean }) {
  const ps = useMemo(() => parts(text), [text]);
  return <>{ps.map((p, i) => p.kind === "chart" ? <AIChart key={i} body={p.body} dark={dark} /> : p.kind === "kpi" ? <Kpis key={i} body={p.body} /> : <div key={i} dangerouslySetInnerHTML={{ __html: mdToHtml(p.body) }} />)}</>;
}

export default function AIAssistant({ t, loggedUser, isDark, prompts }: { t: any; loggedUser: any; isDark: boolean; prompts: string[] }) {
  useCurrUnit();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [totalConvs, setTotalConvs] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [hq, setHq] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const first = (loggedUser?.name || "").split(" ")[0];

  const loadConvs = useCallback(() => {
    const p = new URLSearchParams({ limit: showAll || hq ? "50" : "5", q: hq });
    fetch(`/api/ai/conversations?${p}`).then(r => r.json()).then(d => { setConvs(d.rows || []); setTotalConvs(d.total || 0); }).catch(() => {});
  }, [showAll, hq]);
  useEffect(() => { const h = setTimeout(loadConvs, hq ? 250 : 0); return () => clearTimeout(h); }, [loadConvs]);
  useEffect(() => { fetch("/api/ai/config").then(r => r.json()).then(c => setConfigured(!!(c?.enabled && c?.has_api_key))).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);
  useEffect(() => { const el = inputRef.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(160, el.scrollHeight) + "px"; } }, [input]);

  const open = async (id: string) => {
    setDrawer(false);
    const d = await fetch(`/api/ai/conversations/${id}`).then(r => r.json()).catch(() => null);
    if (!d?.messages) return appToast("Couldn't open that chat", "error");
    setConvId(id); setTitle(d.title); setMessages(d.messages);
  };
  const newChat = () => { setConvId(null); setTitle(""); setMessages([]); setInput(""); setDrawer(false); setTimeout(() => inputRef.current?.focus(), 50); };
  const del = async (c: Conv) => {
    if (!(await appConfirm({ title: "Delete this chat?", message: `"${c.title}" will be removed from your history.`, confirmLabel: "Delete", tone: "danger" }))) return;
    await fetch(`/api/ai/conversations/${c.id}`, { method: "DELETE" });
    if (c.id === convId) newChat();
    loadConvs();
  };
  const rename = async (id: string, v: string) => {
    setRenaming(null); if (!v.trim()) return;
    await fetch(`/api/ai/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: v.trim() }) });
    if (id === convId) setTitle(v.trim()); loadConvs();
  };

  const send = async (text: string) => {
    const q = text.trim(); if (!q || busy) return;
    const now = new Date().toISOString();
    setMessages(m => [...m, { id: `u${Date.now()}`, from: "user", text: q, at: now }, { id: "pending", from: "ai", text: "", pending: true }]);
    setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, conversation_id: convId }) });
      const d = await r.json().catch(() => ({}));
      if (d.configured === false) setConfigured(false);
      const ans: Msg = { id: `a${Date.now()}`, from: "ai", text: d.response || "I'm having trouble connecting right now. Please try again in a moment.", at: new Date().toISOString(), recordCount: d.recordCount ?? null, sourceLabel: d.sourceLabel, followUps: d.followUps };
      setMessages(m => [...m.filter(x => x.id !== "pending"), ans]);
      if (d.conversation_id && d.conversation_id !== convId) { setConvId(d.conversation_id); setTitle(q.slice(0, 80)); }
      loadConvs();
    } catch {
      setMessages(m => [...m.filter(x => x.id !== "pending"), { id: `e${Date.now()}`, from: "ai", text: "I couldn't reach the CRM server. Please check your connection and try again." }]);
    } finally { setBusy(false); }
  };
  const copy = (m: Msg) => navigator.clipboard?.writeText(m.text.replace(/```(chart|kpi)[\s\S]*?```/g, "").trim()).then(() => { setCopied(m.id); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  const lastAi = [...messages].reverse().find(m => m.from === "ai" && !m.pending);
  const nextQs = lastAi?.followUps?.length ? lastAi.followUps : [];

  const History_ = (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3">
        <button onClick={newChat} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md"><Plus className="w-4 h-4" /> New chat</button>
        <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border ${t.border} ${t.bgCard}`}>
          <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
          <input value={hq} onChange={e => setHq(e.target.value)} placeholder="Search chats" className={`bg-transparent text-xs ${t.text} outline-none w-full`} aria-label="Search chats" />
        </div>
      </div>
      <div className="px-3 flex items-center justify-between">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>{hq ? "Results" : showAll ? "All chats" : "Recent chats"}</div>
        {!hq && totalConvs > 5 && <button onClick={() => setShowAll(v => !v)} className="text-[11px] text-violet-500 hover:underline">{showAll ? "Show recent" : `View all (${totalConvs})`}</button>}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
        {convs.map(c => (
          <div key={c.id} className={`group relative rounded-lg transition-colors ${c.id === convId ? "bg-violet-500/15" : "hover:bg-gray-500/10"}`}>
            {renaming === c.id ? (
              <input autoFocus defaultValue={c.title} onBlur={e => rename(c.id, e.target.value)} onKeyDown={e => { if (e.key === "Enter") rename(c.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setRenaming(null); }}
                className={`w-full text-xs px-2.5 py-2 rounded-lg border ${t.inputBg}`} aria-label="Chat name" />
            ) : (
              <button onClick={() => open(c.id)} className="w-full text-left px-2.5 py-2 pr-14">
                <div className={`text-xs font-medium truncate flex items-center gap-1.5 ${c.id === convId ? "text-violet-600 dark:text-violet-300" : t.text}`}><MessageSquare className="w-3 h-3 flex-shrink-0 opacity-60" />{c.title}</div>
                <div className={`text-[10px] ${t.textMuted} mt-0.5 truncate`}>{ago(c.updated_at)} · {c.questions} question{c.questions === 1 ? "" : "s"}</div>
              </button>
            )}
            {renaming !== c.id && (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button onClick={() => setRenaming(c.id)} aria-label="Rename chat" className={`p-1 rounded ${t.textMuted} hover:text-violet-500`}><Pencil className="w-3 h-3" /></button>
                <button onClick={() => del(c)} aria-label="Delete chat" className={`p-1 rounded ${t.textMuted} hover:text-red-500`}><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        ))}
        {!convs.length && <div className={`text-[11px] ${t.textMuted} px-2.5 py-3`}>{hq ? "No chats match." : "Your chats will appear here."}</div>}
      </div>
      <div className="p-3 space-y-2">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Try asking</div>
        {prompts.slice(0, 4).map(p => <button key={p} onClick={() => { setDrawer(false); send(p); }} disabled={busy} className={`w-full text-left text-[11.5px] px-2.5 py-1.5 rounded-lg ${t.textSub} hover:bg-violet-500/10 hover:text-violet-500 transition-colors disabled:opacity-50`}>{p}</button>)}
        <div className={`rounded-xl ${t.bgCard2} px-3 py-2 text-[10.5px] ${t.textMuted}`}>
          <div className={`font-semibold ${t.text}`}>{loggedUser?.role}</div>
          <div>Data access: {loggedUser?.vertical || "All"}</div>
          <div className={configured ? "text-emerald-500" : "text-amber-500"}>{configured ? "● AI connected" : "● Not configured (Admin → LLM Settings)"}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={`hidden md:flex w-64 border-r ${t.border} flex-shrink-0 flex-col`}>{History_}</aside>
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 animate-in fade-in duration-200" onClick={() => setDrawer(false)}>
          <div onClick={e => e.stopPropagation()} className={`absolute inset-y-0 left-0 w-[84%] max-w-xs ${t.bgCard} shadow-2xl animate-in slide-in-from-left-10 duration-300`}>
            <div className="flex justify-end p-2"><button onClick={() => setDrawer(false)} aria-label="Close" className={`p-1.5 ${t.textMuted}`}><X className="w-4 h-4" /></button></div>
            {History_}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className={`px-4 py-2.5 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
          <button onClick={() => setDrawer(true)} className={`md:hidden p-1.5 rounded-lg ${t.textMuted}`} aria-label="Chat history"><History className="w-5 h-5" /></button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4 text-white" /></div>
          <div className="min-w-0">
            <div className={`text-sm font-bold ${t.text} truncate`}>{title || "NIYTRI AI"}</div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>Answers from live CRM data you can access · {loggedUser?.role}</div>
          </div>
          {messages.length > 0 && <button onClick={newChat} aria-label="New chat" className={`ml-auto flex-shrink-0 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg border ${t.border} ${t.textSub} flex items-center gap-1.5 hover:border-violet-500/60`}><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New chat</span></button>}
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10 animate-in fade-in duration-500">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20"><Bot className="w-7 h-7 text-white" /></div>
              <div className={`text-xl font-semibold ${t.text}`}>Hello{first ? `, ${first}` : ""}</div>
              <div className={`text-sm ${t.textMuted} mt-1 max-w-md`}>Ask about pipeline, clients, service requests, tasks or meetings. Answers come with figures, charts and what to do next.</div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {prompts.slice(0, 4).map((p, i) => (
                  <button key={p} onClick={() => send(p)} className={`group text-left text-[13px] px-4 py-3 rounded-xl border ${t.border} ${t.bgCard} ${t.text} hover:border-violet-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all animate-in fade-in slide-in-from-bottom-2`} style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}>
                    {p}<div className={`text-[11px] ${t.textMuted} mt-0.5 group-hover:text-violet-500`}>Ask →</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
              {messages.map(m => m.from === "user" ? (
                <div key={m.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-violet-600 text-white text-[13.5px] whitespace-pre-wrap">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-white" /></div>
                  <div className="min-w-0 flex-1">
                    {m.pending ? (
                      <div className={`flex items-center gap-2 text-[12.5px] ${t.textMuted} py-1.5`}>
                        <Database className="w-3.5 h-3.5 animate-pulse text-violet-500" /> Analysing your CRM data
                        <span className="flex gap-1">{[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span>
                      </div>
                    ) : (<>
                      <div className={`text-[13.5px] leading-relaxed ${t.text}`}><Answer text={m.text} dark={isDark} /></div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <button onClick={() => copy(m)} className={`text-[10.5px] px-2 py-0.5 rounded-full border ${t.border} ${t.textMuted} hover:text-violet-500 flex items-center gap-1`}>{copied === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied === m.id ? "Copied" : "Copy"}</button>
                        {m.sourceLabel && <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${t.border} ${t.textMuted}`}>{m.sourceLabel}</span>}
                        {typeof m.recordCount === "number" && <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${t.border} ${t.textMuted}`}>Based on {m.recordCount} record{m.recordCount === 1 ? "" : "s"}</span>}
                      </div>
                    </>)}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className={`border-t ${t.border} px-4 pt-3 pb-3 flex-shrink-0`}>
          <div className="max-w-3xl mx-auto">
            {nextQs.length > 0 && !busy && (
              <div className="flex gap-2 mb-2 flex-wrap animate-in fade-in duration-300">
                {nextQs.map(p => <button key={p} onClick={() => send(p)} className={`text-[11.5px] px-3 py-1 rounded-full border ${t.border} ${t.textSub} hover:border-violet-500/60 hover:text-violet-500 transition-colors`}>{p}</button>)}
              </div>
            )}
            <div className={`flex gap-2 items-end ${t.bgCard} rounded-2xl border ${t.border} px-3 py-2 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/15 transition-all`}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1}
                placeholder="Ask about clients, pipeline, SRs, tasks… (Shift+Enter for a new line)" className={`flex-1 bg-transparent text-sm ${t.text} outline-none resize-none leading-relaxed py-1`} aria-label="Message" />
              <button onClick={() => send(input)} disabled={!input.trim() || busy} aria-label="Send" className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors">
                {busy ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className={`text-[10px] ${t.textMuted} text-center mt-1.5`}>Answers use only the CRM data your role can see. Check important figures before acting on them.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
