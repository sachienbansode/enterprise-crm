-- ════════════════════════════════════════════════════════════════════════════
-- 07-ib-ecm.sql — Investment Banking / ECM release + Fireflies add-on
-- Run in pgAdmin (Query Tool) on database niytri_crm, connected as root_admin.
-- Safe to run more than once. The API server applies the same changes at startup,
-- so running this first (or not at all) gives the same result.
-- ════════════════════════════════════════════════════════════════════════════
SET search_path TO public;
-- (no BEGIN/COMMIT here: scripts/db-migrate.sh already runs each file in one transaction)

-- ── 1. Admin → Verticals Config → Visibility (modules hidden per vertical) ──
ALTER TABLE verticals_config ADD COLUMN IF NOT EXISTS hidden_modules text[] DEFAULT '{}';

-- ── 2. Company & promoter master (IB companies are rows in clients) ──
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cin varchar(30);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sector varchar(80);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry varchar(120);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS group_name varchar(160);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website varchar(200);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS listed_status varchar(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS exchange_symbol varchar(40);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hq_city varchar(80);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS revenue_cr numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ebitda_cr numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pat_cr numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS net_worth_cr numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS valuation_cr numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fin_year varchar(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fin_source varchar(160);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fin_as_of date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fin_updated_by varchar(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fin_updated_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS info_source varchar(160);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS info_as_of date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS info_updated_by varchar(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS info_updated_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS relationship_owner_id uuid;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS relationship_strength varchar(20);
-- CIN is the master key: no two companies with the same CIN
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_cin ON clients (upper(cin)) WHERE cin IS NOT NULL AND cin <> '';

CREATE TABLE IF NOT EXISTS company_people (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL, designation varchar(120), role_type varchar(40),
  email varchar(200), mobile varchar(40), linkedin varchar(250), notes text,
  is_key boolean DEFAULT false,
  created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_people_client ON company_people (client_id);
CREATE INDEX IF NOT EXISTS idx_company_people_email ON company_people (lower(email));

-- ── 3. Opportunity fields (leads) ──
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opportunity_type varchar(40);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action varchar(300);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_date date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason varchar(120);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_fee numeric;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS probability integer;

-- ── 4. Interactions (calls / meetings / notes / roadshows; typed, dictated or from Fireflies) ──
CREATE TABLE IF NOT EXISTS interactions (
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
);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON interactions (client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions (lead_id, occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_interactions_external ON interactions (source, external_id) WHERE external_id IS NOT NULL;

-- ── 5. Tasks / action items ──
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title varchar(400) NOT NULL, due_date date, priority varchar(10) DEFAULT 'Medium', status varchar(20) DEFAULT 'Open',
  owner_id uuid, owner_name varchar(255),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL, lead_id uuid, deal_id uuid, interaction_id uuid,
  vertical varchar(60),
  created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks (owner_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks (client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks (lead_id);

-- ── 6. Fireflies add-on settings (one row; keys are stored encrypted by the app) ──
CREATE TABLE IF NOT EXISTS fireflies_config (
  id integer PRIMARY KEY DEFAULT 1, enabled boolean DEFAULT false, api_key text, webhook_secret text,
  auto_create_tasks boolean DEFAULT true, only_matched boolean DEFAULT false,
  last_event_at timestamptz, last_status text, updated_by varchar(255), updated_at timestamptz DEFAULT now()
);
INSERT INTO fireflies_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── 7. IB pipeline: Identified → Contacted → Qualified → Meeting → Pitch → Negotiation → Mandate → Execution → Closed (+ Lost)
--      Runs only the first time (skipped once the 'identified' stage exists, so later admin edits are kept).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE entity='lead' AND vertical='ib' AND stage_id='identified') THEN
    DELETE FROM pipeline_stages WHERE entity='lead' AND vertical='ib';
    INSERT INTO pipeline_stages (entity, vertical, stage_id, label, sort_order, is_active, is_won, is_lost) VALUES
      ('lead','ib','identified','Identified', 1,true,false,false),
      ('lead','ib','contacted', 'Contacted',  2,true,false,false),
      ('lead','ib','qualified', 'Qualified',  3,true,false,false),
      ('lead','ib','meeting',   'Meeting',    4,true,false,false),
      ('lead','ib','pitch',     'Pitch',      5,true,false,false),
      ('lead','ib','negotiation','Negotiation',6,true,false,false),
      ('lead','ib','mandate',   'Mandate',    7,true,false,false),
      ('lead','ib','execution', 'Execution',  8,true,false,false),
      ('lead','ib','closed',    'Closed',     9,true,true, false),
      ('lead','ib','lost',      'Lost',      10,true,false,true);
    -- move existing IB opportunities onto the new stages (one pass, nothing is re-mapped)
    UPDATE leads l SET stage = m.to_stage, updated_at = NOW()
      FROM (VALUES ('prospect','identified'), ('initial_meeting','meeting'), ('mandate_discussion','negotiation'),
                   ('loi_signed','mandate'), ('mandate_signed','execution'), ('won','closed'), ('lost','lost'),
                   ('nda','negotiation'), ('dd','execution'), ('docs','execution'), ('closure','closed')) AS m(from_stage, to_stage)
     WHERE l.vertical='Investment Banking' AND l.stage = m.from_stage;
    UPDATE leads SET stage='identified'
     WHERE vertical='Investment Banking' AND stage <> 'deleted'
       AND stage NOT IN (SELECT stage_id FROM pipeline_stages WHERE entity='lead' AND vertical='ib');
  END IF;
END $$;

-- ── 8. Dropdown values (Admin → Dropdown Values can edit them later) ──
INSERT INTO dropdown_config (entity, field, value, label, sort_order, is_active)
SELECT v.entity, v.field, v.value, v.value, v.sort_order, true
  FROM (VALUES
    ('lead','opportunity_type','IPO',1), ('lead','opportunity_type','Pre-IPO',2), ('lead','opportunity_type','QIP',3),
    ('lead','opportunity_type','Private Placement',4), ('lead','opportunity_type','Rights Issue',5), ('lead','opportunity_type','OFS / Block',6),
    ('lead','opportunity_type','M&A',7), ('lead','opportunity_type','Fundraising',8), ('lead','opportunity_type','Debt Raising',9), ('lead','opportunity_type','Other',10),
    ('lead','source_ib','Referral',1), ('lead','source_ib','Promoter',2), ('lead','source_ib','Investor',3), ('lead','source_ib','CA / CS',4),
    ('lead','source_ib','PE / VC',5), ('lead','source_ib','Event / Conference',6), ('lead','source_ib','Research',7),
    ('lead','source_ib','Existing Relationship',8), ('lead','source_ib','Inbound',9), ('lead','source_ib','Other',10),
    ('lead','lost_reason','Fee / Commercials',1), ('lead','lost_reason','Lost to Competitor',2), ('lead','lost_reason','Deal Postponed',3),
    ('lead','lost_reason','Promoter Not Ready',4), ('lead','lost_reason','Valuation Mismatch',5), ('lead','lost_reason','Regulatory Issue',6),
    ('lead','lost_reason','Market Conditions',7), ('lead','lost_reason','No Response',8), ('lead','lost_reason','Other',9),
    ('client','sector','BFSI',1), ('client','sector','Healthcare & Pharma',2), ('client','sector','IT & Tech',3), ('client','sector','Consumer & Retail',4),
    ('client','sector','Industrials & Capital Goods',5), ('client','sector','Infrastructure',6), ('client','sector','Real Estate',7),
    ('client','sector','Energy & Power',8), ('client','sector','Chemicals',9), ('client','sector','Auto & Ancillaries',10),
    ('client','sector','Media & Telecom',11), ('client','sector','Agri & Food',12), ('client','sector','Logistics',13),
    ('client','sector','Textiles',14), ('client','sector','Other',15)
  ) AS v(entity, field, value, sort_order)
 WHERE NOT EXISTS (SELECT 1 FROM dropdown_config d WHERE d.entity=v.entity AND d.field=v.field AND d.value=v.value);


-- ── Check (expect: 10 stages, 4 new tables, IB opportunities all on new stages) ──
SELECT 'ib stages' AS item, count(*)::text AS value FROM pipeline_stages WHERE entity='lead' AND vertical='ib'
UNION ALL SELECT 'new tables', count(*)::text FROM information_schema.tables
 WHERE table_schema='public' AND table_name IN ('company_people','interactions','tasks','fireflies_config')
UNION ALL SELECT 'IB leads on unknown stage', count(*)::text FROM leads
 WHERE vertical='Investment Banking' AND stage <> 'deleted'
   AND stage NOT IN (SELECT stage_id FROM pipeline_stages WHERE entity='lead' AND vertical='ib');
