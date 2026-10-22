import { useEffect, useRef, useState, type ReactNode } from "react";
import { Home, TrendingUp, Plus, Sparkles, LayoutGrid, Mic, ScanLine, X, CalendarDays, Sun, Moon, KeyRound } from "lucide-react";

// Phone-only app chrome: a floating bottom tab bar (hides while scrolling down, returns on scroll up),
// a centre "+" button with quick actions, and a "More" sheet holding the full menu.

/** true while the user scrolls down inside any scroll area; false on scroll up / near the top. */
export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const last = useRef(new WeakMap<EventTarget, number>());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = (e: Event) => {
      const el = (e.target === document ? document.scrollingElement : e.target) as HTMLElement | null;
      if (!el || typeof el.scrollTop !== "number") return;
      if (el.scrollHeight - el.clientHeight < 120) return; // short lists: keep the bars
      if (el.closest?.("[data-keep-nav]")) return;          // e.g. horizontal stage line, chat box
      const prev = last.current.get(el) ?? 0, y = el.scrollTop, d = y - prev;
      last.current.set(el, y);
      if (y < 24) setHidden(false);
      else if (d > 6) setHidden(true);
      else if (d < -6) setHidden(false);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true } as any);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("m-nav-hidden", hidden); }, [hidden]);
  return [hidden, setHidden] as const;
}

type Tab = { id: string; label: string; icon: any; active: boolean; onClick: () => void };

export function MobileTabBar({ hidden, tabs, onPlus, plusOpen }: { hidden: boolean; tabs: Tab[]; onPlus: () => void; plusOpen: boolean }) {
  const left = tabs.slice(0, 2), right = tabs.slice(2);
  const Btn = (tb: Tab) => (
    <button key={tb.id} onClick={tb.onClick} aria-label={tb.label} aria-current={tb.active ? "page" : undefined}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors active:scale-95 ${tb.active ? "text-blue-500 dark:text-blue-400" : "text-slate-500 dark:text-gray-400"}`}>
      <span className={`absolute top-1 h-1 w-6 rounded-full bg-current transition-all duration-300 ${tb.active ? "opacity-100 scale-100" : "opacity-0 scale-0"}`} />
      <tb.icon className={`w-[22px] h-[22px] transition-transform duration-300 ${tb.active ? "-translate-y-0.5" : ""}`} strokeWidth={tb.active ? 2.4 : 1.9} />
      <span className={`text-[11px] leading-none ${tb.active ? "font-semibold" : "font-medium"}`}>{tb.label}</span>
    </button>
  );
  return (
    <nav aria-label="Main" className={`md:hidden print:hidden fixed z-40 left-0 right-0 bottom-0 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pointer-events-none transition-transform duration-300 ease-out ${hidden && !plusOpen ? "translate-y-[calc(100%+48px)]" : "translate-y-0"}`}>
      <div className="pointer-events-auto relative mx-auto max-w-md h-16 rounded-[22px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] flex items-stretch">
        {left.map(Btn)}
        <div className="w-16 flex-shrink-0 flex items-start justify-center">
          <button onClick={onPlus} aria-label={plusOpen ? "Close actions" : "Quick actions"}
            className={`-mt-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center transition-transform duration-300 active:scale-90 ${plusOpen ? "rotate-45" : ""}`}>
            <Plus className="w-7 h-7" strokeWidth={2.4} />
          </button>
        </div>
        {right.map(Btn)}
      </div>
    </nav>
  );
}

/** Bottom sheet with a drag handle; swipe down or tap outside to close. */
export function MobileSheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  const [dy, setDy] = useState(0); const start = useRef<number | null>(null);
  useEffect(() => { if (!open) setDy(0); }, [open]);
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-[60] bg-black/50 animate-in fade-in duration-200" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ transform: dy ? `translateY(${dy}px)` : undefined }}
        className={`absolute inset-x-0 bottom-0 ${full ? "h-[88vh]" : "max-h-[85vh]"} flex flex-col rounded-t-[26px] bg-white dark:bg-gray-950 shadow-2xl animate-in slide-in-from-bottom duration-300 ${dy ? "" : "transition-transform"}`}>
        <div className="pt-2.5 pb-1 flex-shrink-0 touch-none"
          onTouchStart={e => { start.current = e.touches[0].clientY; }}
          onTouchMove={e => { if (start.current != null) setDy(Math.max(0, e.touches[0].clientY - start.current)); }}
          onTouchEnd={() => { if (dy > 90) onClose(); else setDy(0); start.current = null; }}>
          <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-300 dark:bg-gray-700" />
          {title && <div className="flex items-center justify-between px-5 pt-3 pb-1"><div className="text-[17px] font-bold text-slate-900 dark:text-white">{title}</div>
            <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full text-slate-500 dark:text-gray-400 active:bg-slate-100 dark:active:bg-gray-800"><X className="w-5 h-5" /></button></div>}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain pb-[max(16px,env(safe-area-inset-bottom))]" data-keep-nav>{children}</div>
      </div>
    </div>
  );
}

export function QuickActions({ onClose, onAI }: { onClose: () => void; onAI: () => void }) {
  const fire = (name: string, detail: any = {}) => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent(name, { detail })), 120); };
  const acts = [
    { label: "Quick Log", sub: "Speak or type a call / meeting note", icon: Mic, tone: "from-violet-500 to-purple-600", go: () => fire("quicklog:open") },
    { label: "Record Meeting", sub: "Transcript with each person named", icon: CalendarDays, tone: "from-rose-500 to-red-600", go: () => fire("recorder:open") },
    { label: "Scan a Card", sub: "Creates the company and contact", icon: ScanLine, tone: "from-sky-500 to-blue-600", go: () => fire("cardscan:open") },
    { label: "Ask NIYTRI AI", sub: "Pipeline, clients, SRs, tasks", icon: Sparkles, tone: "from-fuchsia-500 to-violet-600", go: () => { onClose(); onAI(); } },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-2">
      {acts.map((a, i) => (
        <button key={a.label} onClick={a.go} style={{ animationDelay: `${i * 50}ms` }}
          className="text-left rounded-2xl p-4 bg-slate-50 dark:bg-gray-900 border border-slate-200/70 dark:border-gray-800 active:scale-[0.97] transition-transform animate-in fade-in slide-in-from-bottom-3 duration-300 fill-mode-backwards">
          <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.tone} text-white flex items-center justify-center shadow-md`}><a.icon className="w-5 h-5" /></span>
          <div className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-white">{a.label}</div>
          <div className="text-[12.5px] leading-snug text-slate-500 dark:text-gray-400 mt-0.5">{a.sub}</div>
        </button>
      ))}
    </div>
  );
}

