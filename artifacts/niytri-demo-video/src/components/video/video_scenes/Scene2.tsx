import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const SYSTEMS = [
  { label: "Spreadsheet\nChaos", icon: "⚠", color: "#EF4444" },
  { label: "Legacy\nERP", icon: "⚙", color: "#F59E0B" },
  { label: "Disconnected\nCRM", icon: "🔌", color: "#EF4444" },
  { label: "Siloed\nReports", icon: "📊", color: "#F59E0B" },
  { label: "Manual\nFollowups", icon: "📧", color: "#EF4444" },
];

export function Scene2() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 9000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      exit={{ clipPath: "inset(0 0 0 100%)" }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div className="text-center mb-10"
        initial={{ opacity: 0, y: -30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
      >
        <p style={{ fontFamily: "var(--font-body)", color: "#EF4444" }} className="text-[1.2vw] font-bold uppercase tracking-[0.35em] mb-3">
          <span style={{ color: "#EF4444" }}>The Problem</span>
        </p>
        <h2 style={{ fontFamily: "var(--font-display)" }} className="text-[5vw] font-black text-slate-100 leading-tight">
          Your team works harder.<br />
          <span style={{ color: "#EF4444" }}>Your data works against you.</span>
        </h2>
      </motion.div>

      {/* Broken systems */}
      <div className="flex gap-5 mb-8">
        {SYSTEMS.map((s, i) => (
          <motion.div key={i}
            className="flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border"
            style={{ borderColor: `${s.color}50`, background: `${s.color}10`, width: "9.5vw" }}
            initial={{ opacity: 0, y: 50, rotate: (i - 2) * 4 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 220, damping: 20, delay: i * 0.1 }}
          >
            {/* Crack/break effect */}
            <motion.div
              className="relative"
              animate={phase >= 3 ? { rotate: [0, -3, 3, 0], scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <span className="text-[3vw]">{s.icon}</span>
            </motion.div>
            <span style={{ fontFamily: "var(--font-body)", color: s.color }} className="text-[0.75vw] font-semibold text-center whitespace-pre-line leading-tight">{s.label}</span>
            {/* Warning dot */}
            <motion.div className="w-2 h-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <motion.div
        className="flex gap-8"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        {[
          { num: "68%", label: "time wasted on manual data entry" },
          { num: "3.5×", label: "more errors with siloed data" },
          { num: "₹40L+", label: "lost annually to missed follow-ups" },
        ].map((s, i) => (
          <motion.div key={i} className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={phase >= 4 ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 22 }}
          >
            <p style={{ fontFamily: "var(--font-display)", color: "#EF4444" }} className="text-[3.5vw] font-black">{s.num}</p>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.9vw] text-slate-400 max-w-[14vw]">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* "There's a better way" */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 5 ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border"
          style={{ borderColor: "#3B82F640", background: "#3B82F615" }}>
          <span style={{ fontFamily: "var(--font-display)", color: "#3B82F6" }} className="text-[2vw] font-bold">NIYTRI CRM</span>
          <span className="text-slate-400 text-[1.1vw]">eliminates every one of these</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
