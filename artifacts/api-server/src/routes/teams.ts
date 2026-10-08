import { Router } from "express";
import { query } from "../lib/db";
import { decrypt } from "../lib/crypto";

const router = Router();

// ─── Read M365 config from DB (with env fallback) ────────────────────────────
async function getM365Config() {
  try {
    const r = await query("SELECT tenant_id, client_id, client_secret FROM m365_config LIMIT 1");
    if (r.rows.length) {
      const row = r.rows[0];
      const tenantId = row.tenant_id || process.env.AZURE_TENANT_ID || "";
      const clientId = row.client_id || process.env.AZURE_CLIENT_ID || "";
      let clientSecret = "";
      if (row.client_secret) {
        try { clientSecret = decrypt(row.client_secret); } catch {}
      }
      if (!clientSecret) clientSecret = process.env.AZURE_CLIENT_SECRET || "";
      return { tenantId, clientId, clientSecret };
    }
  } catch {}
  return {
    tenantId: process.env.AZURE_TENANT_ID || "",
    clientId: process.env.AZURE_CLIENT_ID || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
  };
}

// ─── Get Graph access token via client credentials (app-only) ────────────────
async function getGraphToken(): Promise<string | null> {
  const { tenantId, clientId, clientSecret } = await getM365Config();
  if (!tenantId || !clientId || !clientSecret) return null;

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
  console.error("[Teams] Token error:", d.error_description || d.error);
  return null;
}

