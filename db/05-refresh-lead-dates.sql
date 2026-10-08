-- Step 5 (optional, UAT data only): spread lead dates randomly over the last 1–45 days
-- pgAdmin: Query Tool on "niytri_crm" as root_admin -> run (F5)
-- Server: bash scripts/db-migrate.sh db/05-refresh-lead-dates.sql


UPDATE leads
SET opened_at = NOW() - (random() * 44 + 1) * INTERVAL '1 day';

UPDATE leads
SET created_at = opened_at,
    updated_at = opened_at + random() * (NOW() - opened_at),
    closed_at  = CASE WHEN closed_at IS NOT NULL
                      THEN opened_at + random() * (NOW() - opened_at)
                 END;

SELECT lead_code, name, stage, opened_at::date AS opened,
       EXTRACT(DAY FROM NOW() - opened_at)::int AS days_open
FROM leads ORDER BY opened_at DESC;

