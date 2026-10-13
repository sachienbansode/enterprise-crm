import { useEffect, useRef, useState } from "react";
import { Check, ChevronsRight, Flag } from "lucide-react";

// Stage path for opportunities and deals: chevrons across the top of the record, one action button.
// Click a chevron to select it, then "Mark as Current Stage"; or "Mark Stage as Complete" to move to the next one.
// Stages flagged Skip allowed can be skipped (shown as Skipped); Mandatory stages can't (Admin → Pipeline Stages).

export type PathStage = { id: string; label: string; skip_allowed?: boolean; is_won?: boolean; is_lost?: boolean };
type Mark = { s: "done" | "skipped"; at?: string; by?: string };

const CLIP_FIRST = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)";
const CLIP_MID = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)";
const CLIP_LAST = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)";
const fmt = (v?: string) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");

export function StagePath({ stages, current, path, busy, onMove, compact }: {
  stages: PathStage[]; current: string; path?: Record<string, Mark> | null; busy?: boolean;
  onMove: (stageId: string, extra?: Record<string, any>) => void; compact?: boolean;
}) {
  const flow = stages.filter(s => !s.is_lost && !/^lost/i.test(s.id));
  const lostStage = stages.find(s => s.is_lost || /^lost/i.test(s.id));
  const isLost = !!lostStage && current === lostStage.id;
  const cur = flow.findIndex(s => s.id === current);
  const [sel, setSel] = useState<string>(current);
  useEffect(() => setSel(current), [current]);
  const curRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { curRef.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [current]);

  const state = (s: PathStage, i: number) => {
    const m = path?.[s.id];
    if (s.id === current) return "current";
    if (m?.s === "skipped") return "skipped";
    if (m?.s === "done" || (!isLost && cur >= 0 && i < cur)) return "done";
    return "todo";
  };
  const iSel = flow.findIndex(s => s.id === sel);
  const next = cur >= 0 ? flow[cur + 1] : undefined;
  const after = cur >= 0 ? flow[cur + 2] : undefined;
  const atEnd = cur >= 0 && cur === flow.length - 1;

  let label = "Mark Stage as Complete", action: (() => void) | null = next ? () => onMove(next.id) : null;
  if (isLost) { label = `Re-open at ${flow[iSel]?.label || flow[0]?.label}`; action = () => onMove((flow[iSel] || flow[0]).id); }
  else if (sel !== current && iSel >= 0) { label = iSel > cur ? "Mark as Current Stage" : `Move back to ${flow[iSel].label}`; action = () => onMove(sel); }
  else if (atEnd) { label = flow[cur]?.is_won ? "Completed" : "Last stage"; action = null; }

  return (
    <div className={`flex flex-col ${compact ? "" : "lg:flex-row lg:items-center"} gap-2`}>
      <div className="flex-1 min-w-0">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className={`flex min-w-max rounded-full overflow-hidden ${isLost ? "opacity-60" : ""}`} role="list" aria-label="Stages">
          {flow.map((s, i) => {
            const st = state(s, i);
            const selected = s.id === sel && sel !== current;
            const m = path?.[s.id];
            const tone = st === "current" ? "bg-[#0b2a5b] text-white dark:bg-blue-700"
              : st === "done" ? "bg-emerald-600/90 text-white hover:bg-emerald-600"
              : st === "skipped" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 hover:bg-amber-200/70"
              : "bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-700";
            const tip = [s.label, st === "skipped" ? `Skipped${m?.by ? ` by ${m.by}` : ""}${m?.at ? ` on ${fmt(m.at)}` : ""}` : st === "done" && m?.at ? `Completed ${fmt(m.at)}${m.by ? ` by ${m.by}` : ""}` : "",
              st === "todo" && s.skip_allowed === false ? "Mandatory — can't be skipped" : ""].filter(Boolean).join(" · ");
            return (
              <button key={s.id} ref={s.id === current ? curRef : undefined} role="listitem" disabled={busy} onClick={() => setSel(s.id)} title={tip}
                aria-current={st === "current" ? "step" : undefined}
                style={{ clipPath: i === 0 ? CLIP_FIRST : i === flow.length - 1 ? CLIP_LAST : CLIP_MID, marginLeft: i === 0 ? 0 : -8 }}
                className={`relative h-9 ${compact ? "min-w-[104px] px-5" : "min-w-[120px] px-6"} flex-1 flex items-center justify-center gap-1 text-xs font-medium whitespace-nowrap transition-colors ${tone} ${selected ? "ring-2 ring-inset ring-[#0b2a5b] dark:ring-blue-400" : ""}`}>
                {st === "done" && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className={`truncate max-w-[140px] ${st === "skipped" ? "line-through decoration-1" : ""}`}>{s.label}</span>
                {st === "skipped" && <ChevronsRight className="w-3 h-3 flex-shrink-0" aria-label="skipped" />}
                {st === "todo" && s.skip_allowed === false && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" aria-label="mandatory" />}
              </button>
            );
          })}
          {isLost && <div className="h-9 px-4 -ml-2 flex items-center bg-red-600 text-white text-xs font-semibold" style={{ clipPath: CLIP_LAST }}>{lostStage!.label}</div>}
        </div>
        </div>
        {/* Summary line — always lists skipped steps, so they're visible even when scrolled out of view */}
        {(() => {
          const skipped = flow.filter(s => path?.[s.id]?.s === "skipped").map(s => s.label);
          return (
            <div className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-3">
              <span>{isLost ? `Lost — was at step ${Math.max(1, flow.filter(s => path?.[s.id]).length)} of ${flow.length}` : cur >= 0 ? `Step ${cur + 1} of ${flow.length}: ${flow[cur].label}` : ""}</span>
              {skipped.length > 0 && <span className="text-amber-600 dark:text-amber-400">Skipped: {skipped.join(", ")}</span>}
            </div>
          );
        })()}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!isLost && sel === current && next && after && next.skip_allowed !== false && (
          <button disabled={busy} onClick={() => onMove(after.id, { skip_confirmed: true })} title={`Skip ${next.label} and move to ${after.label}`}
            className="h-9 px-3 rounded-full border border-dashed border-slate-300 dark:border-gray-600 text-xs text-slate-600 dark:text-gray-300 hover:border-amber-500 hover:text-amber-600 flex items-center gap-1.5 whitespace-nowrap">
            <ChevronsRight className="w-3.5 h-3.5" /> Skip {next.label}
          </button>
        )}
        <button disabled={busy || !action} onClick={() => action?.()}
          className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 lg:flex-none disabled:opacity-50">
          {sel !== current && !isLost ? <Flag className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />} {label}
        </button>
      </div>
    </div>
  );
}

/** Confirm a skip / point to the mandatory stage — buttons only, never a text box. */
export function StageFlowPrompt({ prompt, stages, busy, onMove, onCancel }: {
  prompt: { stageId: string; code: string; carry?: Record<string, any>; skip?: { stage_id: string; label: string }[]; stage?: string };
  stages: PathStage[]; busy?: boolean; onMove: (stageId: string, extra?: Record<string, any>) => void; onCancel: () => void;
}) {
  const target = stages.find(s => s.id === prompt.stageId)?.label || prompt.stageId;
  const first = prompt.skip?.[0];
  const must = stages.find(s => s.id === prompt.stage);
  const btn = "text-xs py-2 px-3 rounded-lg font-medium disabled:opacity-50";
  if (prompt.code === "STAGE_MANDATORY") return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-2">
      <div className="text-xs font-semibold text-red-600 dark:text-red-400">{must?.label || "A stage"} is mandatory</div>
      <div className="text-xs text-gray-700 dark:text-gray-300">It can't be skipped — move to {must?.label || "it"} first, then on to {target}.</div>
      <div className="flex gap-2">
        <button onClick={onCancel} className={`${btn} flex-1 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300`}>Cancel</button>
        {must && <button disabled={busy} onClick={() => onMove(must.id, prompt.carry)} className={`${btn} flex-1 bg-blue-600 text-white`}>Go to {must.label}</button>}
      </div>
    </div>
  );
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
      <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">Move to {target}?</div>
      <div className="text-xs text-gray-700 dark:text-gray-300">This skips {prompt.skip?.map(x => x.label).join(", ")}. Skipped stages stay visible as <b>Skipped</b>.</div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button disabled={busy} onClick={() => onMove(prompt.stageId, { ...(prompt.carry || {}), skip_confirmed: true })} className={`${btn} flex-1 bg-amber-600 text-white`}>
          Skip {prompt.skip?.length === 1 ? first?.label : `${prompt.skip?.length} stages`} & move</button>
        {first && <button disabled={busy} onClick={() => onMove(first.stage_id, prompt.carry)} className={`${btn} flex-1 bg-blue-600 text-white`}>Go to {first.label} instead</button>}
        <button onClick={onCancel} className={`${btn} border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300`}>Cancel</button>
      </div>
    </div>
  );
}
