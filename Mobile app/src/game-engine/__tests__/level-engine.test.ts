import {
  getXPRequirement,
  getLevelFromLifetimeXP,
  getLevelProgress,
  getRankFromLevel,
  processLevelIncrease,
  getCumulativeXP,
  TOTAL_XP_TO_MAX,
} from '../level-engine';
import { MAX_LEVEL } from '@/constants/ranks';

describe('level-engine: XP curve', () => {
  it('level 1 requires a small, welcoming amount', () => {
    expect(getXPRequirement(1)).toBe(Math.round(10 * Math.pow(1, 1.55)) + 10);
    expect(getXPRequirement(1)).toBeLessThan(50);
  });

  it('is monotonically increasing across levels', () => {
    for (let l = 1; l < MAX_LEVEL - 1; l++) {
      expect(getXPRequirement(l + 1)).toBeGreaterThan(getXPRequirement(l));
    }
  });

  it('level 100 requires no further XP (max level)', () => {
    expect(getXPRequirement(MAX_LEVEL)).toBe(0);
  });

  it('total XP to max is tuned to ~1yr+ of consistency (450k-650k band)', () => {
    expect(TOTAL_XP_TO_MAX).toBeGreaterThan(450_000);
    expect(TOTAL_XP_TO_MAX).toBeLessThan(650_000);
  });
});

describe('level-engine: level from XP', () => {
  it('0 XP => level 1', () => {
    expect(getLevelFromLifetimeXP(0)).toBe(1);
  });

  it('negative XP clamps to level 1', () => {
    expect(getLevelFromLifetimeXP(-9999)).toBe(1);
  });

  it('exactly the cumulative threshold lands on that level', () => {
    for (const l of [2, 5, 10, 25, 50, 99, 100]) {
      expect(getLevelFromLifetimeXP(getCumulativeXP(l))).toBe(l);
    }
  });

  it('one below a threshold stays on the previous level', () => {
    for (const l of [2, 10, 50, 100]) {
      expect(getLevelFromLifetimeXP(getCumulativeXP(l) - 1)).toBe(l - 1);
    }
  });

  it('huge XP caps at level 100', () => {
    expect(getLevelFromLifetimeXP(999_999_999)).toBe(MAX_LEVEL);
  });
});

describe('level-engine: ranks', () => {
  it('maps level bands to correct ranks', () => {
    expect(getRankFromLevel(1)).toBe('INITIATE');
    expect(getRankFromLevel(10)).toBe('INITIATE');
    expect(getRankFromLevel(11)).toBe('AWAKENED');
    expect(getRankFromLevel(21)).toBe('VANGUARD');
    expect(getRankFromLevel(36)).toBe('ASCENDANT');
    expect(getRankFromLevel(51)).toBe('ELITE');
    expect(getRankFromLevel(66)).toBe('APEX');
    expect(getRankFromLevel(81)).toBe('TRANSCENDENT');
    expect(getRankFromLevel(91)).toBe('PARAGON');
    expect(getRankFromLevel(100)).toBe('SOVEREIGN');
  });
});

describe('level-engine: progress', () => {
  it('progress is 0..1 and consistent with thresholds', () => {
    const p = getLevelProgress(getCumulativeXP(5));
    expect(p.level).toBe(5);
    expect(p.currentXpIntoLevel).toBe(0);
    expect(p.progress).toBe(0);
    expect(p.xpForThisLevel).toBe(getXPRequirement(5));
  });

  it('mid-level progress is fractional', () => {
    const floor = getCumulativeXP(5);
    const half = Math.floor(getXPRequirement(5) / 2);
    const p = getLevelProgress(floor + half);
    expect(p.progress).toBeGreaterThan(0.4);
    expect(p.progress).toBeLessThan(0.6);
  });

  it('max level reports progress 1 and isMax', () => {
    const p = getLevelProgress(TOTAL_XP_TO_MAX + 5000);
    expect(p.isMax).toBe(true);
    expect(p.progress).toBe(1);
  });
});

describe('level-engine: processLevelIncrease', () => {
  it('awards a single level when crossing one threshold', () => {
    const start = getCumulativeXP(3);
    const r = processLevelIncrease(start, getXPRequirement(3));
    expect(r.oldLevel).toBe(3);
    expect(r.newLevel).toBe(4);
    expect(r.levelsGained).toBe(1);
  });

  it('supports multiple level increases from one large award', () => {
    const r = processLevelIncrease(0, getCumulativeXP(6));
    expect(r.oldLevel).toBe(1);
    expect(r.newLevel).toBe(6);
    expect(r.levelsGained).toBe(5);
  });

  it('detects rank changes', () => {
    const r = processLevelIncrease(getCumulativeXP(10), getXPRequirement(10));
    expect(r.newLevel).toBe(11);
    expect(r.rankChanged).toBe(true);
    expect(r.newRank).toBe('AWAKENED');
  });

  it('never produces negative XP', () => {
    const r = processLevelIncrease(100, -100000);
    expect(r.newLifetimeXp).toBe(0);
    expect(r.newLevel).toBe(1);
  });

  it('never exceeds level 100', () => {
    const r = processLevelIncrease(TOTAL_XP_TO_MAX, 10_000_000);
    expect(r.newLevel).toBe(MAX_LEVEL);
  });
});
