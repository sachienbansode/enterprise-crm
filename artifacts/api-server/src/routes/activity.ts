import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";

// Activity timeline for a record: field edits (from the audit log), comments and document uploads,
// each with who did it and when.   GET  /api/activity/:type/:id
//                                   POST /api/activity/:type/:id/comments  { body }
const router = Router();
const TYPES = new Set(["lead", "deal"]);
const UUID = /^[0-9a-f-]{36}$/i;

// Field names worth showing, with friendly labels (everything else in the row is noise)
const LABELS: Record<string, string> = {
  name: "Name", stage: "Stage", priority: "Priority", status: "Status", value_estimate: "Estimated value", value: "Value",
  source: "Source", sub_source: "Sub-source", product: "Product", deal_type: "Deal type", type: "Type",
  assigned_rm_id: "Assigned RM", rm_id: "RM", client_id: "Linked client", expected_close: "Expected close", notes: "Notes",
};

router.get("/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  if (!TYPES.has(type) || !UUID.test(id)) return res.status(400).json({ error: "Invalid record" });
  try {
    const [audit, comments, docs, users, clients] = await Promise.all([
      query(`SELECT id, user_name, user_role, details, old_value, new_value, changed_fields, created_at
               FROM audit_logs WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC LIMIT 200`, [type, id]),
      query(`SELECT id, user_name, body, created_at FROM entity_comments WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC`, [type, id]),
      query(`SELECT d.id, d.name, d.created_at, u.name AS user_name FROM documents d LEFT JOIN users u ON u.id = d.created_by
              WHERE ${type === "lead" ? "d.lead_id" : "d.deal_id"} = $1 ORDER BY d.created_at DESC`, [id]),
      query("SELECT id, name FROM users"),
      query("SELECT id, name FROM clients"),
    ]);
    const stages = await query("SELECT stage_id, label FROM pipeline_stages WHERE entity=$1", [type]);
    const stageLabel = Object.fromEntries(stages.rows.map(r => [r.stage_id, r.label]));
    const uName = Object.fromEntries(users.rows.map(u => [u.id, u.name]));
    const cName = Object.fromEntries(clients.rows.map(c => [c.id, c.name]));
    const show = (field: string, v: any) => {
      if (v === null || v === undefined || v === "") return "—";
      if (field === "assigned_rm_id" || field === "rm_id") return uName[v] || "—";
      if (field === "client_id") return cName[v] || "—";
      if (field === "stage") return stageLabel[v] || String(v);
      if (field === "expected_close") return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      return String(v);
    };

    const items: any[] = [];
    for (const a of audit.rows) {
      const action = String(a.details || "").toUpperCase();
      if (action === "CREATE") { items.push({ kind: "created", at: a.created_at, by: a.user_name }); continue; }
      if (action === "DELETE") { items.push({ kind: "deleted", at: a.created_at, by: a.user_name }); continue; }
      const before = a.old_value || {}, after = a.new_value || {};
      const changes = Object.keys(LABELS)
        .filter(f => f in after && JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null))
        .map(f => ({ field: LABELS[f], from: show(f, before[f]), to: show(f, after[f]) }));
      if (changes.length) items.push({ kind: "edited", at: a.created_at, by: a.user_name, changes });
    }
    comments.rows.forEach(c => items.push({ kind: "comment", at: c.created_at, by: c.user_name, body: c.body, id: c.id }));
    docs.rows.forEach(d => items.push({ kind: "document", at: d.created_at, by: d.user_name || "—", name: d.name, id: d.id }));
    items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    return res.json({ items });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/:type/:id/comments", async (req, res) => {
  const { type, id } = req.params;
  const body = String(req.body?.body || "").trim();
  if (!TYPES.has(type) || !UUID.test(id)) return res.status(400).json({ error: "Invalid record" });
  if (!body) return res.status(400).json({ error: "Comment is empty" });
  if (body.length > 5000) return res.status(400).json({ error: "Comment is too long (max 5000 characters)" });
  try {
    const r = await query(
      "INSERT INTO entity_comments (entity_type, entity_id, user_id, user_name, body) VALUES ($1,$2,$3,$4,$5) RETURNING id, user_name, body, created_at",
      [type, id, req.user!.id, req.user!.name, body],
    );
    await logAudit({ entityType: `${type}_comment`, entityId: id, action: "CREATE", userId: req.user!.id, userName: req.user!.name, userRole: req.user!.role, recordDisplay: body.slice(0, 120) });
    return res.status(201).json(r.rows[0]);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
