import { Router } from "express";
import { query } from "../lib/db";
import { encrypt, decrypt } from "../lib/crypto";

const router = Router();

// ─── PII masking helper — DB-driven field configs ─────────────────────────────
interface PiiField { regex_pattern: string; mask_display: string; field_key: string; }

function maskPiiInText(text: string, fields?: PiiField[]): string {
  if (fields && fields.length > 0) {
    let result = text;
    for (const f of fields) {
      try {
        // Skip patterns that are too short / catch-all (e.g. "." alone would replace every character)
        if (!f.regex_pattern || f.regex_pattern.trim().length < 4) continue;
        result = result.replace(new RegExp(f.regex_pattern, "g"), f.mask_display);
      } catch { /* skip bad regex */ }
    }
    return result;
  }
  // Fallback hardcoded patterns when DB not available
  return text
    .replace(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/g, "XXXXX####X")
    .replace(/(\+91[-\s]?|0)?[6-9]\d{9}\b/g, "XXXXXXXXXX")
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "xxx@xxx.com")
    .replace(/\b\d{12,16}\b/g, "XXXX-XXXX-XXXX")
    .replace(/\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b/g, "XX/XX/XXXX")
    .replace(/\b(19|20)\d{2}[\/\-](0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])\b/g, "XXXX-XX-XX");
}

