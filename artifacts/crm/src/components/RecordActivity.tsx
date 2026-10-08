import { useEffect, useRef, useState } from "react";
import { MessageSquare, Pencil, PlusCircle, Trash2, FileText, Upload, Download, Send, RefreshCw } from "lucide-react";

// Activity (edits + comments + uploads, with who/when) and Documents for a lead or deal.
// Used by the Lead and Deal detail panels in every vertical.

type Item =
  | { kind: "created" | "deleted"; at: string; by: string }
  | { kind: "edited"; at: string; by: string; changes: { field: string; from: string; to: string }[] }
  | { kind: "comment"; at: string; by: string; body: string; id: string }
  | { kind: "document"; at: string; by: string; name: string; id: string };

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const full = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function RecordActivity({ type, id, t, refreshKey = 0 }: { type: "lead" | "deal"; id: string; t: any; refreshKey?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`/api/activity/${type}/${id}`).then(r => r.json()).then(d => setItems(d.items || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [type, id, refreshKey]);

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true); setError("");
    const r = await fetch(`/api/activity/${type}/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
    if (r.ok) { setText(""); load(); } else setError((await r.json().catch(() => ({}))).error || "Could not add comment");
    setPosting(false);
  };

  const icon = (k: Item["kind"]) => k === "comment" ? <MessageSquare className="w-3 h-3" /> : k === "edited" ? <Pencil className="w-3 h-3" />
    : k === "created" ? <PlusCircle className="w-3 h-3" /> : k === "deleted" ? <Trash2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />;

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border ${t.border} ${t.bgCard2} p-2`}>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Add a comment…"
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) post(); }}
          className={`w-full bg-transparent text-xs outline-none resize-none ${t.text}`} />
        <div className="flex items-center justify-between">
          <span className={`text-[10px] ${error ? "text-red-500" : t.textMuted}`}>{error || "Ctrl+Enter to post"}</span>
          <button onClick={post} disabled={posting || !text.trim()} className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white disabled:opacity-40 flex items-center gap-1">
            <Send className="w-3 h-3" /> Post
          </button>
        </div>
      </div>
      {loading && !items.length ? <div className={`text-xs ${t.textMuted}`}>Loading history…</div> : (
        <ol className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${it.kind === "comment" ? "bg-blue-500/15 text-blue-500" : it.kind === "document" ? "bg-emerald-500/15 text-emerald-500" : `${t.bgCard2} ${t.textMuted}`}`}>{icon(it.kind)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px]">
                  <span className={`font-semibold ${t.text}`}>{it.by || "System"}</span>{" "}
                  <span className={t.textMuted}>{it.kind === "comment" ? "commented" : it.kind === "edited" ? "made changes" : it.kind === "created" ? "created this record" : it.kind === "deleted" ? "deleted this record" : "uploaded a document"}</span>
                  <span className={`${t.textMuted} ml-1`} title={full(it.at)}>· {ago(it.at)}</span>
                </div>
                {it.kind === "comment" && <div className={`mt-1 text-xs whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 ${t.bgCard2} ${t.text}`}>{it.body}</div>}
                {it.kind === "document" && <div className={`mt-0.5 text-xs ${t.text} truncate`}>{it.name}</div>}
                {it.kind === "edited" && (
                  <ul className="mt-1 space-y-0.5">
                    {it.changes.map((c, j) => (
                      <li key={j} className={`text-[11px] ${t.textSub} break-words`}>
                        <span className={t.textMuted}>{c.field}:</span> <span className="line-through opacity-60">{c.from}</span> → <span className={`font-medium ${t.text}`}>{c.to}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
          {!items.length && <li className={`text-xs ${t.textMuted}`}>No activity yet.</li>}
        </ol>
      )}
    </div>
  );
}

export function RecordDocuments({ type, id, vertical, clientId, t, onChange }: {
  type: "lead" | "deal"; id: string; vertical?: string; clientId?: string | null; t: any; onChange?: () => void;
}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch(`/api/documents?${type}_id=${id}&limit=50`).then(r => r.json()).then(d => setDocs(d.data || [])).catch(() => {});
  };
  useEffect(load, [type, id]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setError("");
    for (const f of Array.from(files)) {
      if (f.size > 50 * 1024 * 1024) { setError(`${f.name} is larger than 50 MB`); continue; }
      const fileData = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
      const r = await fetch("/api/documents/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData, fileName: f.name, name: f.name, type: "Other", vertical, client_id: clientId || null, [`${type}_id`]: id }),
      });
      if (!r.ok) setError((await r.json().catch(() => ({}))).error || `Upload failed: ${f.name}`);
    }
    if (input.current) input.current.value = "";
    setBusy(false); load(); onChange?.();
  };

  const download = async (doc: any) => {
    const r = await fetch(`/api/documents/${doc.id}/download`);
    if (!r.ok) { setError("Download failed"); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a"); a.href = url; a.download = doc.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-2">
      <input ref={input} type="file" multiple className="hidden" onChange={e => upload(e.target.files)} />
      <button onClick={() => input.current?.click()} disabled={busy}
        className={`w-full py-2.5 rounded-xl border border-dashed ${t.border} ${t.textSub} text-xs flex items-center justify-center gap-1.5 hover:border-blue-500/60 disabled:opacity-50`}>
        {busy ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> Upload documents (max 50 MB each)</>}
      </button>
      {error && <div className="text-[11px] text-red-500">{error}</div>}
      {docs.map(d => (
        <div key={d.id} className={`flex items-center gap-2 rounded-lg border ${t.border} px-2.5 py-2`}>
          <FileText className={`w-4 h-4 flex-shrink-0 ${t.textMuted}`} />
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-medium ${t.text} truncate`}>{d.name}</div>
            <div className={`text-[10px] ${t.textMuted}`}>{d.created_by_name || "—"} · {ago(d.created_at)}</div>
          </div>
          <button onClick={() => download(d)} title="Download" className={`p-1.5 rounded-lg ${t.textMuted} hover:text-blue-500`}><Download className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      {!docs.length && !busy && <div className={`text-[11px] ${t.textMuted} text-center py-2`}>No documents yet.</div>}
    </div>
  );
}
