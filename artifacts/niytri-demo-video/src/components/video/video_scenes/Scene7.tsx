import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const CONVERSATIONS = [
  {
    lang: "Hindi",
    flag: "🇮🇳",
    color: "#F97316",
    query: "पिछले 3 महीनों में किन क्लाइंट्स ने FD रिन्यू किया?",
    answer: "पिछले 3 महीनों में 24 क्लाइंट्स ने FD रिन्यू किया। कुल राशि ₹4.2 करोड़।",
    results: "24 clients · ₹4.2 Cr renewed",
  },
  {
    lang: "Tamil",
    flag: "🇮🇳",
    color: "#3B82F6",
    query: "எந்த RM-கள் இந்த மாதம் நோக்கங்களை அடையவில்லை?",
    answer: "3 RM-கள் மாத இலக்கை 80%-க்கும் குறைவாக அடைந்துள்ளனர்.",
    results: "3 RMs below target · Action needed",
  },
  {
    lang: "Marathi",
    flag: "🇮🇳",
    color: "#8B5CF6",
    query: "या महिन्यात कोणत्या ग्राहकांचे वाढदिवस आहेत?",
    answer: "या महिन्यात 18 ग्राहकांचे वाढदिवस आहेत. आपोआप शुभेच्छा पाठवल्या जातील.",
    results: "18 birthdays · Auto-greetings queued",
  },
  {
    lang: "English",
    flag: "🌐",
    color: "#10B981",
    query: "Which leads have been stuck in Proposal for more than 14 days?",
    answer: "7 leads are stalled in Proposal stage. Oldest is 31 days.",
    results: "7 stalled leads · Avg 18 days stuck",
  },
];

export function Scene7() {
  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
    ];
    const cycle = setInterval(() => setActive(a => (a + 1) % CONVERSATIONS.length), 3200);
    return () => { t.forEach(clearTimeout); clearInterval(cycle); };
  }, []);

  const conv = CONVERSATIONS[active];

  return (
    <motion.div className="absolute inset-0 flex items-center gap-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(10px)" }}
      transition={{ duration: 0.6 }}
    >
      {/* Left */}
      <div className="w-[38%] px-[4vw] flex flex-col gap-5">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}>
          <p style={{ fontFamily: "var(--font-body)", color: "#8B5CF6" }} className="text-[1vw] font-bold uppercase tracking-[0.3em] mb-2">NIYTRI AI · Multi-lingual</p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-[4vw] font-black text-slate-100 leading-tight mb-3">
            Speak your<br /><span style={{ color: "#8B5CF6" }}>language.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[1.05vw] text-slate-400 leading-relaxed">
            Query your CRM in Hindi, Tamil, Marathi, Telugu, Bengali, or any language. NIYTRI AI understands context, not just keywords.
          </p>
        </motion.div>

        {/* Language selector pills */}
        <div className="flex flex-wrap gap-2">
          {CONVERSATIONS.map((c, i) => (
            <motion.button key={c.lang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.78vw] font-semibold transition-all"
              style={{
                borderColor: active === i ? `${c.color}80` : `${c.color}30`,
                background: active === i ? `${c.color}20` : `${c.color}08`,
                color: active === i ? c.color : "#64748B",
              }}
              onClick={() => setActive(i)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.08 }}>
              <span>{c.flag}</span>{c.lang}
            </motion.button>
          ))}
        </div>

        {/* Supported languages list */}
        <motion.div className="rounded-xl border px-4 py-3" style={{ borderColor: "#1E293B", background: "#111827" }}
          initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}>
          <p style={{ fontFamily: "var(--font-body)" }} className="text-[0.7vw] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Supported Languages</p>
          <div className="flex flex-wrap gap-1.5">
            {["Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Gujarati", "Kannada", "Malayalam", "English", "+ 50 more"].map((l, i) => (
              <span key={l}
                style={{ fontFamily: "var(--font-body)", background: "#1F2937", border: "1px solid #374151", borderRadius: "999px", padding: "1px 8px", display: "inline-block", color: "#CBD5E1", fontSize: "0.65vw" }}>
                {l}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Animated conversation */}
      <div className="flex-1 pr-[3vw]">
        <motion.div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "#1E293B", background: "#111827", boxShadow: "0 20px 80px rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.2 }}>

          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#1E293B", background: "#1F2937" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-sm"
              style={{ background: "linear-gradient(135deg, #EF4444, #8B5CF6, #3B82F6)" }}>N</div>
            <div>
              <p style={{ fontFamily: "var(--font-display)" }} className="text-sm font-bold text-slate-200">NIYTRI AI</p>
              <p style={{ fontFamily: "var(--font-mono)" }} className="text-[10px] text-slate-500">Multi-lingual · Context-aware · PII Protected</p>
            </div>
            <motion.div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full border"
              animate={{ borderColor: `${conv.color}50`, background: `${conv.color}15` }}
              transition={{ duration: 0.4 }}>
              <span className="text-sm">{conv.flag}</span>
              <span style={{ fontFamily: "var(--font-body)", color: conv.color }} className="text-[0.7vw] font-semibold">{conv.lang}</span>
            </motion.div>
          </div>

          <div className="p-5 space-y-4 min-h-[32vh]">
            {/* User query */}
            <motion.div className="flex justify-end"
              key={`q-${active}`}
              initial={{ opacity: 0, y: 10, x: 10 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.35 }}>
              <div className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]"
                style={{ background: `${conv.color}20`, border: `1px solid ${conv.color}40` }}>
                <p style={{ fontFamily: "var(--font-body)", color: conv.color, direction: conv.lang === "Hindi" || conv.lang === "Marathi" ? "auto" : "ltr" }}
                  className="text-[0.95vw] leading-relaxed">
                  {conv.query}
                </p>
              </div>
            </motion.div>

            {/* AI response */}
            <motion.div className="flex gap-3"
              key={`a-${active}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-none font-bold text-white text-xs"
                style={{ background: "linear-gradient(135deg, #EF4444, #8B5CF6)" }}>N</div>
              <div className="flex-1 space-y-2">
                <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: "#1F2937", border: "1px solid #374151" }}>
                  <p style={{ fontFamily: "var(--font-body)", direction: conv.lang === "Hindi" || conv.lang === "Marathi" ? "auto" : "ltr" }}
                    className="text-[0.95vw] text-slate-200 leading-relaxed">
                    {conv.answer}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                  style={{ borderColor: "#10B98140", background: "#10B98110" }}>
                  <span className="text-[0.8vw]">📊</span>
                  <span style={{ fontFamily: "var(--font-body)" }} className="text-[0.8vw] text-emerald-400 font-semibold">{conv.results}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
