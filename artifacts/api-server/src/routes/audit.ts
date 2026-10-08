import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

function buildWhereClause(q: Record<string, string>) {
  const { entity_type, entity_id, entity_code, user_id, action, search, from_date, to_date } = q;
  const params: any[] = [];
  const conditions: string[] = [];

  if (entity_type) {
    params.push(entity_type);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (entity_id) {
    params.push(entity_id);
    conditions.push(`entity_id::text = $${params.length}`);
  }
  if (entity_code) {
    params.push(`%${entity_code}%`);
    conditions.push(`entity_code ILIKE $${params.length}`);
  }
  if (user_id) {
    params.push(user_id);
    conditions.push(`user_id = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(user_name ILIKE $${params.length} OR record_display ILIKE $${params.length} OR action ILIKE $${params.length} OR entity_code ILIKE $${params.length} OR details ILIKE $${params.length})`,
    );
  }
  if (from_date) {
    params.push(from_date);
    conditions.push(`created_at >= $${params.length}::date`);
  }
  if (to_date) {
    params.push(to_date);
    conditions.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

const SELECT_COLS = `
  id, entity_type, entity_id, entity_code, user_id, user_name, user_role,
  action, details, old_value, new_value, changed_fields, record_display,
  ip_address, created_at
`;

// GET /api/audit-logs — paginated
router.get("/", async (req, res) => {
  try {
    const qs = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(qs.page || "1", 10));
    const pageSize = Math.min(parseInt(qs.limit || "50", 10), 200);
    const offset = (page - 1) * pageSize;

    const { where, params } = buildWhereClause(qs);

    const countResult = await query(`SELECT COUNT(*) FROM audit_logs ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, pageSize, offset];
    const result = await query(
      `SELECT ${SELECT_COLS} FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    res.json({
      data: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-logs/export — full CSV (no pagination, max 10000 rows)
router.get("/export", async (req, res) => {
  try {
    const qs = req.query as Record<string, string>;
    const { where, params } = buildWhereClause(qs);

    const dataParams = [...params, 10000];
    const result = await query(
      `SELECT ${SELECT_COLS} FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length}`,
      dataParams,
    );

    const rows = result.rows;

    const headers = [
      "Timestamp", "Entity Type", "Entity Code", "Record", "Action", "Details",
      "User", "Role", "User ID", "Entity ID",
      "Changed Fields", "Before (JSON)", "After (JSON)", "IP Address",
    ];

    const escapeCell = (v: any): string => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          escapeCell(r.created_at ? new Date(r.created_at).toISOString() : ""),
          escapeCell(r.entity_type),
          escapeCell(r.entity_code),
          escapeCell(r.record_display),
          escapeCell(r.action),
          escapeCell(r.details),
          escapeCell(r.user_name),
          escapeCell(r.user_role),
          escapeCell(r.user_id),
          escapeCell(r.entity_id),
          escapeCell(
            r.changed_fields
              ? (Array.isArray(r.changed_fields) ? r.changed_fields : JSON.parse(r.changed_fields)).join("; ")
              : "",
          ),
          escapeCell(r.old_value ? (typeof r.old_value === "object" ? JSON.stringify(r.old_value) : r.old_value) : ""),
          escapeCell(r.new_value ? (typeof r.new_value === "object" ? JSON.stringify(r.new_value) : r.new_value) : ""),
          escapeCell(r.ip_address),
        ].join(","),
      ),
    ];

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-log-${timestamp}.csv"`);
    res.send(csvLines.join("\r\n"));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
