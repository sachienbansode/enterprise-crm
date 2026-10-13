import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, Plus, RefreshCw, Pencil, Trash2, ArrowUp, ArrowDown, Check, Trophy, XCircle, Lock, ChevronsRight } from "lucide-react";
import { StagePath } from "./StagePath";

// Admin → Pipeline Stages. One card per vertical: a live preview of the stage path, then the stages in order.
// Each stage has one workflow flag: Mandatory (can't be skipped) or Skip allowed (can be skipped; shows as Skipped).

const VERTICALS: [string, string][] = [["ib", "Investment Banking"], ["aif", "AIF"], ["retail", "Retail Broking"], ["corporate", "Corporate Broking"], ["ie", "Institutional Equities"]];
const VNAME = Object.fromEntries(VERTICALS);
const TW: Record<string, string> = {
  gray: "#6b7280", slate: "#64748b", blue: "#3b82f6", sky: "#0ea5e9", indigo: "#6366f1", violet: "#8b5cf6", purple: "#a855f7", pink: "#ec4899",
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308", lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6", cyan: "#06b6d4",
};
const hex = (c?: string) => (!c ? "#6366f1" : c.startsWith("#") ? c : TW[(c.match(/bg-([a-z]+)-/) || [])[1] || ""] || "#6366f1");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
const API = (p: string, init?: RequestInit) => fetch(`/api/config/pipeline-stages${p}`, init);
const json = (body: any): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function AdminPipelineStages() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState<"lead" | "deal">("lead");
  const [vert, setVert] = useState("all");
  const [edit, setEdit] = useState<any>(null);       // stage being edited (or new: id === "new")
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    API("/all").then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => VERTICALS.filter(([v]) => vert === "all" || v === vert).map(([v, name]) => ({
    v, name, stages: rows.filter(r => r.entity === entity && r.vertical === v).sort((a, b) => (a.is_active === false ? 1 : 0) - (b.is_active === false ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0)),
  })), [rows, entity, vert]);

  const put = async (row: any, patch: any) => {
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, ...patch } : r));
    const r = await API(`/${row.id}`, { method: "PUT", ...json(patch) });
    if (!r.ok) load();
  };
  const move = async (list: any[], i: number, dir: -1 | 1) => {
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    const sa = a.sort_order ?? i + 1, sb = b.sort_order ?? i + 1 + dir;
    setRows(rs => rs.map(r => r.id === a.id ? { ...r, sort_order: sb === sa ? sa + dir : sb } : r.id === b.id ? { ...r, sort_order: sa } : r));
    await Promise.all([API(`/${a.id}`, { method: "PUT", ...json({ sort_order: sb === sa ? sa + dir : sb }) }), API(`/${b.id}`, { method: "PUT", ...json({ sort_order: sa }) })]);
  };
  const save = async () => {
    if (!edit?.label?.trim()) return setErr("Stage name is required.");
    setBusy(true); setErr("");
    try {
      const body = { label: edit.label.trim(), sort_order: Number(edit.sort_order) || 1, color: edit.color, is_won: !!edit.is_won, is_lost: !!edit.is_lost, skip_allowed: edit.skip_allowed !== false, is_active: edit.is_active !== false };
      const r = edit.id === "new"
        ? await API("", { method: "POST", ...json({ ...body, entity, vertical: edit.vertical, stage_id: slug(edit.label) }) })
        : await API(`/${edit.id}`, { method: "PUT", ...json(body) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Could not save");
      setEdit(null); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const remove = async (row: any) => {
    if (!window.confirm(`Remove the stage "${row.label}"? Records already in it keep their stage.`)) return;
    await API(`/${row.id}`, { method: "DELETE" }); load();
  };
  const addTo = (v: string, list: any[]) => {
    const flow = list.filter(s => !s.is_lost && s.is_active !== false);
    setErr(""); setEdit({ id: "new", vertical: v, label: "", color: "#6366f1", sort_order: (flow[flow.length - 1]?.sort_order || flow.length) + 1, skip_allowed: true, is_active: true });
  };

  const tab = (on: boolean) => `px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${on ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`;
  const field = "w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  // A render function (not a component) so the inputs keep focus while typing
  const renderEditor = () => (
    <div className="px-4 py-3 bg-blue-50/60 dark:bg-blue-500/5 border-y border-blue-200/60 dark:border-blue-500/20 space-y-3">
      <div className="grid grid-cols-[1fr_80px_48px] gap-2">
        <label className="block"><span className="block text-[11px] text-gray-500 mb-1">Stage name</span>
          <input autoFocus value={edit.label} onChange={e => setEdit((p: any) => ({ ...p, label: e.target.value }))} onKeyDown={e => e.key === "Enter" && save()} className={field} placeholder="e.g. Due Diligence" /></label>
        <label className="block"><span className="block text-[11px] text-gray-500 mb-1">Order</span>
          <input type="number" min={1} value={edit.sort_order} onChange={e => setEdit((p: any) => ({ ...p, sort_order: e.target.value }))} className={field} /></label>
        <label className="block"><span className="block text-[11px] text-gray-500 mb-1">Colour</span>
          <input type="color" value={hex(edit.color)} onChange={e => setEdit((p: any) => ({ ...p, color: e.target.value }))} className="w-full h-[38px] rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 mr-1">Type</span>
          {([["", "In progress"], ["won", "Won (end)"], ["lost", "Lost (end)"]] as const).map(([k, l]) => {
            const on = k === "won" ? !!edit.is_won : k === "lost" ? !!edit.is_lost : !edit.is_won && !edit.is_lost;
            return <button key={k} type="button" onClick={() => setEdit((p: any) => ({ ...p, is_won: k === "won", is_lost: k === "lost" }))}
              className={`text-xs px-2.5 py-1 rounded-full border ${on ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>{l}</button>;
          })}
        </div>
        {!edit.is_won && !edit.is_lost && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500 mr-1">Workflow</span>
            {[false, true].map(v => (
              <button key={String(v)} type="button" onClick={() => setEdit((p: any) => ({ ...p, skip_allowed: v }))}
                className={`text-xs px-2.5 py-1 rounded-full border ${(edit.skip_allowed !== false) === v ? (v ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold" : "border-red-500 bg-red-500/10 text-red-600 dark:text-red-300 font-semibold") : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                {v ? "Skip allowed" : "Mandatory"}</button>
            ))}
          </div>
        )}
      </div>
      {err && <div className="text-xs text-red-500">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={() => { setEdit(null); setErr(""); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Cancel</button>
        <button onClick={save} disabled={busy} className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{busy ? "Saving…" : edit.id === "new" ? "Add stage" : "Save"}</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-wrap items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-white" /></div>
        <div className="mr-auto min-w-0">
          <div className="text-base font-bold text-gray-900 dark:text-white">Pipeline Stages</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">The stages each opportunity and deal moves through, per vertical</div>
        </div>
        <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          <button onClick={() => setEntity("lead")} className={tab(entity === "lead")}>Opportunities / leads</button>
          <button onClick={() => setEntity("deal")} className={tab(entity === "deal")}>Deals</button>
        </div>
        <select value={vert} onChange={e => setVert(e.target.value)} className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200" aria-label="Vertical">
          <option value="all">All verticals</option>
          {VERTICALS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
        <button onClick={load} aria-label="Refresh" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      <div className="px-4 sm:px-6 pt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-red-500" /><b className="text-gray-700 dark:text-gray-300">Mandatory</b> — can't be skipped; users must move through it</span>
        <span className="flex items-center gap-1.5"><ChevronsRight className="w-3 h-3 text-sky-500" /><b className="text-gray-700 dark:text-gray-300">Skip allowed</b> — users can skip it with one tap; it shows as Skipped</span>
        <span>Click a flag to switch it.</span>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {groups.map(({ v, name, stages }) => {
          const active = stages.filter(s => s.is_active !== false);
          const pathStages = active.map(s => ({ id: s.stage_id, label: s.label, is_won: s.is_won, is_lost: s.is_lost, skip_allowed: s.skip_allowed !== false }));
          const flowIds = pathStages.filter(s => !s.is_lost).map(s => s.id);
          const cur = preview[v] && flowIds.includes(preview[v]) ? preview[v] : flowIds[0];
          return (
            <section key={v} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{name}</div>
                  <div className="text-[11px] text-gray-500">{active.length} stage{active.length === 1 ? "" : "s"} · {active.filter(s => s.skip_allowed === false && !s.is_won && !s.is_lost).length} mandatory</div>
                </div>
                <button onClick={() => addTo(v, stages)} className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add stage</button>
              </div>

              {pathStages.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-100 dark:border-gray-800">
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 mb-1.5">Preview — what users see on the record</div>
                  <StagePath compact stages={pathStages} current={cur} path={{}} onMove={id => setPreview(p => ({ ...p, [v]: id }))} />
                </div>
              )}

              {edit?.id === "new" && edit.vertical === v && renderEditor()}
              <ol>
                {stages.map((s, i) => edit?.id === s.id ? <li key={s.id}>{renderEditor()}</li> : (
                  <li key={s.id} className={`group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 ${s.is_active === false ? "opacity-50" : ""}`}>
                    <span className="w-5 text-xs text-gray-400 tabular-nums text-right">{s.is_active === false ? "—" : i + 1}</span>
                    <span className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-900" style={{ background: hex(s.color) }} />
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.label}</span>
                    {s.is_won ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Trophy className="w-3 h-3" /> Won</span>
                      : s.is_lost ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Lost</span>
                      : <button onClick={() => put(s, { skip_allowed: s.skip_allowed === false })} title="Click to switch"
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${s.skip_allowed === false ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300" : "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300"}`}>
                          {s.skip_allowed === false ? <><Lock className="w-3 h-3" /> Mandatory</> : <><ChevronsRight className="w-3 h-3" /> Skip allowed</>}
                        </button>}
                    <button onClick={() => put(s, { is_active: s.is_active === false })} title={s.is_active === false ? "Inactive — click to activate" : "Active — click to hide"}
                      className={`relative w-8 h-[18px] rounded-full flex-shrink-0 transition-colors ${s.is_active === false ? "bg-gray-300 dark:bg-gray-700" : "bg-emerald-500"}`} aria-label="Active">
                      <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${s.is_active === false ? "left-[2px]" : "left-[16px]"}`} />
                    </button>
                    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button onClick={() => move(stages, i, -1)} disabled={i === 0} aria-label="Move up" className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => move(stages, i, 1)} disabled={i === stages.length - 1} aria-label="Move down" className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setErr(""); setEdit({ ...s }); }} aria-label="Edit" className="p-1 rounded text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(s)} aria-label="Remove" className="p-1 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </li>
                ))}
                {!stages.length && !loading && <li className="px-4 py-6 text-sm text-gray-400 text-center">No stages yet.</li>}
              </ol>
            </section>
          );
        })}
      </div>
      </div>
    </div>
  );
}
