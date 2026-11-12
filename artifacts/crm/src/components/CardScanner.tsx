import { useEffect, useRef, useState } from "react";
import { X, Camera, Image as ImageIcon, RefreshCw, CheckCircle2, AlertTriangle, Building2, User, Plus, ScanLine, RotateCcw, ArrowLeft, QrCode, Link2 } from "lucide-react";
import { ocrCard, parseCardText } from "../lib/cardOcr";
import { decodeQR, decodeQRFromDataUrl, parseContactQR, QR_KIND_LABEL, type QrResult } from "../lib/qr";

// Scan a business card or a QR code (vCard / MeCard / LinkedIn / website) → draft person + company on screen →
// user checks, picks an existing company / contact if one matches, and approves — both are created in one step.
// Opened with window "cardscan:open" { client_id?, client_name? }. Full screen on phones.

const input = "w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
const ok = "border-gray-200 dark:border-gray-700";
const ROLES = ["Promoter", "Management", "CFO", "CS", "Board", "Other"];
type Step = "capture" | "qr" | "reading" | "review" | "saving" | "done";

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

const isPhone = () => { try { return window.matchMedia("(max-width: 767px)").matches; } catch { return false; } };

const L = ({ label, req, children, hint }: any) => (
  <label className="block"><span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>{children}{hint && <span className="block text-[11px] mt-1 text-gray-400">{hint}</span>}</label>
);

