// Adds the session token to every /api call and handles expired sessions centrally,
// so the hundreds of fetch() calls across the app don't each need to know about auth.
//
// Idle timeout: the server ends a session after 30 min without *user* activity.
// Background polling (notifications, reminders) must not keep a session alive, so each
// request tells the server how long the user has been idle (X-Idle-Ms); the server only
// refreshes "last seen" when the user was recently active.

const IDLE_LIMIT_MS = 30 * 60_000;
let lastActivity = Date.now();
let redirecting = false;

function expire(message: string) {
  if (redirecting) return;
  redirecting = true;
  try { localStorage.removeItem("niytri_token"); localStorage.removeItem("niytri_user"); } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("m365_error", message); // login screen shows this banner
  window.location.replace(url.toString());
}

export function installAuthFetch() {
  ["mousedown", "keydown", "touchstart", "scroll", "wheel"].forEach(ev =>
    window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true }));

  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
    const token = (() => { try { return localStorage.getItem("niytri_token"); } catch { return null; } })();
    if (!isApi || !token) return orig(input, init);

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Idle-Ms", String(Date.now() - lastActivity));
    const res = await orig(input, { ...init, headers });
    if (res.status === 401) {
      const body = await res.clone().json().catch(() => ({} as any));
      if (["SESSION_EXPIRED", "SESSION_INVALID", "NO_SESSION"].includes(body.code)) {
        expire(body.code === "SESSION_EXPIRED" ? "Your session expired after 30 minutes of inactivity — please sign in again." : "Please sign in again.");
      }
    }
    return res;
  };

  // Local idle check too, so an idle screen locks itself even if nothing calls the API
  setInterval(() => {
    let token: string | null = null;
    try { token = localStorage.getItem("niytri_token"); } catch { /* ignore */ }
    if (token && Date.now() - lastActivity > IDLE_LIMIT_MS) {
      orig("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      expire("Your session expired after 30 minutes of inactivity — please sign in again.");
    }
  }, 30_000);
}

export async function serverLogout() {
  let token: string | null = null;
  try { token = localStorage.getItem("niytri_token"); } catch { /* ignore */ }
  if (token) await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
