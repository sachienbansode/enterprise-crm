import { Router } from "express";
import { query, pool } from "../lib/db";
import { encrypt, decrypt } from "../lib/crypto";
import { visibleNames } from "../lib/visibility";
import { VERTICALS, runScoped, schemaText, renderResults, makeMasker, type Scope } from "../lib/aiAgent";
import { agentTurn, isNarration, type AgentMsg } from "../lib/aiTools";

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
              fallback_enabled, fallback_provider, fallback_model, fallback_endpoint_url,
              (api_key IS NOT NULL AND api_key <> '') AS has_api_key,
              (fallback_api_key IS NOT NULL AND fallback_api_key <> '') AS has_fallback_api_key
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
      fallback_enabled, fallback_provider, fallback_model, fallback_api_key, fallback_endpoint_url,
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
    // Fallback LLM settings (key stored encrypted; empty key = keep existing)
    const encFallbackKey = fallback_api_key && String(fallback_api_key).trim() !== "" ? encrypt(String(fallback_api_key).trim()) : null;
    const fb = await query(
      `UPDATE ai_config SET
         fallback_enabled=COALESCE($1,fallback_enabled), fallback_provider=COALESCE($2,fallback_provider),
         fallback_model=COALESCE($3,fallback_model), fallback_api_key=COALESCE($4,fallback_api_key),
         fallback_endpoint_url=COALESCE($5,fallback_endpoint_url)
       WHERE id=$6
       RETURNING fallback_enabled, fallback_provider, fallback_model, fallback_endpoint_url,
                 (fallback_api_key IS NOT NULL AND fallback_api_key <> '') AS has_fallback_api_key`,
      [typeof fallback_enabled === "boolean" ? fallback_enabled : null, fallback_provider || null,
       fallback_model || null, encFallbackKey, fallback_endpoint_url ?? null, result.rows[0].id],
    );
    Object.assign(result.rows[0], fb.rows[0] || {});

    await query(
      "INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('ai_config',$1,$2,'AI Config Updated',$3)",
      [result.rows[0].id, updated_by || "Admin",
       `Provider: ${provider}, Model: ${model}, Enabled: ${enabled}, PiiMasking: ${pii_masking_enabled}, Fallback: ${fallback_enabled ? `${fallback_provider}/${fallback_model}` : "off"}`],
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

// Providers want strictly alternating user/assistant turns that start with the user.
function normalizeTurns(messages: any[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = String(m.content ?? "").trim();
    if (!content) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + content;
    else out.push({ role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Helper: call one LLM provider. Throws on HTTP/API errors so the caller can fail over.
async function callProvider(config: any, apiKey: string, system: string, rawMessages: any[]): Promise<string> {
  const messages = normalizeTurns(rawMessages);
  const maxTokens = Math.max(Number(config.max_tokens) || 0, 2048);
  const temperature = Number.isFinite(parseFloat(String(config.temperature))) ? parseFloat(String(config.temperature)) : 0.2;
  if (config.provider === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: config.model || "claude-3-5-sonnet-20241022", max_tokens: maxTokens, temperature, system, messages }),
    });
    const d: any = await r.json().catch(() => ({}));
    const text = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    if (!r.ok || !text) throw new Error(`anthropic ${r.status}: ${d.error?.message || "no content"}`);
    return text;
  }
  if (config.provider === "gemini") {
    const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }) },
    );
    const d: any = await r.json().catch(() => ({}));
    const text = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    if (!r.ok || !text) throw new Error(`gemini ${r.status}: ${d.error?.message || "no content"}`);
    return text;
  }
  // OpenAI / Azure / custom endpoint (OpenAI-compatible)
  const endpoint = config.endpoint_url || "https://api.openai.com/v1/chat/completions";
  const model = config.model || "gpt-4o";
  const reasoning = /^(o\d|gpt-5)/i.test(model); // reasoning models: no temperature, max_completion_tokens
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.provider === "azure") headers["api-key"] = apiKey; else headers["Authorization"] = `Bearer ${apiKey}`;
  const r = await fetch(endpoint, {
    method: "POST", headers,
    body: JSON.stringify({
      model,
      ...(reasoning ? { max_completion_tokens: Math.max(maxTokens, 8000) } : { temperature, max_tokens: maxTokens }),
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const d: any = await r.json().catch(() => ({}));
  const text = d.choices?.[0]?.message?.content;
  if (!r.ok || !text) throw new Error(`${config.provider || "openai"} ${r.status}: ${d.error?.message || "no content"}`);
  return text;
}

// Helper: call the primary LLM; on failure, retry once on the fallback LLM (if enabled).
// Records the provider/model actually used on config.__used for logging.
async function callLLM(config: any, apiKey: string, system: string, messages: any[]): Promise<string> {
  try {
    const out = await callProvider(config, apiKey, system, messages);
    config.__used = { provider: config.provider, model: config.model, fallback: false };
    return out;
  } catch (primaryErr: any) {
    if (!config.fallback_enabled || !config.fallback_provider || !config.fallback_api_key) throw primaryErr;
    console.warn("[AI] Primary LLM failed, switching to fallback:", primaryErr.message);
    const fbKey = decrypt(config.fallback_api_key);
    const fbConfig = {
      ...config,
      provider: config.fallback_provider,
      model: config.fallback_model,
      endpoint_url: config.fallback_endpoint_url || null,
    };
    const out = await callProvider(fbConfig, fbKey, system, messages);
    config.__used = { provider: fbConfig.provider, model: fbConfig.model, fallback: true };
    return out;
  }
}

// ─── POST /api/ai/chat — agent: look up data (several queries if needed), then answer ───
const MAX_ROUNDS = 5;

function splitFollowUps(text: string): { body: string; followUps: string[] } {
  const m = text.match(/\n?\s*\**FOLLOW-?UPS?\**\s*:?\**\s*(.+)\s*$/i);
  if (!m) return { body: text.trim(), followUps: [] };
  const followUps = m[1].split("|").map(x => x.replace(/^[\s\-*•\d.)]+|[\s*]+$/g, "").trim()).filter(x => x.length > 1).slice(0, 3);
  return { body: text.slice(0, m.index).trim(), followUps };
}

router.post("/chat", async (req, res) => {
  const t0 = Date.now();
  try {
    const message = String(req.body?.message || "").trim().slice(0, 4000);
    let history: any[] = Array.isArray(req.body?.history) ? req.body.history : [];
    // Saved conversation: history comes from the database (only the user's own conversations)
    let convId: string | null = /^[0-9a-f-]{36}$/i.test(String(req.body?.conversation_id || "")) ? String(req.body.conversation_id) : null;
    if (convId) {
      const own = (await query("SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2", [convId, req.user!.id])).rows[0];
      if (!own) convId = null;
      else history = (await query("SELECT role, text, meta FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 12", [convId])).rows.reverse()
        .map((m: any) => ({ from: m.role, text: m.text, queries: m.meta?.queries || [] }));
    }
    if (!message) return res.status(400).json({ error: "Empty message" });
    // Identity and data scope come from the server-side session, never from the request body
    const userRole = req.user!.role;
    const userName = req.user!.name;
    const userId = req.user!.id;
    const ALL_V = await visibleNames(); // verticals hidden by the admin are out of AI scope too
    const userVerticals: string[] = (!req.user!.vertical || req.user!.vertical === "All" ? ALL_V : [req.user!.vertical]).filter(v => ALL_V.includes(v));

    const config = (await query("SELECT * FROM ai_config LIMIT 1")).rows[0];
    if (!config?.enabled) return res.json({ response: "The AI Assistant is currently disabled. A Super Admin can enable it under Administration → LLM Settings.", configured: false });
    if (!config?.api_key) return res.json({ response: "The AI Assistant has no API key configured. Please go to Administration → LLM Settings and enter a valid API key.", configured: false });
    let apiKey: string;
    try { apiKey = decrypt(config.api_key); } catch { return res.status(500).json({ error: "Failed to decrypt AI API key. Contact your administrator." }); }

    // What this user may see — enforced in the database sandbox (lib/aiAgent.ts), not by the prompt
    const ALL_TABLES = ["clients", "company_people", "leads", "deals", "service_requests", "documents", "interactions", "tasks", "audit_logs"];
    const allowed = new Set<string>(Array.isArray(config.table_access) && config.table_access.length
      ? [...config.table_access, ...(config.table_access.includes("clients") ? ["company_people"] : [])] : ALL_TABLES.filter(t => t !== "audit_logs"));
    const isSuperAdmin = ["Super Admin", "Business Head", "Super Admin (NIYTRI)"].includes(userRole);
    const restricted = !isSuperAdmin || ALL_V.length < VERTICALS.length;
    const scope: Scope = restricted
      ? { names: userVerticals, codes: VERTICALS.filter(v => userVerticals.includes(v.name)).map(v => v.code) }
      : { names: null, codes: null };

    // PII masking — per column for data the model sees, and only number/date-safe rules on the final text
    let piiFields: PiiField[] = []; let piiShouldMask = true;
    try {
      const [st, fl] = await Promise.all([
        query(`SELECT enabled, apply_to_ai FROM pii_masking_settings LIMIT 1`),
        query(`SELECT field_key, regex_pattern, mask_display FROM pii_masking_fields WHERE is_enabled=true ORDER BY sort_order`),
      ]);
      piiShouldMask = st.rows[0] ? (st.rows[0].enabled && st.rows[0].apply_to_ai) : true;
      piiFields = fl.rows as PiiField[];
    } catch { /* defaults */ }
    const masker = makeMasker(piiFields, config.pii_masking_enabled !== false && piiShouldMask);

    const now = new Date();
    const today = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
    const rolePrompt = (config.bot_prompts || {})[userRole] || "";
    const schema = await schemaText(allowed);

    const system = `You are NIYTRI AI, the analyst built into NIYTRI CRM — used by an Indian financial-services firm with Retail Broking, Corporate Broking, Investment Banking (ECM), AIF and Institutional Equities businesses.
You are helping ${userName} (${userRole}; user id ${userId}). Today is ${today}, ${time} IST.

HOW YOU WORK
- Anything about CRM data (clients, companies, people, leads/opportunities, deals/mandates, service requests, tasks, meetings, documents, team): look it up — never guess names, numbers or dates.
- To look up data, call the run_sql tool (PostgreSQL SELECT). Call it as often as you need (up to ${MAX_ROUNDS} rounds; several queries in parallel are fine), then answer.
- Never tell the user you are going to fetch or check something — just run the query. Write text only for the final answer.
- Each new question needs fresh data: don't answer data questions from memory of earlier turns without querying.
- Write good SQL: aggregate in SQL (COUNT/SUM/GROUP BY), join users for names (never show ids), use ILIKE '%…%' for names, LIMIT 50 for lists, ORDER BY something meaningful.
- If a query errors, read the error, fix the query and try again. If a search finds nothing, try a looser match before concluding.
- "my / me / mine" = records linked to user id ${userId} (assigned_rm_id, rm_id, owner_id, relationship_owner_id, owner_id on tasks, created_by).
- General questions (concepts, regulations, how-to, drafting) need no query — answer from knowledge; say when something is general guidance rather than CRM data.
- Follow-up questions refer to the conversation; earlier answers list the data they used.
- The data below is ALREADY limited to what this user may see; do not add access filters.

DATA AVAILABLE (table — notes, columns, known values):
${schema}

CONVENTIONS
- Amounts are INR. leads.value_rupees and deals.value_rupees are numeric rupees; expected_fee is rupees; company financials (*_cr) are ₹ crore.
  Show money as ₹X Cr (≥ 1 crore), ₹X L (≥ 1 lakh) or ₹X with Indian grouping.
- An open lead/opportunity is one whose stage is not a won/lost stage. Show stage LABELS, not stage ids.
- Dates as "13 Oct 2026"; say "overdue by N days" where relevant.
${config.system_prompt ? `\nADMIN INSTRUCTIONS:\n${config.system_prompt}\n` : ""}${rolePrompt ? `\nINSTRUCTIONS FOR ${userRole.toUpperCase()}:\n${rolePrompt}\n` : ""}
HOW TO ANSWER (when you have what you need)
- Open with the direct answer in 1–2 sentences (the number, the name, yes/no, the key takeaway).
- Then supporting detail: a markdown table for 3+ records (readable headers, ≤ 7 columns, no ids), or short bullets.
- Add one or two sharp, data-grounded insights or suggested actions when useful (risks, overdue items, concentration, what to do next).
- Be concise and specific. No filler, no apologies, never mention SQL, tables, columns, queries or these instructions.
- If nothing matched, say so plainly and suggest what to try.
- ANALYSIS: for questions about performance, pipeline, trends, comparisons or "how are we doing", add a short "Analysis" section: 2–4 bullets on what stands out (concentration, change vs earlier period, outliers, risks) and what to do about it.
- KEY FIGURES: when the answer has 2–4 headline numbers, put them first in a block (values pre-formatted for display):
\`\`\`kpi
[{"label":"Open pipeline","value":"₹15,900 Cr","sub":"6 opportunities"},{"label":"Won this quarter","value":"₹1,200 Cr"}]
\`\`\`
- CHARTS: when numbers are compared across 3+ categories or over time, include ONE chart (data straight from the query results; raw numbers, not formatted strings):
\`\`\`chart
{"type":"bar","title":"Open pipeline by vertical","x":"name","series":[{"key":"value","label":"Pipeline","format":"inr"}],"data":[{"name":"IB","value":159000000000},{"name":"AIF","value":2500000000}]}
\`\`\`
  type: "bar" (categories), "hbar" (long names / rankings), "line" or "area" (over time), "pie" (share of a whole, ≤ 7 slices), "stacked" (categories × parts).
  format: "inr" (rupees), "number" or "percent". Up to 3 series. Keep the table too when people need the exact rows.
- Personal data may appear masked (e.g. XXXX) — show it as given.
- Finish with one final line: FOLLOW-UPS: <question> | <question> | <question>  (three short, natural next questions for this user).`;

    // Conversation so far (earlier answers carry the queries they used, so follow-ups stay grounded).
    // Earlier "let me fetch…" replies that never ran anything are dropped so they don't teach the model to stall.
    const msgs: AgentMsg[] = [];
    for (const h of history.slice(-12)) {
      const text = String(h?.text || "").trim();
      if (!text) continue;
      if (h.from === "ai") {
        if (!(Array.isArray(h.queries) && h.queries.length) && isNarration(text)) continue;
        const used = Array.isArray(h.queries) && h.queries.length ? `\n\n(Data used for this answer: ${h.queries.slice(0, 3).map((q: string) => String(q).replace(/\s+/g, " ").slice(0, 600)).join(" ; ")})` : "";
        msgs.push({ role: "assistant", content: text + used });
      } else msgs.push({ role: "user", content: text });
    }
    msgs.push({ role: "user", content: message });

    const ranQueries: string[] = [];
    const trace: any[] = [];
    let records = 0;
    let answer = "";
    let nudges = 0;
    for (let round = 1; round <= MAX_ROUNDS + 1; round++) {
      const final = round > MAX_ROUNDS;
      const reply = await agentTurn(config, apiKey, system, msgs, { final, require: nudges > 0 && !final }, callProvider);
      const calls = reply.toolCalls.filter(c => c.sql.trim()).slice(0, 4);
      if (!calls.length) {
        // The model announced a lookup instead of doing it → push it to actually run the query
        if (!final && nudges < 2 && isNarration(reply.text)) {
          nudges++;
          trace.push({ round, nudge: reply.text.slice(0, 200) });
          msgs.push({ role: "assistant", content: reply.text });
          msgs.push({ role: "user", content: "Don't describe it — run the lookup now, then give me the answer." });
          continue;
        }
        answer = reply.text;
        break;
      }
      const results = await runScoped(calls.map(c => c.sql), allowed, scope);
      results.forEach(r => { if (r.ok) { ranQueries.push(r.sql); records += r.rowCount || 0; } });
      trace.push({ round, queries: calls.map(c => c.sql), results: results.map(r => ({ ok: r.ok, rows: r.rowCount, error: r.error })) });
      msgs.push({ role: "assistant", content: reply.text || "", toolCalls: calls });
      calls.forEach((c, i) => msgs.push({ role: "tool", id: c.id, content: renderResults([results[i]], masker.maskValue).replace(/^\[1\] /, "") }));
    }

    if (!answer) answer = "I couldn't put an answer together for that. Could you rephrase or narrow it down?";
    const { body, followUps } = splitFollowUps(answer);
    // Mask personal data in the text; in chart / KPI blocks only string values are masked (numbers stay intact for plotting)
    const maskBlock = (json: string) => {
      try {
        const walk = (v: any): any => typeof v === "string" ? masker.maskText(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
        return JSON.stringify(walk(JSON.parse(json)));
      } catch { return ""; }
    };
    const response = body.split(/(```(?:chart|kpi)\s*\n[\s\S]*?```)/).map(part => {
      const m = part.match(/^```(chart|kpi)\s*\n([\s\S]*?)```$/);
      if (!m) return masker.maskText(part);
      const j = maskBlock(m[2].trim());
      return j ? "```" + m[1] + "\n" + j + "\n```" : "";
    }).join("");
    const latencyMs = Date.now() - t0;

    await query(
      `INSERT INTO ai_chat_logs (user_id, user_name, user_role, user_verticals, query, response, sql_query, provider, model, latency_ms, raw_request, raw_response)
       VALUES ($1,$2,$3,$4::text[],$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)`,
      [userId || null, userName || "Unknown", userRole || null, userVerticals, message, response.slice(0, 10000),
       ranQueries.join(";\n\n").slice(0, 20000) || null, config.__used?.provider || config.provider, config.__used?.model || config.model, latencyMs,
       JSON.stringify({ history: history.length, scope }), JSON.stringify({ trace })],
    ).catch(e => console.error("[AI] log failed:", e.message));
    await query("INSERT INTO audit_logs (entity_type, entity_id, user_name, action, details) VALUES ('ai_chat', gen_random_uuid(), $1, 'AI Chat', $2)",
      [userName || "Unknown", message.slice(0, 100)]).catch(() => {});

    // Save to the user's conversation (new conversation on the first message, titled from the question)
    try {
      if (!convId) {
        const title = message.replace(/\s+/g, " ").slice(0, 80) + (message.length > 80 ? "…" : "");
        convId = (await query("INSERT INTO ai_conversations (user_id, title) VALUES ($1,$2) RETURNING id", [userId, title])).rows[0].id;
      }
      const meta = { queries: ranQueries.slice(0, 6), followUps, recordCount: ranQueries.length ? records : null, sourceLabel: ranQueries.length ? "Live CRM data" : "General answer (no CRM data used)" };
      await query("INSERT INTO ai_messages (conversation_id, role, text) VALUES ($1,'user',$2)", [convId, message]);
      await query("INSERT INTO ai_messages (conversation_id, role, text, meta) VALUES ($1,'ai',$2,$3::jsonb)", [convId, response, JSON.stringify(meta)]);
      await query("UPDATE ai_conversations SET updated_at=NOW() WHERE id=$1", [convId]);
    } catch (e: any) { console.error("[AI] save conversation failed:", e.message); }

    res.json({
      conversation_id: convId,
      response, followUps, configured: true, sqlUsed: ranQueries.length > 0,
      recordCount: ranQueries.length ? records : null,
      sourceLabel: ranQueries.length ? "Live CRM data" : "General answer (no CRM data used)",
      queries: ranQueries, usedFallback: !!config.__used?.fallback, latencyMs,
    });
  } catch (err: any) {
    console.error("[AI chat error]", err.message, err.stack?.slice(0, 500));
    const msg = /401|invalid.*key|authentication/i.test(err.message) ? "The AI provider rejected the API key. An admin can check it under Administration → LLM Settings."
      : /429|rate|quota/i.test(err.message) ? "The AI provider is rate-limiting right now. Please try again in a minute."
      : "Something went wrong while processing your request. Please try again in a moment.";
    res.json({ response: msg, configured: true, sqlUsed: false });
  }
});

// ─── Saved conversations (own only) ───
router.get("/conversations", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 100);
  const q = String(req.query.q || "").trim();
  try {
    const r = await query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              (SELECT COUNT(*)::int FROM ai_messages m WHERE m.conversation_id=c.id AND m.role='user') AS questions,
              (SELECT left(m.text, 140) FROM ai_messages m WHERE m.conversation_id=c.id AND m.role='ai' ORDER BY m.created_at DESC LIMIT 1) AS preview
         FROM ai_conversations c
        WHERE c.user_id=$1 AND ($2='' OR c.title ILIKE $3 OR EXISTS (SELECT 1 FROM ai_messages m WHERE m.conversation_id=c.id AND m.text ILIKE $3))
        ORDER BY c.updated_at DESC LIMIT ${limit}`, [req.user!.id, q, `%${q}%`]);
    const total = (await query("SELECT COUNT(*)::int AS n FROM ai_conversations WHERE user_id=$1", [req.user!.id])).rows[0].n;
    res.json({ rows: r.rows, total });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.get("/conversations/:id", async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: "Bad id" });
  const c = (await query("SELECT id, title, created_at, updated_at FROM ai_conversations WHERE id=$1 AND user_id=$2", [req.params.id, req.user!.id])).rows[0];
  if (!c) return res.status(404).json({ error: "Not found" });
  const m = await query("SELECT id, role, text, meta, created_at FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at", [c.id]);
  res.json({ ...c, messages: m.rows.map((x: any) => ({ id: x.id, from: x.role, text: x.text, at: x.created_at, followUps: x.meta?.followUps, recordCount: x.meta?.recordCount ?? null, sourceLabel: x.meta?.sourceLabel })) });
});
router.patch("/conversations/:id", async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 200);
  if (!title) return res.status(400).json({ error: "Title required" });
  const r = await query("UPDATE ai_conversations SET title=$1 WHERE id=$2 AND user_id=$3 RETURNING id, title", [title, req.params.id, req.user!.id]);
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(r.rows[0]);
});
router.delete("/conversations/:id", async (req, res) => {
  const r = await query("DELETE FROM ai_conversations WHERE id=$1 AND user_id=$2 RETURNING id", [req.params.id, req.user!.id]);
  if (!r.rows[0]) { res.status(404).json({ error: "Chat not found" }); return; }
  res.json({ ok: true });
});

export default router;

/** One-shot completion for other modules (meeting notes → structured CRM update, etc.).
 *  Returns null when the AI Assistant is disabled or has no key, so callers can fall back. */
export async function aiComplete(system: string, user: string): Promise<string | null> {
  const r = await query("SELECT * FROM ai_config LIMIT 1");
  const config = r.rows[0];
  if (!config?.enabled || !config?.api_key) return null;
  let key: string;
  try { key = decrypt(config.api_key); } catch { return null; }
  return callLLM({ ...config, temperature: 0.1 }, key, system, [{ role: "user", content: user }]);
}

/** Vision call (business-card reading etc.). images = [{ mime, b64 }].
 *  Uses the configured LLM (Anthropic / Gemini / OpenAI / Azure OpenAI — all vision-capable models), with the fallback LLM on failure.
 *  Returns null when the AI Assistant is disabled or has no key. */
export async function aiVision(system: string, prompt: string, images: { mime: string; b64: string }[]): Promise<string | null> {
  const r = await query("SELECT * FROM ai_config LIMIT 1");
  const config = r.rows[0];
  if (!config?.enabled || !config?.api_key) return null;
  const one = async (cfg: any, apiKey: string): Promise<string> => {
    if (cfg.provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: cfg.model || "claude-3-5-sonnet-20241022", max_tokens: 2048, temperature: 0, system,
          messages: [{ role: "user", content: [...images.map(i => ({ type: "image", source: { type: "base64", media_type: i.mime, data: i.b64 } })), { type: "text", text: prompt }] }] }),
      });
      const d: any = await resp.json().catch(() => ({}));
      const text = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      if (!resp.ok || !text) throw new Error(`anthropic ${resp.status}: ${d.error?.message || "no content"}`);
      return text;
    }
    if (cfg.provider === "gemini") {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, generationConfig: { temperature: 0, maxOutputTokens: 2048 },
          contents: [{ role: "user", parts: [...images.map(i => ({ inline_data: { mime_type: i.mime, data: i.b64 } })), { text: prompt }] }] }),
      });
      const d: any = await resp.json().catch(() => ({}));
      const text = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      if (!resp.ok || !text) throw new Error(`gemini ${resp.status}: ${d.error?.message || "no content"}`);
      return text;
    }
    const endpoint = cfg.endpoint_url || "https://api.openai.com/v1/chat/completions";
    const model = cfg.model || "gpt-4o";
    const reasoning = /^(o\d|gpt-5)/i.test(model);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.provider === "azure") headers["api-key"] = apiKey; else headers["Authorization"] = `Bearer ${apiKey}`;
    const resp = await fetch(endpoint, {
      method: "POST", headers,
      body: JSON.stringify({ model, ...(reasoning ? { max_completion_tokens: 8000 } : { temperature: 0, max_tokens: 2048 }),
        messages: [{ role: "system", content: system },
          { role: "user", content: [...images.map(i => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.b64}`, detail: "high" } })), { type: "text", text: prompt }] }] }),
    });
    const d: any = await resp.json().catch(() => ({}));
    const text = d.choices?.[0]?.message?.content;
    if (!resp.ok || !text) throw new Error(`${cfg.provider || "openai"} ${resp.status}: ${d.error?.message || "no content"}`);
    return text;
  };
  try { return await one(config, decrypt(config.api_key)); }
  catch (e: any) {
    if (!config.fallback_enabled || !config.fallback_provider || !config.fallback_api_key) throw e;
    return one({ ...config, provider: config.fallback_provider, model: config.fallback_model, endpoint_url: config.fallback_endpoint_url || null }, decrypt(config.fallback_api_key));
  }
}

