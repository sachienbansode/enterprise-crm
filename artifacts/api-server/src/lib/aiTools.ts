import { decrypt } from "./crypto";

// ─── Native tool calling for the AI assistant ─────────────────────────────────
// OpenAI / Azure / OpenAI-compatible and Anthropic get a real `run_sql` tool, so the model calls it instead of
// writing "let me fetch that…". Gemini (and anything that fails tool calling) uses a plain-text protocol
// (<sql>…</sql>) with the same conversation, so every provider behaves the same from the caller's point of view.

export type ToolCall = { id: string; sql: string };
export type AgentMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; id: string; content: string };
export type AgentReply = { text: string; toolCalls: ToolCall[] };

const TOOL_DESC = "Run ONE read-only PostgreSQL SELECT (or WITH … SELECT) against the CRM data described in the system prompt. Returns the rows as JSON (first 60) or the database error. Call it as many times as needed; you may call it several times in parallel.";
const TOOL_PARAMS = {
  type: "object",
  properties: {
    sql: { type: "string", description: "A single SELECT statement." },
    purpose: { type: "string", description: "Very short note of what this query finds." },
  },
  required: ["sql"],
};

export const TEXT_PROTOCOL = `
LOOKING UP DATA (text mode)
To run queries, reply with ONLY one or more blocks like:
<sql>SELECT …</sql>
and nothing else. You'll receive the results and can query again, then write the final answer (no <sql> blocks in it).
Never write "let me check" or "I'll fetch" — either output <sql> blocks, or the final answer.`;

let seq = 0;
const newId = () => `call_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/** Collapse tool calls/results into plain text (for providers without tools, or a forced final answer). */
export function toTextTurns(msgs: AgentMsg[]): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  const push = (role: "user" | "assistant", content: string) => {
    if (!content.trim()) return;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + content;
    else out.push({ role, content });
  };
  for (const m of msgs) {
    if (m.role === "tool") push("user", `Result of query ${m.id}:\n${m.content}`);
    else if (m.role === "assistant") push("assistant", [m.content, ...(m.toolCalls || []).map(c => `<sql>${c.sql}</sql>`)].filter(Boolean).join("\n"));
    else push("user", m.content);
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export function extractTextQueries(text: string): string[] {
  const out: string[] = [];
  const re = /<sql>([\s\S]*?)<\/sql>|```sql\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { const q = (m[1] || m[2] || "").trim(); if (q) out.push(q); }
  if (!out.length && /^\s*(select|with)\s/i.test(text) && !/\n\s*\n/.test(text.trim())) out.push(text.trim()); // bare SQL reply
  return out.slice(0, 4);
}

async function openaiTurn(cfg: any, key: string, system: string, msgs: AgentMsg[], opts: { tools: boolean; require: boolean }): Promise<AgentReply> {
  const endpoint = cfg.endpoint_url || "https://api.openai.com/v1/chat/completions";
  const model = cfg.model || "gpt-4o";
  const reasoning = /^(o\d|gpt-5)/i.test(model);
  const maxTokens = Math.max(Number(cfg.max_tokens) || 0, 2048);
  const temperature = Number.isFinite(parseFloat(String(cfg.temperature))) ? Math.min(parseFloat(String(cfg.temperature)), 0.4) : 0.2;
  const messages: any[] = [{ role: "system", content: system }];
  for (const m of msgs) {
    if (m.role === "tool") messages.push({ role: "tool", tool_call_id: m.id, content: m.content });
    else if (m.role === "assistant" && m.toolCalls?.length)
      messages.push({ role: "assistant", content: m.content || null, tool_calls: m.toolCalls.map(c => ({ id: c.id, type: "function", function: { name: "run_sql", arguments: JSON.stringify({ sql: c.sql }) } })) });
    else messages.push({ role: m.role, content: m.content });
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.provider === "azure") headers["api-key"] = key; else headers["Authorization"] = `Bearer ${key}`;
  const body: any = { model, messages, ...(reasoning ? { max_completion_tokens: Math.max(maxTokens, 8000) } : { temperature, max_tokens: maxTokens }) };
  if (opts.tools) {
    body.tools = [{ type: "function", function: { name: "run_sql", description: TOOL_DESC, parameters: TOOL_PARAMS } }];
    body.tool_choice = opts.require ? "required" : "auto";
  }
  const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`${cfg.provider || "openai"} ${r.status}: ${d.error?.message || "error"}`), { status: r.status, body: d });
  const msg = d.choices?.[0]?.message || {};
  const toolCalls: ToolCall[] = (msg.tool_calls || []).filter((c: any) => c.function?.name === "run_sql").map((c: any) => {
    let sql = ""; try { sql = JSON.parse(c.function.arguments || "{}").sql || ""; } catch { sql = ""; }
    return { id: c.id || newId(), sql };
  });
  return { text: msg.content || "", toolCalls };
}