// ─── GET /api/ai/config ───────────────────────────────────────────────────────
// Returns all fields except the raw api_key. Adds `has_api_key` boolean.
router.get("/config", async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, provider, model, endpoint_url, temperature, max_tokens,
              system_prompt, enabled, updated_at, updated_by,
              table_access, bot_prompts, vertical_access_strict, pii_masking_enabled,
              (api_key IS NOT NULL AND api_key <> '') AS has_api_key
       FROM ai_config LIMIT 1`,
    );
    if (!result.rows.length) return res.status(404).json({ error: "No AI config found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/config/reveal — admin: decrypt and return the api_key ────────
router.get("/config/reveal", async (_req, res) => {
  try {
    const result = await query("SELECT api_key FROM ai_config LIMIT 1");
    if (!result.rows.length || !result.rows[0].api_key) {
      return res.status(404).json({ error: "No API key stored" });
    }
    const plain = decrypt(result.rows[0].api_key);
    res.json({ api_key: plain });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/ai/config ───────────────────────────────────────────────────────
router.put("/config", async (req, res) => {
  try {
    const {
      provider, model, api_key, endpoint_url, temperature, max_tokens,
      system_prompt, enabled, updated_by,
      table_access, bot_prompts, vertical_access_strict, pii_masking_enabled,
    } = req.body;
    const existing = await query("SELECT id FROM ai_config LIMIT 1");
    const encryptedKey = api_key && api_key.trim() !== "" ? encrypt(api_key.trim()) : null;

    const tableAccessJson = table_access !== undefined ? JSON.stringify(table_access) : null;
    const botPromptsJson  = bot_prompts  !== undefined ? JSON.stringify(bot_prompts)  : null;
    const piiMasking = typeof pii_masking_enabled === "boolean" ? pii_masking_enabled : null;

    let result;
    if (existing.rows.length) {
      const id = existing.rows[0].id;
      result = await query(
        `UPDATE ai_config
         SET provider=COALESCE($1,provider), model=COALESCE($2,model),
             api_key=COALESCE($3,api_key), endpoint_url=COALESCE($4,endpoint_url),
             temperature=COALESCE($5,temperature), max_tokens=COALESCE($6,max_tokens),
             system_prompt=COALESCE($7,system_prompt), enabled=COALESCE($8,enabled),
             table_access=COALESCE($10::jsonb,table_access),
             bot_prompts=COALESCE($11::jsonb,bot_prompts),
             vertical_access_strict=COALESCE($12,vertical_access_strict),
             pii_masking_enabled=COALESCE($13,pii_masking_enabled),
             updated_by=$9, updated_at=NOW()
         WHERE id=$14
         RETURNING id, provider, model, endpoint_url, temperature, max_tokens,
                   system_prompt, enabled, table_access, bot_prompts, vertical_access_strict,
                   pii_masking_enabled, (api_key IS NOT NULL AND api_key <> '') AS has_api_key`,
        [provider, model, encryptedKey, endpoint_url, temperature, max_tokens,
         system_prompt, enabled, updated_by, tableAccessJson, botPromptsJson,
         vertical_access_strict ?? null, piiMasking, id],
      );
    } else {
      result = await query(
        `INSERT INTO ai_config (provider, model, api_key, endpoint_url, temperature, max_tokens,
                                system_prompt, enabled, updated_by, table_access, bot_prompts,
                                vertical_access_strict, pii_masking_enabled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13)
         RETURNING id, provider, model, endpoint_url, temperature, max_tokens,
                   system_prompt, enabled, table_access, bot_prompts, vertical_access_strict,
                   pii_masking_enabled, (api_key IS NOT NULL AND api_key <> '') AS has_api_key`,
        [provider, model, encryptedKey, endpoint_url, temperature, max_tokens,
         system_prompt, enabled, updated_by,
         tableAccessJson || '["clients","service_requests","leads","deals"]',
         botPromptsJson  || '{}', vertical_access_strict ?? true, piiMasking ?? true],
      );
    }
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('ai_config',$1,$2,'AI Config Updated',$3)",
      [result.rows[0].id, updated_by || "Admin",
       `Provider: ${provider}, Model: ${model}, Enabled: ${enabled}, PiiMasking: ${pii_masking_enabled}`],
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/logs — paginated AI chat log for admin panel ─────────────────
router.get("/logs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
    const offset = parseInt(String(req.query.offset || "0"));
    const search = req.query.search as string || "";
    const rows = await query(
      `SELECT id, user_name, user_role, user_verticals, query, response, sql_query,
              provider, model, latency_ms, created_at
       FROM ai_chat_logs
       WHERE ($1 = '' OR user_name ILIKE $1 OR query ILIKE $1)
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [search ? `%${search}%` : "", limit, offset],
    );
    const count = await query(
      "SELECT COUNT(*) as total FROM ai_chat_logs WHERE ($1='' OR user_name ILIKE $1 OR query ILIKE $1)",
      [search ? `%${search}%` : ""],
    );
    res.json({ rows: rows.rows, total: parseInt(count.rows[0].total) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── DB SCHEMA for AI SQL Agent ───────────────────────────────────────────────
// IMPORTANT: This schema must exactly match the real PostgreSQL tables.
const DB_SCHEMA = `
TABLE: clients
  id (uuid PK), client_code (varchar), name (varchar),
  type (varchar: 'Individual'|'Non-Individual'),
  category (varchar), pan (varchar), mobile (varchar), email (varchar),
  address (text), date_of_birth (date), date_of_incorporation (date),
  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),
  status (varchar: 'Active'|'Dormant'|'Suspended'|'Closed'),
  kyc_status (varchar: 'Verified'|'Pending'|'Expired'),
  risk_profile (varchar: 'Low'|'Moderate'|'High'|'Ultra-High'),
  fatca_status (varchar: 'Compliant'|'Non-Compliant'|'Pending'|'N/A'),
  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),
  created_at (timestamptz), updated_at (timestamptz)
  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.

TABLE: client_verticals
  client_id (uuid FK→clients.id), vertical (varchar: 'retail'|'corporate'|'ib'|'aif'|'ie'), activated_at (timestamptz)
  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id
  VERTICAL CODE MAPPING: 'retail'=Retail Broking, 'corporate'=Corporate Broking, 'ib'=Investment Banking, 'aif'=AIF, 'ie'=Institutional Equities

TABLE: leads
  id (uuid PK), lead_code (varchar), name (varchar),
  vertical (varchar: 'Retail Broking'|'Corporate Broking'|'Investment Banking'|'AIF'|'Institutional Equities'),
  stage (varchar — free text, e.g. 'active','qualified','identified','interest','pitch','closure', etc.),
  priority (varchar: 'Low'|'Medium'|'High'|'Critical'),
  value_estimate (varchar — textual estimate, NOT numeric),
  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),
  status (varchar: 'Active'|'Inactive'), opened_at (timestamptz), closed_at (timestamptz),
  notes (text), created_at (timestamptz)
  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.

TABLE: deals
  id (uuid PK), deal_code (varchar), name (varchar),
  vertical (varchar: same full names as leads),
  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),
  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),
  deal_date (date), notes (text), created_at (timestamptz)
  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.

TABLE: service_requests
  id (uuid PK), sr_code (varchar), subject (varchar), description (text),
  category (varchar), subcategory (varchar), channel (varchar: 'Email'|'Phone'|'Chat'|'Portal'|'WhatsApp'|'Branch'),
  priority (varchar: 'Low'|'Medium'|'High'|'Critical'),
  status (varchar: 'Open'|'In Progress'|'Escalated'|'Resolved'|'Closed'),
  sla_deadline (timestamptz), sla_status (varchar: 'ok'|'warning'|'breached'),
  client_id (uuid FK→clients.id), vertical (varchar),
  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),
  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),
  created_at (timestamptz)
  NOTE: sla_status uses 'warning' NOT 'at_risk'.

TABLE: documents
  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),
  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),
  vertical (varchar), status (varchar: 'Pending'|'Active'|'Expired'),
  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)
  NOTE: No file_path, expiry_date, or uploaded_at columns.

TABLE: users
  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),
  status (varchar: 'Active'|'Inactive'), auth_type (varchar: 'app'|'m365'),
  last_login (timestamptz), created_at (timestamptz)

TABLE: audit_logs
  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),
  user_name (varchar), action (varchar), details (text),
  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)
`.trim();

// Helper: call LLM with given system + messages
async function callLLM(config: any, apiKey: string, system: string, messages: any[]): Promise<string> {
  if (config.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: config.model || "claude-3-5-sonnet-20241022", max_tokens: config.max_tokens || 2048, system, messages }),
    });
    const d: any = await r.json();
    return d.content?.[0]?.text || d.error?.message || "Anthropic API error";
  }
  if (config.provider === "gemini") {
    const contents = [
      { role: "user", parts: [{ text: system }] },
      { role: "model", parts: [{ text: "Understood." }] },
      ...messages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    ];
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model || "gemini-1.5-pro"}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents, generationConfig: { temperature: config.temperature, maxOutputTokens: config.max_tokens || 2048 } }) },
    );
    const d: any = await r.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || d.error?.message || "Gemini API error";
  }
  // OpenAI / Azure / custom endpoint
  const endpoint = config.endpoint_url || "https://api.openai.com/v1/chat/completions";
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      temperature: parseFloat(String(config.temperature)) || 0.3,
      max_tokens: config.max_tokens || 2048,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const d: any = await r.json();
  return d.choices?.[0]?.message?.content || d.error?.message || "OpenAI API error";
}

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post("/chat", async (req, res) => {
  const t0 = Date.now();
  try {
    const { message, history = [], userRole, userVerticals = [], userName, userId } = req.body;

    const configResult = await query("SELECT * FROM ai_config LIMIT 1");
    const config = configResult.rows[0];

    if (!config?.enabled) {
      return res.json({ response: "The AI Assistant is currently disabled. A Super Admin can enable it under Administration → LLM Settings.", configured: false });
    }
    if (!config?.api_key) {
      return res.json({ response: "The AI Assistant has no API key configured. Please go to Administration → LLM Settings and enter a valid API key.", configured: false });
    }

    let apiKey: string;
    try { apiKey = decrypt(config.api_key); } catch {
      return res.status(500).json({ error: "Failed to decrypt AI API key. Contact your administrator." });
    }

    // Allowed tables — default to ALL tables if not restricted
    const allowedTables: string[] = Array.isArray(config.table_access) && config.table_access.length > 0
      ? config.table_access
      : ["clients", "service_requests", "leads", "deals", "documents", "users", "audit_logs"];

    // Build filtered schema: only include sections for allowed tables
    const TABLE_SECTION_KEYS: Record<string, string[]> = {
      clients: ["clients", "client_verticals", "client_contacts"],
      leads: ["leads"],
      deals: ["deals"],
      service_requests: ["service_requests"],
      users: ["users"],
      audit_logs: ["audit_logs"],
      documents: ["documents"],
    };
    const allowedSectionIds = new Set(allowedTables.flatMap(t => TABLE_SECTION_KEYS[t] || [t]));
    const filteredSchema = DB_SCHEMA.split(/(?=^TABLE: )/m)
      .filter(section => {
        const match = section.match(/^TABLE: (\w+)/);
        return match ? allowedSectionIds.has(match[1]) : true;
      })
      .join("\n");

    const isSuperAdmin = ["Super Admin", "Business Head", "Super Admin (NIYTRI)"].includes(userRole);
    const VCODE: Record<string, string> = {
      "Retail Broking": "retail", "Corporate Broking": "corporate",
      "Investment Banking": "ib", "AIF": "aif", "Institutional Equities": "ie",
    };
    const verticalCodes = isSuperAdmin ? [] : (userVerticals as string[]).map(v => VCODE[v] || v).filter(Boolean);
    const verticalFullNames = isSuperAdmin ? [] : (userVerticals as string[]);

    const clientVFilter = verticalCodes.length
      ? `c.id IN (SELECT client_id FROM client_verticals WHERE vertical = ANY(ARRAY['${verticalCodes.join("','")}']::varchar[]))`
      : "TRUE";
    const fullVFilter = verticalFullNames.length
      ? `vertical = ANY(ARRAY['${verticalFullNames.join("','")}']::varchar[])`
      : "TRUE";

    // Role-specific prompt from config (bot_prompts)
    const botPrompts: Record<string, string> = config.bot_prompts || {};
    const rolePrompt = botPrompts[userRole] || "";

    // Table restriction warning for prompt
    const tableNote = allowedTables.length < 6
      ? `\nDATA ACCESS RESTRICTION: You may ONLY query these tables: ${allowedTables.join(", ")}. Refuse queries for any other tables.`
      : "";

    const accessContext = `
USER ACCESS:
- Name: ${userName || "Unknown"}, Role: ${userRole}
- Verticals: ${isSuperAdmin ? "ALL" : (verticalFullNames.join(", ") || "None")}
- SQL filter for clients: WHERE ${clientVFilter}
- SQL filter for leads/deals/SRs: WHERE ${fullVFilter}
${config.system_prompt ? `\nCUSTOM INSTRUCTIONS: ${config.system_prompt}` : ""}
${rolePrompt ? `\nROLE-SPECIFIC INSTRUCTIONS: ${rolePrompt}` : ""}${tableNote}`.trim();

    const sqlAgentSystem = `You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.

DATABASE SCHEMA (only these tables are available):
${filteredSchema}

${accessContext}

STRICT RULES:
1. When the user asks a data question, respond ONLY with valid JSON: {"sql": "<SELECT query>"}
2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.
3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE.
4. Add LIMIT 50 to all queries unless the user explicitly asks for all records.
5. If the question requires NO database lookup (e.g. greeting, explanation, help), respond with: {"answer": "<markdown response>"}
6. Return ONLY raw JSON — no code fences, no markdown wrapper, no explanation outside the JSON.
7. CRITICAL: NEVER invent, assume, or hallucinate data. Only use what the query returns.
8. NEVER reference tables, column names, SQL syntax, or technical details in your final responses to the user.
9. Use ONLY the exact column names defined in the schema above. Do NOT guess column names.`;

    const historyMessages = history.slice(-6).map((h: any) => ({ role: h.from === "ai" ? "assistant" : "user", content: h.text }));
    const userMessage = { role: "user" as const, content: message };

    // Step 1: LLM decides SQL or direct answer
    const rawRequest1 = { system: sqlAgentSystem, messages: [...historyMessages, userMessage] };
    const step1 = await callLLM(config, apiKey, sqlAgentSystem, [...historyMessages, userMessage]);
    console.log("[AI SQL Agent] Step1 raw:", step1.slice(0, 300));

    let sqlQuery: string | null = null;
    let directAnswer: string | null = null;
    try {
      const parsed = JSON.parse(step1.replace(/```json|```/g, "").trim());
      if (parsed.sql) sqlQuery = parsed.sql;
      if (parsed.answer) directAnswer = parsed.answer;
    } catch { directAnswer = step1; }

    // Safety: block any non-SELECT or disallowed-table query
    if (sqlQuery) {
      const safe = sqlQuery.trim().toLowerCase();
      if (!safe.startsWith("select") || /\b(insert|update|delete|drop|create|alter|truncate|grant|revoke)\b/.test(safe)) {
        console.warn("[AI SQL Agent] Blocked unsafe query:", sqlQuery.slice(0, 100));
        sqlQuery = null;
        directAnswer = "I cannot execute data modification queries. Please ask a read-only data question.";
      } else if (config.vertical_access_strict !== false) {
        // Check the query doesn't reference tables not in allowedTables
        const forbiddenTable = Object.keys(TABLE_SECTION_KEYS).find(t =>
          !allowedTables.includes(t) && new RegExp(`\\b${t}\\b`).test(safe)
        );
        if (forbiddenTable) {
          console.warn("[AI SQL Agent] Blocked restricted table:", forbiddenTable);
          sqlQuery = null;
          directAnswer = `Access to the '${forbiddenTable}' table is not allowed for your role.`;
        }
      }
    }

    // ── Source label mapping (generic — never expose real table names) ──────────
    const TABLE_SOURCE_LABELS: Record<string, string> = {
      clients: "Client Registry", client_verticals: "Client Registry",
      leads: "Lead Pipeline", deals: "Deal Records",
      service_requests: "Service Requests", documents: "Document Vault",
      users: "Team Directory", audit_logs: "Audit Trail",
    };
    function getSourceLabel(sql: string | null): string {
      if (!sql) return "AI Knowledge Base";
      const lower = sql.toLowerCase();
      const matched = Object.keys(TABLE_SOURCE_LABELS).filter(t => new RegExp(`\\b${t}\\b`).test(lower));
      if (matched.length === 0) return "CRM Database";
      if (matched.length === 1) return TABLE_SOURCE_LABELS[matched[0]];
      const unique = [...new Set(matched.map(t => TABLE_SOURCE_LABELS[t]))];
      return unique.length === 1 ? unique[0] : "CRM Database";
    }

    // Load PII masking config ONCE — used both to sanitise DB results before LLM and to mask final output
    let piiFields: PiiField[] = [];
    let piiShouldMask = true;
    try {
      const [settingsRow, fieldsRow] = await Promise.all([
        query(`SELECT enabled, apply_to_ai FROM pii_masking_settings LIMIT 1`),
        query(`SELECT field_key, regex_pattern, mask_display FROM pii_masking_fields WHERE is_enabled=true ORDER BY sort_order`),
      ]);
      const s = settingsRow.rows[0];
      piiShouldMask = s ? (s.enabled && s.apply_to_ai) : true;
      piiFields = fieldsRow.rows as PiiField[];
    } catch { /* keep defaults */ }

    let response = "";
    let rawResponse: any = { step1 };
    let accuracy = 0;
    let sourceLabel = "AI Knowledge Base";

    if (directAnswer) {
      response = directAnswer;
      accuracy = 78;
      sourceLabel = "AI Knowledge Base";
    } else if (sqlQuery) {
      let dbResults = "";
      let rowCount = 0;
      let dbError = false;
      try {
        console.log("[AI SQL Agent] Executing:", sqlQuery.slice(0, 200));
        const result = await query(sqlQuery);
        rowCount = result.rows.length;
        if (rowCount > 0) {
          // Mask PII in the raw DB data BEFORE sending to the LLM for synthesis
          // This ensures the model never sees real PAN, mobile, email, Aadhaar etc.
          const rawJson = JSON.stringify(result.rows.slice(0, 50), null, 2);
          dbResults = piiShouldMask ? maskPiiInText(rawJson, piiFields) : rawJson;
        } else {
          dbResults = "No records found.";
        }
      } catch (dbErr: any) {
        dbError = true;
        console.error("[AI SQL Agent] DB error — SQL:", sqlQuery.slice(0, 500));
        console.error("[AI SQL Agent] DB error — detail:", dbErr.message);
        rawResponse = { step1, sql: sqlQuery, dbError: dbErr.message };
      }

      sourceLabel = getSourceLabel(sqlQuery);

      if (dbError) {
        response = "I wasn't able to retrieve that data right now. The query could not be completed — please try rephrasing your question or ask something different.";
        accuracy = 0;
      } else {
        const synthSystem = `You are the NIYTRI CRM AI Assistant. A database query returned the results below. Present the information clearly and professionally.

FORMATTING RULES:
- For a SINGLE client/record: show a clean profile card using bold labels and line breaks — group into sections like Basic Info, Contact Details, KYC & Compliance, Accounts. Use "**Label:** value" format. Do NOT use a raw table.
- For MULTIPLE records (list/summary): use a markdown table with concise columns, or a numbered/bulleted list. Bold key figures.
- For analytics/counts: bold the number, give a 1-line context.
- Always use clean readable English — no JSON, no field names like "client_code" or "rm_id".
- Translate technical IDs to descriptive labels (e.g. "rm_id" → "Relationship Manager").

STRICT RULES:
- ONLY use the information provided in the query results. Never invent or assume data.
- If results are empty, say clearly no matching records were found.
- Never mention SQL, table names, column names, or any technical implementation details.
- Sensitive fields (PAN, Aadhaar, mobile, email, account numbers) shown in the data are already masked — present them as-is.
- Be concise. No filler phrases like "Based on the data" or "It seems that".`;

        const synthMessages = [
          ...historyMessages, userMessage,
          {
            role: "assistant" as const,
            content: `Query results (${rowCount} record${rowCount !== 1 ? "s" : ""} found):\n${dbResults}`
          },
          {
            role: "user" as const,
            content: rowCount > 0
              ? "Present these results clearly for the user using the formatting rules above."
              : "No records were found. Tell the user that no matching data exists — do not invent any.",
          },
        ];
        response = await callLLM(config, apiKey, synthSystem, synthMessages);
        rawResponse = { step1, sql: sqlQuery, dbRows: rowCount, dbResults: dbResults.slice(0, 2000) };
        accuracy = rowCount > 0 ? 93 : 82;
      }
    } else {
      response = "I wasn't able to process your request. Please try rephrasing your question.";
      accuracy = 0;
    }

    // Apply PII masking to the final response (piiFields already loaded above)
    // This is a second pass — catches anything the LLM may have rephrased from history or context
    if (config.pii_masking_enabled !== false) {
      if (piiShouldMask) {
        response = maskPiiInText(response, piiFields.length > 0 ? piiFields : undefined);
      }
    }

    const latencyMs = Date.now() - t0;

    // Log to ai_chat_logs (detailed)
    await query(
      `INSERT INTO ai_chat_logs (user_id, user_name, user_role, user_verticals, query, response, sql_query, provider, model, latency_ms, raw_request, raw_response)
       VALUES ($1,$2,$3,$4::text[],$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)`,
      [
        userId || null, userName || "Unknown", userRole || null,
        userVerticals, message, response.slice(0, 10000), sqlQuery,
        config.provider, config.model, latencyMs,
        JSON.stringify(rawRequest1), JSON.stringify(rawResponse),
      ],
    );

    // Also add brief entry to audit_logs
    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('ai_chat', gen_random_uuid(), $1, 'AI Chat', $2)",
      [userName || "Unknown", message.slice(0, 100)],
    );

    res.json({ response, configured: true, sqlUsed: !!sqlQuery, accuracy, sourceLabel });
  } catch (err: any) {
    console.error("[AI chat error] Full detail:", err.message, err.stack?.slice(0, 500));
    // Return a friendly response — never expose raw error to UI
    res.json({ response: "Something went wrong while processing your request. Please try again in a moment.", configured: true, sqlUsed: false });
  }
});

export default router;
