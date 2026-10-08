import { Router } from "express";
import { query } from "../lib/db";

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DELETE /api/notifications?userId=... — clear all for user
router.delete("/", async (req, res) => {
  try {
    const { userId } = req.query as Record<string, string>;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!UUID_RE.test(userId)) return res.json({ cleared: 0 });
    const r = await query("DELETE FROM notifications WHERE user_id = $1 RETURNING id", [userId]);
    res.json({ cleared: r.rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications?userId=...&unread=true
router.get("/", async (req, res) => {
  try {
    const { userId, unread, limit = "20" } = req.query as Record<string, string>;
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!UUID_RE.test(userId)) return res.json({ data: [], unreadCount: 0 });

    let where = "WHERE user_id = $1";
    const params: any[] = [userId];
    if (unread === "true") { where += " AND read = false"; }

    const result = await query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2`,
      [...params, parseInt(limit)],
    );
    const unreadCount = await query("SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND read=false", [userId]);

    res.json({ data: result.rows, unreadCount: parseInt(unreadCount.rows[0].count) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req, res) => {
  try {
    await query("UPDATE notifications SET read=true WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all — mark all as read for a user
router.put("/read-all", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await query("UPDATE notifications SET read=true WHERE user_id=$1", [userId]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