async function anthropicTurn(cfg: any, key: string, system: string, msgs: AgentMsg[], opts: { tools: boolean; require: boolean }): Promise<AgentReply> {
  const messages: any[] = [];
  const push = (role: "user" | "assistant", blocks: any[]) => {
    if (!blocks.length) return;
    if (messages.length && messages[messages.length - 1].role === role) messages[messages.length - 1].content.push(...blocks);
    else messages.push({ role, content: blocks });
  };
  for (const m of msgs) {
    if (m.role === "tool") push("user", [{ type: "tool_result", tool_use_id: m.id, content: m.content }]);
    else if (m.role === "assistant") push("assistant", [
      ...(m.content?.trim() ? [{ type: "text", text: m.content }] : []),
      ...(m.toolCalls || []).map(c => ({ type: "tool_use", id: c.id, name: "run_sql", input: { sql: c.sql } })),
    ]);
    else if (m.content.trim()) push("user", [{ type: "text", text: m.content }]);
  }
  while (messages.length && messages[0].role !== "user") messages.shift();
  const body: any = {
    model: cfg.model || "claude-3-5-sonnet-20241022", system, messages,
    max_tokens: Math.max(Number(cfg.max_tokens) || 0, 2048),
    temperature: Number.isFinite(parseFloat(String(cfg.temperature))) ? Math.min(parseFloat(String(cfg.temperature)), 0.4) : 0.2,
  };
  if (opts.tools) {
    body.tools = [{ name: "run_sql", description: TOOL_DESC, input_schema: TOOL_PARAMS }];
    body.tool_choice = opts.require ? { type: "any" } : { type: "auto" };
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`anthropic ${r.status}: ${d.error?.message || "error"}`), { status: r.status, body: d });
  const blocks: any[] = d.content || [];
  return {
    text: blocks.filter(b => b.type === "text").map(b => b.text).join(""),
    toolCalls: blocks.filter(b => b.type === "tool_use" && b.name === "run_sql").map(b => ({ id: b.id, sql: String(b.input?.sql || "") })),
  };
}

async function textTurn(cfg: any, key: string, system: string, msgs: AgentMsg[], textCall: TextCall): Promise<AgentReply> {
  const text = await textCall({ ...cfg }, key, system + "\n" + TEXT_PROTOCOL, toTextTurns(msgs));
  const qs = extractTextQueries(text);
  return { text: qs.length ? "" : text.replace(/<sql>[\s\S]*?<\/sql>/gi, "").trim(), toolCalls: qs.map(sql => ({ id: newId(), sql })) };
}

export type TextCall = (cfg: any, key: string, system: string, messages: { role: string; content: string }[]) => Promise<string>;

/** One agent step on a given provider config. `final` = no more lookups, answer in text. */
async function providerTurn(cfg: any, key: string, system: string, msgs: AgentMsg[], o: { final: boolean; require: boolean }, textCall: TextCall): Promise<AgentReply> {
  if (o.final) {
    const text = await textCall(cfg, key, system, [...toTextTurns(msgs), { role: "user", content: "Answer now with what you have — no more lookups." }]);
    return { text: text.replace(/<sql>[\s\S]*?<\/sql>/gi, "").trim(), toolCalls: [] };
  }
  const p = cfg.provider;
  try {
    if (p === "anthropic") return await anthropicTurn(cfg, key, system, msgs, { tools: true, require: o.require });
    if (p !== "gemini") return await openaiTurn(cfg, key, system, msgs, { tools: true, require: o.require });
  } catch (e: any) {
    // Endpoint/model without tool support → fall back to the text protocol; auth/rate errors propagate
    if (!(e.status === 400 || e.status === 404 || e.status === 422) || /api key|auth|quota|rate/i.test(e.message)) throw e;
    console.warn("[AI] tool calling not supported here, using text protocol:", e.message);
  }
  return textTurn(cfg, key, system, msgs, textCall);
}

/** Primary LLM, then the configured fallback LLM on failure. Records the provider used on cfg.__used. */
export async function agentTurn(cfg: any, key: string, system: string, msgs: AgentMsg[], o: { final: boolean; require: boolean }, textCall: TextCall): Promise<AgentReply> {
  try {
    const r = await providerTurn(cfg, key, system, msgs, o, textCall);
    cfg.__used = { provider: cfg.provider, model: cfg.model, fallback: false };
    return r;
  } catch (e: any) {
    if (!cfg.fallback_enabled || !cfg.fallback_provider || !cfg.fallback_api_key) throw e;
    console.warn("[AI] Primary LLM failed, switching to fallback:", e.message);
    const fb = { ...cfg, provider: cfg.fallback_provider, model: cfg.fallback_model, endpoint_url: cfg.fallback_endpoint_url || null };
    const r = await providerTurn(fb, decrypt(cfg.fallback_api_key), system, msgs, o, textCall);
    cfg.__used = { provider: fb.provider, model: fb.model, fallback: true };
    return r;
  }
}

/** True when the model only announced it would look something up, instead of doing it. */
export function isNarration(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 500) return false;
  return /\b(let me|let's|i'?ll|i will|i am going to|i'm going to|fetching|retrieving|gathering|pulling|looking (it )?up|checking|one moment|please wait|stand by)\b/i.test(t)
    && !/\|.*\|/.test(t) && !/\d{2,}/.test(t);
}
