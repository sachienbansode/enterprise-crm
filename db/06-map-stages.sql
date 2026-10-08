-- Step 6: Map leads/deals from the old hard-coded stages to the configured pipeline stages
-- (after 04-schema-sync.sql seeded pipeline_stages). Safe to re-run — only old values change.
-- Server: bash scripts/db-migrate.sh db/06-map-stages.sql

-- ── Leads (stage = pipeline_stages.stage_id) ──────────────────────────────
UPDATE leads l SET stage = m.new_stage, updated_at = NOW()
FROM (VALUES
  ('Investment Banking','pitch','initial_meeting'), ('Investment Banking','nda','mandate_discussion'),
  ('Investment Banking','mandate','loi_signed'),    ('Investment Banking','dd','mandate_signed'),
  ('Investment Banking','docs','mandate_signed'),   ('Investment Banking','closure','won'),
  ('AIF','identified','prospect'),   ('AIF','called','pitch_deck_sent'), ('AIF','suitability','meeting_scheduled'),
  ('AIF','kyc','term_sheet'),        ('AIF','commitment','subscription_signed'), ('AIF','subscription','won'),
  ('Corporate Broking','identified','new'), ('Corporate Broking','qualified','qualification'),
  ('Corporate Broking','credit','proposal'), ('Corporate Broking','legal','negotiation'), ('Corporate Broking','live','won'),
  ('Institutional Equities','identified','prospect'), ('Institutional Equities','research','research_shared'),
  ('Institutional Equities','regulatory','empanelment'), ('Institutional Equities','trade','active_client'),
  ('Institutional Equities','active','active_client'),
  ('Retail Broking','interest','contacted'), ('Retail Broking','kyc','document_collection'),
  ('Retail Broking','docs','document_collection'), ('Retail Broking','demat','account_opening'),
  ('Retail Broking','opening','account_opening'), ('Retail Broking','traded','activated')
) AS m(vertical, old_stage, new_stage)
WHERE l.vertical = m.vertical AND l.stage = m.old_stage;

-- ── Deals (stage = pipeline_stages.label) ─────────────────────────────────
UPDATE deals d SET stage = m.new_stage, updated_at = NOW()
FROM (VALUES
  ('Investment Banking','Pitch','Active'), ('Investment Banking','Mandate','Active'),
  ('Investment Banking','Mandate Letter','Active'), ('Investment Banking','Mandate Signed','Due Diligence'),
  ('Investment Banking','DD','Due Diligence'), ('Investment Banking','Near Closure','Regulatory Filing'),
  ('AIF','Called','Capital Called'), ('AIF','Committed','Subscription Received'),
  ('AIF','First Close','Invested'), ('AIF','KYC','Active'), ('AIF','Suitability','Active'),
  ('Corporate Broking','Pending','Active'),
  ('Institutional Equities','In Discussion','Active'), ('Institutional Equities','Pending','Active')
) AS m(vertical, old_stage, new_stage)
WHERE d.vertical = m.vertical AND d.stage = m.old_stage;

-- ── Check: anything still not matching a configured stage? (should return 0 rows) ──
SELECT 'lead' AS entity, l.vertical, l.stage, count(*) FROM leads l
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages p WHERE p.entity='lead' AND p.stage_id=l.stage
  AND p.vertical = CASE l.vertical WHEN 'Retail Broking' THEN 'retail' WHEN 'Corporate Broking' THEN 'corporate'
    WHEN 'Investment Banking' THEN 'ib' WHEN 'AIF' THEN 'aif' WHEN 'Institutional Equities' THEN 'ie' END)
GROUP BY 1,2,3
UNION ALL
SELECT 'deal', d.vertical, d.stage, count(*) FROM deals d
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages p WHERE p.entity='deal' AND p.label=d.stage
  AND p.vertical = CASE d.vertical WHEN 'Retail Broking' THEN 'retail' WHEN 'Corporate Broking' THEN 'corporate'
    WHEN 'Investment Banking' THEN 'ib' WHEN 'AIF' THEN 'aif' WHEN 'Institutional Equities' THEN 'ie' END)
GROUP BY 1,2,3;
