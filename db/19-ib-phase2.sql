-- 19-ib-phase2.sql — IB Phase 2: mandate milestones, investor database, roadshow / NDR meetings
-- Run in pgAdmin → Query Tool on niytri_crm (as root_admin), or: cd /opt/niytri-crm && bash scripts/db-migrate.sh db/19-ib-phase2.sql
-- The app creates the same tables at startup; this script also adds SAMPLE investors (fictional names) and
-- sample milestones / roadshow meetings on one IB mandate so the screens have data. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS deal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL, sort_order integer DEFAULT 0, due_date date, status varchar(20) DEFAULT 'Pending',
  owner_name varchar(120), notes text, done_at timestamptz,
  created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_deal_milestones_deal ON deal_milestones (deal_id);

CREATE TABLE IF NOT EXISTS investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(200) NOT NULL, investor_type varchar(40) DEFAULT 'Other',
  city varchar(80), country varchar(60) DEFAULT 'India', aum_cr numeric, ticket_min_cr numeric, ticket_max_cr numeric,
  sectors text[] DEFAULT '{}', deal_types text[] DEFAULT '{}',
  contact_name varchar(120), contact_designation varchar(120), contact_email varchar(160), contact_phone varchar(40), website varchar(200),
  relationship varchar(10) DEFAULT 'Warm', notes text, is_active boolean DEFAULT true,
  created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_investors_name ON investors (lower(name));

CREATE TABLE IF NOT EXISTS roadshow_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES investors(id), meeting_date timestamptz, mode varchar(30) DEFAULT 'One-on-one',
  location varchar(160), attendees text, status varchar(20) DEFAULT 'Planned', interest varchar(20) DEFAULT 'Not yet known',
  indicative_cr numeric, feedback text, next_step text,
  created_by uuid, created_by_name varchar(255), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_roadshow_deal ON roadshow_meetings (deal_id);
CREATE INDEX IF NOT EXISTS ix_roadshow_investor ON roadshow_meetings (investor_id);

