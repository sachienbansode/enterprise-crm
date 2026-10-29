import { Router } from "express";
import { query } from "../lib/db";
import { visibleNames, visibleIds } from "../lib/visibility";

// ─── GET /api/search?q= — global search (top bar) ─────────────────────────────
// Clients / companies, opportunities, deals and service requests the user can see (vertical access applies).
export const searchRouter = Router();

searchRouter.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ q, clients: [], leads: [], deals: [], srs: [] });
    const like = `%${q}%`;
    const names = await visibleNames(), ids = await visibleIds();
    const [clients, leads, deals, srs] = await Promise.all([
      query(`SELECT c.id, c.name, c.client_code, c.type, c.category, c.cin,
                    (SELECT array_agg(cv.vertical) FROM client_verticals cv WHERE cv.client_id = c.id) AS verticals
               FROM clients c
              WHERE (c.name ILIKE $1 OR c.client_code ILIKE $1 OR c.cin ILIKE $1 OR c.group_name ILIKE $1)
                AND (NOT EXISTS (SELECT 1 FROM client_verticals cv WHERE cv.client_id = c.id)
                     OR EXISTS (SELECT 1 FROM client_verticals cv WHERE cv.client_id = c.id AND cv.vertical = ANY($2)))
              ORDER BY (c.name ILIKE $3) DESC, c.name LIMIT 6`, [like, ids, `${q}%`]),
      query(`SELECT l.id, l.name, l.lead_code, l.vertical, l.stage, l.value_estimate, c.name AS client_name
               FROM leads l LEFT JOIN clients c ON c.id = l.client_id
              WHERE l.stage <> 'deleted' AND l.vertical = ANY($2) AND (l.name ILIKE $1 OR l.lead_code ILIKE $1 OR c.name ILIKE $1)
              ORDER BY l.updated_at DESC NULLS LAST LIMIT 6`, [like, names]),
      query(`SELECT d.id, d.name, d.deal_code, d.vertical, d.stage, d.value, c.name AS client_name
               FROM deals d LEFT JOIN clients c ON c.id = d.client_id
              WHERE d.stage <> 'deleted' AND d.vertical = ANY($2) AND (d.name ILIKE $1 OR d.deal_code ILIKE $1 OR c.name ILIKE $1)
              ORDER BY d.updated_at DESC NULLS LAST LIMIT 6`, [like, names]),
      query(`SELECT s.id, s.sr_code, s.subject, s.status, s.vertical, c.name AS client_name
               FROM service_requests s LEFT JOIN clients c ON c.id = s.client_id
              WHERE (s.vertical IS NULL OR s.vertical = ANY($2)) AND (s.sr_code ILIKE $1 OR s.subject ILIKE $1 OR c.name ILIKE $1)
              ORDER BY s.created_at DESC LIMIT 6`, [like, names]),
    ]);
    res.json({ q, clients: clients.rows, leads: leads.rows, deals: deals.rows, srs: srs.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
