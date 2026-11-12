// On-device business-card reading — used when no AI model is set up, or the AI call fails.
// Tesseract (served by this app from /ocr/, no CDN) reads the text in the browser; simple rules turn it into fields.

export type OcrFields = {
  person: { name?: string; designation?: string; mobile?: string; landline?: string; email?: string; linkedin?: string };
  company: { name?: string; website?: string; phone?: string; email?: string; address?: string; city?: string; cin?: string; gstin?: string };
  text: string;
  confidence: number; // 0–1
};

let workerP: Promise<any> | null = null;
async function getWorker(onProgress?: (p: number) => void) {
  if (!workerP) {
    workerP = (async () => {
      const { createWorker } = await import("tesseract.js");
      const base = `${import.meta.env.BASE_URL || "/"}ocr/`;
      const w = await createWorker("eng", 1, {
        workerPath: `${base}worker.min.js`, corePath: base, langPath: base, gzip: true,
        logger: (m: any) => { if (m.status === "recognizing text") progressCb?.(m.progress); },
      });
      await w.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" } as any); // sparse text: cards are blocks of short lines
      return w;
    })().catch(e => { workerP = null; throw e; });
  }
  progressCb = onProgress;
  return workerP;
}
let progressCb: ((p: number) => void) | undefined;

// Grey, contrast-stretched, at least 1600 px wide — Tesseract reads small card text much better this way
async function prepare(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const scale = Math.max(1, 1600 / img.naturalWidth);
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
  let lo = 255, hi = 0;
  for (let i = 0; i < px.length; i += 4) { const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000; px[i] = g; if (g < lo) lo = g; if (g > hi) hi = g; }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) { const g = ((px[i] - lo) * 255) / span; px[i] = px[i + 1] = px[i + 2] = g; }
  ctx.putImageData(d, 0, 0);
  return c;
}

export async function ocrCard(images: string[], onProgress?: (p: number) => void): Promise<OcrFields> {
  const w = await getWorker(onProgress);
  let text = "", conf = 0, n = 0;
  for (const im of images.filter(Boolean)) {
    const r = await w.recognize(await prepare(im));
    text += (text ? "\n" : "") + (r.data.text || "");
    conf += (r.data.confidence || 0) / 100; n++;
  }
  return { ...parseCardText(text), text, confidence: n ? conf / n : 0 };
}

// ── Text → fields ────────────────────────────────────────────────────────────
const CITIES = ["Navi Mumbai", "New Delhi", "Mumbai", "Delhi", "Bengaluru", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Gurugram", "Gurgaon",
  "Noida", "Thane", "Jaipur", "Surat", "Kochi", "Chandigarh", "Indore", "Lucknow", "Vadodara", "Nagpur", "Coimbatore", "Bhubaneswar", "Goa", "Singapore", "Dubai", "London"];
const DESIG = /\b(director|manager|ceo|cfo|coo|cto|cio|cmo|chief|head|president|vice|vp|partner|founder|co-founder|officer|analyst|associate|executive|chairman|chairperson|secretary|consultant|lead|engineer|advisor|adviser|specialist|controller|treasurer|trustee|principal|proprietor|owner|md|avp|dgm|gm|agm|sales|relationship)\b/i;
const CO = /\b(ltd|limited|pvt|private|llp|inc|corp|corporation|company|co\.|group|industries|bank|capital|securities|finance|financial|holdings|technologies|technology|solutions|enterprises|ventures|partners|advisors|advisory|consultants|infra|infrastructure|pharma|logistics|motors|foods|realty|insurance|asset|investments|wealth|broking|services|systems|labs)\b/i;
const ADDR = /\b(road|rd\.?|street|st\.|floor|flr|nagar|marg|building|bldg|tower|complex|sector|plot|near|opp\.?|lane|park|chambers|house|bhavan|estate|centre|center|phase|block|wing|suite|unit|no\.|highway|cross|main|layout|colony|plaza|mall|bkc|andheri|nariman|lower parel|powai|worli|whitefield)\b/i;
const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|rediffmail|proton|protonmail|zoho)\./i;

const fixOcr = (s: string) => s.replace(/[|]/g, "I").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const tc = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(Ltd|Pvt|Llp)\b/g, m => m === "Llp" ? "LLP" : m);

