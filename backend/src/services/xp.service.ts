/**
 * Server-side game service. All state mutations that grant XP/coins/levels
 * flow through here so the numbers are computed on the server and never trusted
 * from the client.
 */
import { db } from "../db/supabase.js";
import { AppError } from "../middleware/error.js";
import type { AttributeKey, AttrMap, NotificationType } from "../db/tables.js";
import { gameDay } from "../engine/date.js";
import {
  applyXp,
  applyAttributeXp,
  applyDailySoftCap,
  coinsForXp,
  xpForLevel,
} from "../engine/xp-engine.js";
import { rankForLevel } from "../engine/ranks.js";
import { insertNotification } from "./notification.service.js";

/** Sum of XP already granted to the player during the current game day. */
async function xpEarnedToday(userId: string): Promise<number> {
  const { data, error } = await db.rpc("xp_earned_today", {
    p_user_id: userId,
    p_since: gameDay().toISOString(),
  });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? 0;
}

export async function equippedTitleBonus(userId: string): Promise<number> {
  const { data: profile, error } = await db
    .from("player_profiles")
    .select("equipped_title:titles(xp_bonus_pct)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const title = profile
    ? Array.isArray(profile.equipped_title)
      ? profile.equipped_title[0]
      : profile.equipped_title
    : null;
  return title?.xp_bonus_pct ?? 0;
}

export interface XpAwardResult {
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  newLevel: number;
  newRank: string;
  attributeLevelUps: AttributeKey[];
}

/**
 * Core XP grant: applies the daily soft cap, cascades level-ups, updates
 * attributes, coins, and writes level/notification records.
 */
export async function grantXp(params: {
  userId: string;
  rawXp: number;
  attributeXp: AttrMap;
  coinReason: "QUEST" | "FOCUS" | "ACHIEVEMENT" | "BOSS" | "STREAK";
  source: string;
  extraCoins?: number;
}): Promise<XpAwardResult> {
  const { userId, rawXp, attributeXp, coinReason, source, extraCoins = 0 } = params;

  const earnedToday = await xpEarnedToday(userId);
  const xpAwarded = applyDailySoftCap(earnedToday, Math.max(0, Math.round(rawXp)));

  const { data: profile, error: pErr } = await db
    .from("player_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (pErr || !profile) throw new AppError("Profile not found", 404);

  const before = { level: profile.level, currentXp: profile.current_xp, xpForNext: xpForLevel(profile.level), totalXp: profile.total_xp };
  const after = applyXp(before, xpAwarded);
  const leveledUp = after.level > before.level;
  const newRank = rankForLevel(after.level);

  const coinsAwarded = coinsForXp(xpAwarded) + extraCoins;
  const newCoinBalance = profile.coins + coinsAwarded;

  const { error: upErr } = await db
    .from("player_profiles")
    .update({
      level: after.level,
      current_xp: after.currentXp,
      total_xp: after.totalXp,
      rank: newRank.name,
      coins: newCoinBalance,
    })
    .eq("user_id", userId);
  if (upErr) throw new Error(upErr.message);

  if (coinsAwarded > 0) {
    const { error } = await db.from("coin_transactions").insert({
      user_id: userId, amount: coinsAwarded, reason: coinReason, source, balance: newCoinBalance,
    });
    if (error) throw new Error(error.message);
  }

  // Attribute XP
  const attributeLevelUps: AttributeKey[] = [];
  for (const [key, gain] of Object.entries(attributeXp)) {
    if (!gain || gain <= 0) continue;
    const { data: attr, error: aErr } = await db
      .from("attributes")
      .select("*")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!attr) continue;
    const res = applyAttributeXp({ level: attr.level, xp: attr.xp, totalXp: attr.total_xp }, gain);
    const { error: auErr } = await db
      .from("attributes")
      .update({ level: res.level, xp: res.xp, total_xp: res.totalXp })
      .eq("id", attr.id);
    if (auErr) throw new Error(auErr.message);
    const { error: hErr } = await db.from("attribute_history").insert({
      user_id: userId, attribute_id: attr.id, key,
      xp_delta: gain, total_xp_at: res.totalXp, level_at: res.level, source,
    });
    if (hErr) throw new Error(hErr.message);
    if (res.leveledUp) attributeLevelUps.push(key as AttributeKey);
  }

  // Level-up records + notifications
  if (leveledUp) {
    const { error } = await db.from("level_progress").insert({
      user_id: userId, from_level: before.level, to_level: after.level, rank: newRank.name, total_xp_at: after.totalXp,
    });
    if (error) throw new Error(error.message);
    await notify(userId, "LEVEL_UP", "LEVEL INCREASED", `You have reached Level ${after.level} — ${newRank.name}.`);
    await bumpMetric(userId, "level", after.level, "set");
  }
  for (const key of attributeLevelUps) {
    await notify(userId, "ATTRIBUTE_UP", "ATTRIBUTE IMPROVED", `${key} increased.`);
  }

  return {
    xpAwarded,
    coinsAwarded,
    leveledUp,
    newLevel: after.level,
    newRank: newRank.name,
    attributeLevelUps,
  };
}

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body = "",
  meta?: Record<string, unknown>,
) {
  // Delegates to notification.service (single insert path shared with
  // notifyAndPush); kept exported here so existing call sites are untouched.
  await insertNotification(userId, type, title, body, meta);
}

