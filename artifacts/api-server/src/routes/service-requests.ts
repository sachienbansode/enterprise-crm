import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /api/service-requests/stats — summary counts
router.get("/stats", async (req, res) => {
  try {
    const { vertical, assigned_to } = req.query as Record<string, string>;
    const params: any[] = [];
    let where = "WHERE 1=1";
    if (vertical) { params.push(vertical); where += ` AND vertical = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); where += ` AND assigned_to = $${params.length}`; }

    const r = await query(
      `SELECT
        COUNT(*)                                                                           AS total,
        COUNT(*) FILTER (WHERE status = 'Open')                                           AS open,
        COUNT(*) FILTER (WHERE status = 'In Progress')                                    AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Escalated')                                      AS escalated,
        COUNT(*) FILTER (WHERE status = 'Reopened')                                       AS reopened,
        COUNT(*) FILTER (WHERE status NOT IN ('Closed','Resolved') AND sla_deadline < NOW()) AS breached,
        COUNT(*) FILTER (WHERE status = 'Resolved' AND resolved_at::date = CURRENT_DATE) AS resolved_today,
        COUNT(*) FILTER (WHERE status NOT IN ('Closed','Resolved'))                       AS active
       FROM service_requests ${where}`,
      params,
    );
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/service-requests/export.csv
router.get("/export.csv", async (req, res) => {
  try {
    const { status, category, priority, vertical, search, assigned_to } = req.query as Record<string, string>;
    const params: any[] = [];
    let where = "WHERE 1=1";
    if (status)    { params.push(status);     where += ` AND sr.status = $${params.length}`; }
    if (category)  { params.push(category);   where += ` AND sr.category = $${params.length}`; }
    if (priority)  { params.push(priority);   where += ` AND sr.priority = $${params.length}`; }
    if (vertical)  { params.push(vertical);   where += ` AND sr.vertical = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); where += ` AND sr.assigned_to = $${params.length}`; }
    if (search)    {
      params.push(`%${search}%`);
      where += ` AND (sr.sr_code ILIKE $${params.length} OR sr.subject ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    const result = await query(
      `SELECT sr.sr_code, sr.subject, sr.category, sr.subcategory, sr.channel, sr.priority,
              sr.status, sr.sla_status, sr.sla_deadline, sr.vertical,
              c.name AS client_name, c.client_code,
              creator.name AS created_by_name, assignee.name AS assigned_to_name,
              sr.created_at, sr.updated_at, sr.resolved_at, sr.resolution_notes
       FROM service_requests sr
       LEFT JOIN clients c ON sr.client_id = c.id
       LEFT JOIN users creator ON sr.created_by = creator.id
       LEFT JOIN users assignee ON sr.assigned_to = assignee.id
       ${where}
       ORDER BY sr.created_at DESC
       LIMIT 5000`,
      params,
    );

    const headers = ["SR Code","Subject","Category","Subcategory","Channel","Priority","Status","SLA Status","SLA Deadline","Vertical","Client Code","Client Name","Created By","Assigned To","Created At","Updated At","Resolved At","Resolution Notes"];
    const rows = result.rows.map(r => [
      r.sr_code, `"${(r.subject||"").replace(/"/g,'""')}"`, r.category, r.subcategory||"", r.channel,
      r.priority, r.status, r.sla_status, r.sla_deadline ? new Date(r.sla_deadline).toISOString() : "",
      r.vertical||"", r.client_code||"", `"${(r.client_name||"").replace(/"/g,'""')}"`,
      r.created_by_name||"", r.assigned_to_name||"",
      new Date(r.created_at).toISOString(), new Date(r.updated_at).toISOString(),
      r.resolved_at ? new Date(r.resolved_at).toISOString() : "",
      `"${(r.resolution_notes||"").replace(/"/g,'""')}"`,
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="service-requests-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/service-requests
router.get("/", async (req, res) => {
  try {
    const {
      status, category, channel, priority, vertical, search,
      assigned_to, assigned_to_me, user_id, date_from, date_to,
      sla_status, sort_by = "created_at_desc", page = "1", limit = "20",
    } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const pageSize = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * pageSize;

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (status) {
      const vals = status.split(",").filter(Boolean);
      if (vals.length === 1) { params.push(vals[0]); where += ` AND sr.status = $${params.length}`; }
      else { params.push(vals); where += ` AND sr.status = ANY($${params.length})`; }
    }
    if (category) {
      const vals = category.split(",").filter(Boolean);
      if (vals.length === 1) { params.push(vals[0]); where += ` AND sr.category = $${params.length}`; }
      else { params.push(vals); where += ` AND sr.category = ANY($${params.length})`; }
    }
    if (channel) {
      const vals = channel.split(",").filter(Boolean);
      if (vals.length === 1) { params.push(vals[0]); where += ` AND sr.channel = $${params.length}`; }
      else { params.push(vals); where += ` AND sr.channel = ANY($${params.length})`; }
    }
    if (priority) {
      const vals = priority.split(",").filter(Boolean);
      if (vals.length === 1) { params.push(vals[0]); where += ` AND sr.priority = $${params.length}`; }
      else { params.push(vals); where += ` AND sr.priority = ANY($${params.length})`; }
    }
    if (vertical) {
      const vals = vertical.split(",").filter(Boolean);
      if (vals.length === 1) { params.push(vals[0]); where += ` AND sr.vertical = $${params.length}`; }
      else { params.push(vals); where += ` AND sr.vertical = ANY($${params.length})`; }
    }
    if (sla_status) {
      params.push(sla_status); where += ` AND sr.sla_status = $${params.length}`;
    }
    if (assigned_to_me === "1" && user_id) {
      params.push(user_id); where += ` AND sr.assigned_to = $${params.length}`;
    } else if (assigned_to) {
      params.push(assigned_to); where += ` AND sr.assigned_to = $${params.length}`;
    }
    if (date_from) { params.push(date_from); where += ` AND sr.created_at >= $${params.length}`; }
    if (date_to)   { params.push(date_to);   where += ` AND sr.created_at <= $${params.length} + INTERVAL '1 day'`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (sr.sr_code ILIKE $${params.length} OR sr.subject ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.client_code ILIKE $${params.length} OR c.pan ILIKE $${params.length} OR c.mobile ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM service_requests sr LEFT JOIN clients c ON sr.client_id = c.id ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT sr.*, c.name as client_name, c.client_code,
        creator.name as created_by_name, assignee.name as assigned_to_name,
        assignee.email as assigned_to_email
        FROM service_requests sr
        LEFT JOIN clients c ON sr.client_id = c.id
        LEFT JOIN users creator ON sr.created_by = creator.id
        LEFT JOIN users assignee ON sr.assigned_to = assignee.id
        ${where}
        ORDER BY ${
          sort_by === "updated_at_desc"  ? "sr.updated_at DESC" :
          sort_by === "priority_asc"     ? "CASE sr.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END ASC, sr.created_at DESC" :
          sort_by === "sla_deadline_asc" ? "sr.sla_deadline ASC NULLS LAST, sr.created_at DESC" :
          sort_by === "subject_asc"      ? "sr.subject ASC" :
                                           "sr.created_at DESC"
        }
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: result.rows, total, page: pageNum, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/service-requests/:id — SR with messages, audit and docs
router.get("/:id", async (req, res) => {
  try {
    const srResult = await query(
      `SELECT sr.*, c.name as client_name, c.client_code, c.email as client_email, c.mobile as client_mobile,
        creator.name as created_by_name, assignee.name as assigned_to_name, assignee.email as assigned_to_email
        FROM service_requests sr
        LEFT JOIN clients c ON sr.client_id = c.id
        LEFT JOIN users creator ON sr.created_by = creator.id
        LEFT JOIN users assignee ON sr.assigned_to = assignee.id
        WHERE sr.id = $1`,
      [req.params.id],
    );
    if (!srResult.rows.length) return res.status(404).json({ error: "SR not found" });

    const [messages, auditLog, docs] = await Promise.all([
      query("SELECT * FROM sr_messages WHERE sr_id = $1 ORDER BY created_at ASC", [req.params.id]),
      query("SELECT * FROM audit_logs WHERE entity_type='service_request' AND entity_id=$1 ORDER BY created_at ASC", [req.params.id]),
      query(
        `SELECT d.*, dv.version as current_ver, u.name as uploaded_by_name
         FROM documents d
         LEFT JOIN document_versions dv ON d.id = dv.document_id AND dv.version = d.current_version
         LEFT JOIN users u ON d.created_by = u.id
         WHERE d.sr_id = $1 ORDER BY d.created_at DESC`,
        [req.params.id],
      ),
    ]);

    res.json({ ...srResult.rows[0], messages: messages.rows, auditLog: auditLog.rows, documents: docs.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service-requests — create SR
router.post("/", async (req, res) => {
  try {
    const { subject, description, category, subcategory, channel, priority, client_id, vertical, created_by, assigned_to } = req.body;

    // Prefer subcategory-specific SLA, fall back to category-level
    let slaResult = subcategory
      ? await query("SELECT * FROM sla_config WHERE category=$1 AND subcategory=$2", [category, subcategory])
      : { rows: [] };
    if (!slaResult.rows.length) {
      slaResult = await query("SELECT * FROM sla_config WHERE category=$1 AND subcategory IS NULL", [category]);
    }
    const sla = slaResult.rows[0];
    const tatHours = sla?.tat_hours || 24;
    const slaDeadline = new Date(Date.now() + tatHours * 60 * 60 * 1000);

    const countResult = await query("SELECT COUNT(*) FROM service_requests");
    const seq = 5800 + parseInt(countResult.rows[0].count, 10) + 1;
    const sr_code = `SR-${seq}`;

    const result = await query(
      `INSERT INTO service_requests (sr_code, subject, description, category, subcategory, channel, priority, client_id, vertical, created_by, assigned_to, sla_deadline, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Open') RETURNING *`,
      [sr_code, subject, description, category, subcategory, channel, priority, client_id, vertical, created_by, assigned_to || created_by, slaDeadline],
    );

    const srId = result.rows[0].id;
    await logAudit({
      entityType: "service_request",
      entityId: srId,
      entityCode: sr_code,
      action: "CREATE",
      userId: created_by || null,
      recordDisplay: `${sr_code} — ${subject}`,
      after: result.rows[0],
    });

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/service-requests/:id — update SR fields
router.patch("/:id", async (req, res) => {
  try {
    const { status, assigned_to, priority, subject, description, resolution_notes, updated_by, update_note } = req.body;

    const current = await query("SELECT * FROM service_requests WHERE id=$1", [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: "SR not found" });
    const prev = current.rows[0];

    const result = await query(
      `UPDATE service_requests SET
        status = COALESCE($1, status),
        assigned_to = COALESCE($2, assigned_to),
        priority = COALESCE($3, priority),
        subject = COALESCE($4, subject),
        description = COALESCE($5, description),
        resolution_notes = COALESCE($6, resolution_notes),
        resolved_at = CASE WHEN $1 = 'Resolved' AND status != 'Resolved' THEN NOW() ELSE resolved_at END,
        closed_at   = CASE WHEN $1 = 'Closed'   AND status != 'Closed'   THEN NOW() ELSE closed_at   END,
        updated_at  = NOW()
       WHERE id=$7 RETURNING *`,
      [status, assigned_to, priority, subject, description, resolution_notes, req.params.id],
    );

    const changes: string[] = [];
    if (status       && status       !== prev.status)       changes.push(`Status: ${prev.status} → ${status}`);
    if (priority     && priority     !== prev.priority)     changes.push(`Priority: ${prev.priority} → ${priority}`);
    if (assigned_to  && assigned_to  !== prev.assigned_to)  changes.push(`Reassigned to new agent`);
    if (subject      && subject      !== prev.subject)      changes.push(`Subject updated`);
    if (description  && description  !== prev.description)  changes.push(`Description updated`);
    if (resolution_notes && resolution_notes !== prev.resolution_notes) changes.push(`Resolution notes updated`);

    await logAudit({
      entityType: "service_request",
      entityId: req.params.id,
      entityCode: prev.sr_code,
      action: "UPDATE",
      userName: updated_by || "System",
      recordDisplay: `${prev.sr_code} — ${prev.subject}`,
      before: prev,
      after: result.rows[0],
    });

    const finalResult = await query(
      `SELECT sr.*, c.name as client_name, c.client_code,
        creator.name as created_by_name, assignee.name as assigned_to_name
        FROM service_requests sr
        LEFT JOIN clients c ON sr.client_id = c.id
        LEFT JOIN users creator ON sr.created_by = creator.id
        LEFT JOIN users assignee ON sr.assigned_to = assignee.id
        WHERE sr.id = $1`,
      [req.params.id],
    );

    res.json(finalResult.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service-requests/:id/escalate
router.post("/:id/escalate", async (req, res) => {
  try {
    const { escalated_by, reason } = req.body;
    const r = await query(
      "UPDATE service_requests SET status='Escalated', updated_at=NOW() WHERE id=$1 AND status NOT IN ('Closed','Resolved') RETURNING *",
      [req.params.id],
    );
    if (!r.rows.length) return res.status(400).json({ error: "SR cannot be escalated in its current state" });
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('service_request',$1,$2,'Escalated',$3)",
      [req.params.id, escalated_by || "System", reason || "SR escalated"],
    );
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service-requests/:id/reopen
router.post("/:id/reopen", async (req, res) => {
  try {
    const { reopened_by, reason } = req.body;
    const r = await query(
      "UPDATE service_requests SET status='Reopened', resolved_at=NULL, closed_at=NULL, updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id],
    );
    if (!r.rows.length) return res.status(404).json({ error: "SR not found" });
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('service_request',$1,$2,'Reopened',$3)",
      [req.params.id, reopened_by || "System", reason || "SR reopened"],
    );
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service-requests/:id/messages
router.post("/:id/messages", async (req, res) => {
  try {
    const { sender_id, sender_name, from_type, message } = req.body;
    const result = await query(
      "INSERT INTO sr_messages (sr_id, sender_id, sender_name, from_type, message) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [req.params.id, sender_id, sender_name, from_type || "agent", message],
    );
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('service_request',$1,$2,'Reply Sent',$3)",
      [req.params.id, sender_name, message.slice(0, 100)],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/service-requests/:id/messages
router.get("/:id/messages", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM sr_messages WHERE sr_id = $1 ORDER BY created_at ASC",
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
