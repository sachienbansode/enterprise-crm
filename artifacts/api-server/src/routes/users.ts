import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

// GET /api/users
router.get("/", async (req, res) => {
  try {
    const { page = "1", limit = "15" } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const pageSize = Math.min(parseInt(limit, 10), 15);
    const offset = (pageNum - 1) * pageSize;

    const countResult = await query("SELECT COUNT(*) FROM users");
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      "SELECT id, name, email, auth_type, role, vertical, status, mfa_enabled, last_login, created_at FROM users ORDER BY name ASC LIMIT $1 OFFSET $2",
      [pageSize, offset],
    );
    res.json({ data: result.rows, total, page: pageNum, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/active — active users for assignment dropdowns
router.get("/active", async (_req, res) => {
  try {
    const result = await query("SELECT id, name, email, role, vertical FROM users WHERE status='Active' ORDER BY name ASC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — invite user
router.post("/", async (req, res) => {
  try {
    const { name, email, role, vertical, auth_type, password } = req.body;
    const { createHash } = await import("crypto");
    const password_hash = password ? createHash("sha256").update(password).digest("hex") : null;
    const result = await query(
      "INSERT INTO users (name, email, role, vertical, auth_type, password_hash, status) VALUES ($1,$2,$3,$4,$5,$6,'Active') RETURNING id, name, email, role, vertical, auth_type, status",
      [name, email, role, vertical, auth_type || "app", password_hash],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id
router.patch("/:id", async (req, res) => {
  try {
    const { status, role, vertical, mfa_enabled } = req.body;
    const result = await query(
      "UPDATE users SET status=COALESCE($1,status), role=COALESCE($2,role), vertical=COALESCE($3,vertical), mfa_enabled=COALESCE($4,mfa_enabled), updated_at=NOW() WHERE id=$5 RETURNING id, name, email, role, vertical, auth_type, status",
      [status, role, vertical, mfa_enabled, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
