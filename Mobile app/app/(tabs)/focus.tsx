import { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, History } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
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

  const footer = (
    <Button
      label="INITIATE FOCUS PROTOCOL"
      variant="primary"
      size="lg"
      full
      haptic="none"
      icon={<Play size={18} color={colors.white} fill={colors.white} />}
      onPress={start}
    />
  );

  return (
    <Screen
      scroll
      title="FOCUS PROTOCOL"
      subtitle="SELECT A DISCIPLINE · ENTER DEEP FOCUS"
      accent={colors.phantomCyan}
      footer={footer}
    >
      <SectionHeader title="CATEGORY" accent={colors.phantomCyan} />
      <View style={styles.catGrid}>
        {FOCUS_CATEGORIES.map((c) => (
          <Chip
            key={c.code}
            label={c.name}
            accent={c.color}
            selected={c.code === category}
            onPress={() => setCategory(c.code)}
          />
        ))}
      </View>

      <SectionHeader title="DURATION" accent={colors.phantomCyan} />
      <View style={styles.durRow}>
        {FOCUS_PRESETS.map((p) => (
          <Chip
            key={p}
            label={String(p)}
            sub="MIN"
            grow
            accent={colors.phantomCyan}
            selected={!custom && p === minutes}
            onPress={() => { setCustom(''); setMinutes(p); }}
          />
        ))}
      </View>

      <Input
        label="CUSTOM DURATION"
        value={custom}
        onChangeText={setCustom}
        keyboardType="number-pad"
        placeholder="e.g. 90 minutes"
        maxLength={3}
        containerStyle={{ marginTop: spacing.md }}
        hint="Leave empty to use a preset above. Max 240 min."
      />

      <Panel label="SESSION ESTIMATE" accent={colors.phantomCyan} style={{ marginTop: spacing.lg }}>
        <View style={styles.estRow}>
          <View>
            <Text variant="caption" color={colors.textDim}>DURATION</Text>
            <Text variant="readout" color={colors.text} style={styles.estValue}>
              {formatDurationMin(activeMinutes)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color={colors.textDim}>EST. XP</Text>
            <Text variant="readout" color={colors.systemBlue} glowColor={withAlpha(colors.systemBlue, 0.3)} style={styles.estValue}>~{estXp}</Text>
          </View>
        </View>
        {focusSessionsToday > 0 && (
          <Text variant="caption" color={colors.textDim} style={{ marginTop: 8 }}>
            {focusSessionsToday} session(s) today — diminishing returns apply.
          </Text>
        )}
      </Panel>

      <SectionHeader
        title="RECENT SESSIONS"
        accent={colors.shadowViolet}
        onPress={() => router.push('/focus/history')}
      />
      {recent.length === 0 ? (
        <EmptyState
          icon={<History size={22} color={colors.shadowViolet} />}
          title="NO SESSIONS YET"
          hint="Your first deep-work session awaits. Pick a discipline and initiate."
          accent={colors.shadowViolet}
        />
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
              <Text variant="caption" color={colors.systemBlue}>+{s.xpAwarded}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durRow: { flexDirection: 'row', gap: spacing.sm },
  estRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estValue: { fontSize: 24, marginTop: 2 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: withAlpha(colors.surface, 0.85), borderWidth: 1, borderColor: withAlpha(colors.border, 0.6),
    borderRadius: radius.md, padding: spacing.base, minHeight: 52,
  },
});
