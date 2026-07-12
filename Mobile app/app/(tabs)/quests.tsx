import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MissionCard } from '@/components/missions/MissionCard';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { todaysMissions, dailyCompletionRate } from '@/store/selectors';

export default function QuestsScreen() {
  const missions = useGameStore((s) => s.missions);
  const ensureToday = useGameStore((s) => s.ensureToday);

  const today = useMemo(() => todaysMissions(missions), [missions]);
  const rate = useMemo(() => dailyCompletionRate(missions), [missions]);

  const active = today.filter((m) => m.status === 'ACTIVE');
  const available = today.filter((m) => m.status === 'AVAILABLE');
  const completed = today.filter((m) => m.status === 'COMPLETED');
  const failed = today.filter((m) => m.status === 'FAILED' || m.status === 'EXPIRED');

  return (
    <Screen scroll onRefresh={ensureToday} refreshing={false}>
      <View style={styles.head}>
        <Text variant="title" color={colors.text}>MISSIONS</Text>
        <View style={styles.pill}>
          <Text variant="caption" color={colors.cyan}>
            {Math.round(rate * 100)}% TODAY
          </Text>
        </View>
      </View>

      {today.length === 0 && (
        <Panel style={{ marginTop: spacing.base }}>
          <Text dim>No missions today. Pull to refresh to generate them.</Text>
        </Panel>
      )}

      {active.length > 0 && (
        <>
          <SectionHeader title="ACTIVE" accent={colors.energyBright} />
          <View style={styles.list}>
            {active.map((m) => <MissionCard key={m.id} mission={m} />)}
          </View>
        </>
      )}

      {available.length > 0 && (
        <>
          <SectionHeader title="AVAILABLE" accent={colors.cyan} />
          <View style={styles.list}>
            {available.map((m) => <MissionCard key={m.id} mission={m} />)}
          </View>
        </>
      )}

      {completed.length > 0 && (
        <>
          <SectionHeader title="COMPLETED" accent={colors.green} />
          <View style={styles.list}>
            {completed.map((m) => <MissionCard key={m.id} mission={m} />)}
          </View>
        </>
      )}

      {failed.length > 0 && (
        <>
          <SectionHeader title="FAILED" accent={colors.crimson} />
          <View style={styles.list}>
            {failed.map((m) => <MissionCard key={m.id} mission={m} />)}
          </View>
        </>
      )}

      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  list: { gap: spacing.sm },
});
