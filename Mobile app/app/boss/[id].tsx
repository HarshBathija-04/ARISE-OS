import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Swords, Zap, Clock } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useBossStore } from '@/store/bossStore';
import { getBossDef } from '@/constants/bosses';
import { useMemo } from 'react';

export default function BossDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const bosses = useBossStore((s) => s.bosses);
  const logs = useBossStore((s) => s.logs);
  const getTodaysDamage = useBossStore((s) => s.getTodaysDamage);

  const boss = bosses.find((b) => b.id === id);
  const def = id ? getBossDef(id) : undefined;
  const bossLogs = useMemo(
    () => logs.filter((l) => l.bossId === id).slice(0, 20),
    [logs, id],
  );
  const todayDmg = id ? getTodaysDamage(id) : 0;

  if (!boss || !def) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text variant="label" color={colors.crimson}>BOSS NOT FOUND</Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>
    );
  }

  const hpRatio = boss.maxHp > 0 ? boss.currentHp / boss.maxHp : 0;
  const isDefeated = boss.status === 'DEFEATED';
  const accent = isDefeated ? colors.green : colors.crimson;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={accent}>BOSS ENCOUNTER</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Name & status */}
        <View style={styles.nameSection}>
          <Text variant="title" color={accent} glowColor={withAlpha(accent, 0.4)}>
            {boss.name}
          </Text>
          <Text variant="caption" color={isDefeated ? colors.green : colors.gold}>
            {isDefeated ? 'DEFEATED' : `PHASE ${boss.phase}`}
          </Text>
        </View>

        <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          {boss.description}
        </Text>

        {/* HP */}
        <Panel label="BOSS HP" accent={accent} style={{ marginTop: spacing.lg }}>
          <View style={styles.hpHeader}>
            <Text variant="readout" color={accent}>
              {boss.currentHp}
            </Text>
            <Text variant="heading" color={colors.textDim}>
              / {boss.maxHp}
            </Text>
          </View>
          <ProgressBar
            progress={hpRatio}
            color={isDefeated ? colors.green : hpRatio > 0.5 ? colors.crimson : hpRatio > 0.25 ? colors.gold : colors.energyBright}
            height={8}
          />
          <View style={styles.hpStats}>
            <View>
              <Text variant="caption" color={colors.textDim}>TODAY&apos;S DMG</Text>
              <Text variant="mono" color={colors.cyan}>{todayDmg}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" color={colors.textDim}>TOTAL DMG</Text>
              <Text variant="mono" color={colors.text}>{boss.maxHp - boss.currentHp}</Text>
            </View>
          </View>
        </Panel>

        {/* Info */}
        <Panel label="INTEL" accent={colors.energy} style={{ marginTop: spacing.md }}>
          <View style={styles.infoGrid}>
            <InfoRow label="OBJECTIVE" value={def.objective} />
            <InfoRow label="WEAKNESS" value={def.weaknessDesc} accent={colors.energyBright} />
            <InfoRow label="DURATION" value={`~${def.battleDays} days`} />
          </View>
        </Panel>

        {/* Battle log */}
        <SectionHeader title="BATTLE LOG" accent={colors.crimson} />
        {bossLogs.length === 0 ? (
          <Panel>
            <Text dim>No damage dealt yet. Complete missions to deal boss damage.</Text>
          </Panel>
        ) : (
          <View style={styles.logList}>
            {bossLogs.map((log) => (
              <View key={log.id} style={styles.logEntry}>
                <View style={styles.logIcon}>
                  {log.isCritical ? (
                    <Zap size={14} color={colors.gold} />
                  ) : (
                    <Swords size={14} color={colors.crimson} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="mono" color={log.isCritical ? colors.gold : colors.text}>
                    {log.isCritical ? 'CRITICAL! ' : ''}-{log.damage} DMG
                  </Text>
                  <Text variant="caption" color={colors.textDim}>
                    {log.activityType.replace(/_/g, ' ')} · HP → {log.hpAfter}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Clock size={11} color={colors.textDim} />
                  <Text variant="caption" color={colors.textDim}>
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" color={colors.textDim} style={{ width: 90 }}>{label}</Text>
      <Text variant="body" color={accent ?? colors.text} style={{ flex: 1 }}>{value}</Text>
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
  nameSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hpHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: spacing.sm },
  hpStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  infoGrid: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', gap: spacing.sm },
  logList: { gap: 1 },
  logEntry: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.md,
    marginBottom: spacing.xs,
  },
  logIcon: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.crimson, 0.12),
  },
});