export function MoreTopRow({ isDark, setIsDark, onPII, piiCount, unit, setUnit }: { isDark: boolean; setIsDark: (v: boolean) => void; onPII: () => void; piiCount: number; unit?: string; setUnit?: (u: string) => void }) {
  const cls = "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-medium bg-slate-50 dark:bg-gray-900 border border-slate-200/70 dark:border-gray-800 text-slate-700 dark:text-gray-200 active:scale-[0.97] transition-transform";
  return (<>
    <div className="flex gap-2.5 px-4 pb-2">
      <button onClick={() => setIsDark(!isDark)} className={cls}>{isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}{isDark ? "Light Mode" : "Dark Mode"}</button>
      <button onClick={onPII} className={`${cls} relative`}><KeyRound className="w-4 h-4 text-amber-500" />Access Requests
        {piiCount > 0 && <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">{piiCount > 9 ? "9+" : piiCount}</span>}</button>
    </div>
    {setUnit && (
      <div className="px-4 pb-2">
        <div className="text-[12px] font-medium text-slate-500 dark:text-gray-400 mb-1.5">Show Amounts In</div>
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200/70 dark:border-gray-800" role="radiogroup" aria-label="Show amounts in">
          {([["rupee", "₹ Rupees"], ["lakh", "Lakh"], ["million", "Million"], ["crore", "Crore"]] as const).map(([u, l]) => (
            <button key={u} role="radio" aria-checked={unit === u} onClick={() => setUnit(u)}
              className={`py-2 rounded-xl text-[13px] font-semibold transition-colors ${unit === u ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-gray-300"}`}>{l}</button>
          ))}
        </div>
      </div>
    )}
    </>
  );
}

export const TAB_ICONS = { Home, TrendingUp, Sparkles, LayoutGrid };
