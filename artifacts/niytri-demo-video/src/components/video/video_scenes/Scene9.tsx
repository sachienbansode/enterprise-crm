import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const WORKFLOWS = [
  { name: "Loan Origination", industry: "NBFC / Banking", color: "#3B82F6" },
  { name: "KYC Verification", industry: "Financial Services", color: "#8B5CF6" },
  { name: "Patient Onboarding", industry: "Healthcare", color: "#10B981" },
  { name: "Deal Closure", industry: "Investment Banking", color: "#EF4444" },
];

const STEPS = [
  { icon: "📝", label: "Lead Capture", role: "Field Agent", sla: "24h", status: "done" },
  { icon: "🔍", label: "KYC Verification", role: "Compliance", sla: "48h", status: "done" },
  { icon: "📊", label: "Credit Scoring", role: "Risk Team", sla: "12h", status: "active" },
  { icon: "✅", label: "Manager Approval", role: "BM / RM Head", sla: "24h", status: "pending" },
  { icon: "📑", label: "Documentation", role: "Legal", sla: "72h", status: "pending" },
  { icon: "💰", label: "Disbursement", role: "Operations", sla: "48h", status: "pending" },
];

export function Scene9() {
  const [phase, setPhase] = useState(0);
  const [activeWf, setActiveWf] = useState(0);
  const [stepAnim, setStepAnim] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
    ];
    const wfCycle = setInterval(() => setActiveWf(a => (a + 1) % WORKFLOWS.length), 4500);
    const stepCycle = setInterval(() => setStepAnim(a => (a + 1) % STEPS.length), 1800);
    return () => { t.forEach(clearTimeout); clearInterval(wfCycle); clearInterval(stepCycle); };
  }, []);

  const wf = WORKFLOWS[activeWf];

  return (
    <motion.div className="absolute inset-0 flex items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Left */}
      <div className="w-[38%] px-[4vw] flex flex-col gap-5">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}>
          <p style={{ fontFamily: "var(--font-body)", color: "#EF4444" }} className="text-[1vw] font-bold uppercase tracking-[0.3em] mb-2">Custom Workflows</p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-[4vw] font-black text-slate-100 leading-tight mb-3">
            Your process.<br /><span style={{ color: "#EF4444" }}>Your</span>{" "}
            <span style={{ color: "#3B82F6" }}>rules.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[1.05vw] text-slate-400 leading-relaxed">
            Map every step of your business process — approvals, SLAs, role assignments, escalations — all configurable without code.
          </p>
        </motion.div>

        {/* Workflow selector */}
        <div className="space-y-2">
          {WORKFLOWS.map((w, i) => (
            <motion.button key={w.name}
              className="w-full text-left px-4 py-3 rounded-xl border transition-all"
              style={{
                borderColor: activeWf === i ? `${w.color}70` : `${w.color}25`,
                background: activeWf === i ? `${w.color}20` : "transparent",
              }}
              onClick={() => setActiveWf(i)}
              initial={{ opacity: 0, x: -15 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.08 }}>
              <p style={{ fontFamily: "var(--font-display)", color: activeWf === i ? w.color : "#94A3B8" }} className="text-[0.9vw] font-bold">{w.name}</p>
              <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] text-slate-500">{w.industry}</p>
            </motion.button>
          ))}
        </div>

        {/* Config note */}
        <motion.div className="rounded-xl border px-4 py-3" style={{ borderColor: "#1E293B", background: "#111827" }}
          initial={{ opacity: 0 }} animate={phase >= 3 ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.72vw] text-slate-400 leading-relaxed">
            ⚙️ Drag-and-drop step builder · Role-based assignment · SLA timers · Auto-escalation · Conditional branching
          </p>
        </motion.div>
      </div>

      {/* Right: Workflow visualizer */}
      <div className="flex-1 pr-[3.5vw]">
        <motion.div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "#1E293B", background: "#111827", boxShadow: "0 20px 80px rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.2 }}>

          {/* Header */}
          <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: "#1E293B", background: "#1F2937" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${wf.color}25`, border: `1px solid ${wf.color}50` }}>
              <span className="text-sm">⚙️</span>
            </div>
            <div>
              <motion.p style={{ fontFamily: "var(--font-display)", color: wf.color }} className="text-[0.9vw] font-bold"
                key={activeWf} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{wf.name}</motion.p>
              <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.65vw] text-slate-500">{wf.industry} · {STEPS.length} steps configured</p>
            </div>
            <div className="ml-auto flex gap-2">
              {["Edit", "Clone", "Publish"].map((b, i) => (
                <span key={b}
                  style={{ fontFamily: "var(--font-body)", background: i === 2 ? "#3B82F620" : "#1F2937", border: i === 2 ? "1px solid #3B82F650" : "1px solid #374151", color: i === 2 ? "#3B82F6" : "#94A3B8", borderRadius: "6px", padding: "2px 8px", fontSize: "0.62vw", fontWeight: "600", cursor: "pointer" }}>
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="p-4 space-y-2">
            {STEPS.map((step, i) => (
              <motion.div key={step.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{
                  borderColor: i === stepAnim ? `${wf.color}70` : step.status === "done" ? "#10B98130" : "#1E293B",
                  background: i === stepAnim ? `${wf.color}15` : step.status === "done" ? "#10B98108" : "#1F293740",
                  boxShadow: i === stepAnim ? `0 0 20px ${wf.color}20` : "none",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.07 }}>

                {/* Step number */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-none text-[0.7vw] font-bold"
                  style={{
                    background: step.status === "done" ? "#10B98120" : i === stepAnim ? `${wf.color}25` : "#1F2937",
                    border: step.status === "done" ? "1px solid #10B98150" : `1px solid ${i === stepAnim ? wf.color + "60" : "#374151"}`,
                    color: step.status === "done" ? "#10B981" : i === stepAnim ? wf.color : "#64748B",
                  }}>
                  {step.status === "done" ? "✓" : i + 1}
                </div>

                <span className="text-lg flex-none">{step.icon}</span>

                <div className="flex-1">
                  <p style={{ fontFamily: "var(--font-body)", color: step.status === "done" ? "#10B981" : i === stepAnim ? wf.color : "#E2E8F0" }}
                    className="text-[0.82vw] font-semibold">{step.label}</p>
                  <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.65vw] text-slate-500">{step.role}</p>
                </div>

                {/* SLA */}
                <div className="text-right">
                  <p style={{ fontFamily: "var(--font-mono)" }} className={`text-[0.65vw] font-semibold ${step.status === "done" ? "text-emerald-400" : step.status === "active" ? "text-amber-400" : "text-slate-500"}`}>
                    SLA: {step.sla}
                  </p>
                  <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.6vw] text-slate-600 capitalize">{step.status === "active" ? "In Progress" : step.status}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
