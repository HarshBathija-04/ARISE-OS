/**
 * POST /api/timetable/state  → set a block's state for today.
 * Body: { blockId, state }  →  { ok, xpAwarded }
 */
import { z } from "zod";
import { requireBearer, jsonOk, jsonError, corsPreflight } from "@/lib/api-auth";
import { setBlockState } from "@/lib/game-engine/timetable-service";

const schema = z.object({
  blockId: z.string().min(1),
  state: z.enum([
    "UPCOMING", "ACTIVE", "COMPLETED", "MISSED",
    "SKIPPED", "PAUSED", "LATE", "FINISHED_EARLY",
  ]),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  const auth = await requireBearer(req);
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("blockId and valid state required");
  try {
    const res = await setBlockState(auth.userId, parsed.data.blockId, parsed.data.state);
    return jsonOk(res);
  } catch (e) {
    return jsonError((e as Error).message ?? "Failed", 400);
  }
}