export function parseCardText(raw: string): Omit<OcrFields, "text" | "confidence"> {
  const person: OcrFields["person"] = {}, company: OcrFields["company"] = {};
  let lines = raw.split(/\n+/).map(fixOcr).filter(l => l.length >= 2 && /[a-z0-9]/i.test(l));
  // An e-mail split over two lines ("Email: priya.s" / "hah@lotusinfra.com") is joined back
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/@/.test(lines[i]) && /^[\w.+-]*@[\w-]+\./.test(lines[i + 1]) && /(e-?mail|^[\w.+-]+)\s*[:.-]?\s*[\w.+-]+$/i.test(lines[i]) && !/\s{2,}/.test(lines[i])) {
      const head = lines[i].match(/[\w.+-]+$/)![0]; if (/^(e-?mail)$/i.test(head)) continue;
      lines[i] = lines[i].slice(0, lines[i].length - head.length) + head + lines[i + 1]; lines.splice(i + 1, 1);
    }
  }
  const used = new Set<number>();
  const all = lines.join("\n");

  // e-mail
  const emails = all.match(/[a-z0-9._%+-]+\s?@\s?[a-z0-9-]+(\.[a-z0-9-]+)+/gi)?.map(e => e.replace(/\s/g, "").toLowerCase()) || [];
  if (emails[0]) person.email = emails[0];
  if (emails[1]) company.email = emails[1];
  // LinkedIn / website
  const li = all.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w-]+/i)?.[0];
  if (li) person.linkedin = /^https?:/i.test(li) ? li : `https://${li}`;
  const web = all.split(/\s+/).find(t => /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|in|co\.in|net|org|io|co|biz|ai|tech|global|asia|uk|sg|ae)(\/\S*)?$/i.test(t) && !t.includes("@") && !/linkedin/i.test(t));
  if (web) company.website = /^https?:/i.test(web) ? web : `https://${web.replace(/^www\./i, "www.")}`;
  else if (person.email && !FREE_MAIL.test(person.email.split("@")[1])) company.website = `https://www.${person.email.split("@")[1]}`;
  // IDs
  const cin = all.toUpperCase().replace(/\s/g, "").match(/[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/)?.[0]; if (cin) company.cin = cin;
  const gst = all.toUpperCase().replace(/\s/g, "").match(/\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/)?.[0]; if (gst) company.gstin = gst;

  // phones, with their labels (M / Mob / Cell → mobile; T / Tel / Ph / Off / Board → landline; Fax ignored)
  lines.forEach((l, i) => {
    const re = /((?:mob(?:ile)?|cell|m|tel|t|ph(?:one)?|p|off(?:ice)?|o|board|b|direct|d|fax|f)\s*[.:]?\s*)?(\+?\d[\d\s().-]{8,}\d)/gi;
    let m: RegExpExecArray | null, hit = false;
    while ((m = re.exec(l))) {
      const label = (m[1] || "").toLowerCase(), num = m[2].replace(/[^\d+]/g, "");
      const d = num.replace(/^\+?91/, "").replace(/^0/, "");
      if (d.length < 8 || /^\d{6}$/.test(d)) continue;
      hit = true;
      if (/^f/.test(label)) continue;
      const pretty = m[2].trim();
      const mobileLike = /^[6-9]\d{9}$/.test(d);
      if (/^(mob|cell|m)/.test(label) || (!label && mobileLike)) { if (!person.mobile) person.mobile = pretty; else if (!person.landline) person.landline = pretty; }
      else if (!person.landline) person.landline = pretty; else if (!company.phone) company.phone = pretty;
    }
    if (hit && l.replace(/[\d\s()+.:/-]|mob(ile)?|tel|ph(one)?|off(ice)?|fax|cell|board|direct|[mtpofbd]\b/gi, "").length < 3) used.add(i);
  });
  lines.forEach((l, i) => { if (/@|www\.|linkedin|https?:/i.test(l) && l.split(" ").length <= 4) used.add(i); });

  // address: lines with a PIN code or address words (and the line before a PIN line)
  const addrIdx: number[] = [];
  lines.forEach((l, i) => { if (!used.has(i) && (/\b\d{3}\s?\d{3}\b/.test(l) || ADDR.test(l)) && !DESIG.test(l)) addrIdx.push(i); });
  if (addrIdx.length) {
    company.address = addrIdx.map(i => lines[i].replace(/[,\s]+$/, "")).join(", ").replace(/\s*,\s*,/g, ",");
    addrIdx.forEach(i => used.add(i));
    const city = CITIES.find(c => new RegExp(`\\b${c}\\b`, "i").test(company.address!));
    if (city) company.city = city === "Bangalore" ? "Bengaluru" : city === "Gurgaon" ? "Gurugram" : city;
  }

  // company: a line with Ltd / Pvt / LLP / Bank / Capital …
  const coIdx = lines.findIndex((l, i) => !used.has(i) && CO.test(l) && !DESIG.test(l.replace(CO, "")) && !/@/.test(l));
  if (coIdx >= 0) { const nm = lines[coIdx].replace(/[^\w&.,()' -]/g, "").trim(); company.name = /^[^a-z]+$/.test(nm) ? tc(nm) : nm; used.add(coIdx); }

  // designation, and the name just above it
  const dIdx = lines.findIndex((l, i) => !used.has(i) && DESIG.test(l) && l.split(" ").length <= 8 && !/\d{4,}/.test(l));
  const looksName = (l: string) => /^[A-Za-z][A-Za-z.' -]{2,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 5 && !CO.test(l) && !DESIG.test(l) && !ADDR.test(l);
  if (dIdx >= 0) { person.designation = lines[dIdx].replace(/^[^A-Za-z]+/, ""); used.add(dIdx); }
  let nIdx = -1;
  if (dIdx > 0 && looksName(lines[dIdx - 1]) && !used.has(dIdx - 1)) nIdx = dIdx - 1;
  else if (dIdx >= 0 && dIdx + 1 < lines.length && looksName(lines[dIdx + 1]) && !used.has(dIdx + 1)) nIdx = dIdx + 1;
  if (nIdx < 0) nIdx = lines.findIndex((l, i) => !used.has(i) && looksName(l));
  if (nIdx >= 0) {
    person.name = /^[A-Z .']+$/.test(lines[nIdx]) ? tc(lines[nIdx]) : lines[nIdx];
    used.add(nIdx);
  }
  // Company from the e-mail domain if the card text didn't give one
  if (!company.name && person.email) {
    const dom = person.email.split("@")[1];
    if (dom && !FREE_MAIL.test(dom)) company.name = tc(dom.split(".")[0].replace(/[-_]/g, " "));
  }
  for (const o of [person, company] as any[]) for (const k of Object.keys(o)) if (!o[k]) delete o[k];
  return { person, company };
}
