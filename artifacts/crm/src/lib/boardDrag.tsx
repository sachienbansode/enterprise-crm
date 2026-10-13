import { useEffect, useRef, useState } from "react";

// Drag a board card to another column — mouse (drag) and touch (press & hold, then drag).
// Columns mark themselves with data-drop-stage="<stage id>". Nothing moves on drop: the caller
// opens a confirmation, and only a Submit there changes the stage.
//
//   const drag = useBoardDrag<Lead>((lead, stageId) => askToMove(lead, stageId));
//   <div {...drag.cardProps(lead, lead.stage)} />   <div data-drop-stage={stage.id} className={drag.overStage === stage.id ? "ring" : ""} />
//   {drag.ghost}

type Active<T> = { item: T; from: string; x: number; y: number; w: number; label: string };

export function useBoardDrag<T>(onDrop: (item: T, toStage: string, fromStage: string) => void, labelOf: (item: T) => string) {
  const [active, setActive] = useState<Active<T> | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const pending = useRef<{ item: T; from: string; sx: number; sy: number; w: number; touch: boolean; timer?: any; el: HTMLElement } | null>(null);
  const suppressClick = useRef(false);
  const activeRef = useRef<Active<T> | null>(null); activeRef.current = active;
  const overRef = useRef<string | null>(null); overRef.current = over;
  const dropRef = useRef(onDrop); dropRef.current = onDrop;
  const labelRef = useRef(labelOf); labelRef.current = labelOf;

  useEffect(() => {
    const scrollParent = (el: HTMLElement | null): HTMLElement | null => { while (el) { const o = getComputedStyle(el).overflowY; if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight) return el; el = el.parentElement; } return null; };
    const findStage = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-drop-stage]")?.dataset.dropStage || null;
    const begin = (x: number, y: number) => {
      const p = pending.current; if (!p) return;
      clearTimeout(p.timer);
      setActive({ item: p.item, from: p.from, x, y, w: p.w, label: labelRef.current(p.item) });
      if (navigator.vibrate && p.touch) navigator.vibrate(15);
    };
    const move = (e: PointerEvent) => {
      const p = pending.current; if (!p) return;
      if (!activeRef.current) {
        const far = Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6;
        if (p.touch) { if (far) { clearTimeout(p.timer); pending.current = null; } return; } // moved before the hold → it's a scroll
        if (far) begin(e.clientX, e.clientY); else return;
      }
      e.preventDefault();
      setActive(a => (a ? { ...a, x: e.clientX, y: e.clientY } : a));
      setOver(findStage(e.clientX, e.clientY));
      const sp = scrollParent(p.el);
      if (sp) { const r = sp.getBoundingClientRect(); if (e.clientY < r.top + 50) sp.scrollTop -= 12; else if (e.clientY > r.bottom - 50) sp.scrollTop += 12; }
    };
    const up = () => {
      const p = pending.current; if (p) clearTimeout(p.timer);
      if (p && !activeRef.current) { pending.current = null; return; }
      const a = activeRef.current, to = overRef.current;
      pending.current = null; activeRef.current = null; // touchend and pointerup can both arrive — handle the drop once
      if (a) {
        suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 50);
        if (to && to !== a.from) dropRef.current(a.item, to, a.from);
      }
      setActive(null); setOver(null);
    };
    const touchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const t = e.touches[0]; if (!t) return;
      setActive(a => (a ? { ...a, x: t.clientX, y: t.clientY } : a));
      setOver(findStage(t.clientX, t.clientY));
      const sp = pending.current?.el ? scrollParent(pending.current.el) : null; // auto-scroll near the edges (stacked stages on phones)
      if (sp) { const r = sp.getBoundingClientRect(); if (t.clientY < r.top + 70) sp.scrollTop -= 14; else if (t.clientY > r.bottom - 70) sp.scrollTop += 14; }
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && activeRef.current) { pending.current = null; setActive(null); setOver(null); } };
    window.addEventListener("pointermove", move, { passive: false });
    // Touch: the browser may cancel pointer events once it decides to scroll — a long-press drag keeps going on touch events
    const cancel = () => { if (!activeRef.current) { if (pending.current) clearTimeout(pending.current.timer); pending.current = null; } };
    const touchEnd = () => { if (activeRef.current) up(); };
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchend", touchEnd); window.addEventListener("touchcancel", touchEnd);
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("keydown", key);
    (window as any).__boardBegin = begin;
    return () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchend", touchEnd); window.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("touchmove", touchMove); window.removeEventListener("keydown", key);
    };
  }, []);

  const cardProps = (item: T, from: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest("button,a,input,select,textarea")) return;
      const el = e.currentTarget; const touch = e.pointerType !== "mouse";
      pending.current = { item, from, sx: e.clientX, sy: e.clientY, w: el.offsetWidth, touch, el };
      if (touch) pending.current.timer = setTimeout(() => (window as any).__boardBegin?.(e.clientX, e.clientY), 350);
    },
    onClickCapture: (e: React.MouseEvent) => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); } },
    onContextMenu: (e: React.MouseEvent) => { if (pending.current?.touch) e.preventDefault(); },
    "data-dragging": active && (active.item as any) === item ? "true" : undefined,
    style: { touchAction: "manipulation" as const, WebkitUserSelect: "none" as const, userSelect: "none" as const },
  });

  const ghost = active ? (
    <div className="fixed z-[95] pointer-events-none" style={{ left: active.x - Math.min(active.w, 220) / 2, top: active.y - 22, width: Math.min(active.w, 220) }}>
      <div className="rounded-xl border-2 border-blue-500 bg-white dark:bg-gray-900 shadow-2xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white rotate-2 scale-105 animate-in zoom-in-90 duration-150 truncate">
        {active.label}
        <div className="text-[10px] font-normal text-blue-600 dark:text-blue-400">{over && over !== active.from ? "Release to move here" : "Drag to another stage"}</div>
      </div>
    </div>
  ) : null;

  return { cardProps, ghost, overStage: active ? over : null, dragging: !!active, draggingItem: active?.item ?? null };
}
