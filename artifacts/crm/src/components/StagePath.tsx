import { useEffect, useRef, useState } from "react";
import { Check, ChevronsRight, ChevronLeft, ChevronRight, Flag, Lock, ArrowRight } from "lucide-react";

// Stage path for opportunities and deals: chevrons across the top of the record, one action button.
// Click a chevron to select it, then "Mark as Current Stage"; or "Mark Stage as Complete" to move to the next one.
// Stages flagged Skip allowed can be skipped (shown as Skipped); Mandatory stages can't (Admin → Pipeline Stages).

export type PathStage = { id: string; label: string; skip_allowed?: boolean; is_won?: boolean; is_lost?: boolean };
type Mark = { s: "done" | "skipped"; at?: string; by?: string };

const CLIP_FIRST = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)";
const CLIP_MID = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)";
const CLIP_LAST = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)";
const fmt = (v?: string) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");

export function StagePath({ stages, current, path, busy, onMove, compact, readOnly, askNextAction, nextAction, nextActionDate, readOnlyHint }: {
  stages: PathStage[]; current: string; path?: Record<string, Mark> | null; busy?: boolean;
  onMove: (stageId: string, extra?: Record<string, any>) => void; compact?: boolean;
  /** View mode: the path is shown but can't be changed until the record is in Edit mode */
  readOnly?: boolean;
  /** IB: moving to an active stage asks for the next action in the same confirmation */
  askNextAction?: boolean; nextAction?: string | null; nextActionDate?: string | null; readOnlyHint?: string;
}) {
  const flow = stages.filter(s => !s.is_lost && !/^lost/i.test(s.id));
  const lostStage = stages.find(s => s.is_lost || /^lost/i.test(s.id));
  const isLost = !!lostStage && current === lostStage.id;
  const cur = flow.findIndex(s => s.id === current);
  const [sel, setSel] = useState<string>(current);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);   // stage the user is about to move to
  useEffect(() => { setSel(current); setConfirmFor(null); }, [current]);
  useEffect(() => { if (readOnly) { setSel(current); setConfirmFor(null); } }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const curRef = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const measure = () => { const el = scroller.current; if (el) setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }); };
  useEffect(() => {
    const el = scroller.current, c = curRef.current;
    if (el && c) el.scrollTo({ left: Math.max(0, c.offsetLeft - el.clientWidth / 2 + c.offsetWidth / 2), behavior: "smooth" });
    setTimeout(measure, 350);
  }, [current]);
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    // Mouse wheel scrolls the stage line sideways
    const wheel = (e: WheelEvent) => { if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); } };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", wheel); };
  }, []);
  const nudge = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * Math.max(160, (scroller.current?.clientWidth || 300) * 0.7), behavior: "smooth" });

  const state = (s: PathStage, i: number) => {
    const m = path?.[s.id];
    if (s.id === current) return "current";
    if (m?.s === "skipped") return "skipped";
    if (m?.s === "done" || (!isLost && cur >= 0 && i < cur)) return "done";
    return "todo";
  };
  const iSel = flow.findIndex(s => s.id === sel);
  const next = cur >= 0 ? flow[cur + 1] : undefined;
  const atEnd = cur >= 0 && cur === flow.length - 1;

  let label = "Mark Stage as Complete", action: (() => void) | null = next ? () => setConfirmFor(next.id) : null;
  if (isLost) { label = `Re-open at ${flow[iSel]?.label || flow[0]?.label}`; action = () => setConfirmFor((flow[iSel] || flow[0]).id); }
  else if (sel !== current && iSel >= 0) { label = iSel > cur ? "Mark as Current Stage" : `Move back to ${flow[iSel].label}`; action = () => setConfirmFor(sel); }
  else if (atEnd) { label = flow[cur]?.is_won ? "Completed" : "Last stage"; action = null; }

  return (
    <div className={`flex flex-col ${compact || confirmFor ? "" : "lg:flex-row lg:items-center"} gap-2`}>
      <div className="flex-1 min-w-0">
        <div className="relative group/path">
        {edge.left && <button type="button" onClick={() => nudge(-1)} aria-label="Earlier stages" className="absolute left-0 top-0 z-10 h-9 w-8 flex items-center justify-start pl-1 bg-gradient-to-r from-white via-white/90 dark:from-gray-900 dark:via-gray-900/90 to-transparent text-gray-600 dark:text-gray-300 animate-in fade-in duration-200"><ChevronLeft className="w-4 h-4" /></button>}
        {edge.right && <button type="button" onClick={() => nudge(1)} aria-label="Later stages" className="absolute right-0 top-0 z-10 h-9 w-8 flex items-center justify-end pr-1 bg-gradient-to-l from-white via-white/90 dark:from-gray-900 dark:via-gray-900/90 to-transparent text-gray-600 dark:text-gray-300 animate-in fade-in duration-200"><ChevronRight className="w-4 h-4" /></button>}
        <div ref={scroller} onScroll={measure} className="overflow-x-auto scroll-smooth pb-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
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
              st === "todo" && s.skip_allowed === false ? "Mandatory — skipping it needs a comment" : ""].filter(Boolean).join(" · ");
            return (
              <button key={s.id} ref={s.id === current ? curRef : undefined} role="listitem" disabled={busy || readOnly} onClick={() => { setSel(s.id); setConfirmFor(null); }} title={tip}
                aria-current={st === "current" ? "step" : undefined}
                style={{ clipPath: i === 0 ? CLIP_FIRST : i === flow.length - 1 ? CLIP_LAST : CLIP_MID, marginLeft: i === 0 ? 0 : -8 }}
                className={`relative h-9 ${compact ? "min-w-[104px] px-5" : "min-w-[120px] px-6"} flex-1 flex items-center justify-center gap-1 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-default ${tone} ${selected ? "ring-2 ring-inset ring-[#0b2a5b] dark:ring-blue-400" : ""}`}>
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
      {readOnly ? (
        <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5"><Lock className="w-3 h-3" /> {readOnlyHint || <>View only — click <b>Edit</b> to change the stage</>}</div>
      ) : (
        <div className="flex gap-2 flex-shrink-0">
          <button disabled={busy || !action || !!confirmFor} onClick={() => action?.()}
            className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 lg:flex-none disabled:opacity-50">
            {sel !== current && !isLost ? <Flag className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />} {label}
          </button>
        </div>
      )}
      {confirmFor && !readOnly && (() => {
        const iT = flow.findIndex(s => s.id === confirmFor);
        const from = isLost ? lostStage?.label : flow[cur]?.label;
        const skip = iT > cur ? flow.slice(Math.max(cur, -1) + 1, iT).filter(s => !path?.[s.id]) : [];
        const target = flow[iT];
        return (
          <StageConfirm key={confirmFor} from={from || "—"} to={target?.label || confirmFor} skip={skip.map(s => ({ stage_id: s.id, label: s.label, mandatory: s.skip_allowed === false }))}
            back={iT < cur} busy={busy} askNextAction={!!askNextAction && !!target && !target.is_won && !target.is_lost} nextAction={nextAction} nextActionDate={nextActionDate}
            onCancel={() => { setConfirmFor(null); setSel(current); }}
            onSubmit={extra => onMove(confirmFor, { skip_confirmed: true, ...extra })} />
        );
      })()}
    </div>
  );
}

