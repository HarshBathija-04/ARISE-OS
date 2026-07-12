/**
 * POST /api/sync/:action  — the mobile offline-sync queue endpoint.
 *
 * Mirrors the three action types the mobile sync engine emits
 * (complete_mission, apply_boss_damage, purchase_reward). Because the mobile
 * game state is authoritative locally and mirrored via /api/state, these calls
 * are recorded as analytics activity and acknowledged. The endpoint preserves
 * the sync engine's contract: 2xx { ok:true } → VALIDATED, 4xx { ok:false } →
 * REVIEW, network/5xx → RETRY.
 */
import { requireBearer, jsonOk, jsonError, corsPreflight } from "@/lib/api-auth";
import { logActivity } from "@/lib/game-engine/service";

const ALLOWED = new Set(["complete_mission", "apply_boss_damage", "purchase_reward"]);

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const auth = await requireBearer(req);
  if ("error" in auth) return auth.error;

  const { action } = await ctx.params;
  if (!ALLOWED.has(action)) return jsonError(`Unknown action: ${action}`, 400);

  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    // sync actions may carry no body; that's fine.
  }

  await logActivity(auth.userId, `sync_${action}`, 1, payload);
  return jsonOk();
}
