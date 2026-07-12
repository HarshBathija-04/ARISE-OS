import { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, History } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { FOCUS_CATEGORIES, FOCUS_PRESETS } from '@/constants/focus';
import { estimateFocusXp } from '@/game-engine/focus-engine';
import { useGameStore } from '@/store/gameStore';
import type { FocusCategory } from '@/types';
import { haptics } from '@/services/notifications/haptics';
import { formatDurationMin } from '@/utils/date';

export default function FocusScreen() {
  const router = useRouter();
  const sessions = useGameStore((s) => s.focusSessions);
  const focusSessionsToday = useGameStore((s) => s.daily.focusSessions);
  const [category, setCategory] = useState<FocusCategory>('GATE');
  const [minutes, setMinutes] = useState<number>(50);
  const [custom, setCustom] = useState('');

  const activeMinutes = custom ? Math.max(1, Math.min(240, Number(custom) || 0)) : minutes;
  const estXp = useMemo(
    () => estimateFocusXp(activeMinutes, focusSessionsToday),
    [activeMinutes, focusSessionsToday],
  );

  const start = () => {
    haptics.heavy();
    router.push({
      pathname: '/focus/active',
      params: { category, minutes: String(activeMinutes) },
    });
  };

  const recent = sessions.slice(0, 5);

  return (
    <Screen scroll>
      <Text variant="title" color={colors.cyan} glowColor={withAlpha(colors.cyan, 0.4)}>
        FOCUS PROTOCOL
      </Text>
      <Text variant="caption" color={colors.textDim} style={{ marginTop: 4 }}>
        SELECT A DISCIPLINE. ENTER DEEP FOCUS.
      </Text>

      <SectionHeader title="CATEGORY" accent={colors.cyan} />
      <View style={styles.catGrid}>
        {FOCUS_CATEGORIES.map((c) => {
          const selected = c.code === category;
          return (
            <Pressable
              key={c.code}
              onPress={() => { haptics.tick(); setCategory(c.code); }}
              style={[
                styles.catChip,
                {
                  borderColor: selected ? c.color : colors.border,
                  backgroundColor: selected ? withAlpha(c.color, 0.14) : colors.surface,
                },
              ]}
            >
              <Text variant="mono" color={selected ? c.color : colors.textSecondary}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="DURATION" accent={colors.cyan} />
      <View style={styles.durRow}>
        {FOCUS_PRESETS.map((p) => {
          const selected = !custom && p === minutes;
          return (
            <Pressable
              key={p}
              onPress={() => { haptics.tick(); setCustom(''); setMinutes(p); }}
              style={[
                styles.durChip,
                { borderColor: selected ? colors.cyan : colors.border, backgroundColor: selected ? withAlpha(colors.cyan, 0.14) : colors.surface },
              ]}
            >
              <Text variant="heading" color={selected ? colors.cyan : colors.text}>{p}</Text>
              <Text variant="caption" color={colors.textDim}>MIN</Text>
            </Pressable>
          );
        })}
        <View style={[styles.durChip, styles.customChip, { borderColor: custom ? colors.cyan : colors.border }]}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder="CUSTOM"
            placeholderTextColor={colors.textDim}
            style={styles.customInput}
            maxLength={3}
          />
          <Text variant="caption" color={colors.textDim}>MIN</Text>
        </View>
      </View>

      <Panel label="SESSION ESTIMATE" accent={colors.cyan} style={{ marginTop: spacing.lg }}>
        <View style={styles.estRow}>
          <View>
            <Text variant="caption" color={colors.textDim}>DURATION</Text>
            <Text variant="heading" color={colors.text}>{formatDurationMin(activeMinutes)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color={colors.textDim}>EST. XP</Text>
            <Text variant="heading" color={colors.energyBright}>~{estXp}</Text>
          </View>
        </View>
        {focusSessionsToday > 0 && (
          <Text variant="caption" color={colors.textDim} style={{ marginTop: 8 }}>
            {focusSessionsToday} session(s) today — diminishing returns apply.
          </Text>
        )}
      </Panel>

      <Button
        label="INITIATE FOCUS PROTOCOL"
        variant="primary"
        full
        haptic="none"
        icon={<Play size={18} color={colors.bg} fill={colors.bg} />}
        onPress={start}
        style={{ marginTop: spacing.lg }}
      />

      <SectionHeader
        title="RECENT SESSIONS"
        accent={colors.violet}
        onPress={() => router.push('/focus/history')}
      />
      {recent.length === 0 ? (
        <Panel><Text dim>No focus sessions yet. Your first deep work session awaits.</Text></Panel>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {recent.map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <History size={15} color={colors.textDim} />
              <Text variant="mono" color={colors.text} style={{ flex: 1 }}>
                {s.category.replace('_', ' ')}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {Math.round(s.activeSeconds / 60)}m
              </Text>
              <Text variant="caption" color={colors.energyBright}>+{s.xpAwarded}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: { borderWidth: 1, borderRadius: radius.base, paddingHorizontal: 14, paddingVertical: 10 },
  durRow: { flexDirection: 'row', gap: spacing.sm },
  durChip: {
    flex: 1, borderWidth: 1, borderRadius: radius.base, paddingVertical: spacing.md,
    alignItems: 'center', gap: 2,
  },
  customChip: { justifyContent: 'center' },
  customInput: {
    color: colors.cyan, fontFamily: 'monospace', fontSize: 17, fontWeight: '700',
    textAlign: 'center', padding: 0, minWidth: 60,
  },
  estRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.md,
  },
});
