import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  LayoutDashboard,
  Lock,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const deals = [
  {
    id: "IB-2024-041",
    name: "Project Titan",
    client: "Reliance Industries Ltd",
    type: "M&A Advisory",
    value: "₹4,200 Cr",
    stage: "Due Diligence",
    stageNum: 3,
    team: ["AR", "PS", "MK"],
    daysOpen: 42,
    nda: true,
    wallCrossing: true,
    closureEst: "Jun 2026",
    priority: "Critical",
  },
  {
    id: "IB-2024-038",
    name: "Project Aurora",
    client: "Tata Capital Markets",
    type: "Equity Fundraise",
    value: "₹1,800 Cr",
    stage: "Mandate Signed",
    stageNum: 2,
    team: ["AR", "MK"],
    daysOpen: 18,
    nda: true,
    wallCrossing: false,
    closureEst: "Aug 2026",
    priority: "High",
  },
  {
    id: "IB-2024-035",
    name: "Project Nexus",
    client: "HDFC Life Insurance",
    type: "Structured Finance",
    value: "₹850 Cr",
    stage: "Term Sheet",
    stageNum: 4,
    team: ["PS", "ND"],
    daysOpen: 65,
    nda: true,
    wallCrossing: true,
    closureEst: "May 2026",
    priority: "High",
  },
  {
    id: "IB-2024-029",
    name: "Project Helix",
    client: "Mahindra & Mahindra",
    type: "Debt Capital Markets",
    value: "₹3,500 Cr",
    stage: "Closure",
    stageNum: 5,
    team: ["AR", "PS", "ND", "RK"],
    daysOpen: 89,
    nda: true,
    wallCrossing: true,
    closureEst: "Apr 2026",
    priority: "Critical",
  },
];

const dealStages = ["Pitch", "Mandate Signed", "Due Diligence", "Term Sheet", "Closure", "Completed"];

const activeDeal = deals[0];

const documents = [
  { name: "Information Memorandum", type: "Confidential", uploaded: "12 Mar 2026", by: "Arjun Rao", status: "Final" },
  { name: "Financial Model v3.2", type: "Confidential", uploaded: "18 Mar 2026", by: "Priya Sharma", status: "Final" },
  { name: "NDA – Counterparty", type: "Legal", uploaded: "28 Feb 2026", by: "Legal Team", status: "Executed" },
  { name: "Wall Crossing Log", type: "Compliance", uploaded: "1 Mar 2026", by: "System", status: "Auto-generated" },
  { name: "Management Presentation", type: "Pitch", uploaded: "15 Mar 2026", by: "Arjun Rao", status: "Draft" },
  { name: "Regulatory Clearance", type: "Compliance", uploaded: "—", by: "—", status: "Pending" },
];

const timeline = [
  { date: "28 Feb 2026", event: "NDA executed with client", by: "Legal Team", done: true },
  { date: "1 Mar 2026", event: "Mandate signed — ₹4,200Cr advisory", by: "Arjun Rao", done: true },
  { date: "3 Mar 2026", event: "Wall-crossing approved by Compliance", by: "Compliance", done: true },
  { date: "10 Mar 2026", event: "Due diligence kick-off meeting", by: "Arjun Rao", done: true },
  { date: "18 Mar 2026", event: "Financial model v3.2 submitted", by: "Priya Sharma", done: true },
  { date: "25 Mar 2026", event: "Management presentation to board", by: "Arjun Rao", done: false },
  { date: "10 Apr 2026", event: "Term sheet negotiation deadline", by: "—", done: false },
  { date: "Jun 2026", event: "Estimated deal closure", by: "—", done: false },
];

