import { query } from "./db";

// Idempotent schema upgrades applied at every startup, so a deploy never needs a manual SQL step.
export async function ensureAppSchema() {
  const stmts = [
    // ── IB / ECM: company & promoter master ──
    ...["cin varchar(30)", "sector varchar(80)", "industry varchar(120)", "group_name varchar(160)", "website varchar(200)",
        "listed_status varchar(20)", "exchange_symbol varchar(40)", "hq_city varchar(80)",
        "revenue_cr numeric", "ebitda_cr numeric", "pat_cr numeric", "net_worth_cr numeric", "valuation_cr numeric",
        "fin_year varchar(10)", "fin_source varchar(160)", "fin_as_of date", "fin_updated_by varchar(255)", "fin_updated_at timestamptz",
        "info_source varchar(160)", "info_as_of date", "info_updated_by varchar(255)", "info_updated_at timestamptz",
        "relationship_owner_id uuid", "relationship_strength varchar(20)"]
      .map(c => `ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${c}`),
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_cin ON clients (upper(cin)) WHERE cin IS NOT NULL AND cin <> ''",
    `CREATE TABLE IF NOT EXISTS company_people (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
       name varchar(200) NOT NULL, designation varchar(120), role_type varchar(40),
       email varchar(200), mobile varchar(40), linkedin varchar(250), notes text,
       is_key boolean DEFAULT false,
       created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_company_people_client ON company_people (client_id)",
    "CREATE INDEX IF NOT EXISTS idx_company_people_email ON company_people (lower(email))",
    // ── People: card scanning + contact page fields ──
    ...["landline varchar(40)", "address text", "city varchar(80)", "source varchar(20) DEFAULT 'manual'", "card_path text", "card_back_path text", "created_by uuid"]
      .map(c => `ALTER TABLE company_people ADD COLUMN IF NOT EXISTS ${c}`),
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS person_id uuid",
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb",
    // Stage workflow: Mandatory vs Skip allowed per stage; what was done / skipped kept on each record
    "ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS skip_allowed boolean DEFAULT true",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_path jsonb DEFAULT '{}'::jsonb",
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_path jsonb DEFAULT '{}'::jsonb",
    // ── IB / ECM: opportunity fields ──
    ...["opportunity_type varchar(40)", "next_action varchar(300)", "next_action_date date", "lost_reason varchar(120)", "lost_comment text",
        "expected_fee numeric", "probability integer"]
      .map(c => `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${c}`),
    // ── Interactions (calls, meetings, notes, roadshows — typed, dictated or from Fireflies) ──
    `CREATE TABLE IF NOT EXISTS interactions (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       type varchar(30) NOT NULL DEFAULT 'Meeting',
       occurred_at timestamptz NOT NULL DEFAULT now(),
       client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
       lead_id uuid, deal_id uuid,
       vertical varchar(60),
       title varchar(300), summary text, key_points jsonb DEFAULT '[]', opportunity_update text,
       raw_text text, next_follow_up date,
       source varchar(30) DEFAULT 'manual', external_id varchar(120), external_url varchar(500), attendees jsonb DEFAULT '[]',
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions (client_id, occurred_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions (lead_id, occurred_at DESC)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_interactions_external ON interactions (source, external_id) WHERE external_id IS NOT NULL",
    // ── Tasks / action items ──
    `CREATE TABLE IF NOT EXISTS tasks (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       title varchar(400) NOT NULL, due_date date, priority varchar(10) DEFAULT 'Medium', status varchar(20) DEFAULT 'Open',
       owner_id uuid, owner_name varchar(255),
       client_id uuid REFERENCES clients(id) ON DELETE SET NULL, lead_id uuid, deal_id uuid, interaction_id uuid,
       vertical varchar(60),
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), completed_at timestamptz
     )`,
    "CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks (owner_id, status, due_date)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks (client_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks (lead_id)",
    // ── Meetings: in-person recordings (Azure Speech, speaker-separated) and Teams meetings (Graph transcripts) ──
    `CREATE TABLE IF NOT EXISTS meetings (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       source varchar(20) NOT NULL DEFAULT 'recording',          -- 'recording' | 'teams'
       title varchar(300), client_id uuid REFERENCES clients(id) ON DELETE SET NULL, lead_id uuid, vertical varchar(60),
       organizer_id uuid, organizer_email varchar(200), organizer_name varchar(255),
       start_at timestamptz, end_at timestamptz, duration_sec integer,
       join_url text, graph_event_id text, online_meeting_id text, recording_id text,
       attendees jsonb DEFAULT '[]',                                -- [{key, kind:'user'|'person'|'other', id, name, role}]
       status varchar(20) DEFAULT 'scheduled',                      -- scheduled | recording | transcribing | transcribed | no_transcript | failed
       audio_path text, audio_mime varchar(60), audio_bytes bigint DEFAULT 0, chunks integer DEFAULT 0,
       segments jsonb DEFAULT '[]',                                 -- [{s: speakerKey, t0, t1, text}]
       speakers jsonb DEFAULT '{}',                                 -- {speakerKey: {name, attendee, confidence, confirmed}}
       transcript_source varchar(30), summary jsonb, interaction_id uuid, error text, attempts integer DEFAULT 0,
       consent_by varchar(255), consent_at timestamptz,
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_meetings_client ON meetings (client_id, start_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings (status, end_at)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_meetings_event ON meetings (graph_event_id) WHERE graph_event_id IS NOT NULL",
    "ALTER TABLE interactions ADD COLUMN IF NOT EXISTS meeting_id uuid",
    `CREATE TABLE IF NOT EXISTS speech_config (
       id integer PRIMARY KEY DEFAULT 1, enabled boolean DEFAULT false, endpoint text, api_key text,
       api_version varchar(20) DEFAULT '2024-11-15', locales text[] DEFAULT ARRAY['en-IN','hi-IN'], max_speakers integer DEFAULT 6,
       teams_auto_fetch boolean DEFAULT true, keep_audio_days integer DEFAULT 90,
       updated_by varchar(255), updated_at timestamptz DEFAULT now()
     )`,
    "INSERT INTO speech_config (id) VALUES (1) ON CONFLICT DO NOTHING",
    // ── AI assistant: saved conversations (each user sees only their own) ──
    `CREATE TABLE IF NOT EXISTS ai_conversations (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid NOT NULL, title varchar(200) NOT NULL DEFAULT 'New chat',
       created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations (user_id, updated_at DESC)",
    `CREATE TABLE IF NOT EXISTS ai_messages (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
       role varchar(10) NOT NULL, text text NOT NULL, meta jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages (conversation_id, created_at)",
    // Free fallback when Azure Speech isn't available: Groq-hosted Whisper (no speaker separation — the AI assigns speakers)
    "ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS groq_api_key text",
    "ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS groq_model varchar(60) DEFAULT 'whisper-large-v3'",
    // ── Fireflies add-on (optional) ──
    `CREATE TABLE IF NOT EXISTS fireflies_config (
       id integer PRIMARY KEY DEFAULT 1, enabled boolean DEFAULT false, api_key text, webhook_secret text,
       auto_create_tasks boolean DEFAULT true, only_matched boolean DEFAULT false,
       last_event_at timestamptz, last_status text, updated_by varchar(255), updated_at timestamptz DEFAULT now()
     )`,
    "INSERT INTO fireflies_config (id) VALUES (1) ON CONFLICT DO NOTHING",
    // who created leads / deals
    "ALTER TABLE verticals_config ADD COLUMN IF NOT EXISTS hidden_modules text[] DEFAULT '{}'",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by uuid",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by_name varchar(255)",
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS created_by uuid",
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS created_by_name varchar(255)",
    // documents can belong to a lead or a deal
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS lead_id uuid",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS deal_id uuid",
    "CREATE INDEX IF NOT EXISTS idx_documents_lead ON documents (lead_id)",
    "CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents (deal_id)",
    // comments on any record (lead, deal, …)
    `CREATE TABLE IF NOT EXISTS entity_comments (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       entity_type varchar(30) NOT NULL,
       entity_id uuid NOT NULL,
       user_id uuid,
       user_name varchar(255) NOT NULL,
       body text NOT NULL,
       created_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_entity_comments ON entity_comments (entity_type, entity_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id)",
    // backfill "created by" from the audit trail where we have it
    `UPDATE leads l SET created_by_name = a.user_name
       FROM audit_logs a
      WHERE l.created_by_name IS NULL AND a.entity_type='lead' AND a.entity_id = l.id
        AND a.details='CREATE' AND a.user_name IS NOT NULL AND a.user_name <> 'System'`,
  ];
  for (const s of stmts) await query(s);
  await seedIB();
  // AI table access saved before Meetings/Tasks existed: give those to the assistant once (admins can untick them)
  await query(`UPDATE ai_config SET table_access = table_access || '["interactions","tasks","_v2"]'::jsonb
                WHERE jsonb_typeof(table_access) = 'array' AND jsonb_array_length(table_access) > 0
                  AND NOT table_access ? '_v2' AND table_access ? 'clients'`).catch(() => {});
}

// ECM pipeline + dropdowns for Investment Banking (from the ECM CRM requirements note). Runs once:
// existing IB stages are mapped onto the new ones the first time, and admins can edit them afterwards.
const IB_STAGES: [string, string, boolean, boolean][] = [
  ["identified", "Identified", false, false], ["contacted", "Contacted", false, false], ["qualified", "Qualified", false, false],
  ["meeting", "Meeting", false, false], ["pitch", "Pitch", false, false], ["negotiation", "Negotiation", false, false],
  ["mandate", "Mandate", false, false], ["execution", "Execution", false, false], ["closed", "Closed", true, false],
  ["lost", "Lost", false, true],
];
const IB_DROPDOWNS: Record<string, string[]> = {
  "lead:opportunity_type": ["IPO", "Pre-IPO", "QIP", "Private Placement", "Rights Issue", "OFS / Block", "M&A", "Fundraising", "Debt Raising", "Other"],
  "lead:source_ib": ["Referral", "Promoter", "Investor", "CA / CS", "PE / VC", "Event / Conference", "Research", "Existing Relationship", "Inbound", "Other"],
  "lead:lost_reason": ["Fee / Commercials", "Lost to Competitor", "Deal Postponed", "Promoter Not Ready", "Valuation Mismatch", "Regulatory Issue", "Market Conditions", "No Response", "Other"],
  "client:sector": ["BFSI", "Healthcare & Pharma", "IT & Tech", "Consumer & Retail", "Industrials & Capital Goods", "Infrastructure", "Real Estate", "Energy & Power", "Chemicals", "Auto & Ancillaries", "Media & Telecom", "Agri & Food", "Logistics", "Textiles", "Other"],
};
// Old IB stage → ECM stage (covers both the original seed codes and the codes from db/06-map-stages.sql)
const STAGE_MAP: Record<string, string> = {
  prospect: "identified", initial_meeting: "meeting", mandate_discussion: "negotiation", loi_signed: "mandate",
  mandate_signed: "execution", won: "closed", lost: "lost",
  nda: "negotiation", dd: "execution", docs: "execution", closure: "closed",
};

async function seedIB() {
  const has = await query("SELECT 1 FROM pipeline_stages WHERE entity='lead' AND vertical='ib' AND stage_id='identified' LIMIT 1");
  if (!has.rows.length) {
    await query("DELETE FROM pipeline_stages WHERE entity='lead' AND vertical='ib'");
    for (const [i, [id, label, won, lost]] of IB_STAGES.entries()) {
      await query(
        "INSERT INTO pipeline_stages (entity, vertical, stage_id, label, sort_order, is_active, is_won, is_lost) VALUES ('lead','ib',$1,$2,$3,true,$4,$5)",
        [id, label, i + 1, won, lost],
      );
    }
    // one pass, so a mapped value is never re-mapped
    await query(
      `UPDATE leads l SET stage = m.to_stage FROM (SELECT * FROM jsonb_each_text($1::jsonb)) AS m(from_stage, to_stage)
        WHERE l.vertical='Investment Banking' AND l.stage = m.from_stage`, [JSON.stringify(STAGE_MAP)]);
    await query("UPDATE leads SET stage='identified' WHERE vertical='Investment Banking' AND stage NOT IN (SELECT stage_id FROM pipeline_stages WHERE entity='lead' AND vertical='ib') AND stage <> 'deleted'");
  }
  // retired pre-ECM IB stages (an older 04-schema-sync.sql re-added them on every deploy) — remove if unused
  await query(`DELETE FROM pipeline_stages p WHERE p.entity='lead' AND p.vertical='ib'
      AND p.stage_id IN ('prospect','initial_meeting','mandate_discussion','loi_signed','mandate_signed','won')
      AND EXISTS (SELECT 1 FROM pipeline_stages x WHERE x.entity='lead' AND x.vertical='ib' AND x.stage_id='identified')
      AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.vertical='Investment Banking' AND l.stage = p.stage_id)`);
  for (const [key, values] of Object.entries(IB_DROPDOWNS)) {
    const [entity, field] = key.split(":");
    for (const [i, v] of values.entries()) {
      await query(
        `INSERT INTO dropdown_config (entity, field, value, label, sort_order, is_active)
         SELECT $1::varchar,$2::varchar,$3::varchar,$3::varchar,$4::int,true WHERE NOT EXISTS (SELECT 1 FROM dropdown_config WHERE entity=$1::varchar AND field=$2::varchar AND value=$3::varchar)`,
        [entity, field, v, i + 1],
      );
    }
  }
}
