import { useEffect, useRef, useState } from "react";
import { Search, X, User, TrendingUp, Briefcase, MessageSquare, Loader2 } from "lucide-react";
import { openRecord, type RecordKind } from "../lib/openRecord";
import { fmtINRStr } from "../lib/money";

// Top-bar search: clients / companies, opportunities, deals and service requests (only what the user may see).
// Type 2+ letters; ↑ ↓ to move, Enter to open, Esc to close. Ctrl+K / ⌘K focuses it.
type Hit = { kind: RecordKind; id: string; title: string; sub: string; rec: any };

export default function GlobalSearch({ isDark, className = "", wide = false }: { isDark: boolean; className?: string; wide?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null), inp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); inp.current?.focus(); setOpen(true); } };
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", k); document.addEventListener("mousedown", out);
    return () => { window.removeEventListener("keydown", k); document.removeEventListener("mousedown", out); };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); return; }
    setLoading(true);
    const ctl = new AbortController();
    const tm = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal }).then(r => r.json()).then(d => {
        const h: Hit[] = [
          ...(d.clients || []).map((c: any) => ({ kind: "client" as const, id: c.id, title: c.name, sub: [c.client_code, c.category].filter(Boolean).join(" · "), rec: c })),
          ...(d.leads || []).map((l: any) => ({ kind: "lead" as const, id: l.id, title: l.name, sub: [l.lead_code, l.vertical, l.value_estimate ? fmtINRStr(l.value_estimate) : ""].filter(Boolean).join(" · "), rec: l })),
          ...(d.deals || []).map((x: any) => ({ kind: "deal" as const, id: x.id, title: x.name, sub: [x.deal_code, x.vertical, x.stage].filter(Boolean).join(" · "), rec: x })),
          ...(d.srs || []).map((s: any) => ({ kind: "sr" as const, id: s.id, title: s.subject, sub: [s.sr_code, s.client_name, s.status].filter(Boolean).join(" · "), rec: s })),
        ];
        setHits(h); setAct(0); setOpen(true);
      }).catch(() => {}).finally(() => setLoading(false));
    }, 250);
    return () => { clearTimeout(tm); ctl.abort(); };
  }, [q]);

  const go = (h: Hit) => { openRecord(h.kind, h.rec); setOpen(false); setQ(""); setHits(null); inp.current?.blur(); };
  const label: Record<RecordKind, [string, any]> = { client: ["Clients & Companies", User], lead: ["Opportunities / Leads", TrendingUp], deal: ["Deals & Mandates", Briefcase], sr: ["Service Requests", MessageSquare] };
  const groups = (["client", "lead", "deal", "sr"] as RecordKind[]).map(k => ({ k, items: (hits || []).filter(h => h.kind === k) })).filter(g => g.items.length);
  const flat = groups.flatMap(g => g.items);
  const panel = isDark ? "bg-gray-900 border-gray-700" : "bg-white border-slate-200";

  return (
    <div ref={box} className={`relative ${className}`}>
      <div className={`flex items-center gap-2 ${isDark ? "bg-gray-800" : "bg-slate-100"} rounded-lg px-3 py-1.5`}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" /> : <Search className="w-3.5 h-3.5 opacity-60" />}
        <input ref={inp} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} aria-label="Search the CRM"
          onKeyDown={e => {
            if (e.key === "Escape") { setOpen(false); inp.current?.blur(); }
            if (e.key === "ArrowDown") { e.preventDefault(); setAct(a => Math.min(a + 1, flat.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setAct(a => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && flat[act]) go(flat[act]);
          }}
          className={`bg-transparent text-xs outline-none ${wide ? "flex-1 min-w-0" : "w-28 lg:w-44"}`} placeholder={wide ? "Search clients, opportunities, deals, SRs…" : "Search…  (Ctrl+K)"} />
        {q && <button onClick={() => { setQ(""); setHits(null); }} aria-label="Clear search" className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>}
      </div>
      {open && hits && (
        <div className={`absolute right-0 top-full mt-1.5 ${wide ? "left-0 w-auto" : "w-[380px]"} max-w-[92vw] max-h-[70vh] overflow-y-auto rounded-xl border shadow-2xl z-[60] ${panel} animate-in fade-in zoom-in-95 duration-150`}>
          {!flat.length && <div className="px-4 py-6 text-center text-xs opacity-60">No matches for "{q.trim()}"</div>}
          {groups.map(g => { const [title, Icon] = label[g.k]; return (
            <div key={g.k} className="py-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50">{title}</div>
              {g.items.map(h => { const i = flat.indexOf(h); return (
                <button key={h.kind + h.id} onMouseEnter={() => setAct(i)} onClick={() => go(h)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2.5 ${i === act ? (isDark ? "bg-blue-600/20" : "bg-blue-50") : ""}`}>
                  <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
                  <span className="min-w-0"><span className="block text-xs font-medium truncate">{h.title}</span><span className="block text-[11px] opacity-60 truncate">{h.sub}</span></span>
                </button>); })}
            </div>); })}
        </div>
      )}
    </div>
  );
}
