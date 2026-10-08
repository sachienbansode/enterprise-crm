import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  PieChart,
  Plus,
  Search,
  Settings,
  Shield,
  Star,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";

const tabs = ["Overview", "Portfolio", "Interactions", "Documents", "Service Requests", "Compliance"];

const holdings = [
  { name: "Nifty 50 Index Fund", type: "Equity", value: "₹1.84 Cr", alloc: 32, gain: "+12.4%", up: true },
  { name: "HDFC Balanced Advantage", type: "Hybrid", value: "₹1.12 Cr", alloc: 19, gain: "+8.1%", up: true },
  { name: "SBI Corporate Bond", type: "Debt", value: "₹0.98 Cr", alloc: 17, gain: "+6.2%", up: true },
  { name: "Mirae Asset Emerging Bluechip", type: "Equity", value: "₹0.76 Cr", alloc: 13, gain: "-2.3%", up: false },
  { name: "AIF – Category II Fund", type: "AIF", value: "₹0.92 Cr", alloc: 16, gain: "+18.7%", up: true },
  { name: "Others", type: "Mixed", value: "₹0.18 Cr", alloc: 3, gain: "+4.1%", up: true },
];

const interactions = [
  { type: "Call", summary: "Discussed portfolio rebalancing for Q4; interested in AIF Cat III product", date: "18 Mar 2026", by: "Priya Sharma", outcome: "Follow-up" },
  { type: "Email", summary: "Sent pitch deck for new AIF mandate — ₹2Cr commitment discussed", date: "14 Mar 2026", by: "Arjun Rao", outcome: "Proposal Sent" },
  { type: "Meeting", summary: "Annual portfolio review — client satisfied with 14.2% CAGR, discussed estate planning", date: "8 Mar 2026", by: "Arjun Rao", outcome: "Completed" },
  { type: "Call", summary: "Query on TDS certificate — resolved immediately", date: "2 Mar 2026", by: "CS Team", outcome: "Resolved" },
];

const documents = [
  { name: "KYC Application Form", status: "Verified", date: "Jan 2024", type: "KYC" },
  { name: "Account Opening Form", status: "Verified", date: "Jan 2024", type: "Onboarding" },
  { name: "Risk Profile Assessment", status: "Verified", date: "Mar 2025", type: "Compliance" },
  { name: "NDA – AIF Investment", status: "Signed", date: "Oct 2025", type: "Legal" },
  { name: "FATCA Declaration", status: "Verified", date: "Jan 2024", type: "Compliance" },
  { name: "Nominee Registration", status: "Pending", date: "—", type: "KYC" },
];

const srList = [
  { id: "SR-5821", title: "Request for TDS certificate FY25-26", status: "Resolved", priority: "Medium", date: "12 Mar 2026" },
  { id: "SR-5612", title: "Account statement for AIF portfolio", status: "Open", priority: "Low", date: "19 Mar 2026" },
  { id: "SR-4901", title: "Change of bank account — HDFC to Kotak", status: "In Progress", priority: "High", date: "15 Mar 2026" },
];