export function IBDealRoom() {
  const [selected, setSelected] = useState(deals[0]);
  const [view, setView] = useState<"list" | "detail">("list");

  return (
    <div className="flex h-screen bg-gray-950 text-white font-['Inter'] overflow-hidden">
      {/* Compact sidebar */}
      <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div className="w-px h-4 bg-gray-700" />
        {[LayoutDashboard, Users, TrendingUp, Briefcase, FileText, BarChart3, Shield, Settings].map((Icon, i) => (
          <button key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 3 ? "bg-amber-600 text-white" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </aside>

      <div className="flex-1 flex overflow-hidden">
        {/* Deal list */}
        <div className="w-80 border-r border-gray-800 flex flex-col flex-shrink-0 bg-gray-900">
          <div className="h-14 flex items-center px-4 border-b border-gray-800 gap-2">
            <div>
              <div className="text-sm font-bold text-white">Deal Room</div>
              <div className="text-[10px] text-gray-500">Investment Banking</div>
            </div>
            <button className="ml-auto flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1.5 rounded-lg">
              <Plus className="w-3 h-3" /> New Deal
            </button>
          </div>
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none flex-1" placeholder="Search deals..." />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => setSelected(deal)}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors ${selected.id === deal.id ? "border-amber-700/60 bg-amber-950/30" : "border-gray-800 hover:border-gray-700 bg-gray-900"}`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="font-semibold text-xs text-white">{deal.name}</div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${deal.priority === "Critical" ? "bg-red-900/60 text-red-400" : "bg-orange-900/60 text-orange-400"}`}>{deal.priority}</span>
                </div>
                <div className="text-[10px] text-gray-500 mb-2">{deal.client}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{deal.value}</span>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Clock className="w-3 h-3" /> {deal.daysOpen}d
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(deal.stageNum / 6) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500 whitespace-nowrap">{deal.stage}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {deal.nda && <span className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Lock className="w-2 h-2" />NDA</span>}
                  {deal.wallCrossing && <span className="text-[9px] bg-amber-900/40 text-amber-500 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Shield className="w-2 h-2" />Wall-X</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Deal detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-3 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{selected.name}</span>
                <span className="text-[10px] font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{selected.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${selected.priority === "Critical" ? "bg-red-900/60 text-red-400" : "bg-orange-900/60 text-orange-400"}`}>{selected.priority}</span>
              </div>
              <div className="text-xs text-gray-500">{selected.client} · {selected.type}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg"><Download className="w-3.5 h-3.5" /> Export</button>
              <button className="flex items-center gap-1.5 bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg"><Edit className="w-3.5 h-3.5" /> Update Stage</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Stage progress */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-white mb-3">Deal Stage Progress</div>
              <div className="flex items-center gap-0">
                {dealStages.map((stage, i) => (
                  <div key={stage} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${i < selected.stageNum ? "bg-amber-600 border-amber-600 text-white" : i === selected.stageNum ? "bg-amber-900/40 border-amber-500 text-amber-400" : "bg-gray-800 border-gray-700 text-gray-600"}`}>
                        {i < selected.stageNum ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className={`text-[9px] mt-1 text-center ${i <= selected.stageNum ? "text-white" : "text-gray-600"}`}>{stage}</div>
                    </div>
                    {i < dealStages.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${i < selected.stageNum - 1 ? "bg-amber-600" : "bg-gray-800"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Key metrics */}
              <div className="col-span-1 space-y-3">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-white mb-3">Deal Metrics</div>
                  {[
                    { label: "Deal Value", value: selected.value, highlight: true },
                    { label: "Type", value: selected.type },
                    { label: "Stage", value: selected.stage },
                    { label: "Days Open", value: `${selected.daysOpen} days` },
                    { label: "Est. Closure", value: selected.closureEst },
                    { label: "Lead RM", value: "Arjun Rao" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-xs py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-gray-500">{row.label}</span>
                      <span className={row.highlight ? "text-amber-400 font-bold" : "text-gray-200"}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-white mb-3">Compliance Flags</div>
                  {[
                    { label: "NDA Signed", done: selected.nda },
                    { label: "Wall-Crossing Logged", done: selected.wallCrossing },
                    { label: "SEBI Filing", done: false },
                    { label: "Conflict Check", done: true },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-gray-400">{c.label}</span>
                      <span className={`flex items-center gap-1 ${c.done ? "text-emerald-400" : "text-amber-400"}`}>
                        <CheckCircle2 className="w-3 h-3" /> {c.done ? "Done" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs font-semibold text-white mb-3">Deal Timeline</div>
                <div className="space-y-0">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${t.done ? "bg-amber-600" : "bg-gray-800 border border-gray-700"}`}>
                          {t.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        {i < timeline.length - 1 && <div className={`w-0.5 h-6 ${t.done ? "bg-amber-600/40" : "bg-gray-800"}`} />}
                      </div>
                      <div className="pb-4">
                        <div className={`text-xs ${t.done ? "text-gray-200" : "text-gray-500"}`}>{t.event}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{t.date} · {t.by}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div className="col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-white">Data Room</div>
                  <button className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300">
                    <Plus className="w-3 h-3" /> Upload
                  </button>
                </div>
                <div className="space-y-2">
                  {documents.map((doc, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-800 cursor-pointer group">
                      <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-200 truncate">{doc.name}</div>
                        <div className="text-[10px] text-gray-600">{doc.uploaded} · {doc.by}</div>
                      </div>
                      <span className={`text-[9px] px-1 py-0.5 rounded flex-shrink-0 ${doc.status === "Pending" ? "bg-amber-900/40 text-amber-500" : doc.status === "Draft" ? "bg-gray-700 text-gray-400" : "bg-emerald-900/40 text-emerald-500"}`}>
                        {doc.status}
                      </span>
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
