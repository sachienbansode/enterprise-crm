import { useEffect, useState } from "react";
import { X, CheckCircle2, RotateCcw, CalendarClock, Pencil, MessageSquare, UserCheck, PlusCircle, RefreshCw, ExternalLink, AlertTriangle, Bell, ClipboardList } from "lucide-react";
import { appToast } from "../lib/dialog";
import { openRecord } from "../lib/openRecord";

// Shared task dialogs (My Workspace, Company 360):
//  • TaskCompleteDialog — confirm completing a task with a comment, or reopening it with a reason
//  • TaskDetail         — the task in full with its trail (created, rescheduled, edited, reassigned, completed, reopened, comments)
const inputCls = "w-full px-2.5 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const day = (s?: string | null) => s ? new Date(`${String(s).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const stamp = (s?: string | null) => s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtVal = (v?: string | null) => !v ? "" : /^\d{4}-\d{2}-\d{2}T/.test(v) ? stamp(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) ? day(v) : v.replace(/^Due (\d{4}-\d{2}-\d{2})$/, (_, d) => `Due ${day(d)}`);

async function patchTask(id: string, body: any) {
  const r = await fetch(`/api/workspace/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Could not save");
  return d;
}

function Overlay({ children, onClose, wide }: { children: any; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/55 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col`}>{children}</div>
    </div>
  );
}

const QUICK = ["Done as planned", "Shared with the client", "Discussed on call", "Sent by e-mail", "Not needed any more"];

