import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const VERTICALS = [
  { label: "Retail Broking", icon: "📈", color: "#EF4444", example: "BSE/NSE trading desk" },
  { label: "Investment Banking", icon: "🏦", color: "#3B82F6", example: "M&A, IPO advisory" },
  { label: "Wealth Management", icon: "💎", color: "#8B5CF6", example: "HNI portfolios, AIF" },
  { label: "Healthcare", icon: "🏥", color: "#10B981", example: "Patient management" },
  { label: "Manufacturing", icon: "⚙️", color: "#F59E0B", example: "B2B client lifecycle" },
  { label: "Your Industry", icon: "✦", color: "#EF4444", example: "Fully configurable" },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2500),
    ];
    const cycle = setInterval(() => setActive(a => (a + 1) % VERTICALS.length), 2200);
    return () => { t.forEach(clearTimeout); clearInterval(cycle); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center gap-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Left */}
      <div className="flex-none w-[42%] px-[5vw]">
        <motion.p style={{ fontFamily: "var(--font-body)", color: "#3B82F6" }}
          className="text-[1.1vw] font-bold uppercase tracking-[0.3em] mb-3"
          initial={{ opacity: 0, x: -30 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6 }}>
          Customizable Verticals
        </motion.p>
        <motion.h2 style={{ fontFamily: "var(--font-display)" }}
          className="text-[4.5vw] font-black text-slate-100 leading-tight mb-4"
          initial={{ opacity: 0, x: -40 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.1 }}>
          Built for<br /><span style={{ color: "#3B82F6" }}>your</span>{" "}
          <span style={{ color: "#EF4444" }}>business.</span>
        </motion.h2>
        <motion.p style={{ fontFamily: "var(--font-body)" }} className="text-[1.15vw] text-slate-400 leading-relaxed mb-6"
          initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          NIYTRI CRM adapts to any industry. Define your own business verticals, custom fields, pipelines, and workflows — no code required.
        </motion.p>
        {/* Active vertical detail */}
        <motion.div
          className="rounded-2xl border px-5 py-4"
          style={{ borderColor: `${VERTICALS[active].color}50`, background: `${VERTICALS[active].color}12` }}
          animate={{ borderColor: `${VERTICALS[active].color}50`, background: `${VERTICALS[active].color}12` }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[2.2vw]">{VERTICALS[active].icon}</span>
            <span style={{ fontFamily: "var(--font-display)", color: VERTICALS[active].color }} className="text-[1.4vw] font-bold">{VERTICALS[active].label}</span>
          </div>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[1vw] text-slate-400">{VERTICALS[active].example}</p>
        </motion.div>
      </div>

      {/* Right: vertical grid */}
      <div className="flex-1 pr-[4vw] grid grid-cols-2 gap-3">
        {VERTICALS.map((v, i) => (
          <motion.div key={v.label}
            className="rounded-xl border px-4 py-3 cursor-pointer transition-all"
            style={{
              borderColor: active === i ? `${v.color}80` : `${v.color}25`,
              background: active === i ? `${v.color}18` : `${v.color}08`,
              boxShadow: active === i ? `0 0 20px ${v.color}25` : "none",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: i * 0.09, type: "spring", stiffness: 260, damping: 22 }}
            onClick={() => setActive(i)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[1.6vw]">{v.icon}</span>
              <span style={{ fontFamily: "var(--font-display)", color: v.color }} className="text-[0.9vw] font-bold">{v.label}</span>
            </div>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] text-slate-500">{v.example}</p>
          </motion.div>
        ))}
        <motion.div
          className="col-span-2 rounded-xl border border-dashed px-4 py-3 flex items-center gap-3"
          style={{ borderColor: "#3B82F650" }}
          initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}>
          <span style={{ color: "#3B82F6" }} className="text-[1.5vw]">＋</span>
          <span style={{ fontFamily: "var(--font-body)", color: "#3B82F6" }} className="text-[0.85vw] font-semibold">Add your own vertical — configure fields, stages, roles, and workflows</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
