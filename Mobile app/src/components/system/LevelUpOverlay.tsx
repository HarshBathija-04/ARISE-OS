import { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence,
  withRepeat, Easing, FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import { rankColor } from '@/constants/ranks';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';
import type { RankName } from '@/types';

const { height } = Dimensions.get('window');

/** Full-screen cinematic LEVEL INCREASE overlay. */
export function LevelUpOverlay() {
  const payload = useOverlayStore((s) => s.levelUp);
  const clear = useOverlayStore((s) => s.clearLevelUp);

  if (!payload) return null;
  return <LevelUpContent payload={payload} onDismiss={clear} />;
}

function LevelUpContent({
  payload,
  onDismiss,
}: {
  payload: NonNullable<ReturnType<typeof useOverlayStore.getState>['levelUp']>;
  onDismiss: () => void;
}) {
  const oldOpacity = useSharedValue(1);
  const newScale = useSharedValue(0.4);
  const newOpacity = useSharedValue(0);
  const ring = useSharedValue(0);
  const rc = rankColor(payload.newRank as RankName);

  useEffect(() => {
    haptics.levelUp();
    ring.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
    oldOpacity.value = withDelay(600, withTiming(0.15, { duration: 400 }));
    newOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    newScale.value = withDelay(
      900,
      withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200 }),
      ),
    );
  }, [oldOpacity, newOpacity, newScale, ring]);

  const oldStyle = useAnimatedStyle(() => ({ opacity: oldOpacity.value }));
  const newStyle = useAnimatedStyle(() => ({
    opacity: newOpacity.value,
    transform: [{ scale: newScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 - ring.value * 0.6,
    transform: [{ scale: 0.5 + ring.value * 1.4 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <LinearGradient
          colors={[withAlpha(rc, 0.2), colors.bg, colors.bg]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.center}>
          <Text variant="label" color={colors.cyan}>
            SYSTEM EVENT
          </Text>
          <Text variant="title" color={rc} glowColor={rc} style={styles.header}>
            LEVEL INCREASE
          </Text>

          <View style={styles.levelStack}>
            <Animated.View style={[styles.ring, { borderColor: rc }, ringStyle]} />
            <Animated.View style={oldStyle}>
              <Text variant="readout" color={colors.textDim} style={styles.oldLevel}>
                {payload.oldLevel}
              </Text>
            </Animated.View>
            <Text variant="title" color={colors.textDim}>
              ↓
            </Text>
            <Animated.View style={newStyle}>
              <Text
                variant="readout"
                color={colors.text}
                glowColor={rc}
                style={styles.newLevel}
              >
                {payload.newLevel}
              </Text>
            </Animated.View>
          </View>

          {payload.rankChanged && (
            <Animated.View entering={FadeIn.delay(1400)}>
              <Text variant="heading" color={rc} glowColor={rc}>
                RANK: {payload.newRank}
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.delay(1200)}>
            <Text variant="mono" color={colors.textSecondary} center style={styles.capacity}>
              ATTRIBUTE CAPACITY INCREASED
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(1800)} style={styles.tapHint}>
            <Text variant="caption" color={colors.textDim}>
              TAP TO CONTINUE
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: withAlpha(colors.bg, 0.96) },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: height * 0.05,
  },
  header: { fontSize: 30, letterSpacing: 5, marginBottom: 10 },
  levelStack: { alignItems: 'center', gap: 6, marginVertical: 10 },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    top: -20,
  },
  oldLevel: { fontSize: 44 },
  newLevel: { fontSize: 72, lineHeight: 78 },
  capacity: { marginTop: 12, letterSpacing: 2 },
  tapHint: { position: 'absolute', bottom: -height * 0.28 },
});