/** Confirm completing (comment required) or reopening (reason required) a task. */
export function TaskCompleteDialog({ task, onClose, onDone }: { task: any; onClose: () => void; onDone: (t: any) => void }) {
  const reopen = task.status === "Done" || task.done;
  const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  const linked = [task.lead_code && `${task.lead_code} ${task.lead_name || ""}`, task.deal_code && `${task.deal_code} ${task.deal_name || ""}`, task.client_name || task.company].filter(Boolean).join(" · ");
  const late = !reopen && task.due_date && String(task.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10);
  const go = async () => {
    if (comment.trim().length < 3) return appToast(reopen ? "Say why it is being reopened" : "Add a short comment on how it was completed", "error");
    setBusy(true);
    try { const t = await patchTask(task.id, { status: reopen ? "Open" : "Done", comment: comment.trim() }); appToast(reopen ? "Task reopened" : "Task completed", "success"); onDone(t); }
    catch (e: any) { appToast(e.message, "error"); } finally { setBusy(false); }
  };
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${reopen ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>{reopen ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-5 h-5" />}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">{reopen ? "Reopen this task?" : "Mark this task complete?"}</div>
          <div className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{task.title}</div>
          <div className="text-[11px] text-gray-500">{[task.due_date || task.date ? `Due ${day(task.due_date || task.date)}` : "", linked].filter(Boolean).join(" · ")}</div>
          {late && <div className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Completed after the due date — it will show as late in the history.</div>}
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-2">
        <label className="block text-[11px] font-medium text-gray-500">{reopen ? "Why is it being reopened? *" : "How was it completed? *"}</label>
        <textarea autoFocus rows={3} value={comment} onChange={e => setComment(e.target.value)} className={inputCls}
          placeholder={reopen ? "e.g. Client asked for a revised deck" : "e.g. Shared the deck with the CFO on e-mail; meeting fixed for Friday"} />
        {!reopen && <div className="flex flex-wrap gap-1">{QUICK.map(x => <button key={x} onClick={() => setComment(c => c ? `${c}${/[.;]$/.test(c) ? " " : "; "}${x}` : x)} className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{x}</button>)}</div>}
        <div className="text-[11px] text-gray-400">Saved in the task's history with your name and the time.</div>
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
        <button onClick={go} disabled={busy || comment.trim().length < 3} className={`text-sm px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50 flex items-center gap-1.5 ${reopen ? "bg-amber-600" : "bg-emerald-600"}`}>
          {busy && <RefreshCw className="w-4 h-4 animate-spin" />}{reopen ? "Reopen task" : "Mark complete"}</button>
      </div>
    </Overlay>
  );
}

const EV: Record<string, { label: string; icon: any; tone: string }> = {
  created: { label: "Created", icon: PlusCircle, tone: "text-blue-500" },
  rescheduled: { label: "Rescheduled", icon: CalendarClock, tone: "text-amber-500" },
  edited: { label: "Edited", icon: Pencil, tone: "text-gray-500" },
  reassigned: { label: "Reassigned", icon: UserCheck, tone: "text-violet-500" },
  completed: { label: "Completed", icon: CheckCircle2, tone: "text-emerald-500" },
  reopened: { label: "Reopened", icon: RotateCcw, tone: "text-amber-600" },
  comment: { label: "Comment", icon: MessageSquare, tone: "text-sky-500" },
};

/** The task in full: details, linked records and the complete trail; complete / reopen / reschedule / edit / comment from here. */
export function TaskDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const [t, setT] = useState<any>(null); const [err, setErr] = useState("");
  const [complete, setComplete] = useState(false); const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({}); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => fetch(`/api/workspace/tasks/${id}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Not found"); setT(d); setForm({ title: d.title, priority: d.priority || "Medium", due_date: d.due_date ? String(d.due_date).slice(0, 10) : "", notes: d.notes || "" }); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = () => { load(); onChanged?.(); };
  const saveEdit = async () => {
    setBusy(true);
    try {
      const body: any = { title: form.title, priority: form.priority, notes: form.notes };
      if (form.due_date && form.due_date !== String(t.due_date || "").slice(0, 10)) body.due_date = form.due_date;
      await patchTask(id, body); setEdit(false); appToast("Task updated", "success"); changed();
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(false); }
  };
  const addNote = async () => {
    if (!note.trim()) return;
    try { await patchTask(id, { comment: note.trim() }); setNote(""); changed(); } catch (e: any) { appToast(e.message, "error"); }
  };
  const done = t?.status === "Done";
  return (
    <Overlay onClose={onClose} wide>
      <div className="flex items-start gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"}`}>{t?.kind === "reminder" ? <Bell className="w-4 h-4" /> : done ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-4 h-4" />}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">{t ? t.title : err || "Loading…"}</div>
          {t && <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-2">
            <span className={`font-semibold ${done ? "text-emerald-600" : "text-blue-600"}`}>{done ? "Completed" : "Open"}</span>
            {t.completed_late && <span className="text-amber-600">· completed late</span>}
            <span>· {t.kind === "reminder" ? "Reminder" : "Task"} · {t.priority} priority</span>
          </div>}
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
      </div>
      {t && <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {edit ? (
          <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.due_date} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))} className={inputCls} />
              <select value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))} className={inputCls}>{["Critical", "High", "Medium", "Low"].map(x => <option key={x}>{x}</option>)}</select>
            </div>
            <textarea rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Notes" />
            <div className="flex justify-end gap-2"><button onClick={() => setEdit(false)} className="text-xs px-3 py-1.5 text-gray-500">Cancel</button>
              <button onClick={saveEdit} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold">Save</button></div>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {([
              ["Due", t.remind_at ? stamp(t.remind_at) : day(t.due_date)],
              ["Owner", t.owner_name],
              ["Created", `${stamp(t.created_at)}${t.created_by_name ? ` · ${t.created_by_name}` : ""}`],
              done ? ["Completed", `${stamp(t.completed_at)}${t.completed_by_name ? ` · ${t.completed_by_name}` : ""}`] : null,
              done && t.completion_note ? ["Completion note", t.completion_note] : null,
              t.notes ? ["Notes", t.notes] : null,
              t.vertical ? ["Vertical", t.vertical] : null,
            ].filter(Boolean) as [string, string][]).map(([k, v]) => <><span key={`k${k}`} className="text-gray-500">{k}</span><span key={`v${k}`} className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{v || "—"}</span></>)}
            {(t.lead_id || t.deal_id || t.client_id) && <><span className="text-gray-500">Linked to</span><span className="flex flex-wrap gap-2">
              {t.lead_id && <button onClick={() => { openRecord("lead", { id: t.lead_id, vertical: t.lead_vertical || t.vertical }); onClose(); }} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">{t.lead_code} {t.lead_name}<ExternalLink className="w-3 h-3" /></button>}
              {t.deal_id && <button onClick={() => { openRecord("deal", { id: t.deal_id, vertical: t.vertical, deal_code: t.deal_code }); onClose(); }} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">{t.deal_code} {t.deal_name}<ExternalLink className="w-3 h-3" /></button>}
              {t.client_name && <span className="text-gray-700 dark:text-gray-300">{t.client_name}</span>}
              {t.person_name && <span className="text-gray-700 dark:text-gray-300">{t.person_name}</span>}
            </span></>}
          </div>
        )}
        {t.can_edit && !edit && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setComplete(true)} className={`text-xs px-3 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 ${done ? "bg-amber-600" : "bg-emerald-600"}`}>{done ? <><RotateCcw className="w-3.5 h-3.5" /> Reopen</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Mark complete</>}</button>
            {!done && <button onClick={() => setEdit(true)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit / reschedule</button>}
          </div>
        )}
        <div>
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">History</div>
          <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-2 space-y-3">
            {t.trail.map((e: any, i: number) => {
              const E = EV[e.action] || EV.comment;
              return (
                <li key={e.id || i} className="ml-4">
                  <span className={`absolute -left-[9px] w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-950 flex items-center justify-center ${E.tone}`}><E.icon className="w-4 h-4" /></span>
                  <div className="text-[12px] text-gray-500">{stamp(e.at)}{e.by_name ? ` · ${e.by_name}` : ""}</div>
                  <div className="text-[13px] text-gray-900 dark:text-gray-100"><b>{E.label}</b>
                    {e.from_value || e.to_value ? <span className="text-gray-600 dark:text-gray-300"> {e.from_value ? `${fmtVal(e.from_value)} → ` : ""}{fmtVal(e.to_value)}</span> : null}</div>
                  {e.comment && <div className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">“{e.comment}”</div>}
                </li>
              );
            })}
          </ol>
        </div>
        {t.can_edit && (
          <div className="flex gap-2">
            <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} placeholder="Add a comment to the history…" className={inputCls} />
            <button onClick={addNote} disabled={!note.trim()} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Add</button>
          </div>
        )}
      </div>}
      {complete && t && <TaskCompleteDialog task={t} onClose={() => setComplete(false)} onDone={() => { setComplete(false); changed(); }} />}
    </Overlay>
  );
}
