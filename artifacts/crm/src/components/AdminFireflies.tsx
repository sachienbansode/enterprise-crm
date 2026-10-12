import { useEffect, useState } from "react";
import { Mic, CheckCircle2, AlertTriangle, RefreshCw, Copy, KeyRound, Download } from "lucide-react";

// Admin → Integrations → Fireflies (optional add-on). Teams meetings already come through Microsoft Graph;
// Fireflies covers meetings on other platforms. Recorded meetings are matched to companies by attendee e-mail.

export default function AdminFireflies({ t }: { t: any }) {
  const [cfg, setCfg] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const webhookUrl = `${window.location.origin}/api/integrations/fireflies/webhook`;

  const load = () => fetch("/api/admin/fireflies").then(r => r.json()).then(setCfg).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async (patch: any) => {
    setSaving(true); setMsg(null);
    const r = await fetch("/api/admin/fireflies", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: (await r.json().catch(() => ({}))).error || "Could not save" });
    setSaving(false); setApiKey(""); setSecret(""); load();
  };
  const genSecret = async () => { const d = await fetch("/api/admin/fireflies/generate-secret", { method: "POST" }).then(r => r.json()); setSecret(d.secret); };
  const runTest = async () => { setTesting(true); setTest(await fetch("/api/admin/fireflies/test", { method: "POST" }).then(r => r.json()).catch(() => ({ ok: false, msg: "Request failed" }))); setTesting(false); };
  const importOne = async (id: string) => {
    setImporting(id);
    const r = await fetch(`/api/admin/fireflies/import/${id}`, { method: "POST" }); const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, text: d.duplicate ? "Already imported" : d.skipped ? "Skipped — no attendee matched a company" : d.linked ? "Imported and linked to a company" : "Imported — link it to a company from Quick Log history" } : { ok: false, text: d.error || "Import failed" });
    setImporting(null); load();
  };
  const copy = (s: string) => navigator.clipboard?.writeText(s).catch(() => {});

  if (!cfg) return <div className={`p-5 text-xs ${t.textMuted}`}>Loading…</div>;
  const input = `w-full text-sm rounded-lg border px-3 py-2 ${t.inputBg}`;
  const Toggle = ({ on, onClick, label, sub }: any) => (
    <button onClick={onClick} disabled={saving} className="flex items-start gap-3 text-left w-full">
      <span className={`relative mt-0.5 w-9 h-5 rounded-full flex-shrink-0 transition-colors ${on ? "bg-emerald-500" : "bg-gray-500"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></span>
      <span><span className={`block text-sm font-medium ${t.text}`}>{label}</span>{sub && <span className={`block text-xs ${t.textMuted}`}>{sub}</span>}</span>
    </button>
  );

  return (
    <div className="p-4 sm:p-5 space-y-4 overflow-y-auto h-full max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Mic className="w-4 h-4 text-white" /></div>
        <div>
          <h2 className={`text-lg font-bold ${t.text}`}>Fireflies.ai <span className={`text-xs font-normal ${t.textMuted}`}>· optional add-on</span></h2>
          <p className={`text-xs ${t.textMuted}`}>Meeting summaries and action items from Fireflies land on the matching company and opportunity automatically. Teams meetings are handled by the M365 integration.</p>
        </div>
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <Toggle on={cfg.enabled} onClick={() => save({ enabled: !cfg.enabled })} label="Enable Fireflies" sub="Turn off at any time — nothing is deleted." />
        <Toggle on={cfg.auto_create_tasks} onClick={() => save({ auto_create_tasks: !cfg.auto_create_tasks })} label="Create tasks from action items" sub="Assigned to the meeting organiser when they are a CRM user." />
        <Toggle on={cfg.only_matched} onClick={() => save({ only_matched: !cfg.only_matched })} label="Only keep meetings that match a company" sub="Off: unmatched meetings are kept as unlinked notes so nothing is lost." />
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><KeyRound className="w-4 h-4" /> Credentials</div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>API key {cfg.has_api_key && <span className="text-emerald-500">· saved (encrypted)</span>}</label>
          <div className="flex gap-2">
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className={input} placeholder={cfg.has_api_key ? "•••••••• — enter a new key to replace" : "From Fireflies → Settings → Developer settings"} autoComplete="off" />
            <button onClick={() => save({ api_key: apiKey })} disabled={!apiKey.trim() || saving} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Save</button>
          </div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Webhook signing secret {cfg.has_webhook_secret ? <span className="text-emerald-500">· saved (encrypted)</span> : <span className="text-amber-500">· required — calls without a valid signature are rejected</span>}</label>
          <div className="flex gap-2">
            <input value={secret} onChange={e => setSecret(e.target.value)} className={`${input} font-mono`} placeholder={cfg.has_webhook_secret ? "•••••••• — generate a new one to rotate" : "Generate, then paste the same value into Fireflies"} autoComplete="off" />
            <button onClick={genSecret} className={`text-xs px-3 rounded-lg border ${t.border} ${t.textSub} whitespace-nowrap`}>Generate</button>
            {secret && <button onClick={() => copy(secret)} aria-label="Copy secret" className={`text-xs px-2 rounded-lg border ${t.border} ${t.textSub}`}><Copy className="w-3.5 h-3.5" /></button>}
            <button onClick={() => save({ webhook_secret: secret })} disabled={!secret.trim() || saving} className="text-xs px-3 rounded-lg bg-blue-600 text-white disabled:opacity-40">Save</button>
          </div>
        </div>
        <div>
          <label className={`block text-xs ${t.textMuted} mb-1`}>Webhook URL — paste into Fireflies → Settings → Developer settings → Webhooks</label>
          <div className="flex gap-2">
            <input readOnly value={webhookUrl} className={`${input} font-mono text-xs`} />
            <button onClick={() => copy(webhookUrl)} aria-label="Copy URL" className={`text-xs px-2 rounded-lg border ${t.border} ${t.textSub}`}><Copy className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {msg && <div className={`text-xs ${msg.ok ? "text-emerald-500" : "text-red-500"}`}>{msg.text}</div>}
      </div>

      <div className={`${t.bgCard} border ${t.border} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <div className={`text-sm font-semibold ${t.text} flex-1`}>Connection</div>
          <button onClick={runTest} disabled={testing || !cfg.has_api_key} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40 flex items-center gap-1.5">
            {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Test & list recent meetings
          </button>
        </div>
        <div className={`text-xs ${t.textMuted}`}>Last event: {cfg.last_event_at ? new Date(cfg.last_event_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "none yet"}{cfg.last_status ? ` — ${cfg.last_status}` : ""}</div>
        {test && (
          <div className="space-y-2">
            <div className={`text-xs flex items-center gap-1 ${test.ok ? "text-emerald-500" : "text-red-500"}`}>{test.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}{test.msg}</div>
            {(test.recent || []).map((m: any) => (
              <div key={m.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${t.bgCard2}`}>
                <div className="flex-1 min-w-0 text-xs"><div className={`${t.text} truncate`}>{m.title}</div><div className={t.textMuted}>{m.date ? new Date(Number(m.date) || m.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}</div></div>
                <button onClick={() => importOne(m.id)} disabled={!cfg.enabled || importing === m.id} className="text-[11px] px-2 py-1 rounded-lg border border-violet-500/50 text-violet-500 disabled:opacity-40 flex items-center gap-1">
                  {importing === m.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Import
                </button>
              </div>
            ))}
          </div>
        )}
        {!cfg.enabled && <div className={`text-[11px] ${t.textMuted}`}>Enable the add-on to import meetings.</div>}
      </div>
      <div className={`${t.bgCard2} border ${t.border} rounded-xl p-4 text-xs ${t.textMuted} space-y-1`}>
        <div className="font-semibold">How matching works</div>
        <div>• Attendee e-mails are matched against company promoters/management, client contacts and client e-mails.</div>
        <div>• The meeting is attached to that company's most recently updated open opportunity, and appears in its Company 360 timeline.</div>
        <div>• The organiser gets an in-app notification when the summary is ready.</div>
      </div>
    </div>
  );
}
