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

export function Scene1() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 6000),
      setTimeout(() => setPhase(6), 9000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: "blur(18px)" }}
      transition={{ duration: 0.8 }}
    >
      {/* Top gold-red bar */}
      <motion.div className="absolute top-0 left-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, transparent, #EF4444, #8B5CF6, #3B82F6, transparent)" }}
        initial={{ width: 0, left: "50%" }}
        animate={phase >= 1 ? { width: "100%", left: "0%" } : {}}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Logo icon — red+blue split diamond */}
      <motion.div
        className="mb-6 relative"
        initial={{ scale: 0, rotate: -30, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : {}}
        transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.1 }}
      >
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Background glow */}
          <motion.div className="absolute inset-0 rounded-2xl blur-lg"
            style={{ background: "linear-gradient(135deg, #EF444440, #3B82F640)" }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* Icon body */}
          <div className="relative w-14 h-14 rounded-2xl border-2 border-transparent flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #EF444430, #3B82F630)", borderImage: "linear-gradient(135deg, #EF4444, #3B82F6) 1" }}>
            <span style={{ fontFamily: "var(--font-display)", background: "linear-gradient(135deg, #EF4444, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} className="text-3xl font-black">N</span>
          </div>
        </div>
      </motion.div>

      {/* NIYTRI letters */}
      <div className="flex justify-center gap-1 mb-3 overflow-hidden">
        {LETTERS.map(({ l, color }, i) => (
          <motion.span
            key={i}
            style={{ fontFamily: "var(--font-display)", color, display: "inline-block" }}
            className="text-[11vw] font-black leading-none tracking-tight"
            initial={{ y: 100, opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 320, damping: 26, delay: i * 0.07 }}
          >
            {l}
          </motion.span>
        ))}
      </div>

      {/* CRM label */}
      <motion.div
        className="mb-5"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={phase >= 3 ? { opacity: 1, scaleX: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-4">
          <div className="h-px w-20" style={{ background: "linear-gradient(90deg, transparent, #EF4444)" }} />
          <span style={{ fontFamily: "var(--font-body)" }} className="text-[2.2vw] font-semibold tracking-[0.4em] uppercase text-slate-300">CRM</span>
          <div className="h-px w-20" style={{ background: "linear-gradient(90deg, #3B82F6, transparent)" }} />
        </div>
      </motion.div>

      {/* Tagline */}
      <motion.p
        style={{ fontFamily: "var(--font-body)" }}
        className="text-[1.8vw] text-slate-400 font-light tracking-wide text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
      >
        One Platform.{" "}
        <span style={{ color: "#EF4444" }}>Infinite Verticals.</span>{" "}
        <span style={{ color: "#3B82F6" }}>Zero Silos.</span>
      </motion.p>

      {/* Feature pills */}
      <motion.div
        className="flex gap-3 mt-8 flex-wrap justify-center"
        initial={{ opacity: 0, y: 16 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        {["M365 SSO", "AI-Powered", "Multi-lingual", "Configurable Workflows", "PII Protection", "Audit Ready"].map((f, i) => (
          <motion.span key={f}
            style={{ fontFamily: "var(--font-body)", borderColor: i % 2 === 0 ? "#EF444450" : "#3B82F650", background: i % 2 === 0 ? "#EF444412" : "#3B82F612", color: "#CBD5E1" }}
            className="text-[0.85vw] px-3 py-1 rounded-full border"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 5 ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: i * 0.07, type: "spring" }}
          >{f}</motion.span>
        ))}
      </motion.div>

      {/* Bottom bar */}
      <motion.div className="absolute bottom-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(270deg, transparent, #3B82F6, #8B5CF6, #EF4444, transparent)" }}
        initial={{ width: 0, right: "50%" }}
        animate={phase >= 1 ? { width: "100%", right: "0%" } : {}}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
    </motion.div>
  );
}