/** Confirm a stage change: shows what will be skipped, takes a comment (required when a mandatory stage is skipped), then Submit. */
export function StageConfirm({ from, to, skip, back, busy, askNextAction, nextAction, nextActionDate, onCancel, onSubmit, lostReasons, error }: {
  from: string; to: string; skip: { stage_id: string; label: string; mandatory?: boolean }[]; back?: boolean; busy?: boolean;
  askNextAction?: boolean; nextAction?: string | null; nextActionDate?: string | null;
  onCancel: () => void; onSubmit: (extra: Record<string, any>) => void;
  /** Moving to Lost (IB): a reason from the list + a comment are required */
  lostReasons?: string[] | null; error?: string;
}) {
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const isLostMove = Array.isArray(lostReasons);
  const [na, setNa] = useState(nextAction || "");
  const [nad, setNad] = useState(nextActionDate ? String(nextActionDate).slice(0, 10) : "");
  const mandatory = skip.filter(s => s.mandatory);
  const needComment = mandatory.length > 0 || isLostMove;
  const ok = (!needComment || comment.trim().length >= 10) && (!askNextAction || na.trim().length > 0) && (!isLostMove || !!reason);
  const field = "w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div className={`rounded-xl border p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200 ${needComment ? "border-red-500/40 bg-red-500/5" : skip.length ? "border-amber-500/40 bg-amber-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
      <div className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
        {back ? "Move back" : "Move"} <span className="px-1.5 py-0.5 rounded bg-gray-500/10">{from}</span><ArrowRight className="w-3 h-3" /><span className={`px-1.5 py-0.5 rounded text-white ${isLostMove ? "bg-red-600" : "bg-blue-600"}`}>{to}</span>
      </div>
      {skip.length > 0 && (
        <div className="text-xs text-gray-700 dark:text-gray-300">
          This skips: {skip.map((s, i) => <span key={s.stage_id}>{i ? ", " : ""}<b>{s.label}</b>{s.mandatory && <span className="ml-1 text-[10px] px-1 rounded bg-red-500/15 text-red-600 dark:text-red-400 font-semibold">mandatory</span>}</span>)}.
          {" "}Skipped stages show as <b>Skipped</b> on the record.
        </div>
      )}
      {askNextAction && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
          <label className="block"><span className="block text-[10px] text-gray-500 mb-0.5">Next action <span className="text-red-500">*</span></span>
            <input value={na} onChange={e => setNa(e.target.value)} className={field} placeholder="e.g. Share pitch deck with CFO" /></label>
          <label className="block"><span className="block text-[10px] text-gray-500 mb-0.5">By</span>
            <input type="date" value={nad} onChange={e => setNad(e.target.value)} className={field} /></label>
        </div>
      )}
      {isLostMove && (
        <label className="block"><span className="block text-[10px] text-gray-500 mb-0.5">Why was it lost? <span className="text-red-500">*</span></span>
          <select value={reason} onChange={e => setReason(e.target.value)} className={field}><option value="">— Choose a reason —</option>{lostReasons!.map(r => <option key={r}>{r}</option>)}</select></label>
      )}
      <label className="block">
        <span className="block text-[10px] text-gray-500 mb-0.5">Comment {isLostMove ? <><span className="text-red-500">*</span> — what happened? (min 10 characters)</> : needComment ? <><span className="text-red-500">*</span> — why is {mandatory.map(m => m.label).join(", ")} being skipped? (min 10 characters)</> : "(optional) — saved to History"}</span>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} className={field} placeholder={needComment ? "e.g. Client signed the mandate directly after the first meeting" : "Anything the team should know about this move"} />
      </label>
      {needComment && <div className={`text-[10px] text-right ${comment.trim().length >= 10 ? "text-emerald-500" : "text-gray-400"}`}>{comment.trim().length}/10</div>}
      {error && <div className="text-[11px] text-red-500">{error}</div>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 text-xs py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
        <button disabled={busy || !ok} onClick={() => onSubmit({ stage_comment: comment.trim() || undefined, ...(askNextAction ? { next_action: na.trim(), next_action_date: nad || null } : {}), ...(isLostMove ? { lost_reason: reason, lost_comment: comment.trim() } : {}) })}
          className="flex-1 text-xs py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40">{busy ? "Saving…" : "Submit"}</button>
      </div>
    </div>
  );
}

