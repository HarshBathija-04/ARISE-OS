/**
 * GET  /api/timetable  → { ok, blocks, states }  (seeds defaults on first use)
 * PUT  /api/timetable  → replace the whole schedule; body { blocks: BlockInput[] }
 */
import { z } from "zod";
import {
  requireBearer, jsonOk, jsonError, CORS_HEADERS, corsPreflight,
} from "@/lib/api-auth";
import { getTimetable, getDayStates, replaceTimetable } from "@/lib/game-engine/timetable-service";

const category = z.enum([
  "STUDY", "EXERCISE", "MORNING_ROUTINE", "BATH", "BREAKFAST",
  "LUNCH", "DINNER", "GAMING", "BREAK", "SLEEP",
]);

const blockInput = z.object({
  order: z.number().int().min(0).max(2000),
  startHour: z.number().int().min(0).max(23),
  startMin: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMin: z.number().int().min(0).max(59),
  activity: z.string().min(1).max(80),
  category,
  xpReward: z.number().int().min(0).max(1000),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const auth = await requireBearer(req);
  if ("error" in auth) return auth.error;
  const [blocks, states] = await Promise.all([
    getTimetable(auth.userId),
    getDayStates(auth.userId),
  ]);
  return Response.json({ ok: true, blocks, states }, { headers: CORS_HEADERS });
}

export async function PUT(req: Request) {
  const auth = await requireBearer(req);
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = z.object({ blocks: z.array(blockInput).max(100) }).safeParse(body);
  if (!parsed.success) return jsonError("Invalid blocks payload");
  const blocks = await replaceTimetable(auth.userId, parsed.data.blocks);
  return jsonOk({ blocks });
}
