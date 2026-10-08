import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

async function audit(entityType: string, entityId: string, user: string, action: string, details: string, oldVal?: any, newVal?: any) {
  await query(
    `INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details, old_value, new_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entityType, entityId, user || "admin", action, details, oldVal ? JSON.stringify(oldVal) : null, newVal ? JSON.stringify(newVal) : null],
  ).catch(() => {});
}

// ─── GET /api/pii-masking/settings ───────────────────────────────────────────
router.get("/settings", async (_req, res) => {
  try {
    const r = await query(`SELECT * FROM pii_masking_settings LIMIT 1`);
    if (!r.rows.length) {
      await query(`INSERT INTO pii_masking_settings DEFAULT VALUES`);
      const r2 = await query(`SELECT * FROM pii_masking_settings LIMIT 1`);
      return res.json(r2.rows[0]);
    }
    res.json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── PUT /api/pii-masking/settings ───────────────────────────────────────────
router.put("/settings", async (req, res) => {
  try {
    const { enabled, scope, apply_to_ai, apply_to_exports, apply_to_reports, log_access, allow_admin_view, allow_owner_view, updated_by } = req.body;
    const existing = await query(`SELECT * FROM pii_masking_settings LIMIT 1`);
    let r;
    if (existing.rows.length) {
      const old = existing.rows[0];
      r = await query(
        `UPDATE pii_masking_settings SET
           enabled=COALESCE($1,enabled), scope=COALESCE($2,scope),
           apply_to_ai=COALESCE($3,apply_to_ai), apply_to_exports=COALESCE($4,apply_to_exports),
           apply_to_reports=COALESCE($5,apply_to_reports), log_access=COALESCE($6,log_access),
           allow_admin_view=COALESCE($9,allow_admin_view), allow_owner_view=COALESCE($10,allow_owner_view),
           updated_at=NOW(), updated_by=$7
         WHERE id=$8 RETURNING *`,
        [enabled ?? null, scope ?? null, apply_to_ai ?? null, apply_to_exports ?? null,
         apply_to_reports ?? null, log_access ?? null, updated_by ?? null, old.id,
         allow_admin_view ?? null, allow_owner_view ?? null],
      );
      await audit("pii_masking_settings", String(old.id), updated_by || "admin",
        "PII Settings Updated", `Masking settings updated. Enabled: ${enabled}, Scope: ${scope}`, old, r.rows[0]);
    } else {
      r = await query(
        `INSERT INTO pii_masking_settings (enabled, scope, apply_to_ai, apply_to_exports, apply_to_reports, log_access, allow_admin_view, allow_owner_view, updated_at, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9) RETURNING *`,
        [enabled ?? true, scope ?? "all", apply_to_ai ?? true, apply_to_exports ?? false,
         apply_to_reports ?? false, log_access ?? false, allow_admin_view ?? true, allow_owner_view ?? true, updated_by ?? null],
      );
      await audit("pii_masking_settings", String(r.rows[0].id), updated_by || "admin",
        "PII Settings Created", "Initial PII masking settings record created", null, r.rows[0]);
    }
    res.json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/pii-masking/fields ─────────────────────────────────────────────
router.get("/fields", async (_req, res) => {
  try {
    const r = await query(`SELECT * FROM pii_masking_fields ORDER BY sort_order, id`);
    res.json(r.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── PUT /api/pii-masking/fields/:id ─────────────────────────────────────────
router.put("/fields/:id", async (req, res) => {
  try {
    const { is_enabled, field_label, description, mask_display, regex_pattern, sort_order, updated_by } = req.body;
    const old = await query(`SELECT * FROM pii_masking_fields WHERE id=$1`, [req.params.id]);
    const r = await query(
      `UPDATE pii_masking_fields SET
        is_enabled=COALESCE($1,is_enabled),
        field_label=COALESCE($2,field_label),
        description=COALESCE($3,description),
        mask_display=COALESCE($4,mask_display),
        regex_pattern=COALESCE($5,regex_pattern),
        sort_order=COALESCE($6,sort_order),
        updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [is_enabled ?? null, field_label ?? null, description ?? null, mask_display ?? null,
       regex_pattern ?? null, sort_order ?? null, req.params.id],
    );
    if (!r.rows.length) return res.status(404).json({ error: "Field not found" });
    await audit("pii_masking_field", String(r.rows[0].id), updated_by || "admin",
      "PII Field Updated", `Updated masking config for field "${r.rows[0].field_label}"`, old.rows[0], r.rows[0]);
    res.json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /api/pii-masking/fields/:id/toggle ────────────────────────────────
router.patch("/fields/:id/toggle", async (req, res) => {
  try {
    const old = await query(`SELECT * FROM pii_masking_fields WHERE id=$1`, [req.params.id]);
    const r = await query(
      `UPDATE pii_masking_fields SET is_enabled=NOT is_enabled, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id],
    );
    if (!r.rows.length) return res.status(404).json({ error: "Field not found" });
    const row = r.rows[0];
    await audit("pii_masking_field", String(row.id), req.body?.updated_by || "admin",
      row.is_enabled ? "PII Field Enabled" : "PII Field Disabled",
      `Field "${row.field_label}" masking ${row.is_enabled ? "enabled" : "disabled"}`,
      old.rows[0], row);
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/pii-masking/fields — add custom field ─────────────────────────
router.post("/fields", async (req, res) => {
  try {
    const { field_key, field_label, description, regex_pattern, mask_display, example_before, example_after, sort_order = 99, category = "custom", created_by } = req.body;
    if (!field_key || !field_label || !regex_pattern || !mask_display) {
      return res.status(400).json({ error: "field_key, field_label, regex_pattern, mask_display required" });
    }
    const r = await query(
      `INSERT INTO pii_masking_fields (field_key, field_label, description, is_enabled, regex_pattern, mask_display, example_before, example_after, sort_order, category)
       VALUES ($1,$2,$3,true,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (field_key) DO UPDATE SET field_label=$2, description=$3, regex_pattern=$4, mask_display=$5, example_before=$6, example_after=$7, sort_order=$8, updated_at=NOW()
       RETURNING *`,
      [field_key, field_label, description || null, regex_pattern, mask_display, example_before || null, example_after || null, sort_order, category],
    );
    await audit("pii_masking_field", String(r.rows[0].id), created_by || "admin",
      "PII Custom Field Added", `Custom PII field "${field_label}" (${field_key}) added`, null, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/pii-masking/fields/:id — only for custom fields ──────────────
router.delete("/fields/:id", async (req, res) => {
  try {
    const old = await query(`SELECT * FROM pii_masking_fields WHERE id=$1`, [req.params.id]);
    const r = await query(
      `DELETE FROM pii_masking_fields WHERE id=$1 AND category='custom' RETURNING id, field_key, field_label`,
      [req.params.id],
    );
    if (!r.rows.length) return res.status(400).json({ error: "Cannot delete built-in field. Disable it instead." });
    await audit("pii_masking_field", String(req.params.id), req.body?.deleted_by || "admin",
      "PII Custom Field Deleted", `Custom field "${old.rows[0]?.field_label}" deleted`, old.rows[0], null);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/pii-masking/full — combined settings + fields (for AI use) ──────
router.get("/full", async (_req, res) => {
  try {
    const [settingsRes, fieldsRes] = await Promise.all([
      query(`SELECT * FROM pii_masking_settings LIMIT 1`),
      query(`SELECT * FROM pii_masking_fields WHERE is_enabled=true ORDER BY sort_order`),
    ]);
    res.json({
      settings: settingsRes.rows[0] || { enabled: true, scope: "all", apply_to_ai: true },
      fields: fieldsRes.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
