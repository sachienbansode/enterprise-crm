import { query } from "./db";

// Stage workflow for leads and deals, driven by Admin → Pipeline Stages:
//   skip_allowed = false → Mandatory: a record can't move past this stage without going through it.
//   skip_allowed = true  → Skip allowed: the user may skip it, but only by confirming (never silently).
// What happened at each stage is kept on the record in stage_path: { <stage_id>: { s: "done" | "skipped", at, by } },
// so the stage summary shows skipped steps as "Skipped".

export const VERTICAL_ID: Record<string, string> = {
  "Retail Broking": "retail", "Corporate Broking": "corporate", "Investment Banking": "ib", "AIF": "aif", "Institutional Equities": "ie",
};

type Step = { stage_id: string; label: string; skip_allowed: boolean; is_won: boolean; is_lost: boolean };
export type FlowResult =
  | { ok: true; path: Record<string, any>; skipped: string[]; target?: string }
  | { ok: false; status: number; body: { error: string; code: string; stage?: string; skip?: { stage_id: string; label: string }[] } };

async function flowFor(entity: "lead" | "deal", verticalName: string): Promise<{ flow: Step[]; lost: Set<string> } | null> {
  const vid = VERTICAL_ID[verticalName] || verticalName;
  const r = await query(
    "SELECT stage_id, label, COALESCE(skip_allowed, true) AS skip_allowed, is_won, is_lost FROM pipeline_stages WHERE entity=$1 AND vertical=$2 AND is_active ORDER BY sort_order",
    [entity, vid]);
  if (!r.rows.length) return null;
  return { flow: r.rows.filter((s: Step) => !s.is_lost), lost: new Set(r.rows.filter((s: Step) => s.is_lost).map((s: Step) => s.stage_id)) };
}

/** Check a stage change and work out the new stage_path. prevStage = null when the record is being created. */
export async function checkStageMove(entity: "lead" | "deal", verticalName: string, prevStage: string | null, newStage: string,
  path: Record<string, any> | null, skipConfirmed: boolean, by: string): Promise<FlowResult> {
  const p: Record<string, any> = { ...(path || {}) };
  const f = await flowFor(entity, verticalName);
  if (!f || !newStage || newStage === prevStage) return { ok: true, path: p, skipped: [] };
  const { flow, lost } = f;
  const at = new Date().toISOString();
  if (lost.has(newStage)) return { ok: true, path: p, skipped: [] }; // Lost is off the flow — nothing is skipped

  const idx = (s: string | null) => (s ? flow.findIndex(x => x.stage_id === s) : -1);
  let iPrev = idx(prevStage);
  if (prevStage && iPrev === -1) {
    if (!lost.has(prevStage)) return { ok: true, path: p, skipped: [] }; // from an unmapped (legacy) stage: no checks
    // Re-opened from Lost: carry on from the furthest stage already walked
    iPrev = Math.max(-1, ...flow.map((x, i) => (p[x.stage_id] ? i : -1)));
  }
  const iNew = idx(newStage);
  if (iNew === -1) return { ok: true, path: p, skipped: [] }; // unmapped target stage: leave the path alone

  if (iNew <= iPrev) {
    // Moving back: the stages from the target onwards will be walked again
    for (let i = iNew; i < flow.length; i++) delete p[flow[i].stage_id];
    return { ok: true, path: p, skipped: [] };
  }
  const between = flow.slice(iPrev + 1, iNew).filter(x => !p[x.stage_id]);
  const mandatory = between.find(x => !x.skip_allowed);
  if (mandatory) {
    return { ok: false, status: 400, body: { error: `"${mandatory.label}" is a mandatory stage — move to it first.`, code: "STAGE_MANDATORY", stage: mandatory.stage_id } };
  }
  if (between.length && !skipConfirmed) {
    return { ok: false, status: 409, body: { error: `This skips ${between.map(x => x.label).join(", ")}.`, code: "CONFIRM_SKIP", skip: between.map(x => ({ stage_id: x.stage_id, label: x.label })) } };
  }
  if (prevStage && iPrev >= 0 && flow[iPrev].stage_id === prevStage && !p[prevStage]) p[prevStage] = { s: "done", at, by };
  for (const x of between) p[x.stage_id] = { s: "skipped", at, by };
  return { ok: true, path: p, skipped: between.map(x => x.label), target: flow[iNew].label };
}

/** Optional record-history line so the timeline shows what was skipped and by whom. */
export async function noteSkipped(entity: "lead" | "deal", id: string, user: any, skipped: string[], target: string) {
  if (!skipped.length) return;
  await query("INSERT INTO entity_comments (entity_type, entity_id, user_id, user_name, body) VALUES ($1,$2,$3,$4,$5)",
    [entity, id, user?.id || null, user?.name || "System", `Skipped ${skipped.join(", ")} → moved to ${target}`]).catch(() => {});
}
