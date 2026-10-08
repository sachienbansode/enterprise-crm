import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  TrendingUp, Trophy, Target, Users, MessageSquare, AlertTriangle, RefreshCw, Download,
  CalendarClock, ArrowRight,
} from "lucide-react";

// ─── Executive dashboard ──────────────────────────────────────────────────────
// Every figure comes from /api/dashboard/analytics (computed from live CRM data).
// Chart colours follow the data-viz reference palette: categorical slots 1 & 3
// (blue / aqua) for two-series charts, one sequential hue for magnitude, and the
// reserved status colours only for SR priority / SLA state (always with a label).

type Analytics = {
  kpis: {
    openPipeline: number; openLeads: number; wonValue: number; wonLeads: number;
    winRate: number | null; closedLeads: number;
    clients: { total: number; active: number; kyc_attention: number; new30: number };
    openSRs: number; breachedSRs: number; totalSRs: number;
  };
  verticals: { name: string; id: string; open: number; won: number; openCount: number; wonCount: number; lostCount: number; dealValue: number }[];
  weekly: { week: string; leads: number; srOpened: number; srResolved: number }[];
  ageing: { bucket: string; count: number }[];
  srByStatus: Record<string, number>;
  srOpenByPriority: Record<string, number>;
  rmBoard: { name: string; open: number; won: number; leads: number }[];
  upcoming: { lead_code: string; name: string; vertical: string; value: number; expected_close: string; rm: string | null }[];
};

const PALETTE = {
  light: { s1: "#2a78d6", s3: "#1baf7a", seq: "#2a78d6", grid: "#e5e7eb", axis: "#6b7280", tipBg: "#ffffff", tipBorder: "#e5e7eb", tipText: "#111827" },
  dark: { s1: "#3987e5", s3: "#199e70", seq: "#3987e5", grid: "#1e2633", axis: "#8f99a8", tipBg: "#141a24", tipBorder: "#2e3848", tipText: "#eceff3" },
};
const STATUS = { Critical: "#e34948", High: "#eb6834", Medium: "#eda100", Low: "#8f99a8" } as Record<string, string>;
const VID_SHORT: Record<string, string> = { retail: "RB", corporate: "CB", ib: "IB", aif: "AIF", ie: "IE" };

const weekLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function ExecutiveDashboard({ t, isDark, onNav, fmt }: {
  t: any; isDark: boolean; onNav: (v: any, p: any) => void; fmt: (n: number) => string;
}) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  const c = isDark ? PALETTE.dark : PALETTE.light;

  const load = () => {
    setLoading(true); setError("");
    fetch("/api/dashboard/analytics")
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(new Error(d.error || `HTTP ${r.status}`))))
      .then(d => { setData(d); setUpdated(new Date()); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const card = `${t.bgCard} border ${t.border} rounded-2xl`;
  const tooltipStyle = { background: c.tipBg, border: `1px solid ${c.tipBorder}`, borderRadius: 10, color: c.tipText, fontSize: 12 };
  const axisProps = { stroke: c.axis, fontSize: 11, tickLine: false, axisLine: false } as const;

  if (loading && !data) return <div className={`p-6 text-sm ${t.textMuted} flex items-center gap-2`}><RefreshCw className="w-4 h-4 animate-spin" /> Loading analytics…</div>;
  if (error && !data) return <div className="p-6"><div className={`text-sm rounded-xl border p-4 ${t.alertRed}`}>Could not load dashboard: {error}</div></div>;
  if (!data) return null;
  const k = data.kpis;
  const breachPct = k.openSRs ? Math.round((k.breachedSRs / k.openSRs) * 100) : 0;

  const kpis = [
    { label: "Open pipeline", value: fmt(k.openPipeline), sub: `${k.openLeads} open leads`, icon: TrendingUp, onClick: undefined },
    { label: "Won value", value: fmt(k.wonValue), sub: `${k.wonLeads} leads won`, icon: Trophy },
    { label: "Win rate", value: k.winRate === null ? "—" : `${k.winRate}%`, sub: k.closedLeads ? `of ${k.closedLeads} closed leads` : "No closed leads yet", icon: Target },
    { label: "Active clients", value: String(k.clients.active), sub: `${k.clients.kyc_attention} need KYC attention`, icon: Users, onClick: () => onNav(null, "clients") },
    { label: "Open service requests", value: String(k.openSRs), sub: `${k.totalSRs} total`, icon: MessageSquare, onClick: () => onNav(null, "service") },
    { label: "SLA breached", value: String(k.breachedSRs), sub: `${breachPct}% of open SRs`, icon: AlertTriangle, alert: k.breachedSRs > 0, onClick: () => onNav(null, "service") },
  ];

  const pipelineRows = data.verticals.map(v => ({ name: VID_SHORT[v.id] || v.name, full: v.name, Open: v.open, Won: v.won }));
  const priorities = ["Critical", "High", "Medium", "Low"].map(p => ({ p, n: data.srOpenByPriority[p] || 0 }));
  const maxPri = Math.max(1, ...priorities.map(x => x.n));
  const weekly = data.weekly.map(w => ({ ...w, label: weekLabel(w.week) }));
  const moneyTick = (v: number) => fmt(v).replace(/\.00(?=[A-Za-z])/, "");

  return (
    <div className="p-3 sm:p-5 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className={`text-xl font-bold ${t.text}`}>Executive Overview</h1>
          <p className={`text-xs ${t.textMuted}`}>Live CRM analytics{updated ? ` · updated ${updated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={load} className={`text-xs px-3 py-2 rounded-lg border ${t.border} ${t.textSub} flex items-center gap-1.5`}><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          <button onClick={() => window.print()} className="text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export PDF</button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(x => (
          <button key={x.label} onClick={x.onClick} disabled={!x.onClick}
            className={`${card} p-4 text-left ${x.onClick ? "hover:border-blue-500/50 transition-colors" : "cursor-default"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${t.textMuted}`}>{x.label}</span>
              <x.icon className={`w-4 h-4 ${x.alert ? "text-red-500" : t.textMuted}`} />
            </div>
            <div className={`text-2xl font-bold mt-2 ${x.alert ? "text-red-500" : t.text}`}>{x.value}</div>
            <div className={`text-[11px] mt-1 ${x.alert ? "text-red-500/90" : t.textMuted}`}>{x.sub}</div>
          </button>
        ))}
      </div>

      {/* Pipeline by vertical + New leads trend */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className={`${card} p-4 xl:col-span-3`}>
          <div className={`text-sm font-semibold ${t.text}`}>Pipeline value by vertical</div>
          <div className={`text-[11px] ${t.textMuted} mb-3`}>Open vs won lead value · click a vertical to open its dashboard</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineRows} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2} barCategoryGap="28%"
                onClick={(e: any) => { const v = data.verticals.find(x => VID_SHORT[x.id] === e?.activeLabel); if (v) onNav(v.id, "dashboard"); }}>
                <CartesianGrid horizontal={false} stroke={c.grid} />
                <XAxis type="number" {...axisProps} tickFormatter={moneyTick} />
                <YAxis type="category" dataKey="name" {...axisProps} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? "#ffffff08" : "#0000000a" }}
                  formatter={(v: any, n: any) => [fmt(Number(v)), n]} labelFormatter={(l: any) => pipelineRows.find(r => r.name === l)?.full || l} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Open" fill={c.s1} radius={[0, 4, 4, 0]} cursor="pointer" />
                <Bar dataKey="Won" fill={c.s3} radius={[0, 4, 4, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={`${card} p-4 xl:col-span-2`}>
          <div className={`text-sm font-semibold ${t.text}`}>New leads per week</div>
          <div className={`text-[11px] ${t.textMuted} mb-3`}>Last 12 weeks, all verticals</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ left: -16, right: 8, top: 8 }}>
                <defs><linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.s1} stopOpacity={0.3} /><stop offset="100%" stopColor={c.s1} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, "New leads"]} labelFormatter={(l: any) => `Week of ${l}`} />
                <Area type="monotone" dataKey="leads" stroke={c.s1} strokeWidth={2} fill="url(#leadsFill)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Service desk */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className={`${card} p-4 xl:col-span-3`}>
          <div className={`text-sm font-semibold ${t.text}`}>Service requests: opened vs resolved</div>
          <div className={`text-[11px] ${t.textMuted} mb-3`}>Per week, last 12 weeks</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(l: any) => `Week of ${l}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="srOpened" name="Opened" stroke={c.s1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="srResolved" name="Resolved" stroke={c.s3} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={`${card} p-4 xl:col-span-2`}>
          <div className="flex items-center justify-between">
            <div className={`text-sm font-semibold ${t.text}`}>Open SRs by priority</div>
            <button onClick={() => onNav(null, "service")} className={`text-[11px] ${t.linkText} flex items-center gap-1 print:hidden`}>View all <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="mt-4 space-y-3">
            {priorities.map(({ p, n }) => (
              <div key={p}>
                <div className="flex justify-between text-xs mb-1"><span className={t.textSub}>{p}</span><span className={`font-semibold ${t.text}`}>{n}</span></div>
                <div className={`h-2 rounded-full ${t.bgCard2}`}><div className="h-2 rounded-full" style={{ width: `${(n / maxPri) * 100}%`, background: STATUS[p] }} /></div>
              </div>
            ))}
          </div>
          <div className={`mt-5 pt-4 border-t ${t.border} grid grid-cols-3 gap-2 text-center`}>
            {Object.entries(data.srByStatus).map(([s, n]) => (
              <div key={s}><div className={`text-base font-bold ${t.text}`}>{n}</div><div className={`text-[10px] ${t.textMuted}`}>{s}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* Ageing · RM leaderboard · Closing soon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text}`}>Open lead ageing</div>
          <div className={`text-[11px] ${t.textMuted} mb-3`}>Days since the lead was opened</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ageing} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="bucket" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? "#ffffff08" : "#0000000a" }} formatter={(v: any) => [v, "Open leads"]} />
                <Bar dataKey="count" fill={c.seq} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text} mb-3`}>Top relationship managers</div>
          <table className="w-full text-xs">
            <thead><tr className={t.textMuted}><th className="text-left font-medium pb-2">RM</th><th className="text-right font-medium pb-2">Leads</th><th className="text-right font-medium pb-2">Open</th><th className="text-right font-medium pb-2">Won</th></tr></thead>
            <tbody>
              {data.rmBoard.map(r => (
                <tr key={r.name} className={`border-t ${t.border}`}>
                  <td className={`py-2 ${t.text}`}>{r.name}</td>
                  <td className={`py-2 text-right ${t.textSub}`}>{r.leads}</td>
                  <td className={`py-2 text-right ${t.textSub}`}>{fmt(r.open)}</td>
                  <td className={`py-2 text-right font-semibold ${t.text}`}>{fmt(r.won)}</td>
                </tr>
              ))}
              {!data.rmBoard.length && <tr><td colSpan={4} className={`py-4 text-center ${t.textMuted}`}>No assigned leads</td></tr>}
            </tbody>
          </table>
        </div>
        <div className={`${card} p-4`}>
          <div className={`text-sm font-semibold ${t.text} mb-3 flex items-center gap-2`}><CalendarClock className="w-4 h-4" /> Closing in next 30 days</div>
          <div className="space-y-2">
            {data.upcoming.map(u => (
              <div key={u.lead_code} className={`flex items-center justify-between gap-2 py-1.5 border-b ${t.border} last:border-0`}>
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${t.text} truncate`}>{u.name}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>{u.lead_code} · {u.vertical}{u.rm ? ` · ${u.rm}` : ""}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-semibold ${t.text}`}>{u.value ? fmt(u.value) : "—"}</div>
                  <div className={`text-[10px] ${t.textMuted}`}>{new Date(u.expected_close).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                </div>
              </div>
            ))}
            {!data.upcoming.length && <div className={`text-xs ${t.textMuted} py-6 text-center`}>No leads with an expected close date in the next 30 days.<br />Set "Expected Close Date" on leads to see them here.</div>}
          </div>
        </div>
      </div>

      {/* Vertical scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {data.verticals.map(v => {
          const closed = v.wonCount + v.lostCount;
          return (
            <button key={v.id} onClick={() => onNav(v.id, "dashboard")} className={`${card} p-4 text-left hover:border-blue-500/50 transition-colors`}>
              <div className={`text-xs font-bold ${t.text}`}>{v.name}</div>
              <div className={`text-lg font-bold mt-2 ${t.text}`}>{fmt(v.open)}</div>
              <div className={`text-[11px] ${t.textMuted}`}>open pipeline · {v.openCount} leads</div>
              <div className={`mt-3 pt-3 border-t ${t.border} flex justify-between text-[11px]`}>
                <span className={t.textMuted}>Won <b className={t.text}>{v.wonCount}</b></span>
                <span className={t.textMuted}>Win rate <b className={t.text}>{closed ? `${Math.round((v.wonCount / closed) * 100)}%` : "—"}</b></span>
                <span className={t.textMuted}>Deals <b className={t.text}>{fmt(v.dealValue)}</b></span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
