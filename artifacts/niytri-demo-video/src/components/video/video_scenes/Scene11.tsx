import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const LETTERS = [
  { l: "N", color: "#EF4444" },
  { l: "I", color: "#3B82F6" },
  { l: "Y", color: "#EF4444" },
  { l: "T", color: "#3B82F6" },
  { l: "R", color: "#EF4444" },
  { l: "I", color: "#3B82F6" },
];

const FEATURES = [
  { icon: "🔐", label: "M365 SSO", color: "#3B82F6" },
  { icon: "🧠", label: "AI SQL Agent", color: "#8B5CF6" },
  { icon: "🌐", label: "Multi-lingual", color: "#EF4444" },
  { icon: "🔒", label: "PII Protection", color: "#10B981" },
  { icon: "⚙️", label: "Custom Workflows", color: "#F59E0B" },
  { icon: "📋", label: "Audit Logging", color: "#3B82F6" },
  { icon: "📊", label: "Analytics", color: "#8B5CF6" },
  { icon: "🎯", label: "Pipeline Mgmt", color: "#EF4444" },
  { icon: "👥", label: "360° Client View", color: "#10B981" },
  { icon: "📱", label: "Teams Integration", color: "#F59E0B" },
  { icon: "🏭", label: "Any Industry", color: "#3B82F6" },
  { icon: "📄", label: "PDF Export", color: "#8B5CF6" },
];

export function Scene11() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 6000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
      transition={{ duration: 0.8 }}
    >
      {/* Big NIYTRI */}
      <div className="flex justify-center gap-1 mb-3">
        {LETTERS.map(({ l, color }, i) => (
          <motion.span key={i}
            style={{ fontFamily: "var(--font-display)", color, display: "inline-block" }}
            className="text-[10vw] font-black leading-none tracking-tight"
            initial={{ y: 80, opacity: 0, scale: 0.8 }}
            animate={phase >= 1 ? { y: 0, opacity: 1, scale: 1 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: i * 0.06 }}>
            {l}
          </motion.span>
        ))}
      </div>

      {/* CRM label */}
      <motion.div className="flex items-center gap-5 mb-6"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={phase >= 2 ? { opacity: 1, scaleX: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        <div className="h-px w-28" style={{ background: "linear-gradient(90deg, transparent, #EF4444)" }} />
        <span style={{ fontFamily: "var(--font-body)" }} className="text-[2vw] font-semibold tracking-[0.5em] uppercase text-slate-300">CRM</span>
        <div className="h-px w-28" style={{ background: "linear-gradient(90deg, #3B82F6, transparent)" }} />
      </motion.div>

      {/* Feature chips */}
      <motion.div className="flex flex-wrap gap-2 justify-center max-w-[65vw] mb-7"
        initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}} transition={{ duration: 0.4 }}>
        {FEATURES.map((f, i) => (
          <motion.div key={f.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.78vw] font-semibold"
            style={{ borderColor: `${f.color}40`, background: `${f.color}12`, color: f.color }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 22 }}>
            <span>{f.icon}</span>
            <span style={{ fontFamily: "var(--font-body)" }}>{f.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Divider */}
      <motion.div className="h-px mb-6"
        style={{ background: "linear-gradient(90deg, transparent, #EF4444, #8B5CF6, #3B82F6, transparent)" }}
        initial={{ width: 0 }}
        animate={phase >= 4 ? { width: "45vw" } : { width: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Final tagline */}
      <motion.p style={{ fontFamily: "var(--font-display)" }}
        className="text-[2.4vw] font-bold text-slate-200 text-center leading-snug"
        initial={{ opacity: 0, y: 25 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}>
        Your clients.{" "}
        <span style={{ color: "#EF4444" }}>Your intelligence.</span>{" "}
        <span style={{ color: "#3B82F6" }}>Your edge.</span>
      </motion.p>

      <motion.p style={{ fontFamily: "var(--font-body)" }}
        className="text-[1.1vw] text-slate-500 mt-2"
        initial={{ opacity: 0 }}
        animate={phase >= 5 ? { opacity: 1 } : {}}
        transition={{ delay: 0.3 }}>
        niytri.com · Built for every business vertical
      </motion.p>
    </motion.div>
  );
}
