import { useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Wallet,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  FileText,
  Star,
  Calendar,
  Briefcase,
  PieChart,
} from "lucide-react";

const DOMAIN = "450160ff-bccf-40d4-a872-18b0a0037582-00-2gmbey5lrffbp.worf.replit.dev";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Clients" },
  { icon: TrendingUp, label: "Leads" },
  { icon: Briefcase, label: "Deals" },
  { icon: FileText, label: "Documents" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Shield, label: "Compliance" },
  { icon: Settings, label: "Settings" },
];

const modules = [
  { label: "Retail Broking", color: "bg-blue-500", clients: 12483, revenue: "₹48.2Cr", growth: 12.4 },
  { label: "Corporate Broking", color: "bg-violet-500", clients: 847, revenue: "₹92.7Cr", growth: 8.1 },
  { label: "Investment Banking", color: "bg-amber-500", clients: 124, revenue: "₹310.5Cr", growth: 22.3 },
  { label: "AIF", color: "bg-emerald-500", clients: 389, revenue: "₹185.4Cr", growth: 15.7 },
  { label: "Institutional Equities", color: "bg-rose-500", clients: 68, revenue: "₹524.1Cr", growth: 6.2 },
];

const recentActivities = [
  { type: "Lead", title: "New lead from Tata Group for IB mandate", time: "2m ago", tag: "Investment Banking", tagColor: "bg-amber-100 text-amber-700" },
  { type: "Deal", title: "₹250Cr AIF commitment closed — Rahul Mehta", time: "18m ago", tag: "AIF", tagColor: "bg-emerald-100 text-emerald-700" },
  { type: "SR", title: "Service request resolved — Kotak Securities #SR-4821", time: "45m ago", tag: "Retail Broking", tagColor: "bg-blue-100 text-blue-700" },
  { type: "KYC", title: "KYC verification pending — Axis Capital Ltd", time: "1h ago", tag: "Corporate Broking", tagColor: "bg-violet-100 text-violet-700" },
  { type: "Meeting", title: "Pre-deal call scheduled — HDFC Pension Fund", time: "2h ago", tag: "Inst. Equities", tagColor: "bg-rose-100 text-rose-700" },
  { type: "Alert", title: "Margin breach alert — Vinod Nair Portfolio", time: "3h ago", tag: "Retail Broking", tagColor: "bg-blue-100 text-blue-700" },
];

const pipelineData = [
  { stage: "Prospecting", count: 38, value: "₹284Cr", pct: 100 },
  { stage: "Qualified", count: 22, value: "₹198Cr", pct: 70 },
  { stage: "Proposal", count: 14, value: "₹132Cr", pct: 46 },
  { stage: "Negotiation", count: 8, value: "₹87Cr", pct: 31 },
  { stage: "Closure", count: 4, value: "₹54Cr", pct: 19 },
];

