import { useEffect } from 'react';
import { View, StyleSheet, Switch, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronUp, ChevronDown, Bell, BellOff, ShieldCheck } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useNotificationStore } from '@/store/notificationStore';
import { CHANNELS, type NotificationChannelId } from '@/services/notifications/channels';
import { haptics } from '@/services/notifications/haptics';

/** Which channels have an associated scheduled time control. */
const TIMED: Partial<Record<NotificationChannelId, 'dailyMissionsTime' | 'streakWarningTime' | 'eveningReviewTime'>> = {
  DAILY_MISSIONS: 'dailyMissionsTime',
  STREAK_WARNINGS: 'streakWarningTime',
  SYSTEM_EVENTS: 'eveningReviewTime',
};

const CHANNEL_ACCENT: Record<NotificationChannelId, string> = {
  DAILY_MISSIONS: colors.energy,
  STREAK_WARNINGS: colors.gold,
  FOCUS: colors.cyan,
  RECOVERY: colors.violetBright,
  SYSTEM_EVENTS: colors.green,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const store = useNotificationStore();

  // Ensure permission/channel state is fresh when the screen opens.
  useEffect(() => {
    void store.initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.energy}>NOTIFICATIONS</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Master */}
        <Panel label="MASTER CONTROL" accent={colors.energy}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {store.masterEnabled ? <Bell size={18} color={colors.energyBright} /> : <BellOff size={18} color={colors.textDim} />}
              <View style={{ flex: 1 }}>
                <Text variant="mono" color={colors.text}>ALL NOTIFICATIONS</Text>
                <Text variant="caption" color={colors.textDim}>
                  {store.permissionGranted ? 'System permission granted.' : 'System permission not granted.'}
                </Text>
              </View>
            </View>
            <Switch
              value={store.masterEnabled}
              onValueChange={(v) => { haptics.tick(); void store.setMasterEnabled(v); }}
              trackColor={{ false: colors.surface2, true: withAlpha(colors.energy, 0.6) }}
              thumbColor={store.masterEnabled ? colors.energyBright : colors.textDim}
            />
          </View>
        </Panel>

        {/* Channels */}
        <View style={{ height: spacing.md }} />
        <Panel label="CHANNELS" accent={colors.violet} padded={false}>
          {CHANNELS.map((ch, i) => {
            const enabled = store.channels[ch.id];
            const timeKey = TIMED[ch.id];
            const accent = CHANNEL_ACCENT[ch.id];
            const disabled = !store.masterEnabled;
            return (
              <View key={ch.id} style={[styles.channel, i > 0 && styles.channelBorder]}>
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.tick, { backgroundColor: enabled && !disabled ? accent : colors.textFaint }]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="mono" color={disabled ? colors.textDim : colors.text}>{ch.name.toUpperCase()}</Text>
                      <Text variant="caption" color={colors.textDim}>{ch.description}</Text>
                    </View>
                  </View>
                  <Switch
                    value={enabled}
                    disabled={disabled}
                    onValueChange={() => { haptics.tick(); void store.toggleChannel(ch.id); }}
                    trackColor={{ false: colors.surface2, true: withAlpha(accent, 0.6) }}
                    thumbColor={enabled ? accent : colors.textDim}
                  />
                </View>

                {timeKey && enabled && !disabled ? (
                  <TimeStepper
                    accent={accent}
                    value={store[timeKey]}
                    onChange={(v) => void store.setTime(timeKey, v)}
                  />
                ) : null}
              </View>
            );
          })}
        </Panel>

        {/* Privacy note */}
        <View style={{ height: spacing.md }} />
        <View style={styles.privacyNote}>
          <ShieldCheck size={16} color={colors.violetBright} />
          <Text variant="caption" color={colors.textSecondary} style={{ flex: 1, lineHeight: 16 }}>
            Recovery notifications never name a sensitive habit. With Privacy Mode on, all
            protected protocols use neutral text only.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TimeStepper({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const [h, m] = value.split(':').map((x) => parseInt(x, 10));
  const fmt = (hh: number, mm: number) => `${String((hh + 24) % 24).padStart(2, '0')}:${String((mm + 60) % 60).padStart(2, '0')}`;
  const bump = (dh: number, dm: number) => { haptics.tick(); onChange(fmt(h + dh, m + dm)); };

  return (
    <View style={styles.stepper}>
      <Text variant="caption" color={colors.textDim}>SCHEDULED</Text>
      <View style={styles.stepperControls}>
        <StepCol accent={accent} onUp={() => bump(1, 0)} onDown={() => bump(-1, 0)} value={String(h).padStart(2, '0')} />
        <Text variant="heading" color={colors.textDim}>:</Text>
        <StepCol accent={accent} onUp={() => bump(0, 15)} onDown={() => bump(0, -15)} value={String(m).padStart(2, '0')} />
      </View>
    </View>
  );
}

function StepCol({ value, onUp, onDown, accent }: { value: string; onUp: () => void; onDown: () => void; accent: string }) {
  return (
    <View style={styles.stepCol}>
      <Pressable onPress={onUp} hitSlop={8} style={styles.stepBtn}><ChevronUp size={16} color={accent} /></Pressable>
      <Text variant="readout" color={colors.text} style={{ fontSize: 22 }}>{value}</Text>
      <Pressable onPress={onDown} hitSlop={8} style={styles.stepBtn}><ChevronDown size={16} color={accent} /></Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, paddingRight: 8 },
  tick: { width: 3, height: 28, borderRadius: 2 },
  channel: { padding: spacing.base },
  channelBorder: { borderTopWidth: 1, borderTopColor: withAlpha(colors.border, 0.6) },
  stepper: {
    marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary, borderRadius: radius.base, padding: spacing.md,
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepCol: { alignItems: 'center', gap: 2 },
  stepBtn: { padding: 2 },
  privacyNote: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    borderWidth: 1, borderColor: withAlpha(colors.violet, 0.3),
    backgroundColor: withAlpha(colors.violet, 0.06),
    borderRadius: radius.base, padding: spacing.base,
  },
});
