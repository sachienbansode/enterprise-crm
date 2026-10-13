import { Router } from "express";
import { query } from "../lib/db";
import { logAudit } from "../lib/audit";
import { visibleNames, visibleIds } from "../lib/visibility";


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
    params.push(await visibleNames("leads")); where += ` AND l.vertical = ANY($${params.length})`; // hidden verticals/modules

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
      `SELECT vertical, COUNT(*) as count, stage FROM leads WHERE vertical = ANY($1) GROUP BY vertical, stage ORDER BY vertical, stage`, [await visibleNames("leads")],
    );
    const byPriority = await query(
      `SELECT vertical, priority, COUNT(*) as count FROM leads WHERE vertical = ANY($1) GROUP BY vertical, priority ORDER BY vertical`, [await visibleNames("leads")],
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

// IB / ECM rules: every active opportunity needs a next action; a lost one needs a reason AND a comment.
// `enteringLost` = the record is being moved into (or created in) a Lost stage — only then is a fresh comment required.
async function ibRuleError(vertical: string, stage: string, nextAction: any, lostReason: any, lostComment?: any, enteringLost = false): Promise<{ error: string; code: string } | null> {
  if (vertical !== "Investment Banking" || !stage) return null;
  const s = (await query("SELECT is_won, is_lost FROM pipeline_stages WHERE entity='lead' AND vertical='ib' AND stage_id=$1", [stage])).rows[0];
  if (s?.is_lost && (!String(lostReason || "").trim() || (enteringLost && String(lostComment || "").trim().length < 10)))
    return { error: "Choose why this opportunity was lost and add a comment (at least 10 characters).", code: "NEED_LOST_REASON" };
  if (s && !s.is_won && !s.is_lost && !String(nextAction || "").trim()) return { error: "Add the next action for this opportunity.", code: "NEED_NEXT_ACTION" };
  return null;
}
const isLostStage = async (stage: string) => !!stage && (await query("SELECT 1 FROM pipeline_stages WHERE entity='lead' AND stage_id=$1 AND is_lost LIMIT 1", [stage])).rows.length > 0;
// The lost comment also goes into History & comments, so the move is visible on the record timeline
async function postLostComment(leadId: string, user: any, stageLabel: string, reason: string, comment: string) {
  await query("INSERT INTO entity_comments (entity_type, entity_id, user_id, user_name, body) VALUES ('lead',$1,$2,$3,$4)",
    [leadId, user?.id || null, user?.name || "System", `Marked as ${stageLabel} — Reason: ${reason}\n${comment}`]);
}
const stageLabel = async (stage: string) => (await query("SELECT label FROM pipeline_stages WHERE entity='lead' AND stage_id=$1 LIMIT 1", [stage])).rows[0]?.label || stage;
const numOrNull = (v: any) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));

