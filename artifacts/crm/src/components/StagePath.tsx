import { useEffect, useRef, useState } from "react";
import { Check, ChevronsRight, ChevronLeft, ChevronRight, Flag, Lock, ArrowRight } from "lucide-react";

// Stage path for opportunities and deals: chevrons across the top of the record, one action button.
// Click a chevron to select it, then "Mark as Current Stage"; or "Mark Stage as Complete" to move to the next one.
// Stages flagged Skip allowed can be skipped (shown as Skipped); Mandatory stages can't (Admin → Pipeline Stages).

export type PathStage = { id: string; label: string; skip_allowed?: boolean; is_won?: boolean; is_lost?: boolean };
type Mark = { s: "done" | "skipped"; at?: string; by?: string };

const CLIP_FIRST = "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)";
const CLIP_MID = "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)";
const CLIP_LAST = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)";
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
  // One row of chevrons with full names. If they don't fit: swipe / drag the row (or use ‹ ›) to see earlier and later stages.
  const boxRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLButtonElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = () => { const el = boxRef.current; if (el) setEdge({ l: el.scrollLeft > 2, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 }); };
  const centre = (smooth = true) => {
    const el = boxRef.current, c = curRef.current; if (!el) return;
    if (!c) { if (isLost) el.scrollTo({ left: el.scrollWidth, behavior: smooth ? "smooth" : "auto" }); return; }
    el.scrollTo({ left: Math.max(0, c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2), behavior: smooth ? "smooth" : "auto" });
  };
  useEffect(() => { centre(false); measure(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { centre(); const h = setTimeout(measure, 400); return () => clearTimeout(h); }, [current]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const ro = new ResizeObserver(measure); ro.observe(el);
    const wheel = (e: WheelEvent) => { if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); } };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", wheel); };
  }, []);
  // Mouse drag to scroll (touch swipes natively); a drag doesn't count as a click on a stage
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPD = (e: React.PointerEvent) => { if (e.pointerType !== "mouse" || !boxRef.current) return; dragRef.current = { x: e.clientX, left: boxRef.current.scrollLeft, moved: false }; };
  const onPM = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d || !boxRef.current) return;
    const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true;
    if (d.moved) boxRef.current.scrollLeft = d.left - dx;
  };
  const onPU = () => { setTimeout(() => { dragRef.current = null; }, 0); };
  const nudge = (dir: -1 | 1) => boxRef.current?.scrollBy({ left: dir * Math.max(140, (boxRef.current?.clientWidth || 300) * 0.6), behavior: "smooth" });

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
    <div className="flex flex-col gap-2">
      <div className="flex-1 min-w-0">
        <div className="relative">
          {edge.l && <button type="button" onClick={() => nudge(-1)} aria-label="Earlier stages" className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:scale-110 transition-transform animate-in fade-in zoom-in-90 duration-150"><ChevronLeft className="w-4 h-4" /></button>}
          {edge.r && <button type="button" onClick={() => nudge(1)} aria-label="Later stages" className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:scale-110 transition-transform animate-in fade-in zoom-in-90 duration-150"><ChevronRight className="w-4 h-4" /></button>}
          <div ref={boxRef} onScroll={measure} onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU}
            onClickCapture={e => { if (dragRef.current?.moved) { e.stopPropagation(); e.preventDefault(); } }}
            className={`overflow-x-auto overscroll-x-contain rounded-full select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${edge.l || edge.r ? "cursor-grab active:cursor-grabbing" : ""} ${isLost ? "opacity-60" : ""}`}
            style={{ WebkitMaskImage: edge.l || edge.r ? `linear-gradient(to right, ${edge.l ? "transparent 0, #000 36px" : "#000 0"}, ${edge.r ? "#000 calc(100% - 36px), transparent 100%" : "#000 100%"})` : undefined,
                     maskImage: edge.l || edge.r ? `linear-gradient(to right, ${edge.l ? "transparent 0, #000 36px" : "#000 0"}, ${edge.r ? "#000 calc(100% - 36px), transparent 100%" : "#000 100%"})` : undefined }}>
          <div className="flex min-w-full w-max" role="list" aria-label="Stages">
          {flow.map((s, i) => {
            const st = state(s, i);
            const selected = s.id === sel && sel !== current;
            const m = path?.[s.id];
            const tone = st === "current" ? "bg-blue-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]"
              : st === "done" ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : st === "skipped" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200 hover:bg-amber-200/80"
              : "bg-slate-200/80 text-slate-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-slate-300 dark:hover:bg-gray-700";
            const tip = [s.label, st === "skipped" ? `Skipped${m?.by ? ` by ${m.by}` : ""}${m?.at ? ` on ${fmt(m.at)}` : ""}` : st === "done" && m?.at ? `Completed ${fmt(m.at)}${m.by ? ` by ${m.by}` : ""}` : "",
              st === "todo" && s.skip_allowed === false ? "Mandatory — skipping it needs a comment" : ""].filter(Boolean).join(" · ");
            const last = i === flow.length - 1 && !isLost;
            return (
              <button key={s.id} ref={s.id === current ? curRef : undefined} role="listitem" aria-disabled={busy || readOnly || undefined} onClick={() => { if (busy || readOnly) return; setSel(s.id); setConfirmFor(null); }} title={tip}
                aria-current={st === "current" ? "step" : undefined}
                style={{ clipPath: i === 0 ? CLIP_FIRST : last ? CLIP_LAST : CLIP_MID, marginLeft: i === 0 ? 0 : -6 }}
                className={`relative h-10 flex-1 shrink-0 flex items-center justify-center gap-1.5 ${i === 0 ? "pl-4" : "pl-6"} ${last ? "pr-5" : "pr-5"} text-[13px] font-medium whitespace-nowrap transition-colors duration-300 aria-disabled:cursor-[inherit] ${tone} ${selected ? "brightness-110 ring-2 ring-inset ring-white/70" : ""}`}>
                {st === "done" && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className={st === "skipped" ? "line-through decoration-1" : ""}>{s.label}</span>
                {st === "skipped" && <ChevronsRight className="w-3.5 h-3.5 flex-shrink-0" aria-label="skipped" />}
                {st === "todo" && s.skip_allowed === false && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" aria-label="mandatory" />}
              </button>
            );
          })}
          {isLost && <div className="h-10 pl-6 pr-5 flex-1 shrink-0 flex items-center justify-center bg-red-600 text-white text-[13px] font-semibold" style={{ clipPath: CLIP_LAST, marginLeft: -6 }}>{lostStage!.label}</div>}
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
            className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 sm:flex-none disabled:opacity-50 transition-colors">
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
