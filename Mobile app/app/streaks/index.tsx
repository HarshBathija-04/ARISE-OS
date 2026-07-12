import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Flame, Shield } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useStreakStore } from '@/store/streakStore';
import { generateHeatmapData, STREAK_DEFS } from '@/game-engine/streak-engine';
import type { Streak } from '@/types';

export default function StreaksScreen() {
  const router = useRouter();
  const streaks = useStreakStore((s) => s.streaks);
  const shields = useStreakStore((s) => s.shields);
  const successDates = useStreakStore((s) => s.successDates);
  const ensureSeeded = useStreakStore((s) => s.ensureSeeded);

  useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  // Combined heatmap from all streak success dates.
  const allDates = useMemo(() => {
    const set = new Set<string>();
    Object.values(successDates).forEach((dates) => dates.forEach((d) => set.add(d)));
    return [...set];
  }, [successDates]);

  const heatmap = useMemo(() => generateHeatmapData(allDates, 90), [allDates]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.gold}>STREAKS</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Shield status */}
        <Panel accent={colors.violet} label="STREAK SHIELDS">
          <View style={styles.shieldRow}>
            <View style={styles.shieldIcons}>
              {[0, 1, 2].map((i) => (
                <Shield
                  key={i}
                  size={24}
                  color={i < shields.count ? colors.violet : colors.textDim}
                  fill={i < shields.count ? withAlpha(colors.violet, 0.3) : 'transparent'}
                />
              ))}
            </View>
            <View>
              <Text variant="caption" color={colors.textDim}>EXCEPTIONAL DAYS</Text>
              <Text variant="mono" color={colors.violet}>
                {shields.exceptionalDays} / 7 to earn
              </Text>
            </View>
          </View>
        </Panel>

        {/* Consistency heatmap */}
        <SectionHeader title="CONSISTENCY" accent={colors.green} />
        <Panel padded={false}>
          <View style={styles.heatmapGrid}>
            {heatmap.map((day, i) => (
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
          <View style={styles.heatLegend}>
            <Text variant="caption" color={colors.textDim}>90 DAYS</Text>
            <View style={styles.heatLegendColors}>
              <Text variant="caption" color={colors.textDim}>LESS</Text>
              {[0.1, 0.3, 0.5, 0.8, 1].map((v) => (
                <View
                  key={v}
                  style={[styles.legendCell, {
                    backgroundColor: withAlpha(colors.green, 0.2 + v * 0.6),
                  }]}
                />
              ))}
              <Text variant="caption" color={colors.textDim}>MORE</Text>
            </View>
          </View>
        </Panel>

        {/* Individual streaks */}
        <SectionHeader title="ACTIVE STREAKS" accent={colors.gold} />
        <View style={styles.list}>
          {streaks.map((streak) => (
            <StreakCard key={streak.code} streak={streak} />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StreakCard({ streak }: { streak: Streak }) {
  const isActive = streak.currentStreak > 0;
  const accent = isActive ? colors.gold : colors.textDim;

  return (
    <View style={[styles.card, { borderColor: withAlpha(accent, 0.3) }]}>
      <View style={styles.cardTop}>
        <Flame size={18} color={accent} />
        <Text variant="heading" color={colors.text} style={{ flex: 1 }}>
          {streak.label}
        </Text>
        <View style={[styles.streakNum, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Text variant="readout" color={accent}>{streak.currentStreak}</Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <View>
          <Text variant="caption" color={colors.textDim}>CURRENT</Text>
          <Text variant="mono" color={accent}>{streak.currentStreak} days</Text>
        </View>
        <View>
          <Text variant="caption" color={colors.textDim}>BEST</Text>
          <Text variant="mono" color={colors.gold}>{streak.longestStreak} days</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="caption" color={colors.textDim}>SHIELD</Text>
          <Text variant="mono" color={streak.shielded ? colors.violet : colors.textDim}>
            {streak.shielded ? 'ACTIVE' : '—'}
          </Text>
        </View>
      </View>
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
  shieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  shieldIcons: { flexDirection: 'row', gap: 4 },
  heatmapGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 2,
    padding: spacing.md,
  },
  heatCell: { width: 12, height: 12, borderRadius: 2 },
  heatLegend: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  heatLegendColors: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.base,
    padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakNum: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  cardStats: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: withAlpha(colors.border, 0.5),
  },
});
