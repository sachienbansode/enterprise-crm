import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const QUERY = "Show all clients with SIP above ₹1 lakh in Retail Broking with upcoming KYC renewal";
const RESULTS = [
  { name: "Rajesh Mehta", code: "CLI-0042", sip: "₹1.8L", kyc: "Expires in 12 days", rm: "Priya Sharma" },
  { name: "Anita Desai", code: "CLI-0091", sip: "₹2.5L", kyc: "Expires in 28 days", rm: "Ravi Nair" },
  { name: "Suresh Patel", code: "CLI-0018", sip: "₹1.2L", kyc: "Expires in 8 days", rm: "Priya Sharma" },
];

export function Scene6() {
  const [phase, setPhase] = useState(0);
  const [typedLen, setTypedLen] = useState(0);
  const [showRows, setShowRows] = useState(0);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [setTimeout(() => setPhase(1), 400)];
    for (let i = 1; i <= QUERY.length; i++) {
      t.push(setTimeout(() => setTypedLen(i), 500 + i * 28));
    }
    const afterType = 500 + QUERY.length * 28 + 500;
    t.push(setTimeout(() => setShowSql(true), afterType));
    t.push(setTimeout(() => setPhase(2), afterType + 1200));
    for (let r = 1; r <= RESULTS.length; r++) {
      t.push(setTimeout(() => setShowRows(r), afterType + 1400 + r * 250));
    }
    t.push(setTimeout(() => setPhase(3), afterType + 1400 + RESULTS.length * 250 + 400));
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center gap-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: 40, filter: "blur(12px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Left */}
      <div className="w-[34%] px-[4vw] flex flex-col gap-4">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}>
          <p style={{ fontFamily: "var(--font-body)", color: "#8B5CF6" }} className="text-[1vw] font-bold uppercase tracking-[0.3em] mb-2">NIYTRI AI</p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-[4vw] font-black text-slate-100 leading-tight mb-3">
            Ask in<br /><span style={{ color: "#EF4444" }}>any</span>{" "}
            <span style={{ color: "#3B82F6" }}>language.</span><br />Get live data.
          </h2>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[1.05vw] text-slate-400 leading-relaxed">
            Natural language → SQL → real-time results. No dashboard building required.
          </p>
        </motion.div>

        {/* Generated SQL */}
        {showSql && (
          <motion.div className="rounded-xl overflow-hidden border" style={{ borderColor: "#8B5CF640", background: "#1F1030" }}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "#8B5CF640" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#8B5CF6" }} />
              <span style={{ fontFamily: "var(--font-mono)", color: "#8B5CF6" }} className="text-[0.65vw] font-semibold">Generated SQL</span>
            </div>
            <pre style={{ fontFamily: "var(--font-mono)" }} className="text-[0.6vw] text-emerald-300 p-3 leading-relaxed overflow-hidden">
{`SELECT c.name, c.client_code,
  s.monthly_amount, c.kyc_expiry
FROM clients c
JOIN sip_plans s ON s.client_id = c.id
WHERE s.monthly_amount > 100000
  AND c.vertical = 'retail_broking'
  AND c.kyc_expiry < NOW() + '30 days'
ORDER BY c.kyc_expiry ASC;`}
            </pre>
          </motion.div>
        )}

        {/* Result count */}
        {phase >= 3 && (
          <motion.div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ borderColor: "#10B98140", background: "#10B98112" }}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
            <span className="text-2xl">✅</span>
            <div>
              <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.9vw] text-emerald-400 font-bold">3 clients found</p>
              <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] text-slate-400">3 need urgent KYC attention</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right: Chat UI */}
      <div className="flex-1 pr-[3vw]">
        <motion.div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "#1E293B", background: "#111827", boxShadow: "0 20px 80px rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={phase >= 1 ? { opacity: 1, x: 0, scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.2 }}>

          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#1E293B", background: "#1F2937" }}>
            <div className="relative">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white"
                style={{ background: "linear-gradient(135deg, #EF4444, #8B5CF6, #3B82F6)" }}>N</div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: "#1F2937" }} />
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-display)" }} className="text-sm font-bold text-slate-200">NIYTRI AI Assistant</p>
              <p style={{ fontFamily: "var(--font-mono)" }} className="text-[10px] text-slate-500">Powered by GPT-4o · SQL Agent · PII-Safe</p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* User query bubble */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]"
                style={{ background: "linear-gradient(135deg, #EF444425, #3B82F625)", border: "1px solid #EF444430" }}>
                <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.9vw] text-slate-200">
                  {QUERY.slice(0, typedLen)}
                  {typedLen < QUERY.length && <span className="opacity-60 animate-pulse">│</span>}
                </p>
              </div>
            </div>

            {/* AI response */}
            {phase >= 2 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.75vw] text-slate-400 mb-2">
                  Found <span className="text-slate-200 font-semibold">{RESULTS.length} clients</span> matching your criteria:
                </p>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1E293B" }}>
                  <table className="w-full text-[0.72vw]">
                    <thead>
                      <tr style={{ background: "#1F2937", borderBottom: "1px solid #1E293B" }}>
                        {["Client", "Code", "SIP/mo", "KYC Expiry", "RM"].map(h => (
                          <th key={h} style={{ fontFamily: "var(--font-body)" }} className="text-left px-3 py-2 text-slate-400 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RESULTS.slice(0, showRows).map((r, i) => (
                        <motion.tr key={i} style={{ borderBottom: "1px solid #1E293B30" }}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                          <td style={{ fontFamily: "var(--font-body)" }} className="px-3 py-2 text-slate-200 font-medium">{r.name}</td>
                          <td style={{ fontFamily: "var(--font-mono)", color: "#EF4444" }} className="px-3 py-2">{r.code}</td>
                          <td style={{ fontFamily: "var(--font-mono)", color: "#10B981" }} className="px-3 py-2 font-semibold">{r.sip}</td>
                          <td style={{ fontFamily: "var(--font-body)" }} className={`px-3 py-2 font-semibold ${r.kyc.includes("8 days") ? "text-red-400" : "text-amber-400"}`}>{r.kyc}</td>
                          <td style={{ fontFamily: "var(--font-body)" }} className="px-3 py-2 text-slate-400">{r.rm}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
