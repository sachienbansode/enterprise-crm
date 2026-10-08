import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const STAGES = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won"];
const DEALS = [
  { stage: 0, name: "SIP Portfolio Setup", value: "₹15L/yr", color: "#EF4444" },
  { stage: 0, name: "Term Plan", value: "₹1Cr Cover", color: "#3B82F6" },
  { stage: 1, name: "Home Loan", value: "₹85L", color: "#10B981" },
  { stage: 1, name: "NPS Migration", value: "₹8L", color: "#8B5CF6" },
  { stage: 2, name: "PMS Mandate", value: "₹2Cr", color: "#EF4444" },
  { stage: 2, name: "Corporate FD", value: "₹50L", color: "#3B82F6" },
  { stage: 3, name: "AIF Subscription", value: "₹1Cr", color: "#8B5CF6" },
  { stage: 4, name: "Equity Advisory", value: "₹3Cr", color: "#EF4444" },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="text-center pt-[4vh] pb-[2vh]">
        <motion.p style={{ fontFamily: "var(--font-body)", color: "#3B82F6" }}
          className="text-[1vw] font-bold uppercase tracking-[0.3em] mb-1"
          initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>Leads & Deals</motion.p>
        <motion.h2 style={{ fontFamily: "var(--font-display)" }}
          className="text-[3.8vw] font-black text-slate-100"
          initial={{ opacity: 0, y: -15 }} animate={phase >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }}>
          Visual Pipeline <span style={{ color: "#3B82F6" }}>Management</span>
        </motion.h2>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 px-[3vw] flex-1 pb-[3vh] overflow-hidden">
        {STAGES.map((stage, si) => {
          const cards = DEALS.filter(d => d.stage === si);
          return (
            <motion.div key={stage} className="flex-1 rounded-xl border overflow-hidden flex flex-col"
              style={{ borderColor: "#1E293B", background: "#111827" }}
              initial={{ opacity: 0, y: 30 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: si * 0.09, duration: 0.5 }}>

              <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "#1E293B", background: "#1F2937" }}>
                <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.78vw] font-bold text-slate-300">{stage}</span>
                <span style={{ fontFamily: "var(--font-mono)" }} className="text-[0.65vw] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{cards.length}</span>
              </div>

              <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
                {cards.map((d, ci) => (
                  <motion.div key={ci} className="rounded-xl p-2.5 border cursor-pointer"
                    style={{ borderColor: `${d.color}30`, background: `${d.color}10` }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.4 + si * 0.08 + ci * 0.07 }}
                    whileHover={{ scale: 1.02, borderColor: `${d.color}60` }}>
                    <p style={{ fontFamily: "var(--font-body)", color: d.color }} className="text-[0.75vw] font-bold truncate">{d.name}</p>
                    <p style={{ fontFamily: "var(--font-mono)" }} className="text-[0.7vw] text-slate-400 mt-0.5 font-semibold">{d.value}</p>
                  </motion.div>
                ))}
              </div>

              {si === STAGES.length - 1 && (
                <div className="p-2.5 border-t" style={{ borderColor: "#1E293B" }}>
                  <div className="rounded-lg px-2 py-1.5" style={{ background: "#10B98115", border: "1px solid #10B98130" }}>
                    <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.65vw] text-emerald-400 font-semibold">Won ↑ 28%</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bottom summary bar */}
      <motion.div className="flex items-center gap-8 px-[4vw] pb-[3vh] justify-center"
        initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
        {[
          { label: "Total Pipeline", value: "₹7.6 Cr", color: "#3B82F6" },
          { label: "Won This Month", value: "₹3 Cr", color: "#10B981" },
          { label: "Avg Deal Cycle", value: "18 days", color: "#8B5CF6" },
          { label: "Conversion Rate", value: "34%", color: "#EF4444" },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p style={{ fontFamily: "var(--font-display)", color: s.color }} className="text-[2vw] font-black">{s.value}</p>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.75vw] text-slate-400">{s.label}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
