import {
  attributeRequiredXp,
  createInitialAttributes,
  applyAttributeXp,
  distributeActivityXp,
  mergeAttributeRewards,
} from '../attribute-engine';

const NOW = '2026-07-11T00:00:00.000Z';

describe('attribute-engine: init', () => {
  it('creates 8 attributes at level 1', () => {
    const attrs = createInitialAttributes();
    expect(attrs).toHaveLength(8);
    expect(attrs.every((a) => a.level === 1 && a.currentXp === 0)).toBe(true);
  });
});

describe('attribute-engine: apply xp', () => {
  it('accumulates without leveling below the threshold', () => {
    const [str] = createInitialAttributes();
    const { next, levelsGained } = applyAttributeXp(str, 10, NOW);
    expect(levelsGained).toBe(0);
    expect(next.currentXp).toBe(10);
    expect(next.lifetimeXp).toBe(10);
  });

  it('levels up when crossing the requirement', () => {
    const [str] = createInitialAttributes();
    const req = attributeRequiredXp(1);
    const { next, levelsGained } = applyAttributeXp(str, req + 5, NOW);
    expect(levelsGained).toBe(1);
    expect(next.level).toBe(2);
    expect(next.currentXp).toBe(5);
    expect(next.lastIncreaseAt).toBe(NOW);
  });

  it('supports multiple attribute level-ups at once', () => {
    const [str] = createInitialAttributes();
    const big = attributeRequiredXp(1) + attributeRequiredXp(2) + attributeRequiredXp(3);
    const { next, levelsGained } = applyAttributeXp(str, big, NOW);
    expect(levelsGained).toBe(3);
    expect(next.level).toBe(4);
  });

  it('ignores non-positive xp', () => {
    const [str] = createInitialAttributes();
    expect(applyAttributeXp(str, 0, NOW).levelsGained).toBe(0);
    expect(applyAttributeXp(str, -50, NOW).next.currentXp).toBe(0);
  });
});

describe('attribute-engine: distribution', () => {
  it('distributes a workout pool to STR/END/VIT by weight', () => {
    const rewards = distributeActivityXp('WORKOUT', 100);
    const codes = rewards.map((r) => r.code).sort();
    expect(codes).toEqual(['END', 'STR', 'VIT']);
    const str = rewards.find((r) => r.code === 'STR')!;
    const vit = rewards.find((r) => r.code === 'VIT')!;
    expect(str.xp).toBeGreaterThan(vit.xp); // STR weight 3 > VIT weight 1
  });

  it('returns empty for zero pool', () => {
    expect(distributeActivityXp('WORKOUT', 0)).toEqual([]);
  });

  it('every reward is at least 1 xp', () => {
    const rewards = distributeActivityXp('DSA', 3);
    expect(rewards.every((r) => r.xp >= 1)).toBe(true);
  });
});

describe('attribute-engine: merge', () => {
  it('sums duplicate codes', () => {
    const merged = mergeAttributeRewards([
      { code: 'INT', xp: 10 },
      { code: 'INT', xp: 5 },
      { code: 'FOC', xp: 7 },
    ]);
    expect(merged.find((r) => r.code === 'INT')!.xp).toBe(15);
    expect(merged.find((r) => r.code === 'FOC')!.xp).toBe(7);
  });
});
