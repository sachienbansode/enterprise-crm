-- 14-sample-all-pages.sql — sample records on every page + realistic pipeline (total ≤ ₹4,000 Cr)
-- Run in pgAdmin → Query Tool on niytri_crm (as root_admin). Safe to run more than once:
--   • fills gaps only (a stage / page that already has records is left alone)
--   • re-sizes opportunity and deal amounts so the whole pipeline stays under ₹4,000 Cr
--     (opportunities ≈ ₹2,800 Cr + deals ≈ ₹1,000 Cr), split by vertical; notes after the
--     amount ("Cat III", "block", …) are kept. Same result on every run.
-- Sample rows are marked "Sample data" in notes / source so they are easy to find or remove.

BEGIN;

DO $$
DECLARE
  v_ids    text[] := ARRAY['retail','corporate','ib','aif','ie'];
  v_names  text[] := ARRAY['Retail Broking','Corporate Broking','Investment Banking','AIF','Institutional Equities'];
  l_pref   text[] := ARRAY['RB','CB','IB','AIF','IE'];
  c_pref   text[] := ARRAY['NIT-RB','NIT-CB','NIT-IB','NIT-AIF','NIT-IE'];
  lead_pool text[][] := ARRAY[
    ARRAY['Kavya Iyer','Rohan Desai','Sneha Kulkarni','Vivek Menon','Farhan Shaikh','Pooja Bansal','Nikhil Joshi','Lata Raghavan','Siddharth Rao','Meghna Pillai'],
    ARRAY['Blue Star Ltd — Block','Cipla Treasury — Bulk','Dabur India — Buyback','Escorts Kubota — Block','Thermax — Clearing','Voltas — Bulk','Apollo Tyres — Block','Torrent Power — Clearing','Havells — Block','Marico — Bulk'],
    ARRAY['Orbit Agritech — SME IPO','Coastal Shipyards — QIP','Nova Textiles — Rights Issue','Prism Pharma — Pre-IPO','Zenith Cables — OFS','Harbor Foods — Sell-side M&A','Lumen Renewables — InvIT','Crescent Hospitals — PE','Atlas Logistics — NCD','Vertex Chemicals — IPO'],
    ARRAY['Mehta Family Office — Cat II','Kapoor Holdings — Cat III','Shah Charitable Trust — Cat I','Jain Investments LLP — Cat II','Reddy Family Office — Cat III','Bose Family Trust — Cat II','Malhotra Ventures — Cat I','Ghosh Family Office — Cat III','Kulkarni Trust — Cat II','Batra Holdings — Cat III'],
    ARRAY['Kotak Mahindra AMC','Nippon India MF','Axis Mutual Fund','HSBC Global Asset Mgmt','Mirae Asset MF','Franklin Templeton India','DSP Mutual Fund','Aditya Birla Sun Life AMC','Canara Robeco MF','Invesco India MF']];
  deal_pool text[][] := ARRAY[
    ARRAY['Kavya Iyer — PMS','Rohan Desai — IPO Application','Sneha Kulkarni — SIP Book','Vivek Menon — Bonds','Farhan Shaikh — MF Switch','Pooja Bansal — PMS','Nikhil Joshi — NCD','Lata Raghavan — IPO Application'],
    ARRAY['Blue Star — Block Trade','Cipla — Bulk Deal','Dabur — Buyback Desk','Escorts — Block Trade','Thermax — Clearing','Voltas — Bulk Deal','Apollo Tyres — Block','Havells — Block Trade'],
    ARRAY['Orbit Agritech IPO Mandate','Coastal Shipyards QIP Mandate','Nova Textiles Rights Mandate','Prism Pharma Pre-IPO Mandate','Zenith Cables OFS Mandate','Harbor Foods M&A Mandate','Lumen InvIT Mandate','Atlas Logistics NCD Mandate'],
    ARRAY['Mehta FO — Cat II Fund I','Kapoor — Cat III Long-Short','Shah Trust — Cat I Venture','Jain LLP — Cat II Credit','Reddy FO — Cat III','Bose Trust — Cat II Real Estate','Malhotra — Cat I SME','Ghosh FO — Cat III'],
    ARRAY['Kotak AMC — Research Mandate','Nippon MF — Block Execution','Axis MF — Algo Desk','HSBC AM — Research','Mirae MF — Block Execution','Franklin — Program Trades','DSP MF — Research','ABSL AMC — Block Execution']];
  i int; j int; k int; n int; v text; vid text; vname text; rm uuid; cli uuid; st record; code text; nm text;
  sr_cats text[][] := ARRAY[ARRAY['Account Closure','Processing'],ARRAY['Trade Dispute','Escalation'],ARRAY['Nominee Change','Advisory'],ARRAY['Statement Request','Processing'],ARRAY['Margin Call','Escalation'],ARRAY['Corporate Action','Process Query'],ARRAY['Pledge Request','Documentation'],ARRAY['Settlement Dispute','Verification']];
  sr_status text[] := ARRAY['Open','In Progress','Escalated','Resolved','Closed','Open','In Progress','Resolved'];
  prio text[] := ARRAY['Low','Medium','High','Critical'];
  channels text[] := ARRAY['Email','Portal','Chat','WhatsApp','Branch','Phone'];
  doc_types text[] := ARRAY['KYC Document','Trade Confirmation','Information Memo','Compliance Document','Billing Statement','Power of Attorney'];
  total numeric; f numeric; maxn int;
