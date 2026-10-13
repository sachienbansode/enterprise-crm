-- 11-cards-stages-deal-kinds.sql — business-card scanning, contact page, deal kinds, stage workflow flags.
-- Optional: the API applies the same changes at startup. Safe to run more than once.
BEGIN;
-- Contacts (company_people): fields used by the contact page and card scanning
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS landline varchar(40);
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS city varchar(80);
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS source varchar(20) DEFAULT 'manual';
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS card_path text;
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS card_back_path text;
ALTER TABLE company_people ADD COLUMN IF NOT EXISTS created_by uuid;
-- Tasks can be linked to a contact
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS person_id uuid;
-- Deals: kind-specific details (IPO board, exchange, role, scheme…)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;
-- Stage workflow: one flag per stage (true = Skip allowed, false = Mandatory) + what was done/skipped per record
ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS skip_allowed boolean DEFAULT true;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_path jsonb DEFAULT '{}'::jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_path jsonb DEFAULT '{}'::jsonb;
COMMIT;

-- Example: make IB "Pitch" and "Mandate" mandatory (or use Admin → Pipeline Stages and click the flag)
-- UPDATE pipeline_stages SET skip_allowed = false WHERE entity = 'lead' AND vertical = 'ib' AND stage_id IN ('pitch', 'mandate');
