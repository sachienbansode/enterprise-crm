// Vertical ids the signed-in user may work in (null = all, Super Admin). Mirrors lib/visibility.ts on the server:
// "All" means every vertical except AMC, which is a separate entity seen only by users assigned to it.
const NAMES: Record<string, string> = { "retail broking": "retail", "corporate broking": "corporate", "investment banking": "ib", aif: "aif", "institutional equities": "ie", amc: "amc" };
export function myVerticalIds(u?: any): string[] | null {
  try { u = u || JSON.parse(localStorage.getItem("niytri_user") || "{}"); } catch { u = {}; }
  if (/super admin/i.test(u?.role || "")) return null;
  const raw = String(u?.vertical || "").trim();
  if (!raw || /^(all|assigned)$/i.test(raw)) return ["retail", "corporate", "ib", "aif", "ie"];
  const ids = raw.split(/[,;|]/).map(x => x.trim().toLowerCase()).map(x => NAMES[x] || (Object.values(NAMES).includes(x) ? x : "")).filter(Boolean);
  return ids.length ? ids : ["retail", "corporate", "ib", "aif", "ie"];
}
