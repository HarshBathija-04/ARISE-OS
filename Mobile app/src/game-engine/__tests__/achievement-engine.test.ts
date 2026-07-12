import { evaluateAchievements, createInitialMetrics } from '../achievement-engine';
import { ALL_ACHIEVEMENTS } from '@/constants/achievements';

describe('achievement-engine', () => {
  it('has 100+ achievement definitions', () => {
    expect(ALL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(100);
  });

  it('unlocks nothing at zero metrics except zero-threshold achievements', () => {
    const unlocks = evaluateAchievements(createInitialMetrics(), new Set());
    // No achievement should have threshold 0 in our catalog; expect none unlock.
    expect(unlocks.length).toBe(0);
  });

  it('unlocks FIRST SIGNAL after the first mission', () => {
    const m = createInitialMetrics();
    m.missions_completed = 1;
    const unlocks = evaluateAchievements(m, new Set());
    expect(unlocks.some((u) => u.achievement.key === 'first_signal')).toBe(true);
  });

  it('does not re-unlock already unlocked achievements', () => {
    const m = createInitialMetrics();
    m.missions_completed = 1;
    const unlocks = evaluateAchievements(m, new Set(['first_signal']));
    expect(unlocks.some((u) => u.achievement.key === 'first_signal')).toBe(false);
  });

  it('unlocks level milestones cumulatively', () => {
    const m = createInitialMetrics();
    m.level = 10;
    const unlocks = evaluateAchievements(m, new Set());
    const keys = unlocks.map((u) => u.achievement.key);
    expect(keys).toContain('awakening'); // L5
    expect(keys).toContain('ascension_begins'); // L10
  });

  it('unlocks DSA tiers at thresholds', () => {
    const m = createInitialMetrics();
    m.dsa_problems = 100;
    const keys = evaluateAchievements(m, new Set()).map((u) => u.achievement.key);
    expect(keys).toContain('algorithm_hunter');
    expect(keys).not.toContain('algorithm_slayer'); // needs 500
  });

  it('every achievement has a positive threshold and known rarity', () => {
    const rarities = new Set(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
    for (const a of ALL_ACHIEVEMENTS) {
      expect(a.threshold).toBeGreaterThan(0);
      expect(rarities.has(a.rarity)).toBe(true);
    }
  });

  it('achievement keys are unique', () => {
    const keys = ALL_ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
