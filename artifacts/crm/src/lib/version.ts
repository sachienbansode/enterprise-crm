import { useEffect, useState } from "react";

// Version of this page build (set at build time by vite.config.ts from scripts/app-version.mjs).
declare const __APP_VERSION__: string, __APP_COMMIT__: string, __BUILD_TIME__: string;
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
export const APP_COMMIT = typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "";
export const APP_BUILT = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";
export const versionLabel = () => `v${APP_VERSION}${APP_COMMIT ? ` · ${APP_COMMIT}` : ""}`;

/** Version of the running server; checked on load, every 3 minutes and when the tab comes back. */
export function useServerVersion() {
  const [server, setServer] = useState<{ version: string; commit?: string; built?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => fetch("/api/healthz", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => { if (alive && d?.version) setServer(d); }).catch(() => {});
    check();
    const t = setInterval(check, 3 * 60_000);
    const v = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", v);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, []);
  return server;
}
