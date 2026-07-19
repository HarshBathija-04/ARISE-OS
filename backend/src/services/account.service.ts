/**
 * Account bootstrap — called once by clients after first Supabase Auth signup
 * (idempotent, safe to call on every login).
 *
 * Ported from Website/src/lib/account.ts + the per-user portion of
 * Website/prisma/seed.ts. Credentials are owned by Supabase Auth and the
 * public.users row is created by a DB trigger, so this only seeds game state:
 * settings, profile, attributes, streaks, habits, main quests, skill trees,
 * achievements, starter title, rewards, first boss battle, welcome
 * notification, and today's quests.
 *
 * Personal game content (habits/streaks/main quests/skill trees) is only
 * seeded when the profile is first created, from the neutral STARTER_* set —
 * accounts seeded earlier (with the owner's personal content) are untouched
 * on subsequent bootstrap calls.
 */
import { db } from "../db/supabase.js";
import { ATTRIBUTES } from "../engine/attributes.js";
import { rankForLevel } from "../engine/ranks.js";
import {
  STARTER_HABITS,
  STARTER_STREAKS,
  STARTER_MAIN_QUESTS,
  STARTER_SKILL_TREES,
} from "../engine/content/starter.js";
import { DEFAULT_REWARDS } from "../engine/content/rewards.js";
import { ensureTodayQuests } from "./quest.service.js";
import { notify } from "./xp.service.js";
import { AppError } from "../middleware/error.js";

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/**
 * Idempotently seed the minimum viable player state for `userId` so a
 * freshly-registered user has a working profile on either frontend.
 */
