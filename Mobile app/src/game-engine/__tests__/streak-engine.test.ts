import {
  createInitialStreaks, recordStreakSuccess, recordStreakFailure,
  updateShieldState, consumeShield, createInitialShieldState,
  MAX_SHIELDS, SHIELD_EARN_THRESHOLD,
} from '../streak-engine';
import type { Streak } from '@/types';

function streak(overrides: Partial<Streak> = {}): Streak {
  return {
    code: 'WAKE', label: 'WAKE STREAK', currentStreak: 0, longestStreak: 0,
    lastSuccessDate: null, lastFailureDate: null, shielded: false, ...overrides,
  };
}

describe('streak-engine: init', () => {
  it('creates all 8 streaks at zero', () => {
    const streaks = createInitialStreaks();
    expect(streaks).toHaveLength(8);
    expect(streaks.every((s) => s.currentStreak === 0)).toBe(true);
  });
});

describe('streak-engine: success', () => {
  it('increments the streak and updates longest', () => {
    const r = recordStreakSuccess(streak({ currentStreak: 4, longestStreak: 4 }), '2026-07-11');
    expect(r.streak.currentStreak).toBe(5);
    expect(r.streak.longestStreak).toBe(5);
  });

  it('is idempotent for the same day', () => {
    const r = recordStreakSuccess(streak({ currentStreak: 3, lastSuccessDate: '2026-07-11' }), '2026-07-11');
    expect(r.streak.currentStreak).toBe(3);
  });

  it('flags milestones', () => {
    const r = recordStreakSuccess(streak({ currentStreak: 6 }), '2026-07-11');
    expect(r.milestone).toBe(7);
  });
});

describe('streak-engine: failure & shields', () => {
  it('resets the streak on failure with no shield', () => {
    const r = recordStreakFailure(streak({ currentStreak: 9 }), '2026-07-11', {
      allowShield: true, shieldAvailable: false,
    });
    expect(r.wasReset).toBe(true);
    expect(r.streak.currentStreak).toBe(0);
  });

  it('protects the streak when a shield is available', () => {
    const r = recordStreakFailure(streak({ currentStreak: 9 }), '2026-07-11', {
      allowShield: true, shieldAvailable: true,
    });
    expect(r.shieldUsed).toBe(true);
    expect(r.wasReset).toBe(false);
    expect(r.streak.currentStreak).toBe(9);
  });
});

describe('streak-engine: shield economy', () => {
  it('earns a shield after the threshold of exceptional days', () => {
    let state = createInitialShieldState();
    for (let i = 0; i < SHIELD_EARN_THRESHOLD; i++) state = updateShieldState(state, true);
    expect(state.count).toBe(1);
    expect(state.exceptionalDays).toBe(0);
  });

  it('resets exceptional-day counter on a non-exceptional day', () => {
    let state = updateShieldState(createInitialShieldState(), true);
    state = updateShieldState(state, false);
    expect(state.exceptionalDays).toBe(0);
  });

  it('never exceeds the max shields', () => {
    let state = createInitialShieldState();
    for (let i = 0; i < SHIELD_EARN_THRESHOLD * (MAX_SHIELDS + 3); i++) {
      state = updateShieldState(state, true);
    }
    expect(state.count).toBeLessThanOrEqual(MAX_SHIELDS);
  });

  it('consuming a shield decrements count, or returns null if none', () => {
    expect(consumeShield({ count: 0, exceptionalDays: 0 })).toBeNull();
    const after = consumeShield({ count: 2, exceptionalDays: 0 });
    expect(after?.count).toBe(1);
  });
});
