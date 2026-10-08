import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Filter,
  Globe,
  LayoutDashboard,
  MessageSquare,
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
  Mail,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const channels = ["All Channels", "Phone", "Email", "Chat", "Portal", "WhatsApp"];
const statusFilters = ["All", "Open", "In Progress", "Escalated", "Resolved", "Closed"];

const tickets = [
  { id: "SR-5901", client: "Ramesh Kumar Agarwal", subject: "TDS certificate request for FY25-26", channel: "Email", module: "Retail Broking", priority: "Medium", status: "In Progress", sla: "2h left", assignee: "Anjali Kumar", created: "Today, 9:30 AM", aging: "4h" },
  { id: "SR-5899", client: "Axis Capital Markets", subject: "Account statement for last 6 months", channel: "Portal", module: "Corporate Broking", priority: "Low", status: "Open", sla: "22h left", assignee: "Unassigned", created: "Today, 8:15 AM", aging: "5h" },
  { id: "SR-5895", client: "HDFC Life Insurance", subject: "Settlement discrepancy — order #ORD-289712", channel: "Phone", module: "Inst. Equities", priority: "High", status: "Escalated", sla: "BREACHED", assignee: "Vikram Nair", created: "Yesterday, 3:45 PM", aging: "18h" },
  { id: "SR-5892", client: "Dr. Venkat Krishnan", subject: "AIF NAV calculation query — Cat III fund", channel: "Chat", module: "AIF", priority: "High", status: "In Progress", sla: "6h left", assignee: "Priya Sharma", created: "Yesterday, 11:00 AM", aging: "22h" },
  { id: "SR-5888", client: "Sanjay Patel (HNI)", subject: "Change of bank account — Kotak to ICICI", channel: "Phone", module: "Retail Broking", priority: "High", status: "Open", sla: "4h left", assignee: "Anjali Kumar", created: "19 Mar 2026", aging: "1d 2h" },
  { id: "SR-5881", client: "Kotak Securities Ltd", subject: "Margin pledge demat instruction failed", channel: "Email", module: "Corporate Broking", priority: "Critical", status: "Escalated", sla: "BREACHED", assignee: "Vikram Nair", created: "18 Mar 2026", aging: "2d 4h" },
  { id: "SR-5874", client: "Riya Mehta", subject: "Portfolio statement download not working", channel: "Portal", module: "Retail Broking", priority: "Low", status: "Resolved", sla: "Met", assignee: "Anjali Kumar", created: "17 Mar 2026", aging: "4d" },
];

const selectedTicket = tickets[2];

const ticketMessages = [
  { from: "client", name: "HDFC Life Insurance", text: "There appears to be a ₹1.2L settlement discrepancy in order ORD-289712 executed on 15 March. Please clarify urgently.", time: "Yesterday, 3:45 PM" },
  { from: "agent", name: "CS Team", text: "Thank you for reaching out. We have raised this with our operations team and are investigating the settlement records. Reference: SR-5895.", time: "Yesterday, 4:02 PM" },
  { from: "client", name: "HDFC Life Insurance", text: "This has not been resolved in 24 hours. Escalating to your head of operations immediately.", time: "Today, 9:15 AM" },
  { from: "agent", name: "Vikram Nair", text: "Apologies for the delay. The issue has been escalated to Level 2. Our ops team has confirmed a system reconciliation error. A credit of ₹1,20,000 will be processed within 2 business hours. We sincerely regret the inconvenience.", time: "Today, 10:30 AM" },
];

const srStats = [
  { label: "Open", value: 142, color: "text-gray-300" },
  { label: "In Progress", value: 87, color: "text-blue-400" },
  { label: "Escalated", value: 12, color: "text-red-400" },
  { label: "Resolved Today", value: 56, color: "text-emerald-400" },
];

