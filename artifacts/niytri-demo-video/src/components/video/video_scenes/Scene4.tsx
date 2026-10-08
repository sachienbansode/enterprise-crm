import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const FIELDS = [
  { label: "Full Name", value: "Rajesh Kumar Mehta", masked: false, icon: "👤" },
  { label: "PAN", value: "BNZPM1234X", masked: true, icon: "🔒" },
  { label: "Mobile", value: "+91 98765 43210", masked: true, icon: "📱" },
  { label: "Email", value: "rajesh.mehta@example.com", masked: true, icon: "✉️" },
  { label: "AUM", value: "₹ 4.2 Crore", masked: false, icon: "💰" },
  { label: "KYC Status", value: "CKYC Verified ✓", masked: false, icon: "✅" },
  { label: "Risk Profile", value: "Aggressive Growth", masked: false, icon: "📊" },
  { label: "Date of Birth", value: "15 Aug 1978", masked: true, icon: "🎂" },
];

const ACTIVITIES = [
  { time: "2h ago", text: "SIP reviewed — ₹50,000/mo", type: "action" },
  { time: "1d ago", text: "KYC document uploaded", type: "doc" },
  { time: "3d ago", text: "Meeting: Portfolio review", type: "meeting" },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);
  const [piiVisible, setPiiVisible] = useState(false);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPiiVisible(true), 5000),
      setTimeout(() => setPiiVisible(false), 9000),
      setTimeout(() => setPiiVisible(true), 13000),
      setTimeout(() => setPhase(4), 7000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-stretch"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -60, filter: "blur(12px)" }}
      transition={{ duration: 0.7 }}
    >
      {/* Left panel */}
      <div className="w-[38%] px-[4vw] flex flex-col justify-center">
        <motion.p style={{ fontFamily: "var(--font-body)", color: "#EF4444" }}
          className="text-[1vw] font-bold uppercase tracking-[0.3em] mb-3"
          initial={{ opacity: 0, x: -20 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5 }}>
          Client Registry
        </motion.p>
        <motion.h2 style={{ fontFamily: "var(--font-display)" }}
          className="text-[4vw] font-black text-slate-100 leading-tight mb-4"
          initial={{ opacity: 0, x: -30 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}>
          360° Client<br /><span style={{ color: "#EF4444" }}>Intelligence</span>
        </motion.h2>
        <motion.p style={{ fontFamily: "var(--font-body)" }} className="text-[1.1vw] text-slate-400 leading-relaxed mb-5"
          initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          Complete client view across all verticals with granular PII access control.
        </motion.p>
        {/* PII Toggle */}
        <motion.div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ borderColor: piiVisible ? "#10B98150" : "#47556950", background: piiVisible ? "#10B98112" : "#1F293780" }}
          initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.2 }}>
          <motion.div className="w-10 h-5 rounded-full relative cursor-pointer flex-none"
            animate={{ background: piiVisible ? "#10B981" : "#475569" }}
            onClick={() => setPiiVisible(v => !v)}>
            <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              animate={{ left: piiVisible ? "calc(100% - 18px)" : "2px" }}
              transition={{ duration: 0.3 }} />
          </motion.div>
          <div>
            <p style={{ fontFamily: "var(--font-body)" }} className={`text-[0.85vw] font-semibold ${piiVisible ? "text-emerald-400" : "text-slate-400"}`}>
              {piiVisible ? "PII Unmasked (Owner Access)" : "PII Masked (Default)"}
            </p>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] text-slate-500">Granular role-based control</p>
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div className="mt-5 space-y-2"
          initial={{ opacity: 0 }} animate={phase >= 4 ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] font-semibold uppercase tracking-wider text-slate-500 mb-2">Recent Activity</p>
          {ACTIVITIES.map((a, i) => (
            <motion.div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#1F2937" }}
              initial={{ opacity: 0, x: -10 }} animate={phase >= 4 ? { opacity: 1, x: 0 } : {}} transition={{ delay: i * 0.1 }}>
              <span className="text-sm">{a.type === "action" ? "⚡" : a.type === "doc" ? "📄" : "📅"}</span>
              <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] text-slate-300 flex-1">{a.text}</span>
              <span style={{ fontFamily: "var(--font-mono)" }} className="text-[0.6vw] text-slate-500">{a.time}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right: Client card */}
      <div className="flex-1 flex items-center pr-[4vw]">
        <motion.div className="w-full rounded-2xl border overflow-hidden"
          style={{ borderColor: "#1E293B", background: "#111827", boxShadow: "0 25px 80px rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0, x: 60, scale: 0.93 }}
          animate={phase >= 2 ? { opacity: 1, x: 0, scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 180, damping: 24, delay: 0.2 }}>

          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: "#1E293B", background: "linear-gradient(135deg, #EF444415, #3B82F610)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 font-black text-xl text-white"
              style={{ borderColor: "#EF444460", background: "linear-gradient(135deg, #EF444430, #3B82F620)" }}>R</div>
            <div>
              <p style={{ fontFamily: "var(--font-display)" }} className="text-slate-100 font-bold text-[1.1vw]">Rajesh Kumar Mehta</p>
              <p style={{ fontFamily: "var(--font-mono)", color: "#EF4444" }} className="text-[0.75vw]">CLI-0042</p>
            </div>
            <div className="ml-auto flex gap-2">
              <span style={{ fontFamily: "var(--font-body)", background: "#10B98115", border: "1px solid #10B98140", color: "#10B981" }} className="text-[0.7vw] px-2.5 py-1 rounded-full font-semibold">
                <span style={{ background: "#10B98115", border: "1px solid #10B98140", color: "#10B981", padding: "2px 8px", borderRadius: "999px" }}>Active</span>
              </span>
            </div>
          </div>

          {/* Fields grid */}
          <div className="p-4 grid grid-cols-2 gap-2.5">
            {FIELDS.map((f, i) => (
              <motion.div key={f.label}
                className="rounded-xl px-3 py-2.5" style={{ background: "#1F2937", border: "1px solid #374151" }}
                initial={{ opacity: 0, y: 10 }} animate={phase >= 3 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.05 * i }}>
                <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.65vw] text-slate-500 mb-1 flex items-center gap-1">
                  <span>{f.icon}</span>{f.label}
                </p>
                <motion.p
                  style={{ fontFamily: f.masked ? "var(--font-mono)" : "var(--font-body)" }}
                  className="text-[0.88vw] font-semibold text-slate-200"
                  animate={{ filter: f.masked && !piiVisible ? "blur(6px)" : "blur(0px)" }}
                  transition={{ duration: 0.35 }}>
                  {f.value}
                </motion.p>
              </motion.div>
            ))}
          </div>

          {/* Vertical tags */}
          <div className="flex gap-2 px-4 pb-4">
            {[{ l: "Retail Broking", c: "#EF4444" }, { l: "Wealth Mgmt", c: "#8B5CF6" }, { l: "Fixed Deposits", c: "#3B82F6" }].map((v, i) => (
              <motion.span key={v.l} style={{ fontFamily: "var(--font-body)", color: v.c, borderColor: `${v.c}40`, background: `${v.c}15` }}
                className="text-[0.7vw] px-2.5 py-0.5 rounded-full border font-semibold"
                initial={{ opacity: 0, scale: 0 }}
                animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.35 + i * 0.07, type: "spring", stiffness: 400 }}>
                {v.l}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
