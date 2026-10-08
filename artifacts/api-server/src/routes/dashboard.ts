import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

// GET /api/dashboard — aggregate stats for the overall dashboard
router.get("/", async (req, res) => {
  try {
    const [clients, leads, deals, srs, recentSrs, srsBreached, clientsByV, clientsByKyc] = await Promise.all([
      query("SELECT COUNT(*) as total, status FROM clients GROUP BY status"),
      query("SELECT COUNT(*) as total, vertical FROM leads GROUP BY vertical"),
      query("SELECT COUNT(*) as total, vertical FROM deals GROUP BY vertical"),
      query("SELECT COUNT(*) as total, status FROM service_requests GROUP BY status"),
      query(
        `SELECT sr.sr_code, sr.subject, sr.status, sr.priority, sr.vertical, sr.created_at, c.name as client_name
         FROM service_requests sr LEFT JOIN clients c ON sr.client_id = c.id
         ORDER BY sr.created_at DESC LIMIT 10`,
      ),
      query("SELECT COUNT(*) as total FROM service_requests WHERE sla_status='breached'"),
      query(
        `SELECT cv.vertical, COUNT(DISTINCT c.id) as count
         FROM clients c JOIN client_verticals cv ON c.id = cv.client_id
         GROUP BY cv.vertical ORDER BY cv.vertical`,
      ),
      query("SELECT COUNT(*) as total, kyc_status FROM clients GROUP BY kyc_status"),
    ]);

    const totalClients = clients.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const totalLeads = leads.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const totalDeals = deals.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const totalSrs = srs.rows.reduce((sum, r) => sum + parseInt(r.total), 0);

    const srByStatus: Record<string, number> = {};
    srs.rows.forEach(r => { srByStatus[r.status] = parseInt(r.total); });

    const leadsByVertical: Record<string, number> = {};
    leads.rows.forEach(r => { leadsByVertical[r.vertical] = parseInt(r.total); });

    const dealsByVertical: Record<string, number> = {};
    deals.rows.forEach(r => { dealsByVertical[r.vertical] = parseInt(r.total); });

    const clientsByVertical: Record<string, number> = {};
    clientsByV.rows.forEach(r => { clientsByVertical[r.vertical] = parseInt(r.count); });

    const kycBreakdown: Record<string, number> = {};
    clientsByKyc.rows.forEach(r => { kycBreakdown[r.kyc_status || "Unknown"] = parseInt(r.total); });

    res.json({
      clients: {
        total: totalClients,
        byStatus: Object.fromEntries(clients.rows.map(r => [r.status, parseInt(r.total)])),
        byKyc: kycBreakdown,
      },
      leads: { total: totalLeads, byVertical: leadsByVertical },
      deals: { total: totalDeals, byVertical: dealsByVertical },
      srs: { total: totalSrs, byStatus: srByStatus, breached: parseInt(srsBreached.rows[0]?.total || "0") },
      recentActivity: recentSrs.rows,
      clientsByVertical,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/vertical/:vId — per-vertical stats
router.get("/vertical/:vId", async (req, res) => {
  try {
    const vMap: Record<string, string> = {
      retail: "Retail Broking",
      corporate: "Corporate Broking",
      ib: "Investment Banking",
      aif: "AIF",
      ie: "Institutional Equities",
    };
    const vName = vMap[req.params.vId];
    if (!vName) return res.status(400).json({ error: "Invalid vertical" });

    const [clients, leads, deals, srs] = await Promise.all([
      query(
        `SELECT COUNT(DISTINCT c.id) as total, c.status FROM clients c
         JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = $1
         GROUP BY c.status`,
        [vName],
      ),
      query(
        "SELECT COUNT(*) as total, stage FROM leads WHERE vertical=$1 GROUP BY stage ORDER BY stage",
        [vName],
      ),
      query(
        "SELECT COUNT(*) as total, stage FROM deals WHERE vertical=$1 GROUP BY stage ORDER BY stage",
        [vName],
      ),
      query(
        "SELECT COUNT(*) as total, status FROM service_requests WHERE vertical=$1 GROUP BY status",
        [vName],
      ),
    ]);

    const totalClients = clients.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const totalLeads = leads.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const totalDeals = deals.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
    const totalSrs = srs.rows.reduce((sum, r) => sum + parseInt(r.total), 0);

    const openSrs = srs.rows.find(r => r.status === "Open");
    const resolvedSrs = srs.rows.find(r => r.status === "Resolved");

    res.json({
      vId: req.params.vId,
      vName,
      clients: { total: totalClients, byStatus: Object.fromEntries(clients.rows.map(r => [r.status, parseInt(r.total)])) },
      leads: { total: totalLeads, byStage: Object.fromEntries(leads.rows.map(r => [r.stage, parseInt(r.total)])) },
      deals: { total: totalDeals, byStage: Object.fromEntries(deals.rows.map(r => [r.stage, parseInt(r.total)])) },
      srs: { total: totalSrs, open: parseInt(openSrs?.total || "0"), resolved: parseInt(resolvedSrs?.total || "0") },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