export function CustomerService() {
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeChannel, setActiveChannel] = useState("All Channels");

  return (
    <div className="flex h-screen bg-gray-950 text-white font-['Inter'] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div className="w-px h-4 bg-gray-700" />
        {[LayoutDashboard, Users, TrendingUp, Briefcase, FileText, MessageSquare, Shield, Settings].map((Icon, i) => (
          <button key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 5 ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </aside>

      <div className="flex-1 flex overflow-hidden">
        {/* Ticket list */}
        <div className="w-96 border-r border-gray-800 flex flex-col flex-shrink-0 bg-gray-900">
          <div className="h-14 flex items-center px-4 border-b border-gray-800 gap-2">
            <div>
              <div className="text-sm font-bold text-white">Customer Service</div>
              <div className="text-[10px] text-gray-500">Service Request Management</div>
            </div>
            <button className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-lg">
              <Plus className="w-3 h-3" /> New SR
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex border-b border-gray-800">
            {srStats.map((s) => (
              <div key={s.label} className="flex-1 py-2.5 px-2 text-center border-r border-gray-800 last:border-0">
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="p-2 border-b border-gray-800 space-y-2">
            <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none flex-1" placeholder="Search tickets..." />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statusFilters.map((f) => (
                <button key={f} onClick={() => setActiveStatus(f)} className={`text-[10px] px-2 py-1 rounded-full transition-colors ${activeStatus === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"}`}>{f}</button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
            {tickets.map((t) => (
              <div key={t.id} className={`p-3 cursor-pointer hover:bg-gray-800/50 transition-colors ${t.id === selectedTicket.id ? "bg-gray-800/70 border-l-2 border-blue-500" : "border-l-2 border-transparent"}`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-blue-400">{t.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${t.priority === "Critical" ? "bg-red-900/60 text-red-400" : t.priority === "High" ? "bg-orange-900/60 text-orange-400" : t.priority === "Medium" ? "bg-amber-900/60 text-amber-400" : "bg-gray-800 text-gray-500"}`}>{t.priority}</span>
                  </div>
                  <span className={`text-[9px] ${t.sla === "BREACHED" ? "text-red-400 font-bold" : "text-gray-600"}`}>{t.sla}</span>
                </div>
                <div className="text-xs text-white font-medium leading-snug mb-1">{t.subject}</div>
                <div className="text-[10px] text-gray-500 mb-1.5">{t.client} · {t.module}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${t.status === "Escalated" ? "bg-red-900/60 text-red-400" : t.status === "In Progress" ? "bg-blue-900/60 text-blue-400" : t.status === "Open" ? "bg-gray-800 text-gray-400" : t.status === "Resolved" ? "bg-emerald-900/60 text-emerald-400" : "bg-gray-800 text-gray-600"}`}>{t.status}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 ${t.channel === "Phone" ? "text-blue-400/70" : t.channel === "Email" ? "text-violet-400/70" : ""}`}>{t.channel}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-600">
                    <Clock className="w-2.5 h-2.5" /> {t.aging}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-3 flex-shrink-0">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{selectedTicket.id}</span>
                <span className="text-[10px] bg-red-900/60 text-red-400 px-2 py-0.5 rounded font-bold">ESCALATED</span>
                <span className="text-[10px] bg-red-900/60 text-red-400 px-2 py-0.5 rounded">SLA BREACHED</span>
              </div>
              <div className="text-xs text-gray-500">{selectedTicket.client} · {selectedTicket.module}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg"><RefreshCw className="w-3 h-3" /> Re-assign</button>
              <button className="flex items-center gap-1.5 bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-3 h-3" /> Resolve</button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Chat area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-gray-900/50 border-b border-gray-800 px-5 py-3">
                <div className="text-sm font-semibold text-white">{selectedTicket.subject}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedTicket.created}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedTicket.assignee}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedTicket.channel}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex-1 h-px bg-gray-800" />
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-red-500 font-medium">SLA Breached — 18h 45m overdue</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>

                {ticketMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.from === "agent" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${msg.from === "client" ? "bg-violet-900 text-violet-400" : "bg-blue-900 text-blue-400"}`}>
                      {msg.name[0]}
                    </div>
                    <div className={`max-w-sm ${msg.from === "agent" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{msg.name}</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className={`text-xs p-3 rounded-xl leading-relaxed ${msg.from === "client" ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-blue-900/40 border border-blue-800/40 text-blue-100"}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex gap-3">
                  <input className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-600" placeholder="Type a response..." />
                  <button className="bg-blue-600 text-white text-xs px-4 py-2.5 rounded-xl">Send</button>
                </div>
              </div>
            </div>

            {/* Sidebar info */}
            <div className="w-64 border-l border-gray-800 bg-gray-900 p-4 space-y-4 overflow-y-auto flex-shrink-0">
              <div>
                <div className="text-xs font-semibold text-white mb-2">Ticket Details</div>
                {[
                  { label: "Status", value: "Escalated", highlight: "text-red-400" },
                  { label: "Priority", value: "High", highlight: "text-orange-400" },
                  { label: "Channel", value: selectedTicket.channel },
                  { label: "Module", value: selectedTicket.module },
                  { label: "Assignee", value: selectedTicket.assignee },
                  { label: "SLA", value: "BREACHED", highlight: "text-red-400 font-bold" },
                  { label: "Aging", value: selectedTicket.aging },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-xs py-1.5 border-b border-gray-800 last:border-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={row.highlight || "text-gray-200"}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-white mb-2">Client Snapshot</div>
                <div className="bg-gray-800 rounded-xl p-3 space-y-1.5">
                  <div className="text-xs font-medium text-white">{selectedTicket.client}</div>
                  <div className="text-[10px] text-gray-500">{selectedTicket.module}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                    <Star className="w-3 h-3 text-amber-400" /> Premium Client
                  </div>
                  <div className="text-[10px] text-emerald-400">AUM: ₹310 Cr</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-white mb-2">Related SRs</div>
                <div className="space-y-2">
                  {[
                    { id: "SR-5720", title: "Settlement query March 5", status: "Resolved" },
                    { id: "SR-5612", title: "Account statement request", status: "Closed" },
                  ].map((r) => (
                    <div key={r.id} className="p-2 bg-gray-800 rounded-lg">
                      <div className="text-[10px] text-blue-400">{r.id}</div>
                      <div className="text-[10px] text-gray-300">{r.title}</div>
                      <div className="text-[9px] text-emerald-400">{r.status}</div>
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
