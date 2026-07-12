import {
  calculateBossDamage, calculateBossRecovery, applyDamage, getBossPhase, todaysDamage,
} from '../boss-engine';
import type { Boss, BossLogEntry } from '@/types';

function makeBoss(overrides: Partial<Boss> = {}): Boss {
  return {
    id: 'procrastinator',
    name: 'THE PROCRASTINATOR',
    description: 'test',
    maxHp: 200,
    currentHp: 200,
    phase: 1,
    weakness: ['DEEP_WORK', 'GATE_STUDY'],
    status: 'ACTIVE',
    battleStartedAt: '2026-07-11T00:00:00.000Z',
    defeatedAt: null,
    ...overrides,
  };
}

describe('boss-engine: damage', () => {
  it('deals base damage for a non-weakness activity', () => {
    const boss = makeBoss();
    const r = calculateBossDamage(boss, { activityType: 'WORKOUT' });
    expect(r.damage).toBeGreaterThan(0);
    expect(r.isCritical).toBe(false);
    expect(r.hpAfter).toBe(boss.currentHp - r.damage);
  });

  it('critical-hits weakness activities for more damage', () => {
    const boss = makeBoss();
    const normal = calculateBossDamage(makeBoss({ weakness: [] }), { activityType: 'DEEP_WORK' });
    const crit = calculateBossDamage(boss, { activityType: 'DEEP_WORK' });
    expect(crit.isCritical).toBe(true);
    expect(crit.damage).toBeGreaterThan(normal.damage);
  });

  it('never lets HP go below zero', () => {
    const boss = makeBoss({ currentHp: 3 });
    const r = calculateBossDamage(boss, { activityType: 'WORKOUT', scale: 100 });
    expect(r.hpAfter).toBe(0);
    expect(r.defeated).toBe(true);
    expect(r.damage).toBeLessThanOrEqual(3);
  });

  it('scales damage with the scale factor', () => {
    const boss = makeBoss();
    const one = calculateBossDamage(boss, { activityType: 'GATE_STUDY', scale: 1 });
    const three = calculateBossDamage(boss, { activityType: 'GATE_STUDY', scale: 3 });
    expect(three.damage).toBeGreaterThan(one.damage);
  });
});

describe('boss-engine: applyDamage & phases', () => {
  it('marks the boss defeated at 0 HP', () => {
    const boss = makeBoss({ currentHp: 10 });
    const result = calculateBossDamage(boss, { activityType: 'DEEP_WORK', scale: 50 });
    const updated = applyDamage(boss, result);
    expect(updated.currentHp).toBe(0);
    expect(updated.status).toBe('DEFEATED');
    expect(updated.defeatedAt).not.toBeNull();
  });

  it('phase increases as HP drops, clamped to sane range', () => {
    const full = getBossPhase(200, 200);
    const half = getBossPhase(100, 200);
    const low = getBossPhase(1, 200);
    expect(full).toBeGreaterThanOrEqual(1);
    expect(low).toBeGreaterThanOrEqual(full);
    expect(half).toBeGreaterThanOrEqual(full);
  });
});

describe('boss-engine: recovery', () => {
  it('recovers HP after failed missions but never exceeds max', () => {
    const boss = makeBoss({ currentHp: 195, maxHp: 200 });
    const r = calculateBossRecovery(boss, { failedMissionsToday: 10, recoveryAppliedToday: 0 });
    expect(r.newHp).toBeLessThanOrEqual(200);
    expect(r.newHp).toBeGreaterThanOrEqual(195);
  });

  it('does not recover when no missions failed', () => {
    const boss = makeBoss({ currentHp: 100 });
    const r = calculateBossRecovery(boss, { failedMissionsToday: 0, recoveryAppliedToday: 0 });
    expect(r.hpRecovered).toBe(0);
    expect(r.newHp).toBe(100);
  });

  it('respects the daily recovery cap', () => {
    const boss = makeBoss({ currentHp: 50 });
    const r = calculateBossRecovery(boss, { failedMissionsToday: 100, recoveryAppliedToday: 9999 });
    expect(r.hpRecovered).toBe(0);
  });

  it('does not recover a non-active boss', () => {
    const boss = makeBoss({ status: 'DEFEATED', currentHp: 0 });
    const r = calculateBossRecovery(boss, { failedMissionsToday: 5, recoveryAppliedToday: 0 });
    expect(r.hpRecovered).toBe(0);
  });
});

describe('boss-engine: todaysDamage', () => {
  it('sums only today log entries', () => {
    const logs: BossLogEntry[] = [
      { id: '1', bossId: 'x', activityType: 'DSA', damage: 5, isCritical: false, hpAfter: 100, createdAt: '2026-07-11T10:00:00.000Z' },
      { id: '2', bossId: 'x', activityType: 'DSA', damage: 7, isCritical: false, hpAfter: 93, createdAt: '2026-07-11T12:00:00.000Z' },
      { id: '3', bossId: 'x', activityType: 'DSA', damage: 9, isCritical: false, hpAfter: 84, createdAt: '2026-07-10T12:00:00.000Z' },
    ];
    expect(todaysDamage(logs, '2026-07-11')).toBe(12);
  });
});
