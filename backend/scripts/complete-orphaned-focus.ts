/**
 * One-off: credit an orphaned focus session that the app lost track of
 * (started, never completed because the client state was wiped).
 *
 * Usage: tsx scripts/complete-orphaned-focus.ts <sessionId> <actualMinutes> [result]
 */
import "dotenv/config";
import { db } from "../src/db/supabase.js";
import { completeFocusSession } from "../src/services/focus.service.js";

const [sessionId, minutesArg, resultArg] = process.argv.slice(2);
if (!sessionId || !minutesArg) {
  console.error("Usage: tsx scripts/complete-orphaned-focus.ts <sessionId> <actualMinutes> [COMPLETE|PARTIAL|ABANDONED]");
  process.exit(1);
}
const actualMinutes = Number(minutesArg);
const result = (resultArg ?? "COMPLETE") as "COMPLETE" | "PARTIAL" | "ABANDONED";

const { data: session, error } = await db
  .from("focus_sessions")
  .select("id,user_id,category,planned_min,started_at,ended_at")
  .eq("id", sessionId)
  .maybeSingle();
if (error) throw new Error(error.message);
if (!session) throw new Error(`Session ${sessionId} not found`);
if (session.ended_at) throw new Error(`Session already ended at ${session.ended_at}`);

console.log(`Completing ${session.category} session started ${session.started_at} (planned ${session.planned_min}m) as ${result} with ${actualMinutes}m...`);

const award = await completeFocusSession({
  userId: session.user_id,
  sessionId: session.id,
  actualMinutes,
  result,
});

console.log("Award:", JSON.stringify(award, null, 2));
