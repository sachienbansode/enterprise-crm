import { query } from "./db";

// ─── Vertical / module visibility (Admin → Verticals Config) ──────────────────
// A hidden vertical disappears everywhere: menus, dashboards, analytics, lists, exports and AI.
// A hidden module (e.g. "deals" for Retail Broking) removes just that page and its data.
// Enforced on the server so hidden data can't be reached by URL or API either.

export const VERTICALS = [
  { id: "retail", name: "Retail Broking" },
  { id: "corporate", name: "Corporate Broking" },
  { id: "ib", name: "Investment Banking" },
  { id: "aif", name: "AIF" },
  { id: "ie", name: "Institutional Equities" },
];
export const MODULES = ["dashboard", "leads", "deals", "customers", "documents"] as const;
export type Module = typeof MODULES[number];

type Vis = { active: Set<string>; hidden: Record<string, string[]> };
let cache: { at: number; v: Vis } | null = null;

export function invalidateVisibility() { cache = null; }

async function load(): Promise<Vis> {
  if (cache && Date.now() - cache.at < 15_000) return cache.v;
  const r = await query("SELECT vertical_id, is_active, COALESCE(hidden_modules, '{}') AS hidden_modules FROM verticals_config")
    .catch(() => ({ rows: [] as any[] }));
  const active = new Set<string>(VERTICALS.map(v => v.id));
  const hidden: Record<string, string[]> = {};
  for (const row of r.rows) {
    const id = String(row.vertical_id).toLowerCase();
    if (row.is_active === false) active.delete(id);
    hidden[id] = row.hidden_modules || [];
  }
  const v = { active, hidden };
  cache = { at: Date.now(), v };
  return v;
}

/** Vertical ids (retail, ib, …) that are active and — if a module is given — have that module visible. */
export async function visibleIds(module?: Module): Promise<string[]> {
  const v = await load();
  return VERTICALS.map(x => x.id).filter(id => v.active.has(id) && (!module || !(v.hidden[id] || []).includes(module)));
}
/** Same, as the full names stored on leads / deals / service requests ("Retail Broking", …). */
export async function visibleNames(module?: Module): Promise<string[]> {
  const ids = await visibleIds(module);
  return VERTICALS.filter(x => ids.includes(x.id)).map(x => x.name);
}