const alerts = [
  { msg: "3 KYC documents expiring this week", severity: "high" },
  { msg: "Wall-crossing approval pending — 2 deals", severity: "medium" },
  { msg: "SLA breach risk — 5 service requests >48h", severity: "high" },
];

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState("All Modules");

  return (
    <div className="flex h-screen bg-gray-950 text-white font-['Inter'] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-16"} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-200 flex-shrink-0`}>
        <div className="h-16 flex items-center px-4 border-b border-gray-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-sm font-bold text-white leading-none">EnterpriseCRM</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Financial Services</div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${item.active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-3 border-t border-gray-800">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-xs font-bold">AR</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">Arjun Rao</div>
                <div className="text-[10px] text-gray-400">Head of Wealth</div>
              </div>
              <LogOut className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-white" />
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none flex-1" placeholder="Search clients, deals, leads..." />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold">8</span>
            </div>
            <select
              value={activeModule}
              onChange={(e) => setActiveModule(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs border border-gray-700 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option>All Modules</option>
              <option>Retail Broking</option>
              <option>Corporate Broking</option>
              <option>Investment Banking</option>
              <option>AIF</option>
              <option>Institutional Equities</option>
            </select>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Executive Dashboard</h1>
              <p className="text-sm text-gray-400 mt-0.5">March 21, 2026 · FY 2025–26 Q4</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg border border-gray-700">
                <Calendar className="w-3.5 h-3.5" /> This Quarter
              </button>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg">
                <Activity className="w-3.5 h-3.5" /> Live Feed
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm ${a.severity === "high" ? "bg-red-950/40 border-red-800/60 text-red-300" : "bg-amber-950/40 border-amber-800/60 text-amber-300"}`}>
                <Shield className="w-4 h-4 flex-shrink-0" />
                {a.msg}
                <button className="ml-auto"><X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" /></button>
              </div>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total AUM", value: "₹1,160.9 Cr", sub: "+14.2% YoY", icon: Wallet, up: true, color: "from-blue-600/20 to-blue-900/10" },
              { label: "Active Clients", value: "13,911", sub: "+342 this month", icon: Users, up: true, color: "from-violet-600/20 to-violet-900/10" },
              { label: "Pipeline Value", value: "₹755 Cr", sub: "38 active deals", icon: TrendingUp, up: true, color: "from-amber-600/20 to-amber-900/10" },
              { label: "Revenue (Q4)", value: "₹211.4 Cr", sub: "+8.3% vs Q3", icon: DollarSign, up: true, color: "from-emerald-600/20 to-emerald-900/10" },
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} border border-gray-800 rounded-xl p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs text-gray-400 font-medium">{kpi.label}</div>
                  <kpi.icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
                <div className={`mt-1 flex items-center gap-1 text-xs ${kpi.up ? "text-emerald-400" : "text-red-400"}`}>
                  {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Business line breakdown + Pipeline */}
          <div className="grid grid-cols-5 gap-4">
            {/* Module cards */}
            <div className="col-span-2 space-y-2.5">
              <div className="text-sm font-semibold text-white mb-1">Business Lines</div>
              {modules.map((m) => (
                <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 flex items-center gap-3 hover:border-gray-700 cursor-pointer transition-colors">
                  <div className={`w-2 h-10 rounded-full ${m.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white">{m.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{m.clients.toLocaleString()} clients</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{m.revenue}</div>
                    <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                      <ArrowUpRight className="w-2.5 h-2.5" />{m.growth}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline funnel */}
            <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-white">Deal Pipeline</div>
                <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded-full">All Business Lines</span>
              </div>
              <div className="space-y-3">
                {pipelineData.map((stage, i) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{stage.count} deals</span>
                        <span className="text-white font-medium w-16 text-right">{stage.value}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stage.pct}%`,
                          background: `hsl(${220 - i * 25}, 70%, ${55 - i * 4}%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500">Total pipeline value</span>
                <span className="text-sm font-bold text-blue-400">₹755 Cr</span>
              </div>
            </div>
          </div>

          {/* Recent activity + Quick actions */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">Recent Activity</div>
                <button className="text-xs text-blue-400 hover:text-blue-300">View all</button>
              </div>
              <div className="space-y-3">
                {recentActivities.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                    <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200 leading-snug">{a.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${a.tagColor}`}>{a.tag}</span>
                        <span className="text-[10px] text-gray-500">{a.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-white mb-3">Quick Actions</div>
                <div className="space-y-2">
                  {[
                    { icon: Users, label: "Add New Client", color: "text-blue-400" },
                    { icon: TrendingUp, label: "Create Lead", color: "text-violet-400" },
                    { icon: Briefcase, label: "New Deal", color: "text-amber-400" },
                    { icon: FileText, label: "Upload Document", color: "text-emerald-400" },
                    { icon: Star, label: "Log Interaction", color: "text-pink-400" },
                  ].map((qa) => (
                    <button key={qa.label} className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs text-gray-300 hover:text-white transition-colors">
                      <qa.icon className={`w-3.5 h-3.5 ${qa.color}`} />
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-white mb-3">Today's Schedule</div>
                <div className="space-y-2">
                  {[
                    { time: "10:00", event: "IB deal review — Reliance", type: "Meeting" },
                    { time: "12:30", event: "Client onboarding — AIF", type: "Onboarding" },
                    { time: "15:00", event: "Compliance call — Q4 audit", type: "Compliance" },
                    { time: "17:00", event: "Pipeline review — team sync", type: "Internal" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs">
                      <div className="text-[10px] text-gray-500 w-10 flex-shrink-0">{s.time}</div>
                      <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                      <div className="text-gray-300 truncate">{s.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
