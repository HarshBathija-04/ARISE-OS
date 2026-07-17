/**
 * Read-layer: assembles view models for the pages by calling the Express API.
 * Server-only. Endpoints backed by ported view services (profile, today
 * quests, performance, heatmap, metrics, shadow status) return the same
 * camelCase shapes this file used to build from Prisma; plain list endpoints
 * return snake_case DB rows which are mapped here so page code keeps its
 * camelCase expectations.
 */
import { apiFetch } from "@/lib/api-client";
import type { DailyMetric } from "@/lib/game-engine/performance-engine";

// ─────────────────── small mapping helpers ───────────────────

const toDate = (v: string | null | undefined): Date | null => (v ? new Date(v) : null);

function mapNotification(n: any) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: new Date(n.created_at),
  };
}

function mapBoss(b: any) {
  return {
    id: b.id,
    key: b.key,
    name: b.name,
    tagline: b.tagline,
    description: b.description,
    rarity: b.rarity,
    maxHp: b.max_hp,
    rewardXp: b.reward_xp,
    rewardCoins: b.reward_coins,
    rewardTitleKey: b.reward_title_key,
    phases: b.phases,
    unlockLevel: b.unlock_level,
  };
}

function mapBattle(bt: any) {
  const logs = [...(bt.logs ?? [])]
    .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 8)
    .map((l: any) => ({
      id: l.id,
      action: l.action,
      damage: l.damage,
      critical: l.critical,
      createdAt: new Date(l.created_at),
    }));
  return {
    id: bt.id,
    status: bt.status,
    currentHp: bt.current_hp,
    maxHp: bt.max_hp,
    phase: bt.phase,
    startedAt: toDate(bt.started_at),
    endedAt: toDate(bt.ended_at),
    boss: mapBoss(bt.boss),
    logs,
  };
}

function mapStreak(s: any) {
  return {
    id: s.id,
    key: s.key,
    title: s.title,
    current: s.current,
    longest: s.longest,
    lastDate: toDate(s.last_date),
    shieldsUsed: s.shields_used,
  };
}

// ─────────────────── core read functions (signatures preserved) ───────────────────

export async function getProfileView(_userId?: string) {
  const { profile } = await apiFetch<{ profile: any }>("/v1/profile");
  return profile;
}

export async function getAttributes(_userId?: string) {
  const { attributes } = await apiFetch<{ attributes: any[] }>("/v1/attributes");
  return attributes;
}

export async function getTodayQuests(_userId?: string) {
  const { quests } = await apiFetch<{ quests: any[] }>("/v1/quests/today");
  return quests;
}

export async function getActiveBossBattles(_userId?: string) {
  const { battles } = await apiFetch<{ battles: any[] }>("/v1/bosses/battles");
  // Preserve the old ordering: status asc → ACTIVE before DEFEATED.
  return battles.map(mapBattle).sort((a, b) => a.status.localeCompare(b.status));
}

export async function getStreaks(_userId?: string) {
  const { streaks } = await apiFetch<{ streaks: any[] }>("/v1/streaks");
  return streaks.map(mapStreak).sort((a, b) => b.current - a.current);
}

export async function getRecentNotifications(_userId?: string, take = 8) {
  const { notifications } = await apiFetch<{ notifications: any[] }>(
    `/v1/notifications?limit=${take}`,
  );
  return notifications.map(mapNotification);
}

export async function getUnusedShields(_userId?: string) {
  const { shields } = await apiFetch<{ shields: any[] }>("/v1/streaks/shields");
  return shields.filter((s) => !s.used_at).length;
}

export async function getDailyMetrics(_userId?: string, days = 30): Promise<DailyMetric[]> {
  const { metrics } = await apiFetch<{ metrics: DailyMetric[] }>(
    `/v1/analytics/metrics?days=${days}`,
  );
  return metrics;
}

export async function getPerformance(_userId?: string) {
  const { performance } = await apiFetch<{ performance: any }>("/v1/analytics/performance");
  return performance;
}

