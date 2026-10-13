import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { CalendarClock, AlertTriangle, CheckSquare, Star, RefreshCw, Mic, TrendingUp, ArrowRight } from "lucide-react";

// Investment Banking / ECM dashboard. Top: "My Day" — today's meetings, pending next actions, overdue tasks,
// priority opportunities. Below: pipeline, value, expected & probability-weighted fee, conversion, mandates
// won/lost, sector & opportunity-type pipeline, lost reasons and RM performance — all from live data.
// Every chart is single-series (one sequential hue, no legend needed); colours from the validated palette.

const PALETTE = {
  light: { s1: "#2a78d6", grid: "#e5e7eb", axis: "#6b7280", tipBg: "#ffffff", tipBorder: "#e5e7eb", tipText: "#111827" },
  dark: { s1: "#3987e5", grid: "#1e2633", axis: "#8f99a8", tipBg: "#141a24", tipBorder: "#2e3848", tipText: "#eceff3" },
};
const money = (n: number) => !n ? "₹0" : n >= 1e7 ? `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr` : n >= 1e5 ? `₹${(n / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 1 })} L` : `₹${Math.round(n).toLocaleString("en-IN")}`;
const d = (v: any) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");
const time = (v: any) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const quickLog = (detail: any = {}) => window.dispatchEvent(new CustomEvent("quicklog:open", { detail }));

