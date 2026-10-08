import { Router } from "express";
import { query } from "../lib/db";
import { encrypt, decrypt } from "../lib/crypto";

const router = Router();

// ── USER ROLES ──────────────────────────────────────────────────────────────
router.get("/user-roles", async (_req, res) => {
  try {
    const r = await query("SELECT * FROM user_roles ORDER BY role_name");
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/user-roles", async (req, res) => {
  try {
    const { role_name, vertical, description, permissions, auth_required } = req.body;
    const r = await query(
      "INSERT INTO user_roles (role_name, vertical, description, permissions, auth_required) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [role_name, vertical || "All", description || "", permissions || {}, auth_required || "any"],
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/user-roles/:id", async (req, res) => {
  try {
    const { role_name, vertical, description, permissions, auth_required, is_active } = req.body;
    const r = await query(
      "UPDATE user_roles SET role_name=$1, vertical=$2, description=$3, permissions=$4, auth_required=$5, is_active=$6 WHERE id=$7 RETURNING *",
      [role_name, vertical, description, permissions, auth_required, is_active ?? true, req.params.id],
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/user-roles/:id", async (req, res) => {
  try {
    await query("DELETE FROM user_roles WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── USER-ROLE MAPPING ───────────────────────────────────────────────────────
router.get("/user-role-mapping", async (_req, res) => {
  try {
    const r = await query(`
      SELECT m.id, m.user_id, m.role_id, m.assigned_by, m.assigned_at, m.is_active,
             u.name AS user_name, u.email AS user_email, u.vertical AS user_vertical,
             ur.role_name, ur.vertical AS role_vertical
      FROM user_role_mapping m
      JOIN users u ON u.id = m.user_id
      JOIN user_roles ur ON ur.id = m.role_id
      ORDER BY u.name, ur.role_name
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/user-role-mapping", async (req, res) => {
  try {
    const { user_id, role_id, assigned_by } = req.body;
    const r = await query(
      "INSERT INTO user_role_mapping (user_id, role_id, assigned_by) VALUES ($1,$2,$3) ON CONFLICT (user_id, role_id) DO UPDATE SET is_active=TRUE, assigned_by=$3 RETURNING *",
      [user_id, role_id, assigned_by || "admin"],
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/user-role-mapping/:id", async (req, res) => {
  try {
    await query("DELETE FROM user_role_mapping WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── SESSIONS ────────────────────────────────────────────────────────────────
router.get("/sessions", async (_req, res) => {
  try {
    const r = await query(`
      SELECT s.id, s.user_id, s.auth_method, s.ip_address, s.created_at, s.expires_at, s.is_active,
             u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.is_active = TRUE AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    await query("UPDATE user_sessions SET is_active=FALSE WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/sessions/user/:userId", async (req, res) => {
  try {
    await query("UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1", [req.params.userId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── M365 CONFIG ─────────────────────────────────────────────────────────────
// GET /api/admin/m365-config — never returns raw secret; shows has_client_secret
router.get("/m365-config", async (_req, res) => {
  try {
    const r = await query(
      `SELECT id, tenant_id, client_id, redirect_uri, allowed_domain, sso_enabled, require_mfa, session_hours,
              sender_email, updated_by, updated_at,
              (client_secret IS NOT NULL AND client_secret <> '') AS has_client_secret,
              smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_from_name, smtp_tls,
              (smtp_password IS NOT NULL AND smtp_password <> '') AS has_smtp_password,
              max_meeting_attachment_mb, prefer_smtp
       FROM m365_config LIMIT 1`,
    );
    if (r.rows.length === 0) {
      return res.json({
        tenant_id: process.env.AZURE_TENANT_ID || "",
        client_id: process.env.AZURE_CLIENT_ID || "",
        has_client_secret: !!(process.env.AZURE_CLIENT_SECRET),
        allowed_domain: "niytri.com",
        sso_enabled: true,
        require_mfa: true,
        session_hours: 8,
        redirect_uri: "",
        sender_email: "admin@niytri.com",
        smtp_enabled: false,
        smtp_host: "smtp.office365.com",
        smtp_port: 587,
        smtp_user: "admin@niytri.com",
        smtp_from_name: "NIYTRI CRM",
        smtp_tls: true,
        has_smtp_password: false,
        prefer_smtp: false,
      });
    }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/m365-config/reveal — decrypts and returns client_secret (admin only)
router.get("/m365-config/reveal", async (_req, res) => {
  try {
    const r = await query("SELECT client_secret FROM m365_config LIMIT 1");
    if (!r.rows.length || !r.rows[0].client_secret) {
      return res.status(404).json({ error: "No client secret stored" });
    }
    const plain = decrypt(r.rows[0].client_secret);
    res.json({ client_secret: plain });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/admin/m365-config — encrypts client_secret and smtp_password before storing
router.put("/m365-config", async (req, res) => {
  try {
    const {
      tenant_id, client_id, client_secret, redirect_uri, allowed_domain,
      sso_enabled, require_mfa, session_hours, sender_email, updated_by,
      smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name, smtp_tls,
      max_meeting_attachment_mb, prefer_smtp,
    } = req.body;

    const existing = await query("SELECT id FROM m365_config LIMIT 1");

    const encryptedSecret = client_secret && !client_secret.includes("•") && client_secret.trim()
      ? encrypt(client_secret.trim()) : null;
    const encryptedSmtpPw = smtp_password && !smtp_password.includes("•") && smtp_password.trim()
      ? encrypt(smtp_password.trim()) : null;

    const smtpHost = smtp_host || "smtp.office365.com";
    const smtpPort = parseInt(String(smtp_port || 587));
    const smtpUser = smtp_user || "admin@niytri.com";
    const smtpFromName = smtp_from_name || "NIYTRI CRM";
    const smtpTls = smtp_tls !== false;
    const maxAttachMb = Math.max(1, Math.min(25, parseInt(String(max_meeting_attachment_mb || 5))));

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      const setClauses: string[] = [
        "tenant_id=$1", "client_id=$2", "redirect_uri=$3", "allowed_domain=$4",
        "sso_enabled=$5", "require_mfa=$6", "session_hours=$7", "sender_email=$8", "updated_by=$9", "updated_at=NOW()",
        "smtp_enabled=$10", "smtp_host=$11", "smtp_port=$12", "smtp_user=$13", "smtp_from_name=$14", "smtp_tls=$15",
        "max_meeting_attachment_mb=$16", "prefer_smtp=$17",
      ];
      const params: any[] = [
        tenant_id, client_id, redirect_uri, allowed_domain,
        sso_enabled, require_mfa, session_hours, sender_email || "admin@niytri.com", updated_by || "admin",
        smtp_enabled ?? false, smtpHost, smtpPort, smtpUser, smtpFromName, smtpTls, maxAttachMb,
        prefer_smtp ?? false,
        id,
      ];
      if (encryptedSecret) { setClauses.push(`client_secret=$${params.length}`); params.splice(params.length - 1, 0, encryptedSecret); }
      if (encryptedSmtpPw) { setClauses.push(`smtp_password=$${params.length}`); params.splice(params.length - 1, 0, encryptedSmtpPw); }
      await query(`UPDATE m365_config SET ${setClauses.join(", ")} WHERE id=$${params.length}`, params);
    } else {
      await query(
        `INSERT INTO m365_config
          (tenant_id, client_id, client_secret, redirect_uri, allowed_domain, sso_enabled, require_mfa, session_hours,
           sender_email, updated_by, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name, smtp_tls,
           max_meeting_attachment_mb, prefer_smtp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
          tenant_id, client_id, encryptedSecret, redirect_uri, allowed_domain, sso_enabled, require_mfa, session_hours,
          sender_email || "admin@niytri.com", updated_by || "admin",
          smtp_enabled ?? false, smtpHost, smtpPort, smtpUser, encryptedSmtpPw, smtpFromName, smtpTls, maxAttachMb,
          prefer_smtp ?? false,
        ],
      );
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AUDIT LOGS ───────────────────────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  try {
    const limit  = Math.min(parseInt(String(req.query.limit  || "100")), 500);
    const offset = parseInt(String(req.query.offset || "0"));
    const search = (req.query.search as string) || "";
    const entity = (req.query.entity as string) || "";
    const rows = await query(
      `SELECT al.id, al.entity_type, al.entity_id, al.user_name, al.action,
              al.details, al.old_value, al.new_value, al.ip_address, al.created_at,
              u.name AS user_display_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE ($1 = '' OR al.user_name ILIKE $1 OR al.action ILIKE $1 OR al.details ILIKE $1)
         AND ($2 = '' OR al.entity_type = $2)
       ORDER BY al.created_at DESC
       LIMIT $3 OFFSET $4`,
      [search ? `%${search}%` : "", entity, limit, offset],
    );
    const cnt = await query(
      "SELECT COUNT(*) AS total FROM audit_logs WHERE ($1='' OR user_name ILIKE $1 OR action ILIKE $1 OR details ILIKE $1) AND ($2='' OR entity_type=$2)",
      [search ? `%${search}%` : "", entity],
    );
    res.json({ rows: rows.rows, total: parseInt(cnt.rows[0].total) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── USERS (admin full list) ──────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = "SELECT id, name, email, role, vertical, status, auth_type, mfa_enabled, mobile, location, last_login, created_at FROM users WHERE 1=1";
    const params: any[] = [];
    if (search) { params.push(`%${search}%`); sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR mobile ILIKE $${params.length})`; }
    if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
    sql += " ORDER BY name";
    const r = await query(sql, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/users/:id", async (req, res) => {
  try {
    const { name, role, vertical, status, auth_type, mfa_enabled, mobile, location } = req.body;
    const r = await query(
      "UPDATE users SET name=$1, role=$2, vertical=$3, status=$4, auth_type=$5, mfa_enabled=$6, mobile=$7, location=$8, updated_at=NOW() WHERE id=$9 RETURNING id,name,email,role,vertical,status,auth_type,mfa_enabled,mobile,location,last_login,created_at",
      [name, role, vertical, status, auth_type, mfa_enabled, mobile || null, location || null, req.params.id],
    );
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, role, vertical, auth_type, mfa_enabled, mobile, location } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });
    // Check if email already exists
    const exists = await query("SELECT id FROM users WHERE email=$1", [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: "A user with this email already exists" });
    const r = await query(
      "INSERT INTO users (name, email, role, vertical, auth_type, mfa_enabled, mobile, location, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Active') RETURNING id,name,email,role,vertical,status,auth_type,mfa_enabled,mobile,location,created_at",
      [name.trim(), email.trim().toLowerCase(), role || "Junior RM", vertical || "All", auth_type || "app", mfa_enabled ?? false, mobile || null, location || null],
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await query("DELETE FROM users WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── TEST CONNECTIONS ─────────────────────────────────────────────────────────
// ── GET /api/admin/test-email — verify MS Graph token + mailbox (read-only) ──
router.get("/test-email", async (_req, res) => {
  try {
    const r = await query("SELECT tenant_id, client_id, client_secret, sender_email FROM m365_config LIMIT 1");
    const row = r.rows[0];
    if (!row) return res.json({ ok: false, step: "config", msg: "No M365 config found in database. Save settings first." });

    const tenantId  = row.tenant_id  || process.env.AZURE_TENANT_ID  || "";
    const clientId  = row.client_id  || process.env.AZURE_CLIENT_ID  || "";
    let   clientSecret = "";
    if (row.client_secret) {
      try { clientSecret = decrypt(row.client_secret); } catch { clientSecret = ""; }
    }
    if (!clientSecret) clientSecret = process.env.AZURE_CLIENT_SECRET || "";
    const senderEmail = row.sender_email || "";

    if (!tenantId || !clientId)
      return res.json({ ok: false, step: "config", msg: `Missing required fields — Tenant ID: ${tenantId ? "✓" : "✗"}, Client ID: ${clientId ? "✓" : "✗"}` });
    if (!clientSecret)
      return res.json({ ok: false, step: "secret", msg: "Client Secret is missing. Add it in Azure App Registration and save it here." });
    if (!senderEmail || !senderEmail.includes("@"))
      return res.json({ ok: false, step: "email", msg: "Sender Email is missing or invalid. Set a valid O365 mailbox address." });

    // Acquire Graph token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
      },
    );
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token)
      return res.json({ ok: false, step: "token", msg: `Token error: ${tokenData.error_description || tokenData.error || "Unknown"}` });

    // Try to verify the sender user exists (requires User.Read.All)
    const userRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}?$select=displayName,mail,userPrincipalName`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    if (userRes.ok) {
      const user: any = await userRes.json().catch(() => ({}));
      const displayName = user?.displayName || senderEmail;
      return res.json({ ok: true, msg: `Graph connection OK ✓ — Token acquired ✓ · User "${displayName}" (${senderEmail}) found ✓ · Click "Send Test Email via Graph" to verify Mail.Send permission.` });
    }

    // If user lookup fails (403 = no User.Read.All, 404 = not found), just report token success
    const userErrData: any = await userRes.json().catch(() => ({}));
    const userErrCode = userErrData?.error?.code || "";
    if (userRes.status === 403 || userErrCode === "Authorization_RequestDenied") {
      // No User.Read.All — token is fine, skip mailbox check
      return res.json({ ok: true, msg: `Graph token acquired ✓ · Sender ${senderEmail} accepted ✓ · (User.Read.All not granted — mailbox ownership not verified) · Use "Send Test Email via Graph" to confirm Mail.Send works.` });
    }
    if (userRes.status === 404) {
      return res.json({ ok: false, step: "mailbox", msg: `User ${senderEmail} not found in your Azure AD tenant. Ensure the sender email belongs to a licensed O365 mailbox in the ${senderEmail.split("@")[1]} tenant.` });
    }

    res.json({ ok: true, msg: `Graph token acquired ✓ · Configuration looks good · Use "Send Test Email via Graph" to confirm Mail.Send permission works end-to-end.` });
  } catch (e: any) {
    res.json({ ok: false, step: "exception", msg: `Exception: ${e.message}` });
  }
});

// ── GET /api/admin/send-test-email — actually send a test email via Graph API ─
router.get("/send-test-email", async (_req, res) => {
  try {
    const r = await query("SELECT tenant_id, client_id, client_secret, sender_email FROM m365_config LIMIT 1");
    const row = r.rows[0];
    if (!row) return res.json({ ok: false, msg: "No M365 config found. Save settings first." });

    const tenantId  = row.tenant_id  || process.env.AZURE_TENANT_ID  || "";
    const clientId  = row.client_id  || process.env.AZURE_CLIENT_ID  || "";
    let   clientSecret = "";
    if (row.client_secret) {
      try { clientSecret = decrypt(row.client_secret); } catch { clientSecret = ""; }
    }
    if (!clientSecret) clientSecret = process.env.AZURE_CLIENT_SECRET || "";
    const senderEmail = row.sender_email || "";

    if (!tenantId || !clientId || !clientSecret || !senderEmail.includes("@"))
      return res.json({ ok: false, msg: "Graph email not fully configured. Ensure Tenant ID, Client ID, Client Secret, and Sender Email are all saved." });

    // Acquire token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
      },
    );
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token)
      return res.json({ ok: false, msg: `Could not acquire token: ${tokenData.error_description || tokenData.error || "Unknown error"}` });

    // Send a real test email to the sender mailbox itself
    const sendRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            subject: "NIYTRI CRM — Graph Email Test",
            body: {
              contentType: "HTML",
              content: `<div style="font-family:Arial,sans-serif;max-width:480px;padding:24px">
                <h2 style="color:#6d28d9">NIYTRI CRM</h2>
                <p>This is a test email sent via Microsoft Graph API (<code>Mail.Send</code> permission).</p>
                <p><strong>Sent from:</strong> ${senderEmail}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
                <p style="color:#64748b;font-size:12px">If you received this, your Graph email integration is working correctly.</p>
              </div>`,
            },
            toRecipients: [{ emailAddress: { address: senderEmail } }],
          },
        }),
      },
    );

    if (sendRes.status === 202 || sendRes.ok) {
      return res.json({ ok: true, msg: `Test email sent successfully via Graph API to ${senderEmail} ✓ — Check the inbox.` });
    }

    const errData: any = await sendRes.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${sendRes.status}`;
    const errCode = errData?.error?.code || "";

    let hint = "";
    if (errCode === "MailboxNotEnabledForRESTAPI" || sendRes.status === 403) {
      hint = " — Mailbox may not have REST API enabled, or Mail.Send application permission has not been granted admin consent in Azure AD.";
    } else if (sendRes.status === 401) {
      hint = " — Authentication failed. Verify Client Secret is correct and not expired.";
    }

    res.json({ ok: false, msg: `Graph send failed: ${errMsg}${hint}` });
  } catch (e: any) {
    res.json({ ok: false, msg: `Exception: ${e.message}` });
  }
});

router.get("/test-smtp", async (_req, res) => {
  try {
    const r = await query("SELECT smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_tls FROM m365_config LIMIT 1");
    const row = r.rows[0];
    if (!row) return res.json({ ok: false, step: "config", msg: "No config found. Save settings first." });
    if (!row.smtp_enabled) return res.json({ ok: false, step: "disabled", msg: "SMTP is not enabled. Toggle it on and save before testing." });
    if (!row.smtp_user) return res.json({ ok: false, step: "user", msg: "SMTP username (sender email) is missing." });
    if (!row.smtp_password) return res.json({ ok: false, step: "password", msg: "SMTP password is missing. Enter and save it first." });

    let smtpPw = "";
    try { smtpPw = decrypt(row.smtp_password); } catch { return res.json({ ok: false, step: "decrypt", msg: "Could not decrypt SMTP password. Re-enter and save it." }); }

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: row.smtp_host || "smtp.office365.com",
      port: parseInt(String(row.smtp_port || 587)),
      secure: parseInt(String(row.smtp_port || 587)) === 465,
      requireTLS: row.smtp_tls !== false && parseInt(String(row.smtp_port || 587)) !== 465,
      auth: { user: row.smtp_user, pass: smtpPw },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      const msg = verifyErr.message || String(verifyErr);
      const hint = msg.includes("535") || msg.includes("authentication") ? " — Check username/password or enable SMTP AUTH in M365 admin." :
                   msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") ? " — Connection refused. Verify host/port and firewall." :
                   msg.includes("5.7.57") ? " — SMTP AUTH is disabled for this mailbox. Enable it in Microsoft 365 Admin Center > Users > Active Users > Mail > Manage email apps > Authenticated SMTP." : "";
      return res.json({ ok: false, step: "verify", msg: `SMTP connection failed: ${msg}${hint}` });
    }

    res.json({ ok: true, msg: `SMTP connection verified ✓ — ${row.smtp_host}:${row.smtp_port} · User: ${row.smtp_user} · STARTTLS: ${row.smtp_tls !== false ? "Yes" : "No"}` });
  } catch (e: any) {
    res.json({ ok: false, step: "exception", msg: `Exception: ${e.message}` });
  }
});

router.get("/test-m365-sso", async (_req, res) => {
  try {
    const r = await query("SELECT tenant_id, client_id, redirect_uri, sso_enabled FROM m365_config LIMIT 1");
    const row = r.rows[0];
    if (!row) return res.json({ ok: false, msg: "No M365 config found. Save settings first." });

    const tenantId    = row.tenant_id   || process.env.AZURE_TENANT_ID  || "";
    const clientId    = row.client_id   || process.env.AZURE_CLIENT_ID  || "";
    const redirectUri = row.redirect_uri || "";
    const ssoEnabled  = row.sso_enabled ?? true;

    if (!tenantId || !clientId)
      return res.json({ ok: false, msg: `Azure AD credentials incomplete — Tenant ID: ${tenantId ? "✓" : "✗"}, Client ID: ${clientId ? "✓" : "✗"}` });

    // Verify the tenant exists by querying OIDC discovery doc
    const discoveryRes = await fetch(`https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`);
    if (!discoveryRes.ok)
      return res.json({ ok: false, msg: `Tenant ID "${tenantId}" not found. Check your Azure Directory ID.` });

    res.json({
      ok: true,
      msg: `Azure AD SSO configured ✓ — Tenant: ${tenantId} · Client: ${clientId} · SSO: ${ssoEnabled ? "Enabled" : "Disabled"} · Redirect: ${redirectUri || "(not set)"}`,
    });
  } catch (e: any) {
    res.json({ ok: false, msg: `Exception: ${e.message}` });
  }
});

// ── VERTICALS CONFIG ─────────────────────────────────────────────────────────
router.get("/verticals-config", async (_req, res) => {
  try {
    const r = await query("SELECT * FROM verticals_config ORDER BY display_order");
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/verticals-config/:vertical_id", async (req, res) => {
  try {
    const { label, short_name, is_active, display_order } = req.body;
    const r = await query(
      "UPDATE verticals_config SET label=$1, short_name=$2, is_active=$3, display_order=$4, updated_at=NOW() WHERE vertical_id=$5 RETURNING *",
      [label, short_name, is_active ?? true, display_order, req.params.vertical_id],
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Vertical not found" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
