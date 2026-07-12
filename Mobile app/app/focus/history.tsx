import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { colors, radius, spacing } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { focusCategoryDef } from '@/constants/focus';

export default function FocusHistoryScreen() {
  const router = useRouter();
  const sessions = useGameStore((s) => s.focusSessions);

  const stats = useMemo(() => {
    const totalMin = Math.round(sessions.reduce((s, f) => s + f.activeSeconds, 0) / 60);
    const totalXp = sessions.reduce((s, f) => s + f.xpAwarded, 0);
    const completed = sessions.filter((s) => s.result === 'COMPLETED').length;
    return { totalMin, totalXp, count: sessions.length, completed };
  }, [sessions]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.cyan}>FOCUS HISTORY</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Panel label="TOTALS" accent={colors.cyan}>
          <View style={styles.statsRow}>
            <Stat label="SESSIONS" value={String(stats.count)} />
            <Stat label="MINUTES" value={String(stats.totalMin)} />
            <Stat label="XP" value={String(stats.totalXp)} color={colors.energyBright} />
            <Stat label="COMPLETED" value={String(stats.completed)} color={colors.green} />
          </View>
        </Panel>

        <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
          {sessions.length === 0 ? (
            <Panel><Text dim>No sessions recorded yet.</Text></Panel>
          ) : (
            sessions.map((s) => {
              const def = focusCategoryDef(s.category);
              const rc = s.result === 'COMPLETED' ? colors.green
                : s.result === 'PARTIAL' ? colors.gold : colors.crimson;
              return (
                <View key={s.id} style={styles.row}>
                  <View style={[styles.tick, { backgroundColor: def.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="mono" color={colors.text}>{def.name}</Text>
                    <Text variant="caption" color={colors.textDim}>
                      {Math.round(s.activeSeconds / 60)} min · {s.result?.replace('_', ' ') ?? '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="mono" color={colors.energyBright}>+{s.xpAwarded}</Text>
                    <View style={[styles.resultDot, { backgroundColor: rc }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
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
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { gap: 3 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.md,
  },
  tick: { width: 3, height: 28, borderRadius: 2 },
  resultDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
});
