import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay,
  Easing, runOnJS, useReducedMotion,
} from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';

const { width } = Dimensions.get('window');

/**
 * Brief, self-dismissing CRITICAL IMPACT burst: screen shake + number pop.
 * Non-blocking (pointerEvents none) so it plays over whatever screen is active.
 */
export function CriticalImpactOverlay() {
  const payload = useOverlayStore((s) => s.criticalImpact);
  const clear = useOverlayStore((s) => s.clearCriticalImpact);
  if (!payload) return null;
  return <Content payload={payload} onDone={clear} />;
}

function Content({
  payload,
  onDone,
}: {
  payload: NonNullable<ReturnType<typeof useOverlayStore.getState>['criticalImpact']>;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const scale = useSharedValue(reduced ? 1 : 0.3);
  const opacity = useSharedValue(1);

  useEffect(() => {
    haptics.critical();
    if (reduced) {
      opacity.value = withDelay(700, withTiming(0, { duration: 200 }, (done) => {
        if (done) runOnJS(onDone)();
      }));
      return;
    }
    // Screen shake: a quick left-right jitter that decays.
    shake.value = withSequence(
      withTiming(-12, { duration: 45 }),
      withTiming(10, { duration: 45 }),
      withTiming(-7, { duration: 45 }),
      withTiming(5, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
    scale.value = withSequence(
      withTiming(1.25, { duration: 160, easing: Easing.out(Easing.back(3)) }),
      withTiming(1, { duration: 140 }),
    );
    opacity.value = withDelay(
      850,
      withTiming(0, { duration: 220 }, (done) => {
        if (done) runOnJS(onDone)();
      }),
    );
  }, [shake, scale, opacity, reduced, onDone]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: shake.value }],
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, wrapStyle]}>
      <Animated.View style={[styles.burst, popStyle]}>
        <View style={styles.labelRow}>
          <Zap size={20} color={colors.gold} />
          <Text variant="heading" color={colors.gold} glowColor={colors.gold}>CRITICAL IMPACT</Text>
        </View>
        <Text variant="readout" color={colors.crimson} glowColor={colors.crimson} style={styles.dmg}>
          -{payload.damage}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>{payload.bossName.toUpperCase()}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  burst: {
    alignItems: 'center', gap: 6, paddingHorizontal: 28, paddingVertical: 20,
    borderRadius: 16, borderWidth: 1, borderColor: withAlpha(colors.gold, 0.5),
    backgroundColor: withAlpha(colors.bg, 0.82), maxWidth: width * 0.8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dmg: { fontSize: 52, lineHeight: 58 },
});
