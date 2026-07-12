/**
 * POST /api/timetable/study  → log a study session (awards XP).
 * Body: { blockId, subject, durationMinutes, deepWorkScore, distractions, notes?, missionLinked? }
 */
import { z } from "zod";
import { requireBearer, jsonOk, jsonError, corsPreflight } from "@/lib/api-auth";
import { logStudy } from "@/lib/game-engine/timetable-service";

const schema = z.object({
  blockId: z.string().min(1),
  subject: z.string().min(1).max(40),
  durationMinutes: z.number().int().min(0).max(600),
  deepWorkScore: z.number().int().min(1).max(10),
  distractions: z.number().int().min(0).max(200),
  notes: z.string().max(1000).optional(),
  missionLinked: z.string().max(120).optional(),
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
  if (!parsed.success) return jsonError("Invalid study payload");
  const res = await logStudy(auth.userId, parsed.data);
  return jsonOk(res);
}
