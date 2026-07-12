/**
 * SOLO OS — Boss Engine.
 *
 * Bosses represent real-life problems. Real-world actions deal damage.
 * All calculations are pure and deterministic; the server recomputes
 * independently and wins on sync.
 *
 * Rules:
 *  - HP never goes negative.
 *  - HP never exceeds max.
 *  - Boss phases shift at HP thresholds.
 *  - Critical hits apply when the activity is a boss weakness.
 *  - Boss recovery: bosses regain limited HP after repeated player failures.
 */
import type { Boss, BossLogEntry, BossStatus, ActivityType } from '@/types';
import { nowIso } from '@/utils/date';

// ── Damage tables ─────────────────────────────────────────────────

/** Base damage per activity type. */
export const BASE_DAMAGE: Partial<Record<ActivityType, number>> = {
  DEEP_WORK: 5,      // 30 min → 5; scaled by duration
  GATE_STUDY: 10,    // per hour
  DSA: 3,            // per problem
  WORKOUT: 15,
  RUNNING: 8,
  ROUTINE_COMPLETION: 25,
  NO_REELS: 10,
  PORN_FREE: 10,
  AI_ML: 8,
  FULL_STACK: 8,
  SYSTEM_DESIGN: 8,
  DATA_SCIENCE: 8,
  WAKE_5AM: 5,
  FOCUS_SESSION: 8,
  RECOVERY: 3,
};

/** Critical multiplier for weakness activities. */
const CRITICAL_MULTIPLIER = 2.0;

/** Boss recovery HP per player mission failure. */
const BOSS_RECOVERY_PER_FAILURE = 3;
const BOSS_RECOVERY_MAX_PER_DAY = 15;

// ── Damage calculation ────────────────────────────────────────────

export interface DamageInput {
  activityType: ActivityType;
  /** Optional scaling factor (e.g. minutes/60 for time-based, or count). */
  scale?: number;
}

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  hpAfter: number;
  defeated: boolean;
  logEntry: BossLogEntry;
}

let logCounter = 0;

export function calculateBossDamage(
  boss: Boss,
  input: DamageInput,
): DamageResult {
  const base = BASE_DAMAGE[input.activityType] ?? 0;
  const scale = input.scale ?? 1;
  const isCritical = boss.weakness.includes(input.activityType);
  const mult = isCritical ? CRITICAL_MULTIPLIER : 1;
  const rawDamage = Math.max(1, Math.round(base * scale * mult));

  // HP never goes negative.
  const damage = Math.min(rawDamage, boss.currentHp);
  const hpAfter = Math.max(0, boss.currentHp - damage);
  const defeated = hpAfter <= 0;

  logCounter += 1;
  const logEntry: BossLogEntry = {
    id: `bl_${Date.now().toString(36)}_${logCounter}`,
    bossId: boss.id,
    activityType: input.activityType,
    damage,
    isCritical,
    hpAfter,
    createdAt: nowIso(),
  };

  return { damage, isCritical, hpAfter, defeated, logEntry };
}

// ── Boss recovery ─────────────────────────────────────────────────

export interface RecoveryContext {
  failedMissionsToday: number;
  recoveryAppliedToday: number;
}

export function calculateBossRecovery(
  boss: Boss,
  ctx: RecoveryContext,
): { hpRecovered: number; newHp: number } {
  if (boss.status !== 'ACTIVE') return { hpRecovered: 0, newHp: boss.currentHp };
  if (ctx.failedMissionsToday <= 0) return { hpRecovered: 0, newHp: boss.currentHp };

  const recoveryRoom = Math.max(0, BOSS_RECOVERY_MAX_PER_DAY - ctx.recoveryAppliedToday);
  const potential = Math.min(
    BOSS_RECOVERY_PER_FAILURE * ctx.failedMissionsToday,
    recoveryRoom,
  );
  // Never exceed max HP.
  const recovered = Math.min(potential, boss.maxHp - boss.currentHp);
  return {
    hpRecovered: recovered,
    newHp: Math.min(boss.maxHp, boss.currentHp + recovered),
  };
}

// ── Phase management ──────────────────────────────────────────────

/**
 * Boss phases: phase increases as HP drops.
 *  Phase 1: 100%–66% HP
 *  Phase 2: 66%–33% HP
 *  Phase 3: 33%–0% HP
 */
export function getBossPhase(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 1;
  const ratio = currentHp / maxHp;
  if (ratio > 0.66) return 1;
  if (ratio > 0.33) return 2;
  return 3;
}

// ── Boss state helpers ────────────────────────────────────────────

export function applyDamage(boss: Boss, result: DamageResult): Boss {
  const newHp = Math.max(0, result.hpAfter);
  const defeated = newHp <= 0;
  return {
    ...boss,
    currentHp: newHp,
    phase: getBossPhase(newHp, boss.maxHp),
    status: defeated ? 'DEFEATED' : boss.status,
    defeatedAt: defeated ? nowIso() : boss.defeatedAt,
  };
}

export function activateBoss(boss: Boss): Boss {
  if (boss.status !== 'LOCKED') return boss;
  return {
    ...boss,
    status: 'ACTIVE',
    battleStartedAt: nowIso(),
    currentHp: boss.maxHp,
    phase: 1,
  };
}

/** Get today's total damage from a log. */
export function todaysDamage(logs: BossLogEntry[], todayKey: string): number {
  return logs
    .filter((l) => l.createdAt.startsWith(todayKey))
    .reduce((s, l) => s + l.damage, 0);
}