-- SAMPLE investors (fictional). Only added if a investor of the same name doesn't exist.
INSERT INTO investors (name, investor_type, city, aum_cr, ticket_min_cr, ticket_max_cr, sectors, deal_types, contact_name, contact_designation, contact_email, contact_phone, relationship, notes, created_by_name)
SELECT v.* FROM (VALUES
  ('Arcadia Mutual Fund',            'Mutual Fund',   'Mumbai',    185000, 25,  400, ARRAY['Financial Services','Consumer','Healthcare','Manufacturing'], ARRAY['IPO','QIP','OFS / Block'], 'Kavita Rao',     'Fund Manager — Equity',  'kavita.rao@arcadiamf.example',   '+91 98200 10001', 'Hot',  'Anchor investor in most large IPOs', 'Sample data'),
  ('Banyan Life Insurance',          'Insurance',     'Mumbai',    92000,  50,  500, ARRAY['Sector agnostic'],                                  ARRAY['IPO','QIP','Debt / NCD'],  'Sanjay Kulkarni', 'CIO',                    'sanjay.k@banyanlife.example',    '+91 98200 10002', 'Warm', 'Prefers profitable companies; large tickets', 'Sample data'),
  ('Cedar Emerging Markets Fund',    'FPI',           'Singapore', 240000, 75,  800, ARRAY['Technology','Financial Services','Consumer'],      ARRAY['IPO','QIP','OFS / Block'], 'Daniel Tan',      'Portfolio Manager',      'dtan@cedarem.example',           '+65 8100 2003',   'Warm', 'Long-only; India allocation ~12%', 'Sample data'),
  ('Delta Growth Partners',          'PE / VC',       'Bengaluru', 18000,  50,  350, ARRAY['Technology','Healthcare','Consumer'],               ARRAY['Pre-IPO','Private Equity'], 'Rhea Kapoor',     'Partner',                'rhea@deltagrowth.example',       '+91 98450 10004', 'Hot',  'Growth equity; board seat for > ₹150 Cr', 'Sample data'),
  ('Evergreen Family Office',        'Family Office', 'Mumbai',    6500,   5,   60,  ARRAY['Sector agnostic'],                                  ARRAY['IPO','Pre-IPO','Private Equity','QIP'], 'Mehul Shah',  'Investment Head',        'mehul@evergreenfo.example',      '+91 98330 10005', 'Warm', 'Co-invests alongside PE funds', 'Sample data'),
  ('Falcon Infrastructure AIF',      'AIF',           'New Delhi', 9400,   25,  200, ARRAY['Infrastructure','Energy','Real Estate'],            ARRAY['Private Equity','Debt / NCD','Pre-IPO'], 'Arjun Sethi', 'Managing Partner',    'arjun@falconaif.example',        '+91 98100 10006', 'Warm', 'Cat II AIF; yield + growth', 'Sample data'),
  ('Granite Pension Trust',          'Pension / Provident Fund', 'Mumbai', 120000, 100, 1000, ARRAY['Infrastructure','Financial Services','Energy'], ARRAY['Debt / NCD','QIP','OFS / Block'], 'Uma Iyer', 'Head — Investments',  'uma.iyer@granitepension.example', '+91 98200 10007', 'Cold', 'AAA / AA paper only for debt', 'Sample data'),
  ('Horizon Small Cap Fund',         'Mutual Fund',   'Mumbai',    21000,  5,   75,  ARRAY['Manufacturing','Chemicals','Consumer','Technology'], ARRAY['IPO','QIP'],               'Nikhil Bhatt',    'Fund Manager',           'nikhil@horizonmf.example',       '+91 98200 10008', 'Hot',  'SME and mid-size IPO anchors', 'Sample data'),
  ('Indus Special Situations',       'AIF',           'Mumbai',    7800,   20,  250, ARRAY['Sector agnostic'],                                  ARRAY['Debt / NCD','Private Equity','OFS / Block'], 'Farah Merchant', 'Partner',            'farah@indusss.example',          '+91 98200 10009', 'Warm', 'Distressed and structured credit', 'Sample data'),
  ('Juniper Global Healthcare Fund', 'FPI',           'London',    56000,  40,  300, ARRAY['Healthcare','Pharmaceuticals'],                      ARRAY['IPO','QIP','Pre-IPO'],     'Oliver Grant',    'Sector Lead — Healthcare', 'ogrant@juniperhc.example',     '+44 7700 900010', 'Warm', 'Pharma / hospitals / diagnostics', 'Sample data'),
  ('Kestrel Consumer Partners',      'PE / VC',       'Mumbai',    11000,  75,  400, ARRAY['Consumer','Retail','Food & Beverage'],              ARRAY['Private Equity','Pre-IPO'], 'Pooja Narang',    'Principal',              'pooja@kestrelcp.example',        '+91 98200 10011', 'Cold', 'Control and significant minority deals', 'Sample data'),
  ('Lotus Bank Treasury',            'Bank / NBFC',   'Mumbai',    300000, 100, 750, ARRAY['Sector agnostic'],                                  ARRAY['Debt / NCD'],              'Ramesh Pillai',   'Head — Treasury',        'ramesh.p@lotusbank.example',     '+91 98200 10012', 'Warm', 'NCD / CP desk', 'Sample data')
) AS v(name, investor_type, city, aum_cr, ticket_min_cr, ticket_max_cr, sectors, deal_types, contact_name, contact_designation, contact_email, contact_phone, relationship, notes, created_by_name)
WHERE NOT EXISTS (SELECT 1 FROM investors i WHERE lower(i.name) = lower(v.name));
UPDATE investors SET country = city WHERE city IN ('Singapore', 'London', 'Dubai', 'New York', 'Hong Kong') AND country = 'India';

