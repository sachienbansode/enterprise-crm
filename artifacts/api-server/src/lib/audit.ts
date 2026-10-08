import { query } from "./db";

interface AuditParams {
  entityType: string;
  entityId: string;
  entityCode?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  recordDisplay?: string | null;
  ipAddress?: string | null;
}

function computeChangedFields(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
): string[] {
  if (!before || !after) return [];
  const skip = new Set(["updated_at", "created_at"]);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (skip.has(k)) continue;
    const bv = JSON.stringify(before[k] ?? null);
    const av = JSON.stringify(after[k] ?? null);
    if (bv !== av) changed.push(k);
  }
  return changed;
}

export async function logAudit(p: AuditParams): Promise<void> {
  try {
    const changedFields =
      p.action === "UPDATE"
        ? computeChangedFields(p.before, p.after)
        : p.action === "CREATE"
          ? Object.keys(p.after || {})
          : [];

    const label =
      p.action === "CREATE"
        ? `${p.entityType} Created`
        : p.action === "DELETE"
          ? `${p.entityType} Deleted`
          : `${p.entityType} Updated`;

    await query(
      `INSERT INTO audit_logs
        (entity_type, entity_id, entity_code, user_id, user_name, user_role, action, details,
         old_value, new_value, changed_fields, record_display, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        p.entityType,
        p.entityId,
        p.entityCode || null,
        p.userId || null,
        p.userName || "System",
        p.userRole || null,
        label,
        p.action,
        p.before ? JSON.stringify(p.before) : null,
        p.after ? JSON.stringify(p.after) : null,
        changedFields.length ? JSON.stringify(changedFields) : null,
        p.recordDisplay || null,
        p.ipAddress || null,
      ],
    );
  } catch {
    // audit failure should never break the main request
  }
}
