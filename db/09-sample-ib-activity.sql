-- ════════════════════════════════════════════════════════════════════════════
-- 09-sample-ib-activity.sql — SAMPLE / UAT data so the dashboards show realistic figures
-- Run in pgAdmin (Query Tool) on niytri_crm as root_admin, AFTER 07-ib-ecm.sql and 08-sample-ib-companies.sql.
--
--  1. Companies for the IB opportunities that had none (HDFC Life, Sun Pharma, Godrej Properties, Vedanta) + 3 people each
--  2. Existing IB opportunities: company link, type, expected fee, probability, next action (+date), RM — only empty fields
--  3. 7 new IB opportunities on the sample companies (one Lost, with reason) — added once, by name
--  4. Links IB deals to their companies; Vedanta deal set to Closed to match its won opportunity
--  5. Sample meetings/calls (one today) and tasks (overdue / due today / upcoming / done) — added once, by title
--  6. UAT ONLY: re-dates service requests so SLA status is realistic (re-randomised every time you run it)
--
-- All people, figures and notes are FICTIONAL sample values marked "Sample data". Safe to re-run.
-- Works with pgAdmin auto-commit on or off. Dates are relative to the day you run it.
-- ════════════════════════════════════════════════════════════════════════════
SET search_path TO public;
-- columns the app normally adds at startup (so this also works on a database the app hasn't started against yet)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by_name varchar(255);

-- ── 1. Companies for existing opportunities ──
-- If the company already exists (e.g. "HDFC Life Insurance" as a Corporate/IE client) it is reused and added to IB
-- (only empty fields are filled); otherwise a new company record is created.
WITH owner AS (
  SELECT COALESCE(
    (SELECT id FROM users WHERE status='Active' AND vertical='Investment Banking' ORDER BY (role='Senior RM') DESC, name LIMIT 1),
    (SELECT id FROM users WHERE status='Active' AND role ILIKE '%super%admin%' ORDER BY name LIMIT 1)) AS id
), s(code, pattern, name, sector, industry, group_name, listed, symbol, hq, strength, revenue, ebitda, pat, net_worth, valuation, notes) AS (VALUES
  ('NIYT-C-900106', 'hdfc life%',    'HDFC Life Insurance Company Ltd',   'BFSI',                'Life insurance',          'HDFC Group',    'Listed', 'HDFCLIFE',   'Mumbai', 'Warm',   71000,  2300,  1800,  16000, 150000, 'SAMPLE FIGURES — replace with audited numbers. QIP discussion.'),
  ('NIYT-C-900107', 'sun pharma%',   'Sun Pharmaceutical Industries Ltd', 'Healthcare & Pharma', 'Pharmaceuticals',         'Sun Group',     'Listed', 'SUNPHARMA',  'Mumbai', 'Strong', 52000,  14500, 11000, 70000, 420000, 'SAMPLE FIGURES — replace with audited numbers. Minority stake sale in a subsidiary (PE).'),
  ('NIYT-C-900108', 'godrej prop%',  'Godrej Properties Ltd',             'Real Estate',         'Residential development', 'Godrej Group',  'Listed', 'GODREJPROP', 'Mumbai', 'Warm',   4900,   900,   700,   16500, 75000,  'SAMPLE FIGURES — replace with audited numbers. NCD issue.'),
  ('NIYT-C-900109', 'vedanta%',      'Vedanta Ltd',                       'Energy & Power',      'Metals & mining',         'Vedanta Group', 'Listed', 'VEDL',       'Mumbai', 'Strong', 150000, 41000, 14000, 45000, 180000, 'SAMPLE FIGURES — replace with audited numbers. Won M&A mandate.')
), upd AS (
  UPDATE clients c SET
    sector = COALESCE(c.sector, s.sector), industry = COALESCE(c.industry, s.industry), group_name = COALESCE(c.group_name, s.group_name),
    listed_status = COALESCE(c.listed_status, s.listed), exchange_symbol = COALESCE(c.exchange_symbol, s.symbol), hq_city = COALESCE(c.hq_city, s.hq),
    relationship_strength = COALESCE(c.relationship_strength, s.strength), relationship_owner_id = COALESCE(c.relationship_owner_id, (SELECT id FROM owner)),
    notes = COALESCE(c.notes, s.notes),
    revenue_cr = COALESCE(c.revenue_cr, s.revenue), ebitda_cr = COALESCE(c.ebitda_cr, s.ebitda), pat_cr = COALESCE(c.pat_cr, s.pat),
    net_worth_cr = COALESCE(c.net_worth_cr, s.net_worth), valuation_cr = COALESCE(c.valuation_cr, s.valuation),
    fin_year = COALESCE(c.fin_year, 'FY26'), fin_source = COALESCE(c.fin_source, 'Sample data – replace with audited figures'),
    fin_as_of = COALESCE(c.fin_as_of, DATE '2026-03-31'), fin_updated_by = COALESCE(c.fin_updated_by, 'Sample data'), fin_updated_at = COALESCE(c.fin_updated_at, NOW()),
    info_source = COALESCE(c.info_source, 'Sample data'), info_as_of = COALESCE(c.info_as_of, CURRENT_DATE),
    info_updated_by = COALESCE(c.info_updated_by, 'Sample data'), info_updated_at = COALESCE(c.info_updated_at, NOW()), updated_at = NOW()
  FROM s WHERE c.client_code = s.code OR c.name ILIKE s.pattern
  RETURNING c.id
), ins AS (
  INSERT INTO clients (client_code, name, type, category, status, kyc_status, sector, industry, group_name, listed_status, exchange_symbol, hq_city,
                       relationship_strength, relationship_owner_id, owner_id, rm_id, notes,
                       revenue_cr, ebitda_cr, pat_cr, net_worth_cr, valuation_cr, fin_year, fin_source, fin_as_of, fin_updated_by, fin_updated_at,
                       info_source, info_as_of, info_updated_by, info_updated_at)
  SELECT s.code, s.name, 'Non-Individual', 'Corporate', 'Active', 'Verified', s.sector, s.industry, s.group_name, s.listed, s.symbol, s.hq,
         s.strength, o.id, o.id, o.id, s.notes, s.revenue, s.ebitda, s.pat, s.net_worth, s.valuation,
         'FY26', 'Sample data – replace with audited figures', DATE '2026-03-31', 'Sample data', NOW(), 'Sample data', CURRENT_DATE, 'Sample data', NOW()
    FROM s CROSS JOIN owner o
   WHERE NOT EXISTS (SELECT 1 FROM clients x WHERE x.client_code = s.code OR x.name ILIKE s.pattern)
  RETURNING id
)
INSERT INTO client_verticals (client_id, vertical)
SELECT id, 'ib' FROM ins UNION SELECT id, 'ib' FROM upd
ON CONFLICT DO NOTHING;

-- Resolve a sample company code to the company actually used (an existing record with the same name wins)
-- — used below via:  JOIN LATERAL (… cmap …) c ON true
INSERT INTO company_people (client_id, name, designation, role_type, email, mobile, notes, is_key, created_by_name)
SELECT c.id, p.name, p.designation, p.role_type, p.email, p.mobile, p.notes, p.is_key, 'Sample data'
  FROM (VALUES
    ('NIYT-C-900106', 'Rahul Bhandari',  'Chief Financial Officer',   'CFO',        'cfo@hdfclife.example',      '+91 98190 71001', 'Owns QIP pricing.', true),
    ('NIYT-C-900106', 'Sneha Pillai',    'Head – Investor Relations', 'Management', 'ir@hdfclife.example',       '+91 98190 71002', 'Investor roadshow logistics.', false),
    ('NIYT-C-900106', 'Mohan Iyer',      'Company Secretary',         'CS',         'cs@hdfclife.example',       '+91 98190 71003', 'Board and shareholder approvals.', false),
    ('NIYT-C-900107', 'Vikram Doshi',    'Head – Corporate Development', 'Management', 'corpdev@sunpharma.example', '+91 98190 72001', 'Leads the stake sale.', true),
    ('NIYT-C-900107', 'Aparna Kulkarni', 'Group Treasurer',           'CFO',        'treasury@sunpharma.example', '+91 98190 72002', 'Signs off on structure.', true),
    ('NIYT-C-900107', 'Imran Shaikh',    'Legal Counsel',             'Management', 'legal@sunpharma.example',   '+91 98190 72003', 'SHA and SPA drafting.', false),
    ('NIYT-C-900108', 'Nikhil Sawant',   'Chief Financial Officer',   'CFO',        'cfo@godrejprop.example',    '+91 98190 73001', 'NCD tenor and coupon.', true),
    ('NIYT-C-900108', 'Pallavi Joshi',   'Treasury Manager',          'Management', 'treasury@godrejprop.example', '+91 98190 73002', 'Day-to-day contact.', false),
    ('NIYT-C-900108', 'Ketan Mehta',     'Company Secretary',         'CS',         'cs@godrejprop.example',     '+91 98190 73003', 'Trustee and exchange filings.', false),
    ('NIYT-C-900109', 'Arvind Saxena',   'Head – Strategy & M&A',     'Management', 'strategy@vedanta.example',  '+91 98190 74001', 'Mandate sponsor.', true),
    ('NIYT-C-900109', 'Ritu Malhotra',   'Deputy CFO',                'CFO',        'dycfo@vedanta.example',     '+91 98190 74002', 'Funding of the acquisition.', true),
    ('NIYT-C-900109', 'Sanjay Rao',      'General Counsel',           'Management', 'gc@vedanta.example',        '+91 98190 74003', 'Regulatory approvals.', false)
  ) AS p(code, name, designation, role_type, email, mobile, notes, is_key)
  JOIN LATERAL (SELECT x.id FROM clients x LEFT JOIN (VALUES ('NIYT-C-900106','hdfc life%'), ('NIYT-C-900107','sun pharma%'), ('NIYT-C-900108','godrej prop%'), ('NIYT-C-900109','vedanta%')) AS m(code, pattern) ON m.code = p.code
                 WHERE x.client_code = p.code OR (m.pattern IS NOT NULL AND x.name ILIKE m.pattern)
                 ORDER BY x.created_at LIMIT 1) c ON true
 WHERE NOT EXISTS (SELECT 1 FROM company_people x WHERE x.client_id = c.id AND lower(x.name) = lower(p.name));

-- ── 2. Existing IB opportunities: fill the empty ECM fields ──
UPDATE leads l SET
  client_id        = COALESCE(l.client_id, (SELECT x.id FROM clients x LEFT JOIN (VALUES ('NIYT-C-900106','hdfc life%'), ('NIYT-C-900107','sun pharma%'), ('NIYT-C-900108','godrej prop%'), ('NIYT-C-900109','vedanta%')) AS m(code, pattern) ON m.code = s.company
                                            WHERE x.client_code = s.company OR (m.pattern IS NOT NULL AND x.name ILIKE m.pattern)
                                            ORDER BY x.created_at LIMIT 1)),
  opportunity_type = COALESCE(l.opportunity_type, s.otype),
  expected_fee     = COALESCE(l.expected_fee, s.fee_cr * 10000000),
  probability      = COALESCE(l.probability, s.prob),
  next_action      = COALESCE(l.next_action, s.next_action),
  next_action_date = COALESCE(l.next_action_date, CASE WHEN s.next_action IS NULL THEN NULL ELSE CURRENT_DATE + s.days END),
  source           = COALESCE(l.source, s.src),
  assigned_rm_id   = COALESCE(l.assigned_rm_id, (SELECT id FROM users WHERE status='Active' AND vertical='Investment Banking' ORDER BY (role='Senior RM') DESC, name LIMIT 1)),
  updated_at       = NOW()
FROM (VALUES
  -- lead_code, company code,    type,              fee ₹Cr, prob, next action,                                   due in days, source
  ('IB-3041', 'NIYT-C-002005', 'M&A',               48,    25, 'Share buyer shortlist with Strategy head',        1,  'Referral'),
  ('IB-3042', 'NIYT-C-900106', 'QIP',               18,    60, 'Finalise QIP pricing range with CFO',            -2,  'Inbound'),
  ('IB-3043', 'NIYT-C-002004', 'Debt Raising',      32.5,  70, 'Lender consortium term-sheet call',               0,  'Existing Relationship'),
  ('IB-3044', 'NIYT-C-900107', 'Private Placement', 18,    80, 'Collect investor KYC and sign SHA',               5,  'PE / VC'),
  ('IB-3045', 'NIYT-C-900108', 'Debt Raising',      3.75,  85, 'File term sheet with debenture trustee',          3,  'Existing Relationship'),
  ('IB-3046', 'NIYT-C-900109', 'M&A',               72,   100, NULL,                                            NULL, 'Referral'),
  ('IB-3047', 'NIYT-C-002006', 'IPO',               24,    50, 'Anchor book commitment call',                     7,  'Investor')
) AS s(code, company, otype, fee_cr, prob, next_action, days, src)
WHERE l.lead_code = s.code AND l.vertical = 'Investment Banking';

-- ── 3. New IB opportunities on the sample companies ──
WITH rm AS (SELECT id FROM users WHERE status='Active' AND vertical='Investment Banking' ORDER BY (role='Senior RM') DESC, name LIMIT 1),
s(code, name, company, stage, priority, value_text, otype, fee_cr, prob, next_action, days, lost_reason, src, age_days) AS (VALUES
  ('IB-5001', 'Aarohan Chemicals — IPO',            'NIYT-C-900101', 'pitch',       'High',     '₹1,200Cr', 'IPO',          24,    35, 'Send pitch deck and valuation benchmarks to CFO', 2,  NULL,               'Promoter',             20),
  ('IB-5002', 'Nimbus Health — QIP',                'NIYT-C-900102', 'qualified',   'Medium',   '₹600Cr',   'QIP',          9,     20, 'Meeting with MD on use of proceeds',              4,  NULL,               'Research',             12),
  ('IB-5003', 'Kaveri Agro — Pre-IPO round',        'NIYT-C-900103', 'meeting',     'Medium',   '₹250Cr',   'Pre-IPO',      6.25,  20, 'Introduce two PE funds to the founder',          -1,  NULL,               'CA / CS',              26),
  ('IB-5004', 'Vyom Logistics — Sell-side M&A',     'NIYT-C-900104', 'contacted',   'Low',      '₹1,500Cr', 'M&A',          22.5,  10, 'Get NDA signed before sharing teaser',            6,  NULL,               'Event / Conference',    8),
  ('IB-5005', 'Shakti Auto — Main-board FPO',       'NIYT-C-900105', 'lost',        'Medium',   '₹300Cr',   'Fundraising',  3,      0, NULL,                                         NULL,  'Fee / Commercials', 'Existing Relationship', 40),
  ('IB-5006', 'Greenfield Infra — InvIT / IPO',     'NIT-IB-001',    'identified',  'Medium',   '₹2,000Cr', 'IPO',          20,     5, 'Intro call with promoter',                       10,  NULL,               'Research',              3),
  ('IB-5007', 'SolarEdge Power — IPO',              'NIT-IB-002',    'negotiation', 'High',     '₹1,800Cr', 'IPO',          32.4,  55, 'Agree engagement-letter fee split',               1,  NULL,               'Promoter',             33)
)
INSERT INTO leads (lead_code, name, vertical, stage, priority, value_estimate, source, assigned_rm_id, client_id, status, opened_at, created_at, updated_at,
                   closed_at, opportunity_type, expected_fee, probability, next_action, next_action_date, lost_reason, notes, created_by_name)
SELECT s.code, s.name, 'Investment Banking', s.stage, s.priority, s.value_text, s.src, (SELECT id FROM rm), c.id, 'Active',
       NOW() - s.age_days * INTERVAL '1 day', NOW() - s.age_days * INTERVAL '1 day', NOW(),
       CASE WHEN s.stage = 'lost' THEN NOW() - INTERVAL '5 days' END,
       s.otype, s.fee_cr * 10000000, s.prob, s.next_action, CASE WHEN s.days IS NULL THEN NULL ELSE CURRENT_DATE + s.days END, s.lost_reason,
       'Sample data', 'Sample data'
  FROM s JOIN clients c ON c.client_code = s.company
 WHERE NOT EXISTS (SELECT 1 FROM leads x WHERE x.lead_code = s.code OR (x.vertical = 'Investment Banking' AND lower(x.name) = lower(s.name)));

-- ── 4. IB deals: link companies; Vedanta closed to match its won opportunity ──
UPDATE deals d SET client_id = c.id, updated_at = NOW()
  FROM (VALUES ('IB-D001','NIYT-C-002005'), ('IB-D002','NIYT-C-900106'), ('IB-D003','NIYT-C-002004'), ('IB-D004','NIYT-C-900108'),
               ('IB-D005','NIYT-C-900109'), ('IB-D006','NIYT-C-002006'), ('IB-D007','NIYT-C-900107')) AS dm(deal, company)
  JOIN LATERAL (SELECT x.id FROM clients x LEFT JOIN (VALUES ('NIYT-C-900106','hdfc life%'), ('NIYT-C-900107','sun pharma%'), ('NIYT-C-900108','godrej prop%'), ('NIYT-C-900109','vedanta%')) AS m(code, pattern) ON m.code = dm.company
                 WHERE x.client_code = dm.company OR (m.pattern IS NOT NULL AND x.name ILIKE m.pattern)
                 ORDER BY x.created_at LIMIT 1) c ON true
 WHERE d.deal_code = dm.deal AND d.client_id IS NULL;
UPDATE deals SET stage = 'Closed', updated_at = NOW() WHERE deal_code = 'IB-D005' AND stage <> 'Closed';

-- ── 5. Sample meetings / calls and tasks (My Day, Company 360 timelines) ──
WITH rm AS (SELECT id, name FROM users WHERE status='Active' AND vertical='Investment Banking' ORDER BY (role='Senior RM') DESC, name LIMIT 1),
s(title, company, lead_code, itype, at_ts, summary, points, follow_days) AS (VALUES
  ('SolarEdge — engagement letter discussion', 'NIT-IB-002', 'IB-5007', 'Meeting',
     date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' + INTERVAL '15 hours',
     'Promoter and CFO keen to file DRHP in Q4. Open point is the fee split between the BRLMs.',
     '["Target DRHP filing Q4 FY27","Fresh issue ~₹1,200 Cr + OFS ~₹600 Cr","Fee split with co-BRLM still open"]', 1),
  ('Aarohan — call with CFO', 'NIYT-C-900101', 'IB-5001', 'Call', NOW() - INTERVAL '1 day',
     'CFO will share FY26 audited financials by Friday; wants valuation benchmarks against listed specialty-chemical peers.',
     '["FY26 audited numbers due Friday","Wants peer valuation benchmarks","Prefers fresh issue + OFS mix"]', 2),
  ('Tata Sons — strategy team meeting', 'NIYT-C-002005', 'IB-3041', 'Meeting', NOW() - INTERVAL '6 days',
     'Strategy team shared target criteria; we are to come back with a shortlist of three to five buyers.',
     '["Shortlist 3–5 buyers","Cross-border interest welcome","Confidentiality is critical"]', 1),
  ('Reliance — lender consortium prep', 'NIYT-C-002004', 'IB-3043', 'Call', NOW() - INTERVAL '3 days',
     'Agreed agenda for the lender term-sheet call; treasury to circulate updated cash-flow projections.',
     '["Term-sheet call scheduled","Updated projections from treasury","Two lenders seeking extra security"]', 0)
), ins AS (
  INSERT INTO interactions (type, occurred_at, client_id, lead_id, vertical, title, summary, key_points, next_follow_up, source, created_by, created_by_name)
  SELECT s.itype, s.at_ts, c.id, l.id, 'Investment Banking', s.title, s.summary, s.points::jsonb, CURRENT_DATE + s.follow_days, 'manual', rm.id, rm.name
    FROM s JOIN LATERAL (SELECT x.id FROM clients x LEFT JOIN (VALUES ('NIYT-C-900106','hdfc life%'), ('NIYT-C-900107','sun pharma%'), ('NIYT-C-900108','godrej prop%'), ('NIYT-C-900109','vedanta%')) AS m(code, pattern) ON m.code = s.company
                 WHERE x.client_code = s.company OR (m.pattern IS NOT NULL AND x.name ILIKE m.pattern)
                 ORDER BY x.created_at LIMIT 1) c ON true
    LEFT JOIN leads l ON l.lead_code = s.lead_code
    CROSS JOIN rm
   WHERE NOT EXISTS (SELECT 1 FROM interactions x WHERE x.title = s.title)
  RETURNING id
)
SELECT count(*) AS interactions_added FROM ins;

WITH rm AS (SELECT id, name FROM users WHERE status='Active' AND vertical='Investment Banking' ORDER BY (role='Senior RM') DESC, name LIMIT 1),
s(title, company, lead_code, due_days, priority, done) AS (VALUES
  ('Send revised fee proposal to HDFC Life CFO',       'NIYT-C-900106', 'IB-3042', -2, 'High',   false),
  ('Prepare deck for Reliance lender call',            'NIYT-C-002004', 'IB-3043',  0, 'High',   false),
  ('Draft NDA for Vyom Logistics',                     'NIYT-C-900104', 'IB-5004',  3, 'Medium', false),
  ('Collect FY26 financials from Aarohan',             'NIYT-C-900101', 'IB-5001',  3, 'Medium', false),
  ('Circulate Tata Sons buyer long-list internally',   'NIYT-C-002005', 'IB-3041', -5, 'Medium', true)
)
INSERT INTO tasks (title, due_date, priority, status, owner_id, owner_name, client_id, lead_id, vertical, created_by, created_by_name, completed_at)
SELECT s.title, CURRENT_DATE + s.due_days, s.priority, CASE WHEN s.done THEN 'Done' ELSE 'Open' END, rm.id, rm.name, c.id, l.id,
       'Investment Banking', rm.id, 'Sample data', CASE WHEN s.done THEN NOW() - INTERVAL '4 days' END
  FROM s JOIN LATERAL (SELECT x.id FROM clients x LEFT JOIN (VALUES ('NIYT-C-900106','hdfc life%'), ('NIYT-C-900107','sun pharma%'), ('NIYT-C-900108','godrej prop%'), ('NIYT-C-900109','vedanta%')) AS m(code, pattern) ON m.code = s.company
                 WHERE x.client_code = s.company OR (m.pattern IS NOT NULL AND x.name ILIKE m.pattern)
                 ORDER BY x.created_at LIMIT 1) c ON true
  LEFT JOIN leads l ON l.lead_code = s.lead_code
  CROSS JOIN rm
 WHERE NOT EXISTS (SELECT 1 FROM tasks x WHERE x.title = s.title);

-- ── 6. UAT ONLY: realistic service-request dates and SLA status (all verticals) ──
-- Open SRs: age spread over 0–130% of their TAT (Critical 1d, High 2d, Medium 4d, Low 7d) → about 1 in 4 breached, 1 in 5 at risk.
UPDATE service_requests SET
  created_at = NOW() - random() * 1.3 * CASE priority WHEN 'Critical' THEN INTERVAL '1 day' WHEN 'High' THEN INTERVAL '2 days'
                                                     WHEN 'Medium' THEN INTERVAL '4 days' ELSE INTERVAL '7 days' END,
  updated_at = NOW()
WHERE status NOT IN ('Resolved','Closed');
-- Resolved / closed: raised 8–40 days ago, most resolved within SLA
UPDATE service_requests SET
  created_at  = NOW() - (8 + random() * 32) * INTERVAL '1 day',
  updated_at  = NOW()
WHERE status IN ('Resolved','Closed');
UPDATE service_requests SET
  sla_deadline = created_at + CASE priority WHEN 'Critical' THEN INTERVAL '1 day' WHEN 'High' THEN INTERVAL '2 days'
                                            WHEN 'Medium' THEN INTERVAL '4 days' ELSE INTERVAL '7 days' END;
UPDATE service_requests SET
  resolved_at = created_at + (sla_deadline - created_at) * (0.3 + random() * 0.9),
  closed_at   = CASE WHEN status = 'Closed' THEN created_at + (sla_deadline - created_at) * (0.3 + random() * 0.9) + INTERVAL '1 day' END
WHERE status IN ('Resolved','Closed');
UPDATE service_requests SET sla_status = CASE
  WHEN status IN ('Resolved','Closed') THEN CASE WHEN COALESCE(resolved_at, closed_at) > sla_deadline THEN 'breached' ELSE 'ok' END
  WHEN sla_deadline < NOW() THEN 'breached'
  WHEN sla_deadline < NOW() + (sla_deadline - created_at) * 0.25 THEN 'warning'
  ELSE 'ok' END;

-- ── Check ──
SELECT 'IB open opportunities' AS item,
       count(*) FILTER (WHERE ps.is_won IS NOT TRUE AND ps.is_lost IS NOT TRUE)::text AS value
  FROM leads l LEFT JOIN pipeline_stages ps ON ps.entity='lead' AND ps.vertical='ib' AND ps.stage_id = l.stage
 WHERE l.vertical = 'Investment Banking' AND l.stage <> 'deleted'
UNION ALL SELECT 'IB opportunities missing a next action',
       count(*)::text FROM leads l JOIN pipeline_stages ps ON ps.entity='lead' AND ps.vertical='ib' AND ps.stage_id = l.stage
 WHERE l.vertical='Investment Banking' AND NOT ps.is_won AND NOT ps.is_lost AND coalesce(l.next_action,'') = ''
UNION ALL SELECT 'IB expected fee on open (₹ Cr)',
       round(sum(l.expected_fee) FILTER (WHERE ps.is_won IS NOT TRUE AND ps.is_lost IS NOT TRUE) / 1e7, 2)::text
  FROM leads l LEFT JOIN pipeline_stages ps ON ps.entity='lead' AND ps.vertical='ib' AND ps.stage_id = l.stage WHERE l.vertical='Investment Banking'
UNION ALL SELECT 'Open SRs breached / at risk / on track',
       count(*) FILTER (WHERE sla_status='breached')::text || ' / ' || count(*) FILTER (WHERE sla_status='warning') || ' / ' || count(*) FILTER (WHERE sla_status='ok')
  FROM service_requests WHERE status NOT IN ('Resolved','Closed')
UNION ALL SELECT 'IB meetings today', count(*)::text FROM interactions WHERE vertical='Investment Banking' AND (occurred_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
UNION ALL SELECT 'IB overdue tasks', count(*)::text FROM tasks WHERE vertical='Investment Banking' AND status='Open' AND due_date < CURRENT_DATE;
