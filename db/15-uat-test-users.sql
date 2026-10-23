-- 15-uat-test-users.sql — UAT test users (app sign-in, not Microsoft 365), one per role
-- Run in pgAdmin → Query Tool on niytri_crm (as root_admin). Safe to run more than once:
-- re-running resets these users' password, role, vertical and status.
-- Password for every user below: User@12345   (MFA / OTP off so testers sign in directly)
-- To switch them off after UAT:  UPDATE users SET status = 'Inactive' WHERE email LIKE 'uat.%@niytri.com';

BEGIN;

WITH u(name, email, role, vertical, location) AS (VALUES
  ('Neha Joshi',          'uat.superadmin@niytri.com',  'Super Admin',        'All',                               'Mumbai'),
  ('Karan Malhotra',      'uat.ibadmin@niytri.com',     'IB Admin',           'Investment Banking',                'Mumbai'),
  ('Riya Sen',            'uat.ib.srm@niytri.com',      'Senior RM',          'Investment Banking',                'Mumbai'),
  ('Aditya Kulkarni',     'uat.ib.jrm@niytri.com',      'Junior RM',          'Investment Banking',                'Pune'),
  ('Manish Gupta',        'uat.retailadmin@niytri.com', 'Retail Admin',       'Retail Broking',                    'Mumbai'),
  ('Tanvi Shah',          'uat.retail.srm@niytri.com',  'Senior RM',          'Retail Broking',                    'Ahmedabad'),
  ('Faizan Qureshi',      'uat.retail.dealer@niytri.com','Dealer',            'Retail Broking',                    'Mumbai'),
  ('Vandana Rao',         'uat.corpadmin@niytri.com',   'Corporate Admin',    'Corporate Broking',                 'Bengaluru'),
  ('Harish Menon',        'uat.aifadmin@niytri.com',    'AIF Admin',          'AIF',                               'Mumbai'),
  ('Shreya Bhat',         'uat.ieadmin@niytri.com',     'IE Admin',           'Institutional Equities',            'Mumbai'),
  ('Varun Iyer',          'uat.ie.analyst@niytri.com',  'Research Analyst',   'Institutional Equities',            'Chennai'),
  ('Pallavi Deshpande',   'uat.cshead@niytri.com',      'CS Head',            'All',                               'Navi Mumbai'),
  ('Rakesh Yadav',        'uat.csagent@niytri.com',     'CS Agent',           'All',                               'Navi Mumbai'),
  ('Gauri Natarajan',     'uat.compliance@niytri.com',  'Compliance Officer', 'All',                               'Mumbai'),
  ('Sameer Kapoor',       'uat.bizhead@niytri.com',     'Business Head',      'Investment Banking, AIF',           'Mumbai')
), up AS (
  INSERT INTO users (name, email, password_hash, auth_type, role, vertical, status, mfa_enabled, location, created_at, updated_at)
  SELECT name, email, encode(sha256(convert_to('User@12345', 'UTF8')), 'hex'), 'app', role, vertical, 'Active', false, location, now(), now() FROM u
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, auth_type = 'app', role = EXCLUDED.role,
    vertical = EXCLUDED.vertical, status = 'Active', mfa_enabled = false, location = EXCLUDED.location, updated_at = now()
  RETURNING id, role
)
-- Role mapping (Admin → Role Mapping screen)
INSERT INTO user_role_mapping (user_id, role_id, assigned_by, assigned_at, is_active)
SELECT up.id, r.id, NULL, now(), true FROM up JOIN user_roles r ON r.role_name = up.role
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;

-- Give the test RMs their own records, so "Mine" views and owner checks have data
-- (moves a few open sample opportunities / deals / SRs in their vertical to them)
UPDATE leads SET assigned_rm_id = (SELECT id FROM users WHERE email = 'uat.ib.srm@niytri.com')
 WHERE id IN (SELECT id FROM leads WHERE vertical = 'Investment Banking' AND stage NOT IN ('closed', 'lost', 'deleted') ORDER BY lead_code LIMIT 3);
UPDATE leads SET assigned_rm_id = (SELECT id FROM users WHERE email = 'uat.ib.jrm@niytri.com')
 WHERE id IN (SELECT id FROM leads WHERE vertical = 'Investment Banking' AND stage NOT IN ('closed', 'lost', 'deleted') ORDER BY lead_code DESC LIMIT 2);
UPDATE leads SET assigned_rm_id = (SELECT id FROM users WHERE email = 'uat.retail.srm@niytri.com')
 WHERE id IN (SELECT id FROM leads WHERE vertical = 'Retail Broking' AND stage NOT IN ('activated', 'lost', 'deleted') ORDER BY lead_code LIMIT 3);
UPDATE deals SET rm_id = (SELECT id FROM users WHERE email = 'uat.ib.srm@niytri.com')
 WHERE id IN (SELECT id FROM deals WHERE vertical = 'Investment Banking' AND stage <> 'deleted' ORDER BY deal_code LIMIT 2);
UPDATE service_requests SET assigned_to = (SELECT id FROM users WHERE email = 'uat.csagent@niytri.com')
 WHERE id IN (SELECT id FROM service_requests WHERE status IN ('Open', 'In Progress') ORDER BY sr_code LIMIT 4);
UPDATE clients SET relationship_owner_id = (SELECT id FROM users WHERE email = 'uat.ib.srm@niytri.com')
 WHERE id IN (SELECT DISTINCT client_id FROM leads WHERE assigned_rm_id = (SELECT id FROM users WHERE email = 'uat.ib.srm@niytri.com') AND client_id IS NOT NULL);

COMMIT;

-- Check
SELECT u.name, u.email, u.role, u.vertical, u.auth_type, u.mfa_enabled, u.status,
       (SELECT count(*) FROM leads l WHERE l.assigned_rm_id = u.id) AS opportunities,
       (SELECT count(*) FROM service_requests s WHERE s.assigned_to = u.id) AS srs
  FROM users u WHERE u.email LIKE 'uat.%@niytri.com' ORDER BY u.role, u.email;
