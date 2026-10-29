-- 16-convert-link-closed-status.sql — UAT fixes (NC-04, NC-22..25)
-- Optional: the API applies the same at startup. Safe to run more than once.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_id uuid;          -- deal ↔ opportunity link (Convert to Deal)
CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals (lead_id);

-- Won / Lost opportunities: status follows the stage, no live next action, close date set
UPDATE leads l SET status = CASE WHEN ps.is_won THEN 'Won' ELSE 'Lost' END, next_action = NULL, next_action_date = NULL,
       closed_at = COALESCE(l.closed_at, l.updated_at, NOW())
  FROM pipeline_stages ps
 WHERE ps.entity = 'lead' AND ps.stage_id = l.stage AND (ps.is_won OR ps.is_lost)
   AND ps.vertical = (CASE l.vertical WHEN 'Retail Broking' THEN 'retail' WHEN 'Corporate Broking' THEN 'corporate' WHEN 'Investment Banking' THEN 'ib' WHEN 'AIF' THEN 'aif' ELSE 'ie' END)
   AND (l.status NOT IN ('Won','Lost') OR l.next_action IS NOT NULL OR l.closed_at IS NULL);

-- Their open tasks are closed
UPDATE tasks t SET status = 'Done', completed_at = NOW() FROM leads l WHERE t.lead_id = l.id AND t.status = 'Open' AND l.status IN ('Won','Lost');

-- Link deals converted earlier from their note "Converted from lead IB-xxxx" (UAT tests)
UPDATE deals d SET lead_id = l.id, client_id = COALESCE(d.client_id, l.client_id), rm_id = COALESCE(d.rm_id, l.assigned_rm_id),
       expected_close = COALESCE(d.expected_close, l.expected_close)
  FROM leads l
 WHERE d.lead_id IS NULL AND d.notes ~ ('Converted from (lead|opportunity) ' || l.lead_code || '\M');

SELECT stage, status, count(*) FROM leads GROUP BY 1, 2 ORDER BY 1;
