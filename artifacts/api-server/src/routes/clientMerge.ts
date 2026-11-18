import { Router } from "express";
import { pool, query } from "../lib/db";
import { logAudit } from "../lib/audit";
import { requireAdmin } from "../lib/session";

// Duplicate clients / companies — find them and merge them (admins), with undo.
//
//   GET  /api/clients/duplicates          → groups of likely duplicates (same PAN, CIN, e-mail, mobile or company name)
//   POST /api/clients/merge               { keep_id, merge_ids[] } → one record kept, the others merged into it
//   GET  /api/clients/merges              → recent merges
//   POST /api/clients/merges/:id/undo     → puts everything back the way it was
//
// How a merge works (one database transaction — all or nothing):
//   1. Everything linked to the duplicates moves to the record you keep: opportunities, deals, service requests,
//      documents, contacts / people, meetings, interactions, tasks, access requests, verticals and comments.
//   2. Blank fields on the kept record are filled from the duplicates (PAN, CIN, mobile, e-mail, address, website,
//      sector, financials …). Filled-in values on the kept record are never overwritten.
//   3. The duplicates are not deleted: they are marked "Merged" (pointing to the kept record), disappear from lists,
//      search and pickers, and their old codes are noted on the kept record.
//   4. Every moved row is recorded, so "Undo" restores the duplicates and moves their records back.
export const clientMergeRouter = Router();
const UUID = /^[0-9a-f-]{36}$/i;

// Tables whose client_id points to a client (m365_config.client_id is an Azure app id, not a client)
const LINKED = ["leads", "deals", "service_requests", "documents", "company_people", "client_contacts", "interactions", "tasks", "meetings", "client_access_requests"];
// Fields copied onto the kept record when it is blank there
const FILL = ["pan", "cin", "mobile", "landline", "email", "address", "website", "sector", "industry", "group_name", "listed_status", "exchange_symbol", "hq_city",
  "date_of_birth", "date_of_incorporation", "demat_account", "dp_id", "ckyc_id", "rm_id", "owner_id", "relationship_owner_id",
  "revenue_cr", "ebitda_cr", "pat_cr", "net_worth_cr", "valuation_cr", "fin_year", "fin_source", "fin_as_of"];

export const NAME_NORM_SQL = (col: string) =>
  `regexp_replace(regexp_replace(lower(coalesce(${col},'')), '\\m(private|pvt|limited|ltd|llp|the|india|co|company|inc|corp|corporation)\\M', '', 'g'), '[^a-z0-9]', '', 'g')`;
const FREE_MAIL = "'gmail.com','googlemail.com','yahoo.com','yahoo.co.in','hotmail.com','outlook.com','live.com','rediffmail.com','icloud.com','aol.com','proton.me','protonmail.com','zoho.com'";

