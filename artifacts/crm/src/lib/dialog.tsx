import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

// In-app replacements for the browser's confirm() / alert() boxes.
//   if (!(await appConfirm({ title: "Delete stage?", message: "…", confirmLabel: "Delete", tone: "danger" }))) return;
//   appToast("Saved", "success");
// <DialogHost /> is mounted once in the app shell.

type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; tone?: "danger" | "primary" };
type ToastTone = "success" | "error" | "info";
type Pending = ConfirmOpts & { resolve: (v: boolean) => void };

let pushConfirm: ((p: Pending) => void) | null = null;
let pushToast: ((t: { id: number; text: string; tone: ToastTone }) => void) | null = null;

export function appConfirm(opts: ConfirmOpts | string): Promise<boolean> {
  const o = typeof opts === "string" ? { title: opts } : opts;
  return new Promise(resolve => { if (pushConfirm) pushConfirm({ ...o, resolve }); else resolve(false); });
}
export function appToast(text: string, tone: ToastTone = "info") { pushToast?.({ id: Date.now() + Math.random(), text, tone }); }

export function DialogHost() {
  const [q, setQ] = useState<Pending[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: ToastTone }[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    pushConfirm = p => setQ(x => [...x, p]);
    pushToast = t => { setToasts(x => [...x, t]); setTimeout(() => setToasts(x => x.filter(y => y.id !== t.id)), t.tone === "error" ? 6000 : 3500); };
    return () => { pushConfirm = null; pushToast = null; };
  }, []);
  const cur = q[0];
  const done = (v: boolean) => { cur?.resolve(v); setQ(x => x.slice(1)); };
  useEffect(() => {
    if (!cur) return;
    okRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
    window.addEventListener("keydown", h, true); return () => window.removeEventListener("keydown", h, true);
  }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps

  return (<>
    {cur && (
      <div className="fixed inset-0 animate-in fade-in duration-200 z-[100] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) done(false); }}>
        <div role="alertdialog" aria-modal="true" aria-labelledby="appdlg-t" className="animate-in slide-in-from-bottom-4 sm:zoom-in-95 fade-in duration-200 w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-start gap-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cur.tone === "danger" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
              {cur.tone === "danger" ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <h2 id="appdlg-t" className="text-[15px] font-semibold text-gray-900 dark:text-white">{cur.title}</h2>
              {cur.message && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">{cur.message}</p>}
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button onClick={() => done(false)} className="px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">{cur.cancelLabel || "Cancel"}</button>
            <button ref={okRef} onClick={() => done(true)} className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm font-semibold text-white ${cur.tone === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}>{cur.confirmLabel || "OK"}</button>
          </div>
        </div>
      </div>
    )}
    <div className="fixed z-[101] bottom-[calc(96px+env(safe-area-inset-bottom))] md:bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm pointer-events-none" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`animate-in slide-in-from-bottom-3 fade-in duration-300 pointer-events-auto flex items-start gap-2 px-3.5 py-2.5 rounded-xl shadow-lg text-sm border ${t.tone === "error" ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300" : t.tone === "success" ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200"}`}>
          {t.tone === "error" ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : t.tone === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span className="flex-1">{t.text}</span>
          <button onClick={() => setToasts(x => x.filter(y => y.id !== t.id))} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  </>);
}
