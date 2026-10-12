import { query, pool } from "./db";

// ─── NIYTRI AI agent: data access layer ───────────────────────────────────────
// The model never sees the real tables. Each question runs in its own transaction where we create
// TEMP VIEWS with the same names as the business tables, already filtered to what this user may see
// (verticals, hidden verticals/modules, safe user columns). search_path is then pinned to pg_temp and
// the transaction is made READ ONLY, so the model's SQL can only read those views — no matter what it writes.

export const VERTICALS = [
  { code: "retail", name: "Retail Broking" }, { code: "corporate", name: "Corporate Broking" },
  { code: "ib", name: "Investment Banking" }, { code: "aif", name: "AIF" }, { code: "ie", name: "Institutional Equities" },
];

export type Scope = { names: string[] | null; codes: string[] | null }; // null = no restriction

const lit = (s: string) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a: string[]) => `ARRAY[${a.map(lit).join(",") || "''"}]::varchar[]`;

// ₹ text ("₹48.2Cr", "5,00,00,000", "₹10L") → numeric rupees, done in SQL so the model can SUM/ORDER on it
const RUPEES = (col: string) => `(SELECT CASE WHEN m IS NULL THEN NULL ELSE m[1]::numeric * CASE
    WHEN lower(coalesce(m[2],'')) LIKE 'cr%' THEN 10000000 WHEN lower(coalesce(m[2],'')) IN ('l','lakh','lac','lakhs') THEN 100000
    WHEN lower(coalesce(m[2],'')) = 'k' THEN 1000 WHEN lower(coalesce(m[2],'')) IN ('m','mn') THEN 1000000 ELSE 1 END END
  FROM (SELECT regexp_match(replace(${col}::text, ',', ''), '([0-9]+(?:\\.[0-9]+)?)\\s*(crores?|cr|lakhs?|lac|l|k|mn|m)?', 'i') AS m) x)`;

/** View definitions. Only tables in `allowed` are exposed (plus the reference ones). */
export function viewSql(allowed: Set<string>, scope: Scope): { name: string; sql: string }[] {
  const vn = scope.names ? `vertical = ANY(${arr(scope.names)})` : "TRUE";
  const vnNull = scope.names ? `(vertical IS NULL OR vertical = ANY(${arr(scope.names)}))` : "TRUE";
  const clientOk = scope.codes
    ? `(NOT EXISTS (SELECT 1 FROM public.client_verticals x WHERE x.client_id = c.id) OR EXISTS (SELECT 1 FROM public.client_verticals x WHERE x.client_id = c.id AND x.vertical = ANY(${arr(scope.codes)})))`
    : "TRUE";
  const v: { name: string; sql: string }[] = [];
  const add = (name: string, sql: string) => v.push({ name, sql });
  if (allowed.has("clients")) {
    add("clients", `SELECT c.* FROM public.clients c WHERE ${clientOk}`);
    add("client_verticals", `SELECT cv.* FROM public.client_verticals cv JOIN pg_temp.clients c ON c.id = cv.client_id${scope.codes ? ` WHERE cv.vertical = ANY(${arr(scope.codes)})` : ""}`);
    add("client_contacts", `SELECT cc.* FROM public.client_contacts cc JOIN pg_temp.clients c ON c.id = cc.client_id`);
  }
  if (allowed.has("company_people") && allowed.has("clients")) add("company_people", `SELECT p.* FROM public.company_people p JOIN pg_temp.clients c ON c.id = p.client_id`);
  if (allowed.has("leads")) add("leads", `SELECT l.*, ${RUPEES("l.value_estimate")} AS value_rupees FROM public.leads l WHERE l.stage <> 'deleted' AND ${vn.replace("vertical", "l.vertical")}`);
  if (allowed.has("deals")) add("deals", `SELECT d.*, ${RUPEES("d.value")} AS value_rupees FROM public.deals d WHERE d.stage <> 'deleted' AND ${vn.replace("vertical", "d.vertical")}`);
  if (allowed.has("service_requests")) add("service_requests", `SELECT * FROM public.service_requests WHERE ${vnNull}`);
  if (allowed.has("documents")) add("documents", `SELECT id, doc_code, name, type, client_id, sr_id, lead_id, deal_id, vertical, status, current_version, created_by, created_at, updated_at FROM public.documents WHERE ${vnNull}`);
  if (allowed.has("interactions")) add("interactions", `SELECT * FROM public.interactions WHERE ${vnNull}`);
  if (allowed.has("tasks")) add("tasks", `SELECT * FROM public.tasks WHERE ${vnNull}`);
  if (allowed.has("audit_logs")) add("audit_logs", `SELECT id, entity_type, entity_id, entity_code, user_name, user_role, action, details, changed_fields, record_display, created_at FROM public.audit_logs`);
  // reference data — always available, safe columns only
  add("users", `SELECT id, name, email, role, vertical, status, auth_type, last_login, created_at FROM public.users`);
  add("pipeline_stages", `SELECT entity, vertical, stage_id, label, sort_order, is_won, is_lost, is_active FROM public.pipeline_stages`);
  return v;
}

