import { useEffect, useRef, useState } from "react";
import { X, Mic, Pause, Play, Square, CheckCircle2, AlertTriangle, RefreshCw, Plus, Users, ShieldCheck } from "lucide-react";
import { ClientPicker } from "./LeadDealModals";

// One-tap meeting recorder for in-person meetings (phone or laptop).
// Audio is uploaded in 15-second pieces WHILE recording, so a dropped network or a closed tab never loses the meeting.
// After Stop, the server transcribes with speaker separation and the AI names each speaker from the attendee list.

type Att = { key: string; kind: "user" | "person" | "other"; id?: string | null; name: string; role?: string | null };
const pickMime = () => {
  const M: any = (window as any).MediaRecorder;
  if (!M?.isTypeSupported) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(t => M.isTypeSupported(t)) || "";
};
const mmss = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function MeetingRecorder({ open, onClose, defaults, currentUser }: {
  open: boolean; onClose: () => void; defaults?: { client_id?: string; client_name?: string; lead_id?: string; title?: string; person_id?: string }; currentUser?: any;
}) {
  const [step, setStep] = useState<"setup" | "recording" | "finishing" | "done" | "error">("setup");
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(""); const [clientName, setClientName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [opps, setOpps] = useState<any[]>([]);
  const [people, setPeople] = useState<Att[]>([]);
  const [team, setTeam] = useState<Att[]>([]);
  const [chosen, setChosen] = useState<Record<string, Att>>({});
  const [other, setOther] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [secs, setSecs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(0);
  const [queued, setQueued] = useState(0); const [sent, setSent] = useState(0);
  const [netIssue, setNetIssue] = useState(false);
  const [meetingId, setMeetingId] = useState("");

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const queue = useRef<Blob[]>([]); const seq = useRef(0); const uploading = useRef(false);
  const timer = useRef<any>(null); const raf = useRef<number>(0); const wake = useRef<any>(null); const ctxRef = useRef<AudioContext | null>(null);
  const idRef = useRef("");
  const mime = useRef("");

  useEffect(() => {
    if (!open) return;
    setStep("setup"); setError(""); setSecs(0); setPaused(false); setQueued(0); setSent(0); setConsent(false); setOther("");
    setTitle(defaults?.title || ""); setClientId(defaults?.client_id || ""); setClientName(defaults?.client_name || ""); setLeadId(defaults?.lead_id || "");
    const me = currentUser?.id ? { key: `user:${currentUser.id}`, kind: "user" as const, id: currentUser.id, name: currentUser.name } : null;
    setChosen(me ? { [me.key]: me } : {});
    fetch("/api/users").then(r => r.json()).then(d => setTeam((Array.isArray(d) ? d : d?.data || []).filter((u: any) => u.status !== "Inactive").map((u: any) => ({ key: `user:${u.id}`, kind: "user", id: u.id, name: u.name, role: u.role })))).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clientId) { setPeople([]); setOpps([]); return; }
    fetch(`/api/ib/companies/${clientId}`).then(r => r.json()).then(d => {
      setPeople((d.people || []).map((p: any) => ({ key: `person:${p.id}`, kind: "person", id: p.id, name: p.name, role: p.designation || p.role_type })));
      // Opened from a contact page → that person is ticked as an attendee
      const pre = (d.people || []).find((p: any) => p.id === defaults?.person_id);
      if (pre) setChosen(c => ({ ...c, [`person:${pre.id}`]: { key: `person:${pre.id}`, kind: "person", id: pre.id, name: pre.name, role: pre.designation || pre.role_type } }));
      setOpps((d.opportunities || []).filter((o: any) => !["closed", "lost", "won"].includes(o.stage)));
    }).catch(() => {});
    if (!title && clientName) setTitle(`Meeting with ${clientName.replace(/\s*\(.*\)$/, "")}`);
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // warn before leaving mid-recording
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (step === "recording") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [step]);
  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = () => {
    clearInterval(timer.current); cancelAnimationFrame(raf.current);
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    ctxRef.current?.close().catch(() => {}); ctxRef.current = null;
    try { wake.current?.release?.(); } catch { /* ignore */ } wake.current = null;
  };

  // Send queued pieces one by one, in order, retrying with back-off
  const pump = async () => {
    if (uploading.current) return;
    uploading.current = true;
    while (queue.current.length) {
      const blob = queue.current[0];
      let ok = false;
      for (let attempt = 0; attempt < 6 && !ok; attempt++) {
        try {
          const r = await fetch(`/api/meetings/${idRef.current}/chunk?seq=${seq.current}`, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: blob });
          const d = await r.json().catch(() => ({}));
          if (r.ok) ok = true;
          else if (r.status === 409 && typeof d.expected === "number") { seq.current = d.expected; continue; }
          else throw new Error(d.error || `HTTP ${r.status}`);
        } catch { setNetIssue(true); await new Promise(s => setTimeout(s, Math.min(15000, 1000 * 2 ** attempt))); }
      }
      if (!ok) break; // keep it queued; next pump retries
      setNetIssue(false);
      queue.current.shift(); seq.current++; setSent(n => n + 1);
    }
    uploading.current = false;
  };

  const start = async () => {
    setError("");
    if (!consent) { setError("Please confirm everyone present has agreed to be recorded."); return; }
    if (!(window as any).MediaRecorder || !navigator.mediaDevices?.getUserMedia) { setError("This browser can't record audio. Use Chrome, Edge or Safari (iOS 14.5+)."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } as any });
      streamRef.current = stream;
      mime.current = pickMime();
      const r = await fetch("/api/meetings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "Client meeting", client_id: clientId || null, lead_id: leadId || null, attendees: Object.values(chosen), consent: true, mime: (mime.current || "audio/webm").split(";")[0] }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not start the recording");
      idRef.current = d.id; setMeetingId(d.id); seq.current = 0; queue.current = [];
      const rec = new MediaRecorder(stream, mime.current ? { mimeType: mime.current, audioBitsPerSecond: 32000 } : undefined);
      rec.ondataavailable = e => { if (e.data?.size) { queue.current.push(e.data); setQueued(n => n + 1); pump(); } };
      rec.start(15000);
      recRef.current = rec;
      // level meter
      const ctx = new AudioContext(); ctxRef.current = ctx;
      const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const loop = () => { an.getByteTimeDomainData(data); let m = 0; for (const v of data) m = Math.max(m, Math.abs(v - 128)); setLevel(Math.min(1, m / 64)); raf.current = requestAnimationFrame(loop); };
      loop();
      timer.current = setInterval(() => setSecs(s => (recRef.current?.state === "recording" ? s + 1 : s)), 1000);
      try { wake.current = await (navigator as any).wakeLock?.request("screen"); } catch { /* optional */ }
      setStep("recording");
    } catch (e: any) {
      cleanup();
      setError(/denied|NotAllowed/i.test(e?.name + e?.message) ? "Microphone access was blocked — allow it in the browser's site settings and try again." : e.message || "Could not start recording");
    }
  };

  const togglePause = () => {
    const r = recRef.current; if (!r) return;
    if (r.state === "recording") { r.pause(); setPaused(true); } else if (r.state === "paused") { r.resume(); setPaused(false); }
  };

  const stop = async () => {
    const r = recRef.current; if (!r) return;
    setStep("finishing");
    await new Promise<void>(res => { r.onstop = () => res(); try { r.requestData(); } catch { /* ignore */ } r.stop(); });
    cleanup();
    for (let i = 0; i < 240 && (queue.current.length || uploading.current); i++) { await pump(); if (queue.current.length) await new Promise(s => setTimeout(s, 1000)); }
    if (queue.current.length) { setError("Some audio couldn't be uploaded yet. Keep this window open — retrying…"); setStep("error"); return; }
    const f = await fetch(`/api/meetings/${idRef.current}/finish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duration_sec: secs }) });
    const d = await f.json().catch(() => ({}));
    if (!f.ok) { setError(d.error || "Could not finish the recording"); setStep("error"); return; }
    setStep("done");
  };

  const retryUpload = async () => { setError(""); setStep("finishing"); await pump(); if (!queue.current.length) await stop2(); else { setError("Still offline — retrying when the connection is back."); setStep("error"); } };
  const stop2 = async () => {
    const f = await fetch(`/api/meetings/${idRef.current}/finish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duration_sec: secs }) });
    if (f.ok) setStep("done"); else { setError((await f.json().catch(() => ({}))).error || "Could not finish"); setStep("error"); }
  };

  const toggle = (a: Att) => setChosen(c => { const n = { ...c }; if (n[a.key]) delete n[a.key]; else n[a.key] = a; return n; });
  const addOther = () => { const n = other.trim(); if (!n) return; const a: Att = { key: `other:${n}`, kind: "other", name: n }; setChosen(c => ({ ...c, [a.key]: a })); setOther(""); };
  const close = () => { if (step === "recording" && !window.confirm("Stop and discard nothing? The recording keeps uploading only while this window is open. Close anyway?")) return; onClose(); };

  if (!open) return null;
  const chip = (a: Att) => (
    <button key={a.key} type="button" onClick={() => toggle(a)} className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${chosen[a.key] ? "border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-200 font-medium" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
      {chosen[a.key] ? "✓ " : ""}{a.name}{a.role ? <span className="opacity-60"> · {a.role}</span> : null}
    </button>
  );
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[94vh] bg-white dark:bg-gray-950 sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "recording" && !paused ? "bg-red-600 animate-pulse" : "bg-red-600/15"}`}><Mic size={16} className={step === "recording" && !paused ? "text-white" : "text-red-500"} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Record meeting</div>
            <div className="text-[11px] text-gray-500 truncate">Transcript with each person named · summary and action items go to the company</div>
          </div>
          <button onClick={close} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>

        {step === "setup" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company / client</label>
              <ClientPicker value={clientId} initialName={clientName} onChange={(id, name) => { setClientId(id); setClientName(name); setLeadId(""); }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Meeting with promoter" />
              </div>
              {opps.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Opportunity</label>
                  <select value={leadId} onChange={e => setLeadId(e.target.value)} className={inputCls}>
                    <option value="">— None —</option>
                    {opps.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5"><Users size={13} /> Who's in the meeting? <span className="font-normal">— used to name each speaker in the transcript</span></div>
              {people.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{people.map(chip)}</div>}
              <div className="flex flex-wrap gap-1.5 mb-2">{team.filter(u => chosen[u.key] || u.id === currentUser?.id).map(chip)}</div>
              <details className="mb-2">
                <summary className="text-[11px] text-violet-600 cursor-pointer">+ Add colleagues</summary>
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-28 overflow-y-auto">{team.filter(u => u.id !== currentUser?.id).map(chip)}</div>
              </details>
              <div className="flex gap-2">
                <input value={other} onChange={e => setOther(e.target.value)} onKeyDown={e => e.key === "Enter" && addOther()} className={inputCls} placeholder="Someone else (name)" />
                <button type="button" onClick={addOther} className="px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"><Plus size={14} /></button>
              </div>
              {Object.values(chosen).filter(a => a.kind === "other").length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{Object.values(chosen).filter(a => a.kind === "other").map(chip)}</div>}
            </div>
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-gray-700 dark:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
              <span><ShieldCheck size={13} className="inline text-amber-500 mr-1" />Everyone present has agreed to this meeting being recorded and transcribed. <span className="text-gray-500">(Your name and the time are saved with the recording.)</span></span>
            </label>
            {error && <div className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={13} /> {error}</div>}
            <div className="text-[11px] text-gray-500">Tip: put the phone in the middle of the table. Keep this screen open while recording.</div>
          </div>
        )}

        {(step === "recording" || step === "finishing") && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <div className="text-[11px] uppercase tracking-widest text-gray-500">{step === "finishing" ? "Saving…" : paused ? "Paused" : "Recording"}</div>
            <div className="text-5xl font-mono font-semibold tabular-nums text-gray-900 dark:text-white">{mmss(secs)}</div>
            <div className="flex items-end gap-1 h-10" aria-hidden>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className={`w-1.5 rounded-full ${paused ? "bg-gray-400" : "bg-red-500"}`} style={{ height: `${8 + Math.max(0, level * 40 * (0.5 + 0.5 * Math.sin(i * 1.7 + secs)))}px` }} />
              ))}
            </div>
            <div className="text-xs text-gray-500">{title || "Client meeting"}{clientName ? ` · ${clientName}` : ""}</div>
            <div className="text-[11px] text-gray-500">{netIssue ? <span className="text-amber-500">Connection issue — audio is kept and will upload when back</span> : `Uploaded ${sent} of ${queued} pieces`}</div>
            {step === "recording" ? (
              <div className="flex items-center gap-4">
                <button onClick={togglePause} className="w-14 h-14 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200" aria-label={paused ? "Resume" : "Pause"}>{paused ? <Play size={22} /> : <Pause size={22} />}</button>
                <button onClick={stop} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg" aria-label="Stop and save"><Square size={28} fill="currentColor" /></button>
              </div>
            ) : <RefreshCw className="animate-spin text-violet-500" />}
            {step === "recording" && <div className="text-[11px] text-gray-500">Tap ■ when the meeting ends</div>}
          </div>
        )}

        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <CheckCircle2 size={40} className="text-emerald-500" />
            <div className="text-base font-semibold text-gray-900 dark:text-white">Saved — transcribing now</div>
            <div className="text-xs text-gray-500 max-w-sm">You'll get a notification when the transcript is ready (usually a few minutes). Speakers are named automatically — you can correct any name.</div>
            <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("meeting:open", { detail: { id: meetingId } })); }} className="mt-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm">Open meeting</button>
          </div>
        )}

        {step === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle size={36} className="text-amber-500" />
            <div className="text-sm text-gray-700 dark:text-gray-200 max-w-sm">{error}</div>
            <button onClick={retryUpload} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm flex items-center gap-1.5"><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        {step === "setup" && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <button onClick={start} disabled={!consent} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white" /> Start recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
