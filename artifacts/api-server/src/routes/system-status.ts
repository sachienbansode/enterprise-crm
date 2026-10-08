import { Router } from "express";
import { existsSync } from "fs";
import { join } from "path";
import { query } from "../lib/db";
import { decrypt } from "../lib/crypto";

// GET /api/system-status — live health of auth, integrations and compliance controls.
// Every item is derived from real config / live checks; nothing is hard-coded "Connected".
const router = Router();

type Item = { label: string; value: string; status: "Connected" | "Active" | "Configured" | "Enforced" | "Not configured" | "Not integrated" | "Error" | "Disabled" | "Warning"; detail?: string };

let cache: { at: number; data: any } | null = null;
const CACHE_MS = 60_000;

async function graphCheck(tenantId: string, clientId: string, clientSecret: string) {
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
    });
    clearTimeout(tm);
    const d: any = await r.json();
    if (!d.access_token) return { ok: false, roles: [] as string[], error: (d.error_description || d.error || `HTTP ${r.status}`).split("\r\n")[0] };
    const payload = JSON.parse(Buffer.from(d.access_token.split(".")[1], "base64url").toString("utf8"));
    return { ok: true, roles: (payload.roles || []) as string[], error: "" };
  } catch (e: any) {
    return { ok: false, roles: [] as string[], error: e.name === "AbortError" ? "Timed out reaching Azure AD" : e.message };
  }
}

