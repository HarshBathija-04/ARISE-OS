import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Swords, ArrowRight } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { MissionCard } from '@/components/missions/MissionCard';
import { colors, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { todaysMissions, dailyCompletionRate } from '@/store/selectors';
import { systemDateLabel } from '@/utils/date';

export default function QuestsScreen() {
  const router = useRouter();
  const missions = useGameStore((s) => s.missions);
  const ensureToday = useGameStore((s) => s.ensureToday);

  const today = useMemo(() => todaysMissions(missions), [missions]);
  const rate = useMemo(() => dailyCompletionRate(missions), [missions]);

  const active = today.filter((m) => m.status === 'ACTIVE');
  const available = today.filter((m) => m.status === 'AVAILABLE');
  const completed = today.filter((m) => m.status === 'COMPLETED');
  const failed = today.filter((m) => m.status === 'FAILED' || m.status === 'EXPIRED');

  const dailyTotal = today.filter((m) => m.type === 'DAILY').length;
  const dailyDone = today.filter((m) => m.type === 'DAILY' && m.status === 'COMPLETED').length;

  // The next thing to act on — powers the docked thumb-zone action.
  const next = active[0] ?? available[0] ?? null;

  const pill = (
    <View style={styles.pill}>
      <Text variant="label" color={colors.phantomCyan}>{Math.round(rate * 100)}%</Text>
    </View>
  );

  const footer = next ? (
    <Button
      label={active.length > 0 ? 'CONTINUE MISSION' : 'START NEXT MISSION'}
      size="lg"
      full
      haptic="heavy"
      iconRight
      icon={<ArrowRight size={18} color={colors.white} />}
      onPress={() => router.push(`/mission/${next.id}`)}
    />
  ) : undefined;

  return (
    <Screen
      scroll
      onRefresh={ensureToday}
      refreshing={false}
      title="MISSIONS"
      subtitle={systemDateLabel()}
      accent={colors.phantomCyan}
      headerRight={pill}
      footer={footer}
    >
      {today.length > 0 && (
        <View style={styles.progressBlock}>
          <ProgressBar progress={rate} color={colors.phantomCyan} height={7} segmented />
          <Text variant="caption" color={colors.textDim} style={styles.progressLabel}>
            {dailyDone}/{dailyTotal} DAILY CLEARED
          </Text>
        </View>
      )}

      {today.length === 0 && (
        <EmptyState
          icon={<Swords size={22} color={colors.phantomCyan} />}
          title="NO MISSIONS YET"
          hint="Pull down to refresh and the System will generate today's objectives."
          accent={colors.phantomCyan}
        />
      )}

      {active.length > 0 && (
        <Section title="ACTIVE" accent={colors.systemBlue} items={active} />
      )}
      {available.length > 0 && (
        <Section title="AVAILABLE" accent={colors.phantomCyan} items={available} />
      )}
      {completed.length > 0 && (
        <Section title="COMPLETED" accent={colors.green} items={completed} />
      )}
      {failed.length > 0 && (
        <Section title="FAILED" accent={colors.crimson} items={failed} />
      )}
    </Screen>
  );
}

function Section({ title, accent, items }: { title: string; accent: string; items: React.ComponentProps<typeof MissionCard>['mission'][] }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={`${title}  ·  ${items.length}`} accent={accent} />
      <View style={styles.list}>
        {items.map((m) => <MissionCard key={m.id} mission={m} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: withAlpha(colors.phantomCyan, 0.4),
    backgroundColor: withAlpha(colors.phantomCyan, 0.08),
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    // Subtle glow
    shadowColor: colors.phantomCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  progressBlock: { gap: 6, marginTop: spacing.sm, marginBottom: spacing.xs },
  progressLabel: { alignSelf: 'flex-end' },
  section: { marginTop: spacing.lg },
  list: { gap: spacing.sm },
});
