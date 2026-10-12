-- ════════════════════════════════════════════════════════════════════════════
-- 08-sample-ib-companies.sql — SAMPLE data for Investment Banking › Companies & Promoters
-- 10 companies with every profile/financial field filled, and 4 people per company.
-- Run in pgAdmin (Query Tool) on niytri_crm as root_admin, AFTER 07-ib-ecm.sql.
-- Safe to run more than once:
--   • the 5 existing IB companies only get values where a field is still empty (nothing typed in the CRM is overwritten)
--   • the 5 new sample companies are added only if their CIN / code is not already present
--   • a person is added only if that name is not already on the company
-- All people, e-mails, phone numbers and financial figures are FICTIONAL sample values (source shows
-- "Sample data") — replace them with verified information, especially for real listed groups.
-- Works with pgAdmin auto-commit on or off (no temp tables).
-- ════════════════════════════════════════════════════════════════════════════
SET search_path TO public;

-- ── 1. Company profiles (existing 5 are filled where empty; new 5 are created) ──
WITH owner AS (
  -- relationship owner: the IB Senior RM, else any active IB user, else a Super Admin
  SELECT COALESCE(
    (SELECT id FROM users WHERE status='Active' AND vertical='Investment Banking' ORDER BY (role='Senior RM') DESC, name LIMIT 1),
    (SELECT id FROM users WHERE status='Active' AND role ILIKE '%super%admin%' ORDER BY name LIMIT 1)) AS id
),
s(code, name, cin, sector, industry, group_name, listed_status, symbol, hq_city, website, email, mobile, address, incorporated,
  strength, revenue, ebitda, pat, net_worth, valuation, notes) AS (VALUES
  ('NIT-IB-001', 'Greenfield Infrastructure Pvt Ltd', 'U45200MH2012PTC231456', 'Infrastructure', 'Roads & highways EPC', 'Greenfield Group', 'Unlisted', NULL,
   'Mumbai', 'https://greenfield.example', 'corporate@greenfield.example', '+91 22 4000 1100', 'Greenfield House, Andheri-Kurla Road, Andheri (E), Mumbai 400093', DATE '2012-06-18',
   'Warm', 1850, 296, 118, 940, 3200, 'Order book ~3x revenue; promoters considering an InvIT or IPO to deleverage.'),
  ('NIT-IB-002', 'SolarEdge Power Pvt Ltd', 'U40106GJ2016PTC092347', 'Energy & Power', 'Solar IPP (1.2 GW operational)', 'SolarEdge Group', 'Unlisted', NULL,
   'Ahmedabad', 'https://solaredge-power.example', 'ipo@solaredge-power.example', '+91 79 4000 2200', 'SolarEdge Tower, SG Highway, Ahmedabad 380054', DATE '2016-03-09',
   'Strong', 640, 410, 95, 780, 4100, 'IPO preparation under way; DRHP target Q4 FY27.'),
  ('NIYT-C-002004', 'Reliance Industries Ltd', 'L17110MH1973PLC019786', 'Energy & Power', 'Diversified conglomerate', 'Reliance Group', 'Listed', 'RELIANCE',
   'Mumbai', 'https://ril.example', 'investor.rel@ril.example', '+91 22 4000 3300', 'Maker Chambers IV, Nariman Point, Mumbai 400021', DATE '1973-05-08',
   'Warm', 950000, 165000, 70000, 840000, 1900000, 'SAMPLE FIGURES — replace with audited numbers. Relationship via infra restructuring mandate.'),
  ('NIYT-C-002005', 'Tata Sons Pvt Ltd', 'U99999MH1917PLC000478', 'Industrials & Capital Goods', 'Holding company', 'Tata Group', 'Unlisted', NULL,
   'Mumbai', 'https://tata.example', 'bd@tata.example', '+91 22 4000 4400', 'Bombay House, Homi Mody Street, Fort, Mumbai 400001', DATE '1917-11-08',
   'Cold', 42000, 36000, 30000, 270000, 700000, 'SAMPLE FIGURES — replace with audited numbers. Early-stage M&A discussion.'),
  ('NIYT-C-002006', 'Maharashtra State Pension Fund', NULL, 'BFSI', 'Pension fund (institutional investor)', NULL, 'Unlisted', NULL,
   'Mumbai', 'https://mpf.example', 'equity@mpf.example', '+91 22 4000 5500', 'Mantralaya Annexe, Madame Cama Road, Mumbai 400032', DATE '2005-04-01',
   'Warm', 2400, 2150, 2100, 38000, 38000, 'Anchor-investor relationship; valuation = assets under management (sample).'),
  ('NIYT-C-900101', 'Aarohan Specialty Chemicals Limited', 'U24100MH2009PLC195311', 'Chemicals', 'Specialty & agro chemicals', 'Aarohan Group', 'Unlisted', NULL,
   'Navi Mumbai', 'https://aarohanchem.example', 'info@aarohanchem.example', '+91 22 4000 6100', 'Plot 14, TTC Industrial Area, Mahape, Navi Mumbai 400710', DATE '2009-08-21',
   'Strong', 1240, 236, 141, 690, 5400, 'Promoters exploring an IPO in FY27; CFO keen on a fresh issue + OFS mix.'),
  ('NIYT-C-900102', 'Nimbus Health Diagnostics Limited', 'L85110KA2004PLC034872', 'Healthcare & Pharma', 'Diagnostics chain', 'Nimbus Health', 'Listed', 'NIMBUSDX',
   'Bengaluru', 'https://nimbushealth.example', 'ir@nimbushealth.example', '+91 80 4000 6200', '22 Residency Road, Bengaluru 560025', DATE '2004-02-12',
   'Warm', 910, 228, 112, 760, 7800, 'Listed; evaluating a QIP to fund 120 new collection centres.'),
  ('NIYT-C-900103', 'Kaveri Agro Foods Private Limited', 'U15400TN2011PTC081209', 'Agri & Food', 'Packaged staples', 'Kaveri Group', 'Unlisted', NULL,
   'Chennai', 'https://kaveriagro.example', 'finance@kaveriagro.example', '+91 44 4000 6300', 'No. 8, Mount Road, Guindy, Chennai 600032', DATE '2011-07-04',
   'Warm', 520, 58, 27, 210, 1300, 'Pre-IPO round under discussion with two PE funds.'),
  ('NIYT-C-900104', 'Vyom Logistics Private Limited', 'U63090DL2015PTC284460', 'Logistics', 'Warehousing & 3PL', 'Vyom Group', 'Unlisted', NULL,
   'New Delhi', 'https://vyomlogistics.example', 'corpdev@vyomlogistics.example', '+91 11 4000 6400', 'A-41, Okhla Industrial Area Phase II, New Delhi 110020', DATE '2015-10-15',
   'Cold', 780, 101, 34, 295, 2100, 'Founder open to a strategic sale; early conversations only.'),
  ('NIYT-C-900105', 'Shakti Auto Components Limited', 'L34300PN1998PLC123874', 'Auto & Ancillaries', 'Forgings & castings', 'Shakti Group', 'SME Listed', 'SHAKTIAC',
   'Pune', 'https://shaktiauto.example', 'investors@shaktiauto.example', '+91 20 4000 6500', 'Gat No. 112, Chakan MIDC, Pune 410501', DATE '1998-01-27',
   'Warm', 365, 62, 29, 188, 940, 'SME-listed; considering migration to the main board with a follow-on issue.')
),
upd AS (
  UPDATE clients c SET
    cin                   = COALESCE(NULLIF(c.cin,''), s.cin),
    sector                = COALESCE(c.sector, s.sector),
    industry              = COALESCE(c.industry, s.industry),
    group_name            = COALESCE(c.group_name, s.group_name),
    listed_status         = COALESCE(c.listed_status, s.listed_status),
    exchange_symbol       = COALESCE(c.exchange_symbol, s.symbol),
    hq_city               = COALESCE(c.hq_city, s.hq_city),
    website               = COALESCE(c.website, s.website),
    email                 = COALESCE(c.email, s.email),
    mobile                = COALESCE(c.mobile, s.mobile),
    address               = COALESCE(c.address, s.address),
    date_of_incorporation = COALESCE(c.date_of_incorporation, s.incorporated),
    notes                 = COALESCE(c.notes, s.notes),
    relationship_strength = COALESCE(c.relationship_strength, s.strength),
    relationship_owner_id = COALESCE(c.relationship_owner_id, (SELECT id FROM owner)),
    revenue_cr            = COALESCE(c.revenue_cr, s.revenue),
    ebitda_cr             = COALESCE(c.ebitda_cr, s.ebitda),
    pat_cr                = COALESCE(c.pat_cr, s.pat),
    net_worth_cr          = COALESCE(c.net_worth_cr, s.net_worth),
    valuation_cr          = COALESCE(c.valuation_cr, s.valuation),
    fin_year              = COALESCE(c.fin_year, 'FY26'),
    fin_source            = COALESCE(c.fin_source, 'Sample data – replace with audited figures'),
    fin_as_of             = COALESCE(c.fin_as_of, DATE '2026-03-31'),
    fin_updated_by        = COALESCE(c.fin_updated_by, 'Sample data'),
    fin_updated_at        = COALESCE(c.fin_updated_at, NOW()),
    info_source           = COALESCE(c.info_source, 'Sample data – MCA21 / company website'),
    info_as_of            = COALESCE(c.info_as_of, CURRENT_DATE),
    info_updated_by       = COALESCE(c.info_updated_by, 'Sample data'),
    info_updated_at       = COALESCE(c.info_updated_at, NOW()),
    updated_at            = NOW()
  FROM s
  WHERE c.client_code = s.code
    -- never give a CIN that another company already has
    AND (s.cin IS NULL OR NOT EXISTS (SELECT 1 FROM clients x WHERE upper(x.cin) = s.cin AND x.id <> c.id))
  RETURNING c.id
),
ins AS (
  INSERT INTO clients (client_code, name, type, category, status, kyc_status, cin, sector, industry, group_name, listed_status, exchange_symbol,
                       hq_city, website, email, mobile, address, date_of_incorporation, notes,
                       relationship_strength, relationship_owner_id, owner_id, rm_id,
                       revenue_cr, ebitda_cr, pat_cr, net_worth_cr, valuation_cr, fin_year, fin_source, fin_as_of, fin_updated_by, fin_updated_at,
                       info_source, info_as_of, info_updated_by, info_updated_at)
  SELECT s.code, s.name, 'Non-Individual', 'Corporate', 'Active', 'Pending', s.cin, s.sector, s.industry, s.group_name, s.listed_status, s.symbol,
         s.hq_city, s.website, s.email, s.mobile, s.address, s.incorporated, s.notes,
         s.strength, o.id, o.id, o.id,
         s.revenue, s.ebitda, s.pat, s.net_worth, s.valuation, 'FY26', 'Sample data – replace with audited figures', DATE '2026-03-31', 'Sample data', NOW(),
         'Sample data – MCA21 / company website', CURRENT_DATE, 'Sample data', NOW()
    FROM s CROSS JOIN owner o
   WHERE s.code LIKE 'NIYT-C-9001%'
     AND NOT EXISTS (SELECT 1 FROM clients x WHERE x.client_code = s.code OR (s.cin IS NOT NULL AND upper(x.cin) = s.cin))
  RETURNING id
)
INSERT INTO client_verticals (client_id, vertical)
SELECT id, 'ib' FROM ins
UNION SELECT id, 'ib' FROM upd
ON CONFLICT DO NOTHING;