// PATCH /api/leads/:id — full update
router.patch("/:id", async (req, res) => {
  try {
    const { name, stage, priority, status, notes, assigned_rm_id, client_id, source, sub_source, product, deal_type, value_estimate, expected_close, updated_by,
            opportunity_type, next_action, next_action_date, lost_reason, expected_fee, probability } = req.body;
    const lost_comment = String(req.body.lost_comment || "").trim();
    const current = await query("SELECT * FROM leads WHERE id=$1", [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: "Lead not found" });
    const prev = current.rows[0];
    const stageChanged = !!stage && stage !== prev.stage;
    const enteringLost = stageChanged && await isLostStage(stage);
    const leavingLost = stageChanged && !enteringLost && await isLostStage(prev.stage);
    if (stageChanged || "next_action" in req.body || "lost_reason" in req.body) {
      // Moving into Lost always needs a fresh reason + comment (an old reason from an earlier loss doesn't count)
      const ruleErr = await ibRuleError(prev.vertical, stage || prev.stage,
        "next_action" in req.body ? next_action : prev.next_action,
        enteringLost ? lost_reason : ("lost_reason" in req.body ? lost_reason : prev.lost_reason), lost_comment, enteringLost);
      if (ruleErr) return res.status(400).json(ruleErr);
    }

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
        opportunity_type = COALESCE($15, opportunity_type),
        next_action = COALESCE($16, next_action),
        next_action_date = COALESCE($17::date, next_action_date),
        lost_reason = CASE WHEN $21::boolean THEN NULL ELSE COALESCE($18, lost_reason) END,
        lost_comment = CASE WHEN $21::boolean THEN NULL ELSE COALESCE($22, lost_comment) END,
        expected_fee = COALESCE($19, expected_fee),
        probability = COALESCE($20, probability),
        closed_at = CASE WHEN $2::text IS NOT NULL AND EXISTS (SELECT 1 FROM pipeline_stages ps WHERE ps.entity='lead' AND ps.stage_id=$2 AND (ps.is_won OR ps.is_lost))
                         THEN COALESCE(closed_at, NOW()) ELSE closed_at END,
        updated_at = NOW()
        WHERE id = $14 RETURNING *`,
      // source / sub_source are fixed after creation → never updated here
      // lead name is fixed after creation too
      [null, stage, priority, status, notes, assigned_rm_id, client_id, null, null, product, deal_type, value_estimate, expected_close || null, req.params.id,
       opportunity_type || null, next_action || null, next_action_date || null, lost_reason || null, numOrNull(expected_fee), numOrNull(probability), leavingLost, lost_comment || null],
    );
    if (enteringLost && lost_comment) await postLostComment(req.params.id, req.user, await stageLabel(stage), lost_reason || result.rows[0].lost_reason, lost_comment);

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
    const { name, vertical, stage, priority, value_estimate, source, sub_source, product, deal_type, assigned_rm_id, client_id, notes, opened_at, closed_at, expected_close,
            opportunity_type, next_action, next_action_date, lost_reason, expected_fee, probability } = req.body;
    const lost_comment = String(req.body.lost_comment || "").trim();
    const createdLost = await isLostStage(stage);
    const ruleErr = await ibRuleError(vertical, stage, next_action, lost_reason, lost_comment, createdLost);
    if (ruleErr) return res.status(400).json(ruleErr);
    if (isFutureDate(opened_at)) return res.status(400).json({ error: "Lead open date cannot be in the future." });
    if (isFutureDate(closed_at)) return res.status(400).json({ error: "Lead close date cannot be in the future." });

    const countResult = await query("SELECT COUNT(*) FROM leads WHERE vertical=$1", [vertical]);
    const prefix = vertical === "Retail Broking" ? "RB" : vertical === "Corporate Broking" ? "CB" : vertical === "Investment Banking" ? "IB" : vertical === "AIF" ? "AIF" : "IE";
    const seq = 1000 + parseInt(countResult.rows[0].count, 10) + 1;
    const lead_code = `${prefix}-${seq}`;

    const result = await query(
      `INSERT INTO leads (lead_code, name, vertical, stage, priority, value_estimate, source, sub_source, product, deal_type, assigned_rm_id, client_id, notes, expected_close, opened_at, created_by, created_by_name,
                          opportunity_type, next_action, next_action_date, lost_reason, expected_fee, probability, lost_comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [lead_code, name, vertical, stage || "new", priority || "Medium", value_estimate || null, source || null, sub_source || null, product || null, deal_type || null, assigned_rm_id || null, client_id || null, notes || null, expected_close || null, req.user?.id || null, req.user?.name || null,
       opportunity_type || null, next_action || null, next_action_date || null, lost_reason || null, numOrNull(expected_fee), numOrNull(probability), createdLost ? lost_comment || null : null],
    );
    if (createdLost && lost_comment) await postLostComment(result.rows[0].id, req.user, await stageLabel(stage), lost_reason, lost_comment);

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