async function build(req: any) {
  const auth: Item[] = [], integrations: Item[] = [], compliance: Item[] = [], platform: Item[] = [];

  // ── Database ──
  const t0 = Date.now();
  try { await query("SELECT 1"); platform.push({ label: "PostgreSQL Database", value: `Responding in ${Date.now() - t0} ms`, status: "Connected" }); }
  catch (e: any) { platform.push({ label: "PostgreSQL Database", value: e.message, status: "Error" }); }

  // ── M365 / Azure AD ──
  const m = (await query("SELECT * FROM m365_config LIMIT 1").catch(() => ({ rows: [] as any[] }))).rows[0] || {};
  const tenantId = m.tenant_id || process.env.AZURE_TENANT_ID || "";
  const clientId = m.client_id || process.env.AZURE_CLIENT_ID || "";
  let secret = ""; if (m.client_secret) { try { secret = decrypt(m.client_secret); } catch { /* stale key */ } }
  if (!secret) secret = process.env.AZURE_CLIENT_SECRET || "";
  const m365Configured = !!(tenantId && clientId && secret);
  const g = m365Configured ? await graphCheck(tenantId, clientId, secret) : { ok: false, roles: [] as string[], error: "" };
  const has = (...perms: string[]) => perms.some(p => g.roles.includes(p));

  const ssoValue = m.allowed_domain ? `Azure AD — ${m.allowed_domain} domain` : "Azure AD";
  if (!m365Configured) auth.push({ label: "Microsoft 365 SSO", value: ssoValue, status: "Not configured", detail: "Tenant ID, Client ID or Client Secret missing" });
  else if (!g.ok) auth.push({ label: "Microsoft 365 SSO", value: ssoValue, status: "Error", detail: g.error });
  else auth.push({ label: "Microsoft 365 SSO", value: ssoValue, status: m.sso_enabled ? "Connected" : "Disabled", detail: m.sso_enabled ? undefined : "Credentials valid but SSO switched off" });

  const permItem = (label: string, value: string, perms: string[]): Item => {
    if (!m365Configured) return { label, value, status: "Not configured" };
    if (!g.ok) return { label, value, status: "Error", detail: g.error };
    return has(...perms) ? { label, value, status: "Connected", detail: `Graph permission: ${perms.filter(p => g.roles.includes(p)).join(", ")}` }
      : { label, value, status: "Warning", detail: `Missing Graph application permission: ${perms[0]} (grant admin consent in Entra)` };
  };
  auth.push(permItem("M365 Outlook Mail", `Send emails as ${m.sender_email || "(no sender set)"}`, ["Mail.Send"]));
  auth.push(permItem("M365 Calendar", "Read users' calendars for reminders & scheduling", ["Calendars.ReadWrite", "Calendars.Read"]));
  auth.push(permItem("M365 Teams Meetings", "Create Teams meetings from CRM", ["OnlineMeetings.ReadWrite.All", "Calendars.ReadWrite"]));

  // OTP email channel
  const smtpReady = !!(m.smtp_enabled && m.smtp_host && m.smtp_user && m.smtp_password);
  const graphMail = g.ok && has("Mail.Send") && !!m.sender_email;
  auth.push(smtpReady || graphMail
    ? { label: "Email OTP", value: smtpReady && (m.prefer_smtp || !graphMail) ? `SMTP via ${m.smtp_host}` : "Microsoft Graph (Mail.Send)", status: "Active" }
    : { label: "Email OTP", value: "No working email channel — OTPs only appear in server logs", status: "Not configured" });
  auth.push({ label: "Session Timeout", value: `${m.session_hours || 8} hour${(m.session_hours || 8) === 1 ? "" : "s"} max per session`, status: "Configured" });

  // ── AI ──
  let aiErr = "";
  const ai = (await query("SELECT * FROM ai_config LIMIT 1").catch((e: any) => { aiErr = e.message; return { rows: [] as any[] }; })).rows[0];
  if (aiErr) platform.push({ label: "NIYTRI AI Assistant", value: "Could not read AI settings", status: "Error", detail: aiErr });
  else if (!ai) platform.push({ label: "NIYTRI AI Assistant", value: "No AI configuration", status: "Not configured" });
  else platform.push({
    label: "NIYTRI AI Assistant",
    value: `${ai.provider} / ${ai.model}${ai.fallback_enabled && ai.fallback_api_key ? ` · fallback ${ai.fallback_provider} / ${ai.fallback_model}` : ""}`,
    status: !ai.enabled ? "Disabled" : ai.api_key ? "Active" : "Not configured",
    detail: ai.enabled && !ai.api_key ? "Enabled but no API key saved" : undefined,
  });

  // ── Storage ──
  const docs = (await query("SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE s3_bucket='local')::int local FROM documents").catch(() => ({ rows: [{ n: 0, local: 0 }] }))).rows[0];
  const uploadDir = join(process.cwd(), "uploads");
  integrations.push({ label: "Document Storage", value: `Server disk (${uploadDir}) · ${docs.n} documents`, status: existsSync(uploadDir) || docs.n === 0 ? "Active" : "Warning", detail: "Files are stored on the app server, not S3 — include this folder in backups" });
  for (const [label, value] of [["Bloomberg Terminal", "Market data feed"], ["AWS S3 Storage", "Document vault"], ["OMS / EMS", "Order management → CRM deal sync"], ["SEBI Reporting API", "Automated regulatory filings"]])
    integrations.push({ label, value, status: "Not integrated", detail: "No connector exists in the application yet" });

  // ── Data & compliance ──
  const al = (await query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int last24 FROM audit_logs").catch(() => ({ rows: [{ total: 0, last24: 0 }] }))).rows[0];
  compliance.push({ label: "Audit Log", value: `${al.total} entries · ${al.last24} in last 24h (stored in PostgreSQL)`, status: "Active" });
  const dv = (await query("SELECT COUNT(*)::int n FROM document_versions").catch(() => ({ rows: [{ n: 0 }] }))).rows[0];
  compliance.push({ label: "Document Versioning", value: `${dv.n} versions tracked in database`, status: "Active" });
  const keyOk = (process.env.ENCRYPTION_KEY || "").length === 64;
  compliance.push({ label: "Secrets Encryption", value: "AES-256-GCM for API keys & passwords in DB", status: keyOk ? "Enforced" : "Warning", detail: keyOk ? undefined : "ENCRYPTION_KEY env var not set — using fallback key file" });
  const https = req.secure || req.headers["x-forwarded-proto"] === "https";
  compliance.push({ label: "Encryption in Transit", value: https ? "HTTPS (TLS via nginx)" : "Plain HTTP", status: https ? "Enforced" : "Warning" });
  compliance.push({ label: "Data Retention Policy", value: "No automated retention / purge job", status: "Not configured" });

  return { checkedAt: new Date().toISOString(), sections: [
    { section: "Authentication & Microsoft 365", items: auth },
    { section: "Platform", items: platform },
    { section: "Integrations", items: integrations },
    { section: "Data & Compliance", items: compliance },
  ] };
}

router.get("/", async (req, res) => {
  try {
    if (!cache || Date.now() - cache.at > CACHE_MS || req.query.refresh === "1") cache = { at: Date.now(), data: await build(req) };
    res.json(cache.data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