-- ── 2. Promoters / management — 4 per company (fictional people) ──
INSERT INTO company_people (client_id, name, designation, role_type, email, mobile, notes, is_key, created_by_name)
SELECT c.id, p.name, p.designation, p.role_type, p.email, p.mobile, p.notes, p.is_key, 'Sample data'
  FROM (VALUES
    ('NIT-IB-001',    'Rakesh Malhotra',   'Chairman & MD',              'Promoter',   'rakesh.m@greenfield.example',      '+91 98200 11001', 'Final decision-maker on listing route.', true),
    ('NIT-IB-001',    'Neha Kulkarni',     'Chief Financial Officer',    'CFO',        'neha.k@greenfield.example',        '+91 98200 11002', 'Owns the debt-reduction plan.', true),
    ('NIT-IB-001',    'Sameer Joshi',      'Company Secretary',          'CS',         'sameer.j@greenfield.example',      '+91 98200 11003', 'Board papers and statutory filings.', false),
    ('NIT-IB-001',    'Ajay Malhotra',     'Executive Director',         'Promoter',   'ajay.m@greenfield.example',        '+91 98200 11004', 'Second-generation promoter; runs projects.', false),
    ('NIT-IB-002',    'Hemant Patel',      'Founder & CEO',              'Promoter',   'hemant@solaredge-power.example',   '+91 98250 22001', 'Driving the IPO timeline.', true),
    ('NIT-IB-002',    'Kavita Desai',      'Director – Finance',         'CFO',        'kavita@solaredge-power.example',   '+91 98250 22002', 'Prefers fresh issue over OFS.', true),
    ('NIT-IB-002',    'Jignesh Shah',      'Company Secretary',          'CS',         'cs@solaredge-power.example',       '+91 98250 22003', 'Coordinating legal counsel for DRHP.', false),
    ('NIT-IB-002',    'Meenal Trivedi',    'Independent Director',       'Board',      'meenal.t@solaredge-power.example', '+91 98250 22004', 'Audit committee chair.', false),
    ('NIYT-C-002004', 'Anand Sabnis',      'Head – Corporate Finance',   'Management', 'anand.sabnis@ril.example',         '+91 98190 33001', 'Main contact for restructuring mandate.', true),
    ('NIYT-C-002004', 'Priyanka Rege',     'Investor Relations',         'Management', 'priyanka.rege@ril.example',        '+91 98190 33002', 'Handles analyst and investor meetings.', false),
    ('NIYT-C-002004', 'Gaurang Mehta',     'Group Treasurer',            'CFO',        'gaurang.mehta@ril.example',        '+91 98190 33003', 'Debt capital markets decisions.', true),
    ('NIYT-C-002004', 'Shruti Nair',       'Deputy Company Secretary',   'CS',         'shruti.nair@ril.example',          '+91 98190 33004', 'Regulatory filings and approvals.', false),
    ('NIYT-C-002005', 'Vivek Iyer',        'Head – Strategy & M&A',      'Management', 'vivek.iyer@tata.example',          '+91 98330 44001', 'Leads inorganic opportunities.', true),
    ('NIYT-C-002005', 'Farah Mistry',      'Group Treasury',             'CFO',        'farah.mistry@tata.example',        '+91 98330 44002', 'Funding structure for acquisitions.', false),
    ('NIYT-C-002005', 'Rustom Bharucha',   'General Counsel',            'Management', 'rustom.b@tata.example',            '+91 98330 44003', 'Legal sign-off on term sheets.', false),
    ('NIYT-C-002005', 'Ananya Sen',        'Director – Corporate Development', 'Management', 'ananya.sen@tata.example',     '+91 98330 44004', 'Day-to-day deal contact.', true),
    ('NIYT-C-002006', 'Dr. S. Raghavan',   'Chief Investment Officer',   'Management', 'cio@mpf.example',                  '+91 98670 55001', 'Approves anchor allocations.', true),
    ('NIYT-C-002006', 'Manisha Pawar',     'Fund Manager – Equity',      'Management', 'manisha.pawar@mpf.example',        '+91 98670 55002', 'Prefers large-cap, low-leverage issuers.', false),
    ('NIYT-C-002006', 'Atul Deshpande',    'Head – Risk',                'Management', 'atul.d@mpf.example',               '+91 98670 55003', 'Reviews concentration limits.', false),
    ('NIYT-C-002006', 'Sunita Kale',       'Compliance Officer',         'Management', 'compliance@mpf.example',           '+91 98670 55004', 'KYC / empanelment documents.', false),
    ('NIYT-C-900101', 'Mahesh Agarwal',    'Promoter & Chairman',        'Promoter',   'mahesh@aarohanchem.example',       '+91 99200 61001', 'Wants listing before FY27 year-end.', true),
    ('NIYT-C-900101', 'Ritika Agarwal',    'Whole-time Director',        'Promoter',   'ritika@aarohanchem.example',       '+91 99200 61002', 'Runs exports business.', true),
    ('NIYT-C-900101', 'Suresh Nambiar',    'Chief Financial Officer',    'CFO',        'suresh.n@aarohanchem.example',     '+91 99200 61003', 'Sharing FY26 financials shortly.', true),
    ('NIYT-C-900101', 'Pooja Bhide',       'Company Secretary',          'CS',         'cs@aarohanchem.example',           '+91 99200 61004', 'Secretarial clean-up before DRHP.', false),
    ('NIYT-C-900102', 'Dr. Arvind Rao',    'Founder & MD',               'Promoter',   'arvind.rao@nimbushealth.example',  '+91 99000 62001', 'Open to QIP if pricing holds.', true),
    ('NIYT-C-900102', 'Leena Thomas',      'Chief Financial Officer',    'CFO',        'leena.t@nimbushealth.example',     '+91 99000 62002', 'Drafting capex plan for QIP use of funds.', true),
    ('NIYT-C-900102', 'Karan Shetty',      'Independent Director',       'Board',      'karan.s@nimbushealth.example',     '+91 99000 62003', 'Ex-banker; useful sounding board.', false),
    ('NIYT-C-900102', 'Divya Menon',       'Head – Investor Relations',  'Management', 'ir.head@nimbushealth.example',     '+91 99000 62004', 'Organises NDRs and analyst calls.', false),
    ('NIYT-C-900103', 'Senthil Kumar',     'Founder & MD',               'Promoter',   'senthil@kaveriagro.example',       '+91 98400 63001', 'Wants a strategic PE partner.', true),
    ('NIYT-C-900103', 'Lakshmi Narayanan', 'Chief Financial Officer',    'CFO',        'lakshmi@kaveriagro.example',       '+91 98400 63002', 'Preparing data room.', false),
    ('NIYT-C-900103', 'Arun Venkatesh',    'Director – Operations',      'Promoter',   'arun.v@kaveriagro.example',        '+91 98400 63003', 'Co-founder; plant expansion lead.', false),
    ('NIYT-C-900103', 'Revathi Subramanian','Company Secretary',         'CS',         'cs@kaveriagro.example',            '+91 98400 63004', 'Shareholder agreements.', false),
    ('NIYT-C-900104', 'Rohit Bansal',      'Founder & CEO',              'Promoter',   'rohit@vyomlogistics.example',      '+91 98110 64001', 'Open to majority sale at the right price.', true),
    ('NIYT-C-900104', 'Anita Sethi',       'VP – Finance',               'CFO',        'anita@vyomlogistics.example',      '+91 98110 64002', 'Monthly MIS available on request.', false),
    ('NIYT-C-900104', 'Manoj Gupta',       'Co-founder & COO',           'Promoter',   'manoj@vyomlogistics.example',      '+91 98110 64003', 'Holds 22% stake.', true),
    ('NIYT-C-900104', 'Simran Kaur',       'Legal Head',                 'Management', 'legal@vyomlogistics.example',      '+91 98110 64004', 'NDA and term-sheet reviews.', false),
    ('NIYT-C-900105', 'Prakash Deshmukh',  'Promoter & MD',              'Promoter',   'prakash@shaktiauto.example',       '+91 98220 65001', 'Keen on main-board migration.', true),
    ('NIYT-C-900105', 'Swati Gokhale',     'Chief Financial Officer',    'CFO',        'swati@shaktiauto.example',         '+91 98220 65002', 'Tracks eligibility criteria.', true),
    ('NIYT-C-900105', 'Nitin Apte',        'Company Secretary',          'CS',         'cs@shaktiauto.example',            '+91 98220 65003', 'Exchange correspondence.', false),
    ('NIYT-C-900105', 'Vaishali Deshmukh', 'Whole-time Director',        'Promoter',   'vaishali@shaktiauto.example',      '+91 98220 65004', 'Oversees HR and plant 2.', false)
  ) AS p(code, name, designation, role_type, email, mobile, notes, is_key)
  JOIN clients c ON c.client_code = p.code
 WHERE NOT EXISTS (SELECT 1 FROM company_people x WHERE x.client_id = c.id AND lower(x.name) = lower(p.name));

-- ── Check: 10 companies, each with 4 people and a relationship owner ──
SELECT c.client_code, c.name, c.cin, c.sector, c.listed_status, c.relationship_strength AS strength,
       u.name AS relationship_owner, c.revenue_cr, c.valuation_cr,
       (SELECT count(*) FROM company_people p WHERE p.client_id = c.id) AS people
  FROM clients c
  JOIN client_verticals v ON v.client_id = c.id AND v.vertical = 'ib'
  LEFT JOIN users u ON u.id = c.relationship_owner_id
 WHERE c.client_code IN ('NIT-IB-001','NIT-IB-002','NIYT-C-002004','NIYT-C-002005','NIYT-C-002006',
                         'NIYT-C-900101','NIYT-C-900102','NIYT-C-900103','NIYT-C-900104','NIYT-C-900105')
 ORDER BY c.name;
