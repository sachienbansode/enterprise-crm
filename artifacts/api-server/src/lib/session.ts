import { createHash, randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { query } from "./db";

// ─── Server-side sessions ─────────────────────────────────────────────────────
// • Opaque random token (returned to the browser once); only its SHA-256 is stored.
// • Stored in PostgreSQL (user_sessions) → survives app restarts / redeploys.
// • Idle timeout: SESSION_IDLE_MINUTES (default 30) since the last API call.
// • Absolute limit: m365_config.session_hours (default 8).

export const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 30);
const TOUCH_EVERY_MS = 60_000; // don't write last_seen on every request

export interface SessionUser { id: string; name: string; email: string; role: string; vertical: string; auth_type?: string; sessionId: string }
declare global { namespace Express { interface Request { user?: SessionUser } } }

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function ensureSessionSchema() {
  await query("ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now()");
  await query("CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token)");
}

export async function createSession(userId: string, authMethod: "app" | "m365", req: Request): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const cfg = await query("SELECT session_hours FROM m365_config LIMIT 1").catch(() => ({ rows: [] as any[] }));
  const hours = Number(cfg.rows[0]?.session_hours) || 8;
  await query(
    `INSERT INTO user_sessions (user_id, token, ip_address, user_agent, auth_method, expires_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' hours')::interval, NOW())`,
    [userId, hash(token), (req.headers["x-real-ip"] as string) || req.ip || null, String(req.headers["user-agent"] || "").slice(0, 500), authMethod, String(hours)],
  );
  return token;
}

export async function endSession(token: string) {
  await query("UPDATE user_sessions SET is_active=FALSE WHERE token=$1", [hash(token)]);
}

function bearer(req: Request): string {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

// Paths under /api that work without a session (login flow + health checks)
const PUBLIC = [
  /^\/healthz?$/, /^\/auth\/login$/, /^\/auth\/verify-otp$/, /^\/auth\/resend-otp$/, /^\/auth\/dev-otp$/,
  /^\/auth\/m365\//, /^\/auth\/logout$/,
];

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS" || PUBLIC.some(r => r.test(req.path))) return next();
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Not signed in", code: "NO_SESSION" });
  try {
    const r = await query(
      `SELECT s.id AS session_id, s.last_seen_at, s.expires_at,
              u.id, u.name, u.email, u.role, u.vertical, u.auth_type, u.status
         FROM user_sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = $1 AND s.is_active`,
      [hash(token)],
    );
    const s = r.rows[0];
    const now = Date.now();
    if (!s || s.status !== "Active") return res.status(401).json({ error: "Session not valid", code: "SESSION_INVALID" });
    if (new Date(s.expires_at).getTime() < now || now - new Date(s.last_seen_at).getTime() > IDLE_MINUTES * 60_000) {
      await query("UPDATE user_sessions SET is_active=FALSE WHERE id=$1", [s.session_id]);
      return res.status(401).json({ error: "Session expired — please sign in again", code: "SESSION_EXPIRED" });
    }
    // Only real user activity extends the session — background polls send X-Idle-Ms (ms since last click/keypress)
    const idleMs = Number(req.headers["x-idle-ms"]);
    const userActive = !Number.isFinite(idleMs) || idleMs < TOUCH_EVERY_MS;
    if (userActive && now - new Date(s.last_seen_at).getTime() > TOUCH_EVERY_MS) {
      query("UPDATE user_sessions SET last_seen_at=NOW() WHERE id=$1", [s.session_id]).catch(() => {});
    }
    req.user = { id: s.id, name: s.name, email: s.email, role: s.role, vertical: s.vertical, auth_type: s.auth_type, sessionId: s.session_id };
    // Audit integrity: "who did it" fields always come from the session, not from the browser
    if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      for (const k of ["updated_by", "created_by", "deleted_by", "uploaded_by", "assigned_by", "reviewed_by_name", "userName", "user_name"]) {
        if (k in req.body) req.body[k] = s.name;
      }
    }
    return next();
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export const isSuperAdmin = (u?: SessionUser) => (u?.role || "").toLowerCase() === "super admin";
export const isAdmin = (u?: SessionUser) => /admin/i.test(u?.role || "");

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (isSuperAdmin(req.user)) return next();
  return res.status(403).json({ error: "Super Admin only" });
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (isAdmin(req.user)) return next();
  return res.status(403).json({ error: "Administrator access required" });
}
