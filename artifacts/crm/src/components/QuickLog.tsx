import { useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, Sparkles, Plus, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";
import { ClientPicker } from "./LeadDealModals";

// Quick Log — log a call / meeting / note in 30–60 seconds. Type or speak; the CRM turns it into a
// Meeting Summary, Key Points, Opportunity Update, Action Items (owner + deadline) and a follow-up date.

const TYPES = ["Meeting", "Call", "Note", "Email", "Roadshow", "Site Visit"];
const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

type Action = { title: string; owner_id: string; due_date: string };
export type QuickLogDefaults = { client_id?: string; client_name?: string; lead_id?: string; type?: string };

export function QuickLog({ open, onClose, onSaved, defaults, currentUser }: {
  open: boolean; onClose: () => void; onSaved?: (it: any) => void; defaults?: QuickLogDefaults; currentUser?: any;
}) {
  const [type, setType] = useState("Meeting");
  const [when, setWhen] = useState(nowLocal());
  const [clientId, setClientId] = useState(""); const [clientName, setClientName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [opps, setOpps] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<any>(null);
  const [title, setTitle] = useState(""); const [summary, setSummary] = useState("");
  const [points, setPoints] = useState(""); const [oppUpdate, setOppUpdate] = useState("");
  const [actions, setActions] = useState<Action[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  const recRef = useRef<any>(null);
  const baseTextRef = useRef("");

  const SR: any = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  useEffect(() => {
    if (!open) return;
    setType(defaults?.type || "Meeting"); setWhen(nowLocal());
    setClientId(defaults?.client_id || ""); setClientName(defaults?.client_name || ""); setLeadId(defaults?.lead_id || "");
    setText(""); setParsed(null); setTitle(""); setSummary(""); setPoints(""); setOppUpdate(""); setActions([]); setFollowUp("");
    setError(""); setDone(false); setUsedVoice(false);
    fetch("/api/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
    return () => { try { recRef.current?.stop(); } catch { /* ignore */ } };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clientId) { setOpps([]); return; }
    fetch(`/api/leads?client_id=${clientId}&limit=50`).then(r => r.json())
      .then(d => setOpps((d.data || d.leads || []).filter((l: any) => !["lost", "closed", "won", "deleted"].includes(String(l.stage).toLowerCase()))))
      .catch(() => setOpps([]));
  }, [clientId]);

  const toggleMic = () => {
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true;
    baseTextRef.current = text ? text.trim() + " " : "";
    rec.onresult = (e: any) => {
      let finalText = "", interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " "; else interim += r[0].transcript;
      }
      setText((baseTextRef.current + finalText + interim).replace(/\s+/g, " "));
    };
    rec.onerror = (e: any) => { setError(e.error === "not-allowed" ? "Microphone permission was blocked — allow it in the browser to dictate." : `Voice input stopped (${e.error}).`); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); setUsedVoice(true); setError(""); } catch { /* already started */ }
  };

  const organise = async () => {
    if (listening) recRef.current?.stop();
    setParsing(true); setError("");
    try {
      const r = await fetch("/api/interactions/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not organise the note");
      setParsed(d);
      setTitle(d.title || ""); setSummary(d.summary || ""); setPoints((d.key_points || []).join("\n"));
      setOppUpdate([d.opportunity_update, d.opportunity_type && `Type: ${d.opportunity_type}`, d.transaction_size && `Size: ${d.transaction_size}`].filter(Boolean).join(" · "));
      const match = (name: string | null) => {
        if (!name) return currentUser?.id || "";
        if (/^client$/i.test(name)) return "client";
        const u = users.find(u => u.name.toLowerCase() === name.toLowerCase()) || users.find(u => u.name.toLowerCase().startsWith(name.toLowerCase().split(" ")[0]));
        return u?.id || currentUser?.id || "";
      };
      setActions((d.action_items || []).map((a: any) => ({ title: a.title, owner_id: /^(they|client|the client|promoter)\b/i.test(a.title) && !a.owner ? "client" : match(a.owner), due_date: a.due_date || "" })));
      setFollowUp(d.next_follow_up || "");
    } catch (e: any) { setError(e.message); } finally { setParsing(false); }
  };

  const save = async () => {
    const finalSummary = parsed ? summary : text;
    if (!finalSummary.trim()) { setError("Say or type what happened first."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        type, occurred_at: new Date(when).toISOString(), client_id: clientId || null, lead_id: leadId || null,
        title: parsed ? title : (text.split(/[.!?\n]/)[0] || type).slice(0, 120),
        summary: finalSummary, key_points: parsed ? points.split("\n").map(s => s.trim()).filter(Boolean) : [],
        opportunity_update: oppUpdate || null, raw_text: text, next_follow_up: followUp || null,
        source: usedVoice ? "voice" : "manual",
        action_items: actions.filter(a => a.title.trim()).map(a => ({
          title: a.owner_id === "client" ? `Client: ${a.title.replace(/^client:\s*/i, "")}` : a.title,
          owner_id: a.owner_id && a.owner_id !== "client" ? a.owner_id : currentUser?.id, due_date: a.due_date || null,
        })),
      };
      const r = await fetch("/api/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      setDone(true); onSaved?.(d);
      setTimeout(onClose, 900);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-[60] bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center"><Mic className="w-4 h-4 text-white" /></div>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900 dark:text-white">Quick Log</div>
            <div className="text-[11px] text-gray-500">Speak or type what happened — the CRM fills in the rest · <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("recorder:open", { detail: { client_id: clientId || undefined, client_name: clientName || undefined, lead_id: leadId || undefined } })); }} className="text-red-500 hover:underline">record the whole meeting instead</button></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map(x => (
              <button key={x} onClick={() => setType(x)} className={`text-xs px-2.5 py-1 rounded-full border ${type === x ? "bg-violet-600 border-violet-600 text-white" : "border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>{x}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company / client</label>
              <ClientPicker value={clientId} initialName={clientName} onChange={(id, name) => { setClientId(id); setClientName(name); setLeadId(""); }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">When</label>
              <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={inputCls} />
            </div>
            {opps.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Opportunity (optional)</label>
                <select value={leadId} onChange={e => setLeadId(e.target.value)} className={inputCls}>
                  <option value="">— Not linked to an opportunity —</option>
                  {opps.map(o => <option key={o.id} value={o.id}>{o.name} ({o.lead_code})</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">What happened?</label>
              {SR ? (
                <button onClick={toggleMic} className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 ${listening ? "bg-red-600 text-white animate-pulse" : "bg-violet-600/10 text-violet-600 dark:text-violet-300"}`}>
                  {listening ? <><MicOff className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Dictate</>}
                </button>
              ) : <span className="text-[10px] text-gray-400">Tip: use your keyboard's mic to dictate</span>}
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} className={inputCls}
              placeholder="e.g. Met ABC Ltd today. Promoter is interested in an IPO of about ₹500 crore. They'll share FY26 financials by Friday. Next meeting next week." />
            <div className="flex justify-end mt-2">
              <button onClick={organise} disabled={parsing || text.trim().length < 5} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 flex items-center gap-1.5">
                {parsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Organise into CRM update
              </button>
            </div>
          </div>

          {parsed && (
            <div className="space-y-3 rounded-xl border border-violet-300/50 dark:border-violet-800/60 p-3">
              {!parsed.ai && <div className="text-[11px] text-amber-600 dark:text-amber-400">AI Assistant isn't configured, so this was organised with simple rules — please check it.</div>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Meeting summary</label>
                <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Key discussion points (one per line)</label>
                <textarea value={points} onChange={e => setPoints(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Opportunity update</label>
                <input value={oppUpdate} onChange={e => setOppUpdate(e.target.value)} className={inputCls} placeholder="—" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">Action items</label>
                  <button onClick={() => setActions(a => [...a, { title: "", owner_id: currentUser?.id || "", due_date: "" }])} className="text-[11px] text-violet-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                </div>
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_150px_130px_28px] gap-1.5 items-center">
                      <input value={a.title} onChange={e => setActions(x => x.map((y, j) => j === i ? { ...y, title: e.target.value } : y))} className={inputCls} placeholder="Action" />
                      <select value={a.owner_id} onChange={e => setActions(x => x.map((y, j) => j === i ? { ...y, owner_id: e.target.value } : y))} className={inputCls} aria-label="Owner">
                        <option value="client">Client (we follow up)</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <input type="date" value={a.due_date} onChange={e => setActions(x => x.map((y, j) => j === i ? { ...y, due_date: e.target.value } : y))} className={inputCls} aria-label="Deadline" />
                      <button onClick={() => setActions(x => x.filter((_, j) => j !== i))} aria-label="Remove" className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {!actions.length && <div className="text-[11px] text-gray-400">No action items found.</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Next follow-up</label>
                  <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {done && <span className="text-xs text-emerald-500 flex items-center gap-1 mr-auto"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
          <button onClick={onClose} className="text-sm px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300">Cancel</button>
          <button onClick={save} disabled={saving || (!text.trim() && !summary.trim())} className="text-sm px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-40 flex items-center gap-1.5">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