BEGIN
  FOR i IN 1..5 LOOP
    vid := v_ids[i]; vname := v_names[i];

    -- RM for this vertical (falls back to any active user)
    SELECT id INTO rm FROM users WHERE status = 'Active' AND vertical = vname ORDER BY (role ILIKE '%rm%') DESC, name LIMIT 1;
    IF rm IS NULL THEN SELECT id INTO rm FROM users WHERE status = 'Active' ORDER BY (role ILIKE '%admin%'), name LIMIT 1; END IF;

    -- ── Clients: at least 6 per vertical ─────────────────────────────────────
    SELECT count(*) INTO n FROM client_verticals WHERE vertical = vid;
    FOR k IN (n + 1)..6 LOOP
      SELECT coalesce(max(NULLIF(regexp_replace(client_code, '\D', '', 'g'), '')::int), 0) + 1 INTO maxn FROM clients WHERE client_code LIKE c_pref[i] || '-S%';
      code := c_pref[i] || '-S' || lpad(maxn::text, 3, '0');
      nm := CASE WHEN i IN (1) THEN lead_pool[i][k] ELSE split_part(lead_pool[i][k], ' — ', 1) END;
      INSERT INTO clients (client_code, name, type, category, mobile, email, rm_id, status, kyc_status, risk_profile, notes, sector)
      VALUES (code, nm, CASE WHEN i = 1 THEN 'Individual' ELSE 'Non-Individual' END, vname,
             '98' || lpad((10000000 + k * 7919 + i * 131)::text, 8, '0'),
             lower(regexp_replace(nm, '[^A-Za-z]+', '.', 'g')) || '@example.in', rm, 'Active',
             (ARRAY['Verified','Verified','Pending','Expired'])[1 + k % 4], (ARRAY['Moderate','Aggressive','Conservative'])[1 + k % 3],
             'Sample data', CASE WHEN i = 3 THEN (ARRAY['Chemicals','Healthcare & Pharma','Infrastructure','Real Estate','Energy & Power','Agri & Food'])[1 + k % 6] END)
      RETURNING id INTO cli;
      INSERT INTO client_verticals (client_id, vertical, activated_at) VALUES (cli, vid, now() - (k || ' months')::interval) ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── Opportunities / leads: one in every active stage, at least 8 per vertical ──
    k := 0;
    FOR st IN SELECT stage_id, is_won, is_lost, sort_order FROM pipeline_stages WHERE entity = 'lead' AND vertical = vid AND is_active ORDER BY sort_order LOOP
      k := k + 1;
      SELECT count(*) INTO n FROM leads WHERE vertical = vname AND stage = st.stage_id;
      IF n = 0 THEN
        SELECT coalesce(max(NULLIF(regexp_replace(lead_code, '\D', '', 'g'), '')::int), 0) + 1 INTO maxn FROM leads WHERE lead_code LIKE l_pref[i] || '-%';
        SELECT c.id INTO cli FROM clients c JOIN client_verticals cv ON cv.client_id = c.id AND cv.vertical = vid ORDER BY md5(c.id::text || k) LIMIT 1;
        INSERT INTO leads (lead_code, name, vertical, stage, priority, value_estimate, source, assigned_rm_id, client_id, status, opened_at, closed_at, notes,
                           opportunity_type, next_action, next_action_date, expected_fee, probability, lost_reason, lost_comment, expected_close, created_by_name)
        VALUES (l_pref[i] || '-' || lpad(maxn::text, 4, '0'), lead_pool[i][1 + (k - 1) % 10], vname, st.stage_id, prio[1 + k % 4], '₹1 Cr',
                (ARRAY['Referral','Existing Client','Event / Conference','Research','Website','Cold Call'])[1 + k % 6], rm, cli,
                CASE WHEN st.is_won THEN 'Won' WHEN st.is_lost THEN 'Lost' ELSE 'Active' END,
                now() - ((10 + k * 6) || ' days')::interval, CASE WHEN st.is_won OR st.is_lost THEN now() - (k || ' days')::interval END, 'Sample data',
                CASE WHEN i = 3 THEN (ARRAY['IPO','QIP','Rights Issue','Pre-IPO','OFS','M&A','InvIT','PE','Debt Raising','IPO'])[1 + (k - 1) % 10] END,
                CASE WHEN st.is_won OR st.is_lost THEN NULL ELSE (ARRAY['Intro call with promoter','Share credentials deck','Send fee proposal','Meeting with CFO','Collect KYC documents','Follow up on term sheet'])[1 + k % 6] END,
                CASE WHEN st.is_won OR st.is_lost THEN NULL ELSE (current_date + ((k % 9) - 3))::date END,
                CASE WHEN i = 3 THEN 1 END, NULL,
                CASE WHEN st.is_lost THEN 'Lost to competitor' END,
                CASE WHEN st.is_lost THEN 'Client chose another banker on fees (sample data).' END,
                (current_date + (30 + k * 10))::date, 'Sample data');
      END IF;
    END LOOP;
    SELECT count(*) INTO n FROM leads WHERE vertical = vname AND stage <> 'deleted';
    FOR k IN (n + 1)..8 LOOP
      SELECT stage_id INTO code FROM pipeline_stages WHERE entity = 'lead' AND vertical = vid AND is_active AND NOT is_won AND NOT is_lost ORDER BY sort_order OFFSET (k % 3) LIMIT 1;
      SELECT coalesce(max(NULLIF(regexp_replace(lead_code, '\D', '', 'g'), '')::int), 0) + 1 INTO maxn FROM leads WHERE lead_code LIKE l_pref[i] || '-%';
      INSERT INTO leads (lead_code, name, vertical, stage, priority, value_estimate, source, assigned_rm_id, status, opened_at, notes, next_action, next_action_date, created_by_name)
      VALUES (l_pref[i] || '-' || lpad(maxn::text, 4, '0'), lead_pool[i][1 + (k + 4) % 10], vname, code, prio[1 + k % 4], '₹1 Cr', 'Referral', rm, 'Active',
              now() - ((5 + k * 4) || ' days')::interval, 'Sample data', 'Follow-up call', (current_date + (k % 7))::date, 'Sample data');
    END LOOP;

    -- ── Deals / mandates: one in every deal stage, at least 6 per vertical ──
    k := 0;
    FOR st IN SELECT stage_id, label FROM pipeline_stages WHERE entity = 'deal' AND vertical = vid AND is_active ORDER BY sort_order LOOP
      k := k + 1;
      IF NOT EXISTS (SELECT 1 FROM deals WHERE vertical = vname AND stage IN (st.stage_id, st.label)) THEN
        SELECT coalesce(max(NULLIF(regexp_replace(deal_code, '\D', '', 'g'), '')::int), 0) + 1 INTO maxn FROM deals WHERE deal_code LIKE l_pref[i] || '-D%';
        SELECT c.id INTO cli FROM clients c JOIN client_verticals cv ON cv.client_id = c.id AND cv.vertical = vid ORDER BY md5(c.id::text || 'd' || k) LIMIT 1;
        INSERT INTO deals (deal_code, name, vertical, type, value, stage, client_id, rm_id, deal_date, notes, expected_close, created_by_name)
        VALUES (l_pref[i] || '-D' || lpad(maxn::text, 3, '0'), deal_pool[i][1 + (k - 1) % 8], vname,
                (ARRAY['IPO','QIP','Rights Issue','Block Trade','Bulk Deal','PMS','Fund Subscription','Research Mandate'])[1 + (i + k) % 8],
                '₹1 Cr', st.label, cli, rm, (current_date - (k * 12))::date, 'Sample data', (current_date + (k * 20))::date, 'Sample data');
      END IF;
    END LOOP;
    SELECT count(*) INTO n FROM deals WHERE vertical = vname AND stage <> 'deleted';
    FOR k IN (n + 1)..6 LOOP
      SELECT coalesce(max(NULLIF(regexp_replace(deal_code, '\D', '', 'g'), '')::int), 0) + 1 INTO maxn FROM deals WHERE deal_code LIKE l_pref[i] || '-D%';
      INSERT INTO deals (deal_code, name, vertical, type, value, stage, rm_id, deal_date, notes, created_by_name)
      VALUES (l_pref[i] || '-D' || lpad(maxn::text, 3, '0'), deal_pool[i][1 + (k + 3) % 8], vname, 'Mandate', '₹1 Cr', 'Active', rm, (current_date - k * 9)::date, 'Sample data', 'Sample data');
    END LOOP;

    -- ── Service requests: at least 8 per vertical, mixed statuses ──
    SELECT count(*) INTO n FROM service_requests WHERE vertical = vname;
    FOR k IN (n + 1)..8 LOOP
      SELECT coalesce(max(NULLIF(regexp_replace(sr_code, '\D', '', 'g'), '')::bigint), 0) % 1000000 + 1 INTO maxn FROM service_requests WHERE sr_code LIKE 'SR-S%';
      SELECT c.id INTO cli FROM clients c JOIN client_verticals cv ON cv.client_id = c.id AND cv.vertical = vid ORDER BY md5(c.id::text || 's' || k) LIMIT 1;
      INSERT INTO service_requests (sr_code, subject, description, category, subcategory, channel, priority, status, sla_deadline, client_id, vertical, created_by, assigned_to, created_at, updated_at, resolved_at)
      VALUES ('SR-S' || lpad(maxn::text, 4, '0'),
              (ARRAY['Contract note not received','Dividend not credited','Nominee update request','Statement for FY26 needed','Margin shortfall query','Bonus shares not reflected','Pledge release pending','Trade settlement mismatch'])[k],
              'Sample data — raised by the client.', sr_cats[k][1], sr_cats[k][2], channels[1 + k % 6], prio[1 + k % 4], sr_status[k],
              now() + ((k * 7 - 20) || ' hours')::interval, cli, vname, rm, CASE WHEN k % 3 = 0 THEN NULL ELSE rm END,
              now() - ((k * 9) || ' hours')::interval, now() - ((k * 3) || ' hours')::interval,
              CASE WHEN sr_status[k] IN ('Resolved','Closed') THEN now() - ((k * 2) || ' hours')::interval END);
    END LOOP;

    -- ── Documents: at least 4 per vertical ──
    SELECT count(*) INTO n FROM documents WHERE vertical = vname;
    FOR k IN (n + 1)..4 LOOP
      SELECT coalesce(max(NULLIF(regexp_replace(doc_code, '\D', '', 'g'), '')::int), 0) + 1 INTO maxn FROM documents WHERE doc_code LIKE 'DOC-%';
      SELECT c.id INTO cli FROM clients c JOIN client_verticals cv ON cv.client_id = c.id AND cv.vertical = vid ORDER BY md5(c.id::text || 'doc' || k) LIMIT 1;
      INSERT INTO documents (doc_code, name, type, client_id, vertical, status, current_version, s3_key, created_by, created_at, updated_at)
      VALUES ('DOC-' || lpad(maxn::text, 4, '0'), replace(doc_types[1 + (i + k) % 6], ' ', '_') || '_' || l_pref[i] || '_' || k || '.pdf', doc_types[1 + (i + k) % 6], cli, vname,
              CASE WHEN k = 4 THEN 'Pending' ELSE 'Active' END, 'v1.0', 'sample/' || l_pref[i] || '/' || k || '.pdf', rm, now() - (k || ' days')::interval, now() - (k || ' days')::interval);
    END LOOP;
  END LOOP;

  -- Document history: a v1.0 entry for any document without one
  INSERT INTO document_versions (document_id, version, s3_key, size_bytes, uploader_name, note, created_at)
  SELECT d.id, coalesce(d.current_version, 'v1.0'), coalesce(d.s3_key, 'sample/' || d.doc_code || '.pdf'), 180000 + (abs(hashtext(d.id::text)) % 900000), 'Sample data', 'Initial upload', d.created_at
    FROM documents d WHERE NOT EXISTS (SELECT 1 FROM document_versions x WHERE x.document_id = d.id);

  -- SR conversation: two messages on SRs that have none
  INSERT INTO sr_messages (sr_id, sender_name, from_type, message, created_at)
  SELECT s.id, 'Client', 'client', 'Hello, please look into this — ' || lower(s.subject) || '.', s.created_at + interval '5 minutes'
    FROM service_requests s WHERE NOT EXISTS (SELECT 1 FROM sr_messages m WHERE m.sr_id = s.id);
  INSERT INTO sr_messages (sr_id, sender_id, sender_name, from_type, message, created_at)
  SELECT s.id, u.id, u.name, 'agent', 'Thank you. We have taken this up and will update you shortly.', s.created_at + interval '40 minutes'
    FROM service_requests s LEFT JOIN users u ON u.id = coalesce(s.assigned_to, s.created_by)
   WHERE (SELECT count(*) FROM sr_messages m WHERE m.sr_id = s.id) = 1;

  -- Activity timeline: one logged call on every open opportunity without any activity
  INSERT INTO interactions (type, occurred_at, client_id, lead_id, vertical, title, summary, source, created_by, created_by_name, next_follow_up)
  SELECT 'Call', now() - ((abs(hashtext(l.id::text)) % 10 + 1) || ' days')::interval, l.client_id, l.id, l.vertical,
         'Call — ' || l.name, 'Discussed requirement and timelines; client asked for a proposal. (Sample data)', 'manual',
         l.assigned_rm_id, coalesce(u.name, 'Sample data'), l.next_action_date
    FROM leads l LEFT JOIN users u ON u.id = l.assigned_rm_id
    JOIN pipeline_stages ps ON ps.entity = 'lead' AND ps.stage_id = l.stage
         AND ps.vertical = (ARRAY['retail','corporate','ib','aif','ie'])[array_position(ARRAY['Retail Broking','Corporate Broking','Investment Banking','AIF','Institutional Equities']::text[], l.vertical::text)]
   WHERE NOT ps.is_won AND NOT ps.is_lost AND NOT EXISTS (SELECT 1 FROM interactions x WHERE x.lead_id = l.id);

  -- Tasks: one open task on every open opportunity with a next action but no task
  INSERT INTO tasks (title, due_date, priority, status, owner_id, owner_name, client_id, lead_id, vertical, created_by_name)
  SELECT l.next_action, coalesce(l.next_action_date, current_date + 3), coalesce(l.priority, 'Medium'), 'Open', l.assigned_rm_id, u.name, l.client_id, l.id, l.vertical, 'Sample data'
    FROM leads l LEFT JOIN users u ON u.id = l.assigned_rm_id
   WHERE l.next_action IS NOT NULL AND l.stage <> 'deleted' AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.lead_id = l.id);

  -- Recordings page: one transcribed Teams meeting per vertical that has none
  INSERT INTO meetings (source, title, client_id, lead_id, vertical, organizer_id, organizer_name, start_at, end_at, duration_sec, status, transcript_source, attendees, segments, summary, created_by, created_by_name, created_at, updated_at)
  SELECT 'teams', 'Review call — ' || l.name, l.client_id, l.id, l.vertical, l.assigned_rm_id, u.name,
         now() - interval '3 days', now() - interval '3 days' + interval '25 minutes', 1500, 'transcribed', 'teams',
         jsonb_build_array(jsonb_build_object('kind', 'user', 'id', u.id, 'key', 'user:' || u.id, 'name', u.name)),
         jsonb_build_array(jsonb_build_object('s', coalesce(u.name, 'RM'), 't0', 1, 't1', 6, 'text', 'Thanks for joining. Shall we go over the proposal?'),
                           jsonb_build_object('s', 'Client', 't0', 7, 't1', 15, 'text', 'Yes. We are comfortable with the structure; please share the final terms.')),
         jsonb_build_object('title', 'Review call — ' || l.name, 'summary', 'Client is comfortable with the proposal and asked for final terms. (Sample data)',
                            'key_points', jsonb_build_array('Structure agreed in principle', 'Final terms to be shared'),
                            'decisions', jsonb_build_array('Proceed with proposal'), 'action_items', jsonb_build_array(jsonb_build_object('title', 'Share final terms', 'owner', u.name))),
         l.assigned_rm_id, coalesce(u.name, 'Sample data'), now() - interval '3 days', now() - interval '3 days'
    FROM (SELECT DISTINCT ON (vertical) * FROM leads WHERE stage <> 'deleted' ORDER BY vertical, opened_at DESC) l
    LEFT JOIN users u ON u.id = l.assigned_rm_id
   WHERE NOT EXISTS (SELECT 1 FROM meetings m WHERE m.vertical = l.vertical);

  -- Notifications: three for every active user with fewer than three
  INSERT INTO notifications (user_id, type, title, body, read, created_at)
  SELECT u.id, x.type, x.title, x.body, x.rd, now() - x.ago
    FROM users u CROSS JOIN (VALUES
      ('task_due', 'Task due today', 'Follow up with the client on the proposal. (Sample data)', false, interval '2 hours'),
      ('sr_assigned', 'Service request assigned to you', 'A new service request needs your attention. (Sample data)', false, interval '1 day'),
      ('meeting_summary', 'Meeting summary ready', 'The summary and action items from your last meeting are ready. (Sample data)', true, interval '3 days')) AS x(type, title, body, rd, ago)
   WHERE u.status = 'Active' AND (SELECT count(*) FROM notifications n WHERE n.user_id = u.id) < 3;

  -- ── Re-size the pipeline: opportunities ≈ ₹2,800 Cr, deals ≈ ₹1,000 Cr (whole pipeline < ₹4,000 Cr) ──
  -- Share by vertical; within a vertical each record gets a stable weight, then a round figure.
  CREATE TEMP TABLE _share (vertical text PRIMARY KEY, pct numeric) ON COMMIT DROP;
  INSERT INTO _share VALUES ('Investment Banking', .52), ('Institutional Equities', .20), ('Corporate Broking', .13), ('AIF', .13), ('Retail Broking', .02);

  CREATE TEMP TABLE _amt ON COMMIT DROP AS
  WITH b AS (
    SELECT l.id, l.vertical, l.value_estimate AS old,
           0.4 + 1.2 * (('x' || substr(md5(l.id::text || 'w'), 1, 7))::bit(28)::int / 268435455.0) AS w
      FROM leads l WHERE l.stage <> 'deleted'
  ), s AS (SELECT sum(pct) AS tot FROM _share WHERE vertical IN (SELECT DISTINCT vertical FROM b))
  SELECT b.id, b.old, 28000000000 * coalesce(sh.pct, .05) / (SELECT tot FROM s) * b.w / sum(b.w) OVER (PARTITION BY b.vertical) AS r
    FROM b LEFT JOIN _share sh ON sh.vertical = b.vertical;

  UPDATE leads l SET
    value_estimate = (
      CASE WHEN x.rr >= 10000000 THEN '₹' || trim(trailing '.' FROM to_char(x.rr / 10000000, 'FM999990.99')) || ' Cr'
           ELSE '₹' || trim(trailing '.' FROM to_char(x.rr / 100000, 'FM999990.99')) || ' L' END)
      || CASE WHEN x.note <> '' THEN ' ' || x.note ELSE '' END,
    expected_fee = CASE WHEN l.expected_fee IS NOT NULL OR l.vertical = 'Investment Banking'
                        THEN round(x.rr * (0.01 + 0.015 * (('x' || substr(md5(l.id::text || 'f'), 1, 7))::bit(28)::int / 268435455.0)) / 100000) * 100000 END,
    updated_at = now()
  FROM (SELECT id,
               CASE WHEN r >= 1e9 THEN round(r / 1e8) * 1e8      -- ≥ ₹100 Cr → nearest ₹10 Cr
                    WHEN r >= 1e8 THEN round(r / 1e7) * 1e7      -- ≥ ₹10 Cr  → nearest ₹1 Cr
                    WHEN r >= 1e7 THEN round(r / 5e6) * 5e6      -- ≥ ₹1 Cr   → nearest ₹0.5 Cr
                    ELSE greatest(round(r / 1e5), 1) * 1e5 END AS rr,
               trim(regexp_replace(coalesce(old, ''), '^\s*[+-]?\s*₹?\s*[0-9.,]+\s*(crores?|cr|lakhs?|lacs?|l|mn|million|m|k)?\M', '', 'i')) AS note
          FROM _amt) x
  WHERE x.id = l.id;

  CREATE TEMP TABLE _damt ON COMMIT DROP AS
  WITH b AS (
    SELECT d.id, d.vertical, d.value AS old,
           0.4 + 1.2 * (('x' || substr(md5(d.id::text || 'w'), 1, 7))::bit(28)::int / 268435455.0) AS w
      FROM deals d WHERE d.stage <> 'deleted'
  ), s AS (SELECT sum(pct) AS tot FROM _share WHERE vertical IN (SELECT DISTINCT vertical FROM b))
  SELECT b.id, b.old, 10000000000 * coalesce(sh.pct, .05) / (SELECT tot FROM s) * b.w / sum(b.w) OVER (PARTITION BY b.vertical) AS r
    FROM b LEFT JOIN _share sh ON sh.vertical = b.vertical;

  UPDATE deals d SET
    value = (CASE WHEN x.rr >= 10000000 THEN '₹' || trim(trailing '.' FROM to_char(x.rr / 10000000, 'FM999990.99')) || ' Cr'
                  ELSE '₹' || trim(trailing '.' FROM to_char(x.rr / 100000, 'FM999990.99')) || ' L' END)
            || CASE WHEN x.note <> '' THEN ' ' || x.note ELSE '' END,
    updated_at = now()
  FROM (SELECT id,
               CASE WHEN r >= 1e9 THEN round(r / 1e8) * 1e8 WHEN r >= 1e8 THEN round(r / 1e7) * 1e7
                    WHEN r >= 1e7 THEN round(r / 5e6) * 5e6 ELSE greatest(round(r / 1e5), 1) * 1e5 END AS rr,
               trim(regexp_replace(coalesce(old, ''), '^\s*[+-]?\s*₹?\s*[0-9.,]+\s*(crores?|cr|lakhs?|lacs?|l|mn|million|m|k)?\M', '', 'i')) AS note
          FROM _damt) x
  WHERE x.id = d.id;
END $$;

COMMIT;

-- ── Check: pipeline in ₹ Cr by vertical (total must be under 4,000) ──
WITH v AS (
  SELECT 'Opportunities' AS kind, vertical, value_estimate AS val FROM leads WHERE stage <> 'deleted'
  UNION ALL SELECT 'Deals', vertical, value FROM deals WHERE stage <> 'deleted'
), p AS (
  SELECT kind, vertical,
         (regexp_match(replace(val, ',', ''), '([0-9.]+)\s*(Cr|L)'))[1]::numeric
         * CASE (regexp_match(replace(val, ',', ''), '([0-9.]+)\s*(Cr|L)'))[2] WHEN 'Cr' THEN 1 ELSE 0.01 END AS cr
    FROM v
)
SELECT coalesce(kind, 'ALL') AS kind, coalesce(vertical, '— total —') AS vertical, count(*) AS records, round(sum(cr), 1) AS value_cr
  FROM p GROUP BY ROLLUP (kind, vertical) ORDER BY kind NULLS LAST, vertical NULLS LAST;
