import { useState } from "react";
import { Sparkles, Cpu, QrCode, Globe, Building2, TrendingUp, Landmark, MessageSquare, Bot, Mic, ShieldCheck, Smartphone, Plug, Users, ChevronDown } from "lucide-react";

// About NIYTRI CRM — what the app does today and what changed recently. Kept in the app so every user sees the same, current list.
import { APP_VERSION, APP_COMMIT, APP_BUILT, useServerVersion } from "../lib/version";
const BUILD = (() => { try { return APP_BUILT ? new Date(APP_BUILT) : null; } catch { return null; } })();

const RELEASES: { date: string; title: string; items: string[] }[] = [
  { date: "12 Nov 2026", title: "Capture anything, IB Phase 2, role limits", items: [
    "Scan Card, QR or Link — from the header, the (+) button on phones, Client Registry and Companies. One photo on a phone goes straight to a short summary to approve.",
    "Each draft shows how it was read: AI model (e.g. OpenAI gpt-4o / Claude), on-device OCR (no AI), QR code, website or pasted text — with how sure it is.",
    "QR codes: vCard, MeCard, BizCard, LinkedIn, website, e-mail and WhatsApp codes; a QR printed on the card is read from the same photo.",
    "Paste a website (company name, e-mail, phone, address and CIN are read from the site and its contact page), a LinkedIn link, an e-mail signature or just a company name.",
    "On-device OCR when no AI is set up or the AI can't be reached — nothing leaves the phone.",
    "Investment Banking → Investors: investor database with ticket size, sectors and deal types; suggested investors for each mandate; roadshow / NDR meetings with interest, indicative demand and coverage.",
    "Mandate milestones: checklists for IPO, QIP, Rights, OFS / Block, M&A, PE, Debt and Restructuring with due dates and progress.",
    "Compliance and Business Head are view-only; Junior RMs see only their own opportunities, deals and service requests.",
    "Admin switches for the Probability field and for AI transcription (off = audio kept, nothing sent to AI).",
  ] },
  { date: "29 Oct 2026", title: "UAT issue log closed", items: [
    "Global search (Ctrl+K) across clients, opportunities, deals and service requests.",
    "Convert to Deal carries everything across and links both records; a second conversion is refused.",
    "Opportunity shows the linked deal's value and flags when they differ.",
    "Duplicate PAN blocked, similar names confirmed, KYC Verified needs PAN plus mobile or e-mail.",
    "Role Mapping and User Roles save to the database; Create User has a password field.",
    "Meeting transcription can also use the LLM key (OpenAI / Azure OpenAI / Gemini) after Azure Speech and Groq.",
  ] },
  { date: "22 Oct 2026", title: "Amounts, access and sign-in", items: [
    "₹ · L · M · Cr switch applied to every amount, chart and AI answer.",
    "Each user sees only their own business verticals; Administration only for admins.",
    "Login remembers the e-mail, works with password managers, show / hide password; Ctrl+Shift+L switches light / dark.",
  ] },
  { date: "16 Oct 2026", title: "Phone app experience", items: [
    "Bottom tab bar that hides while scrolling, quick actions, every list as cards, full-screen detail.",
    "Sign-out only after 30 minutes without activity.",
  ] },
  { date: "13–14 Oct 2026", title: "IB / ECM and NIYTRI AI", items: [
    "Companies & Promoters master with Company 360, ECM pipeline, stage workflow with mandatory / skippable stages, drag & drop boards.",
    "NIYTRI AI chat with saved conversations, charts, tables and analysis — limited to the user's own data.",
    "One-tap meeting recorder with speakers, summary and action items; Teams transcripts fetched automatically.",
  ] },
];

const AREAS: { icon: any; title: string; points: string[] }[] = [
  { icon: Users, title: "Clients & KYC", points: ["Client Registry with KYC, PAN, banking & demat, contacts", "Client 360 with SRs, deals, opportunities and documents", "Masked personal data with access requests"] },
  { icon: TrendingUp, title: "Opportunities & Deals", points: ["Pipelines per vertical with stage rules", "Next action, probability, expected fee, lost reasons", "Convert to deal with full link back"] },
  { icon: Landmark, title: "Investment Banking", points: ["Companies & Promoters, Company 360", "Mandate milestones and roadshows", "Investor database and matching"] },
  { icon: MessageSquare, title: "Service Requests", points: ["SLA timers and escalation levels", "Conversation, documents and activity trail", "Export to CSV"] },
  { icon: Bot, title: "NIYTRI AI", points: ["Ask about pipeline, clients, SRs, tasks", "Charts, tables and analysis", "Works only on data you are allowed to see"] },
  { icon: Mic, title: "Meetings", points: ["Record in-person meetings with consent", "Speakers, summary and tasks", "Teams transcripts after the meeting"] },
  { icon: QrCode, title: "Capture", points: ["Business card photo (AI or on-device OCR)", "QR codes and LinkedIn links", "Websites, e-mail signatures, company names"] },
  { icon: ShieldCheck, title: "Security & Access", points: ["Microsoft 365 or app sign-in with OTP", "Vertical-based access, read-only roles, own-records roles", "Audit log of every change"] },
  { icon: Smartphone, title: "Phone", points: ["Bottom tabs, quick actions, card lists", "One-tap scan and record", "Works in any phone browser"] },
  { icon: Plug, title: "Integrations", points: ["Microsoft 365 mail, calendar and Teams", "OpenAI / Azure OpenAI / Claude / Gemini", "Azure Speech, Groq, Fireflies"] },
];

