import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  ChevronDown,
  Circle,
  Clock,
  DollarSign,
  Edit,
  FileText,
  Filter,
  Globe,
  LayoutDashboard,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  Star,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

const businessLines = ["All", "Retail Broking", "Corporate Broking", "Investment Banking", "AIF", "Inst. Equities"];

const stages = [
  { id: "prospecting", label: "Prospecting", color: "bg-gray-700", count: 12, value: "₹284Cr" },
  { id: "qualified", label: "Qualified", color: "bg-blue-900/60 border-blue-800/60", count: 8, value: "₹198Cr" },
  { id: "proposal", label: "Proposal", color: "bg-violet-900/60 border-violet-800/60", count: 5, value: "₹132Cr" },
  { id: "negotiation", label: "Negotiation", color: "bg-amber-900/60 border-amber-800/60", count: 3, value: "₹87Cr" },
  { id: "won", label: "Won", color: "bg-emerald-900/60 border-emerald-800/60", count: 4, value: "₹54Cr" },
];

const leads = {
  prospecting: [
    { id: "L-3421", name: "Tata Group Treasury", contact: "Rakesh Mehta, CFO", module: "Investment Banking", value: "₹120Cr", tag: "IB", tagColor: "bg-amber-900/60 text-amber-400", days: 3, source: "Referral", priority: "High" },
    { id: "L-3418", name: "Sundaram Mutual Fund", contact: "Anitha Rao, CIO", module: "Inst. Equities", value: "₹85Cr", tag: "IE", tagColor: "bg-rose-900/60 text-rose-400", days: 5, source: "Inbound", priority: "High" },
    { id: "L-3415", name: "Dr. Venkat Krishnan", contact: "HNI Individual", module: "AIF", value: "₹5Cr", tag: "AIF", tagColor: "bg-emerald-900/60 text-emerald-400", days: 7, source: "Campaign", priority: "Medium" },
  ],
  qualified: [
    { id: "L-3402", name: "Mahindra Finance Ltd", contact: "Suresh Kumar, VP", module: "Corporate Broking", value: "₹45Cr", tag: "CB", tagColor: "bg-violet-900/60 text-violet-400", days: 12, source: "BD Team", priority: "High" },
    { id: "L-3398", name: "Pankaj Jain (HNI)", contact: "Self", module: "AIF", value: "₹8Cr", tag: "AIF", tagColor: "bg-emerald-900/60 text-emerald-400", days: 15, source: "Referral", priority: "Medium" },
  ],
  proposal: [
    { id: "L-3388", name: "Kotak Pension Fund", contact: "Deepika Menon, MD", module: "Inst. Equities", value: "₹65Cr", tag: "IE", tagColor: "bg-rose-900/60 text-rose-400", days: 22, source: "Conference", priority: "High" },
    { id: "L-3381", name: "Reliance Industries (Treasury)", contact: "Amit Shah, Treasurer", module: "Investment Banking", value: "₹200Cr", tag: "IB", tagColor: "bg-amber-900/60 text-amber-400", days: 18, source: "Referral", priority: "Critical" },
  ],
  negotiation: [
    { id: "L-3372", name: "Axis Capital Markets", contact: "Rupa Gupta, Director", module: "Corporate Broking", value: "₹32Cr", tag: "CB", tagColor: "bg-violet-900/60 text-violet-400", days: 30, source: "BD Team", priority: "High" },
  ],
  won: [
    { id: "L-3360", name: "HDFC Asset Management", contact: "Vikas Jain, CEO", module: "Inst. Equities", value: "₹150Cr", tag: "IE", tagColor: "bg-rose-900/60 text-rose-400", days: 45, source: "Referral", priority: "High" },
    { id: "L-3355", name: "Priya Nair (UHNI)", contact: "Self", module: "AIF", value: "₹25Cr", tag: "AIF", tagColor: "bg-emerald-900/60 text-emerald-400", days: 38, source: "RM Network", priority: "Medium" },
  ],
};

function LeadCard({ lead }: { lead: (typeof leads.prospecting)[0] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 cursor-pointer hover:border-gray-700 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-semibold text-white leading-tight">{lead.name}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{lead.contact}</div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${lead.tagColor}`}>{lead.tag}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${lead.priority === "Critical" ? "bg-red-900/60 text-red-400" : lead.priority === "High" ? "bg-orange-900/60 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
          {lead.priority}
        </span>
        <span className="text-[9px] text-gray-600 ml-auto">{lead.id}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">{lead.value}</span>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Clock className="w-3 h-3" /> {lead.days}d
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-800 flex items-center gap-2">
        <span className="text-[9px] text-gray-600">Source: {lead.source}</span>
        <div className="ml-auto flex items-center gap-1">
          <button className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center">
            <Phone className="w-2.5 h-2.5 text-gray-400" />
          </button>
          <button className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center">
            <Calendar className="w-2.5 h-2.5 text-gray-400" />
          </button>
          <button className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center">
            <Edit className="w-2.5 h-2.5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadManagement() {
  const [activeModule, setActiveModule] = useState("All");

  return (
    <div className="flex h-screen bg-gray-950 text-white font-['Inter'] overflow-hidden">
      {/* Compact sidebar */}
      <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div className="w-px h-4 bg-gray-700" />
        {[LayoutDashboard, Users, TrendingUp, Briefcase, FileText, BarChart3, Shield, Settings].map((Icon, i) => (
          <button key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 2 ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-4 flex-shrink-0">
          <h1 className="text-base font-bold text-white">Lead Management</h1>
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none flex-1" placeholder="Search leads..." />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-2 bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-lg border border-gray-700">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> New Lead
            </button>
          </div>
        </header>

        {/* Module filter */}
        <div className="bg-gray-900 border-b border-gray-800 px-5 flex items-center gap-2 py-2.5 overflow-x-auto">
          {businessLines.map((bl) => (
            <button
              key={bl}
              onClick={() => setActiveModule(bl)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${activeModule === bl ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {bl}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
            <span>Total pipeline: <span className="text-white font-semibold">₹755 Cr</span></span>
            <span>32 active leads</span>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-3 h-full min-w-max">
            {stages.map((stage) => (
              <div key={stage.id} className="w-72 flex flex-col flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.id === "won" ? "bg-emerald-500" : stage.id === "negotiation" ? "bg-amber-500" : stage.id === "proposal" ? "bg-violet-500" : stage.id === "qualified" ? "bg-blue-500" : "bg-gray-500"}`} />
                    <span className="text-xs font-semibold text-white">{stage.label}</span>
                    <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{stage.count}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{stage.value}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {(leads[stage.id as keyof typeof leads] || []).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                  <button className="w-full py-3 rounded-xl border border-dashed border-gray-800 text-gray-600 text-xs hover:border-gray-700 hover:text-gray-400 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3 h-3" /> Add lead
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
