import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const QUERIES = [
  { q: "Revenue trend by vertical — last 6 months", icon: "📈", color: "#3B82F6" },
  { q: "Top 10 RMs by deal closure rate", icon: "🏆", color: "#EF4444" },
  { q: "Client churn risk — score above 70", icon: "⚠️", color: "#F59E0B" },
  { q: "SIP default predictions for next 30 days", icon: "🤖", color: "#8B5CF6" },
];

const BAR_DATA = [
  { label: "Retail", val: 78, color: "#EF4444" },
  { label: "IB", val: 92, color: "#3B82F6" },
  { label: "Wealth", val: 65, color: "#8B5CF6" },
  { label: "Loans", val: 84, color: "#10B981" },
  { label: "AIF", val: 71, color: "#F59E0B" },
];

export function Scene8() {
  const [phase, setPhase] = useState(0);
  const [activeQ, setActiveQ] = useState(0);
  const [barAnimate, setBarAnimate] = useState(false);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setBarAnimate(true), 1600),
      setTimeout(() => setPhase(3), 3000),
    ];
    const cycle = setInterval(() => setActiveQ(a => (a + 1) % QUERIES.length), 2800);
    return () => { t.forEach(clearTimeout); clearInterval(cycle); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 60, filter: "blur(10px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="text-center pt-[4vh] pb-[2vh]">
        <motion.p style={{ fontFamily: "var(--font-body)", color: "#8B5CF6" }}
          className="text-[1vw] font-bold uppercase tracking-[0.3em] mb-1"
          initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>NIYTRI AI · Analytics</motion.p>
        <motion.h2 style={{ fontFamily: "var(--font-display)" }} className="text-[3.8vw] font-black text-slate-100"
          initial={{ opacity: 0, y: -15 }} animate={phase >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }}>
          Instant Insights. <span style={{ color: "#8B5CF6" }}>Zero Wait.</span>
        </motion.h2>
      </div>

      {/* Main grid */}
      <div className="flex gap-4 px-[3vw] flex-1 pb-[3vh] overflow-hidden">
        {/* Left: query examples + AI chip */}
        <div className="w-[34%] flex flex-col gap-3">
          {QUERIES.map((q, i) => (
            <motion.div key={i}
              className="rounded-xl px-4 py-3 border cursor-pointer transition-all"
              style={{
                borderColor: activeQ === i ? `${q.color}70` : `${q.color}25`,
                background: activeQ === i ? `${q.color}18` : "#111827",
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              onClick={() => setActiveQ(i)}>
              <div className="flex items-center gap-2">
                <span className="text-[1.4vw]">{q.icon}</span>
                <span style={{ fontFamily: "var(--font-body)", color: activeQ === i ? q.color : "#94A3B8" }} className="text-[0.78vw] font-semibold leading-snug">{q.q}</span>
              </div>
            </motion.div>
          ))}

          {/* AI capabilities */}
          <motion.div className="rounded-xl border px-4 py-3 mt-auto" style={{ borderColor: "#1E293B", background: "#111827" }}
            initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}} transition={{ delay: 0.3 }}>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] text-slate-500 uppercase tracking-wider mb-2 font-semibold">AI Capabilities</p>
            {["Predictive churn scoring", "Revenue forecasting", "Risk profiling", "Anomaly detection"].map((cap, i) => (
              <motion.div key={cap} className="flex items-center gap-2 py-1"
                initial={{ opacity: 0, x: -10 }} animate={phase >= 3 ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.4 + i * 0.08 }}>
                <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#8B5CF6" }} />
                <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] text-slate-300">{cap}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: charts */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Bar chart */}
          <motion.div className="flex-1 rounded-2xl border p-4" style={{ borderColor: "#1E293B", background: "#111827" }}
            initial={{ opacity: 0, y: 20 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.8vw] font-bold text-slate-300 mb-3">Revenue Performance by Vertical (%)</p>
            <div className="flex items-end gap-4 h-[12vh]">
              {BAR_DATA.map((b, i) => (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div className="w-full rounded-t-lg"
                    style={{ background: `linear-gradient(180deg, ${b.color}, ${b.color}80)` }}
                    initial={{ height: 0 }}
                    animate={barAnimate ? { height: `${b.val}%` } : { height: 0 }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <span style={{ fontFamily: "var(--font-body)", color: b.color }} className="text-[0.65vw] font-bold">{b.val}%</span>
                  <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.6vw] text-slate-500">{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* KPI cards row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Churn Risk Alerts", val: "12", sub: "High-risk this month", color: "#EF4444" },
              { label: "AI Predictions Accuracy", val: "91%", sub: "Last 90 days", color: "#8B5CF6" },
              { label: "Avg Response Time", val: "0.4s", sub: "Query to result", color: "#3B82F6" },
            ].map((k, i) => (
              <motion.div key={k.label} className="rounded-xl border p-3" style={{ borderColor: `${k.color}30`, background: `${k.color}10` }}
                initial={{ opacity: 0, y: 15 }} animate={phase >= 3 ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1 }}>
                <p style={{ fontFamily: "var(--font-display)", color: k.color }} className="text-[2.2vw] font-black">{k.val}</p>
                <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] font-semibold text-slate-300">{k.label}</p>
                <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.62vw] text-slate-500">{k.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