export async function getHeatmap(_userId?: string, days = 120) {
  const { heatmap } = await apiFetch<{ heatmap: { date: string; intensity: number }[] }>(
    `/v1/analytics/heatmap?days=${days}`,
  );
  return heatmap;
}

export async function getOpenRecoveryQuest(_userId?: string) {
  const { recovery } = await apiFetch<{ recovery: any }>("/v1/recovery/open");
  return recovery ?? null;
}

export async function getRewards(_userId?: string) {
  const { rewards } = await apiFetch<{ rewards: any[] }>("/v1/rewards");
  return rewards;
}

export async function getShadowHabitStatus(_userId?: string) {
  const { shadow } = await apiFetch<{ shadow: any[] }>("/v1/habits");
  return shadow as { key: string; title: string; streak?: { current: number; longest: number } }[];
}

// ─────────────────── page-specific reads (formerly inline prisma) ───────────────────

export async function getSkillTrees() {
  const { trees } = await apiFetch<{ trees: any[] }>("/v1/skills");
  return trees.map((t) => ({
    id: t.id,
    key: t.key,
    title: t.title,
    nodes: [...(t.nodes ?? [])]
      .sort((a: any, b: any) => a.tier - b.tier || a.order - b.order)
      .map((n: any) => {
        const progress = Array.isArray(n.progress) ? n.progress[0] : n.progress;
        return {
          id: n.id,
          title: n.title,
          description: n.description,
          tier: n.tier,
          order: n.order,
          targetUnits: n.target_units,
          progress: progress ? { status: progress.status, units: progress.units } : null,
        };
      }),
  }));
}

export async function getTitlesData() {
  const { titles, equippedTitleId } = await apiFetch<{
    titles: any[];
    equippedTitleId: string | null;
  }>("/v1/titles");
  const owned = titles.map((row) => {
    const t = row.title ?? {};
    return {
      id: t.id ?? row.title_id,
      key: t.key,
      name: t.name,
      description: t.description,
      rarity: t.rarity,
      xpBonusPct: t.xp_bonus_pct ?? 0,
    };
  });
  return { owned, equippedTitleId };
}

export async function getAchievements() {
  const { achievements } = await apiFetch<{ achievements: any[] }>("/v1/achievements");
  return achievements.map((r) => ({
    id: r.id,
    unlocked: r.unlocked,
    progress: r.progress,
    unlockedAt: toDate(r.unlocked_at),
    achievement: {
      id: r.achievement?.id,
      key: r.achievement?.key,
      title: r.achievement?.title,
      description: r.achievement?.description,
      rarity: r.achievement?.rarity,
      hidden: r.achievement?.hidden,
      targetValue: r.achievement?.target_value,
      xpReward: r.achievement?.xp_reward,
      coinReward: r.achievement?.coin_reward,
    },
  }));
}

export async function getMainQuests() {
  const { mainQuests } = await apiFetch<{ mainQuests: any[] }>("/v1/main-quests");
  return mainQuests.map((mq) => ({
    id: mq.id,
    key: mq.key,
    title: mq.title,
    description: mq.description,
    theme: mq.theme,
    order: mq.order,
    stages: [...(mq.stages ?? [])]
      .sort((a: any, b: any) => a.order - b.order)
      .map((s: any) => ({
        id: s.id,
        key: s.key,
        title: s.title,
        description: s.description,
        targetUnits: s.target_units,
        progress: s.progress,
        completed: s.completed,
      })),
  }));
}

export async function getActivityFeed() {
  const { logs, coinTransactions } = await apiFetch<{
    logs: any[];
    coinTransactions: any[];
  }>("/v1/activity");
  return {
    activities: logs.map((a) => ({
      id: a.id,
      kind: a.kind,
      value: a.value,
      meta: a.meta,
      date: toDate(a.date),
      createdAt: new Date(a.created_at),
    })),
    coins: coinTransactions.map((c) => ({
      id: c.id,
      amount: c.amount,
      reason: c.reason,
      source: c.source,
      createdAt: new Date(c.created_at),
    })),
  };
}

