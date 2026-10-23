import { AsyncLocalStorage } from "async_hooks";
import { query } from "./db";

// ─── Per-user vertical access ─────────────────────────────────────────────────
// users.vertical = "All" (everything) or one or more verticals ("Investment Banking" / "ib", comma-separated).
// The signed-in user is kept for the duration of each request, so every list, dashboard, export and AI
// query below is limited to the user's verticals without each route having to pass the user around.
export const requestUser = new AsyncLocalStorage<{ role?: string; vertical?: string } | undefined>();
export function userVerticalIds(u?: { role?: string; vertical?: string }): string[] | null {
  if (!u) return null;                                            // background jobs: no limit
  if (/super admin/i.test(u.role || "")) return null;
  const raw = String(u.vertical || "").trim();
  if (!raw || /^(all|assigned)$/i.test(raw)) return null;
  const ids = raw.split(/[,;|]/).map(x => x.trim().toLowerCase()).map(x => VERTICALS.find(v => v.id === x || v.name.toLowerCase() === x)?.id).filter(Boolean) as string[];
  return ids.length ? ids : null;
}

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
  const mine = userVerticalIds(requestUser.getStore());
  return VERTICALS.map(x => x.id).filter(id => v.active.has(id) && (!module || !(v.hidden[id] || []).includes(module)) && (!mine || mine.includes(id)));
}
/** Same, as the full names stored on leads / deals / service requests ("Retail Broking", …). */
export async function visibleNames(module?: Module): Promise<string[]> {
  const ids = await visibleIds(module);
  return VERTICALS.filter(x => ids.includes(x.id)).map(x => x.name);
}
