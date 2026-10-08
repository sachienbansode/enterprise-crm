import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";

const router = Router();

// ─── helpers ──────────────────────────────────────────────────────────────────
const OWNER_SELECT = `
  ow.id   AS owner_id,
  ow.name AS owner_name,
  ow.email AS owner_email
`;

// ─── GET /api/clients — list ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { search, searchField, type, status, kyc, kyc_status, vertical, page = "1", limit = "15" } =
      req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const pageSize = Math.min(parseInt(limit, 10), 50);
    const offset = (pageNum - 1) * pageSize;
    const verticalName = vertical || null;

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (search) {
      if (searchField === "client_code" || searchField === "code") { params.push(`%${search}%`); where += ` AND c.client_code ILIKE $${params.length}`; }
      else if (searchField === "pan") { params.push(`%${search}%`); where += ` AND c.pan ILIKE $${params.length}`; }
      else if (searchField === "mobile") { params.push(`%${search}%`); where += ` AND c.mobile ILIKE $${params.length}`; }
      else if (searchField === "email") { params.push(`%${search}%`); where += ` AND c.email ILIKE $${params.length}`; }
      else if (searchField === "demat") { params.push(`%${search}%`); where += ` AND c.demat_account ILIKE $${params.length}`; }
      else {
        params.push(`%${search}%`);
        where += ` AND (c.name ILIKE $${params.length} OR c.client_code ILIKE $${params.length} OR c.pan ILIKE $${params.length} OR c.mobile ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
      }
    }
    if (type) { params.push(type); where += ` AND c.type = $${params.length}`; }
    if (status) { params.push(status); where += ` AND c.status = $${params.length}`; }
    const kycFilter = kyc_status || kyc;
    if (kycFilter) { params.push(kycFilter); where += ` AND c.kyc_status = $${params.length}`; }
    if (verticalName) { params.push(verticalName); where += ` AND c.id IN (SELECT client_id FROM client_verticals WHERE vertical = $${params.length})`; }

    const countResult = await query(`SELECT COUNT(DISTINCT c.id) FROM clients c ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT c.*, u.name as rm_name, ${OWNER_SELECT},
        array_agg(cv2.vertical) FILTER (WHERE cv2.vertical IS NOT NULL) as verticals
        FROM clients c
        LEFT JOIN users u ON c.rm_id = u.id
        LEFT JOIN users ow ON c.owner_id = ow.id
        LEFT JOIN client_verticals cv2 ON c.id = cv2.client_id
        ${where}
        GROUP BY c.id, u.name, ow.id, ow.name, ow.email
        ORDER BY c.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: result.rows, total, page: pageNum, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/clients/:code — single client by client code ───────────────────
router.get("/:code", async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.name as rm_name, ${OWNER_SELECT},
        array_agg(cv.vertical) FILTER (WHERE cv.vertical IS NOT NULL) as verticals
        FROM clients c
        LEFT JOIN users u ON c.rm_id = u.id
        LEFT JOIN users ow ON c.owner_id = ow.id
        LEFT JOIN client_verticals cv ON c.id = cv.client_id
        WHERE c.client_code = $1
        GROUP BY c.id, u.name, ow.id, ow.name, ow.email`,
      [req.params.code],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Client not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/clients/by-id/:id — single client by UUID ──────────────────────
router.get("/by-id/:id", async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, u.name as rm_name, ${OWNER_SELECT},
        array_agg(DISTINCT cv.vertical) FILTER (WHERE cv.vertical IS NOT NULL) as verticals
        FROM clients c
        LEFT JOIN users u ON c.rm_id = u.id
        LEFT JOIN users ow ON c.owner_id = ow.id
        LEFT JOIN client_verticals cv ON c.id = cv.client_id
        WHERE c.id = $1
        GROUP BY c.id, u.name, ow.id, ow.name, ow.email`,
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Client not found" });
    const client = result.rows[0];
    const contacts = await query(`SELECT * FROM client_contacts WHERE client_id=$1 ORDER BY is_primary DESC, created_at ASC`, [req.params.id]);
    res.json({ ...client, contacts: contacts.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/clients — create client ────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      name, type, category, pan, mobile, email, address, rm_id, risk_profile,
      demat_account, dp_id, ckyc_id, verticals, owner_id, created_by_id,
      status = "Active", kyc_status = "Pending", fatca_status = "Pending",
      date_of_birth, date_of_incorporation, notes, landline, contacts = [],
    } = req.body;
    const prefix = type === "Individual" ? "NIYT-I" : category === "Trust" ? "NIYT-T" : category?.includes("FPI") || category?.includes("FII") ? "NIYT-F" : category?.includes("Mutual Fund") ? "NIYT-M" : "NIYT-C";
    const countResult = await query("SELECT COUNT(*) FROM clients WHERE client_code LIKE $1", [`${prefix}%`]);
    const seq = String(parseInt(countResult.rows[0].count, 10) + 1).padStart(6, "0");
    const client_code = `${prefix}-${seq}`;

    let resolvedOwner = owner_id || created_by_id || null;
    if (!resolvedOwner) {
      const sa = await query("SELECT id FROM users WHERE role ILIKE '%super%admin%' LIMIT 1");
      resolvedOwner = sa.rows[0]?.id || null;
    }

    const result = await query(
      `INSERT INTO clients (client_code, name, type, category, pan, mobile, email, address, rm_id,
        risk_profile, demat_account, dp_id, ckyc_id, status, kyc_status, fatca_status,
        date_of_birth, date_of_incorporation, notes, landline, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [client_code, name, type, category, pan || null, mobile || null, email || null, address || null,
       rm_id || null, risk_profile || null, demat_account || null, dp_id || null, ckyc_id || null,
       status, kyc_status, fatca_status, date_of_birth || null, date_of_incorporation || null,
       notes || null, landline || null, resolvedOwner],
    );
    const clientId = result.rows[0].id;

    if (verticals?.length) {
      for (const v of verticals) {
        await query("INSERT INTO client_verticals (client_id, vertical) VALUES ($1,$2) ON CONFLICT DO NOTHING", [clientId, v]);
      }
    }

    for (const contact of contacts) {
      if (contact.value?.trim()) {
        await query(
          `INSERT INTO client_contacts (client_id, contact_type, value, label, is_primary) VALUES ($1,$2,$3,$4,$5)`,
          [clientId, contact.contact_type, contact.value, contact.label || "Primary", contact.is_primary || false],
        );
      }
    }

    await logAudit({
      entityType: "client",
      entityId: clientId,
      entityCode: client_code,
      action: "CREATE",
      userId: created_by_id || null,
      userName: req.body.created_by_name || "System",
      recordDisplay: `${name} (${client_code})`,
      after: result.rows[0],
    });
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/clients/:id — full update client ─────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const {
      name, status, kyc_status, risk_profile, mobile, email, address, landline, notes,
      rm_id, fatca_status, demat_account, dp_id, ckyc_id,
      date_of_birth, date_of_incorporation, verticals, contacts,
    } = req.body;

    const prevResult = await query("SELECT * FROM clients WHERE id=$1", [req.params.id]);
    if (!prevResult.rows.length) return res.status(404).json({ error: "Client not found" });
    const prevClient = prevResult.rows[0];

    const result = await query(
      `UPDATE clients SET
        name=COALESCE($1,name), status=COALESCE($2,status), kyc_status=COALESCE($3,kyc_status),
        risk_profile=COALESCE($4,risk_profile), mobile=COALESCE($5,mobile), email=COALESCE($6,email),
        address=COALESCE($7,address), landline=COALESCE($8,landline), notes=COALESCE($9,notes),
        rm_id=COALESCE($10,rm_id), fatca_status=COALESCE($11,fatca_status),
        demat_account=COALESCE($12,demat_account), dp_id=COALESCE($13,dp_id),
        ckyc_id=COALESCE($14,ckyc_id), date_of_birth=COALESCE($15,date_of_birth),
        date_of_incorporation=COALESCE($16,date_of_incorporation), updated_at=NOW()
       WHERE id=$17 RETURNING *`,
      [name, status, kyc_status, risk_profile, mobile, email, address, landline, notes,
       rm_id, fatca_status, demat_account, dp_id, ckyc_id,
       date_of_birth || null, date_of_incorporation || null, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Client not found" });

    if (Array.isArray(verticals)) {
      await query("DELETE FROM client_verticals WHERE client_id=$1", [req.params.id]);
      for (const v of verticals) {
        await query("INSERT INTO client_verticals (client_id, vertical) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.params.id, v]);
      }
    }

    if (Array.isArray(contacts)) {
      await query("DELETE FROM client_contacts WHERE client_id=$1", [req.params.id]);
      for (const contact of contacts) {
        if (contact.value?.trim()) {
          await query(
            `INSERT INTO client_contacts (client_id, contact_type, value, label, is_primary) VALUES ($1,$2,$3,$4,$5)`,
            [req.params.id, contact.contact_type, contact.value, contact.label || "Primary", contact.is_primary || false],
          );
        }
      }
    }

    await logAudit({
      entityType: "client",
      entityId: req.params.id,
      entityCode: prevClient.client_code,
      action: "UPDATE",
      userId: req.body.updated_by_id || null,
      userName: req.body.updated_by_name || "System",
      userRole: req.body.updated_by_role || null,
      recordDisplay: `${prevClient.name} (${prevClient.client_code})`,
      before: prevClient,
      after: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/clients/:id/owner — change owner (super admin only) ─────────────
router.put("/:id/owner", async (req, res) => {
  try {
    const { new_owner_id, changed_by, changed_by_name, changed_by_role } = req.body;
    if (!changed_by_role?.toLowerCase().includes("super")) {
      return res.status(403).json({ error: "Only Super Admin can change client owner." });
    }
    if (!new_owner_id) return res.status(400).json({ error: "new_owner_id required" });

    const old = await query("SELECT owner_id FROM clients WHERE id=$1", [req.params.id]);
    if (!old.rows.length) return res.status(404).json({ error: "Client not found" });
    const oldOwnerId = old.rows[0].owner_id;

    await query("UPDATE clients SET owner_id=$1, updated_at=NOW() WHERE id=$2", [new_owner_id, req.params.id]);

    await logAudit({
      entityType: "client",
      entityId: req.params.id,
      action: "UPDATE",
      userId: changed_by || null,
      userName: changed_by_name || "System",
      userRole: changed_by_role || null,
      recordDisplay: `Client Owner Changed`,
      before: { owner_id: oldOwnerId },
      after: { owner_id: new_owner_id },
    });

    // Notify new owner
    await query(
      "INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'owner_assigned','You are now a Client Owner','You have been assigned as owner of a client record. You can now view full PII and documents.','client',$2)",
      [new_owner_id, req.params.id],
    ).catch(() => {});

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/clients/:id/access-request — submit PII access request ─────────
router.post("/:id/access-request", async (req, res) => {
  try {
    const { requester_id, requester_name, request_type = "pii", reason } = req.body;
    const clientId = req.params.id;

    // Auto-expire stale pending requests before checking for duplicates
    await query(
      "UPDATE client_access_requests SET status='expired' WHERE status='pending' AND expires_at IS NOT NULL AND expires_at < NOW()",
    ).catch(() => {});

    // Check if an active (non-expired) pending request already exists
    const existing = await query(
      "SELECT id FROM client_access_requests WHERE client_id=$1 AND requester_id=$2 AND status='pending'",
      [clientId, requester_id],
    );
    if (existing.rows.length) return res.status(409).json({ error: "A pending request already exists for this client. Please wait for the owner to respond." });

    const result = await query(
      `INSERT INTO client_access_requests (client_id, requester_id, requester_name, request_type, reason, expires_at)
       VALUES ($1,$2,$3,$4,$5, NOW() + INTERVAL '7 days') RETURNING *`,
      [clientId, requester_id, requester_name, request_type, reason],
    );

    // Fetch client owner + super admins to notify
    const clientRow = await query("SELECT owner_id, client_code, name FROM clients WHERE id=$1", [clientId]);
    const ownerId = clientRow.rows[0]?.owner_id;
    const clientLabel = `${clientRow.rows[0]?.name} (${clientRow.rows[0]?.client_code})`;

    const notifyUsers: string[] = [];
    if (ownerId) notifyUsers.push(ownerId);
    const superAdmins = await query("SELECT id FROM users WHERE role ILIKE '%super%admin%'");
    for (const u of superAdmins.rows) {
      if (u.id !== ownerId) notifyUsers.push(u.id);
    }

    for (const uid of notifyUsers) {
      await query(
        "INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,'access_request','PII Access Request',$2,'client',$3)",
        [uid, `${requester_name} requested ${request_type.toUpperCase()} access to client ${clientLabel}. Reason: ${reason || "Not specified"}`, clientId],
      ).catch(() => {});
    }

    // Audit log
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('client',$1,$2,'PII Access Requested',$3)",
      [clientId, requester_name || "Unknown", `${requester_name} requested PII access to ${clientLabel}. Reason: ${reason || "Not specified"}`],
    ).catch(() => {});

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/clients/:id/access-requests — list requests for a client ────────
router.get("/:id/access-requests", async (req, res) => {
  try {
    // Auto-expire stale pending requests
    await query(
      "UPDATE client_access_requests SET status='expired' WHERE status='pending' AND expires_at IS NOT NULL AND expires_at < NOW()",
    ).catch(() => {});

    const result = await query(
      `SELECT car.*, u.name as reviewer_name, c.name as client_name, c.client_code
       FROM client_access_requests car
       LEFT JOIN users u ON car.reviewed_by = u.id
       LEFT JOIN clients c ON car.client_id = c.id
       WHERE car.client_id = $1
       ORDER BY car.created_at DESC`,
      [req.params.id],
    );
    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/access-requests — list requests for requester or approver ────────
router.get("/access-requests/list", async (req, res) => {
  try {
    const { user_id, role } = req.query as Record<string, string>;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    // Auto-expire stale pending requests
    await query(
      "UPDATE client_access_requests SET status='expired' WHERE status='pending' AND expires_at IS NOT NULL AND expires_at < NOW()",
    ).catch(() => {});

    let rows;
    if (role === "approver") {
      // Approver: requests on clients I own + super admin sees all pending
      const isSuperAdmin = req.query.is_super_admin === "true";
      if (isSuperAdmin) {
        const result = await query(
          `SELECT car.*, c.name as client_name, c.client_code, c.owner_id,
            u.name as reviewer_name
           FROM client_access_requests car
           JOIN clients c ON car.client_id = c.id
           LEFT JOIN users u ON car.reviewed_by = u.id
           WHERE car.status = 'pending'
           ORDER BY car.created_at ASC`,
        );
        rows = result.rows;
      } else {
        const result = await query(
          `SELECT car.*, c.name as client_name, c.client_code, c.owner_id,
            u.name as reviewer_name
           FROM client_access_requests car
           JOIN clients c ON car.client_id = c.id
           LEFT JOIN users u ON car.reviewed_by = u.id
           WHERE car.status = 'pending' AND c.owner_id = $1
           ORDER BY car.created_at ASC`,
          [user_id],
        );
        rows = result.rows;
      }
    } else {
      // Requester: my own requests
      const result = await query(
        `SELECT car.*, c.name as client_name, c.client_code, c.owner_id,
          u.name as reviewer_name
         FROM client_access_requests car
         JOIN clients c ON car.client_id = c.id
         LEFT JOIN users u ON car.reviewed_by = u.id
         WHERE car.requester_id = $1
         ORDER BY car.created_at DESC`,
        [user_id],
      );
      rows = result.rows;
    }

    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/clients/access-request/:reqId — approve or deny ────────────────
router.put("/access-request/:reqId", async (req, res) => {
  try {
    const { status, review_comment, reviewed_by, reviewed_by_name, reviewed_by_role } = req.body;
    if (!["approved", "denied"].includes(status)) return res.status(400).json({ error: "status must be approved or denied" });

    const isSuperAdmin = (reviewed_by_role || "").toLowerCase().includes("super");
    const reqRow = await query(
      `SELECT car.*, c.owner_id, c.name as client_name, c.client_code FROM client_access_requests car
       JOIN clients c ON car.client_id = c.id
       WHERE car.id=$1`,
      [req.params.reqId],
    );
    if (!reqRow.rows.length) return res.status(404).json({ error: "Request not found" });
    const row = reqRow.rows[0];

    if (row.status !== "pending") return res.status(409).json({ error: `Request is already ${row.status}.` });

    if (!isSuperAdmin && row.owner_id !== reviewed_by) {
      return res.status(403).json({ error: "Only the client owner or Super Admin can review access requests." });
    }

    await query(
      "UPDATE client_access_requests SET status=$1, review_comment=$2, reviewed_by=$3, reviewed_by_name=$4, reviewed_at=NOW() WHERE id=$5",
      [status, review_comment, reviewed_by, reviewed_by_name || "System", req.params.reqId],
    );

    // Notify requester
    const verb = status === "approved" ? "approved" : "denied";
    await query(
      "INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id) VALUES ($1,$2,$3,$4,'client',$5)",
      [
        row.requester_id,
        `access_${status}`,
        `PII Access ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your PII access request for ${row.client_name} (${row.client_code}) has been ${verb} by ${reviewed_by_name || "the owner"}.${review_comment ? " Note: " + review_comment : ""}`,
        row.client_id,
      ],
    ).catch(() => {});

    // Audit log
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('client',$1,$2,$3,$4)",
      [
        row.client_id,
        reviewed_by_name || "System",
        `PII Access ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `${reviewed_by_name || "Owner"} ${verb} PII access for ${row.requester_name} on client ${row.client_name} (${row.client_code}).${review_comment ? " Comment: " + review_comment : ""}`,
      ],
    ).catch(() => {});

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
