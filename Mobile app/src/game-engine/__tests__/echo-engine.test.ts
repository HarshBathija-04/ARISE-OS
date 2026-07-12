import {
  buildMorningReport, buildEveningReport, buildWeeklyReport,
  toNarrationRequest, type EchoSnapshot,
} from '../echo-engine';
import { MockAIProvider } from '../../services/ai/MockAIProvider';
import type {
  Mission, FocusSession, Streak, PerformanceScore, SystemEvent,
} from '@/types';
import { nowIso, todayIso, daysAgoKey } from '@/utils/date';

const TODAY = todayIso();
const NOW = nowIso();

function mission(over: Partial<Mission> = {}): Mission {
  return {
    id: `m_${Math.round(over.xpReward ?? 0)}_${over.status ?? 'A'}_${over.title ?? ''}`,
    title: 'OBJECTIVE',
    description: '',
    type: 'DAILY',
    difficulty: 'C',
    category: 'GATE',
    status: 'AVAILABLE',
    objectiveType: 'BOOLEAN',
    targetValue: 1,
    currentProgress: 0,
    xpReward: 100,
    coinReward: 10,
    attributeRewards: [],
    activityType: 'GATE_STUDY',
    startDate: null,
    deadline: null,
    completedAt: null,
    failureConsequence: null,
    verificationType: 'MANUAL',
    bossId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function focus(over: Partial<FocusSession> = {}): FocusSession {
  return {
    id: `f_${over.activeSeconds ?? 0}`,
    category: 'GATE',
    objective: 'study',
    plannedMinutes: 50,
    activeSeconds: 3000,
    result: 'COMPLETED',
    xpAwarded: 120,
    startedAt: NOW,
    endedAt: NOW,
    ...over,
  };
}

function streak(over: Partial<Streak> = {}): Streak {
  return {
    code: 'GATE',
    label: 'GATE PREP',
    currentStreak: 5,
    longestStreak: 10,
    lastSuccessDate: TODAY,
    lastFailureDate: null,
    shielded: false,
    ...over,
  };
}

const PERF: PerformanceScore = {
  total: 62,
  status: 'FLUCTUATING',
  categories: { discipline: 70, knowledge: 80, physical: 40, focus: 55, recovery: 65 },
};

function snapshot(over: Partial<EchoSnapshot> = {}): EchoSnapshot {
  return {
    date: TODAY,
    generatedAt: NOW,
    profile: {
      displayName: 'Harsh', level: 12, rank: 'AWAKENED', lifetimeXp: 5000, coins: 200,
      privacyMode: false, sleepTargetHours: 6, wakeTarget: '05:00',
    },
    performance: PERF,
    missions: [],
    focusSessions: [],
    streaks: [],
    attributes: [],
    events: [],
    dailyXp: 0,
    ...over,
  };
}

describe('echo-engine · morning', () => {
  it('counts pending dailies and produces recommendations', () => {
    const snap = snapshot({
      missions: [
        mission({ status: 'AVAILABLE', xpReward: 300, title: 'HIGH' }),
        mission({ status: 'AVAILABLE', xpReward: 100, title: 'LOW' }),
        mission({ status: 'COMPLETED', xpReward: 50, title: 'DONE' }),
      ],
    });
    const r = buildMorningReport(snap);
    expect(r.kind).toBe('MORNING');
    expect(r.metrics.find((m) => m.label === 'PENDING')?.value).toBe('2');
    expect(r.recommendations.length).toBeGreaterThan(0);
    // Highest-value mission should be recommended before the lower one.
    const titles = r.recommendations.map((x) => x.title);
    expect(titles.indexOf('HIGH')).toBeLessThan(titles.indexOf('LOW'));
  });

  it('flags streaks that need action today', () => {
    const snap = snapshot({
      streaks: [
        streak({ code: 'WAKE', label: 'WAKE 5AM', currentStreak: 8, lastSuccessDate: daysAgoKey(1) }),
        streak({ code: 'DSA', label: 'DSA', currentStreak: 3, lastSuccessDate: TODAY }),
      ],
    });
    const r = buildMorningReport(snap);
    expect(r.metrics.find((m) => m.label === 'STREAKS AT RISK')?.value).toBe('1');
    expect(r.recommendations[0].title).toContain('WAKE 5AM');
  });

  it('identifies the weakest performance category', () => {
    const r = buildMorningReport(snapshot());
    const weak = r.insights.find((i) => i.label === 'WEAK VECTOR');
    expect(weak?.text).toContain('PHYSICAL'); // 40 is lowest in PERF
  });
});

describe('echo-engine · evening', () => {
  it('computes completion rate and XP today', () => {
    const snap = snapshot({
      dailyXp: 450,
      missions: [
        mission({ status: 'COMPLETED', completedAt: NOW }),
        mission({ status: 'COMPLETED', completedAt: NOW }),
        mission({ status: 'AVAILABLE' }),
        mission({ status: 'FAILED' }),
      ],
      focusSessions: [focus({ activeSeconds: 3000 })],
    });
    const r = buildEveningReport(snap);
    expect(r.metrics.find((m) => m.label === 'XP TODAY')?.value).toBe('450');
    expect(r.metrics.find((m) => m.label === 'CLEARED')?.value).toBe('2/4');
    expect(r.metrics.find((m) => m.label === 'COMPLETION')?.value).toBe('50%');
    expect(r.metrics.find((m) => m.label === 'FOCUS MIN')?.value).toBe('50');
  });

  it('warns when no focus sessions were logged', () => {
    const r = buildEveningReport(snapshot({ missions: [mission({ status: 'COMPLETED', completedAt: NOW })] }));
    const deep = r.insights.find((i) => i.label === 'DEEP WORK');
    expect(deep?.tone).toBe('warning');
  });
});

describe('echo-engine · weekly', () => {
  it('aggregates missions, focus and active days over 7 days', () => {
    const recentEvent = (day: number): SystemEvent => ({
      id: `e${day}`, type: 'SYSTEM', title: 't', detail: 'd',
      createdAt: `${daysAgoKey(day)}T10:00:00.000Z`,
    });
    const snap = snapshot({
      missions: [
        mission({ status: 'COMPLETED', completedAt: `${daysAgoKey(1)}T10:00:00.000Z`, xpReward: 100 }),
        mission({ status: 'COMPLETED', completedAt: `${daysAgoKey(2)}T10:00:00.000Z`, xpReward: 100 }),
        // Outside the window — should be excluded.
        mission({ status: 'COMPLETED', completedAt: `${daysAgoKey(20)}T10:00:00.000Z`, xpReward: 100 }),
      ],
      focusSessions: [focus({ activeSeconds: 3600, endedAt: `${daysAgoKey(1)}T11:00:00.000Z`, xpAwarded: 100 })],
      events: [recentEvent(0), recentEvent(1), recentEvent(2)],
    });
    const r = buildWeeklyReport(snap);
    expect(r.metrics.find((m) => m.label === 'MISSIONS/WK')?.value).toBe('2');
    expect(r.metrics.find((m) => m.label === 'ACTIVE DAYS')?.value).toBe('3/7');
    expect(r.metrics.find((m) => m.label === 'FOCUS HRS')?.value).toBe('1.0');
  });
});

describe('echo-engine · privacy', () => {
  it('never surfaces sensitive shadow-habit names', () => {
    const snap = snapshot({
      streaks: [streak({ code: 'SHADOW_CONTROL', label: 'SHADOW CONTROL', currentStreak: 4 })],
    });
    const reports = [buildMorningReport(snap), buildEveningReport(snap), buildWeeklyReport(snap)];
    const blob = JSON.stringify(reports).toUpperCase();
    for (const banned of ['PORNOGRAPHY', 'MASTURBATION']) {
      expect(blob).not.toContain(banned);
    }
  });
});

describe('MockAIProvider', () => {
  it('narrates from the fact sheet, offline, referencing real facts', async () => {
    const report = buildMorningReport(
      snapshot({ missions: [mission({ status: 'AVAILABLE', xpReward: 300, title: 'HIGH' })] }),
    );
    const provider = new MockAIProvider();
    const res = await provider.narrate(toNarrationRequest(report));
    expect(res.offline).toBe(true);
    expect(res.provider).toBe('mock');
    expect(res.text.length).toBeGreaterThan(20);
    expect(res.text).toContain('PENDING'); // metric label surfaced in readout
  });
});