const BLOCK = /\b(insert|update|delete|merge|drop|create|alter|truncate|grant|revoke|copy|call|do|vacuum|analyze|lock|listen|notify|set|reset|prepare|execute|refresh)\b|pg_catalog|information_schema|\bpg_[a-z_]+\s*\(|\bpublic\s*\.|current_setting|set_config|dblink|lo_import|lo_export|pg_read|pg_sleep/i;

/** Validate one model-written query: a single SELECT/WITH statement. Returns an error message or null. */
export function checkSql(sql: string): string | null {
  const s = sql.trim().replace(/;\s*$/, "");
  if (!/^(select|with)\b/i.test(s)) return "Only a single SELECT (or WITH … SELECT) query is allowed.";
  if (s.includes(";")) return "Only one statement per query block.";
  const m = s.replace(/'(?:[^']|'')*'/g, "''").match(BLOCK); // ignore keywords inside string literals
  if (m) return `Not allowed in a read-only query: "${m[0]}".`;
  return null;
}

export type QueryResult = { sql: string; ok: boolean; rows?: any[]; rowCount?: number; error?: string };

/** Run the model's queries inside the user's scoped, read-only sandbox. */
export async function runScoped(queries: string[], allowed: Set<string>, scope: Scope): Promise<QueryResult[]> {
  const out: QueryResult[] = [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '8s'");
    await client.query("SET LOCAL TIME ZONE 'Asia/Kolkata'");
    for (const v of viewSql(allowed, scope)) await client.query(`CREATE TEMP VIEW ${v.name} AS ${v.sql}`);
    await client.query("SET TRANSACTION READ ONLY");
    await client.query("SET LOCAL search_path = pg_temp");
    for (const sql of queries) {
      const bad = checkSql(sql);
      if (bad) { out.push({ sql, ok: false, error: bad }); continue; }
      await client.query("SAVEPOINT q");
      try {
        const r = await client.query(sql.trim().replace(/;\s*$/, ""));
        out.push({ sql, ok: true, rows: r.rows, rowCount: r.rowCount ?? r.rows.length });
        await client.query("RELEASE SAVEPOINT q");
      } catch (e: any) {
        await client.query("ROLLBACK TO SAVEPOINT q").catch(() => {});
        out.push({ sql, ok: false, error: String(e.message || e).replace(/pg_temp_\d+\./g, "") });
      }
    }
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
  return out;
}

// ─── Live schema description (built from the real columns, so it never drifts) ───
const ENUM_COLS: Record<string, string[]> = {
  clients: ["type", "category", "status", "kyc_status", "risk_profile", "sector", "listed_status", "relationship_strength"],
  client_verticals: ["vertical"], client_contacts: ["contact_type"],
  company_people: ["role_type"],
  leads: ["vertical", "priority", "status", "source", "opportunity_type", "lost_reason", "product"],
  deals: ["vertical", "stage", "type", "deal_type"],
  service_requests: ["status", "priority", "category", "channel", "vertical"],
  documents: ["type", "status"], interactions: ["type", "source"], tasks: ["status", "priority"],
  users: ["role", "vertical", "status"],
};
const NOTES: Record<string, string> = {
  clients: "Clients and IB companies. FKs: rm_id, owner_id, relationship_owner_id → users.id. Company financials *_cr are ₹ crore. Vertical membership is in client_verticals.",
  client_verticals: "Which verticals a client belongs to (codes: retail, corporate, ib, aif, ie).",
  client_contacts: "Extra phone/e-mail entries for a client.",
  company_people: "Promoters / management of a company (client_id → clients.id).",
  leads: "Leads / opportunities (IB calls them opportunities). vertical = full name. value_rupees = numeric ₹ parsed from value_estimate. expected_fee = ₹. stage ids are listed under PIPELINE STAGES. assigned_rm_id → users.id.",
  deals: "Deals / mandates. value_rupees = numeric ₹ parsed from value. rm_id → users.id. stage holds the stage LABEL text.",
  service_requests: "Client service requests. SLA breached = status NOT IN ('Resolved','Closed') AND sla_deadline < now(). Ignore sla_status (not maintained). assigned_to / created_by → users.id.",
  documents: "Document register (no file contents).",
  interactions: "Logged calls / meetings / notes (incl. Quick Log and Fireflies). key_points is a JSON array.",
  tasks: "Action items. Overdue = status='Open' AND due_date < current_date. owner_id → users.id.",
  audit_logs: "Who changed what and when.",
  users: "CRM users (staff).",
  pipeline_stages: "Configured stages per entity ('lead'/'deal') and vertical code.",
};

let schemaCache: { at: number; key: string; text: string } | null = null;

export async function schemaText(allowed: Set<string>): Promise<string> {
  const names = [...allowed, "users", "pipeline_stages"].filter((x, i, a) => a.indexOf(x) === i);
  const key = names.sort().join(",");
  if (schemaCache && schemaCache.key === key && Date.now() - schemaCache.at < 5 * 60_000) return schemaCache.text;
  const cols = await query(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name = ANY($1) ORDER BY table_name, ordinal_position`, [names]);
  const hidden: Record<string, Set<string>> = {
    users: new Set(["password_hash", "mfa_secret", "mfa_enabled", "otp", "mobile", "location"]),
    documents: new Set(["s3_bucket", "s3_key"]),
    audit_logs: new Set(["old_value", "new_value", "ip_address", "user_id"]),
  };
  const short = (t: string) => t.replace("character varying", "text").replace("timestamp with time zone", "timestamptz").replace("timestamp without time zone", "timestamp");
  const parts: string[] = [];
  for (const t of names) {
    let list = cols.rows.filter(r => r.table_name === t && !hidden[t]?.has(r.column_name)).map(r => `${r.column_name} ${short(r.data_type)}`);
    if (t === "users") list = list.filter(c => /^(id|name|email|role|vertical|status|auth_type|last_login|created_at) /.test(c));
    if (t === "leads" || t === "deals") list.push("value_rupees numeric");
    if (!list.length) continue;
    let hints = "";
    for (const c of ENUM_COLS[t] || []) {
      if (!list.some(x => x.startsWith(c + " "))) continue;
      const r = await query(`SELECT DISTINCT ${c}::text AS v FROM public.${t} WHERE ${c} IS NOT NULL LIMIT 26`).catch(() => ({ rows: [] as any[] }));
      if (r.rows.length && r.rows.length <= 25) hints += `\n    ${c} values: ${r.rows.map(x => `'${x.v}'`).join(", ")}`;
    }
    parts.push(`${t} — ${NOTES[t] || ""}\n    ${list.join(", ")}${hints}`);
  }
  const st = await query(`SELECT entity, vertical, string_agg(stage_id || CASE WHEN is_won THEN ' (won)' WHEN is_lost THEN ' (lost)' ELSE '' END || ' = ' || label, ', ' ORDER BY sort_order) AS s
                            FROM public.pipeline_stages WHERE is_active GROUP BY entity, vertical ORDER BY entity, vertical`).catch(() => ({ rows: [] as any[] }));
  const stages = st.rows.map(r => `  ${r.entity} / ${r.vertical}: ${r.s}`).join("\n");
  const text = `${parts.join("\n\n")}\n\nPIPELINE STAGES (stage_id = label):\n${stages}`;
  schemaCache = { at: Date.now(), key, text };
  return text;
}

// ─── PII masking that doesn't destroy business data ───
// Admin masking rules are regexes; some (salary, net worth, address PIN, DOB, demat) also match ordinary numbers,
// amounts and dates. Rules are therefore applied to the columns they belong to, and only "safe" rules — ones that
// can't match a plain number, amount or date — are applied to free text.
export type PiiRule = { field_key: string; regex_pattern: string; mask_display: string };
const PROBES = ["5", "42", "15,900", "1,59,000", "₹15,900 Cr", "₹4,800Cr", "159000000000", "6500000000", "400710", "2026-10-13", "13/10/2026", "2026-10-13T05:30:00.000Z", "FY26", "IB-3041", "NIYT-C-900101"];
const COLUMN_RULES: Record<string, string[]> = {
  pan: ["pan"], mobile: ["mobile"], landline: ["mobile"], phone: ["mobile"], email: ["email"],
  address: ["address"], date_of_birth: ["dob"], dob: ["dob"],
  demat_account: ["demat"], dp_id: ["demat"], ckyc_id: ["demat"], aadhaar: ["aadhaar"], bank_account: ["bank_account"],
};
export function makeMasker(rules: PiiRule[], enabled: boolean) {
  const compiled = rules.map(r => {
    try { if (!r.regex_pattern || r.regex_pattern.trim().length < 4) return null; return { key: r.field_key, re: new RegExp(r.regex_pattern, "g"), mask: r.mask_display }; }
    catch { return null; }
  }).filter(Boolean) as { key: string; re: RegExp; mask: string }[];
  const safe = compiled.filter(c => !PROBES.some(p => { c.re.lastIndex = 0; const hit = c.re.test(p); c.re.lastIndex = 0; return hit; }));
  // Phone numbers written in text (+91 98200 11001, 9820011001) — not amounts (₹…, "… Cr", digit groups)
  const mobileRule = compiled.find(c => c.key === "mobile");
  if (mobileRule && !safe.includes(mobileRule)) safe.push({ key: "mobile_text", re: /(?<![\d₹.,])(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d|[,.]\d|\s*(?:cr|crore|l|lakh|lac|k)\b)/gi, mask: mobileRule.mask });
  const apply = (text: string, list: typeof compiled) => list.reduce((t, c) => t.replace(c.re, c.mask), text);
  const maskText = (text: string) => (enabled ? apply(text, safe) : text);
  const maskValue = (col: string, v: any) => {
    if (!enabled || v === null || v === undefined) return v;
    const keys = COLUMN_RULES[col.toLowerCase()];
    if (keys) {
      const own = compiled.filter(c => keys.includes(c.key));
      const s = String(v);
      const out = own.length ? apply(s, own) : s;
      return out === s ? "•••• (masked)" : out; // PII column: never pass through unmasked
    }
    if (col === "value" && typeof v === "string" && /@|\d{10}/.test(v)) return apply(v, compiled.filter(c => ["email", "mobile"].includes(c.key))) ;
    if (typeof v !== "string" || /^-?\d+(\.\d+)?$/.test(v)) return v; // numbers (incl. numeric strings) are never PII
    return apply(v, safe);
  };
  return { maskText, maskValue };
}

/** Compact, model-friendly rendering of results (caps rows and long values, masks PII per column). */
export function renderResults(results: QueryResult[], maskValue: (col: string, v: any) => any): string {
  return results.map((r, i) => {
    if (!r.ok) return `[${i + 1}] ERROR: ${r.error}`;
    const rows = (r.rows || []).slice(0, 60).map(row => {
      const o: any = {};
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined || v === "") continue;
        let s: any = v instanceof Date ? v.toISOString() : v;
        if (typeof s === "string" && s.length > 400) s = s.slice(0, 400) + "…";
        o[k] = maskValue(k, s);
      }
      return o;
    });
    const more = (r.rowCount || 0) > 60 ? ` (showing first 60 of ${r.rowCount})` : "";
    return `[${i + 1}] ${r.rowCount} row${r.rowCount === 1 ? "" : "s"}${more}\n${JSON.stringify(rows)}`;
  }).join("\n\n");
}
