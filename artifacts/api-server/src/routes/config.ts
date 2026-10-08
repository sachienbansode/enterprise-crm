import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

// helper — fire-and-forget audit insert
async function audit(entityType: string, entityId: string, user: string, action: string, details: string, oldVal?: any, newVal?: any) {
  await query(
    `INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details, old_value, new_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entityType, entityId, user || "admin", action, details, oldVal ? JSON.stringify(oldVal) : null, newVal ? JSON.stringify(newVal) : null],
  ).catch(() => {});
}

// ─── GET /api/config/dropdowns?entity=lead&field=source ──────────────────────
router.get("/dropdowns", async (req, res) => {
  try {
    const { entity, field } = req.query as Record<string, string>;
    let where = "WHERE is_active = true";
    const params: any[] = [];
    if (entity) { params.push(entity); where += ` AND entity = $${params.length}`; }
    if (field)  { params.push(field);  where += ` AND field = $${params.length}`; }
    const result = await query(
      `SELECT * FROM dropdown_config ${where} ORDER BY entity, field, sort_order, label`,
      params,
    );
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/config/dropdowns/all ───────────────────────────────────────────
router.get("/dropdowns/all", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM dropdown_config ORDER BY entity, field, sort_order, label`);
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/config/dropdowns ──────────────────────────────────────────────
router.post("/dropdowns", async (req, res) => {
  try {
    const { entity, field, value, label, sort_order = 0, created_by } = req.body;
    if (!entity || !field || !value) return res.status(400).json({ error: "entity, field, value required" });
    const result = await query(
      `INSERT INTO dropdown_config (entity, field, value, label, sort_order)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (entity, field, value) DO UPDATE SET label=$4, sort_order=$5, is_active=true RETURNING *`,
      [entity, field, value, label || value, sort_order],
    );
    const row = result.rows[0];
    await audit("dropdown_config", String(row.id), created_by || "admin", "Dropdown Created",
      `Added "${label || value}" to ${entity}::${field}`, null, { entity, field, value, label });
    res.status(201).json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── PUT /api/config/dropdowns/:id ───────────────────────────────────────────
router.put("/dropdowns/:id", async (req, res) => {
  try {
    const { value, label, sort_order, is_active, updated_by } = req.body;
    const old = await query(`SELECT * FROM dropdown_config WHERE id=$1`, [req.params.id]);
    const result = await query(
      `UPDATE dropdown_config SET
        value=COALESCE($1,value), label=COALESCE($2,label),
        sort_order=COALESCE($3,sort_order), is_active=COALESCE($4,is_active)
       WHERE id=$5 RETURNING *`,
      [value, label, sort_order, is_active, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const row = result.rows[0];
    await audit("dropdown_config", String(row.id), updated_by || "admin", "Dropdown Updated",
      `Updated ${row.entity}::${row.field} → "${row.label}"`, old.rows[0], row);
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/config/dropdowns/:id ────────────────────────────────────────
router.delete("/dropdowns/:id", async (req, res) => {
  try {
    const old = await query(`SELECT entity, field, label FROM dropdown_config WHERE id=$1`, [req.params.id]);
    await query(`UPDATE dropdown_config SET is_active=false WHERE id=$1`, [req.params.id]);
    if (old.rows.length) {
      const r = old.rows[0];
      await audit("dropdown_config", String(req.params.id), req.body?.deleted_by || "admin", "Dropdown Deleted",
        `Removed "${r.label}" from ${r.entity}::${r.field}`, r, null);
    }
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/config/pipeline-stages?entity=lead&vertical=retail ─────────────
router.get("/pipeline-stages", async (req, res) => {
  try {
    const { entity, vertical } = req.query as Record<string, string>;
    let where = "WHERE is_active = true";
    const params: any[] = [];
    if (entity)   { params.push(entity);   where += ` AND entity = $${params.length}`; }
    if (vertical) { params.push(vertical); where += ` AND vertical = $${params.length}`; }
    const result = await query(
      `SELECT * FROM pipeline_stages ${where} ORDER BY entity, vertical, sort_order`,
      params,
    );
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/config/pipeline-stages/all ─────────────────────────────────────
router.get("/pipeline-stages/all", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM pipeline_stages ORDER BY entity, vertical, sort_order`);
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/config/pipeline-stages ────────────────────────────────────────
router.post("/pipeline-stages", async (req, res) => {
  try {
    const { entity, vertical, stage_id, label, sort_order = 0, color = "bg-gray-500", is_won = false, is_lost = false, created_by } = req.body;
    if (!entity || !vertical || !stage_id || !label) return res.status(400).json({ error: "entity, vertical, stage_id, label required" });
    const result = await query(
      `INSERT INTO pipeline_stages (entity, vertical, stage_id, label, sort_order, color, is_won, is_lost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (entity, vertical, stage_id) DO UPDATE SET label=$4, sort_order=$5, color=$6, is_won=$7, is_lost=$8, is_active=true
       RETURNING *`,
      [entity, vertical, stage_id, label, sort_order, color, is_won, is_lost],
    );
    const row = result.rows[0];
    await audit("pipeline_stage", String(row.id), created_by || "admin", "Pipeline Stage Created",
      `Added stage "${label}" to ${vertical}/${entity} pipeline`, null, row);
    res.status(201).json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── PUT /api/config/pipeline-stages/:id ─────────────────────────────────────
router.put("/pipeline-stages/:id", async (req, res) => {
  try {
    const { label, sort_order, color, is_won, is_lost, is_active, updated_by } = req.body;
    const old = await query(`SELECT * FROM pipeline_stages WHERE id=$1`, [req.params.id]);
    const result = await query(
      `UPDATE pipeline_stages SET
        label=COALESCE($1,label), sort_order=COALESCE($2,sort_order),
        color=COALESCE($3,color), is_won=COALESCE($4,is_won), is_lost=COALESCE($5,is_lost),
        is_active=COALESCE($6,is_active)
       WHERE id=$7 RETURNING *`,
      [label, sort_order, color, is_won, is_lost, is_active, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const row = result.rows[0];
    await audit("pipeline_stage", String(row.id), updated_by || "admin", "Pipeline Stage Updated",
      `Updated stage "${row.label}" in ${row.vertical}/${row.entity}`, old.rows[0], row);
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/config/pipeline-stages/:id ──────────────────────────────────
router.delete("/pipeline-stages/:id", async (req, res) => {
  try {
    const old = await query(`SELECT label, vertical, entity FROM pipeline_stages WHERE id=$1`, [req.params.id]);
    await query(`UPDATE pipeline_stages SET is_active=false WHERE id=$1`, [req.params.id]);
    if (old.rows.length) {
      const r = old.rows[0];
      await audit("pipeline_stage", String(req.params.id), req.body?.deleted_by || "admin", "Pipeline Stage Deleted",
        `Removed stage "${r.label}" from ${r.vertical}/${r.entity} pipeline`, r, null);
    }
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