export default function AboutPage({ t }: { t: any; isDark?: boolean }) {
  const [openRel, setOpenRel] = useState(0);
  const server = useServerVersion();
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center text-2xl font-black">N</div>
          <div className="flex-1 min-w-0">
            <div className={`text-xl font-bold ${t.text}`}>NIYTRI Enterprise CRM</div>
            <div className={`text-sm ${t.textMuted}`}>One CRM for Retail Broking, Corporate Broking, Investment Banking, AIF and Institutional Equities.</div>
            <div className={`text-xs ${t.textMuted} mt-1`}>Version <b className={t.text}>{APP_VERSION}</b>{APP_COMMIT ? ` · commit ${APP_COMMIT}` : ""}{BUILD && !isNaN(BUILD.getTime()) ? ` · deployed ${BUILD.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}</div>
            {server && <div className={`text-xs ${t.textMuted}`}>Server {server.version}{server.version === APP_VERSION ? " — up to date" : " — reload the page to update"}</div>}
          </div>
        </div>

        {/* How capture reads things — AI vs on-device */}
        <div className={`rounded-2xl border ${t.border} p-4`}>
          <div className={`text-sm font-semibold ${t.text} mb-3`}>How Scan Card, QR or Link reads the details</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px]">
            {[
              [Sparkles, "AI model", "Card photos are read by the AI model set in LLM Settings (with the backup model if it fails). The review screen names the model.", "text-violet-500"],
              [Cpu, "On-device OCR", "If no AI is set up or it can't be reached, the phone reads the text itself. No data leaves the device.", "text-amber-500"],
              [QrCode, "QR code", "Contact QR codes are read exactly — no AI. A QR on the card overrides the AI's e-mail, phone and links.", "text-sky-500"],
              [Globe, "Website / text", "A pasted website is read by the CRM server; a signature or name is read on the device.", "text-emerald-500"],
            ].map(([Icon, title, text, tone]: any) => (
              <div key={title} className={`rounded-xl ${t.bgCard2} p-3`}>
                <div className={`flex items-center gap-2 font-semibold ${t.text}`}><Icon className={`w-4 h-4 ${tone}`} /> {title}</div>
                <div className={`mt-1 ${t.textMuted}`}>{text}</div>
              </div>
            ))}
          </div>
          <div className={`text-xs ${t.textMuted} mt-3`}>Nothing is saved until you approve the draft. Existing contacts and companies are matched so they are updated, not duplicated.</div>
        </div>

        <div>
          <div className={`text-sm font-semibold ${t.text} mb-2`}>What's New</div>
          <div className="space-y-2">
            {RELEASES.map((r, i) => (
              <div key={r.date} className={`rounded-xl border ${t.border} overflow-hidden`}>
                <button onClick={() => setOpenRel(openRel === i ? -1 : i)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${i === 0 ? "bg-blue-600 text-white" : `${t.bgCard2} ${t.textMuted}`}`}>{r.date}</span>
                  <span className={`flex-1 text-sm font-medium ${t.text}`}>{r.title}</span>
                  <ChevronDown className={`w-4 h-4 ${t.textMuted} transition-transform ${openRel === i ? "rotate-180" : ""}`} />
                </button>
                {openRel === i && (
                  <ul className={`px-5 pb-4 space-y-1.5 text-[13px] ${t.textMuted} list-disc list-outside ml-4`}>
                    {r.items.map(x => <li key={x}>{x}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={`text-sm font-semibold ${t.text} mb-2`}>Features</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AREAS.map(a => (
              <div key={a.title} className={`rounded-xl border ${t.border} p-4`}>
                <div className={`flex items-center gap-2 text-sm font-semibold ${t.text}`}><a.icon className="w-4 h-4 text-blue-500" /> {a.title}</div>
                <ul className={`mt-2 space-y-1 text-[13px] ${t.textMuted}`}>{a.points.map(p => <li key={p}>• {p}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
        <div className={`text-xs ${t.textMuted} flex items-center gap-1.5 pb-4`}><Building2 className="w-3.5 h-3.5" /> NIYTRI Technologies Private Limited</div>
      </div>
    </div>
  );
}
