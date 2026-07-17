/**
 * Redraw today's quest set with the personalized engine for the given
 * accounts (default: both known users). Completed quests are kept; only
 * still-ACTIVE quests are discarded and regenerated.
 *
 * Run: npx tsx scripts/regenerate-today.ts [email ...]
 */
import { db } from "../src/db/supabase.js";
import { ensureTodayQuests } from "../src/services/quest.service.js";
import { gameDay } from "../src/engine/date.js";

const emails = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["demo@arise.os"];

async function main() {
  const { data: users, error } = await db.from("users").select("id, email").in("email", emails);
  if (error) throw new Error(error.message);

  for (const user of users ?? []) {
    const result = await ensureTodayQuests(user.id, true);
    const { data: quests, error: qErr } = await db
      .from("quests")
      .select("title, type, category, difficulty, base_xp, streak_key, main_quest_stage_id, stage_units, status")
      .eq("user_id", user.id)
      .eq("assigned_date", gameDay().toISOString())
      .order("type", { ascending: true });
    if (qErr) throw new Error(qErr.message);
    console.log(`\n═══ ${user.email} — regenerated ${result.created} quests ═══`);
    for (const q of quests ?? []) {
      const tags = [
        q.type,
        q.difficulty,
        `${q.base_xp}xp`,
        q.streak_key ? `streak:${q.streak_key}` : null,
        q.main_quest_stage_id ? `goal+${q.stage_units}u` : null,
        q.status !== "ACTIVE" ? q.status : null,
      ].filter(Boolean).join(" · ");
      console.log(`  [${q.category.padEnd(9)}] ${q.title}  (${tags})`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