export default function IBDashboard({ t, isDark, onNav }: { t: any; isDark: boolean; onNav: (v: any, p: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"team" | "mine">(() => { try { return (localStorage.getItem("ib_dash_scope") as any) || "team"; } catch { return "team"; } });
  const c = isDark ? PALETTE.dark : PALETTE.light;

  const load = () => {
    setError("");
    fetch(`/api/ib/dashboard?scope=${scope}`).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error))))
      .then(setData).catch(e => setError(e.message));
  };
  useEffect(() => { load(); try { localStorage.setItem("ib_dash_scope", scope); } catch { /* ignore */ } }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = () => load(); window.addEventListener("quicklog:saved", h); return () => window.removeEventListener("quicklog:saved", h); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCompany = (id?: string) => { if (id) try { sessionStorage.setItem("ib_open_company", id); } catch { /* ignore */ } onNav("ib", "customers"); };
  const toLeads = () => onNav("ib", "leads");
  const card = `${t.bgCard} border ${t.border} rounded-2xl`;
  const tip = { background: c.tipBg, border: `1px solid ${c.tipBorder}`, borderRadius: 10, color: c.tipText, fontSize: 12 };

  if (error) return <div className="p-6"><div className={`border rounded-xl p-4 text-sm ${t.alertRed}`}>{error}</div></div>;
  if (!data) return <div className={`p-6 text-xs ${t.textMuted} flex items-center`}><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading Investment Banking dashboard…</div>;
  const k = data.kpis, md = data.myDay;
  const today = new Date(new Date().toDateString());

  const MyDayCard = ({ title, icon: Icon, n, tone, children, empty }: any) => (
    <div className={`${card} p-4 flex flex-col min-h-[110px] sm:min-h-[180px]`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${tone}`} />
        <div className={`text-xs font-bold uppercase tracking-wide ${t.text} flex-1`}>{title}</div>
        <span className={`text-xs font-bold ${n ? tone : t.textMuted}`}>{n}</span>
      </div>
      <div className="space-y-1.5 overflow-y-auto max-h-56">{n ? children : <div className={`text-xs ${t.textMuted}`}>{empty}</div>}</div>
    </div>
  );
  const Row = ({ onClick, title, sub, warn }: any) => (
    <button onClick={onClick} className={`w-full text-left rounded-lg px-2.5 py-1.5 ${t.bgCard2} hover:ring-1 hover:ring-blue-500/50`}>
      <div className={`text-xs font-medium ${warn ? "text-red-500" : t.text} truncate`}>{title}</div>
      {sub && <div className={`text-[10px] ${t.textMuted} truncate`}>{sub}</div>}
    </button>
  );
  const Kpi = ({ label, value, sub, onClick }: any) => (
    <button onClick={onClick} className={`${card} p-3.5 text-left hover:ring-1 hover:ring-blue-500/40`}>
      <div className={`text-[10px] uppercase font-semibold tracking-wide ${t.textMuted}`}>{label}</div>
      <div className={`text-xl font-bold ${t.text} mt-1`}>{value}</div>
      {sub && <div className={`text-[11px] ${t.textMuted} mt-0.5`}>{sub}</div>}
    </button>
  );
  const HBar = ({ rows, dataKey, fmt, height }: any) => (
    <ResponsiveContainer width="100%" height={height || Math.max(140, rows.length * 30 + 30)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={c.grid} />
        <XAxis type="number" tick={{ fill: c.axis, fontSize: 11 }} tickFormatter={fmt} allowDecimals={!!fmt} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tip} cursor={{ fill: isDark ? "#ffffff0d" : "#0000000a" }} formatter={(v: any) => [fmt ? fmt(v) : v, ""]} separator="" />
        <Bar dataKey={dataKey} fill={c.s1} radius={[0, 4, 4, 0]} barSize={16} onClick={toLeads} style={{ cursor: "pointer" }} />
      </BarChart>
    </ResponsiveContainer>
  );

  const funnelMax = Math.max(1, ...data.funnel.map((f: any) => f.count));

  return (
    <div className="p-4 sm:p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-white" /></div>
        <div className="mr-auto">
          <div className={`text-base font-bold ${t.text}`}>Investment Banking</div>
          <div className={`text-[11px] ${t.textMuted}`}>What happened, what matters, what needs action</div>
        </div>
        <div className={`flex rounded-lg border ${t.border} overflow-hidden text-xs`}>
          {(["team", "mine"] as const).map(s => <button key={s} onClick={() => setScope(s)} className={`px-3 py-1.5 ${scope === s ? "bg-blue-600 text-white" : t.textSub}`}>{s === "team" ? "Team" : "Mine"}</button>)}
        </div>
        <button onClick={() => quickLog()} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Quick Log</button>
        <button onClick={load} aria-label="Refresh" className={`text-xs p-2 rounded-lg border ${t.border} ${t.textMuted}`}><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>

      {/* My Day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MyDayCard title="Today's meetings" icon={CalendarClock} n={md.meetings.length} tone="text-blue-500" empty="No meetings logged for today.">
          {md.meetings.map((m: any) => <Row key={m.id} onClick={() => openCompany(m.client_id)} title={`${time(m.occurred_at)} · ${m.title || m.type}`} sub={m.company} />)}
        </MyDayCard>
        <MyDayCard title="Pending actions" icon={ArrowRight} n={md.actions.length} tone="text-amber-500" empty="No next actions due in the next 2 days.">
          {md.actions.map((a: any) => {
            const late = new Date(a.next_action_date) < today;
            return <Row key={a.id} onClick={toLeads} warn={late} title={a.next_action} sub={`${a.company || a.name} · ${late ? "overdue since " : ""}${d(a.next_action_date)}`} />;
          })}
        </MyDayCard>
        <MyDayCard title="Overdue & due today" icon={AlertTriangle} n={md.overdueTasks.length} tone="text-red-500" empty="Nothing overdue or due today.">
          {md.overdueTasks.map((x: any) => <Row key={x.id} onClick={() => openCompany(x.client_id)} warn={new Date(x.due_date) < today} title={x.title} sub={`${x.owner_name || "—"} · ${x.company || ""} · ${new Date(x.due_date) < today ? `overdue since ${d(x.due_date)}` : "due today"}`} />)}
        </MyDayCard>
        <MyDayCard title="Priority opportunities" icon={Star} n={md.priority.length} tone="text-violet-500" empty="No high-priority opportunities open.">
          {md.priority.map((p: any) => <Row key={p.id} onClick={toLeads} title={p.name} sub={`${p.stage}${p.expected_fee ? ` · fee ${money(Number(p.expected_fee))}` : ""}${p.next_action ? ` · → ${p.next_action}` : ""}`} />)}
        </MyDayCard>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Open pipeline" value={k.openOpportunities} sub={k.noNextAction ? `${k.noNextAction} without a next action` : "all have a next action"} onClick={toLeads} />
        <Kpi label="Transaction value" value={money(k.pipelineValue)} sub="open opportunities" onClick={toLeads} />
        <Kpi label="Expected fee" value={money(k.expectedFee)} sub="open opportunities" onClick={toLeads} />
        <Kpi label="Probability-weighted fee" value={money(k.weightedFee)} sub="fee × probability" onClick={toLeads} />
        <Kpi label="Mandates won / lost" value={`${k.mandatesWon} / ${k.mandatesLost}`} sub="closed vs lost" onClick={toLeads} />
        <Kpi label="Win rate" value={k.winRate === null ? "—" : `${k.winRate}%`} sub="of decided opportunities" onClick={toLeads} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Conversion funnel */}
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text}`}>Lead → Pitch → Mandate → Transaction</div>
          <div className={`text-[11px] ${t.textMuted} mb-3`}>Opportunities that reached each step</div>
          <div className="space-y-2">
            {data.funnel.map((f: any, i: number) => {
              const prev = i ? data.funnel[i - 1].count : null;
              return (
                <button key={f.stage} onClick={toLeads} className="w-full text-left group">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className={t.textSub}>{f.label}</span>
                    <span className={t.text}><b>{f.count}</b>{prev ? <span className={t.textMuted}> · {Math.round((f.count / prev) * 100)}% of previous</span> : null}</span>
                  </div>
                  <div className={`h-3 rounded ${t.bgCard2}`}><div className="h-3 rounded group-hover:opacity-80" style={{ width: `${(f.count / funnelMax) * 100}%`, background: c.s1, minWidth: f.count ? 6 : 0 }} /></div>
                </button>
              );
            })}
          </div>
        </div>
        {/* Stage pipeline */}
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text}`}>Pipeline by stage</div>
          <div className={`text-[11px] ${t.textMuted} mb-2`}>Number of opportunities · click to open the board</div>
          <HBar rows={data.stages.map((s: any) => ({ name: s.label, count: s.count }))} dataKey="count" />
        </div>
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text}`}>Sector-wise pipeline</div>
          <div className={`text-[11px] ${t.textMuted} mb-2`}>Transaction value of open opportunities</div>
          {data.bySector.length ? <HBar rows={data.bySector} dataKey="value" fmt={money} /> : <div className={`text-xs ${t.textMuted}`}>Add sectors to companies to see this.</div>}
        </div>
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text}`}>By opportunity type</div>
          <div className={`text-[11px] ${t.textMuted} mb-2`}>Transaction value of open opportunities</div>
          {data.byType.length ? <HBar rows={data.byType} dataKey="value" fmt={money} /> : <div className={`text-xs ${t.textMuted}`}>No open opportunities.</div>}
        </div>
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text}`}>Why mandates are lost</div>
          <div className={`text-[11px] ${t.textMuted} mb-2`}>Lost opportunities by reason</div>
          {data.lostReasons.length ? <HBar rows={data.lostReasons} dataKey="count" /> : <div className={`text-xs ${t.textMuted}`}>No lost opportunities yet.</div>}
        </div>
        <div className={`${card} p-4 overflow-x-auto`}>
          <div className={`text-sm font-semibold ${t.text} mb-2`}>Team / RM performance</div>
          <table className="w-full text-xs">
            <thead><tr className={t.textMuted}>{["RM", "Open", "Won", "Lost", "Pipeline", "Exp. fee", "Overdue"].map(h => <th key={h} className="text-left font-semibold py-1.5 pr-2">{h}</th>)}</tr></thead>
            <tbody>
              {data.rmPerformance.map((r: any) => (
                <tr key={r.rm} className={`border-t ${t.border}`}>
                  <td className={`py-1.5 pr-2 font-medium ${t.text}`}>{r.rm}</td>
                  <td className={`py-1.5 pr-2 ${t.textSub}`}>{r.open}</td>
                  <td className={`py-1.5 pr-2 ${t.textSub}`}>{r.won}</td>
                  <td className={`py-1.5 pr-2 ${t.textSub}`}>{r.lost}</td>
                  <td className={`py-1.5 pr-2 ${t.textSub}`}>{money(r.pipelineValue)}</td>
                  <td className={`py-1.5 pr-2 ${t.textSub}`}>{money(r.expectedFee)}</td>
                  <td className={`py-1.5 pr-2 ${r.overdueActions ? "text-red-500 font-semibold" : t.textMuted}`}>{r.overdueActions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`text-[11px] ${t.textMuted} flex items-center gap-1`}><CheckSquare className="w-3 h-3" /> Probability is taken from each opportunity, or from its stage when not set.</div>
    </div>
  );
}
