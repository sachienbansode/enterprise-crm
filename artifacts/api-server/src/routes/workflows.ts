import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

// GET /api/workflows?vertical=...&entity_type=lead|deal
router.get("/", async (req, res) => {
  try {
    const { vertical, entity_type } = req.query as Record<string, string>;
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (vertical) { params.push(vertical); where += ` AND vertical = $${params.length}`; }
    if (entity_type) { params.push(entity_type); where += ` AND entity_type = $${params.length}`; }
    const result = await query(
      `SELECT * FROM lead_workflows ${where} ORDER BY vertical, entity_type, stage_order`,
      params,
    );
    res.json({ data: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows — create stage
router.post("/", async (req, res) => {
  try {
    const { vertical, entity_type, stage_id, stage_label, stage_order, stage_color, is_won, is_lost } = req.body;
    if (!vertical || !entity_type || !stage_id || !stage_label) {
      return res.status(400).json({ error: "vertical, entity_type, stage_id, stage_label required" });
    }
    const r = await query(
      `INSERT INTO lead_workflows (vertical, entity_type, stage_id, stage_label, stage_order, stage_color, is_won, is_lost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [vertical, entity_type, stage_id, stage_label, stage_order || 99, stage_color || "bg-blue-500", is_won || false, is_lost || false],
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id
router.put("/:id", async (req, res) => {
  try {
    const { stage_label, stage_order, stage_color, is_won, is_lost, is_active } = req.body;
    const r = await query(
      `UPDATE lead_workflows SET
         stage_label = COALESCE($1, stage_label),
         stage_order = COALESCE($2, stage_order),
         stage_color = COALESCE($3, stage_color),
         is_won = COALESCE($4, is_won),
         is_lost = COALESCE($5, is_lost),
         is_active = COALESCE($6, is_active)
       WHERE id = $7 RETURNING *`,
      [stage_label, stage_order, stage_color, is_won, is_lost, is_active, req.params.id],
    );
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflows/:id (soft deactivate)
router.delete("/:id", async (req, res) => {
  try {
    await query("UPDATE lead_workflows SET is_active = false WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
