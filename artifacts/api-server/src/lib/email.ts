import { query } from "./db";
import { decrypt } from "./crypto";
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface SmtpConfig {
  mode: "smtp";
  host: string;
  port: number;
  tls: boolean;
  user: string;
  password: string;
  fromName: string;
  senderEmail: string;
}

interface GraphConfig {
  mode: "graph";
  senderEmail: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

async function getEmailConfig(): Promise<SmtpConfig | GraphConfig | null> {
  let row: any = null;
  try {
    const r = await query(
      `SELECT tenant_id, client_id, client_secret, sender_email,
              smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password,
              smtp_from_name, smtp_tls, prefer_smtp
       FROM m365_config LIMIT 1`,
    );
    if (r.rows.length) row = r.rows[0];
  } catch {}

  // ── Build Graph config (always attempted first unless prefer_smtp is set) ──
  let dbClientSecret = "";
  if (row?.client_secret) {
    try { dbClientSecret = decrypt(row.client_secret); } catch {}
  }
  const tenantId     = row?.tenant_id     || process.env.AZURE_TENANT_ID     || "";
  const clientId     = row?.client_id     || process.env.AZURE_CLIENT_ID     || "";
  const clientSecret = dbClientSecret     || process.env.AZURE_CLIENT_SECRET || "";
  const senderEmail  = row?.sender_email  || "admin@niytri.com";
  const graphReady   = !!(tenantId && clientId && clientSecret && senderEmail.includes("@"));
  const graphCfg: GraphConfig | null = graphReady
    ? { mode: "graph", senderEmail, tenantId, clientId, clientSecret }
    : null;

  // ── Build SMTP config ────────────────────────────────────────────────────
  let smtpCfg: SmtpConfig | null = null;
  if (row?.smtp_enabled) {
    let smtpPassword = "";
    if (row.smtp_password) {
      try { smtpPassword = decrypt(row.smtp_password); } catch {}
    }
    const user = row.smtp_user || "admin@niytri.com";
    const host = row.smtp_host || "smtp.office365.com";
    const port = row.smtp_port || 587;
    if (user && smtpPassword) {
      smtpCfg = {
        mode: "smtp",
        host,
        port,
        tls: row.smtp_tls !== false,
        user,
        password: smtpPassword,
        fromName: row.smtp_from_name || "NIYTRI CRM",
        senderEmail: user,
      };
    }
  }

  // ── Priority: Graph API is primary unless admin explicitly prefers SMTP ──
  // prefer_smtp = true means use SMTP when both are available (opt-in override)
  if (row?.prefer_smtp && smtpCfg) return smtpCfg;
  if (graphCfg) return graphCfg;
  if (smtpCfg) return smtpCfg;
  return null;
}

async function sendViaSMTP(cfg: SmtpConfig, options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.tls && cfg.port !== 465,
    auth: { user: cfg.user, pass: cfg.password },
    tls: { ciphers: "SSLv3", rejectUnauthorized: false },
  });

  try {
    const to = Array.isArray(options.to) ? options.to.join(",") : options.to;
    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.senderEmail}>`,
      to,
      subject: options.subject,
      ...(options.isHtml ? { html: options.body } : { text: options.body }),
    });
    console.log(`[Email][SMTP] Sent to ${to}: ${options.subject}`);
    return { success: true };
  } catch (e: any) {
    console.error(`[Email][SMTP] Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function getGraphToken(tenantId: string, clientId: string, clientSecret: string): Promise<string | null> {
  const r = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  const d: any = await r.json();
  if (d.access_token) return d.access_token;
  console.error("[Email] Graph token error:", d.error_description || d.error);
  return null;
}

async function sendViaGraph(cfg: GraphConfig, options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const token = await getGraphToken(cfg.tenantId, cfg.clientId, cfg.clientSecret);
  if (!token) return { success: false, error: "Failed to acquire Graph token" };

  const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({
    emailAddress: { address: email },
  }));

  const r = await fetch(
    `https://graph.microsoft.com/v1.0/users/${cfg.senderEmail}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject: options.subject,
          body: { contentType: options.isHtml ? "HTML" : "Text", content: options.body },
          toRecipients: recipients,
        },
      }),
    },
  );

  if (r.status === 202 || r.ok) {
    console.log(`[Email][Graph] Sent to ${Array.isArray(options.to) ? options.to.join(",") : options.to}`);
    return { success: true };
  }

  const err: any = await r.json().catch(() => ({}));
  const errMsg = err?.error?.message || `HTTP ${r.status}`;
  console.error(`[Email][Graph] Send failed: ${errMsg}`);
  return { success: false, error: errMsg };
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfig();
  if (!config) {
    console.log(`[Email][Fallback] No config. Would send to ${Array.isArray(options.to) ? options.to.join(",") : options.to}: ${options.subject}`);
    return { success: false, error: "Email not configured" };
  }

  try {
    if (config.mode === "smtp") return await sendViaSMTP(config, options);
    return await sendViaGraph(config, options);
  } catch (e: any) {
    console.error(`[Email] Exception: ${e.message}`);
    return { success: false, error: e.message };
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const result = await sendEmail({
    to: email,
    subject: "NIYTRI CRM — Your Login OTP",
    isHtml: true,
    body: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6d28d9; margin: 0;">NIYTRI CRM</h2>
          <p style="color: #64748b; font-size: 13px;">Enterprise Financial Services Platform</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #334155; font-size: 14px; margin: 0 0 16px;">Your one-time password is:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6d28d9; padding: 16px; background: #ede9fe; border-radius: 8px; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">This code expires in 5 minutes. Do not share it with anyone.</p>
        </div>
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
          If you did not request this code, please ignore this email.
        </p>
      </div>
    `,
  });
  return result.success;
}

export async function sendNotificationEmail(email: string, title: string, message: string): Promise<boolean> {
  const result = await sendEmail({
    to: email,
    subject: `NIYTRI CRM — ${title}`,
    isHtml: true,
    body: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6d28d9; margin: 0;">NIYTRI CRM</h2>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px;">${title}</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
          This is an automated notification from NIYTRI CRM.
        </p>
      </div>
    `,
  });
  return result.success;
}
