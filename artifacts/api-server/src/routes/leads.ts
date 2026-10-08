import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /api/leads — list with filters and pagination
router.get("/", async (req, res) => {
  try {
    const { vertical, stage, priority, status, search, client_id, sort_by = "created_at_desc", page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const pageSize = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * pageSize;

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (vertical) { params.push(vertical); where += ` AND l.vertical = $${params.length}`; }
    if (stage) { params.push(stage); where += ` AND l.stage = $${params.length}`; }
    if (priority) { params.push(priority); where += ` AND l.priority = $${params.length}`; }
    if (status) { params.push(status); where += ` AND l.status = $${params.length}`; }
    if (client_id) { params.push(client_id); where += ` AND l.client_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (l.lead_code ILIKE $${params.length} OR l.name ILIKE $${params.length})`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM leads l ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT l.*, u.name as rm_name, c.name as client_name, c.client_code,
        EXTRACT(DAY FROM NOW() - l.opened_at)::int as days_open
        FROM leads l
        LEFT JOIN users u ON l.assigned_rm_id = u.id
        LEFT JOIN clients c ON l.client_id = c.id
        ${where}
        ORDER BY ${
          sort_by === "updated_at_desc"  ? "l.updated_at DESC" :
          sort_by === "priority_asc"     ? "CASE l.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END ASC, l.created_at DESC" :
          sort_by === "days_open_desc"   ? "EXTRACT(DAY FROM NOW() - l.opened_at) DESC NULLS LAST, l.created_at DESC" :
          sort_by === "name_asc"         ? "l.name ASC" :
          sort_by === "value_desc"       ? "l.value_estimate DESC NULLS LAST, l.created_at DESC" :
                                           "l.created_at DESC"
        }
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: result.rows, total, page: pageNum, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/stats — aggregate stats by vertical
router.get("/stats", async (req, res) => {
  try {
    const byVertical = await query(
      `SELECT vertical, COUNT(*) as count, stage FROM leads GROUP BY vertical, stage ORDER BY vertical, stage`,
    );
    const byPriority = await query(
      `SELECT vertical, priority, COUNT(*) as count FROM leads GROUP BY vertical, priority ORDER BY vertical`,
    );
    res.json({ byVertical: byVertical.rows, byPriority: byPriority.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id — single lead
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, u.name as rm_name, c.name as client_name, c.client_code,
        EXTRACT(DAY FROM NOW() - l.opened_at)::int as days_open
        FROM leads l
        LEFT JOIN users u ON l.assigned_rm_id = u.id
        LEFT JOIN clients c ON l.client_id = c.id
        WHERE l.id = $1`,
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Lead not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id — full update
router.patch("/:id", async (req, res) => {
  try {
    const { name, stage, priority, status, notes, assigned_rm_id, client_id, source, sub_source, product, deal_type, value_estimate, expected_close, updated_by } = req.body;
    const current = await query("SELECT * FROM leads WHERE id=$1", [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: "Lead not found" });
    const prev = current.rows[0];

    const result = await query(
      `UPDATE leads SET
        name = COALESCE($1, name),
        stage = COALESCE($2, stage),
        priority = COALESCE($3, priority),
        status = COALESCE($4, status),
        notes = COALESCE($5, notes),
        assigned_rm_id = COALESCE($6, assigned_rm_id),
        client_id = COALESCE($7, client_id),
        source = COALESCE($8, source),
        sub_source = COALESCE($9, sub_source),
        product = COALESCE($10, product),
        deal_type = COALESCE($11, deal_type),
        value_estimate = COALESCE($12, value_estimate),
        expected_close = COALESCE($13, expected_close),
        updated_at = NOW()
        WHERE id = $14 RETURNING *`,
      // source / sub_source are fixed after creation → never updated here
      // lead name is fixed after creation too
      [null, stage, priority, status, notes, assigned_rm_id, client_id, null, null, product, deal_type, value_estimate, expected_close || null, req.params.id],
    );

    await logAudit({
      entityType: "lead",
      entityId: req.params.id,
      entityCode: prev.lead_code,
      action: "UPDATE",
      userName: req.user?.name || updated_by || "System",
      userId: req.user?.id,
      userRole: req.user?.role,
      recordDisplay: `${prev.name} (${prev.lead_code})`,
      before: prev,
      after: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: is a date string in the future?
function isFutureDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d > new Date();
}

// POST /api/leads — create lead
router.post("/", async (req, res) => {
  try {
    const { name, vertical, stage, priority, value_estimate, source, sub_source, product, deal_type, assigned_rm_id, client_id, notes, opened_at, closed_at, expected_close } = req.body;
    if (isFutureDate(opened_at)) return res.status(400).json({ error: "Lead open date cannot be in the future." });
    if (isFutureDate(closed_at)) return res.status(400).json({ error: "Lead close date cannot be in the future." });

    const countResult = await query("SELECT COUNT(*) FROM leads WHERE vertical=$1", [vertical]);
    const prefix = vertical === "Retail Broking" ? "RB" : vertical === "Corporate Broking" ? "CB" : vertical === "Investment Banking" ? "IB" : vertical === "AIF" ? "AIF" : "IE";
    const seq = 1000 + parseInt(countResult.rows[0].count, 10) + 1;
    const lead_code = `${prefix}-${seq}`;

    const result = await query(
      `INSERT INTO leads (lead_code, name, vertical, stage, priority, value_estimate, source, sub_source, product, deal_type, assigned_rm_id, client_id, notes, expected_close, opened_at, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),$15,$16) RETURNING *`,
      [lead_code, name, vertical, stage || "new", priority || "Medium", value_estimate || null, source || null, sub_source || null, product || null, deal_type || null, assigned_rm_id || null, client_id || null, notes || null, expected_close || null, req.user?.id || null, req.user?.name || null],
    );

    await logAudit({
      entityType: "lead",
      entityId: result.rows[0].id,
      entityCode: lead_code,
      action: "CREATE",
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      recordDisplay: `${name} (${lead_code}) — ${vertical}`,
      after: result.rows[0],
    });

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id — soft-delete lead
router.delete("/:id", async (req, res) => {
  try {
    const existing = await query("SELECT * FROM leads WHERE id=$1", [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Lead not found" });
    const lead = existing.rows[0];
    await query("UPDATE leads SET stage='deleted', updated_at=NOW() WHERE id=$1", [req.params.id]);
    await logAudit({
      entityType: "lead",
      entityId: req.params.id,
      entityCode: lead.lead_code,
      action: "DELETE",
      userName: req.body?.deleted_by || "System",
      recordDisplay: `${lead.lead_code} (${lead.name}) — ${lead.vertical}`,
      before: lead,
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