export function Client360() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="flex h-screen bg-gray-950 text-white font-['Inter'] overflow-hidden">
      {/* Compact sidebar */}
      <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div className="w-px h-4 bg-gray-700" />
        {[LayoutDashboard, Users, TrendingUp, Briefcase, FileText, BarChart3, Shield, Settings].map((Icon, i) => (
          <button key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 1 ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-4 flex-shrink-0">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Clients
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span className="text-gray-500">Clients</span>
            <span className="text-gray-600">/</span>
            <span className="font-medium text-white">Ramesh Kumar Agarwal</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg">
              <Edit className="w-3.5 h-3.5" /> Edit Profile
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Log Interaction
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Client header */}
          <div className="bg-gray-900 border-b border-gray-800 px-6 py-5">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xl font-bold flex-shrink-0">RK</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-white">Ramesh Kumar Agarwal</h1>
                  <BadgeCheck className="w-5 h-5 text-blue-400" />
                  <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">KYC Verified</span>
                  <span className="text-xs bg-violet-900/60 text-violet-400 border border-violet-800 px-2 py-0.5 rounded-full">AIF Investor</span>
                  <span className="text-xs bg-amber-900/60 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full">HNI ★★★★★</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><Mail className="w-3.5 h-3.5" /> ramesh.agarwal@email.com</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><Phone className="w-3.5 h-3.5" /> +91 98765 43210</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><MapPin className="w-3.5 h-3.5" /> Mumbai, Maharashtra</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400"><User className="w-3.5 h-3.5" /> RM: Priya Sharma</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total AUM", value: "₹5.80 Cr", icon: Wallet, color: "text-blue-400" },
                  { label: "Relationship Since", value: "Jan 2018", icon: Calendar, color: "text-violet-400" },
                  { label: "Wallet Share", value: "73%", icon: PieChart, color: "text-emerald-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-800 rounded-xl p-3 text-center">
                    <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                    <div className="text-base font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-900 border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-medium px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5 space-y-5">
            {activeTab === "Overview" && (
              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2 space-y-4">
                  {/* Portfolio summary */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-white">Portfolio Holdings</div>
                      <button className="text-xs text-blue-400 hover:text-blue-300">Full Portfolio →</button>
                    </div>
                    <div className="space-y-2">
                      {holdings.map((h, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <div className="flex-1 text-xs text-gray-300">{h.name}</div>
                          <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{h.type}</span>
                          <div className="w-24 bg-gray-800 rounded-full h-1.5 mx-1">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${h.alloc}%` }} />
                          </div>
                          <span className="text-xs text-white w-16 text-right font-medium">{h.value}</span>
                          <span className={`text-xs w-14 text-right ${h.up ? "text-emerald-400" : "text-red-400"}`}>{h.gain}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent interactions */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-white">Interaction History</div>
                      <button className="text-xs text-blue-400 hover:text-blue-300">View all →</button>
                    </div>
                    <div className="space-y-3">
                      {interactions.map((it, i) => (
                        <div key={i} className="flex gap-3 pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${it.type === "Call" ? "bg-blue-900 text-blue-400" : it.type === "Email" ? "bg-violet-900 text-violet-400" : "bg-amber-900 text-amber-400"}`}>
                            {it.type[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-200 leading-snug">{it.summary}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-500">{it.date}</span>
                              <span className="text-[10px] text-gray-600">by</span>
                              <span className="text-[10px] text-gray-400">{it.by}</span>
                              <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded ml-auto">{it.outcome}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Client info */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-sm font-semibold text-white mb-3">Client Details</div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Client ID", value: "CLT-00041823" },
                        { label: "PAN", value: "ABCPA1234X" },
                        { label: "Date of Birth", value: "12 Jul 1968" },
                        { label: "Risk Profile", value: "Aggressive" },
                        { label: "Segment", value: "Ultra HNI" },
                        { label: "Tax Residency", value: "Indian Resident" },
                        { label: "DEMAT Account", value: "IN301696 xxxxxxxx" },
                        { label: "Last Login", value: "Today, 9:42 AM" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-start justify-between text-xs">
                          <span className="text-gray-500 flex-shrink-0">{row.label}</span>
                          <span className="text-gray-200 text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compliance status */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="text-sm font-semibold text-white mb-3">Compliance Status</div>
                    <div className="space-y-2">
                      {[
                        { label: "KYC", status: "Verified", ok: true },
                        { label: "FATCA", status: "Filed", ok: true },
                        { label: "Risk Profiling", status: "Valid till Mar 2027", ok: true },
                        { label: "MiFID II Suitability", status: "Completed", ok: true },
                        { label: "AML Screening", status: "Cleared", ok: true },
                        { label: "Nominee Registration", status: "Pending", ok: false },
                      ].map((c) => (
                        <div key={c.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{c.label}</span>
                          <span className={`flex items-center gap-1 ${c.ok ? "text-emerald-400" : "text-amber-400"}`}>
                            <CheckCircle2 className="w-3 h-3" /> {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Documents" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <div className="text-sm font-semibold text-white">Document Vault</div>
                  <button className="flex items-center gap-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> Upload Document
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {["Document Name", "Type", "Status", "Date", "Actions"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-xs text-gray-200">{d.name}</td>
                        <td className="px-4 py-3"><span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{d.type}</span></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs flex items-center gap-1 w-fit ${d.status === "Pending" ? "text-amber-400" : "text-emerald-400"}`}>
                            <CheckCircle2 className="w-3 h-3" /> {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{d.date}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Download className="w-3.5 h-3.5 text-gray-500 hover:text-white cursor-pointer" />
                            <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-white cursor-pointer" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "Service Requests" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <div className="text-sm font-semibold text-white">Service Requests</div>
                  <button className="flex items-center gap-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> Raise SR
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {["SR ID", "Title", "Priority", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {srList.map((sr, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-xs text-blue-400 font-mono">{sr.id}</td>
                        <td className="px-4 py-3 text-xs text-gray-200">{sr.title}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${sr.priority === "High" ? "bg-red-900/60 text-red-400" : sr.priority === "Medium" ? "bg-amber-900/60 text-amber-400" : "bg-gray-800 text-gray-400"}`}>
                            {sr.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${sr.status === "Resolved" ? "text-emerald-400" : sr.status === "In Progress" ? "text-blue-400" : "text-gray-400"}`}>{sr.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{sr.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart3({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