clientMergeRouter.get("/duplicates", requireAdmin, async (_req, res) => {
  try {
    const live = "COALESCE(status,'') <> 'Merged'";
    const pairs = (await query(`
      WITH c AS (SELECT id, ${NAME_NORM_SQL("name")} AS nk, upper(nullif(trim(pan),'')) AS pan, upper(nullif(trim(cin),'')) AS cin,
                        lower(nullif(trim(email),'')) AS em, right(regexp_replace(coalesce(mobile,''),'\\D','','g'),10) AS mob
                   FROM clients WHERE ${live})
      -- Different PANs / CINs mean different entities, even if the name, e-mail or mobile matches
      SELECT a, b, why FROM (
        SELECT a.id AS a, b.id AS b, 'Same PAN' AS why FROM c a JOIN c b ON a.pan = b.pan AND a.id < b.id
        UNION ALL SELECT a.id, b.id, 'Same CIN' FROM c a JOIN c b ON a.cin = b.cin AND a.id < b.id
        UNION ALL SELECT a.id, b.id, 'Same name' FROM c a JOIN c b ON a.nk = b.nk AND a.id < b.id
           WHERE length(a.nk) >= 4 AND NOT COALESCE(a.pan <> b.pan, false) AND NOT COALESCE(a.cin <> b.cin, false)
        UNION ALL SELECT a.id, b.id, 'Same e-mail' FROM c a JOIN c b ON a.em = b.em AND a.id < b.id
           WHERE split_part(a.em,'@',2) NOT IN (${FREE_MAIL}) AND NOT COALESCE(a.pan <> b.pan, false) AND NOT COALESCE(a.cin <> b.cin, false)
        UNION ALL SELECT a.id, b.id, 'Same mobile' FROM c a JOIN c b ON a.mob = b.mob AND a.id < b.id
           WHERE length(a.mob) = 10 AND NOT COALESCE(a.pan <> b.pan, false) AND NOT COALESCE(a.cin <> b.cin, false)
      ) x
       LIMIT 2000`)).rows;
    // group connected pairs
    const parent: Record<string, string> = {}; const find = (x: string): string => (parent[x] ??= x) === x ? x : (parent[x] = find(parent[x]));
    const reasons: Record<string, Set<string>> = {};
    for (const p of pairs) { const ra = find(p.a), rb = find(p.b); if (ra !== rb) parent[rb] = ra; }
    for (const p of pairs) { const r = find(p.a); (reasons[r] ||= new Set()).add(p.why); }
    const ids = Object.keys(parent);
    if (!ids.length) return res.json({ groups: [] });
    const rows = (await query(`
      SELECT c.id, c.client_code, c.name, c.type, c.category, c.pan, c.cin, c.email, c.mobile, c.hq_city, c.status, c.kyc_status, c.created_at,
             (SELECT array_agg(vertical) FROM client_verticals v WHERE v.client_id=c.id) AS verticals,
             ${LINKED.map(t => `(SELECT COUNT(*)::int FROM ${t} x WHERE x.client_id=c.id) AS n_${t}`).join(", ")}
        FROM clients c WHERE c.id = ANY($1)`, [ids])).rows;
    const byId = Object.fromEntries(rows.map((r: any) => [r.id, r]));
    const groups: Record<string, any[]> = {};
    for (const id of ids) if (byId[id]) (groups[find(id)] ||= []).push(byId[id]);
    const out = Object.entries(groups).filter(([, g]) => g.length > 1).map(([root, g]) => {
      const linked = (r: any) => LINKED.reduce((s, t) => s + (r[`n_${t}`] || 0), 0);
      g.sort((x, y) => linked(y) - linked(x) || +new Date(x.created_at) - +new Date(y.created_at));
      return { reasons: [...(reasons[root] || [])], suggested_keep: g[0].id, clients: g.map(r => ({ ...r, linked: linked(r) })) };
    });
    res.json({ groups: out });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

clientMergeRouter.post("/merge", requireAdmin, async (req, res) => {
  const keep = String(req.body?.keep_id || ""), merge: string[] = [...new Set<string>((req.body?.merge_ids || []).map(String))].filter(x => x !== keep);
  if (!UUID.test(keep) || !merge.length || !merge.every(x => UUID.test(x))) return res.status(400).json({ error: "Choose the record to keep and at least one duplicate." });
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const all = (await db.query("SELECT * FROM clients WHERE id = ANY($1) FOR UPDATE", [[keep, ...merge]])).rows;
    const kept = all.find((c: any) => c.id === keep);
    if (!kept) throw Object.assign(new Error("The record to keep was not found"), { status: 404 });
    const dups = all.filter((c: any) => c.id !== keep);
    if (dups.length !== merge.length) throw Object.assign(new Error("A duplicate was not found"), { status: 404 });
    if (dups.some((c: any) => c.status === "Merged") || kept.status === "Merged") throw Object.assign(new Error("One of these records has already been merged"), { status: 409 });

    // moved[table][duplicate id] = ids of the rows that moved — used to put them back on Undo
    const moved: Record<string, Record<string, string[]>> = {};
    for (const t of LINKED) for (const d of merge) {
      const r = await db.query(`UPDATE ${t} SET client_id=$1 WHERE client_id=$2 RETURNING id`, [keep, d]);
      if (r.rows.length) ((moved[t] ||= {})[d] = r.rows.map((x: any) => String(x.id)));
    }
    const movedCount = Object.fromEntries(Object.entries(moved).map(([t, o]) => [t, Object.values(o).reduce((n, ids) => n + ids.length, 0)]));
    // verticals (unique per client): add the duplicates' verticals to the kept record
    const vrows = (await db.query("SELECT client_id, vertical FROM client_verticals WHERE client_id = ANY($1)", [merge])).rows;
    await db.query("INSERT INTO client_verticals (client_id, vertical) SELECT $1, vertical FROM client_verticals WHERE client_id = ANY($2) ON CONFLICT DO NOTHING", [keep, merge]);
    const comments: Record<string, string[]> = {};
    for (const d of merge) comments[d] = (await db.query("UPDATE entity_comments SET entity_id=$1 WHERE entity_type='client' AND entity_id::text=$2 RETURNING id", [keep, d])).rows.map((x: any) => String(x.id));

    // fill blanks on the kept record
    const filled: Record<string, any> = {};
    for (const f of FILL) {
      if (!(f in kept)) continue;
      const blank = kept[f] === null || kept[f] === undefined || String(kept[f]).trim() === "";
      if (!blank) continue;
      const from = dups.find((d: any) => d[f] !== null && d[f] !== undefined && String(d[f]).trim() !== "");
      if (from) filled[f] = from[f];
    }
    // PAN / CIN must stay unique: free them on the duplicates first
    await db.query("UPDATE clients SET pan=NULL, cin=NULL WHERE id = ANY($1)", [merge]);
    if (Object.keys(filled).length) {
      const cols = Object.keys(filled);
      await db.query(`UPDATE clients SET ${cols.map((c, i) => `${c}=$${i + 2}`).join(", ")}, updated_at=NOW() WHERE id=$1`, [keep, ...cols.map(c => filled[c])]);
    }
    const codes = dups.map((d: any) => `${d.name} (${d.client_code})`).join(", ");
    await db.query(`UPDATE clients SET notes = trim(both E'\\n' from concat_ws(E'\\n', notes, $2::text)) WHERE id=$1`, [keep, `Merged from ${codes} on ${new Date().toISOString().slice(0, 10)} by ${req.user?.name || "admin"}`]);
    await db.query(`UPDATE clients SET status='Merged', merged_into=$2, merged_at=NOW(), merged_by=$3::text, updated_at=NOW() WHERE id = ANY($1)`, [merge, keep, req.user?.name || null]);
    await db.query("DELETE FROM client_verticals WHERE client_id = ANY($1)", [merge]);

    const log = (await db.query(`INSERT INTO client_merges (kept_id, merged_ids, before_kept, before_merged, moved, verticals, comments, filled, merged_by, merged_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
      [keep, merge, JSON.stringify(kept), JSON.stringify(dups), JSON.stringify(moved), JSON.stringify(vrows), JSON.stringify(comments), JSON.stringify(filled), req.user?.id || null, req.user?.name || null])).rows[0];
    await db.query(`INSERT INTO entity_comments (entity_type, entity_id, user_id, user_name, body) VALUES ('client', $1, $2, $3, $4)`,
      [keep, req.user?.id || null, req.user?.name || "System", `Merged ${codes} into this record — ${Object.entries(movedCount).map(([t, n]) => `${n} ${t.replace(/_/g, " ")}`).join(", ") || "no linked records"} moved`]).catch(() => {});
    await db.query("COMMIT");
    await logAudit({ entityType: "client", entityId: keep, entityCode: kept.client_code, action: "MERGE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role,
      recordDisplay: `${kept.name} (${kept.client_code}) ← ${codes}`, before: { kept, duplicates: dups }, after: { moved, filled } }).catch(() => {});
    res.json({ ok: true, merge_id: log.id, kept: { id: keep, name: kept.name, client_code: kept.client_code }, merged: dups.map((d: any) => ({ id: d.id, name: d.name, client_code: d.client_code })),
      moved: movedCount, filled: Object.keys(filled) });
  } catch (e: any) {
    await db.query("ROLLBACK").catch(() => {});
    res.status(e.status || 500).json({ error: e.message });
  } finally { db.release(); }
});

clientMergeRouter.get("/merges", requireAdmin, async (_req, res) => {
  try {
    const r = await query(`SELECT m.id, m.kept_id, m.merged_ids, m.moved, m.filled, m.merged_by_name, m.created_at, m.undone_at, m.undone_by_name,
        c.name AS kept_name, c.client_code AS kept_code,
        (SELECT json_agg(json_build_object('name', d->>'name', 'client_code', d->>'client_code')) FROM jsonb_array_elements(m.before_merged) d) AS merged
      FROM client_merges m LEFT JOIN clients c ON c.id=m.kept_id ORDER BY m.created_at DESC LIMIT 50`);
    res.json({ data: r.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

clientMergeRouter.post("/merges/:id/undo", requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid merge" });
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const m = (await db.query("SELECT * FROM client_merges WHERE id=$1 FOR UPDATE", [req.params.id])).rows[0];
    if (!m) throw Object.assign(new Error("Merge not found"), { status: 404 });
    if (m.undone_at) throw Object.assign(new Error("This merge has already been undone"), { status: 409 });
    const before: any[] = m.before_merged || [];
    // records that came from each duplicate go back to it
    const moved: Record<string, Record<string, string[]>> = m.moved || {};
    for (const t of Object.keys(moved)) {
      if (!LINKED.includes(t)) continue;
      for (const [dupId, ids] of Object.entries(moved[t])) {
        // only rows still on the kept record go back (anything re-assigned since stays where it is)
        await db.query(`UPDATE ${t} SET client_id=$1 WHERE client_id=$2 AND id::text = ANY($3)`, [dupId, m.kept_id, ids]);
      }
    }
    for (const [dupId, ids] of Object.entries((m.comments || {}) as Record<string, string[]>)) {
      if (ids.length) await db.query("UPDATE entity_comments SET entity_id=$1 WHERE entity_type='client' AND entity_id::text=$2 AND id::text = ANY($3)", [dupId, m.kept_id, ids]);
    }
    // restore the duplicates
    for (const d of before) {
      await db.query(`UPDATE clients SET status=$2::text, pan=$3::text, cin=$4::text, merged_into=NULL, merged_at=NULL, merged_by=NULL, updated_at=NOW() WHERE id=$1`, [d.id, d.status, d.pan, d.cin]);
    }
    for (const v of (m.verticals || [])) await db.query("INSERT INTO client_verticals (client_id, vertical) VALUES ($1,$2) ON CONFLICT DO NOTHING", [v.client_id, v.vertical]);
    // fields filled on the kept record go back to blank
    const filled = Object.keys(m.filled || {});
    if (filled.length) await db.query(`UPDATE clients SET ${filled.map(c => `${c}=NULL`).join(", ")}, updated_at=NOW() WHERE id=$1`, [m.kept_id]);
    await db.query("UPDATE client_merges SET undone_at=NOW(), undone_by_name=$2::text WHERE id=$1", [m.id, req.user?.name || null]);
    await db.query(`INSERT INTO entity_comments (entity_type, entity_id, user_id, user_name, body) VALUES ('client', $1, $2, $3, $4)`,
      [m.kept_id, req.user?.id || null, req.user?.name || "System", `Merge undone — ${before.map(d => `${d.name} (${d.client_code})`).join(", ")} restored`]).catch(() => {});
    await db.query("COMMIT");
    await logAudit({ entityType: "client", entityId: m.kept_id, action: "UNMERGE", userId: req.user?.id, userName: req.user?.name, userRole: req.user?.role, recordDisplay: `Undo merge ${m.id}` }).catch(() => {});
    res.json({ ok: true });
  } catch (e: any) {
    await db.query("ROLLBACK").catch(() => {});
    res.status(e.status || 500).json({ error: e.message });
  } finally { db.release(); }
});
