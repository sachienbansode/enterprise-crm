import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

// GET /api/sla-config — return all entries, ordered by category + subcategory
router.get("/", async (_req, res) => {
  try {
    const result = await query(
      "SELECT * FROM sla_config ORDER BY category ASC, subcategory ASC NULLS FIRST",
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sla-config — create new entry (category-level or subcategory-level)
router.post("/", async (req, res) => {
  try {
    const { category, subcategory, tat_hours, warning_percent, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours } = req.body;
    if (!category) return res.status(400).json({ error: "category is required" });
    const result = await query(
      `INSERT INTO sla_config (category, subcategory, tat_hours, warning_percent, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [category, subcategory || null, tat_hours || 24, warning_percent || 80, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sla-config/:id — update an entry
router.put("/:id", async (req, res) => {
  try {
    const { tat_hours, warning_percent, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours } = req.body;
    const result = await query(
      `UPDATE sla_config SET tat_hours=$1, warning_percent=$2, l1_owner=$3, l2_after_hours=$4, l2_owner=$5,
       l3_after_hours=$6, l3_owner=$7, auto_close_hours=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [tat_hours, warning_percent, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Config not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sla-config/:id — delete an entry (only subcategory rows; category-level rows protected)
router.delete("/:id", async (req, res) => {
  try {
    const check = await query("SELECT * FROM sla_config WHERE id=$1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: "Not found" });
    if (!check.rows[0].subcategory) return res.status(400).json({ error: "Cannot delete category-level SLA. Edit it instead." });
    await query("DELETE FROM sla_config WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
