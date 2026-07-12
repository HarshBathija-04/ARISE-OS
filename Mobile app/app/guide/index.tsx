import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bot, Sunrise, Moon, BarChart3, RefreshCw } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing, radius, withAlpha } from '@/theme';
import type { InsightTone } from '@/services/ai/types';
import { useEchoStore, type StoredEchoReport } from '@/store/echoStore';
import { useGameStore } from '@/store/gameStore';
import { useStreakStore } from '@/store/streakStore';

type Tab = 'MORNING' | 'EVENING' | 'WEEKLY';

const TABS: { key: Tab; label: string; icon: any; accent: string }[] = [
  { key: 'MORNING', label: 'MORNING', icon: Sunrise, accent: colors.gold },
  { key: 'EVENING', label: 'EVENING', icon: Moon, accent: colors.violet },
  { key: 'WEEKLY', label: 'ANALYSIS', icon: BarChart3, accent: colors.cyan },
];

const TONE_COLOR: Record<InsightTone, string> = {
  positive: colors.green,
  neutral: colors.energyBright,
  warning: colors.gold,
  critical: colors.crimson,
};

export default function EchoScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('MORNING');

  const generating = useEchoStore((s) => s.generating);
  const generateMorning = useEchoStore((s) => s.generateMorning);
  const generateEvening = useEchoStore((s) => s.generateEvening);
  const generateWeekly = useEchoStore((s) => s.generateWeekly);
  // Subscribe to the persisted maps so the view re-renders when a report lands.
  const daily = useEchoStore((s) => s.daily);
  const weekly = useEchoStore((s) => s.weekly);

  const accent = TABS.find((t) => t.key === tab)!.accent;

  // Ensure the underlying game/streak data exists before reading it.
  useEffect(() => {
    useGameStore.getState().ensureSeeded();
    useStreakStore.getState().ensureSeeded();
  }, []);

  const currentReport: StoredEchoReport | null =
    tab === 'MORNING'
      ? useEchoStore.getState().getToday().morning ?? null
      : tab === 'EVENING'
        ? useEchoStore.getState().getToday().evening ?? null
        : useEchoStore.getState().getLatestWeekly();

  const runGenerate = useCallback(() => {
    if (tab === 'MORNING') return generateMorning();
    if (tab === 'EVENING') return generateEvening();
    return generateWeekly();
  }, [tab, generateMorning, generateEvening, generateWeekly]);

  // Auto-generate the selected report the first time it is viewed.
  useEffect(() => {
    if (!currentReport && !generating) {
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, daily, weekly]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Bot size={16} color={colors.cyan} />
          <Text variant="label" color={colors.cyan}>ECHO</Text>
        </View>
        <Pressable onPress={() => void runGenerate()} hitSlop={12} disabled={generating}>
          <RefreshCw size={18} color={generating ? colors.textDim : colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <Pressable
                key={t.key}
                style={[styles.tab, {
                  borderColor: active ? t.accent : colors.border,
                  backgroundColor: active ? withAlpha(t.accent, 0.12) : 'transparent',
                }]}
                onPress={() => setTab(t.key)}
              >
                <Icon size={14} color={active ? t.accent : colors.textDim} />
                <Text variant="caption" color={active ? t.accent : colors.textDim}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {generating && !currentReport ? (
          <View style={styles.loading}>
            <ActivityIndicator color={accent} />
            <Text variant="caption" color={colors.textDim} style={{ marginTop: spacing.sm }}>
              ECHO ANALYSING SYSTEM DATA…
            </Text>
          </View>
        ) : currentReport ? (
          <ReportView stored={currentReport} accent={accent} />
        ) : (
          <View style={styles.loading}>
            <Text variant="caption" color={colors.textDim}>NO REPORT YET.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportView({ stored, accent }: { stored: StoredEchoReport; accent: string }) {
  const { report, narrative, provider, offline } = stored;
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.md }}>
      {/* Narrative */}
      <Panel label={report.headline} accent={accent}>
        <Text variant="body" color={colors.text} style={styles.narrative}>{narrative}</Text>
        <View style={styles.providerRow}>
          <View style={[styles.dot, { backgroundColor: offline ? colors.textDim : colors.green }]} />
          <Text variant="caption" color={colors.textDim}>
            ECHO · {provider.toUpperCase()}{offline ? ' · OFFLINE' : ''}
          </Text>
        </View>
      </Panel>

      {/* Metrics */}
      <View style={styles.metricGrid}>
        {report.metrics.map((m) => (
          <View key={m.label} style={[styles.metricCard, { borderColor: withAlpha(accent, 0.2) }]}>
            <Text variant="readout" color={accent} style={{ fontSize: 22 }}>{m.value}</Text>
            <Text variant="caption" color={colors.textDim}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Insights */}
      <Panel label="ANALYSIS" accent={colors.energyBright}>
        <View style={{ gap: spacing.md }}>
          {report.insights.map((ins, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightBar, { backgroundColor: TONE_COLOR[ins.tone] }]} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={TONE_COLOR[ins.tone]}>{ins.label}</Text>
                <Text variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>{ins.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </Panel>

      {/* Recommendations */}
      <Panel label="DIRECTIVES" accent={colors.gold}>
        <View style={{ gap: spacing.md }}>
          {report.recommendations.map((rec) => (
            <View key={rec.priority} style={styles.recRow}>
              <View style={styles.recNum}>
                <Text variant="label" color={colors.gold}>{rec.priority}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="heading" color={colors.text}>{rec.title}</Text>
                <Text variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>{rec.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      </Panel>
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
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  content: { padding: spacing.base },
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: radius.sm, paddingVertical: 10,
  },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'] },
  narrative: { lineHeight: 21 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: {
    width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1,
    borderRadius: radius.base, padding: spacing.md, alignItems: 'center', gap: 4,
  },
  insightRow: { flexDirection: 'row', gap: spacing.md },
  insightBar: { width: 3, borderRadius: 2 },
  recRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  recNum: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: withAlpha(colors.gold, 0.4),
    alignItems: 'center', justifyContent: 'center',
  },
});
