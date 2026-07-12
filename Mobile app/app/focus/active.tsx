import { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, BackHandler, AppState, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pause, Play, Square, BellOff } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EnergyRing } from '@/components/focus/EnergyRing';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { focusCategoryDef } from '@/constants/focus';
import { estimateFocusXp } from '@/game-engine/focus-engine';
import { FOCUS_MIN_ACTIVE_SECONDS } from '@/game-engine/anti-farming-engine';
import { useGameStore } from '@/store/gameStore';
import { useOverlayStore } from '@/store/overlayStore';
import { useNotificationStore } from '@/store/notificationStore';
import { haptics } from '@/services/notifications/haptics';
import { formatClock } from '@/utils/date';
import type { FocusCategory, FocusObjectiveResult } from '@/types';

export default function ActiveFocusScreen() {
  const params = useLocalSearchParams<{ category: FocusCategory; minutes: string }>();
  const router = useRouter();
  const category = (params.category ?? 'GATE') as FocusCategory;
  const plannedMinutes = Math.max(1, Number(params.minutes) || 50);
  const def = focusCategoryDef(category);

  const completeFocusSession = useGameStore((s) => s.completeFocusSession);
  const focusSessionsToday = useGameStore((s) => s.daily.focusSessions);
  const handleCompletion = useOverlayStore((s) => s.handleCompletion);
  const setFocusDnd = useNotificationStore((s) => s.setFocusDnd);
  const focusDndActive = useNotificationStore((s) => s.focusDndActive);

  // Activate DND when session starts, deactivate on unmount.
  useEffect(() => {
    setFocusDnd(true);
    return () => { setFocusDnd(false); };
  }, [setFocusDnd]);

  const totalSeconds = plannedMinutes * 60;
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [confirmExit, setConfirmExit] = useState(false);
  const [askResult, setAskResult] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer — counts ACTUAL active seconds (paused time excluded).
  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => {
        setActiveSeconds((s) => {
          const next = s + 1;
          if (next >= totalSeconds) {
            haptics.success();
            setRunning(false);
            setAskResult(true);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, totalSeconds]);

  // Pause the timer when the app is backgrounded (protects active-time integrity).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setRunning(false);
    });
    return () => sub.remove();
  }, []);

  // Android back button → guard against accidental termination.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (askResult) return true;
      setRunning(false);
      setConfirmExit(true);
      return true;
    });
    return () => sub.remove();
  }, [askResult]);

  const remaining = Math.max(0, totalSeconds - activeSeconds);
  const progress = totalSeconds ? activeSeconds / totalSeconds : 0;
  const estXp = estimateFocusXp(Math.round(activeSeconds / 60), focusSessionsToday);
  const belowMin = activeSeconds < FOCUS_MIN_ACTIVE_SECONDS;

  const finish = useCallback(
    (result: FocusObjectiveResult) => {
      const outcome = completeFocusSession({
        category,
        objective: def.name,
        plannedMinutes,
        activeSeconds,
        result,
      });
      if (outcome.levelsGained > 0) handleCompletion(outcome);
      router.replace('/(tabs)/focus');
    },
    [activeSeconds, category, def.name, plannedMinutes, completeFocusSession, handleCompletion, router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.topBar}>
        <View style={styles.liveRow}>
          <View style={[styles.dot, { backgroundColor: running ? def.color : colors.textDim }]} />
          <Text variant="label" color={running ? def.color : colors.textDim}>
            {running ? 'FOCUS PROTOCOL ACTIVE' : 'PAUSED'}
          </Text>
        </View>
        <View style={styles.topRight}>
          {focusDndActive && (
            <Pressable
              onPress={() => {
                if (Platform.OS === 'android') {
                  Linking.openSettings().catch(() => {});
                }
              }}
              style={styles.dndBadge}
            >
              <BellOff size={12} color={colors.cyan} />
              <Text variant="caption" color={colors.cyan}>DND</Text>
            </Pressable>
          )}
          <Text variant="caption" color={colors.textDim}>{def.name}</Text>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.ringWrap}>
          <EnergyRing size={280} progress={progress} color={def.color} running={running} />
          <View style={styles.timerText}>
            <Text variant="readout" color={colors.text} style={styles.clock}>
              {formatClock(remaining)}
            </Text>
            <Text variant="caption" color={colors.textDim}>
              {Math.round(activeSeconds / 60)}/{plannedMinutes} MIN ACTIVE
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta label="EST. XP" value={`~${estXp}`} color={colors.energyBright} />
          <Meta label="STREAK" value={`${focusSessionsToday + 1}`} color={colors.cyan} />
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.controlBtn, { borderColor: def.color }]}
          onPress={() => { try { haptics.tap(); } catch {} setRunning((r) => !r); }}
        >
          {running ? <Pause size={22} color={def.color} /> : <Play size={22} color={def.color} fill={def.color} />}
          <Text variant="label" color={def.color}>{running ? 'PAUSE' : 'RESUME'}</Text>
        </Pressable>
        <Pressable
          style={[styles.controlBtn, styles.endBtn]}
          onPress={() => { try { haptics.tap(); } catch {} setRunning(false); setConfirmExit(true); }}
        >
          <Square size={20} color={colors.crimson} />
          <Text variant="label" color={colors.crimson}>END SESSION</Text>
        </Pressable>
      </View>

      {/* Terminate confirmation */}
      {confirmExit && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.overlay} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={() => { setConfirmExit(false); setRunning(true); }} />
          <View style={styles.dialog}>
            <Text variant="heading" color={colors.crimson} center>
              TERMINATE FOCUS PROTOCOL?
            </Text>
            <Text dim center variant="mono" style={{ marginTop: 8 }}>
              {belowMin
                ? 'Below minimum active time — this session earns no XP.'
                : `You have ${Math.round(activeSeconds / 60)} active minutes. You can still claim partial XP.`}
            </Text>
            <View style={styles.dialogActions}>
              <Button label="CONTINUE SESSION" variant="secondary" full onPress={() => { setConfirmExit(false); setRunning(true); }} />
              <Button
                label="TERMINATE"
                variant="danger"
                full
                onPress={() => { setConfirmExit(false); if (belowMin) finish('NOT_COMPLETED'); else setAskResult(true); }}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Objective status prompt */}
      {askResult && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.overlay} pointerEvents="box-none">
          <View style={styles.backdrop} />
          <View style={styles.dialog}>
            <Text variant="label" color={def.color} center>OBJECTIVE STATUS</Text>
            <Text dim center variant="mono" style={{ marginTop: 6 }}>
              Report honestly. XP scales with your real result.
            </Text>
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button label="COMPLETED" variant="primary" full onPress={() => finish('COMPLETED')} />
              <Button label="PARTIALLY COMPLETED" variant="secondary" full onPress={() => finish('PARTIAL')} />
              <Button label="NOT COMPLETED" variant="ghost" full onPress={() => finish('NOT_COMPLETED')} />
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function Meta({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.meta}>
      <Text variant="caption" color={colors.textDim}>{label}</Text>
      <Text variant="heading" color={color}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dndBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: withAlpha(colors.cyan, 0.4),
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: withAlpha(colors.cyan, 0.08),
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing['2xl'] },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  timerText: { position: 'absolute', alignItems: 'center', gap: 6 },
  clock: { fontSize: 52, lineHeight: 56 },
  metaRow: { flexDirection: 'row', gap: spacing['3xl'] },
  meta: { alignItems: 'center', gap: 3 },
  controls: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  controlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderRadius: radius.base, paddingVertical: spacing.base,
    backgroundColor: colors.surface,
  },
  endBtn: { borderColor: withAlpha(colors.crimson, 0.5), backgroundColor: withAlpha(colors.crimson, 0.08) },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(colors.black, 0.85),
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  dialog: {
    width: '100%', backgroundColor: colors.bgSecondary, borderWidth: 1,
    borderColor: colors.borderBright, borderRadius: radius.lg, padding: spacing.xl,
    zIndex: 10,
  },
  dialogActions: { marginTop: spacing.lg },
});