export async function bootstrapAccount(userId: string): Promise<{ userId: string; created: boolean }> {
  // The public.users row is created by the auth trigger; display name comes from it.
  const { data: user, error: userError } = await db
    .from("users")
    .select("id, name")
    .eq("id", userId)
    .maybeSingle();
  check(userError);
  if (!user) throw new AppError("User not found", 404);

  // Did the profile already exist? (drives `created` + the one-time welcome notification)
  const { data: existingProfile, error: profError } = await db
    .from("player_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  check(profError);
  const created = !existingProfile;

  // ── Settings ──
  {
    const { error } = await db
      .from("user_settings")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
    check(error);
  }

  // ── Player profile ──
  if (created) {
    const { error } = await db.from("player_profiles").insert({
      user_id: userId,
      display_name: user.name,
      level: 1,
      total_xp: 0,
      current_xp: 0,
      rank: rankForLevel(1).name,
      coins: 0,
    });
    check(error);
  }

  // ── Attributes (all start at level 1) ──
  {
    const { error } = await db.from("attributes").upsert(
      ATTRIBUTES.map((a) => ({ user_id: userId, key: a.key, level: 1, xp: 0, total_xp: 0 })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    );
    check(error);
  }

  // ── Streaks ──
  if (created) {
    const { error } = await db.from("streaks").upsert(
      STARTER_STREAKS.map((s) => ({ user_id: userId, key: s.key, title: s.title })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    );
    check(error);
  }

  // ── Habits ──
  if (created) {
    const { error } = await db.from("habits").upsert(
      STARTER_HABITS.map((h) => ({
        user_id: userId,
        key: h.key,
        title: h.title,
        kind: h.kind,
        streak_key: h.streakKey ?? null,
        private: h.private ?? false,
      })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    );
    check(error);
  }

  // ── Main quests + stages ──
  for (const mq of created ? STARTER_MAIN_QUESTS : []) {
    const { data: quest, error } = await db
      .from("main_quests")
      .upsert(
        {
          user_id: userId,
          key: mq.key,
          title: mq.title,
          description: mq.description,
          theme: mq.theme,
          order: mq.order,
        },
        { onConflict: "user_id,key" },
      )
      .select("id")
      .single();
    check(error);

    const { error: stageError } = await db.from("main_quest_stages").upsert(
      mq.stages.map((st, i) => ({
        main_quest_id: quest!.id,
        key: st.key,
        title: st.title,
        description: st.description,
        order: i,
        target_units: st.targetUnits,
      })),
      { onConflict: "main_quest_id,key", ignoreDuplicates: true },
    );
    check(stageError);
  }

  // ── Skill trees + nodes + progress (roots become AVAILABLE) ──
  for (const tree of created ? STARTER_SKILL_TREES : []) {
    const { data: createdTree, error } = await db
      .from("skill_trees")
      .upsert(
        { user_id: userId, key: tree.key, title: tree.title, domain: tree.domain },
        { onConflict: "user_id,key" },
      )
      .select("id")
      .single();
    check(error);

    const { data: nodes, error: nodeError } = await db
      .from("skill_nodes")
      .upsert(
        tree.nodes.map((node) => ({
          tree_id: createdTree!.id,
          key: node.key,
          title: node.title,
          description: node.description,
          tier: node.tier,
          parent_key: node.parentKey ?? null,
          target_units: node.targetUnits ?? 100,
        })),
        { onConflict: "tree_id,key" },
      )
      .select("id, key");
    check(nodeError);

    const parentByKey = new Map(tree.nodes.map((n) => [n.key, n.parentKey]));
    const { error: progressError } = await db.from("skill_progress").upsert(
      (nodes ?? []).map((n) => ({
        user_id: userId,
        node_id: n.id,
        status: parentByKey.get(n.key) ? "LOCKED" : "AVAILABLE",
      })),
      { onConflict: "node_id", ignoreDuplicates: true },
    );
    check(progressError);
  }

  // ── UserAchievements (progress 0) ──
  {
    const { data: achievements, error } = await db.from("achievements").select("id");
    check(error);
    if (achievements && achievements.length > 0) {
      const { error: uaError } = await db.from("user_achievements").upsert(
        achievements.map((a) => ({
          user_id: userId,
          achievement_id: a.id,
          progress: 0,
          unlocked: false,
        })),
        { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
      );
      check(uaError);
    }
  }

  // ── The Initiate title, equipped by default ──
  {
    const { data: initiateTitle, error } = await db
      .from("titles")
      .select("id")
      .eq("key", "the-initiate")
      .maybeSingle();
    check(error);
    if (initiateTitle) {
      const { error: utError } = await db.from("user_titles").upsert(
        { user_id: userId, title_id: initiateTitle.id },
        { onConflict: "user_id,title_id", ignoreDuplicates: true },
      );
      check(utError);
      if (created) {
        const { error: eqError } = await db
          .from("player_profiles")
          .update({ equipped_title_id: initiateTitle.id })
          .eq("user_id", userId);
        check(eqError);
      }
    }
  }

  // ── Rewards (starter shop, only if the user has none) ──
  {
    const { count, error } = await db
      .from("rewards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    check(error);
    if ((count ?? 0) === 0) {
      const { error: rError } = await db.from("rewards").insert(
        DEFAULT_REWARDS.map((r) => ({
          user_id: userId,
          title: r.title,
          description: r.description,
          cost: r.cost,
          icon: r.icon,
          custom: false,
        })),
      );
      check(rError);
    }
  }

  // ── First boss encounter: The 30-Day Discipline Trial ──
  {
    const { data: firstBoss, error } = await db
      .from("bosses")
      .select("id, max_hp")
      .eq("key", "the-30-day-trial")
      .maybeSingle();
    check(error);
    if (firstBoss) {
      const { error: bbError } = await db.from("boss_battles").upsert(
        {
          user_id: userId,
          boss_id: firstBoss.id,
          status: "ACTIVE",
          current_hp: firstBoss.max_hp,
          max_hp: firstBoss.max_hp,
        },
        { onConflict: "user_id,boss_id", ignoreDuplicates: true },
      );
      check(bbError);
    }
  }

  // ── Welcome notification (only on first bootstrap) ──
  if (created) {
    await notify(
      userId,
      "SYSTEM",
      "SYSTEM ONLINE",
      `Welcome, ${user.name}. You are bound to the System at Level 1. Your ascent begins now.`,
    );
  }

  // ── Today's daily quests (idempotent) ──
  await ensureTodayQuests(userId);

  return { userId, created };
}
