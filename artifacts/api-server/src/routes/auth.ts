import { Router } from "express";
import { query } from "../lib/db";
import { createHash, randomInt } from "crypto";
import * as msal from "@azure/msal-node";
import { decrypt } from "../lib/crypto";
import { sendOtpEmail } from "../lib/email";

const router = Router();

// ─── DB-backed OTP helpers (safe for multi-instance / autoscale) ──────────────
async function storeOtp(email: string, otp: string, ttlMinutes = 5): Promise<void> {
  await query(
    `INSERT INTO otp_store (email, otp, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)
     ON CONFLICT (email) DO UPDATE
       SET otp = $2, expires_at = NOW() + ($3 || ' minutes')::INTERVAL, created_at = NOW()`,
    [email.toLowerCase(), otp, String(ttlMinutes)],
  );
}

async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const r = await query(
    "SELECT otp FROM otp_store WHERE email=$1 AND expires_at > NOW()",
    [email.toLowerCase()],
  );
  if (!r.rows.length || r.rows[0].otp !== otp) return false;
  await query("DELETE FROM otp_store WHERE email=$1", [email.toLowerCase()]);
  return true;
}

async function getStoredOtp(email: string): Promise<{ otp: string; expiresIn: number } | null> {
  const r = await query(
    "SELECT otp, EXTRACT(EPOCH FROM (expires_at - NOW()))::int AS secs FROM otp_store WHERE email=$1 AND expires_at > NOW()",
    [email.toLowerCase()],
  );
  if (!r.rows.length) return null;
  return { otp: r.rows[0].otp, expiresIn: r.rows[0].secs };
}

const REPLIT_DOMAIN = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0] || "";
const AUTO_REDIRECT_URI = `https://${REPLIT_DOMAIN}/api/auth/m365/callback`;

// Derive the /done URL from whatever redirect_uri is configured in the DB.
// e.g. "https://crm-uat.niytri.com/api/auth/m365/callback"
//   → "https://crm-uat.niytri.com/api/auth/m365/done"
// Falls back to the Replit domain only when the DB has no redirect_uri set.
function buildDoneUri(redirectUri: string): string {
  try {
    if (redirectUri) {
      const u = new URL(redirectUri);
      u.pathname = "/api/auth/m365/done";
      u.search = "";
      return u.toString();
    }
  } catch { /* ignore bad URL */ }
  return `https://${REPLIT_DOMAIN}/api/auth/m365/done`;
}

// ─── DYNAMIC MSAL CONFIG — reads from m365_config DB table first ──────────────
// Priority: DB (admin panel) → environment variables → empty
interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedDomain: string;
  ssoEnabled: boolean;
}

async function getAzureConfig(): Promise<AzureConfig> {
  try {
    const r = await query("SELECT * FROM m365_config LIMIT 1");
    if (r.rows.length > 0) {
      const row = r.rows[0];
      // Use DB values if they are non-empty, otherwise fall back to env vars
      // Decrypt client_secret (stored encrypted, fall back to env var if DB is empty)
    const rawSecret = row.client_secret || "";
    const decryptedSecret = rawSecret ? decrypt(rawSecret) : (process.env.AZURE_CLIENT_SECRET || "");
    return {
        tenantId:      row.tenant_id     || process.env.AZURE_TENANT_ID     || "",
        clientId:      row.client_id     || process.env.AZURE_CLIENT_ID     || "",
        clientSecret:  decryptedSecret,
        redirectUri:   row.redirect_uri  || AUTO_REDIRECT_URI,
        allowedDomain: row.allowed_domain || "niytri.com",
        ssoEnabled:    row.sso_enabled ?? true,
      };
    }
  } catch (e) {
    console.warn("[M365] Could not read m365_config from DB, falling back to env vars:", (e as Error).message);
  }
  // Fallback to env vars only
  return {
    tenantId:      process.env.AZURE_TENANT_ID     || "",
    clientId:      process.env.AZURE_CLIENT_ID     || "",
    clientSecret:  process.env.AZURE_CLIENT_SECRET || "",
    redirectUri:   AUTO_REDIRECT_URI,
    allowedDomain: "niytri.com",
    ssoEnabled:    true,
  };
}