/**
 * Increment (or set) an achievement metric, unlocking any achievements whose
 * threshold is crossed and granting their rewards (recursively via grantXp for
 * the reward XP, but WITHOUT re-triggering achievement loops on that XP).
 */
export async function bumpMetric(
  userId: string,
  metric: string,
  amount: number,
  mode: "inc" | "set" = "inc",
) {
  const { data: rows, error } = await db
    .from("user_achievements")
    .select("*, achievement:achievements!inner(*)")
    .eq("user_id", userId)
    .eq("unlocked", false)
    .eq("achievement.metric", metric);
  if (error) throw new Error(error.message);
  for (const row of rows ?? []) {
    const achievement = Array.isArray(row.achievement) ? row.achievement[0] : row.achievement;
    if (!achievement) continue;
    const next = mode === "set" ? amount : row.progress + amount;
    const unlocked = next >= achievement.target_value;
    const { error: upErr } = await db
      .from("user_achievements")
      .update({
        progress: next,
        unlocked,
        unlocked_at: unlocked ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    if (unlocked) {
      await unlockAchievementRewards(userId, row.achievement_id);
    }
  }
}

async function unlockAchievementRewards(userId: string, achievementId: string) {
  const { data: a, error: achErr } = await db
    .from("achievements")
    .select("*")
    .eq("id", achievementId)
    .single();
  if (achErr || !a) throw new AppError("Achievement not found", 404);

  // Grant XP/coins directly (no soft-cap gaming loop for achievement bonuses).
  const { data: profile, error: pErr } = await db
    .from("player_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (pErr || !profile) throw new AppError("Profile not found", 404);
  const before = { level: profile.level, currentXp: profile.current_xp, xpForNext: xpForLevel(profile.level), totalXp: profile.total_xp };
  const after = applyXp(before, a.xp_reward);
  const rank = rankForLevel(after.level);
  const coins = profile.coins + a.coin_reward;
  const { error: upErr } = await db
    .from("player_profiles")
    .update({ level: after.level, current_xp: after.currentXp, total_xp: after.totalXp, rank: rank.name, coins })
    .eq("user_id", userId);
  if (upErr) throw new Error(upErr.message);
  if (a.coin_reward > 0) {
    const { error } = await db.from("coin_transactions").insert({
      user_id: userId, amount: a.coin_reward, reason: "ACHIEVEMENT", source: a.key, balance: coins,
    });
    if (error) throw new Error(error.message);
  }

  await notify(userId, "ACHIEVEMENT_UNLOCKED",
    a.hidden ? "HIDDEN ACHIEVEMENT UNLOCKED" : "ACHIEVEMENT UNLOCKED",
    `${a.title} — ${a.description}`);

  // Grant linked title, if any.
  if (a.title_key) {
    const { data: title, error: tErr } = await db
      .from("titles")
      .select("*")
      .eq("key", a.title_key)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (title) {
      const { data: existing, error: eErr } = await db
        .from("user_titles")
        .select("*")
        .eq("user_id", userId)
        .eq("title_id", title.id)
        .maybeSingle();
      if (eErr) throw new Error(eErr.message);
      if (!existing) {
        const { error: iErr } = await db.from("user_titles").insert({ user_id: userId, title_id: title.id });
        if (iErr) throw new Error(iErr.message);
        await notify(userId, "TITLE_ACQUIRED", "NEW TITLE ACQUIRED", `You earned the title “${title.name}”.`);
      }
    }
  }
}

// ─────────────────── Activity + day tracking ───────────────────

export async function logActivity(
  userId: string,
  kind: string,
  value: number,
  meta?: Record<string, unknown>,
) {
  const { error } = await db.from("activity_logs").insert({
    user_id: userId, date: gameDay().toISOString(), kind, value, meta: meta ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function touchActiveDay(userId: string) {
  const { data: profile, error } = await db
    .from("player_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !profile) throw new AppError("Profile not found", 404);
  const today = gameDay();
  const last = profile.last_active_date ? gameDay(new Date(profile.last_active_date)) : null;
  if (last && last.getTime() === today.getTime()) return; // already counted today

  const activeDays = profile.active_days + 1;
  const { error: upErr } = await db
    .from("player_profiles")
    .update({ active_days: activeDays, last_active_date: today.toISOString() })
    .eq("user_id", userId);
  if (upErr) throw new Error(upErr.message);
  await bumpMetric(userId, "active_days", activeDays, "set");
}
