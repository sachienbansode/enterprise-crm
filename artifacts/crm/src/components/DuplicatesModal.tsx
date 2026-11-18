import { useEffect, useState } from "react";
import { X, Copy as CopyIcon, RefreshCw, GitMerge, Undo2, CheckCircle2, Info } from "lucide-react";
import { appConfirm, appToast } from "../lib/dialog";

// Find & merge duplicate clients / companies (admins). How a merge works is explained at the top of the window.
const LINK_LABEL: Record<string, string> = { n_leads: "opportunities", n_deals: "deals", n_service_requests: "SRs", n_company_people: "people", n_client_contacts: "contacts",
  n_documents: "documents", n_interactions: "interactions", n_tasks: "tasks", n_meetings: "meetings", n_client_access_requests: "access requests" };

export default function DuplicatesModal({ onClose, onMerged }: { onClose: () => void; onMerged?: () => void }) {
  const [tab, setTab] = useState<"find" | "history">("find");
  const [groups, setGroups] = useState<any[] | null>(null);
  const [history, setHistory] = useState<any[] | null>(null);
  const [keep, setKeep] = useState<Record<number, string>>({});
  const [skip, setSkip] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = () => {
    setGroups(null); setErr("");
    fetch("/api/clients/duplicates").then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load"); return d; })
      .then(d => { setGroups(d.groups); setKeep(Object.fromEntries(d.groups.map((g: any, i: number) => [i, g.suggested_keep]))); setSkip({}); })
      .catch(e => { setErr(e.message); setGroups([]); });
  };
  const loadHistory = () => { setHistory(null); fetch("/api/clients/merges").then(r => r.json()).then(d => setHistory(d.data || [])).catch(() => setHistory([])); };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]);

  const merge = async (gi: number) => {
    const g = groups![gi]; const keepId = keep[gi];
    const dups = g.clients.filter((c: any) => c.id !== keepId && !skip[c.id]);
    if (!dups.length) return appToast("Tick at least one duplicate to merge", "error");
    const kept = g.clients.find((c: any) => c.id === keepId);
    const ok = await appConfirm({ title: "Merge duplicates",
      message: `Keep ${kept.name} (${kept.client_code}) and merge ${dups.map((d: any) => `${d.name} (${d.client_code})`).join(", ")} into it?\n\nTheir opportunities, deals, SRs, documents, people, meetings and tasks move to the kept record; its blank fields are filled from them. The duplicates are marked "Merged" and hidden — you can undo this from Merge history.`,
      confirmLabel: "Merge" });
    if (!ok) return;
    setBusy(gi);
    try {
      const r = await fetch("/api/clients/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keep_id: keepId, merge_ids: dups.map((d: any) => d.id) }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Merge failed");
      const moved = Object.entries(d.moved || {}).map(([t, n]) => `${n} ${t.replace(/_/g, " ")}`).join(", ");
      appToast(`Merged into ${d.kept.client_code}${moved ? ` — moved ${moved}` : ""}`, "success");
      onMerged?.(); load();
    } catch (e: any) { appToast(e.message, "error"); } finally { setBusy(null); }
  };
  const undo = async (m: any) => {
    if (!(await appConfirm({ title: "Undo merge", message: `Restore ${(m.merged || []).map((x: any) => `${x.name} (${x.client_code})`).join(", ")} and move their records back?`, confirmLabel: "Undo merge" }))) return;
    const r = await fetch(`/api/clients/merges/${m.id}/undo`, { method: "POST" }); const d = await r.json().catch(() => ({}));
    if (!r.ok) return appToast(d.error || "Undo failed", "error");
    appToast("Merge undone", "success"); loadHistory(); onMerged?.();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/55 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-4xl bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <GitMerge className="w-5 h-5 text-violet-500" />
          <div className="flex-1 font-semibold text-gray-900 dark:text-white">Duplicate Clients & Companies</div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-1 px-4 pt-3">
          {([["find", "Find & Merge"], ["history", "Merge History"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === k ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-500/10"}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === "find" && (<>
            <div className="rounded-xl bg-sky-500/10 text-sky-800 dark:text-sky-200 text-[13px] p-3 flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>Records are grouped when they share a <b>PAN, CIN, company e-mail, mobile</b> or the <b>same name</b> (ignoring Pvt / Ltd / Limited); records with different PANs or CINs are never grouped. Choose the record to <b>keep</b>, untick anything that isn't really the same, then <b>Merge</b>:
                everything linked to the duplicates moves to the kept record, its blank fields are filled from them, and the duplicates are marked "Merged" and hidden. Nothing is deleted — <b>Undo</b> is in Merge History.</div>
            </div>
            {err && <div className="text-sm text-red-500">{err}</div>}
            {!groups && <div className="text-sm text-gray-500 py-6 text-center flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Looking for duplicates…</div>}
            {groups && !groups.length && !err && <div className="text-sm text-emerald-600 dark:text-emerald-400 py-8 text-center flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> No duplicates found.</div>}
            {groups?.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <CopyIcon className="w-4 h-4 text-amber-500" />
                  <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{g.clients.length} records · {g.reasons.join(", ")}</div>
                  <button onClick={() => merge(gi)} disabled={busy !== null} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
                    {busy === gi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />} Merge</button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {g.clients.map((c: any) => {
                    const isKeep = keep[gi] === c.id;
                    const links = Object.entries(LINK_LABEL).filter(([k]) => c[k] > 0).map(([k, l]) => `${c[k]} ${l}`).join(" · ");
                    return (
                      <div key={c.id} className={`px-3 py-2.5 flex items-start gap-3 ${isKeep ? "bg-emerald-500/5" : ""}`}>
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold pt-0.5 cursor-pointer whitespace-nowrap">
                          <input type="radio" name={`keep-${gi}`} checked={isKeep} onChange={() => setKeep(k => ({ ...k, [gi]: c.id }))} /> Keep
                        </label>
                        {!isKeep && (
                          <label className="flex items-center gap-1.5 text-[11px] pt-0.5 cursor-pointer whitespace-nowrap text-gray-500" title="Untick if this one is a different client">
                            <input type="checkbox" checked={!skip[c.id]} onChange={e => setSkip(s => ({ ...s, [c.id]: !e.target.checked }))} /> Merge
                          </label>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.name} <span className="font-mono text-[11px] font-normal text-blue-500">{c.client_code}</span>
                            {isKeep && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">kept</span>}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {[c.type, c.category, c.pan && `PAN ${c.pan}`, c.cin && `CIN ${c.cin}`, c.email, c.mobile, c.hq_city, (c.verticals || []).join("/"), `created ${new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}`].filter(Boolean).join(" · ")}
                          </div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-300">{links || "No linked records"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>)}
          {tab === "history" && (<>
            {!history && <div className="text-sm text-gray-500 py-6 text-center">Loading…</div>}
            {history && !history.length && <div className="text-sm text-gray-500 py-6 text-center">No merges yet.</div>}
            {history?.map(m => (
              <div key={m.id} className="rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5 flex items-start gap-3">
                <div className="min-w-0 flex-1 text-sm">
                  <div className="text-gray-900 dark:text-white"><b>{(m.merged || []).map((x: any) => `${x.name} (${x.client_code})`).join(", ")}</b> → {m.kept_name} ({m.kept_code})</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{new Date(m.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} by {m.merged_by_name || "—"}
                    {m.undone_at && <> · <span className="text-amber-600">undone {new Date(m.undone_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} by {m.undone_by_name}</span></>}</div>
                </div>
                {!m.undone_at && <button onClick={() => undo(m)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-1.5"><Undo2 className="w-3.5 h-3.5" /> Undo</button>}
              </div>
            ))}
          </>)}
        </div>
      </div>
    </div>
  );
}
