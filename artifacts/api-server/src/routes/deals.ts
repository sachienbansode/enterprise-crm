import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /api/deals — list with filters and pagination
router.get("/", async (req, res) => {
  try {
    const { vertical, stage, type, search, client_id, sort_by = "created_at_desc", page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const pageSize = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * pageSize;

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (vertical) { params.push(vertical); where += ` AND d.vertical = $${params.length}`; }
    if (stage) { params.push(stage); where += ` AND d.stage = $${params.length}`; }
    if (type) { params.push(type); where += ` AND d.type = $${params.length}`; }
    if (client_id) { params.push(client_id); where += ` AND d.client_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (d.deal_code ILIKE $${params.length} OR d.name ILIKE $${params.length})`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM deals d ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(pageSize, offset);
    const result = await query(
      `SELECT d.*, u.name as rm_name, c.name as client_name, c.client_code
        FROM deals d
        LEFT JOIN users u ON d.rm_id = u.id
        LEFT JOIN clients c ON d.client_id = c.id
        ${where}
        ORDER BY ${
          sort_by === "updated_at_desc" ? "d.updated_at DESC" :
          sort_by === "name_asc"        ? "d.name ASC" :
          sort_by === "value_desc"      ? "d.value DESC NULLS LAST, d.created_at DESC" :
          sort_by === "stage_asc"       ? "d.stage ASC, d.created_at DESC" :
                                          "d.created_at DESC"
        }
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: result.rows, total, page: pageNum, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/stats — aggregate stats by vertical
router.get("/stats", async (req, res) => {
  try {
    const byVertical = await query(
      `SELECT vertical, COUNT(*) as count, stage FROM deals GROUP BY vertical, stage ORDER BY vertical, stage`,
    );
    res.json({ byVertical: byVertical.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/:id — single deal
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, u.name as rm_name, c.name as client_name, c.client_code
        FROM deals d
        LEFT JOIN users u ON d.rm_id = u.id
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.id = $1`,
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Deal not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/deals/:id — full update
router.patch("/:id", async (req, res) => {
  try {
    const { name, stage, notes, rm_id, value, type, deal_type, client_id, expected_close, deal_date, updated_by } = req.body;
    const current = await query("SELECT * FROM deals WHERE id=$1", [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: "Deal not found" });
    const prev = current.rows[0];

    const result = await query(
      `UPDATE deals SET
        name = COALESCE($1, name),
        stage = COALESCE($2, stage),
        notes = COALESCE($3, notes),
        rm_id = COALESCE($4, rm_id),
        value = COALESCE($5, value),
        type = COALESCE($6, type),
        deal_type = COALESCE($7, deal_type),
        client_id = COALESCE($8, client_id),
        expected_close = COALESCE($9, expected_close),
        deal_date = COALESCE($10, deal_date),
        updated_at = NOW()
        WHERE id = $11 RETURNING *`,
      [name, stage, notes, rm_id, value, type, deal_type, client_id, expected_close || null, deal_date || null, req.params.id],
    );

    await logAudit({
      entityType: "deal",
      entityId: req.params.id,
      entityCode: prev.deal_code,
      action: "UPDATE",
      userName: updated_by || "System",
      recordDisplay: `${prev.name} (${prev.deal_code})`,
      before: prev,
      after: result.rows[0],
    });

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: reject future dates
function isFutureDate(d: string | undefined): boolean {
  if (!d) return false;
  const parsed = new Date(d);
  return !isNaN(parsed.getTime()) && parsed > new Date();
}

// POST /api/deals — create deal
router.post("/", async (req, res) => {
  try {
    const { name, vertical, type, deal_type, value, stage, client_id, rm_id, notes, deal_date, expected_close } = req.body;
    if (isFutureDate(deal_date)) return res.status(400).json({ error: "Deal date cannot be in the future." });

    const countResult = await query("SELECT COUNT(*) FROM deals WHERE vertical=$1", [vertical]);
    const prefix = vertical === "Retail Broking" ? "RB-D" : vertical === "Corporate Broking" ? "CB-D" : vertical === "Investment Banking" ? "IB-D" : vertical === "AIF" ? "AIF-D" : "IE-D";
    const seq = String(parseInt(countResult.rows[0].count, 10) + 1).padStart(3, "0");
    const deal_code = `${prefix}${seq}`;

    const result = await query(
      `INSERT INTO deals (deal_code, name, vertical, type, deal_type, value, stage, client_id, rm_id, notes, deal_date, expected_close)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE,$11) RETURNING *`,
      [deal_code, name, vertical, type || null, deal_type || null, value || null, stage || "Active", client_id || null, rm_id || null, notes || null, expected_close || null],
    );

    await logAudit({
      entityType: "deal",
      entityId: result.rows[0].id,
      entityCode: deal_code,
      action: "CREATE",
      recordDisplay: `${name} (${deal_code}) — ${vertical}`,
      after: result.rows[0],
    });

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deals/:id — soft-delete deal
router.delete("/:id", async (req, res) => {
  try {
    const existing = await query("SELECT * FROM deals WHERE id=$1", [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: "Deal not found" });
    const deal = existing.rows[0];
    await query("UPDATE deals SET stage='deleted', updated_at=NOW() WHERE id=$1", [req.params.id]);
    await logAudit({
      entityType: "deal",
      entityId: req.params.id,
      entityCode: deal.deal_code,
      action: "DELETE",
      userName: req.body?.deleted_by || "System",
      recordDisplay: `${deal.deal_code} (${deal.name}) — ${deal.vertical}`,
      before: deal,
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