export async function getTodayFocusSessions() {
  const { sessions } = await apiFetch<{ sessions: any[] }>("/v1/focus/today");
  return sessions.map((s) => ({
    id: s.id,
    category: s.category,
    plannedMin: s.planned_min,
    actualMin: s.actual_min,
    result: s.result,
    startedAt: new Date(s.started_at),
    endedAt: toDate(s.ended_at),
  }));
}

export async function getSettings() {
  const { settings } = await apiFetch<{ settings: any }>("/v1/settings");
  return {
    wakeTarget: settings?.wake_target ?? "05:00",
    sleepTarget: settings?.sleep_target ?? "23:00",
    minSleepHours: settings?.min_sleep_hours ?? 6,
    difficultyBias: settings?.difficulty_bias ?? 1,
    reduceMotion: settings?.reduce_motion ?? false,
    aiProvider: settings?.ai_provider ?? "none",
    aiModel: settings?.ai_model ?? "",
    theme: settings?.theme ?? "dark",
    timezone: settings?.timezone ?? "Asia/Kolkata",
    resetTime: settings?.reset_time ?? "00:00",
    eveningReminderTime: settings?.evening_reminder_time ?? "23:00",
    pushEnabled: settings?.push_enabled ?? true,
    questPushEnabled: settings?.quest_push_enabled ?? true,
    timetableAlarmsEnabled: settings?.timetable_alarms_enabled ?? true,
    preReminderMinutes: settings?.pre_reminder_minutes ?? 5,
    alarmRepeatCount: settings?.alarm_repeat_count ?? 3,
    autoStartFocus: settings?.auto_start_focus ?? true,
    weekendAlarms: settings?.weekend_alarms ?? true,
    dndStart: settings?.dnd_start ?? null,
    dndEnd: settings?.dnd_end ?? null,
  };
}

export async function getAllBosses() {
  const { bosses } = await apiFetch<{ bosses: any[] }>("/v1/bosses");
  return bosses.map(mapBoss);
}

export async function getAttributeHistory(limit = 60) {
  const { history } = await apiFetch<{ history: any[] }>(`/v1/attributes/history?limit=${limit}`);
  return history.map((h) => ({
    id: h.id,
    key: h.key,
    xpDelta: h.xp_delta,
    source: h.source,
    createdAt: new Date(h.created_at),
  }));
}

export async function getRecoveryHistory() {
  const { history } = await apiFetch<{ history: any[] }>("/v1/recovery/history");
  return history
    .filter((r) => r.completed)
    .map((r) => ({
      id: r.id,
      reason: r.reason,
      steps: r.steps,
      completed: r.completed,
      completedAt: toDate(r.completed_at),
      createdAt: new Date(r.created_at),
    }));
}

export async function getUrgeLogs(limit = 8) {
  const { urges } = await apiFetch<{ urges: any[] }>(`/v1/urges?limit=${limit}`);
  return urges.map((u) => ({
    id: u.id as string,
    habitKey: u.habit_key as string,
    resisted: u.resisted as boolean,
    trigger: u.trigger as string,
    mood: u.mood as string,
    location: u.location as string,
    createdAt: new Date(u.created_at),
  }));
}

export async function getTimetableData(dayType?: "ALL" | "OFFICE" | "WFH" | "WEEKEND") {
  // Ported timetable service — blocks/states keep the old camelCase shapes.
  // With dayType, the API returns that variant's blocks plus shared ALL blocks.
  const query = dayType ? `?dayType=${dayType}` : "";
  const { blocks, states, excuses } = await apiFetch<{
    blocks: any[];
    states: Record<string, string>;
    excuses: Record<string, string>;
  }>(`/v1/timetable${query}`);
  return { blocks, states, excuses: excuses ?? {} };
}

/** Idempotently ensure today's quests exist (safe on every load). */
export async function ensureTodayQuestsViaApi() {
  return apiFetch("/v1/quests/generate", { method: "POST", body: "{}" });
}
