import { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat,
  Easing, FadeIn, useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';

const { height } = Dimensions.get('window');
const ACCENT = colors.gold;

/** Full-screen STREAK MILESTONE celebration. */
export function StreakMilestoneOverlay() {
  const payload = useOverlayStore((s) => s.milestone);
  const clear = useOverlayStore((s) => s.clearMilestone);
  if (!payload) return null;
  return <Content payload={payload} onDismiss={clear} />;
}

function Content({
  payload,
  onDismiss,
}: {
  payload: NonNullable<ReturnType<typeof useOverlayStore.getState>['milestone']>;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.4);
  const flicker = useSharedValue(1);

  useEffect(() => {
    haptics.levelUp();
    if (reduced) return;
    scale.value = withSequence(
      withTiming(1.2, { duration: 380, easing: Easing.out(Easing.back(2.4)) }),
      withTiming(1, { duration: 200 }),
    );
    flicker.value = withRepeat(withTiming(0.6, { duration: 500 }), -1, true);
  }, [scale, flicker, reduced]);

  const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const flameStyle = useAnimatedStyle(() => ({ opacity: flicker.value }));

  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 280)} style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <LinearGradient colors={[withAlpha(ACCENT, 0.22), colors.bg, colors.bg]} style={StyleSheet.absoluteFill} />

        <View style={styles.center}>
          <Text variant="label" color={colors.cyan}>SYSTEM EVENT</Text>
          <Text variant="title" color={ACCENT} glowColor={ACCENT} style={styles.header}>STREAK MILESTONE</Text>

          <Animated.View style={flameStyle}>
            <Flame size={40} color={ACCENT} />
          </Animated.View>

          <Animated.View style={numStyle}>
            <Text variant="readout" color={colors.text} glowColor={ACCENT} style={styles.days}>
              {payload.days}
            </Text>
          </Animated.View>
          <Text variant="heading" color={ACCENT}>DAY STREAK</Text>
          <Text variant="mono" color={colors.textSecondary} center style={styles.label}>
            {payload.streakLabel.toUpperCase()}
          </Text>

          <Animated.View entering={FadeIn.delay(reduced ? 0 : 800)} style={styles.tapHint}>
            <Text variant="caption" color={colors.textDim}>TAP TO CONTINUE</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: withAlpha(colors.bg, 0.96) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  header: { fontSize: 24, letterSpacing: 4, marginBottom: 10, textAlign: 'center' },
  days: { fontSize: 84, lineHeight: 90 },
  label: { marginTop: 4, letterSpacing: 2 },
  tapHint: { position: 'absolute', bottom: -height * 0.26 },
});
