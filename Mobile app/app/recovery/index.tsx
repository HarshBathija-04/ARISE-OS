import { useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Circle, Shield } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useShadowStore } from '@/store/shadowStore';
import { haptics } from '@/services/notifications/haptics';

export default function RecoveryScreen() {
  const router = useRouter();
  const activeRecovery = useShadowStore((s) => s.getActiveRecovery());
  const completeRecovery = useShadowStore((s) => s.completeRecovery);
  const history = useShadowStore((s) => s.getRecoveryHistory());

  const handleComplete = () => {
    if (!activeRecovery) return;
    haptics.heavy();
    completeRecovery(activeRecovery.id);
  };

  // Compute stats.
  const stats = useMemo(() => {
    const completed = history.length;
    const totalMinutes = completed * 15; // approximate
    return { completed, avgTime: '~15 min', completionRate: completed > 0 ? '100%' : '—' };
  }, [history]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.green}>RECOVERY PROTOCOL</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {activeRecovery ? (
          <>
            <Panel accent={colors.gold} label="RECOVERY PROTOCOL ACTIVATED">
              <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
                A relapse was recorded. Follow these objectives to reclaim control.
                Completing recovery provides small XP and strengthens your recovery patterns.
              </Text>

              <View style={styles.objectives}>
                {activeRecovery.objectives.map((obj, i) => (
                  <View key={i} style={styles.objRow}>
                    <Circle size={14} color={colors.green} />
                    <Text variant="body" color={colors.text} style={{ flex: 1 }}>
                      {obj}
                    </Text>
                  </View>
                ))}
              </View>
            </Panel>

            <Button
              label="RECOVERY COMPLETE"
              variant="primary"
              full
              icon={<Check size={16} color={colors.bg} />}
              onPress={handleComplete}
              style={{ marginTop: spacing.lg }}
            />
          </>
        ) : (
          <Panel accent={colors.green}>
            <Text variant="body" color={colors.textSecondary}>
              No active recovery protocol. Recovery missions appear after a shadow habit relapse.
            </Text>
          </Panel>
        )}

        {/* Recovery stats */}
        <SectionHeader title="RECOVERY ANALYSIS" accent={colors.green} />
        <Panel>
          <View style={styles.statsRow}>
            <Stat label="COMPLETED" value={String(stats.completed)} color={colors.green} />
            <Stat label="AVG TIME" value={stats.avgTime} color={colors.cyan} />
            <Stat label="RATE" value={stats.completionRate} color={colors.energy} />
          </View>
        </Panel>

        {/* History */}
        {history.length > 0 && (
          <>
            <SectionHeader title="RECOVERY HISTORY" accent={colors.textSecondary} />
            <View style={styles.histList}>
              {history.slice(0, 10).map((r) => (
                <View key={r.id} style={styles.histRow}>
                  <Shield size={14} color={colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text variant="mono" color={colors.text}>
                      {r.habitCode.replace(/_/g, ' ')}
                    </Text>
                    <Text variant="caption" color={colors.textDim}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text variant="caption" color={colors.energyBright}>
                    +{r.xpAwarded} XP
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="caption" color={colors.textDim}>{label}</Text>
      <Text variant="heading" color={color}>{value}</Text>
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
  objectives: { gap: spacing.sm },
  objRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  histList: { gap: spacing.xs },
  histRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.md,
  },
});
