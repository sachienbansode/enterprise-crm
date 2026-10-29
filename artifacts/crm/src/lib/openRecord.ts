import { useEffect, useRef } from "react";

// Open a record from anywhere (global search, links): go to its page, and that page selects it.
// The request is kept in sessionStorage so it survives the page switch; pages already open get an event.
export type RecordKind = "client" | "lead" | "deal" | "sr";
const V_ID: Record<string, string> = { "Retail Broking": "retail", "Corporate Broking": "corporate", "Investment Banking": "ib", "AIF": "aif", "Institutional Equities": "ie" };
const KEY = "niytri_open";

export function openRecord(kind: RecordKind, rec: { id: string; vertical?: string; verticals?: string[] | null; cin?: string | null; deal_code?: string }) {
  if (kind === "client" && rec.cin && (rec.verticals || []).includes("ib")) { // IB companies open in Company 360
    window.dispatchEvent(new CustomEvent("company:open", { detail: { id: rec.id } })); return;
  }
  const vid = V_ID[rec.vertical || ""] || "ib";
  const hash = kind === "client" ? "#/main/clients" : kind === "sr" ? "#/main/service" : kind === "lead" ? `#/${vid}/leads` : `#/${vid}/deals`;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, id: rec.id }));
    if (kind === "deal" && rec.deal_code) sessionStorage.setItem("niytri_open_deal", rec.deal_code);
  } catch { /* storage blocked */ }
  if (window.location.hash !== hash) window.location.hash = hash;
  else window.dispatchEvent(new CustomEvent("record:open", { detail: { kind, id: rec.id } }));
}

/** On a list page: select the record that was asked for (on arrival, or while the page is open). */
export function useOpenRequest(kind: RecordKind, onOpen: (id: string) => void) {
  const cb = useRef(onOpen); cb.current = onOpen;
  useEffect(() => {
    const take = () => {
      try {
        const raw = sessionStorage.getItem(KEY); if (!raw) return;
        const r = JSON.parse(raw); if (r.kind !== kind) return;
        sessionStorage.removeItem(KEY); cb.current(r.id);
      } catch { /* ignore */ }
    };
    take();
    const h = () => take();
    window.addEventListener("record:open", h);
    return () => window.removeEventListener("record:open", h);
  }, [kind]);
}
