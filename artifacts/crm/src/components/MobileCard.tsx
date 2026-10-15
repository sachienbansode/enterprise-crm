import type { ReactNode } from "react";

// Phone list card — same look as the IB opportunity / deal cards:
//   Title ......................... [badge]
//   Big value (amount / client)
//   left meta ................. right code
//   extra lines (status, SLA, owner, next step…)
// Lists render <MList> on phones and keep their table on md+ screens.

export function MList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`md:hidden space-y-2.5 ${className}`}>{children}</div>;
}

export function MCard({
  title, sub, badge, value, left, right, lines, chips, footer, onClick, selected, accent, dark,
}: {
  title: ReactNode; sub?: ReactNode; badge?: ReactNode; value?: ReactNode; left?: ReactNode; right?: ReactNode;
  lines?: ReactNode[]; chips?: ReactNode[]; footer?: ReactNode; onClick?: () => void; selected?: boolean; accent?: string; dark?: boolean;
}) {
  const muted = dark === false ? "text-slate-500" : "text-slate-500 dark:text-gray-400";
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      className={`m-card relative overflow-hidden rounded-2xl border p-3.5 bg-white dark:bg-gray-900 transition-all duration-200 active:scale-[0.985] animate-in fade-in slide-in-from-bottom-1 ${selected ? "border-blue-500 ring-1 ring-blue-500/40" : "border-slate-200 dark:border-gray-800"} ${onClick ? "cursor-pointer" : ""}`}>
      {accent && <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${accent}`} />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2 break-words">{title}</div>
          {sub && <div className={`text-[12.5px] ${muted} mt-0.5 truncate`}>{sub}</div>}
        </div>
        {badge && <div className="flex-shrink-0 flex items-center gap-1">{badge}</div>}
      </div>
      {value != null && value !== "" && <div className="mt-1.5 text-[17px] font-bold text-slate-900 dark:text-white truncate">{value}</div>}
      {(left || right) && (
        <div className={`mt-1.5 flex items-center justify-between gap-3 text-[12.5px] ${muted}`}>
          <span className="truncate min-w-0">{left}</span>
          {right && <span className="font-mono text-[12px] flex-shrink-0">{right}</span>}
        </div>
      )}
      {chips && chips.filter(Boolean).length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips.filter(Boolean)}</div>}
      {lines?.filter(Boolean).map((l, i) => <div key={i} className={`mt-1 text-[12.5px] ${muted} flex items-center gap-1.5 min-w-0`}>{l}</div>)}
      {footer && <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>{footer}</div>}
    </div>
  );
}
