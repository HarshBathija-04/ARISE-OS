import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useShadowStore, type UrgeInput } from '@/store/shadowStore';
import { useGameStore } from '@/store/gameStore';
import type { ShadowHabitCode, UrgeResult } from '@/types';
import { haptics } from '@/services/notifications/haptics';

const HABITS: { code: ShadowHabitCode; label: string }[] = [
  { code: 'REELS_SHORTS', label: 'REELS & SHORTS' },
  { code: 'PORNOGRAPHY', label: 'PORNOGRAPHY' },
  { code: 'MASTURBATION', label: 'MASTURBATION' },
  { code: 'UNPLANNED_GAMING', label: 'UNPLANNED GAMING' },
  { code: 'EXCESSIVE_YOUTUBE', label: 'EXCESSIVE YOUTUBE' },
  { code: 'LATE_NIGHT_PHONE', label: 'LATE NIGHT PHONE' },
  { code: 'PROCRASTINATION', label: 'PROCRASTINATION' },
];

const MOODS = ['BORED', 'STRESSED', 'LONELY', 'TIRED', 'ANXIOUS', 'RESTLESS', 'NEUTRAL'];
const LOCATIONS = ['HOME', 'BED', 'DESK', 'BATHROOM', 'OUTSIDE', 'OTHER'];

export default function LogUrgeScreen() {
  const router = useRouter();
  const logUrge = useShadowStore((s) => s.logUrge);
  const privacyMode = useGameStore((s) => s.profile.privacyMode);

  const [habit, setHabit] = useState<ShadowHabitCode | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [trigger, setTrigger] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [result, setResult] = useState<UrgeResult | null>(null);

  const submit = () => {
    if (!habit || !result) {
      Alert.alert('INCOMPLETE', 'Select a habit and result.');
      return;
    }

    if (result === 'RELAPSED') {
      Alert.alert(
        'CONFIRM RELAPSE',
        'Recording this will reset the streak. The System will generate a Recovery Protocol. Your level and achievements are safe.',
        [
          { text: 'CANCEL', style: 'cancel' },
          { text: 'CONFIRM', onPress: doSubmit },
        ],
      );
    } else {
      doSubmit();
    }
  };

  const doSubmit = () => {
    const input: UrgeInput = {
      habitCode: habit!,
      intensity,
      trigger: trigger || null,
      mood,
      locationCategory: location,
      actionTaken: action || null,
      result: result!,
    };

    const { relapsed, recoveryMission } = logUrge(input);

    if (result === 'RESISTED') haptics.heavy();
    else haptics.warning();

    if (relapsed && recoveryMission) {
      router.replace('/recovery');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.violet}>LOG URGE</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="HABIT" accent={colors.violet} />
        <View style={styles.chipGrid}>
          {HABITS.map((h) => {
            const label = privacyMode && ['PORNOGRAPHY', 'MASTURBATION'].includes(h.code)
              ? 'MONITORED' : h.label;
            const sel = habit === h.code;
            return (
              <Pressable
                key={h.code}
                style={[styles.chip, {
                  borderColor: sel ? colors.violet : colors.border,
                  backgroundColor: sel ? withAlpha(colors.violet, 0.12) : colors.surface,
                }]}
                onPress={() => setHabit(h.code)}
              >
                <Text variant="caption" color={sel ? colors.violet : colors.textSecondary}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="INTENSITY" accent={colors.crimson} />
        <View style={styles.intensityRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
            <Pressable
              key={v}
              style={[styles.intChip, {
                borderColor: v <= intensity ? colors.crimson : colors.border,
                backgroundColor: v <= intensity ? withAlpha(colors.crimson, 0.15) : 'transparent',
              }]}
              onPress={() => setIntensity(v)}
            >
              <Text variant="caption" color={v <= intensity ? colors.crimson : colors.textDim}>
                {v}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="TRIGGER" accent={colors.energy} />
        <TextInput
          value={trigger}
          onChangeText={setTrigger}
          placeholder="What triggered this?"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />

        <SectionHeader title="MOOD" accent={colors.cyan} />
        <View style={styles.chipGrid}>
          {MOODS.map((m) => (
            <Pressable
              key={m}
              style={[styles.chip, {
                borderColor: mood === m ? colors.cyan : colors.border,
                backgroundColor: mood === m ? withAlpha(colors.cyan, 0.12) : colors.surface,
              }]}
              onPress={() => setMood(mood === m ? null : m)}
            >
              <Text variant="caption" color={mood === m ? colors.cyan : colors.textSecondary}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="LOCATION" accent={colors.energy} />
        <View style={styles.chipGrid}>
          {LOCATIONS.map((l) => (
            <Pressable
              key={l}
              style={[styles.chip, {
                borderColor: location === l ? colors.energy : colors.border,
                backgroundColor: location === l ? withAlpha(colors.energy, 0.12) : colors.surface,
              }]}
              onPress={() => setLocation(location === l ? null : l)}
            >
              <Text variant="caption" color={location === l ? colors.energy : colors.textSecondary}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="ACTION TAKEN" accent={colors.green} />
        <TextInput
          value={action}
          onChangeText={setAction}
          placeholder="What did you do?"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />

        <SectionHeader title="RESULT" accent={colors.gold} />
        <View style={styles.resultRow}>
          {(['RESISTED', 'DELAYED', 'RELAPSED'] as UrgeResult[]).map((r) => {
            const sel = result === r;
            const rc = r === 'RESISTED' ? colors.green : r === 'DELAYED' ? colors.gold : colors.crimson;
            return (
              <Pressable
                key={r}
                style={[styles.resultChip, {
                  borderColor: sel ? rc : colors.border,
                  backgroundColor: sel ? withAlpha(rc, 0.15) : colors.surface,
                  flex: 1,
                }]}
                onPress={() => setResult(r)}
              >
                <Text variant="heading" color={sel ? rc : colors.textSecondary}>{r}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          label="SUBMIT"
          variant="primary"
          full
          onPress={submit}
          style={{ marginTop: spacing.xl }}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  intensityRow: { flexDirection: 'row', gap: 4 },
  intChip: {
    flex: 1, borderWidth: 1, borderRadius: radius.sm,
    alignItems: 'center', paddingVertical: 8,
  },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.md,
    color: colors.text, fontFamily: 'monospace', fontSize: 14,
  },
  resultRow: { flexDirection: 'row', gap: spacing.sm },
  resultChip: {
    borderWidth: 1, borderRadius: radius.base,
    alignItems: 'center', paddingVertical: spacing.md,
  },
});
