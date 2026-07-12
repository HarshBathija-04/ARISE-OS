import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Shield, AlertTriangle, Plus, Eye, EyeOff } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useShadowStore } from '@/store/shadowStore';
import { useGameStore } from '@/store/gameStore';
import type { ShadowHabit } from '@/types';

export default function ShadowScreen() {
  const router = useRouter();
  const habits = useShadowStore((s) => s.habits);
  const ensureSeeded = useShadowStore((s) => s.ensureSeeded);
  const activeRecovery = useShadowStore((s) => s.getActiveRecovery());
  const privacyMode = useGameStore((s) => s.profile.privacyMode);

  useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.violet}>SHADOW HABITS</Text>
        <View style={{ width: 22 }}>
          {privacyMode ? <EyeOff size={16} color={colors.violet} /> : <Eye size={16} color={colors.textDim} />}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" color={colors.textDim}>
          MONITOR AND CONTROL DESTRUCTIVE PATTERNS. NO SHAME. JUST DATA.
        </Text>

        {activeRecovery && (
          <Pressable
            style={styles.recoveryBanner}
            onPress={() => router.push('/recovery')}
          >
            <AlertTriangle size={18} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text variant="mono" color={colors.gold}>RECOVERY PROTOCOL ACTIVE</Text>
              <Text variant="caption" color={colors.textDim}>
                Tap to complete recovery objectives.
              </Text>
            </View>
          </Pressable>
        )}

        <View style={styles.list}>
          {habits.map((h) => (
            <HabitCard key={h.code} habit={h} privacyMode={privacyMode} />
          ))}
        </View>

        <Button
          label="LOG URGE"
          variant="outline"
          full
          icon={<Plus size={16} color={colors.violet} />}
          onPress={() => router.push('/shadow/log-urge')}
          style={{ marginTop: spacing.lg }}
        />

        <Pressable
          style={styles.recoveryLink}
          onPress={() => router.push('/recovery')}
        >
          <Shield size={16} color={colors.green} />
          <Text variant="mono" color={colors.textSecondary}>RECOVERY HISTORY</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HabitCard({ habit, privacyMode }: { habit: ShadowHabit; privacyMode: boolean }) {
  const label = privacyMode && habit.sensitive ? 'MONITORED HABIT' : habit.label;
  const resistRate = habit.urgesRecorded > 0
    ? Math.round((habit.urgesResisted / habit.urgesRecorded) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text variant="heading" color={colors.text}>{label}</Text>
        <View style={[styles.streakBadge, {
          borderColor: habit.currentStreak > 0 ? colors.green : colors.border
        }]}>
          <Text variant="mono" color={habit.currentStreak > 0 ? colors.green : colors.textDim}>
            {habit.currentStreak}d
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <Stat label="STREAK" value={`${habit.currentStreak}`} color={colors.green} />
        <Stat label="BEST" value={`${habit.longestStreak}`} color={colors.gold} />
        <Stat label="RESISTED" value={`${habit.urgesResisted}`} color={colors.cyan} />
        <Stat label="RESIST %" value={`${resistRate}%`} color={colors.energy} />
      </View>
      {habit.relapseCount > 0 && (
        <Text variant="caption" color={colors.textDim} style={{ marginTop: spacing.xs }}>
          {habit.relapseCount} relapse(s) recorded · System analyses patterns
        </Text>
      )}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="caption" color={colors.textDim}>{label}</Text>
      <Text variant="mono" color={color}>{value}</Text>
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
  list: { gap: spacing.sm, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakBadge: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: withAlpha(colors.border, 0.5),
  },
  recoveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: withAlpha(colors.gold, 0.08),
    borderWidth: 1, borderColor: withAlpha(colors.gold, 0.3),
    borderRadius: radius.base, padding: spacing.base, marginTop: spacing.md,
  },
  recoveryLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.md,
  },
});
