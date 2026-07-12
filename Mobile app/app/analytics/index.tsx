import { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, TrendingUp, Clock, Target, Dumbbell, Brain, Flame } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { useStreakStore } from '@/store/streakStore';
import { useBossStore } from '@/store/bossStore';
import { dailyCompletionRate } from '@/store/selectors';
import { generateHeatmapData } from '@/game-engine/streak-engine';

type TimeRange = '7D' | '30D' | '90D' | '1Y';

export default function AnalyticsScreen() {
  const router = useRouter();
  const [range, setRange] = useState<TimeRange>('7D');
  const profile = useGameStore((s) => s.profile);
  const missions = useGameStore((s) => s.missions);
  const focusSessions = useGameStore((s) => s.focusSessions);
  const transactions = useGameStore((s) => s.transactions);
  const events = useGameStore((s) => s.events);
  const streaks = useStreakStore((s) => s.streaks);
  const bosses = useBossStore((s) => s.bosses);
  const bossLogs = useBossStore((s) => s.logs);

  // Compute metrics.
  const metrics = useMemo(() => {
    const completed = missions.filter((m) => m.status === 'COMPLETED');
    const totalFocusMin = focusSessions.reduce((s, f) => s + f.activeSeconds / 60, 0);
    const totalXp = profile.lifetimeXp;
    const rate = dailyCompletionRate(missions);
    const bossDefeated = bosses.filter((b) => b.status === 'DEFEATED').length;
    const totalBossDmg = bossLogs.reduce((s, l) => s + l.damage, 0);
    const totalCoins = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

    return {
      missionsCompleted: completed.length,
      completionRate: Math.round(rate * 100),
      focusHours: Math.round(totalFocusMin / 60 * 10) / 10,
      focusSessions: focusSessions.length,
      xpEarned: totalXp,
      coinsEarned: totalCoins,
      bossesDefeated: bossDefeated,
      bossDamage: totalBossDmg,
      level: profile.level,
      maxStreak: Math.max(...streaks.map((s) => s.longestStreak), 0),
      workouts: completed.filter((m) => m.activityType === 'WORKOUT').length,
      dsaProblems: completed.filter((m) => m.activityType === 'DSA').reduce((s, m) => s + m.targetValue, 0),
    };
  }, [missions, focusSessions, profile, transactions, streaks, bosses, bossLogs]);

  // Heatmap from events.
  const eventDates = useMemo(() => {
    return events.map((e) => e.createdAt.slice(0, 10));
  }, [events]);
  const heatmap = useMemo(
    () => generateHeatmapData(eventDates, range === '7D' ? 7 : range === '30D' ? 30 : range === '90D' ? 90 : 365),
    [eventDates, range],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.energy}>ANALYTICS</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Time range selector */}
        <View style={styles.rangeRow}>
          {(['7D', '30D', '90D', '1Y'] as TimeRange[]).map((r) => (
            <Pressable
              key={r}
              style={[styles.rangeChip, {
                borderColor: range === r ? colors.energy : colors.border,
                backgroundColor: range === r ? withAlpha(colors.energy, 0.12) : 'transparent',
              }]}
              onPress={() => setRange(r)}
            >
              <Text variant="caption" color={range === r ? colors.energy : colors.textDim}>{r}</Text>
            </Pressable>
          ))}
        </View>

        {/* Key metrics */}
        <View style={styles.metricGrid}>
          <MetricCard icon={Target} label="MISSIONS" value={String(metrics.missionsCompleted)} color={colors.cyan} />
          <MetricCard icon={TrendingUp} label="COMPLETION" value={`${metrics.completionRate}%`} color={colors.green} />
          <MetricCard icon={Clock} label="FOCUS HOURS" value={String(metrics.focusHours)} color={colors.energy} />
          <MetricCard icon={Brain} label="DSA SOLVED" value={String(metrics.dsaProblems)} color={colors.gold} />
          <MetricCard icon={Dumbbell} label="WORKOUTS" value={String(metrics.workouts)} color={colors.crimson} />
          <MetricCard icon={Flame} label="MAX STREAK" value={`${metrics.maxStreak}d`} color={colors.violet} />
        </View>

        {/* XP & Coins */}
        <Panel label="PROGRESSION" accent={colors.energyBright} style={{ marginTop: spacing.md }}>
          <View style={styles.progRow}>
            <View>
              <Text variant="caption" color={colors.textDim}>LIFETIME XP</Text>
              <Text variant="heading" color={colors.energyBright}>{metrics.xpEarned.toLocaleString()}</Text>
            </View>
            <View>
              <Text variant="caption" color={colors.textDim}>LEVEL</Text>
              <Text variant="heading" color={colors.text}>{metrics.level}</Text>
            </View>
            <View>
              <Text variant="caption" color={colors.textDim}>COINS</Text>
              <Text variant="heading" color={colors.gold}>{metrics.coinsEarned}</Text>
            </View>
          </View>
        </Panel>

        {/* Boss stats */}
        <Panel label="BOSS ENCOUNTERS" accent={colors.crimson} style={{ marginTop: spacing.md }}>
          <View style={styles.progRow}>
            <View>
              <Text variant="caption" color={colors.textDim}>DEFEATED</Text>
              <Text variant="heading" color={colors.green}>{metrics.bossesDefeated}</Text>
            </View>
            <View>
              <Text variant="caption" color={colors.textDim}>TOTAL DMG</Text>
              <Text variant="heading" color={colors.crimson}>{metrics.bossDamage}</Text>
            </View>
            <View>
              <Text variant="caption" color={colors.textDim}>SESSIONS</Text>
              <Text variant="heading" color={colors.cyan}>{metrics.focusSessions}</Text>
            </View>
          </View>
        </Panel>

        {/* Heatmap */}
        <SectionHeader title="ACTIVITY HEATMAP" accent={colors.green} />
        <Panel padded={false}>
          <View style={styles.heatGrid}>
            {heatmap.map((day) => (
              <View
                key={day.date}
                style={[styles.heatCell, {
                  backgroundColor: day.value > 0
                    ? withAlpha(colors.green, 0.3 + day.value * 0.5)
                    : colors.surface2,
                }]}
              />
            ))}
          </View>
        </Panel>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: withAlpha(color, 0.2) }]}>
      <Icon size={16} color={color} />
      <Text variant="readout" color={color}>{value}</Text>
      <Text variant="caption" color={colors.textDim}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  content: { padding: spacing.base },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  rangeChip: {
    flex: 1, borderWidth: 1, borderRadius: radius.sm,
    alignItems: 'center', paddingVertical: 8,
  },
  metricGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginTop: spacing.md,
  },
  metricCard: {
    width: '31%', backgroundColor: colors.surface, borderWidth: 1,
    borderRadius: radius.base, padding: spacing.md,
    alignItems: 'center', gap: 4,
  },
  progRow: { flexDirection: 'row', justifyContent: 'space-around' },
  heatGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 2,
    padding: spacing.md,
  },
  heatCell: { width: 12, height: 12, borderRadius: 2 },
});
