import { useCallback, useEffect, useMemo, useState } from "react";
import { appConfirm } from "../lib/dialog";
import {
  ArrowLeft, Phone, Mail, Calendar, CheckSquare, Edit2, Eye, EyeOff, ChevronRight, MessageCircle, Linkedin, MapPin,
  Building2, UserCircle2, Star, CreditCard, Video, Mic, FileText, Download, Trash2, X, RefreshCw, CheckCircle2, Copy,
} from "lucide-react";

// Contact page for one person (promoter / management / any individual at a company).
// Mobile-first: full screen on phones, a side sheet on desktop. Opened with  window "person:open" { id }.

const ROLES = ["Promoter", "Management", "CFO", "CS", "Board", "Other"];
const input = "w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const fmtDate = (v: any) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
const initials = (n: string) => n.split(/\s+/).filter(Boolean).map(x => x[0]).join("").slice(0, 2).toUpperCase();
const waNumber = (m: string) => { const d = (m || "").replace(/\D/g, ""); return d.length === 10 ? `91${d}` : d; };
const ev = (name: string, detail: any) => window.dispatchEvent(new CustomEvent(name, { detail }));

function vcard(p: any) {
  const esc = (s: string) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const parts = p.name.trim().split(/\s+/); const last = parts.length > 1 ? parts.pop() : ""; const first = parts.join(" ");
  return ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(last || "")};${esc(first)};;;`, `FN:${esc(p.name)}`, p.company_name && `ORG:${esc(p.company_name)}`,
    p.designation && `TITLE:${esc(p.designation)}`, p.mobile && `TEL;TYPE=CELL:${p.mobile}`, p.landline && `TEL;TYPE=WORK:${p.landline}`,
    p.email && `EMAIL;TYPE=WORK:${p.email}`, p.linkedin && `URL:${p.linkedin}`, (p.address || p.company_address) && `ADR;TYPE=WORK:;;${esc(p.address || p.company_address)};;;;`,
    "END:VCARD"].filter(Boolean).join("\r\n");
}

export default function PersonView({ id, onClose }: { id: string; onClose: () => void }) {
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState("");
  const [showBlank, setShowBlank] = useState(false);
  const [sheet, setSheet] = useState<null | "edit" | "task" | "meeting" | "card">(null);
  const [cardUrl, setCardUrl] = useState<{ front?: string; back?: string }>({});
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    fetch(`/api/ib/people/${id}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Not found"); setP(d); }).catch(e => setErr(e.message));
  }, [id]);
  useEffect(() => { setP(null); setErr(""); load(); }, [load]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") sheet ? setSheet(null) : onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose, sheet]);
  useEffect(() => { const h = () => load(); window.addEventListener("quicklog:saved", h); return () => window.removeEventListener("quicklog:saved", h); }, [load]);
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(""), 2500); return () => clearTimeout(h); }, [toast]);

  const openCard = async () => {
    setSheet("card");
    if (cardUrl.front) return;
    const get = async (side: string) => { const r = await fetch(`/api/ib/people/${id}/card${side === "back" ? "?side=back" : ""}`); return r.ok ? URL.createObjectURL(await r.blob()) : undefined; };
    setCardUrl({ front: await get("front"), back: p?.has_card_back ? await get("back") : undefined });
  };

  // Field rows: [label, value, icon, href?]
  const about = useMemo(() => !p ? [] : [
    { k: "company", label: "Company", value: p.company_name, icon: Building2, onClick: () => { ev("company:open", { id: p.client_id }); onClose(); } },
    { k: "designation", label: "Designation", value: p.designation, icon: UserCircle2 },
    { k: "role", label: "Role", value: p.role_type, icon: Star },
    { k: "owner", label: "Contact Owner", value: p.owner_name, icon: UserCircle2 },
    { k: "source", label: "Added", value: `${p.source === "card_scan" ? "From a business card" : "Manually"}${p.created_by_name ? ` by ${p.created_by_name}` : ""} · ${fmtDate(p.created_at)}`, icon: CreditCard, onClick: p.has_card ? openCard : undefined, action: p.has_card ? "View card" : undefined },
  ], [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const touch = useMemo(() => !p ? [] : [
    { k: "mobile", label: "Mobile", value: p.mobile, icon: Phone, href: p.mobile ? `tel:${p.mobile.replace(/\s/g, "")}` : undefined },
    { k: "landline", label: "Landline", value: p.landline, icon: Phone, href: p.landline ? `tel:${p.landline.replace(/[^\d+]/g, "")}` : undefined },
    { k: "email", label: "Email", value: p.email, icon: Mail, href: p.email ? `mailto:${p.email}` : undefined },
    { k: "linkedin", label: "LinkedIn", value: p.linkedin, icon: Linkedin, href: p.linkedin ? (/^https?:/.test(p.linkedin) ? p.linkedin : `https://${p.linkedin}`) : undefined },
    { k: "address", label: "Address", value: p.address || p.company_address, icon: MapPin, href: (p.address || p.company_address) ? `https://maps.google.com/?q=${encodeURIComponent(p.address || p.company_address)}` : undefined },
  ], [p]);
  const blankCount = [...about, ...touch].filter(r => !r.value).length + (p && !p.notes ? 1 : 0);

  const copy = (v: string) => { navigator.clipboard?.writeText(v).then(() => setToast("Copied")).catch(() => {}); };
  const saveVcf = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([vcard(p)], { type: "text/vcard" })); a.download = `${p.name.replace(/[^\w]+/g, "-")}.vcf`; a.click();
  };

  const Row = ({ r }: { r: any }) => {
    if (!r.value && !showBlank) return null;
    const Icon = r.icon;
    const body = (
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">{r.label}</div>
        <div className={`text-[15px] mt-0.5 break-words ${!r.value ? "text-gray-400 italic" : (r.href || r.onClick) ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"}`}>{r.value || "Not added"}</div>
      </div>
    );
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {r.href && r.value ? <a href={r.href} target={/^https/.test(r.href) ? "_blank" : undefined} rel="noreferrer" className="min-w-0 flex-1 flex">{body}</a>
          : r.onClick && r.value ? <button onClick={r.onClick} className="min-w-0 flex-1 flex text-left">{body}</button> : body}
        {r.action && r.onClick ? <button onClick={r.onClick} className="text-xs text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">{r.action}</button>
          : r.onClick && r.value ? <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : r.value && (r.k === "mobile" || r.k === "email" || r.k === "landline") ? <button onClick={() => copy(r.value)} aria-label={`Copy ${r.label}`} className="p-1.5 text-gray-400 flex-shrink-0"><Copy className="w-3.5 h-3.5" /></button> : null}
      </div>
    );
  };
  const Card = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
    <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 pt-3.5 pb-1">
      <div className="flex items-center justify-between mb-1"><h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{title}</h3>{right}</div>
      {children}
    </section>
  );
  // One row of equal actions: tinted circle + label (fits a 360 px phone)
  const Act = ({ href, onClick, label, cls, icon: Icon, disabled }: any) => {
    const circle = <span className={`w-11 h-11 rounded-full flex items-center justify-center ${disabled ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600" : cls}`}><Icon className="w-5 h-5" /></span>;
    const lab = <span className={`text-[10px] font-medium ${disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>{label}</span>;
    const c = "flex flex-col items-center gap-1 min-w-0";
    return disabled ? <span className={c} aria-label={`${label} (not available)`}>{circle}{lab}</span>
      : href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={label} className={c}>{circle}{lab}</a>
      : <button onClick={onClick} aria-label={label} className={c}>{circle}{lab}</button>;
  };

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-[55] flex justify-end bg-black/40" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative w-full md:max-w-md h-full bg-gray-100 dark:bg-gray-950 flex flex-col shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-3 h-14 bg-slate-800 dark:bg-slate-900 text-white flex-shrink-0">
          <button onClick={onClose} aria-label="Back" className="p-2 -ml-1 rounded-lg hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
          <div className="text-base font-bold uppercase tracking-wide truncate">{p?.name || "Contact"}</div>
        </div>

        {!p ? (
          <div className="p-6 text-sm text-gray-500 flex items-center">{err || <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</>}</div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 px-4 pt-6 pb-5 text-center border-b border-gray-100 dark:border-gray-800">
              <div className="mx-auto w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center text-2xl font-bold">{initials(p.name)}</div>
              <h2 className="mt-3 text-xl font-extrabold uppercase text-gray-900 dark:text-white leading-tight">{p.name}{p.is_key && <Star className="inline w-4 h-4 ml-1 text-amber-500 fill-amber-500 -mt-1" />}</h2>
              {p.designation && <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{p.designation}</div>}
              <button onClick={() => { ev("company:open", { id: p.client_id }); onClose(); }} className="text-sm text-blue-600 dark:text-blue-400 mt-0.5 uppercase">{p.company_name}</button>
              <div className="mt-5 grid grid-cols-7 gap-1 max-w-sm mx-auto">
                <Act label="WhatsApp" icon={MessageCircle} href={p.mobile ? `https://wa.me/${waNumber(p.mobile)}` : undefined} disabled={!p.mobile} cls="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" />
                <Act label="Call" icon={Phone} href={p.mobile || p.landline ? `tel:${(p.mobile || p.landline).replace(/[^\d+]/g, "")}` : undefined} disabled={!p.mobile && !p.landline} cls="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" />
                <Act label="Email" icon={Mail} href={p.email ? `mailto:${p.email}` : undefined} disabled={!p.email} cls="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" />
                <Act label="Meeting" icon={Calendar} onClick={() => setSheet("meeting")} cls="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" />
                <Act label="Task" icon={CheckSquare} onClick={() => setSheet("task")} cls="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" />
                <Act label="Log" icon={FileText} onClick={() => ev("quicklog:open", { client_id: p.client_id, client_name: p.company_name })} cls="bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300" />
                <Act label="Edit" icon={Edit2} onClick={() => setSheet("edit")} cls="bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300" />
              </div>
            </div>

            <div className="px-3 sm:px-4 pt-3 space-y-3">
              {blankCount > 0 && (
                <div className="flex justify-end">
                  <button onClick={() => setShowBlank(v => !v)} className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    {showBlank ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{showBlank ? "Hide blank fields" : `Show ${blankCount} blank field${blankCount === 1 ? "" : "s"}`}
                  </button>
                </div>
              )}
              <Card title="About">{about.map(r => <Row key={r.k} r={r} />)}</Card>
              <Card title="Get in Touch">
                {touch.map(r => <Row key={r.k} r={r} />)}
                {!touch.some(r => r.value) && !showBlank && <div className="py-3 text-sm text-gray-400">No contact details yet — tap Edit to add them.</div>}
              </Card>
              {(p.notes || showBlank) && <Card title="Notes"><div className={`py-3 text-sm whitespace-pre-wrap ${p.notes ? "text-gray-800 dark:text-gray-200" : "text-gray-400 italic"}`}>{p.notes || "Not added"}</div></Card>}
              <Card title="History" right={p.open_tasks ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{p.open_tasks} open task{p.open_tasks === 1 ? "" : "s"}</span> : null}>
                <ol className="py-1">
                  {p.history.map((h: any, i: number) => {
                    const Icon = h.kind === "meeting" || h.meeting_id ? (h.source === "teams" ? Video : Mic) : h.kind === "task" ? CheckSquare : h.kind === "created" ? (p.source === "card_scan" ? CreditCard : UserCircle2) : FileText;
                    const tone = h.kind === "task" ? (h.status === "Done" ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10") : h.kind === "created" ? "text-gray-500 bg-gray-500/10" : "text-violet-500 bg-violet-500/10";
                    return (
                      <li key={i} className="flex gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tone}`}><Icon className="w-4 h-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${h.kind === "task" && h.status === "Done" ? "line-through opacity-60" : ""}`}>{h.title || h.type}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {[fmtDate(h.at), h.by, h.kind === "task" ? (h.status === "Done" ? "done" : h.due_date ? `due ${fmtDate(h.due_date)}` : "open") : null, h.kind === "interaction" ? h.type : null].filter(Boolean).join(" · ")}
                          </div>
                          {h.summary && <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-3">{h.summary}</div>}
                          {h.meeting_id && <button onClick={() => ev("meeting:open", { id: h.meeting_id })} className="text-xs text-violet-600 dark:text-violet-400 mt-1">Open transcript →</button>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
              <button onClick={saveVcf} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm text-blue-600 dark:text-blue-400 font-medium">
                <Download className="w-4 h-4" /> Save to phone contacts
              </button>
            </div>
          </div>
        )}

        {toast && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white shadow-lg">{toast}</div>}

        {p && sheet && (
          <div className="absolute inset-0 z-10 bg-black/50 flex items-end" onClick={() => setSheet(null)}>
            <div onClick={e => e.stopPropagation()} className="w-full max-h-[92%] overflow-y-auto bg-white dark:bg-gray-950 rounded-t-3xl p-4 pb-6 space-y-3 animate-in slide-in-from-bottom-10 duration-300">
              <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              {sheet === "meeting" && <MeetingSheet p={p} onDone={() => setSheet(null)} />}
              {sheet === "task" && <TaskSheet p={p} onDone={msg => { setSheet(null); setToast(msg); load(); }} />}
              {sheet === "edit" && <EditSheet p={p} onDone={(msg, deleted) => { setSheet(null); setToast(msg); if (deleted) { ev("company:changed", p.client_id); onClose(); } else { load(); ev("company:changed", p.client_id); } }} />}
              {sheet === "card" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><div className="text-base font-semibold text-gray-900 dark:text-white">Business card</div><button onClick={() => setSheet(null)} aria-label="Close" className="p-1 text-gray-400"><X className="w-5 h-5" /></button></div>
                  {!cardUrl.front ? <div className="text-sm text-gray-500 flex items-center"><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading…</div> : <>
                    <img src={cardUrl.front} alt="Front of business card" className="w-full rounded-xl border border-gray-200 dark:border-gray-800" />
                    {cardUrl.back && <img src={cardUrl.back} alt="Back of business card" className="w-full rounded-xl border border-gray-200 dark:border-gray-800" />}
                  </>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingSheet({ p, onDone }: { p: any; onDone: () => void }) {
  const Opt = ({ icon: Icon, title, sub, onClick, tone }: any) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 text-left">
      <span className={`w-10 h-10 rounded-full flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></span>
      <span className="min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white">{title}</span><span className="block text-xs text-gray-500 dark:text-gray-400">{sub}</span></span>
    </button>
  );
  return (
    <div className="space-y-2.5">
      <div className="text-base font-semibold text-gray-900 dark:text-white">Meeting with {p.name}</div>
      <Opt icon={Video} tone="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" title="Schedule a Teams meeting" sub={p.email ? `Invite goes to ${p.email}; the transcript comes back to the CRM` : "No e-mail on file — you can add invitees in the next step"}
        onClick={() => { onDone(); ev("teams:schedule", { client: { id: p.client_id, name: p.company_name, email: p.email || "" }, subject: `Meeting with ${p.name} (${p.company_name})` }); }} />
      <Opt icon={Mic} tone="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" title="Record an in-person meeting now" sub={`${p.name} is added as an attendee, so the transcript names them`}
        onClick={() => { onDone(); ev("recorder:open", { client_id: p.client_id, client_name: p.company_name, person_id: p.id, title: `Meeting with ${p.name}` }); }} />
    </div>
  );
}

function TaskSheet({ p, onDone }: { p: any; onDone: (msg: string) => void }) {
  const [title, setTitle] = useState(""); const [due, setDue] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const quick = [["Today", 0], ["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]] as const;
  const iso = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-CA"); };
  const save = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `${title.trim()} — ${p.name}`, due_date: due || null, client_id: p.client_id, person_id: p.id, vertical: "Investment Banking" }) });
    setBusy(false);
    if (r.ok) onDone("Task added"); else setErr((await r.json().catch(() => ({}))).error || "Could not add the task");
  };
  return (
    <div className="space-y-3">
      <div className="text-base font-semibold text-gray-900 dark:text-white">New task · {p.name}</div>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} className={input} placeholder="e.g. Send the IPO readiness note" />
      <div className="flex flex-wrap gap-1.5">
        {quick.map(([l, n]) => <button key={l} type="button" onClick={() => setDue(iso(n))} className={`text-xs px-3 py-1.5 rounded-full border ${due === iso(n) ? "border-blue-500 bg-blue-500/10 text-blue-600 font-medium" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>{l}</button>)}
      </div>
      <input type="date" value={due} onChange={e => setDue(e.target.value)} className={input} aria-label="Due Date" />
      {err && <div className="text-sm text-red-500">{err}</div>}
      <button onClick={save} disabled={busy || !title.trim()} className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40">{busy ? "Saving…" : "Add task"}</button>
    </div>
  );
}

const L = ({ label, children }: any) => <label className="block"><span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</span>{children}</label>;

function EditSheet({ p, onDone }: { p: any; onDone: (msg: string, deleted?: boolean) => void }) {
  const [f, setF] = useState<any>({ name: p.name || "", designation: p.designation || "", role_type: p.role_type || "Management", mobile: p.mobile || "", landline: p.landline || "", email: p.email || "", linkedin: p.linkedin || "", address: p.address || "", notes: p.notes || "", is_key: !!p.is_key });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = async () => {
    if (!f.name.trim()) return setErr("Name is required");
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr("E-mail looks incomplete");
    setBusy(true); setErr("");
    const r = await fetch(`/api/ib/people/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) onDone("Saved"); else setErr((await r.json().catch(() => ({}))).error || "Could not save");
  };
  const del = async () => {
    if (!(await appConfirm({ title: `Remove ${p.name}?`, message: `They will be removed from ${p.company_name}.`, confirmLabel: "Remove", tone: "danger" }))) return;
    const r = await fetch(`/api/ib/people/${p.id}`, { method: "DELETE" });
    if (r.ok) onDone("Removed", true);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><div className="text-base font-semibold text-gray-900 dark:text-white">Edit contact</div>
        <button onClick={del} className="text-xs text-red-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button></div>
      <L label="Name *"><input value={f.name} onChange={e => set("name", e.target.value)} className={input} /></L>
      <div className="grid grid-cols-2 gap-2">
        <L label="Designation"><input value={f.designation} onChange={e => set("designation", e.target.value)} className={input} /></L>
        <L label="Role"><select value={f.role_type} onChange={e => set("role_type", e.target.value)} className={input}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></L>
        <L label="Mobile"><input type="tel" inputMode="tel" value={f.mobile} onChange={e => set("mobile", e.target.value)} className={input} placeholder="+91 98xxx xxxxx" /></L>
        <L label="Landline"><input type="tel" inputMode="tel" value={f.landline} onChange={e => set("landline", e.target.value)} className={input} placeholder="+91 22 xxxx xxxx" /></L>
      </div>
      <L label="Email"><input type="email" inputMode="email" autoCapitalize="off" value={f.email} onChange={e => set("email", e.target.value.trim())} className={input} /></L>
      <L label="LinkedIn"><input value={f.linkedin} onChange={e => set("linkedin", e.target.value)} className={input} placeholder="linkedin.com/in/…" /></L>
      <L label="Address"><textarea value={f.address} onChange={e => set("address", e.target.value)} rows={2} className={input} placeholder="Leave blank to use the company address" /></L>
      <L label="Notes"><textarea value={f.notes} onChange={e => set("notes", e.target.value)} rows={3} className={input} /></L>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={f.is_key} onChange={e => set("is_key", e.target.checked)} className="w-4 h-4" /> Key decision-maker</label>
      {err && <div className="text-sm text-red-500">{err}</div>}
      <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">{busy ? "Saving…" : <><CheckCircle2 className="w-4 h-4" /> Save</>}</button>
    </div>
  );
}
