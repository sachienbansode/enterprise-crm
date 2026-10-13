import { useEffect, useRef, useState } from "react";
import { X, Camera, Image as ImageIcon, RefreshCw, CheckCircle2, AlertTriangle, Building2, User, Plus, ScanLine, RotateCcw, ArrowLeft } from "lucide-react";

// Scan a business card → company + person created (or matched to existing ones) in one step.
// Opened with window "cardscan:open" { client_id?, client_name? }. Full screen on phones.

const input = "w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const ok = "border-gray-200 dark:border-gray-700";
const ROLES = ["Promoter", "Management", "CFO", "CS", "Board", "Other"];
type Step = "capture" | "reading" | "review" | "saving" | "done";

// Shrink the photo before upload: long edge 1600 px, JPEG — keeps it small on mobile data and is plenty for reading text.
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

const L = ({ label, req, children, hint }: any) => (
  <label className="block"><span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>{children}{hint && <span className="block text-[11px] mt-1 text-gray-400">{hint}</span>}</label>
);

export default function CardScanner({ open, defaults, onClose }: { open: boolean; defaults?: { client_id?: string; client_name?: string; vertical?: string }; onClose: () => void }) {
  const [step, setStep] = useState<Step>("capture");
  const [front, setFront] = useState(""); const [back, setBack] = useState("");
  const [err, setErr] = useState(""); const [warn, setWarn] = useState("");
  const [person, setPerson] = useState<any>({}); const [company, setCompany] = useState<any>({});
  const [matches, setMatches] = useState<{ companies: any[]; people: any[] }>({ companies: [], people: [] });
  const [companyChoice, setCompanyChoice] = useState<string>("new"); // company id or "new"
  const [personChoice, setPersonChoice] = useState<string>("new");
  const [sectors, setSectors] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [bad, setBad] = useState("");
  const frontCam = useRef<HTMLInputElement>(null); const frontGal = useRef<HTMLInputElement>(null); const backCam = useRef<HTMLInputElement>(null);
  const fixed = !!defaults?.client_id;

  useEffect(() => {
    if (!open) return;
    setStep("capture"); setFront(""); setBack(""); setErr(""); setWarn(""); setResult(null); setBad("");
    setPerson({ name: "", designation: "", role_type: "Management", mobile: "", landline: "", email: "", linkedin: "" });
    setCompany({ name: defaults?.client_name || "", website: "", phone: "", email: "", address: "", city: "", cin: "", sector: "" });
    setMatches({ companies: defaults?.client_id ? [{ id: defaults.client_id, name: defaults.client_name, why: "Opened from this company" }] : [], people: [] });
    setCompanyChoice(defaults?.client_id || "new"); setPersonChoice("new");
    fetch("/api/config/dropdowns?entity=client&field=sector").then(r => r.json()).then(d => setSectors(Array.isArray(d) ? d.map((x: any) => x.value) : [])).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === "Escape" && step !== "saving") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, step, onClose]);
  useEffect(() => { if (bad && ((bad === "pname" && person.name?.trim()) || (bad === "cname" && company.name?.trim()))) setBad(""); }, [person.name, company.name, bad]);

  // Re-check for an existing company / contact when the user corrects the name, e-mail or mobile
  useEffect(() => {
    if (step !== "review") return;
    const h = setTimeout(() => {
      fetch("/api/cards/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company, person }) })
        .then(r => r.json()).then(m => {
          if (!m?.companies) return;
          const keepFixed = fixed && !m.companies.some((c: any) => c.id === defaults!.client_id) ? [{ id: defaults!.client_id, name: defaults!.client_name, why: "Opened from this company" }] : [];
          setMatches({ companies: [...keepFixed, ...m.companies], people: m.people || [] });
        }).catch(() => {});
    }, 600);
    return () => clearTimeout(h);
  }, [company.name, company.website, company.cin, person.email, person.mobile, step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Choose a photo (JPEG or PNG).");
    setErr("");
    try { const d = await shrink(f); side === "front" ? setFront(d) : setBack(d); }
    catch { setErr("Couldn't open that photo — try taking it again."); }
  };

  const read = async () => {
    setStep("reading"); setErr(""); setWarn("");
    try {
      const r = await fetch("/api/cards/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: front, back: back || undefined }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 422) { setErr(d.error); setStep("capture"); return; }
      if (!r.ok) { setWarn(d.error || "Couldn't read the card — fill in the details below."); setStep("review"); return; }
      const { person: p, company: c, confidence } = d.fields;
      setPerson((x: any) => ({ ...x, ...p }));
      setCompany((x: any) => ({ ...x, ...c, name: c.name || x.name, sector: sectors.find(s => c.sector_hint && s.toLowerCase().includes(String(c.sector_hint).toLowerCase())) || "" }));
      if (confidence !== null && confidence < 0.7) setWarn("The photo was hard to read — please check the details.");
      const cos = d.matches.companies || [];
      const all = fixed && !cos.some((x: any) => x.id === defaults!.client_id) ? [{ id: defaults!.client_id, name: defaults!.client_name, why: "Opened from this company" }, ...cos] : cos;
      setMatches({ companies: all, people: d.matches.people || [] });
      // Strong matches are pre-selected (CIN / e-mail domain); a similar name is only suggested
      const strong = cos.find((x: any) => /CIN|domain/.test(x.why));
      // Same e-mail / mobile already in the CRM → update that contact by default (no duplicates)
      const dupe = (d.matches.people || [])[0];
      setCompanyChoice(dupe ? dupe.client_id : fixed ? defaults!.client_id! : strong ? strong.id : "new");
      setPersonChoice(dupe ? dupe.id : "new");
      setStep("review");
    } catch { setWarn("Couldn't reach the server — fill in the details below."); setStep("review"); }
  };

  const save = async () => {
    setErr("");
    if (!person.name?.trim()) { setBad("pname"); return setErr("Enter the person's name."); }
    if (companyChoice === "new" && !company.name?.trim()) { setBad("cname"); return setErr("Enter the company name, or pick an existing company."); }
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) return setErr("The e-mail looks incomplete.");
    setStep("saving");
    try {
      const r = await fetch("/api/cards/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyChoice !== "new" ? companyChoice : undefined, company, person_id: personChoice !== "new" ? personChoice : undefined, person, vertical: defaults?.vertical || "ib", image: front || undefined, back: back || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not save");
      setResult(d); setStep("done");
      window.dispatchEvent(new CustomEvent("company:changed", { detail: d.company_id }));
    } catch (e: any) { setErr(e.message); setStep("review"); }
  };

  const P = (k: string, v: string) => setPerson((x: any) => ({ ...x, [k]: v }));
  const C = (k: string, v: string) => setCompany((x: any) => ({ ...x, [k]: v }));
  const Choice = ({ id, title, sub, onPick, on }: any) => (
    <button type="button" onClick={() => onPick(id)} className={`w-full text-left flex items-start gap-2.5 p-3 rounded-xl border ${on ? "border-blue-500 bg-blue-500/10" : "border-gray-200 dark:border-gray-700"}`}>
      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${on ? "border-blue-500 bg-blue-500 shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_#030712]" : "border-gray-300 dark:border-gray-600"}`} />
      <span className="min-w-0"><span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>{sub && <span className="block text-xs text-gray-500 dark:text-gray-400">{sub}</span>}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 animate-in fade-in duration-200 z-[60] bg-black/60 flex items-stretch sm:items-center justify-center sm:p-4" onClick={() => step !== "saving" && step !== "reading" && onClose()}>
      <div onClick={e => e.stopPropagation()} className="w-full sm:max-w-xl bg-gray-50 dark:bg-gray-950 sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-200 max-h-full sm:max-h-[92vh] overflow-hidden">
        <div className="flex items-center gap-2 px-3 h-14 bg-slate-800 text-white flex-shrink-0">
          {step === "review" ? <button onClick={() => setStep("capture")} aria-label="Back to photo" className="p-2 rounded-lg hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button> : <ScanLine className="w-5 h-5 ml-2" />}
          <div className="flex-1 font-semibold">{step === "review" ? "Check & save" : step === "done" ? "Saved" : "Scan business card"}</div>
          <button onClick={onClose} disabled={step === "saving"} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        <input ref={frontCam} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => pick(e, "front")} />
        <input ref={frontGal} type="file" accept="image/*" className="hidden" onChange={e => pick(e, "front")} />
        <input ref={backCam} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => pick(e, "back")} />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(step === "capture" || step === "reading") && (<>
            {!front ? (
              <button onClick={() => frontCam.current?.click()} className="w-full aspect-[1.75] rounded-2xl border-2 border-dashed border-blue-400/60 bg-blue-500/5 flex flex-col items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                <Camera className="w-10 h-10" /><span className="text-base font-semibold">Take a photo of the card</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-6 text-center">Card flat on a plain surface, filling the frame, in good light</span>
              </button>
            ) : (
              <div className="relative">
                <img src={front} alt="Front of the card" className="w-full rounded-2xl border border-gray-200 dark:border-gray-800" />
                {step === "reading" && <div className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center text-white gap-2"><RefreshCw className="w-7 h-7 animate-spin" /><span className="text-sm font-medium">Reading the card…</span></div>}
                {step === "capture" && <button onClick={() => frontCam.current?.click()} className="absolute top-2 right-2 text-xs px-2.5 py-1.5 rounded-full bg-black/60 text-white flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Retake</button>}
              </div>
            )}
            {step === "capture" && (<>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => frontGal.current?.click()} className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 bg-white dark:bg-gray-900"><ImageIcon className="w-4 h-4" /> From gallery</button>
                {back ? (
                  <div className="relative"><img src={back} alt="Back of the card" className="h-11 w-full object-cover rounded-xl border border-gray-200 dark:border-gray-800" />
                    <button onClick={() => setBack("")} aria-label="Remove back side" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></div>
                ) : (
                  <button onClick={() => backCam.current?.click()} disabled={!front} className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 bg-white dark:bg-gray-900 disabled:opacity-40"><Plus className="w-4 h-4" /> Back side</button>
                )}
              </div>
              {err && <div className="text-sm text-red-500 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}</div>}
              <button onClick={read} disabled={!front} className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"><ScanLine className="w-4 h-4" /> Read card</button>
              <button onClick={() => { setWarn(""); setStep("review"); }} className="w-full text-xs text-gray-500 dark:text-gray-400 underline">No card? Enter the details by hand</button>
            </>)}
          </>)}

          {(step === "review" || step === "saving") && (<>
            {front && <img src={front} alt="Card" className="w-full max-h-40 object-contain rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />}
            {warn && <div className="text-sm rounded-xl px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{warn}</div>}

            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 space-y-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4 text-violet-500" /> Person</div>
              <L label="Name" req><input value={person.name || ""} onChange={e => P("name", e.target.value)} className={`${input} ${bad === "pname" ? "border-red-500 ring-2 ring-red-500/30" : ok}`} /></L>
              <div className="grid grid-cols-2 gap-2">
                <L label="Designation"><input value={person.designation || ""} onChange={e => P("designation", e.target.value)} className={`${input} ${ok}`} /></L>
                <L label="Role"><select value={person.role_type || "Management"} onChange={e => P("role_type", e.target.value)} className={`${input} ${ok}`}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></L>
                <L label="Mobile"><input type="tel" inputMode="tel" value={person.mobile || ""} onChange={e => P("mobile", e.target.value)} className={`${input} ${ok}`} /></L>
                <L label="Landline"><input type="tel" inputMode="tel" value={person.landline || ""} onChange={e => P("landline", e.target.value)} className={`${input} ${ok}`} /></L>
              </div>
              <L label="Email"><input type="email" inputMode="email" autoCapitalize="off" value={person.email || ""} onChange={e => P("email", e.target.value.trim())} className={`${input} ${ok}`} /></L>
              <L label="LinkedIn"><input value={person.linkedin || ""} onChange={e => P("linkedin", e.target.value)} className={`${input} ${ok}`} /></L>
              {matches.people.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Already in the CRM?</div>
                  {matches.people.map(m => <Choice key={m.id} id={m.id} on={personChoice === m.id} onPick={(id: string) => { setPersonChoice(id); setCompanyChoice(m.client_id); }}
                    title={`Update ${m.name}`} sub={`${m.company_name} · ${m.why} — blanks are filled from the card`} />)}
                  <Choice id="new" on={personChoice === "new"} onPick={setPersonChoice} title="Add as a new contact" />
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 space-y-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> Company</div>
              {matches.companies.length > 0 && (
                <div className="space-y-1.5">
                  {matches.companies.map(m => <Choice key={m.id} id={m.id} on={companyChoice === m.id} onPick={setCompanyChoice} title={`Use ${m.name}`} sub={[m.client_code, m.hq_city, m.why].filter(Boolean).join(" · ")} />)}
                  <Choice id="new" on={companyChoice === "new"} onPick={setCompanyChoice} title="Create a new company" sub={company.name ? company.name : undefined} />
                </div>
              )}
              {companyChoice === "new" ? (<>
                <L label="Company name" req><input value={company.name || ""} onChange={e => C("name", e.target.value)} className={`${input} ${bad === "cname" ? "border-red-500 ring-2 ring-red-500/30" : ok}`} placeholder="e.g. Osai eBiz Solutions Pvt Ltd" /></L>
                <div className="grid grid-cols-2 gap-2">
                  <L label="Website"><input value={company.website || ""} onChange={e => C("website", e.target.value)} autoCapitalize="off" className={`${input} ${ok}`} /></L>
                  <L label="Office phone"><input type="tel" value={company.phone || ""} onChange={e => C("phone", e.target.value)} className={`${input} ${ok}`} /></L>
                  <L label="City"><input value={company.city || ""} onChange={e => C("city", e.target.value)} className={`${input} ${ok}`} /></L>
                  <L label="Sector"><select value={company.sector || ""} onChange={e => C("sector", e.target.value)} className={`${input} ${ok}`}><option value="">—</option>{sectors.map(s => <option key={s}>{s}</option>)}</select></L>
                </div>
                <L label="Address"><textarea value={company.address || ""} onChange={e => C("address", e.target.value)} rows={2} className={`${input} ${ok}`} /></L>
                <L label="CIN" hint="Optional — add it later from MCA if it isn't on the card"><input value={company.cin || ""} onChange={e => C("cin", e.target.value.toUpperCase())} maxLength={21} className={`${input} ${ok} font-mono`} /></L>
              </>) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">Website, address and phone from the card fill only the blanks on this company.</div>
              )}
            </section>
            {err && <div className="text-sm text-red-500 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}</div>}
          </>)}

          {step === "done" && result && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">{person.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {result.created_person ? "added" : "updated"} at <b>{result.company_name}</b>{result.created_company ? " — new company created" : ""}
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2">
                <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("person:open", { detail: { id: result.person_id } })); }} className="py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold">Open contact</button>
                <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("company:open", { detail: { id: result.company_id } })); }} className="py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200">Open company</button>
                <button onClick={() => { setStep("capture"); setFront(""); setBack(""); setResult(null); setPerson({ name: "", role_type: "Management" }); setCompany({ name: "" }); setMatches({ companies: [], people: [] }); setCompanyChoice(defaults?.client_id || "new"); }} className="py-2 text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5"><Camera className="w-4 h-4" /> Scan another card</button>
              </div>
            </div>
          )}
        </div>

        {(step === "review" || step === "saving") && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
            <button onClick={save} disabled={step === "saving"} className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {step === "saving" ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> {companyChoice === "new" ? "Create company & contact" : personChoice !== "new" ? "Update contact" : "Add contact"}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