-- Sample milestones + roadshow on the first open IB ECM / IPO mandate (only if it has none yet)
WITH d AS (
  SELECT id, COALESCE(deal_date, CURRENT_DATE - 60) AS start FROM deals
   WHERE vertical = 'Investment Banking' AND stage NOT IN ('deleted') AND (type ILIKE '%ECM%' OR type ILIKE '%IPO%' OR details->>'kind' = 'ipo')
   ORDER BY (name ILIKE '%IPO%') DESC, deal_code LIMIT 1
), m(title, days, status, ord) AS (VALUES
  ('Mandate letter / engagement signed', 0, 'Done', 1), ('Kick-off meeting & syndicate appointed', 7, 'Done', 2), ('Due diligence (legal, financial, business)', 30, 'Done', 3),
  ('Restated financials & auditor comfort', 45, 'In progress', 4), ('DRHP drafted and board-approved', 60, 'Pending', 5), ('DRHP filed with SEBI & exchanges', 75, 'Pending', 6),
  ('SEBI observations received', 135, 'Pending', 7), ('RHP filed with RoC', 160, 'Pending', 8), ('Price band & anchor allocation', 170, 'Pending', 9),
  ('Roadshows / NDRs completed', 172, 'Pending', 10), ('Issue open — bidding', 175, 'Pending', 11), ('Basis of allotment finalised', 182, 'Pending', 12), ('Listing & trading', 185, 'Pending', 13)
)
INSERT INTO deal_milestones (deal_id, title, sort_order, due_date, status, done_at, created_by_name)
SELECT d.id, m.title, m.ord, d.start + m.days, m.status, CASE WHEN m.status = 'Done' THEN now() END, 'Sample data'
  FROM d, m WHERE NOT EXISTS (SELECT 1 FROM deal_milestones x WHERE x.deal_id = d.id);

WITH d AS (
  SELECT id FROM deals WHERE vertical = 'Investment Banking' AND stage NOT IN ('deleted') AND (type ILIKE '%ECM%' OR type ILIKE '%IPO%' OR details->>'kind' = 'ipo')
   ORDER BY (name ILIKE '%IPO%') DESC, deal_code LIMIT 1
), r(investor, days, mode, status, interest, ind, feedback) AS (VALUES
  ('Arcadia Mutual Fund',         -12, 'One-on-one',    'Done',    'High',   12, 'Liked the growth story; wants clarity on working capital cycle'),
  ('Cedar Emerging Markets Fund', -9,  'Video call',    'Done',    'Medium', 8,  'Valuation feels full; will revisit at price band'),
  ('Horizon Small Cap Fund',      -7,  'Group meeting', 'Done',    'High',   6,  'Keen to anchor; asked for peer comparison'),
  ('Banyan Life Insurance',       -3,  'One-on-one',    'Done',    'Low',    0,  'Prefers a profitability track record of 3 years'),
  ('Juniper Global Healthcare Fund', 4, 'NDR',          'Planned', 'Not yet known', NULL, NULL),
  ('Evergreen Family Office',     6,   'One-on-one',    'Planned', 'Not yet known', NULL, NULL)
)
INSERT INTO roadshow_meetings (deal_id, investor_id, meeting_date, mode, location, status, interest, indicative_cr, feedback, created_by_name)
SELECT d.id, i.id, now() + (r.days || ' days')::interval, r.mode, 'Mumbai', r.status, r.interest, r.ind, r.feedback, 'Sample data'
  FROM d, r JOIN investors i ON lower(i.name) = lower(r.investor)
 WHERE NOT EXISTS (SELECT 1 FROM roadshow_meetings x WHERE x.deal_id = d.id);

COMMIT;

-- Check
SELECT (SELECT COUNT(*) FROM investors WHERE is_active) AS investors,
       (SELECT COUNT(*) FROM deal_milestones) AS milestones,
       (SELECT COUNT(*) FROM roadshow_meetings) AS roadshow_meetings;