export default function CardScanner({ open, defaults, onClose }: { open: boolean; defaults?: { client_id?: string; client_name?: string; vertical?: string; verticals?: { id: string; label: string }[]; mode?: string }; onClose: () => void }) {
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
  const [qr, setQr] = useState<QrResult | null>(null);       // QR that filled the draft (shown as a chip; raw text kept in notes)
  const [qrMsg, setQrMsg] = useState("");
  const [readMsg, setReadMsg] = useState("Reading the card…");
  const [ocrUsed, setOcrUsed] = useState(false);       // fields came from on-device OCR (no AI)
  const [ocrText, setOcrText] = useState("");
  const [link, setLink] = useState(""); const [linkBusy, setLinkBusy] = useState(false);
  const [via, setVia] = useState<"" | "link" | "text">("");   // draft filled from a pasted website link / pasted text
  const [siteNote, setSiteNote] = useState("");
  const [vert, setVert] = useState("ib");
  const [full, setFull] = useState(false);   // phones show a short summary first; "Edit details" opens the full form
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const qrGal = useRef<HTMLInputElement>(null);
  const frontCam = useRef<HTMLInputElement>(null); const frontGal = useRef<HTMLInputElement>(null); const backCam = useRef<HTMLInputElement>(null);
  const fixed = !!defaults?.client_id;

  useEffect(() => {
    if (!open) return;
    setStep(defaults?.mode === "qr" ? "qr" : "capture"); setLink(""); setVia(""); setSiteNote(""); setFull(!isPhone()); setVert(defaults?.vertical || defaults?.verticals?.[0]?.id || "ib"); setFront(""); setBack(""); setErr(""); setWarn(""); setResult(null); setBad(""); setQr(null); setQrMsg("");
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

  // Live QR scanning: rear camera, a frame checked ~4 times a second; stops as soon as a code is read
  const stopCam = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => {
    if (!open || step !== "qr") { stopCam(); return; }
    let alive = true, timer: any = 0; const work = document.createElement("canvas");
    setQrMsg("Starting camera…");
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!alive) { s.getTracks().forEach(t => t.stop()); return; }
        stream.current = s;
        const v = video.current!; v.srcObject = s; v.setAttribute("playsinline", "true"); await v.play().catch(() => {});
        setQrMsg("Point the camera at the QR code");
        const tick = async () => {
          if (!alive) return;
          if (v.readyState >= 2) {
            const text = await decodeQR(v, work).catch(() => null);
            if (text && alive) { alive = false; try { navigator.vibrate?.(60); } catch { /* not supported */ } stopCam(); applyQr(text); return; }
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (e: any) {
        setQrMsg(/denied|permission|notallowed/i.test(String(e?.name || e?.message)) ? "Camera permission was refused — allow the camera for this site, or pick a photo of the QR code." : "The camera isn't available here — pick a photo of the QR code instead.");
      }
    })();
    return () => { alive = false; clearTimeout(timer); stopCam(); };
  }, [open, step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const showFull = full || !!bad || (!person.name?.trim() && !company.name?.trim());

  // Matches found for the draft → pre-select: same e-mail / mobile = update that contact; CIN / e-mail domain = that company
  const applyMatches = (m: any) => {
    const cos = m?.companies || [];
    const all = fixed && !cos.some((x: any) => x.id === defaults!.client_id) ? [{ id: defaults!.client_id, name: defaults!.client_name, why: "Opened from this company" }, ...cos] : cos;
    setMatches({ companies: all, people: m?.people || [] });
    const strong = cos.find((x: any) => /CIN|domain/.test(x.why));
    const dupe = (m?.people || [])[0];
    setCompanyChoice(dupe ? dupe.client_id : fixed ? defaults!.client_id! : strong ? strong.id : "new");
    setPersonChoice(dupe ? dupe.id : "new");
  };

  // A QR was read (camera or photo) → fill the draft and go straight to review
  const applyQr = async (text: string) => {
    const q = parseContactQR(text);
    if (q.kind === "url" && q.company.website) { await applyLink(q.company.website); setQr(q); return; } // website QR → read the company's site
    setQr(q); setErr("");
    const gotSomething = Object.keys(q.person).length + Object.keys(q.company).length > 0;
    const p2 = { ...person, ...q.person }, c2 = { ...company, ...q.company, name: q.company.name || company.name };
    setPerson(p2); setCompany(c2);
    setWarn(q.kind === "linkedin" ? `LinkedIn profile link saved${q.person.name ? " and the name taken from it" : ""} — add the ${q.person.name ? "" : "person's name and "}company.` : !gotSomething ? "The QR code has no contact details — fill in the details below." : !q.person.name || (!q.company.name && !fixed) ? "Some details aren't in the QR code — please complete the highlighted fields." : "");
    setBad(!p2.name ? "pname" : !c2.name && !fixed ? "cname" : "");
    setStep("review");
    try { const r = await fetch("/api/cards/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: c2, person: p2 }) }); applyMatches(await r.json()); } catch { /* matching is a convenience */ }
  };
  // Pasted link or text: contact QR text / LinkedIn / WhatsApp → like a QR; a website → company details read from the site;
  // anything else (e.g. an e-mail signature) → the same rules used for reading a card
  const applyLink = async (val: string = link) => {
    const v = String(val || "").trim(); if (!v) return;
    setErr(""); setWarn(""); setQr(null); setOcrUsed(false); setOcrText(""); setSiteNote("");
    if (/^(BEGIN:VCARD|MECARD:|BIZCARD:|mailto:|tel:)/i.test(v) || /linkedin\.com\/(in|pub)\//i.test(v) || /wa\.me\/|whatsapp\.com\/send/i.test(v)) { setVia("link"); await applyQr(v); return; }
    const isUrl = !/\s/.test(v) && !v.includes("@") && /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v);
    let p: any = {}, c: any = {}, m: any = null;
    if (isUrl) {
      setLinkBusy(true);
      try {
        const r = await fetch("/api/cards/url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: v }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { p = d.person || {}; c = d.company || {}; m = d.matches; setSiteNote(d.description || ""); setWarn(`Company details read from ${new URL(d.url).hostname} — check them and add the contact person if you have one.`); }
        else { c = { website: /^https?:/i.test(v) ? v : `https://${v}` }; setWarn(d.error || "Couldn't read that website — fill in the details below."); }
      } catch { c = { website: v }; setWarn("Couldn't reach the server — fill in the details below."); }
      finally { setLinkBusy(false); }
      setVia("link");
    } else {
      const f = parseCardText(v); p = f.person; c = f.company; setVia("text");
      setWarn("Filled from the pasted text — please check every field.");
    }
    const p2 = { ...person, ...p }, c2 = { ...company, ...c, name: c.name || company.name };
    setPerson(p2); setCompany(c2); setBad(!c2.name && !fixed ? "cname" : "");
    if (!m) m = await fetch("/api/cards/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: c2, person: p2 }) }).then(x => x.json()).catch(() => null);
    applyMatches(m); setStep("review");
  };
  const pickQrPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setQrMsg("Reading the QR code…");
    try { const d = await shrink(f); const t = await decodeQRFromDataUrl(d); if (t) { stopCam(); applyQr(t); } else setQrMsg("No QR code found in that photo — try a closer, sharper photo."); }
    catch { setQrMsg("Couldn't open that photo."); }
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Choose a photo (JPEG or PNG).");
    setErr("");
    try {
      const d = await shrink(f);
      if (side === "front") { setFront(d); if (isPhone()) read(d); } // phones: read straight away — one tap from photo to draft
      else setBack(d);
    }
    catch { setErr("Couldn't open that photo — try taking it again."); }
  };

  const read = async (frontImg: string = front) => {
    setStep("reading"); setErr(""); setWarn(""); setQr(null); setOcrUsed(false); setOcrText("");
    // A QR printed on the card (frontImg or back) is read exactly — its e-mail / phone / LinkedIn win over the AI reading
    const qrText = decodeQRFromDataUrl(frontImg).then(t => t || (back ? decodeQRFromDataUrl(back) : null)).catch(() => null);
    try {
      const r = await fetch("/api/cards/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: frontImg, back: back || undefined }) });
      const d = await r.json().catch(() => ({}));
      const t = await qrText; const q = t ? parseContactQR(t) : null;
      if (q) setQr(q);
      if (r.status === 422 && !q) { setErr(d.error); setStep("capture"); return; }
      const exact = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => ["email", "mobile", "linkedin", "website"].includes(k)));
      const fillBlanks = (base: any, extra: any) => { const o = { ...base }; for (const [k, v] of Object.entries(extra || {})) if (!o[k]) o[k] = v; return o; };
      if (!r.ok) {
        // No AI model (or it failed) → read the card on this device with OCR, then the QR (if any) corrects e-mail / phone / web
        let o: any = null;
        setReadMsg("Reading on this device…");
        try { o = await ocrCard([frontImg, back], pr => setReadMsg(`Reading on this device… ${Math.round(pr * 100)}%`)); } catch (e) { console.warn("OCR failed", e); }
        setReadMsg("Reading the card…");
        const got = o && (o.person.name || o.person.email || o.person.mobile || o.company.name);
        if (!got) {
          if (q) { await applyQr(t!); setWarn("The card text couldn't be read, so the details come from its QR code — please check them."); return; }
          setWarn(d.error || "Couldn't read the card — fill in the details below."); setStep("review"); return;
        }
        const p = q ? { ...fillBlanks(o.person, q.person), ...exact(q.person) } : o.person;
        const c = q ? { ...fillBlanks(o.company, q.company), ...exact(q.company) } : o.company;
        const p2 = { ...person, ...p }, c2 = { ...company, ...c, name: c.name || company.name };
        setPerson(p2); setCompany(c2); setOcrUsed(true); setOcrText(o.text || "");
        setWarn(`Read on this device without AI${d.code === "AI_OFF" ? "" : " (the AI couldn't be reached)"} — please check every field before approving.`);
        setBad(!p2.name ? "pname" : !c2.name && !fixed ? "cname" : "");
        const m = await fetch("/api/cards/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: c2, person: p2 }) }).then(x => x.json()).catch(() => null);
        applyMatches(m); setStep("review"); return;
      }
      const { person: p0, company: c0, confidence } = d.fields;
      const p = q ? { ...fillBlanks(p0, q.person), ...exact(q.person) } : p0;
      const c = q ? { ...fillBlanks(c0, q.company), ...exact(q.company) } : c0;
      const p2 = { ...person, ...p };
      const c2 = { ...company, ...c, name: c.name || company.name, sector: sectors.find(s => c.sector_hint && s.toLowerCase().includes(String(c.sector_hint).toLowerCase())) || "" };
      setPerson(p2); setCompany(c2);
      if (confidence !== null && confidence < 0.7) setWarn("The photo was hard to read — please check the details.");
      if (q) {
        const m = await fetch("/api/cards/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: c2, person: p2 }) }).then(x => x.json()).catch(() => d.matches);
        applyMatches(m);
      } else applyMatches(d.matches);
      setStep("review");
    } catch { setWarn("Couldn't reach the server — fill in the details below."); setStep("review"); }
  };

  const save = async () => {
    setErr("");
    if (!person.name?.trim() && (person.email || person.mobile || person.designation)) { setBad("pname"); return setErr("Enter the person's name, or clear the contact fields to save the company only."); }
    if (companyChoice === "new" && !company.name?.trim()) { setBad("cname"); return setErr("Enter the company name, or pick an existing company."); }
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) return setErr("The e-mail looks incomplete.");
    setStep("saving");
    try {
      const r = await fetch("/api/cards/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyChoice !== "new" ? companyChoice : undefined, company, person_id: personChoice !== "new" ? personChoice : undefined, person, vertical: vert, image: front || undefined, back: back || undefined,
          source: via || (qr && !front ? "qr" : ocrUsed ? "ocr" : "card"), notes: qr?.notes || siteNote || undefined }),
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
          {step === "review" || step === "qr" ? <button onClick={() => setStep("capture")} aria-label="Back" className="p-2 rounded-lg hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></button> : <ScanLine className="w-5 h-5 ml-2" />}
          <div className="flex-1 font-semibold">{step === "review" ? "Review & approve" : step === "done" ? "Saved" : step === "qr" ? "Scan QR code" : "Scan Card, QR or Link"}</div>
          <button onClick={onClose} disabled={step === "saving"} aria-label="Close" className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        <input ref={frontCam} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => pick(e, "front")} />
        <input ref={frontGal} type="file" accept="image/*" className="hidden" onChange={e => pick(e, "front")} />
        <input ref={backCam} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => pick(e, "back")} />
        <input ref={qrGal} type="file" accept="image/*" className="hidden" onChange={pickQrPhoto} />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === "qr" && (
            <div className="space-y-3">
              <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black">
                <video ref={video} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[64%] aspect-square rounded-3xl border-[3px] border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative overflow-hidden">
                    <div className="absolute left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_12px_2px_rgba(56,189,248,0.8)] animate-[qrscan_2s_ease-in-out_infinite]" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 text-center text-[13px] text-white font-medium px-4">{qrMsg}</div>
              </div>
              <button onClick={() => qrGal.current?.click()} className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 bg-white dark:bg-gray-900"><ImageIcon className="w-4 h-4" /> Pick a photo of the QR code</button>
              <div className="text-[12px] text-gray-500 dark:text-gray-400 text-center">Reads contact QR codes (vCard / MeCard), LinkedIn profile, website, e-mail and WhatsApp / phone QR codes.</div>
            </div>
          )}

          {(step === "capture" || step === "reading") && (<>
            {!front ? (
              <button onClick={() => frontCam.current?.click()} className="w-full aspect-[1.75] rounded-2xl border-2 border-dashed border-blue-400/60 bg-blue-500/5 flex flex-col items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                <Camera className="w-10 h-10" /><span className="text-base font-semibold">Take a photo of the card</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 px-6 text-center">Card flat on a plain surface, filling the frame, in good light</span>
              </button>
            ) : (
              <div className="relative">
                <img src={front} alt="Front of the card" className="w-full rounded-2xl border border-gray-200 dark:border-gray-800" />
                {step === "reading" && <div className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center text-white gap-2"><RefreshCw className="w-7 h-7 animate-spin" /><span className="text-sm font-medium">{readMsg}</span></div>}
                {step === "capture" && <button onClick={() => frontCam.current?.click()} className="absolute top-2 right-2 text-xs px-2.5 py-1.5 rounded-full bg-black/60 text-white flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Retake</button>}
              </div>
            )}
            {step === "capture" && (<>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => frontGal.current?.click()} className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 bg-white dark:bg-gray-900"><ImageIcon className="w-4 h-4" /> From gallery</button>
                {back ? (
                  <div className="relative"><img src={back} alt="Back of the card" className="h-11 w-full object-cover rounded-xl border border-gray-200 dark:border-gray-800" />
                    <button onClick={() => setBack("")} aria-label="Remove Back Side" className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></div>
                ) : (
                  <button onClick={() => backCam.current?.click()} disabled={!front} className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 bg-white dark:bg-gray-900 disabled:opacity-40"><Plus className="w-4 h-4" /> Back side</button>
                )}
              </div>
              {err && <div className="text-sm text-red-500 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}</div>}
              <button onClick={() => read()} disabled={!front} className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"><ScanLine className="w-4 h-4" /> Read card</button>
              <div className="flex items-center gap-3 text-[11px] text-gray-400"><span className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />or<span className="flex-1 h-px bg-gray-200 dark:bg-gray-800" /></div>
              <button onClick={() => { setErr(""); setStep("qr"); }} className="w-full py-3.5 rounded-xl border-2 border-sky-500/60 text-sky-700 dark:text-sky-300 bg-sky-500/5 text-sm font-semibold flex items-center justify-center gap-2"><QrCode className="w-5 h-5" /> Scan a QR code</button>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 space-y-2">
                <div className="text-[12px] font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Or paste a link or contact details</div>
                <textarea value={link} onChange={e => setLink(e.target.value)} rows={2} placeholder="Company website (www.example.com), LinkedIn profile link, or an e-mail signature"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !link.includes("\n")) { e.preventDefault(); applyLink(); } }}
                  className={`${input} ${ok} resize-none`} aria-label="Link or contact details" />
                <button onClick={() => applyLink()} disabled={!link.trim() || linkBusy} className="w-full py-2.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                  {linkBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Reading the website…</> : <>Fill the details</>}</button>
              </div>
              <button onClick={() => { setWarn(""); setStep("review"); }} className="w-full text-xs text-gray-500 dark:text-gray-400 underline">No card? Enter the details by hand</button>
            </>)}
          </>)}

          {(step === "review" || step === "saving") && (<>
            {front && <img src={front} alt="Card" className="w-full max-h-40 object-contain rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />}
            {ocrUsed && ocrText.trim() && (
              <details className="rounded-xl px-3 py-2 bg-slate-500/10 text-slate-700 dark:text-slate-200 text-[13px]">
                <summary className="cursor-pointer font-medium">Text read from the card — copy anything that was missed</summary>
                <pre data-ocr-text className="mt-2 text-[12px] whitespace-pre-wrap break-words max-h-40 overflow-y-auto select-text">{ocrText.trim()}</pre>
              </details>
            )}
            {qr && (
              <details className="rounded-xl px-3 py-2 bg-sky-500/10 text-sky-800 dark:text-sky-200 text-[13px]">
                <summary className="cursor-pointer flex items-center gap-1.5 font-medium list-none"><QrCode className="w-4 h-4" /> {front ? "Card QR code read — " : ""}{QR_KIND_LABEL[qr.kind]} · draft filled, please review</summary>
                <pre className="mt-2 text-[11px] whitespace-pre-wrap break-all opacity-80 max-h-32 overflow-y-auto">{qr.raw}</pre>
              </details>
            )}
            {warn && <div className="text-sm rounded-xl px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{warn}</div>}

{showFull ? (<>
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 space-y-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4 text-violet-500" /> Person</div>
              <L label="Name" hint={!person.name ? "Leave the contact blank to save just the company" : undefined}><input value={person.name || ""} onChange={e => P("name", e.target.value)} className={`${input} ${bad === "pname" ? "border-red-500 ring-2 ring-red-500/30" : ok}`} /></L>
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
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> Company / Client</div>
              {companyChoice === "new" && !defaults?.vertical && (defaults?.verticals?.length || 0) > 1 && (
                <L label="Business Vertical"><select value={vert} onChange={e => setVert(e.target.value)} className={`${input} ${ok}`}>{defaults!.verticals!.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></L>
              )}
              {siteNote && <div className="text-[12px] text-gray-500 dark:text-gray-400 italic">“{siteNote}”</div>}
              {matches.companies.length > 0 && (
                <div className="space-y-1.5">
                  {matches.companies.map(m => <Choice key={m.id} id={m.id} on={companyChoice === m.id} onPick={setCompanyChoice} title={`Use ${m.name}`} sub={[m.client_code, m.hq_city, m.why].filter(Boolean).join(" · ")} />)}
                  <Choice id="new" on={companyChoice === "new"} onPick={setCompanyChoice} title="Create a new company" sub={company.name ? company.name : undefined} />
                </div>
              )}
              {companyChoice === "new" ? (<>
                <L label="Company Name" req><input value={company.name || ""} onChange={e => C("name", e.target.value)} className={`${input} ${bad === "cname" ? "border-red-500 ring-2 ring-red-500/30" : ok}`} placeholder="e.g. Osai eBiz Solutions Pvt Ltd" /></L>
                <div className="grid grid-cols-2 gap-2">
                  <L label="Website"><input value={company.website || ""} onChange={e => C("website", e.target.value)} autoCapitalize="off" className={`${input} ${ok}`} /></L>
                  <L label="Office Phone"><input type="tel" value={company.phone || ""} onChange={e => C("phone", e.target.value)} className={`${input} ${ok}`} /></L>
                  <L label="City"><input value={company.city || ""} onChange={e => C("city", e.target.value)} className={`${input} ${ok}`} /></L>
                  <L label="Sector"><select value={company.sector || ""} onChange={e => C("sector", e.target.value)} className={`${input} ${ok}`}><option value="">—</option>{sectors.map(s => <option key={s}>{s}</option>)}</select></L>
                </div>
                <L label="Address"><textarea value={company.address || ""} onChange={e => C("address", e.target.value)} rows={2} className={`${input} ${ok}`} /></L>
                <L label="CIN" hint="Optional — add it later from MCA if it isn't on the card"><input value={company.cin || ""} onChange={e => C("cin", e.target.value.toUpperCase())} maxLength={21} className={`${input} ${ok} font-mono`} /></L>
              </>) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">Website, address and phone from the card fill only the blanks on this company.</div>
              )}
            </section>
            </>) : (
              <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center font-bold flex-shrink-0">{(person.name || company.name || "?").trim().charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-bold text-gray-900 dark:text-white leading-tight">{person.name || <span className="text-gray-400 font-medium">No contact person</span>}</div>
                    {person.designation && <div className="text-sm text-gray-500 dark:text-gray-400">{person.designation}</div>}
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate">{companyChoice === "new" ? company.name : (matches.companies.find(c => c.id === companyChoice)?.name || company.name)}</span></div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {person.mobile && <div className="text-gray-700 dark:text-gray-200">📱 {person.mobile}</div>}
                  {person.email && <div className="text-gray-700 dark:text-gray-200 break-all">✉️ {person.email}</div>}
                  {!person.email && company.website && <div className="text-gray-700 dark:text-gray-200 break-all">🌐 {company.website}</div>}
                </div>
                <div className="text-[12px] rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
                  {personChoice !== "new" ? "Already in the CRM — the contact will be updated, not duplicated." : companyChoice !== "new" ? "Will be added to this existing company." : "A new company and contact will be created."}
                </div>
                <button type="button" onClick={() => setFull(true)} className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">Edit details</button>
              </section>
            )}
            {err && <div className="text-sm text-red-500 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}</div>}
          </>)}

          {step === "done" && result && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <div className="text-lg font-bold text-gray-900 dark:text-white">{person.name || result.company_name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {result.person_id ? <>{result.created_person ? "added" : "updated"} at <b>{result.company_name}</b>{result.created_company ? " — new company created" : ""}</> : result.created_company ? "New company / client created" : "Company updated"}
              </div>
              <div className="grid grid-cols-1 gap-2 pt-2">
                {result.person_id && <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("person:open", { detail: { id: result.person_id } })); }} className="py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold">Open contact</button>}
                <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("company:open", { detail: { id: result.company_id } })); }} className="py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200">Open company</button>
                <button onClick={() => { setStep(qr && !front && !via ? "qr" : "capture"); setFront(""); setBack(""); setResult(null); setQr(null); setVia(""); setLink(""); setSiteNote(""); setPerson({ name: "", role_type: "Management" }); setCompany({ name: "" }); setMatches({ companies: [], people: [] }); setCompanyChoice(defaults?.client_id || "new"); }} className="py-2 text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5"><Camera className="w-4 h-4" /> Scan another</button>
              </div>
            </div>
          )}
        </div>

        {(step === "review" || step === "saving") && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
            <button onClick={save} disabled={step === "saving"} className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {step === "saving" ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> {!person.name?.trim() ? (companyChoice === "new" ? "Create company" : "Update company") : companyChoice === "new" ? "Create company & contact" : personChoice !== "new" ? "Update contact" : "Add contact"}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