async function getMsalClient(): Promise<{ client: msal.ConfidentialClientApplication; config: AzureConfig } | null> {
  const config = await getAzureConfig();
  if (!config.clientId || !config.tenantId || !config.clientSecret) {
    console.warn("[M365] Incomplete Azure config — clientId, tenantId, or clientSecret missing.");
    return null;
  }
  const msalCfg: msal.Configuration = {
    auth: {
      clientId:     config.clientId,
      authority:    `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    },
  };
  return { client: new msal.ConfidentialClientApplication(msalCfg), config };
}

// ─── POST /api/auth/login — email + password ──────────────────────────────────
// Behaviour matrix:
//   app  + mfa_enabled=true  → send OTP (current flow)
//   app  + mfa_enabled=false → issue token directly (no OTP)
//   m365 + SSO configured    → block, redirect to SSO button
//   m365 + SSO not configured→ fall back to email+password (same as app flow)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query(
      "SELECT id, name, email, role, vertical, auth_type, mfa_enabled, password_hash FROM users WHERE email=$1 AND status='Active'",
      [email],
    );
    if (!result.rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = result.rows[0];

    // Enforce auth_type — m365 users must use SSO, not app credentials
    if (user.auth_type === "m365") {
      const m365Cfg = await query("SELECT sso_enabled FROM m365_config LIMIT 1");
      const ssoActive = m365Cfg.rows.length > 0 && m365Cfg.rows[0].sso_enabled;
      if (ssoActive) {
        return res.status(403).json({
          error: "This account is configured for Microsoft 365 SSO. Please use the Sign in with Microsoft 365 button.",
          auth_type: "m365",
        });
      }
      // SSO not yet configured — fall through to password (dev/setup fallback)
    }

    const hash = createHash("sha256").update(password).digest("hex");
    if (user.password_hash !== hash) return res.status(401).json({ error: "Invalid credentials" });

    // MFA disabled → issue session token directly, no OTP required
    if (!user.mfa_enabled) {
      await query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
      const token = Buffer.from(
        JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 8 * 60 * 60 * 1000 }),
      ).toString("base64");
      await query(
        "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('user',$1,$2,'Login','Password verified. MFA disabled — session started directly.')",
        [user.id, user.name],
      );
      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role, vertical: user.vertical, authType: user.auth_type, mfa_enabled: user.mfa_enabled };
      return res.json({ token, user: userPayload });
    }

    // MFA enabled → send OTP
    const otp = String(randomInt(100000, 999999));
    await storeOtp(email, otp, 5);
    console.log(`[OTP] ${email}: ${otp}`);
    sendOtpEmail(email, otp).catch(e => console.error("[OTP] Email send error:", e));

    res.json({ message: "OTP sent to registered email", requiresOtp: true, email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
// ─── POST /api/auth/resend-otp — new code for a login that is already waiting on OTP ──
// Only works while a pending OTP exists for the email (i.e. password / SSO step passed),
// and at most once every 30 seconds.
router.post("/resend-otp", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase();
    if (!email) return res.status(400).json({ error: "email required" });
    const r = await query(
      "SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age FROM otp_store WHERE email=$1",
      [email],
    );
    if (!r.rows.length) return res.status(400).json({ error: "No pending sign-in for this email. Please sign in again." });
    if (r.rows[0].age < 30) return res.status(429).json({ error: `Please wait ${30 - r.rows[0].age}s before requesting another code.` });
    const otp = String(randomInt(100000, 999999));
    await storeOtp(email, otp, 5);
    console.log(`[OTP] ${email}: ${otp} (resent)`);
    sendOtpEmail(email, otp).catch(e => console.error("[OTP] Email send error:", e));
    return res.json({ message: "A new code has been sent." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const valid = await verifyOtp(email, otp);
    if (!valid) return res.status(401).json({ error: "Invalid or expired OTP" });

    const result = await query("UPDATE users SET last_login=NOW() WHERE email=$1 RETURNING id, name, email, role, vertical, auth_type", [email]);
    const user = result.rows[0];

    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64");
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('user',$1,$2,'Login','OTP verified. Session started.')",
      [user.id, user.name],
    );

    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/dev-otp — dev/UAT only: return the current stored OTP ──────
if (process.env.NODE_ENV !== "production") {
  router.get("/dev-otp", async (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.json({ otp: null, message: "email query param required" });
    const stored = await getStoredOtp(email);
    if (!stored) return res.json({ otp: null, message: "No OTP found for this email (not generated or expired)" });
    res.json({ otp: stored.otp, expiresIn: stored.expiresIn });
  });
}

// ─── GET /api/auth/m365/redirect — initiate Azure AD OAuth2 flow ──────────────
router.get("/m365/redirect", async (_req, res) => {
  const msal = await getMsalClient();
  const doneUri = buildDoneUri(msal?.config.redirectUri || AUTO_REDIRECT_URI);
  if (!msal) {
    return res.redirect(`${doneUri}?e=${encodeURIComponent("M365 SSO not configured. Go to Admin → M365 Integration and enter your Azure credentials.")}`);
  }
  try {
    const authUrl = await msal.client.getAuthCodeUrl({
      scopes: ["openid", "profile", "email", "User.Read"],
      redirectUri: msal.config.redirectUri,
      prompt: "select_account",
    });
    res.redirect(authUrl);
  } catch (err: any) {
    console.error("[M365] redirect error:", err.message);
    res.redirect(`${doneUri}?e=${encodeURIComponent(err.message)}`);
  }
});

// ─── GET /api/auth/m365/done — popup postMessage bridge page ─────────────────
router.get("/m365/done", (req, res) => {
  const token    = (req.query.t     as string) || "";
  const user     = (req.query.u     as string) || "";
  const error    = (req.query.e     as string) || "";
  const mfa      = (req.query.mfa   as string) === "1";
  const mfaEmail = (req.query.email as string) || "";
  const mfaName  = (req.query.name  as string) || "";
  const mfaRole  = (req.query.role  as string) || "";
  const mfaV     = (req.query.v     as string) || "";

  let bodyHtml: string;
  let payloadJs: string;
  if (error) {
    bodyHtml  = `<h2 class="err">Sign-in failed</h2><p>Please close this window and try again.</p>`;
    payloadJs = JSON.stringify({ type: "NIYTRI_M365_ERROR", error });
  } else if (mfa) {
    bodyHtml  = `<h2 class="mfa">Verification required</h2><p>An OTP has been sent to your email.<br>Close this window and enter it to continue.</p>`;
    payloadJs = JSON.stringify({ type: "NIYTRI_M365_MFA", email: mfaEmail, name: mfaName, role: mfaRole, vertical: mfaV });
  } else {
    bodyHtml  = `<h2 class="ok">Signed in successfully</h2><p>Returning to NIYTRI CRM…</p>`;
    payloadJs = JSON.stringify({ type: "NIYTRI_M365_AUTH", token, user });
  }
  const autoClose = !error;

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head><title>NIYTRI – Signing in…</title>
<style>
  body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;font-family:system-ui,sans-serif;color:#94a3b8}
  .box{text-align:center;padding:2rem}
  .logo{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#7c3aed);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
  h2{margin:0 0 0.5rem;font-size:1.1rem;color:#f1f5f9}
  p{font-size:0.85rem;margin:0 0 1rem;line-height:1.6}
  .ok{color:#4ade80} .err{color:#f87171} .mfa{color:#f59e0b}
</style>
</head>
<body>
<div class="box">
  <div class="logo">
    <svg width="28" height="28" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  </div>
  ${bodyHtml}
</div>
<script>
(function(){
  var payload = ${payloadJs};
  var autoClose = ${JSON.stringify(autoClose)};
  function send() {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, "*");
        if (autoClose) setTimeout(function(){ window.close(); }, 1800);
      }
    } catch(e) { if (autoClose) window.close(); }
  }
  if (document.readyState === "complete") { send(); } else { window.addEventListener("load", send); }
})();
</script>
</body>
</html>`);
});

