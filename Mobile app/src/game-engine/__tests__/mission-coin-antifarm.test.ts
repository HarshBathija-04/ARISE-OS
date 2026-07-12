import { computeMissionRewards, generateDailyMissions, instantiateMission } from '../mission-engine';
import type { DailyGenContext } from '../mission-engine';
import { templateByKey } from '@/constants/missions';
import { applyCoins, canPurchase } from '../coin-engine';
import { applyAntiFarming, isFocusSessionValid, DAILY_XP_SOFT_CAP } from '../anti-farming-engine';

const NOW = '2026-07-11T08:00:00.000Z';

describe('mission-engine: rewards', () => {
  it('applies difficulty multiplier to base XP', () => {
    const wake = templateByKey('daily_wake')!; // D = 0.85
    const silence = templateByKey('daily_silence')!; // B = 1.2
    expect(computeMissionRewards(wake).xpReward).toBe(Math.round(120 * 0.85));
    expect(computeMissionRewards(silence).xpReward).toBe(Math.round(170 * 1.2));
  });

  it('instantiates an available mission with computed rewards', () => {
    const t = templateByKey('daily_dsa')!;
    const m = instantiateMission(t, NOW);
    expect(m.status).toBe('AVAILABLE');
    expect(m.xpReward).toBe(computeMissionRewards(t).xpReward);
    expect(m.currentProgress).toBe(0);
  });
});

describe('mission-engine: daily generation rules', () => {
  const base: DailyGenContext = {
    forDateIso: NOW,
    recentCompletionRate3d: 0.7,
    recentCompletionRate7d: 0.7,
    atRiskStreaks: [],
    recentRelapses: [],
    digitalDistractionRising: false,
    availableMinutes: 300,
    intensity: 'normal',
  };

  it('reduces load when 3d completion < 40%', () => {
    const normal = generateDailyMissions({ ...base }).missions.length;
    const struggling = generateDailyMissions({ ...base, recentCompletionRate3d: 0.3 });
    expect(struggling.missions.length).toBeLessThan(normal);
    expect(struggling.notes.join(' ')).toMatch(/below 40%/i);
  });

  it('boosts challenge when 7d completion > 85%', () => {
    const res = generateDailyMissions({ ...base, recentCompletionRate7d: 0.9 });
    expect(res.notes.join(' ')).toMatch(/challenge increased/i);
  });

  it('guarantees a workout mission when workout streak at risk', () => {
    const res = generateDailyMissions({ ...base, atRiskStreaks: ['WORKOUT'] });
    expect(res.missions.some((m) => m.activityType === 'WORKOUT')).toBe(true);
  });

  it('prioritizes digital silence when distraction rising', () => {
    const res = generateDailyMissions({ ...base, digitalDistractionRising: true });
    expect(res.missions.some((m) => m.activityType === 'NO_REELS')).toBe(true);
  });

  it('adds a recovery mission after a recent relapse', () => {
    const res = generateDailyMissions({ ...base, recentRelapses: ['REELS_SHORTS'] });
    expect(res.missions.some((m) => m.type === 'RECOVERY')).toBe(true);
  });

  it('respects a tight time budget by deferring long missions', () => {
    const tight = generateDailyMissions({ ...base, availableMinutes: 30 });
    // boolean anchors survive; long duration missions deferred
    const longKept = tight.missions.filter((m) => m.objectiveType === 'DURATION_MINUTES');
    expect(longKept.length).toBeLessThanOrEqual(1);
  });
});

describe('coin-engine', () => {
  it('earns coins and records a ledger entry', () => {
    const r = applyCoins(0, 50, 'MISSION', 'm1', NOW);
    expect(r.balance).toBe(50);
    expect(r.transaction?.balanceAfter).toBe(50);
  });

  it('never goes negative', () => {
    const r = applyCoins(10, -50, 'PURCHASE', 'r1', NOW);
    expect(r.balance).toBe(10);
    expect(r.rejected).toBe('INSUFFICIENT_COINS');
  });

  it('blocks unaffordable purchases', () => {
    expect(canPurchase(10, 50, null, 0, NOW).ok).toBe(false);
  });

  it('enforces cooldowns', () => {
    const recent = '2026-07-11T07:30:00.000Z';
    expect(canPurchase(1000, 50, recent, 2, NOW).ok).toBe(false);
    const old = '2026-07-10T00:00:00.000Z';
    expect(canPurchase(1000, 50, old, 2, NOW).ok).toBe(true);
  });
});

describe('anti-farming-engine', () => {
  it('applies diminishing returns for repeated activity', () => {
    const first = applyAntiFarming(100, { xpEarnedToday: 0, sameActivityCountToday: 0 });
    const third = applyAntiFarming(100, { xpEarnedToday: 0, sameActivityCountToday: 3 });
    expect(first.xp).toBe(100);
    expect(third.xp).toBeLessThan(first.xp);
  });

  it('decays XP past the daily soft cap', () => {
    const capped = applyAntiFarming(100, {
      xpEarnedToday: DAILY_XP_SOFT_CAP, sameActivityCountToday: 0,
    });
    expect(capped.xp).toBeLessThan(100);
    expect(capped.note).toMatch(/soft cap/i);
  });

  it('hard-caps recovery XP per day', () => {
    const r = applyAntiFarming(100, {
      xpEarnedToday: 0, sameActivityCountToday: 0, isRecovery: true, recoveryXpToday: 150,
    });
    expect(r.xp).toBeLessThanOrEqual(10);
  });

  it('rejects too-short focus sessions', () => {
    expect(isFocusSessionValid(60)).toBe(false);
    expect(isFocusSessionValid(600)).toBe(true);
  });
});
