import { query } from "./db";

// Task trail: every change to a task (created, edited, rescheduled, completed with a comment, reopened, comment) is kept,
// so a task's full history can be shown and audited.
export type TaskEvent = "created" | "edited" | "rescheduled" | "completed" | "reopened" | "comment" | "reassigned";
export async function logTaskEvent(taskId: string, action: TaskEvent, by: { id?: string | null; name?: string | null }, o: { from?: any; to?: any; comment?: string | null } = {}) {
  const v = (x: any) => (x === undefined || x === null || x === "" ? null : String(x instanceof Date ? x.toISOString() : x).slice(0, 500));
  await query("INSERT INTO task_events (task_id, action, from_value, to_value, comment, by_id, by_name) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [taskId, action, v(o.from), v(o.to), o.comment ? String(o.comment).slice(0, 2000) : null, by.id || null, by.name || null]).catch(() => {});
}
