import { useEffect, useState } from "react";
import { Mic, Video, CheckCircle2, AlertTriangle, RefreshCw, Copy, KeyRound } from "lucide-react";

// Admin → Integrations → Meeting Recording
// Azure AI Speech (in-person recordings, speakers separated) + Teams transcript/recording import settings.

const LOCALES = [["en-IN", "English (India)"], ["hi-IN", "Hindi"], ["mr-IN", "Marathi"], ["gu-IN", "Gujarati"], ["ta-IN", "Tamil"], ["te-IN", "Telugu"], ["en-US", "English (US)"], ["en-GB", "English (UK)"]];

export default function AdminMeetingRecording({ t }: { t: any }) {
  const [c, setC] = useState<any>(null);
  const [key, setKey] = useState("");
  const [gkey, setGkey] = useState("");
  const [gtest, setGtest] = useState<any>(null);
  const [gbusy, setGbusy] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/admin/speech").then(r => r.json()).then(d => { setC(d); setEndpoint(d.endpoint || ""); }).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async (patch: any) => {
    setMsg(null);
    const r = await fetch("/api/admin/speech", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: (await r.json().catch(() => ({}))).error || "Could not save" });
    setKey(""); load();
  };
  const runTest = async () => { setBusy(true); setTest(await fetch("/api/admin/speech/test", { method: "POST" }).then(r => r.json()).catch(() => ({ ok: false, msg: "Request failed" }))); setBusy(false); };
  const [lbusy, setLbusy] = useState(false); const [ltest, setLtest] = useState<any>(null); const [lmodel, setLmodel] = useState<string | null>(null);
  const runLlmTest = async () => { setLbusy(true); setLtest(await fetch("/api/admin/speech/test-llm", { method: "POST" }).then(r => r.json()).catch(() => ({ ok: false, msg: "Request failed" }))); setLbusy(false); };
  const runGroqTest = async () => { setGbusy(true); setGtest(await fetch("/api/admin/speech/test-groq", { method: "POST" }).then(r => r.json()).catch(() => ({ ok: false, msg: "Request failed" }))); setGbusy(false); };
  const copy = (s: string) => navigator.clipboard?.writeText(s).catch(() => {});

  if (!c) return <div className={`p-5 text-xs ${t.textMuted}`}>Loading…</div>;
  const input = `w-full text-sm rounded-lg border px-3 py-2 ${t.inputBg}`;
  const card = `${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`;
  const Toggle = ({ on, onClick, label, sub }: any) => (
    <button onClick={onClick} className="flex items-start gap-3 text-left w-full">
      <span className={`relative mt-0.5 w-9 h-5 rounded-full flex-shrink-0 transition-colors ${on ? "bg-emerald-500" : "bg-gray-500"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></span>
      <span><span className={`block text-sm font-medium ${t.text}`}>{label}</span>{sub && <span className={`block text-xs ${t.textMuted}`}>{sub}</span>}</span>
    </button>
  );
  const ps = `Connect-MicrosoftTeams
New-CsApplicationAccessPolicy -Identity "NIYTRI-CRM-Meetings" -AppIds "<Application (client) ID of the CRM app>" -Description "NIYTRI CRM reads meeting transcripts and recordings"
Grant-CsApplicationAccessPolicy -PolicyName "NIYTRI-CRM-Meetings" -Global`;

  return (
    <div className="p-4 sm:p-5 space-y-4 overflow-y-auto h-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center"><Mic className="w-4 h-4 text-white" /></div>
        <div>
          <h2 className={`text-lg font-bold ${t.text} flex items-center gap-3`}>Meeting Recording
            <a href="#/admin/admin-recordings" className="text-xs font-medium text-blue-500 hover:underline">View all recordings →</a></h2>
          <p className={`text-xs ${t.textMuted}`}>In-person meetings are recorded in the CRM and transcribed with each speaker separated and named. Teams meetings booked from the CRM bring in their own transcript and recording.</p>
        </div>
      </div>

      <div className={card}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Mic className="w-4 h-4" /> In-person recordings — Azure AI Speech</div>
        <Toggle on={c.enabled} onClick={() => save({ enabled: !c.enabled })} label="Transcribe recordings" sub="Tried in order: Azure AI Speech (speakers separated by voice) → free Groq Whisper → the LLM provider's key. If one isn't set up or fails, the next is used." />
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Endpoint — Azure portal → your Speech resource → Keys and Endpoint (choose the Central India region for data residency)</label>
          <div className="flex gap-2">
            <input value={endpoint} onChange={e => setEndpoint(e.target.value)} className={`${input} font-mono text-xs`} placeholder="https://centralindia.api.cognitive.microsoft.com" />
            <button onClick={() => save({ endpoint })} disabled={endpoint === (c.endpoint || "")} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Save</button>
          </div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Key {c.has_key && <span className="text-emerald-500">· saved (encrypted)</span>}</label>
          <div className="flex gap-2">
            <input type="password" value={key} onChange={e => setKey(e.target.value)} className={input} placeholder={c.has_key ? "•••••••• — enter a new key to replace" : "KEY 1 from the Speech resource"} autoComplete="off" />
            <button onClick={() => save({ api_key: key })} disabled={!key.trim()} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Save</button>
          </div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Languages spoken in meetings (up to 4 — mixed English/Hindi works)</label>
          <div className="flex flex-wrap gap-1.5">
            {LOCALES.map(([id, label]) => {
              const on = (c.locales || []).includes(id);
              return <button key={id} onClick={() => { const next = on ? c.locales.filter((x: string) => x !== id) : [...(c.locales || []), id].slice(0, 4); if (next.length) save({ locales: next }); }}
                className={`text-xs px-2.5 py-1 rounded-full border ${on ? "border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300 font-medium" : `${t.border} ${t.textMuted}`}`}>{label}</button>;
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs ${t.textMuted} mb-1`}>Most people in a meeting</label>
            <select value={c.max_speakers} onChange={e => save({ max_speakers: Number(e.target.value) })} className={input}>{[2, 3, 4, 5, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}</option>)}</select>
          </div>
          <div>
            <label className={`block text-xs ${t.textMuted} mb-1`}>Keep audio for (days, 0 = forever)</label>
            <input type="number" min={0} defaultValue={c.keep_audio_days} onBlur={e => save({ keep_audio_days: e.target.value })} className={input} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runTest} disabled={busy || !c.has_key || !c.endpoint} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 flex items-center gap-1.5">
            {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Test connection
          </button>
          {test && <span className={`text-xs flex items-center gap-1 ${test.ok ? "text-emerald-500" : "text-red-500"}`}>{test.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}{test.msg}</span>}
        </div>
        <div className={`text-[11px] ${t.textMuted}`}>Status: {c.has_key && c.endpoint ? <span className="text-emerald-500">Azure Speech set up</span> : <span className="text-amber-500">Azure Speech not set up</span>}{c.has_groq_key ? <> · <span className="text-emerald-500">free fallback ready</span></> : null}{c.llm_transcribe ? <> · <span className="text-emerald-500">LLM fallback on</span></> : null}</div>
        <div className={`text-[11px] ${t.textMuted}`}>After the retention period only the audio file is deleted — the transcript and summary stay on the company record. A consent confirmation is recorded with every recording.</div>
      </div>

      <div className={card}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Mic className="w-4 h-4" /> Free fallback — Whisper on Groq
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">Free tier</span></div>
        <div className={`text-xs ${t.textMuted} space-y-1`}>
          <div>Used when Azure Speech isn't set up, or if it fails. Create a free key at <b>console.groq.com → API Keys</b> (no card needed). Free use has a daily limit; if it's reached, the meeting shows "Failed" and <b>Try again</b> works later.</div>
          <div>Whisper doesn't separate voices — the AI works out who said what from the attendee list and the conversation. Check the speaker names on the transcript and correct them if needed.</div>
          <div className="text-amber-600 dark:text-amber-400">Audio is sent to Groq (US data centres). Confirm this is acceptable for client meetings under your data-protection policy.</div>
          <div>Recordings over 25 MB (roughly 45+ minutes) are compressed and split automatically when ffmpeg is installed on the server.</div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Groq API key {c.has_groq_key && <span className="text-emerald-500">· saved (encrypted)</span>}</label>
          <div className="flex gap-2">
            <input type="password" value={gkey} onChange={e => setGkey(e.target.value)} className={input} placeholder={c.has_groq_key ? "•••••••• — enter a new key to replace" : "gsk_…"} autoComplete="off" />
            <button onClick={() => { save({ groq_api_key: gkey }); setGkey(""); }} disabled={!gkey.trim()} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Save</button>
            {c.has_groq_key && <button onClick={() => save({ groq_api_key: "" })} className={`text-xs px-3 rounded-lg border ${t.border} ${t.textMuted}`}>Remove</button>}
          </div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Model</label>
          <select value={c.groq_model || "whisper-large-v3"} onChange={e => save({ groq_model: e.target.value })} className={input}>
            <option value="whisper-large-v3">whisper-large-v3 — most accurate (best for Hindi + English)</option>
            <option value="whisper-large-v3-turbo">whisper-large-v3-turbo — faster</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runGroqTest} disabled={gbusy || !c.has_groq_key} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 flex items-center gap-1.5">
            {gbusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Test connection
          </button>
          {gtest && <span className={`text-xs flex items-center gap-1 ${gtest.ok ? "text-emerald-500" : "text-red-500"}`}>{gtest.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}{gtest.msg}</span>}
        </div>
      </div>

      <div className={card}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Mic className="w-4 h-4" /> Second fallback — transcribe with the LLM key
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold">Uses LLM Settings</span></div>
        <Toggle on={!!c.llm_transcribe} onClick={() => save({ llm_transcribe: !c.llm_transcribe })} label="Transcribe with the LLM provider's key"
          sub="Used when Azure and Groq aren't set up or both fail. No extra key: it uses the key in AI Settings → LLM Settings (and the fallback LLM if that fails)." />
        <div className={`text-xs ${t.textMuted} space-y-1`}>
          <div><b>OpenAI</b> (or an OpenAI-compatible endpoint): Whisper — model <code>whisper-1</code>, or <code>gpt-4o-transcribe</code> / <code>gpt-4o-mini-transcribe</code> (no timings).</div>
          <div><b>Azure OpenAI</b>: needs a Whisper deployment in the same Azure OpenAI resource — enter its <b>deployment name</b> below.</div>
          <div><b>Google Gemini</b>: the Gemini model listens to the audio and writes the transcript (model below is ignored unless it's a Gemini model).</div>
          <div><b>Anthropic Claude</b> can't take audio — use one of the above as the main or fallback LLM.</div>
          <div>Like Groq, voices aren't separated — the AI assigns lines to attendees; check the names on the transcript.</div>
          <div className="text-amber-600 dark:text-amber-400">Audio goes to the LLM provider. Confirm this is acceptable for client meetings under your data-protection policy.</div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Speech model / Azure deployment name</label>
          <div className="flex gap-2">
            <input value={lmodel ?? (c.llm_transcribe_model || "whisper-1")} onChange={e => setLmodel(e.target.value)} className={input} placeholder="whisper-1" />
            <button onClick={() => { save({ llm_transcribe_model: (lmodel ?? c.llm_transcribe_model ?? "whisper-1").trim() }); setLmodel(null); }} disabled={lmodel === null} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Save</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runLlmTest} disabled={lbusy} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 flex items-center gap-1.5">
            {lbusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Test connection
          </button>
          {ltest && <span className={`text-xs flex items-center gap-1 ${ltest.ok ? "text-emerald-500" : "text-red-500"}`}>{ltest.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}{ltest.msg}</span>}
        </div>
      </div>

      <div className={card}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Video className="w-4 h-4" /> Teams meetings</div>
        <Toggle on={c.teams_auto_fetch} onClick={() => save({ teams_auto_fetch: !c.teams_auto_fetch })} label="Bring in transcripts automatically" sub="For meetings booked from the CRM (company page → Schedule Teams meeting). Checked every 10 minutes after the meeting ends, for up to 3 days." />
        <div className={`text-xs ${t.text} space-y-1.5`}>
          <div className="font-semibold">One-time Microsoft 365 setup (Global / Teams admin)</div>
          <div className={t.textMuted}>1. Azure portal → App registrations → the CRM app → API permissions → add <b>Application</b> permissions, then <b>Grant admin consent</b>:</div>
          <div className="flex flex-wrap gap-1.5 pl-3">
            {["OnlineMeetings.Read.All", "OnlineMeetingTranscript.Read.All", "OnlineMeetingRecording.Read.All", "Calendars.ReadWrite", "User.Read.All"].map(p => <code key={p} className={`text-[11px] px-1.5 py-0.5 rounded ${t.bgCard2}`}>{p}</code>)}
          </div>
          <div className={t.textMuted}>2. Allow the app to read meetings — run once in PowerShell (MicrosoftTeams module):</div>
          <div className="relative">
            <pre className={`text-[11px] font-mono whitespace-pre-wrap rounded-lg p-3 pr-10 ${t.bgCard2} ${t.text}`}>{ps}</pre>
            <button onClick={() => copy(ps)} aria-label="Copy" className={`absolute top-2 right-2 p-1.5 rounded ${t.textMuted}`}><Copy className="w-3.5 h-3.5" /></button>
          </div>
          <div className={t.textMuted}>3. Teams admin centre → Meetings → Meeting policies → turn on <b>Transcription</b> and <b>Cloud recording</b> (or start them in each meeting).</div>
          <div className={t.textMuted}>Teams transcripts already contain each participant's name, so no speaker matching is needed.</div>
        </div>
      </div>
      {msg && <div className={`text-xs ${msg.ok ? "text-emerald-500" : "text-red-500"}`}><KeyRound className="w-3 h-3 inline mr-1" />{msg.text}</div>}
    </div>
  );
}
