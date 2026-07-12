import { computeFocusXp, estimateFocusXp } from '../focus-engine';
import { FOCUS_MIN_ACTIVE_SECONDS } from '../anti-farming-engine';

describe('focus-engine', () => {
  it('awards zero XP for sessions under the minimum active time', () => {
    const r = computeFocusXp('GATE', {
      activeSeconds: FOCUS_MIN_ACTIVE_SECONDS - 1,
      result: 'COMPLETED',
      sessionsToday: 0,
      focusXpToday: 0,
    });
    expect(r.xp).toBe(0);
    expect(r.attributeRewards).toEqual([]);
  });

  it('scales XP with actual active minutes', () => {
    const short = computeFocusXp('GATE', { activeSeconds: 25 * 60, result: 'COMPLETED', sessionsToday: 0, focusXpToday: 0 });
    const long = computeFocusXp('GATE', { activeSeconds: 90 * 60, result: 'COMPLETED', sessionsToday: 0, focusXpToday: 0 });
    expect(long.xp).toBeGreaterThan(short.xp);
  });

  it('reduces XP for partial / not-completed objectives', () => {
    const done = computeFocusXp('DSA', { activeSeconds: 50 * 60, result: 'COMPLETED', sessionsToday: 0, focusXpToday: 0 });
    const partial = computeFocusXp('DSA', { activeSeconds: 50 * 60, result: 'PARTIAL', sessionsToday: 0, focusXpToday: 0 });
    const none = computeFocusXp('DSA', { activeSeconds: 50 * 60, result: 'NOT_COMPLETED', sessionsToday: 0, focusXpToday: 0 });
    expect(partial.xp).toBeLessThan(done.xp);
    expect(none.xp).toBeLessThan(partial.xp);
  });

  it('applies diminishing returns to repeated sessions', () => {
    const first = computeFocusXp('GATE', { activeSeconds: 50 * 60, result: 'COMPLETED', sessionsToday: 0, focusXpToday: 0 });
    const fourth = computeFocusXp('GATE', { activeSeconds: 50 * 60, result: 'COMPLETED', sessionsToday: 3, focusXpToday: 0 });
    expect(fourth.xp).toBeLessThan(first.xp);
  });

  it('caps daily focus XP', () => {
    const r = computeFocusXp('GATE', {
      activeSeconds: 90 * 60, result: 'COMPLETED', sessionsToday: 0, focusXpToday: 600,
    });
    // heavy decay past the cap
    expect(r.xp).toBeLessThan(90);
    expect(r.note).toMatch(/cap/i);
  });

  it('distributes attribute rewards for the category', () => {
    const r = computeFocusXp('DSA', { activeSeconds: 50 * 60, result: 'COMPLETED', sessionsToday: 0, focusXpToday: 0 });
    const codes = r.attributeRewards.map((a) => a.code);
    expect(codes).toEqual(expect.arrayContaining(['INT', 'SKL']));
  });

  it('estimate is positive for a normal planned session', () => {
    expect(estimateFocusXp(50, 0)).toBeGreaterThan(0);
  });
});
