/**
 * SOLO OS — Anti-Farming Engine.
 *
 * Prevents XP farming via repeated trivial actions. Mirrors the server-side
 * soft cap in supabase/migrations/0011. All decisions are logged (the caller
 * persists the note into the activity/completion record).
 */

export const DAILY_XP_SOFT_CAP = 1200;
export const FOCUS_MIN_ACTIVE_SECONDS = 5 * 60; // sessions under 5 min → 0 XP
export const RECOVERY_DAILY_XP_CAP = 160;

export interface AntiFarmContext {
  /** XP already earned today (all sources). */
  xpEarnedToday: number;
  /** How many times this exact activity/template was completed today. */
  sameActivityCountToday: number;
  /** Recovery XP earned today (for the recovery-specific cap). */
  recoveryXpToday?: number;
  isRecovery?: boolean;
}

export interface AntiFarmResult {
  xp: number;
  note: string | null;
}

/**
 * Adjust a base XP award against anti-farming rules:
 *  - repeated identical activity → diminishing returns
 *  - daily soft cap → efficiency decay beyond the cap
 *  - recovery missions → hard daily cap
 */
export function applyAntiFarming(baseXp: number, ctx: AntiFarmContext): AntiFarmResult {
  if (baseXp <= 0) return { xp: 0, note: null };
  let xp = baseXp;
  const notes: string[] = [];

  // 1. Diminishing returns for repeated identical activity within the day.
  if (ctx.sameActivityCountToday > 0) {
    const factor = Math.max(0.2, Math.pow(0.6, ctx.sameActivityCountToday));
    const before = xp;
    xp = Math.max(1, Math.round(xp * factor));
    if (xp < before) notes.push(`repeat x${ctx.sameActivityCountToday}: -${before - xp}`);
  }

  // 2. Recovery-specific hard cap.
  if (ctx.isRecovery) {
    const already = ctx.recoveryXpToday ?? 0;
    const room = Math.max(0, RECOVERY_DAILY_XP_CAP - already);
    if (xp > room) {
      notes.push(`recovery cap: ${xp}→${room}`);
      xp = room;
    }
  }

  // 3. Daily soft cap: efficiency decays past the cap.
  const projected = ctx.xpEarnedToday + xp;
  if (ctx.xpEarnedToday >= DAILY_XP_SOFT_CAP) {
    const before = xp;
    xp = Math.max(1, Math.round(xp * 0.25));
    notes.push(`soft cap decay: ${before}→${xp}`);
  } else if (projected > DAILY_XP_SOFT_CAP) {
    const before = xp;
    xp = Math.max(1, Math.round(xp * 0.6));
    notes.push(`soft cap crossing: ${before}→${xp}`);
  }

  return { xp, note: notes.length ? notes.join('; ') : null };
}

/** Focus sessions below the minimum active time earn zero XP. */
export function isFocusSessionValid(activeSeconds: number): boolean {
  return activeSeconds >= FOCUS_MIN_ACTIVE_SECONDS;
}
