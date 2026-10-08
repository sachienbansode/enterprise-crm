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


// "₹4,800Cr", "₹10L allotted", "₹50K/mo", "20000000000" → rupees
function rupees(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const m = String(v).replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lakh|lac|k|m|mn)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]); const u = (m[2] || "").toLowerCase();
  return n * (u.startsWith("cr") ? 1e7 : u === "l" || u.startsWith("la") ? 1e5 : u === "k" ? 1e3 : u === "m" || u === "mn" ? 1e6 : 1);
}

// GET /api/dashboard/analytics — executive analytics (all figures computed from live data)
router.get("/analytics", async (_req, res) => {
  try {
    const [leads, deals, stageMeta, srWeekly, leadWeekly, srNow, rms, clients, upcoming] = await Promise.all([
      query(`SELECT l.vertical, l.stage, l.status, l.priority, l.value_estimate, l.opened_at, l.closed_at, l.assigned_rm_id
               FROM leads l`),
      query(`SELECT vertical, stage, value, created_at FROM deals`),
      query(`SELECT entity, vertical, stage_id, label, is_won, is_lost, sort_order FROM pipeline_stages WHERE is_active`),
      query(`SELECT to_char(date_trunc('week', d), 'YYYY-MM-DD') AS wk,
                    (SELECT COUNT(*) FROM service_requests WHERE date_trunc('week', created_at) = date_trunc('week', d))::int AS opened,
                    (SELECT COUNT(*) FROM service_requests WHERE date_trunc('week', COALESCE(resolved_at, closed_at)) = date_trunc('week', d))::int AS resolved
               FROM generate_series(NOW() - INTERVAL '11 weeks', NOW(), INTERVAL '1 week') d ORDER BY 1`),
      query(`SELECT to_char(date_trunc('week', d), 'YYYY-MM-DD') AS wk,
                    (SELECT COUNT(*) FROM leads WHERE date_trunc('week', opened_at) = date_trunc('week', d))::int AS created
               FROM generate_series(NOW() - INTERVAL '11 weeks', NOW(), INTERVAL '1 week') d ORDER BY 1`),
      query(`SELECT status, priority,
                    (status NOT IN ('Closed','Resolved') AND sla_deadline < NOW()) AS breached
               FROM service_requests`),
      query(`SELECT id, name FROM users`),
      query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='Active')::int active,
                    COUNT(*) FILTER (WHERE kyc_status IN ('Expired','Pending'))::int kyc_attention,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int new30
               FROM clients`),
      query(`SELECT l.lead_code, l.name, l.vertical, l.stage, l.value_estimate, l.expected_close, u.name AS rm
               FROM leads l LEFT JOIN users u ON u.id = l.assigned_rm_id
              WHERE l.expected_close BETWEEN NOW()::date AND NOW()::date + 30
              ORDER BY l.expected_close LIMIT 8`),
    ]);

    const VID: Record<string, string> = { "Retail Broking": "retail", "Corporate Broking": "corporate", "Investment Banking": "ib", "AIF": "aif", "Institutional Equities": "ie" };
    const stageInfo = (vertical: string, stage: string) =>
      stageMeta.rows.find(s => s.entity === "lead" && s.vertical === VID[vertical] && s.stage_id === stage);
    const isWon = (l: any) => !!stageInfo(l.vertical, l.stage)?.is_won || /won/i.test(l.stage);
    const isLost = (l: any) => !!stageInfo(l.vertical, l.stage)?.is_lost || /lost/i.test(l.stage) || l.status === "Lost";

    const byV: Record<string, { open: number; won: number; openCount: number; wonCount: number; lostCount: number }> = {};
    const rmMap: Record<string, { open: number; won: number; leads: number }> = {};
    const ageing = { "0–7 days": 0, "8–30 days": 0, "31–90 days": 0, "90+ days": 0 };
    const now = Date.now();
    for (const l of leads.rows) {
      const v = (byV[l.vertical] ||= { open: 0, won: 0, openCount: 0, wonCount: 0, lostCount: 0 });
      const val = rupees(l.value_estimate);
      const rm = (rmMap[l.assigned_rm_id || "none"] ||= { open: 0, won: 0, leads: 0 });
      rm.leads++;
      if (isWon(l)) { v.won += val; v.wonCount++; rm.won += val; }
      else if (isLost(l)) { v.lostCount++; }
      else {
        v.open += val; v.openCount++; rm.open += val;
        const days = (now - new Date(l.opened_at).getTime()) / 864e5;
        ageing[days <= 7 ? "0–7 days" : days <= 30 ? "8–30 days" : days <= 90 ? "31–90 days" : "90+ days"]++;
      }
    }
    const tot = Object.values(byV).reduce((a, v) => ({ open: a.open + v.open, won: a.won + v.won, openCount: a.openCount + v.openCount, wonCount: a.wonCount + v.wonCount, lostCount: a.lostCount + v.lostCount }), { open: 0, won: 0, openCount: 0, wonCount: 0, lostCount: 0 });
    const closed = tot.wonCount + tot.lostCount;

    const dealValueByV: Record<string, number> = {};
    for (const d of deals.rows) dealValueByV[d.vertical] = (dealValueByV[d.vertical] || 0) + rupees(d.value);

    const srOpen = srNow.rows.filter(r => !["Closed", "Resolved"].includes(r.status));
    const srByStatus: Record<string, number> = {};
    srNow.rows.forEach(r => { srByStatus[r.status] = (srByStatus[r.status] || 0) + 1; });
    const srOpenByPriority: Record<string, number> = {};
    srOpen.forEach(r => { srOpenByPriority[r.priority] = (srOpenByPriority[r.priority] || 0) + 1; });

    const names = Object.fromEntries(rms.rows.map(u => [u.id, u.name]));
    const rmBoard = Object.entries(rmMap).filter(([id]) => id !== "none")
      .map(([id, r]) => ({ name: names[id] || "Unknown", ...r }))
      .sort((a, b) => (b.open + b.won) - (a.open + a.won)).slice(0, 6);

    res.json({
      kpis: {
        openPipeline: tot.open, openLeads: tot.openCount, wonValue: tot.won, wonLeads: tot.wonCount,
        winRate: closed ? Math.round((tot.wonCount / closed) * 100) : null, closedLeads: closed,
        clients: clients.rows[0], openSRs: srOpen.length, breachedSRs: srOpen.filter(r => r.breached).length,
        totalSRs: srNow.rows.length,
      },
      verticals: Object.keys(VID).map(name => ({ name, id: VID[name], ...(byV[name] || { open: 0, won: 0, openCount: 0, wonCount: 0, lostCount: 0 }), dealValue: dealValueByV[name] || 0 })),
      weekly: leadWeekly.rows.map((r, i) => ({ week: r.wk, leads: r.created, srOpened: srWeekly.rows[i]?.opened || 0, srResolved: srWeekly.rows[i]?.resolved || 0 })),
      ageing: Object.entries(ageing).map(([bucket, count]) => ({ bucket, count })),
      srByStatus, srOpenByPriority, rmBoard,
      upcoming: upcoming.rows.map(u => ({ ...u, value: rupees(u.value_estimate) })),
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
