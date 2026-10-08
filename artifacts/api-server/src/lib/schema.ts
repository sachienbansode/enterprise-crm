import { query } from "./db";

// Idempotent schema upgrades applied at every startup, so a deploy never needs a manual SQL step.
export async function ensureAppSchema() {
  const stmts = [
    // who created leads / deals
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by uuid",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by_name varchar(255)",
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS created_by uuid",
    "ALTER TABLE deals ADD COLUMN IF NOT EXISTS created_by_name varchar(255)",
    // documents can belong to a lead or a deal
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS lead_id uuid",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS deal_id uuid",
    "CREATE INDEX IF NOT EXISTS idx_documents_lead ON documents (lead_id)",
    "CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents (deal_id)",
    // comments on any record (lead, deal, …)
    `CREATE TABLE IF NOT EXISTS entity_comments (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       entity_type varchar(30) NOT NULL,
       entity_id uuid NOT NULL,
       user_id uuid,
       user_name varchar(255) NOT NULL,
       body text NOT NULL,
       created_at timestamptz DEFAULT now()
     )`,
    "CREATE INDEX IF NOT EXISTS idx_entity_comments ON entity_comments (entity_type, entity_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id)",
    // backfill "created by" from the audit trail where we have it
    `UPDATE leads l SET created_by_name = a.user_name
       FROM audit_logs a
      WHERE l.created_by_name IS NULL AND a.entity_type='lead' AND a.entity_id = l.id
        AND a.details='CREATE' AND a.user_name IS NOT NULL AND a.user_name <> 'System'`,
  ];
  for (const s of stmts) await query(s);
}
