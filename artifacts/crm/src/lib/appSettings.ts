import { useEffect, useState } from "react";

// App-wide options set by an admin (Admin → Pipeline Stages → Options). Loaded once per session; components re-render on change.
export type AppSettings = { show_probability: boolean };
let current: AppSettings = { show_probability: true };
let loaded: Promise<void> | null = null;

export function loadAppSettings(force = false) {
  if (!loaded || force) {
    loaded = fetch("/api/config/app-settings").then(r => r.ok ? r.json() : null).then(d => {
      if (d) { current = { ...current, ...d }; window.dispatchEvent(new CustomEvent("appsettings:change")); }
    }).catch(() => {});
  }
  return loaded;
}
export const getAppSettings = () => current;

export async function saveAppSettings(patch: Partial<AppSettings>) {
  const r = await fetch("/api/config/app-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Could not save");
  current = { ...current, ...(await r.json()) };
  window.dispatchEvent(new CustomEvent("appsettings:change"));
}

export function useAppSettings(): AppSettings {
  const [s, setS] = useState(current);
  useEffect(() => {
    const h = () => setS({ ...current });
    window.addEventListener("appsettings:change", h);
    loadAppSettings();
    return () => window.removeEventListener("appsettings:change", h);
  }, []);
  return s;
}
