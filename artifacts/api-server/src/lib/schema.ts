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
    // App-wide options (Admin → Pipeline Stages → Options)
    "CREATE TABLE IF NOT EXISTS app_settings (key varchar(60) PRIMARY KEY, value jsonb NOT NULL, updated_by varchar(255), updated_at timestamptz DEFAULT now())",
    `INSERT INTO app_settings (key, value) VALUES ('show_probability', 'true') ON CONFLICT DO NOTHING`,
    // Duplicate merge (clients / companies): merged records are kept, marked "Merged", and can be restored
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS merged_into uuid",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS merged_at timestamptz",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS merged_by varchar(255)",
    "ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check",
    "ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('Active','Dormant','Suspended','Closed','Merged'))",
    `CREATE TABLE IF NOT EXISTS client_merges (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kept_id uuid NOT NULL, merged_ids uuid[] NOT NULL,
       before_kept jsonb, before_merged jsonb, moved jsonb, verticals jsonb, comments jsonb, filled jsonb,
       merged_by uuid, merged_by_name varchar(255), created_at timestamptz DEFAULT now(), undone_at timestamptz, undone_by_name varchar(255)
     )`,
    // IB Phase 2 — mandate milestones, investor database, roadshow / NDR meetings
    `CREATE TABLE IF NOT EXISTS deal_milestones (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
       title varchar(200) NOT NULL, sort_order integer DEFAULT 0, due_date date, status varchar(20) DEFAULT 'Pending',
       owner_name varchar(120), notes text, done_at timestamptz,
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS ix_deal_milestones_deal ON deal_milestones (deal_id)",
    `CREATE TABLE IF NOT EXISTS investors (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(200) NOT NULL, investor_type varchar(40) DEFAULT 'Other',
       city varchar(80), country varchar(60) DEFAULT 'India', aum_cr numeric, ticket_min_cr numeric, ticket_max_cr numeric,
       sectors text[] DEFAULT '{}', deal_types text[] DEFAULT '{}',
       contact_name varchar(120), contact_designation varchar(120), contact_email varchar(160), contact_phone varchar(40), website varchar(200),
       relationship varchar(10) DEFAULT 'Warm', notes text, is_active boolean DEFAULT true,
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS ix_investors_name ON investors (lower(name))",
    `CREATE TABLE IF NOT EXISTS roadshow_meetings (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
       investor_id uuid NOT NULL REFERENCES investors(id), meeting_date timestamptz, mode varchar(30) DEFAULT 'One-on-one',
       location varchar(160), attendees text, status varchar(20) DEFAULT 'Planned', interest varchar(20) DEFAULT 'Not yet known',
       indicative_cr numeric, feedback text, next_step text,
       created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS ix_roadshow_deal ON roadshow_meetings (deal_id)",
    "CREATE INDEX IF NOT EXISTS ix_roadshow_investor ON roadshow_meetings (investor_id)",
    // Convert to Deal keeps the link between an opportunity and the deal created from it
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_id uuid",
    "CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals (lead_id)",
    // Won / Lost opportunities: status follows the stage, no live next action, open tasks closed (fixes older records)
    `UPDATE leads l SET status = CASE WHEN ps.is_won THEN 'Won' ELSE 'Lost' END, next_action = NULL, next_action_date = NULL,
            closed_at = COALESCE(l.closed_at, l.updated_at, NOW())
       FROM pipeline_stages ps
      WHERE ps.entity = 'lead' AND ps.stage_id = l.stage AND (ps.is_won OR ps.is_lost)
        AND ps.vertical = (CASE l.vertical WHEN 'Retail Broking' THEN 'retail' WHEN 'Corporate Broking' THEN 'corporate' WHEN 'Investment Banking' THEN 'ib' WHEN 'AIF' THEN 'aif' WHEN 'AMC' THEN 'amc' ELSE 'ie' END)
        AND (l.status NOT IN ('Won','Lost') OR l.next_action IS NOT NULL OR l.closed_at IS NULL)`,
    `UPDATE tasks t SET status = 'Done', completed_at = NOW() FROM leads l WHERE t.lead_id = l.id AND t.status = 'Open' AND l.status IN ('Won','Lost')`,
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
    // Third fallback: transcribe with the LLM provider's key (OpenAI / Azure OpenAI Whisper, or Gemini)
    "ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS llm_transcribe boolean DEFAULT false",
    "ALTER TABLE speech_config ADD COLUMN IF NOT EXISTS llm_transcribe_model varchar(80) DEFAULT 'whisper-1'",
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

    // ── AMC vertical (mutual fund — a separate entity: seen only by users assigned to AMC, never through "All") ──
    "ALTER TABLE client_verticals DROP CONSTRAINT IF EXISTS client_verticals_vertical_check",
    "ALTER TABLE client_verticals ADD CONSTRAINT client_verticals_vertical_check CHECK (vertical IN ('retail','corporate','ib','aif','ie','amc'))",
    // the seed inserted ids by hand, so the id counter can be behind — move it past the highest id first
    "SELECT setval(pg_get_serial_sequence('verticals_config','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM verticals_config), 1))",
    "INSERT INTO verticals_config (vertical_id, label, short_name, is_active, display_order) VALUES ('AMC','AMC','AMC',true,6) ON CONFLICT (vertical_id) DO NOTHING",
    `INSERT INTO pipeline_stages (entity, vertical, stage_id, label, sort_order, color, is_won, is_lost) VALUES ('lead','amc','prospect','Prospect',1,'bg-gray-500',false,false),('lead','amc','contacted','Contacted',2,'bg-blue-500',false,false),('lead','amc','meeting','Meeting / Presentation',3,'bg-yellow-500',false,false),('lead','amc','proposal','Scheme Proposed',4,'bg-orange-500',false,false),('lead','amc','kyc','KYC / Application',5,'bg-violet-500',false,false),('lead','amc','won','Investment Received',6,'bg-emerald-500',true,false),('lead','amc','lost','Lost',7,'bg-red-500',false,true),('deal','amc','Application Received','Application Received',1,'bg-blue-500',false,false),('deal','amc','Sent to RTA','Sent to RTA',2,'bg-yellow-500',false,false),('deal','amc','Units Allotted','Units Allotted',3,'bg-emerald-500',true,false),('deal','amc','Rejected','Rejected',4,'bg-red-500',false,true) ON CONFLICT (entity, vertical, stage_id) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC Admin','AMC','Full admin within the AMC vertical, including call audits','{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true, "CallAudits": true}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC Sales Head','AMC','AMC sales pipeline, distributors and reports','{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": false, "ServiceRequests": true, "CallAudits": false}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC RM','AMC','AMC relationship manager — opportunities, investments, clients and SRs','{"AI": false, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": false, "Dashboard": true, "Compliance": false, "ServiceRequests": true, "CallAudits": false}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC Investor Service','AMC','AMC investor service desk — service requests and investor view','{"AI": false, "Admin": false, "Deals": false, "Leads": false, "Clients": true, "Reports": false, "Dashboard": false, "Compliance": false, "ServiceRequests": true, "CallAudits": false}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC CRO','AMC','AMC Chief Risk Officer — call recording audits and risk view (no edits to sales records)','{"AI": false, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true, "CallAudits": true}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC Risk Analyst','AMC','CRO team — call recording audits and risk view (no edits to sales records)','{"AI": false, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true, "CallAudits": true}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC Compliance Officer','AMC','AMC compliance — view-only, plus call recording audits','{"AI": false, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true, "CallAudits": true}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    `INSERT INTO sla_config (category, tat_hours, warning_percent, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours)
       SELECT 'Mutual Fund (AMC)', 48, 80, 'AMC Investor Service', 24, 'AMC Operations Head', 40, 'AMC CEO', 72 WHERE NOT EXISTS (SELECT 1 FROM sla_config WHERE category='Mutual Fund (AMC)' AND subcategory IS NULL)`,
    // Roles tied to AMC: the two CRO roles were first created with vertical "All" — move them to AMC; users with an AMC role always sit in the AMC vertical
    `INSERT INTO user_roles (role_name, vertical, description, permissions) VALUES ('AMC-CRO','AMC','AMC Chief Risk Officer — full access to the AMC vertical, including Call Audits','{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true, "CallAudits": true}'::jsonb) ON CONFLICT (role_name) DO NOTHING`,
    "UPDATE user_roles SET vertical='AMC', description=replace(description, '; view-only elsewhere', ' — AMC only; view-only elsewhere') WHERE role_name IN ('AMC CRO','AMC Risk Analyst') AND vertical='All'",
    "UPDATE users u SET vertical='AMC', updated_at=NOW() FROM user_roles r WHERE u.role=r.role_name AND r.vertical='AMC' AND COALESCE(u.vertical,'') <> 'AMC'",
    // Call recording audits (AMC CRO team): sampled recordings, checklist, observations, auto action SR
    `CREATE TABLE IF NOT EXISTS call_audits (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_code varchar(20) UNIQUE, vertical varchar(40) DEFAULT 'AMC',
       call_date date, call_time varchar(8), direction varchar(10), phone varchar(30), caller_name varchar(160), caller_type varchar(30),
       client_id uuid, employee_id uuid, employee_name varchar(160), team varchar(60), call_purpose varchar(60), duration_sec integer, recording_ref varchar(200),
       audio_path text, audio_mime varchar(80), audio_name varchar(200), audio_bytes bigint,
       sample_batch varchar(80), sample_reason varchar(40), in_sample boolean DEFAULT true, status varchar(20) DEFAULT 'Pending',
       checklist jsonb DEFAULT '{}', score numeric, outcome varchar(30), severity varchar(10), observations text, recommendation text,
       action_required boolean DEFAULT false, action_owner_id uuid, action_owner_name varchar(160), action_due date, sr_id uuid, sr_code varchar(20),
       transcript text, transcript_source varchar(40), ai_check jsonb,
       auditor_id uuid, auditor_name varchar(160), audited_at timestamptz,
       created_by uuid, created_by_name varchar(160), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS ix_call_audits_status ON call_audits (status, call_date DESC)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS recording_path varchar(500)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS result varchar(20)",          // Passed | Issues identified
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS issue_category varchar(80)",
    // which call is audited (telephone system call id, agent / extension, line, investor folio, distributor ARN, transaction) and audit closure
    "ALTER TABLE company_people ADD COLUMN IF NOT EXISTS card_extra_paths text[]",
    // My Workspace: reminders are tasks with a time (notified when due); notes on tasks
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remind_at timestamptz",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminded_at timestamptz",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_note text",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by_name varchar(160)",
    `CREATE TABLE IF NOT EXISTS task_events (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
       action varchar(20) NOT NULL, from_value text, to_value text, comment text, by_id uuid, by_name varchar(160), at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS ix_task_events_task ON task_events (task_id, at)",
    "CREATE INDEX IF NOT EXISTS ix_tasks_owner_open ON tasks (owner_id, status, due_date)",
    "CREATE INDEX IF NOT EXISTS ix_tasks_remind ON tasks (remind_at) WHERE remind_at IS NOT NULL AND reminded_at IS NULL",
    "CREATE INDEX IF NOT EXISTS ix_leads_rm_next ON leads (assigned_rm_id, next_action_date)",
    "CREATE INDEX IF NOT EXISTS ix_interactions_lead ON interactions (lead_id, occurred_at DESC)",
    "CREATE INDEX IF NOT EXISTS ix_interactions_deal ON interactions (deal_id, occurred_at DESC)", // 3rd+ photos of a scanned card / contact
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS call_id varchar(80)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS agent_id varchar(40)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS line_number varchar(30)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS folio_no varchar(40)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS arn_code varchar(30)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS txn_ref varchar(60)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS closed_at timestamptz",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS closed_by uuid",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS closed_by_name varchar(160)",
    "ALTER TABLE call_audits ADD COLUMN IF NOT EXISTS closure_remarks text",
    "CREATE INDEX IF NOT EXISTS ix_call_audits_call_id ON call_audits (lower(call_id))",
    "ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS call_audit_id uuid", // SRs raised from a call audit (one audit can have several)
    "UPDATE service_requests s SET call_audit_id = a.id FROM call_audits a WHERE a.sr_id = s.id AND s.call_audit_id IS NULL",
    // Call Audit SRs belong to the audit's business (AMC SRs were saved without one before the AMC vertical existed)
    "UPDATE service_requests s SET vertical = a.vertical FROM call_audits a WHERE s.call_audit_id = a.id AND s.vertical IS NULL AND a.vertical IN ('AMC','Retail Broking','Corporate Broking','Investment Banking','AIF','Institutional Equities')", // file name + path on the recorder server / shared drive (when not uploaded)
    `INSERT INTO sla_config (category, tat_hours, warning_percent, l1_owner, l2_after_hours, l2_owner, l3_after_hours, l3_owner, auto_close_hours)
       SELECT 'Call Audit', 168, 80, 'Team Lead of the employee', 96, 'AMC CRO', 144, 'AMC CEO', 240
        WHERE NOT EXISTS (SELECT 1 FROM sla_config WHERE category='Call Audit' AND subcategory IS NULL)`,
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