// ─── GET /api/auth/m365/callback — Azure AD returns auth code here ────────────
router.get("/m365/callback", async (req, res) => {
  const msal = await getMsalClient();
  // Always derive done URL from the configured redirect_uri so it resolves
  // to the correct domain (e.g. crm-uat.niytri.com) instead of the Replit
  // internal domain which is unreachable from the public internet.
  const doneUri = buildDoneUri(msal?.config.redirectUri || AUTO_REDIRECT_URI);

  if (!msal) {
    return res.redirect(`${doneUri}?e=${encodeURIComponent("M365 SSO not configured. Go to Admin → M365 Integration.")}`);
  }

  const code = req.query.code as string;
  const errorParam = req.query.error as string;

  if (errorParam) {
    const desc = (req.query.error_description as string) || errorParam;
    console.error(`[M365][AUTH_ERROR] Azure AD returned an error — error="${errorParam}" description="${desc}" action="Login blocked"`);
    return res.redirect(`${doneUri}?e=${encodeURIComponent("Invalid User")}`);
  }

  if (!code) {
    console.error(`[M365][AUTH_ERROR] No authorization code received from Azure AD — likely user cancelled or session expired`);
    return res.redirect(`${doneUri}?e=${encodeURIComponent("Invalid User")}`);
  }

  try {
    const tokenResponse = await msal.client.acquireTokenByCode({
      code,
      scopes: ["openid", "profile", "email", "User.Read"],
      redirectUri: msal.config.redirectUri,
    });

    const msEmail = tokenResponse.account?.username?.toLowerCase() || "";
    const msName  = tokenResponse.account?.name || "";

    // Validate email domain
    if (msal.config.allowedDomain && !msEmail.endsWith(`@${msal.config.allowedDomain}`)) {
      console.error(`[M365][AUTH_ERROR] Domain mismatch — account="${msEmail}" expected_domain="@${msal.config.allowedDomain}" reason="Account domain does not match the configured allowed domain. Only @${msal.config.allowedDomain} accounts are permitted." action="Login blocked"`);
      return res.redirect(`${doneUri}?e=${encodeURIComponent("Invalid User")}`);
    }

    // Look up user in CRM DB
    const result = await query(
      "SELECT id, name, email, role, vertical, auth_type, mfa_enabled FROM users WHERE LOWER(email)=$1 AND status='Active'",
      [msEmail],
    );

    if (!result.rows.length) {
      console.error(`[M365][AUTH_ERROR] User not in CRM — account="${msEmail}" reason="Email authenticated via Microsoft 365 but no active user record found in NIYTRI CRM users table. User may not be provisioned or may be deactivated." action="Login blocked"`);
      return res.redirect(`${doneUri}?e=${encodeURIComponent("Invalid User")}`);
    }

    const user = result.rows[0];
    if (user.auth_type !== "m365") {
      console.error(`[M365][AUTH_ERROR] Auth type mismatch — account="${msEmail}" configured_auth_type="${user.auth_type}" reason="User account is set to app/OTP authentication and cannot sign in via Microsoft 365 SSO." action="Login blocked"`);
      return res.redirect(`${doneUri}?e=${encodeURIComponent("Invalid User")}`);
    }

    await query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);

    // ── MFA: if mfa_enabled, generate OTP and require email verification ─────
    if (user.mfa_enabled) {
      const otp = String(randomInt(100000, 999999));
      await storeOtp(user.email, otp, 10);
      console.log(`[M365][MFA] OTP generated for "${user.email}" — DEV OTP: ${otp}`);
      sendOtpEmail(user.email, otp).catch(e => console.error("[M365][MFA] Email send error:", e));
      await query(
        "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('user',$1,$2,'MFA Required','M365 SSO success. Email OTP sent for MFA verification.')",
        [user.id, user.name || msName],
      );
      const mfaParams = new URLSearchParams({
        mfa: "1",
        email: user.email,
        name: user.name || msName,
        role: user.role || "",
        v: user.vertical || "",
      });
      return res.redirect(`${doneUri}?${mfaParams.toString()}`);
    }

    // ── Normal M365 login (no MFA) ────────────────────────────────────────────
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('user',$1,$2,'Login','Microsoft 365 SSO authenticated via Azure AD.')",
      [user.id, user.name || msName],
    );

    const crmToken = Buffer.from(
      JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 8 * 60 * 60 * 1000, method: "m365" }),
    ).toString("base64");

    const userPayload = JSON.stringify({
      id: user.id, name: user.name || msName, email: user.email,
      role: user.role, vertical: user.vertical, authType: "m365",
    });

    res.redirect(`${doneUri}?t=${encodeURIComponent(crmToken)}&u=${encodeURIComponent(userPayload)}`);
  } catch (err: any) {
    console.error(`[M365][AUTH_ERROR] Token exchange failed — error="${err.message}" stack="${err.stack?.split('\n')[1]?.trim()}" action="Login blocked"`);
    res.redirect(`${doneUri}?e=${encodeURIComponent("Invalid User")}`);
  }
});

// ─── POST /api/auth/m365-callback — legacy endpoint ──────────────────────────
router.post("/m365-callback", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await query(
      "SELECT id, name, email, role, vertical, auth_type FROM users WHERE email=$1 AND auth_type='m365'",
      [email],
    );
    if (!result.rows.length) return res.status(403).json({ error: "User not found or not configured for M365 SSO" });
    const user = result.rows[0];

    await query("UPDATE users SET last_login=NOW() WHERE id=$1", [user.id]);
    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64");
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('user',$1,$2,'Login','M365 SSO. Session started.')",
      [user.id, user.name],
    );
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/m365/status — live config check (reads DB + env) ───────────
router.get("/m365/status", async (_req, res) => {
  try {
    const config = await getAzureConfig();
    const configured = !!(config.clientId && config.tenantId && config.clientSecret);
    res.json({
      configured,
      tenantId:     configured ? config.tenantId  : null,
      clientId:     configured ? config.clientId  : null,
      redirectUri:  configured ? config.redirectUri : null,
      allowedDomain: config.allowedDomain,
      ssoEnabled:   config.ssoEnabled,
      source:       configured ? "database+env" : "unconfigured",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
