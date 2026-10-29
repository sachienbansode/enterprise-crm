import { useEffect, useState } from "react";

// ─── One money formatter for the whole app ───────────────────────────────────
// The header switch (₹ · L · M · Cr) sets the display unit for every amount, chart axis and tooltip.
// Amounts are always rupees underneath; strings like "₹48.2Cr", "₹5.5 L", "12M", "4,800" are parsed first.

export type CurrUnit = "rupee" | "lakh" | "million" | "crore";
const KEY = "niytri_curr_unit";
let unit: CurrUnit = (() => { try { const u = localStorage.getItem(KEY); return (["rupee", "lakh", "million", "crore"] as const).includes(u as any) ? (u as CurrUnit) : "crore"; } catch { return "crore"; } })();

export const getUnit = () => unit;
export function setUnit(u: CurrUnit) {
  if (u === unit) return;
  unit = u;
  try { localStorage.setItem(KEY, u); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent("currunit:change", { detail: u }));
}
/** Re-render a component when the unit changes. */
export function useCurrUnit(): CurrUnit {
  const [u, setU] = useState(unit);
  useEffect(() => { const h = () => setU(unit); window.addEventListener("currunit:change", h); return () => window.removeEventListener("currunit:change", h); }, []);
  return u;
}

const MULT: Record<CurrUnit, number> = { rupee: 1, lakh: 1e5, million: 1e6, crore: 1e7 };
const SUFFIX: Record<CurrUnit, string> = { rupee: "", lakh: " L", million: " M", crore: " Cr" };
// Indian grouping (1,23,456) for ₹ / L / Cr; international (123,456) for millions
const grp = (v: number, maxFrac: number, u?: CurrUnit) => v.toLocaleString(u === "million" ? "en-US" : "en-IN", { maximumFractionDigits: maxFrac, minimumFractionDigits: 0 });
const frac = (v: number) => (v >= 1000 ? 0 : v >= 100 ? 1 : 2);

/** "₹48.2Cr" / "₹5.5 L" / "12 M" / "₹12,45,000" / 1245000 → rupees. Non-money text → NaN. */
export function parseINR(s: string | number | null | undefined): number {
  if (s === null || s === undefined || s === "") return NaN;
  if (typeof s === "number") return s;
  const str = String(s).replace(/,/g, "").trim();
  const m = str.match(/^[+-]?\s*₹?\s*(-?[\d.]+)\s*(cr|crore|crores|l|lakh|lakhs|lac|lacs|m|mn|million|k)?\b/i);
  if (!m) return NaN;
  const n = parseFloat(m[1]); if (!isFinite(n)) return NaN;
  const u = (m[2] || "").toLowerCase();
  const mult = u.startsWith("cr") ? 1e7 : u.startsWith("l") ? 1e5 : u.startsWith("m") ? 1e6 : u === "k" ? 1e3 : 1;
  return (str.trim().startsWith("-") ? -1 : 1) * Math.abs(n) * mult;
}

/** Rupees → text in the chosen unit: ₹1,23,45,678 · ₹123.5 L · ₹12.35 M · ₹1.23 Cr */
export function fmtINR(amount: number | string | null | undefined, u: CurrUnit = unit): string {
  if (!(u in MULT)) u = unit; // used as a chart callback, the 2nd argument is an index — ignore it
  const n = typeof amount === "string" ? parseINR(amount) : amount;
  if (n === null || n === undefined || !isFinite(n as number)) return "—";
  const sign = (n as number) < 0 ? "-" : "";
  const abs = Math.abs(n as number);
  if (abs === 0) return "₹0";
  if (u === "rupee") return `${sign}₹${grp(abs, 0)}`;
  const v = abs / MULT[u];
  if (v < 0.01) { // too small for the unit — show the next unit down so it never reads ₹0
    if (u === "crore" && abs >= 1e5) return `${sign}₹${grp(abs / 1e5, frac(abs / 1e5))} L`;
    return `${sign}₹${grp(abs, 0)}`;
  }
  return `${sign}₹${grp(v, frac(v), u)}${SUFFIX[u]}`;
}

/** Re-format a stored money string in the chosen unit; anything that isn't an amount is returned as is.
 *  Keeps trailing notes: "₹15Cr Cat III" → "₹1,500 M Cat III". */
export function fmtINRStr(s: string | number | null | undefined): string {
  if (s === null || s === undefined || s === "") return "—";
  if (typeof s === "number") return fmtINR(s);
  const str = String(s).trim();
  const m = str.match(/^([+-]?\s*₹?\s*[\d,]*\.?\d+\s*(?:crores?|cr|lakhs?|lacs?|l|mn|million|m|k)?\b)(.*)$/i);
  if (!m) return str;
  const head = m[1];
  if (!/₹/.test(head) && !/^[+-]?\s*[\d,.]+\s*(cr|crores?|l|lakhs?|lacs?|m|mn|million)?$/i.test(head.trim())) return str;
  const n = parseINR(head);
  if (!isFinite(n)) return str;
  const pct = str.match(/\(([\d.]+%)\)/);
  const rest = m[2].replace(/\(([\d.]+%)\)/, "").trim();
  return `${str.startsWith("+") ? "+" : ""}${fmtINR(n)}${rest ? " " + rest : ""}${pct ? ` (${pct[1]})` : ""}`;
}

/** Short chart-axis label in the chosen unit (no decimals on big values). */
export function fmtAxisINR(n: number, u: CurrUnit = unit): string {
  if (!(u in MULT)) u = unit; // recharts calls tickFormatter(value, index)
  n = Number(n);
  if (!isFinite(n)) return "";
  if (n === 0) return "₹0";
  const v = Math.abs(n) / MULT[u];
  const s = n < 0 ? "-" : "";
  return `${s}₹${v.toLocaleString(u === "million" ? "en-US" : "en-IN", { maximumFractionDigits: v >= 10 ? 0 : 1 })}${SUFFIX[u]}`;
}

export const UNIT_SHORT: Record<CurrUnit, string> = { rupee: "₹", lakh: "L", million: "M", crore: "Cr" };