/** Server asked to confirm a skip (or for a comment on a mandatory skip) — e.g. after a stage change from the edit form. */
export function StageFlowPrompt({ prompt, stages, busy, onMove, onCancel }: {
  prompt: { stageId: string; code: string; carry?: Record<string, any>; skip?: { stage_id: string; label: string; mandatory?: boolean }[]; stage?: string; from?: string };
  stages: PathStage[]; busy?: boolean; onMove: (stageId: string, extra?: Record<string, any>) => void; onCancel: () => void;
}) {
  const target = stages.find(s => s.id === prompt.stageId)?.label || prompt.stageId;
  return <StageConfirm from={prompt.from || "current stage"} to={target} skip={prompt.skip || []} busy={busy} onCancel={onCancel}
    onSubmit={extra => onMove(prompt.stageId, { ...(prompt.carry || {}), skip_confirmed: true, ...extra })} />;
}

/** Modal wrapper used when a card is dragged to another column: nothing moves until Submit; Cancel puts the card back. */
export function StageMoveDialog(props: Parameters<typeof StageConfirm>[0] & { title: string }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") props.onCancel(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [props.onCancel]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200" onMouseDown={e => { if (e.target === e.currentTarget) props.onCancel(); }}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-200">
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 truncate">{props.title}</div>
        <StageConfirm {...props} />
      </div>
    </div>
  );
}
