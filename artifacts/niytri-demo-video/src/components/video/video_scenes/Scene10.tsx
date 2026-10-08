import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const AUDIT_ROWS = [
  { time: "09:41", user: "Priya Sharma", role: "RM", entity: "Client", code: "CLI-0042", action: "Updated", color: "#F59E0B", fields: "kyc_status, risk_profile" },
  { time: "09:38", user: "Ravi Nair", role: "RM", entity: "Lead", code: "RB-1024", action: "Created", color: "#10B981", fields: "stage, value_estimate" },
  { time: "09:31", user: "Admin", role: "Super Admin", entity: "SR", code: "SR-5842", action: "Updated", color: "#F59E0B", fields: "status, assigned_to" },
  { time: "09:19", user: "Amit Joshi", role: "RM", entity: "Deal", code: "IB-D007", action: "Updated", color: "#F59E0B", fields: "stage" },
  { time: "09:05", user: "Neha Gupta", role: "BM", entity: "Client", code: "CLI-0091", action: "Deleted", color: "#EF4444", fields: "all" },
];

const SRS = [
  { code: "SR-5842", subject: "FD Maturity Renewal Query", status: "Open", priority: "High", sla: "2h left" },
  { code: "SR-5841", subject: "KYC Document Mismatch", status: "In Progress", priority: "Critical", sla: "Breached" },
  { code: "SR-5839", subject: "SIP Pause Request", status: "Resolved", priority: "Medium", sla: "Done" },
  { code: "SR-5836", subject: "Demat Account Transfer", status: "Open", priority: "Low", sla: "18h left" },
];

const statusC: Record<string, string> = {
  Open: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  "In Progress": "text-blue-400 border-blue-400/30 bg-blue-400/10",
  Resolved: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
};

export function Scene10() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col pt-[3vh] px-[3vw] pb-[2vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Title row */}
      <motion.div className="flex items-center justify-between mb-4"
        initial={{ opacity: 0, y: -20 }} animate={phase >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
        <div>
          <p style={{ fontFamily: "var(--font-body)", color: "#EF4444" }} className="text-[0.9vw] font-bold uppercase tracking-[0.3em] mb-1">Admin & Compliance</p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-[3.5vw] font-black text-slate-100">
            Full Audit Trail · <span style={{ color: "#3B82F6" }}>Service Requests</span>
          </h2>
        </div>
        <div className="flex gap-3">
          {[{ l: "Download CSV", c: "#10B981" }, { l: "Filter", c: "#3B82F6" }].map((b, i) => (
            <div key={b.l} className="px-4 py-2 rounded-xl border text-[0.75vw] font-semibold cursor-pointer"
              style={{ borderColor: `${b.c}50`, background: `${b.c}15`, color: b.c }}>
              {b.l}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Left: Audit log */}
        <div className="flex-1 flex flex-col">
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] font-bold uppercase tracking-wider text-slate-500 mb-2">Live Audit Trail</p>
          <motion.div className="rounded-xl border overflow-hidden flex-1"
            style={{ borderColor: "#1E293B", background: "#111827" }}
            initial={{ opacity: 0, y: 20 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "#1E293B", background: "#1F2937" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
              <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] font-semibold text-slate-400">Every change logged with before/after snapshots</span>
            </div>
            <div className="divide-y" style={{ borderColor: "#1E293B" }}>
              {AUDIT_ROWS.map((row, i) => (
                <motion.div key={i} className="flex items-center gap-3 px-4 py-2.5"
                  initial={{ opacity: 0, x: -15 }}
                  animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.15 + i * 0.09 }}>
                  <span style={{ fontFamily: "var(--font-mono)" }} className="text-[0.65vw] text-slate-500 w-10 flex-none">{row.time}</span>
                  <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] text-slate-300 flex-none w-24 truncate font-medium">{row.user}</span>
                  <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.6vw] text-slate-500 flex-none w-16 truncate">{row.role}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#EF4444" }} className="text-[0.65vw] flex-none w-18">{row.code}</span>
                  <span style={{ fontFamily: "var(--font-body)", color: row.color, background: `${row.color}15`, border: `1px solid ${row.color}40`, borderRadius: "999px", padding: "1px 8px", fontSize: "0.62vw", fontWeight: "600", flexShrink: 0, display: "inline-block" }}>
                    {row.action}
                  </span>
                  <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.62vw] text-slate-500 truncate">{row.fields}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Service Requests */}
        <div className="w-[42%] flex flex-col">
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] font-bold uppercase tracking-wider text-slate-500 mb-2">Service Request Tracker</p>
          <div className="space-y-2 flex-1">
            {SRS.map((sr, i) => (
              <motion.div key={sr.code} className="rounded-xl border px-4 py-3"
                style={{ borderColor: "#1E293B", background: "#111827" }}
                initial={{ opacity: 0, x: 20 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 240, damping: 22 }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", color: "#EF4444" }} className="text-[0.65vw] mb-0.5">{sr.code}</p>
                    <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.88vw] font-semibold text-slate-200">{sr.subject}</p>
                  </div>
                  <span style={{ fontFamily: "var(--font-body)" }} className={`text-[0.65vw] px-2.5 py-0.5 rounded-full font-semibold border flex-none ${statusC[sr.status]}`}>
                    {sr.status}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ fontFamily: "var(--font-body)" }}
                    className={`text-[0.67vw] font-bold ${sr.priority === "Critical" ? "text-red-400" : sr.priority === "High" ? "text-orange-400" : "text-slate-400"}`}>
                    {sr.priority}
                  </span>
                  <span style={{ fontFamily: "var(--font-body)" }}
                    className={`text-[0.65vw] ${sr.sla === "Breached" ? "text-red-400 font-semibold" : "text-slate-500"}`}>
                    SLA: {sr.sla}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
