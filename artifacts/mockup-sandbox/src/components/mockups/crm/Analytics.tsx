import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  FileText,
  Filter,
  Globe,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Wallet,
  PieChart,
} from "lucide-react";

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const revenueData = [28, 31, 35, 29, 38, 42, 36, 44, 48, 52, 58, 64];
const targetData = [30, 33, 36, 33, 40, 45, 40, 46, 50, 55, 60, 68];

const pieSegments = [
  { label: "Retail Broking", pct: 20, color: "#3b82f6" },
  { label: "Corporate Broking", pct: 24, color: "#8b5cf6" },
  { label: "Investment Banking", pct: 28, color: "#f59e0b" },
  { label: "AIF", pct: 18, color: "#10b981" },
  { label: "Inst. Equities", pct: 10, color: "#f43f5e" },
];

const topRMs = [
  { name: "Arjun Rao", revenue: "₹48.2 Cr", deals: 12, clients: 84, target: 92 },
  { name: "Priya Sharma", revenue: "₹36.7 Cr", deals: 9, clients: 72, target: 78 },
  { name: "Vikram Nair", revenue: "₹29.5 Cr", deals: 8, clients: 65, target: 82 },
  { name: "Meera Krishnan", revenue: "₹24.1 Cr", deals: 7, clients: 58, target: 65 },
  { name: "Rahul Joshi", revenue: "₹19.8 Cr", deals: 6, clients: 43, target: 70 },
];

const kpis = [
  { label: "Total Revenue (FY26)", value: "₹1,160.9 Cr", vs: "+14.2% vs FY25", up: true, icon: DollarSign },
  { label: "Total Clients", value: "13,911", vs: "+2.5% MoM", up: true, icon: Users },
  { label: "Deal Pipeline", value: "₹755 Cr", vs: "38 deals active", up: true, icon: TrendingUp },
  { label: "Avg. Wallet Share", value: "68%", vs: "+3.1% YoY", up: true, icon: PieChart },
  { label: "SLA Compliance", value: "91.2%", vs: "-2.4% vs target", up: false, icon: Shield },
  { label: "CS Resolution Rate", value: "87.4%", vs: "+5.1% vs Q3", up: true, icon: Briefcase },
];

function BarGroup({ val, target, max }: { val: number; target: number; max: number }) {
  const h = 80;
  return (
    <div className="relative flex gap-0.5 items-end" style={{ height: h + "px" }}>
      <div className="w-4 rounded-sm bg-blue-600" style={{ height: `${(val / max) * h}px` }} />
      <div className="w-1.5 rounded-sm bg-gray-600" style={{ height: `${(target / max) * h}px` }} />
    </div>
  );
}

function PieChart2({ segments }: { segments: typeof pieSegments }) {
  let cumulativeAngle = 0;
  const cx = 90, cy = 90, r = 70, innerR = 40;
  const paths = segments.map((seg) => {
    const startAngle = (cumulativeAngle / 100) * 2 * Math.PI - Math.PI / 2;
    cumulativeAngle += seg.pct;
    const endAngle = (cumulativeAngle / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(startAngle);
    const yi1 = cy + innerR * Math.sin(startAngle);
    const xi2 = cx + innerR * Math.cos(endAngle);
    const yi2 = cy + innerR * Math.sin(endAngle);
    const large = seg.pct > 50 ? 1 : 0;
    return {
      d: `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`,
      color: seg.color,
    };
  });
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px]">
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.9} />)}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">₹1,160</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6b7280" fontSize={8}>Cr Total</text>
    </svg>
  );
}

export function Analytics() {
  const [period, setPeriod] = useState("FY 2025-26");

  return (
    <div className="flex h-screen bg-gray-950 text-white font-['Inter'] overflow-hidden">
      {/* Compact sidebar */}
      <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div className="w-px h-4 bg-gray-700" />
        {[LayoutDashboard, Users, TrendingUp, Briefcase, FileText, BarChart3, Shield, Settings].map((Icon, i) => (
          <button key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 5 ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-4 flex-shrink-0">
          <div>
            <div className="text-base font-bold text-white">Analytics & Reporting</div>
            <div className="text-[10px] text-gray-500">Revenue Intelligence Dashboard</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5" />
              <span>{period}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5" /> Business Line
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">
              <Download className="w-3.5 h-3.5" /> Export Report
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* KPI grid */}
          <div className="grid grid-cols-6 gap-3">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                <div className="flex items-start justify-between mb-2">
                  <kpi.icon className="w-4 h-4 text-gray-500" />
                  <span className={`text-[9px] flex items-center gap-0.5 ${kpi.up ? "text-emerald-400" : "text-red-400"}`}>
                    {kpi.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  </span>
                </div>
                <div className="text-lg font-bold text-white">{kpi.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</div>
                <div className={`text-[10px] mt-1 ${kpi.up ? "text-emerald-400" : "text-red-400"}`}>{kpi.vs}</div>
              </div>
            ))}
          </div>

          {/* Revenue chart + Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-white">Revenue vs. Target (FY 2025-26)</div>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-600" /> Actual</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-gray-600" /> Target</div>
                </div>
              </div>
              <div className="flex items-end gap-2">
                {months.map((m, i) => (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <BarGroup val={revenueData[i]} target={targetData[i]} max={75} />
                    <div className="text-[8px] text-gray-600">{m}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-800 flex items-center gap-6 text-xs">
                <div>
                  <div className="text-gray-500">Total Actual</div>
                  <div className="text-white font-bold text-base">₹505 Cr</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Target</div>
                  <div className="text-white font-bold text-base">₹536 Cr</div>
                </div>
                <div>
                  <div className="text-gray-500">Achievement</div>
                  <div className="text-emerald-400 font-bold text-base">94.2%</div>
                </div>
                <div>
                  <div className="text-gray-500">Best Month</div>
                  <div className="text-white font-bold text-base">Mar (₹64 Cr)</div>
                </div>
              </div>
            </div>

            {/* Pie breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
              <div className="text-sm font-semibold text-white mb-3">Revenue by Business Line</div>
              <div className="flex-1 flex flex-col items-center">
                <PieChart2 segments={pieSegments} />
                <div className="space-y-1.5 w-full mt-2">
                  {pieSegments.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-gray-400 flex-1">{seg.label}</span>
                      <span className="text-white font-medium">{seg.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RM Performance */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white">Top RM Performance</div>
              <button className="text-xs text-blue-400 hover:text-blue-300">View all RMs →</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {["Rank", "Relationship Manager", "Revenue Generated", "Active Deals", "Clients", "Target Achievement"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topRMs.map((rm, i) => (
                  <tr key={rm.name} className="border-b border-gray-800/50">
                    <td className="py-3 pr-4">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-amber-600 text-white" : i === 1 ? "bg-gray-600 text-white" : i === 2 ? "bg-orange-900 text-orange-400" : "bg-gray-800 text-gray-500"}`}>{i + 1}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-xs font-medium text-white">{rm.name}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-sm font-bold text-white">{rm.revenue}</div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-300">{rm.deals}</td>
                    <td className="py-3 pr-4 text-xs text-gray-300">{rm.clients}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rm.target >= 90 ? "bg-emerald-500" : rm.target >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${rm.target}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${rm.target >= 90 ? "text-emerald-400" : rm.target >= 75 ? "text-amber-400" : "text-red-400"}`}>{rm.target}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