// ─── POST /api/teams/create-meeting ──────────────────────────────────────────
// Body: { organizerEmail, subject, startTime, endTime, attendees, agenda, clientId?,
//         attachment?: { name, base64, mimeType } }
router.post("/create-meeting", async (req, res) => {
  try {
    const {
      organizerEmail, subject, startTime, endTime,
      attendees = [], agenda, clientId, attachment,
    } = req.body;

    if (!organizerEmail || !subject || !startTime || !endTime) {
      return res.status(400).json({ error: "organizerEmail, subject, startTime, endTime are required" });
    }

    const startDt = new Date(startTime);
    const endDt = new Date(endTime);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      return res.status(400).json({ error: "Invalid date/time format" });
    }
    if (startDt.getTime() <= Date.now()) {
      return res.status(400).json({ error: "Start time must be in the future" });
    }
    if (endDt.getTime() <= startDt.getTime()) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    const token = await getGraphToken();
    if (!token) {
      return res.status(503).json({
        error: "M365 integration not configured. Set Tenant ID, Client ID and Client Secret in Admin → M365 Config.",
        fallback: true,
      });
    }

    // Build agenda body HTML
    let bodyHtml = "<p>This is a Microsoft Teams meeting invite.</p>";
    if (agenda) {
      bodyHtml += `<h3>Agenda</h3><p>${agenda.replace(/\n/g, "<br>")}</p>`;
    }
    if (attachment) {
      bodyHtml += `<p><strong>Attachment:</strong> ${attachment.name} (see attached)</p>`;
    }
    bodyHtml += "<p>Click the Teams link above to join.</p>";

    // Build attendees for calendar event
    const attendeeList = (attendees as string[]).map((email: string) => ({
      emailAddress: { address: email },
      type: "required",
    }));

    // ── Strategy: create event WITHOUT attendees first so no invite fires yet.
    // Then upload any attachment. Then PATCH with attendees + sendToChangedOnly
    // so ONE invite email goes out that already includes the attachment.
    const basePayload: any = {
      subject,
      body: { contentType: "HTML", content: bodyHtml },
      start: { dateTime: new Date(startTime).toISOString(), timeZone: "UTC" },
      end:   { dateTime: new Date(endTime).toISOString(),   timeZone: "UTC" },
      attendees: [],          // ← empty: no invites fired on creation
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      allowNewTimeProposals: false,
    };

    let data: any = null;
    let usesFallback = false;

    // Step 1 — Create calendar event (no attendees → no invites yet)
    const resp = await fetch(
      `https://graph.microsoft.com/v1.0/users/${organizerEmail}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      },
    );

    if (resp.ok) {
      data = await resp.json();

      // Step 2 — Upload attachment (if any) before invites are sent
      if (attachment && data.id) {
        try {
          const attachResp = await fetch(
            `https://graph.microsoft.com/v1.0/users/${organizerEmail}/events/${data.id}/attachments`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: attachment.name,
                contentType: attachment.mimeType || "application/octet-stream",
                contentBytes: attachment.base64,
              }),
            },
          );
          if (!attachResp.ok) {
            const ae: any = await attachResp.json();
            console.warn("[Teams] Attachment upload failed:", ae.error?.message);
          }
        } catch (ae) {
          console.warn("[Teams] Attachment error:", ae);
        }
      }

      // Step 3 — PATCH to add attendees; sendToChangedOnly fires ONE invite WITH attachment
      if (attendeeList.length > 0 && data.id) {
        const patchResp = await fetch(
          `https://graph.microsoft.com/v1.0/users/${organizerEmail}/events/${data.id}?sendInvitationsOrCancellations=sendToChangedOnly`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ attendees: attendeeList }),
          },
        );
        if (patchResp.ok) {
          data = await patchResp.json();
        } else {
          const pe: any = await patchResp.json().catch(() => ({}));
          console.warn("[Teams] Attendee PATCH failed:", pe?.error?.message);
        }
      }
    } else {
      const errData: any = await resp.json();
      const errCode = errData?.error?.code || "";
      const errMsg = errData?.error?.message || "";
      console.error("[Teams] Calendar event creation failed:", JSON.stringify(errData));

      if (
        ["AccessDenied", "Forbidden", "AuthorizationRequestDenied", "ErrorAccessDenied"]
          .some(c => errCode.includes(c)) ||
        resp.status === 403
      ) {
        usesFallback = true;
        const meetingId = `teams-placeholder-${Date.now()}`;
        const joinUrl = `https://teams.microsoft.com/l/meetup-join/19%3Ameeting_placeholder_${meetingId}@thread.v2/0`;
        data = {
          id: meetingId,
          subject,
          onlineMeeting: { joinUrl },
          start: { dateTime: new Date(startTime).toISOString() },
          end:   { dateTime: new Date(endTime).toISOString() },
          _fallback: true,
          _fallbackReason:
            "The Azure AD app needs Calendars.ReadWrite application permission with admin consent to create calendar events and send invitations. A placeholder Teams link has been generated — grant this permission in Azure Portal → App registrations → API permissions.",
        };
      } else {
        return res.status(resp.status).json({
          error: errMsg || "Failed to create Teams meeting",
          code: errCode,
          hint: "Ensure the Azure AD app has Calendars.ReadWrite application permission with admin consent granted in Azure Portal.",
        });
      }
    }

    // Log to audit_logs
    if (clientId) {
      await query(
        "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('client',$1,$2,'Teams Meeting Scheduled',$3)",
        [
          clientId,
          organizerEmail,
          `Meeting: ${subject} on ${new Date(startTime).toLocaleDateString("en-IN")}${usesFallback ? " (placeholder)" : " — invites sent"}${attachment ? ` | Attachment: ${attachment.name}` : ""}`,
        ],
      ).catch(() => {});
    }

    const joinUrl = data.onlineMeeting?.joinUrl || data.onlineMeeting?.joinWebUrl || data.joinWebUrl;

    res.json({
      joinUrl,
      meetingId: data.id,
      subject: data.subject || subject,
      startDateTime: data.start?.dateTime || new Date(startTime).toISOString(),
      endDateTime: data.end?.dateTime || new Date(endTime).toISOString(),
      teamsLink: joinUrl,
      isFallback: usesFallback,
      fallbackNote: usesFallback ? data._fallbackReason : undefined,
      invitesSent: !usesFallback,
      organizer: organizerEmail,
    });
  } catch (err: any) {
    console.error("[Teams] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teams/calendar — list calendar events for a user ───────────────
// Query: ?email=X&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/calendar", async (req, res) => {
  try {
    const { email, from, to } = req.query as Record<string, string>;
    if (!email) return res.status(400).json({ error: "email is required" });

    const token = await getGraphToken();
    if (!token) return res.status(503).json({ error: "M365 not configured" });

    const startDt = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
    const endDt   = to   ? new Date(to)   : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

    const params = new URLSearchParams({
      startDateTime: startDt.toISOString(),
      endDateTime:   endDt.toISOString(),
      $select: "id,subject,start,end,organizer,attendees,isOnlineMeeting,onlineMeeting,body,location,isCancelled",
      $top: "50",
      $orderby: "start/dateTime asc",
    });

    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${email}/calendarView?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!r.ok) {
      const err: any = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: err?.error?.message || `HTTP ${r.status}` });
    }

    const data: any = await r.json();
    res.json({ events: data.value || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teams/calendar/:id — get single calendar event ─────────────────
router.get("/calendar/:id", async (req, res) => {
  try {
    const { email } = req.query as Record<string, string>;
    if (!email) return res.status(400).json({ error: "email is required" });

    const token = await getGraphToken();
    if (!token) return res.status(503).json({ error: "M365 not configured" });

    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${email}/events/${req.params.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data: any = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || `HTTP ${r.status}` });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/teams/calendar/:id — update calendar event ───────────────────
router.patch("/calendar/:id", async (req, res) => {
  try {
    const { email, subject, startTime, endTime, agenda, attendees } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const token = await getGraphToken();
    if (!token) return res.status(503).json({ error: "M365 not configured" });

    const patch: any = {};
    if (subject) patch.subject = subject;
    if (agenda !== undefined) patch.body = { contentType: "HTML", content: `<p>${(agenda || "").replace(/\n/g, "<br>")}</p>` };
    if (startTime) patch.start = { dateTime: new Date(startTime).toISOString(), timeZone: "UTC" };
    if (endTime)   patch.end   = { dateTime: new Date(endTime).toISOString(),   timeZone: "UTC" };
    if (attendees) patch.attendees = (attendees as string[]).map((a: string) => ({ emailAddress: { address: a }, type: "required" }));

    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${email}/events/${req.params.id}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    const data: any = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || `HTTP ${r.status}` });
    res.json({ ok: true, event: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/teams/calendar/:id — cancel calendar event ──────────────────
router.delete("/calendar/:id", async (req, res) => {
  try {
    const { email } = req.query as Record<string, string>;
    if (!email) return res.status(400).json({ error: "email is required" });

    const token = await getGraphToken();
    if (!token) return res.status(503).json({ error: "M365 not configured" });

    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${email}/events/${req.params.id}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "This meeting has been cancelled via NIYTRI CRM." }),
      },
    );

    if (r.status === 202 || r.ok) return res.json({ ok: true });
    const data: any = await r.json().catch(() => ({}));
    return res.status(r.status).json({ error: data?.error?.message || `HTTP ${r.status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teams/availability — check if Teams is configured ───────────────
router.get("/availability", async (_req, res) => {
  const { tenantId, clientId, clientSecret } = await getM365Config();
  const configured = !!(tenantId && clientId && clientSecret);
  res.json({ configured });
});

// ─── GET /api/teams/settings — get max attachment size ────────────────────────
router.get("/settings", async (_req, res) => {
  try {
    const r = await query("SELECT max_meeting_attachment_mb FROM m365_config LIMIT 1");
    const maxMb = r.rows[0]?.max_meeting_attachment_mb ?? 5;
    res.json({ maxMeetingAttachmentMb: maxMb });
  } catch {
    res.json({ maxMeetingAttachmentMb: 5 });
  }
});

export default router;
