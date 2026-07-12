import { computePerformance, statusFromScore, PERF_WEIGHTS } from '../performance-engine';
import type { PerformanceInput } from '../performance-engine';

function uniform(v: number): PerformanceInput {
  const w = { recent7: v, previous23: v };
  return { discipline: w, knowledge: w, physical: w, focus: w, recovery: w };
}

describe('performance-engine', () => {
  it('weights sum to 1', () => {
    const sum = Object.values(PERF_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('uniform 100 across categories => 100', () => {
    expect(computePerformance(uniform(100)).total).toBe(100);
  });

  it('uniform 0 => 0', () => {
    expect(computePerformance(uniform(0)).total).toBe(0);
  });

  it('clamps within 0..100', () => {
    const r = computePerformance(uniform(100));
    Object.values(r.categories).forEach((c) => {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(100);
    });
  });

  it('recent days are weighted more than previous days', () => {
    // recent 100, previous 0 should score well above the flat average (50).
    const w = { recent7: 100, previous23: 0 };
    const input: PerformanceInput = {
      discipline: w, knowledge: w, physical: w, focus: w, recovery: w,
    };
    const score = computePerformance(input).total;
    expect(score).toBeGreaterThan(50); // 65% weight on recent
  });

  it('one bad day does not collapse a strong 30-day window', () => {
    // Strong previous window, single weak recent day dragging recent7 down a bit.
    const w = { recent7: 80, previous23: 90 };
    const input: PerformanceInput = {
      discipline: w, knowledge: w, physical: w, focus: w, recovery: w,
    };
    expect(computePerformance(input).total).toBeGreaterThanOrEqual(80);
  });

  it('maps scores to status bands', () => {
    expect(statusFromScore(90)).toBe('ASCENDING');
    expect(statusFromScore(72)).toBe('STABLE');
    expect(statusFromScore(55)).toBe('FLUCTUATING');
    expect(statusFromScore(35)).toBe('UNSTABLE');
    expect(statusFromScore(10)).toBe('CRITICAL');
  });
});