/** Speech-to-text with the configured LLM provider's key (meeting transcription fallback).
 *  OpenAI / OpenAI-compatible: /audio/transcriptions (Whisper) · Azure OpenAI: a Whisper deployment ·
 *  Gemini: audio understanding (returns timed segments as JSON). Anthropic models can't take audio.
 *  Tries the main LLM, then the fallback LLM. Throws a readable error when neither can transcribe. */
export type LlmSeg = { start: number; end: number; text: string };
export async function aiTranscribe(audio: Buffer, mime: string, filename: string, opts: { model?: string; prompt?: string; language?: string | null } = {}): Promise<{ segments: LlmSeg[]; duration: number; via: string }> {
  const r = await query("SELECT * FROM ai_config LIMIT 1");
  const config = r.rows[0];
  if (!config?.api_key) throw new Error("No LLM API key is set (Admin → AI Settings → LLM Settings)");
  const cands: { cfg: any; key: string }[] = [];
  try { cands.push({ cfg: config, key: decrypt(config.api_key) }); } catch { /* bad key */ }
  if (config.fallback_enabled && config.fallback_api_key) {
    try { cands.push({ cfg: { provider: config.fallback_provider, model: config.fallback_model, endpoint_url: config.fallback_endpoint_url }, key: decrypt(config.fallback_api_key) }); } catch { /* ignore */ }
  }
  const errors: string[] = [];
  for (const { cfg, key } of cands) {
    try {
      if (cfg.provider === "anthropic") throw new Error("Claude models can't transcribe audio — use an OpenAI, Azure OpenAI or Gemini key");
      if (cfg.provider === "gemini") {
        const model = /gemini/i.test(opts.model || "") ? opts.model : (cfg.model || "gemini-2.0-flash");
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: "application/json" },
            contents: [{ role: "user", parts: [
              { inline_data: { mime_type: mime || "audio/webm", data: audio.toString("base64") } },
              { text: `Transcribe this meeting recording word for word (${opts.prompt || "English with some Hindi"}). Split it into segments of one or two sentences, in order, with start and end times in seconds from the beginning. Do not summarise, translate or add anything. Return JSON only: {"duration": <seconds>, "segments": [{"start": 0.0, "end": 4.2, "text": "..."}]}` },
            ] }],
          }),
        });
        const d: any = await resp.json().catch(() => ({}));
        const text = (d.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
        if (!resp.ok || !text) throw new Error(`Gemini ${resp.status}: ${d.error?.message || "no transcript"}`);
        const j = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
        const segments: LlmSeg[] = (j.segments || []).map((x: any) => ({ start: Number(x.start) || 0, end: Number(x.end) || Number(x.start) || 0, text: String(x.text || "").trim() })).filter((x: LlmSeg) => x.text);
        return { segments, duration: Number(j.duration) || (segments.length ? segments[segments.length - 1].end : 0), via: `gemini:${model}` };
      }
      // OpenAI, OpenAI-compatible ("custom") and Azure OpenAI
      const model = opts.model || "whisper-1";
      let url: string; const headers: Record<string, string> = {};
      const ep = String(cfg.endpoint_url || "");
      if (cfg.provider === "azure") {
        // https://<res>.openai.azure.com/openai/deployments/<chat-deployment>/chat/completions?api-version=… → the Whisper deployment
        const base = ep.match(/^(https:\/\/[^/]+)/)?.[1];
        if (!base) throw new Error("Azure OpenAI endpoint is not set in LLM Settings");
        url = `${base}/openai/deployments/${encodeURIComponent(model)}/audio/transcriptions?api-version=2024-06-01`;
        headers["api-key"] = key;
      } else {
        const root = ep ? ep.replace(/\/chat\/completions.*$/, "").replace(/\/+$/, "") : "https://api.openai.com/v1";
        url = `${root}/audio/transcriptions`;
        headers["Authorization"] = `Bearer ${key}`;
      }
      const form = new FormData();
      form.append("file", new Blob([audio], { type: mime || "audio/webm" }), filename);
      form.append("model", model);
      form.append("response_format", /gpt-4o/i.test(model) ? "json" : "verbose_json"); // gpt-4o-*-transcribe returns text only (no timings)
      form.append("temperature", "0");
      if (opts.prompt) form.append("prompt", opts.prompt);
      if (opts.language) form.append("language", opts.language);
      const resp = await fetch(url, { method: "POST", headers, body: form });
      const d: any = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`${cfg.provider === "azure" ? "Azure OpenAI" : "OpenAI"} ${resp.status}: ${d.error?.message || "transcription failed"}${cfg.provider === "azure" && resp.status === 404 ? ` — create a Whisper deployment named "${model}" or set its name in Meeting Recording` : ""}`);
      let segments: LlmSeg[] = (d.segments || []).map((x: any) => ({ start: Number(x.start) || 0, end: Number(x.end) || 0, text: String(x.text || "").trim() })).filter((x: LlmSeg) => x.text);
      if (!segments.length && d.text) { // text-only models: split into sentences without timings
        segments = String(d.text).split(/(?<=[.?!।])\s+/).map(t => t.trim()).filter(Boolean).map(text => ({ start: 0, end: 0, text }));
      }
      return { segments, duration: Number(d.duration) || 0, via: `${cfg.provider}:${model}` };
    } catch (e: any) { errors.push(e.message); }
  }
  throw new Error(errors.join(" · ") || "LLM transcription failed");
}
