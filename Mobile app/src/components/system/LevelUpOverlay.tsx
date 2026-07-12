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

/**
 * Solo Leveling「LEVEL INCREASE」ceremony — full-screen cinematic overlay
 * with system-blue burst, monarch gold level numbers, and vertical light beam.
 */
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
  const beamOpacity = useSharedValue(0);
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
    // Vertical light beam surge
    beamOpacity.value = withDelay(
      400,
      withSequence(
        withTiming(0.5, { duration: 400 }),
        withTiming(0.15, { duration: 800 }),
      ),
    );
  }, [oldOpacity, newOpacity, newScale, ring, beamOpacity]);

  const oldStyle = useAnimatedStyle(() => ({ opacity: oldOpacity.value }));
  const newStyle = useAnimatedStyle(() => ({
    opacity: newOpacity.value,
    transform: [{ scale: newScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 - ring.value * 0.6,
    transform: [{ scale: 0.5 + ring.value * 1.4 }],
  }));
  const beamStyle = useAnimatedStyle(() => ({
    opacity: beamOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        {/* Gradient: system-blue to void */}
        <LinearGradient
          colors={[
            withAlpha(colors.systemBlue, 0.2),
            withAlpha(colors.shadowViolet, 0.08),
            colors.bg,
            colors.bg,
          ]}
          style={StyleSheet.absoluteFill}
        />

        {/* Vertical light beam */}
        <Animated.View style={[styles.beam, beamStyle]}>
          <LinearGradient
            colors={['transparent', withAlpha(colors.systemBlue, 0.6), 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>

        <View style={styles.center}>
          <Text variant="label" color={colors.phantomCyan}>
            {'「'}SYSTEM EVENT{'」'}
          </Text>
          <Text
            variant="systemWindow"
            color={colors.systemBlue}
            glowColor={withAlpha(colors.systemBlue, 0.8)}
            style={styles.header}
          >
            {'「'}LEVEL INCREASE{'」'}
          </Text>

          <View style={styles.levelStack}>
            {/* Expanding ring — system blue */}
            <Animated.View
              style={[
                styles.ring,
                { borderColor: colors.systemBlue },
                ringStyle,
              ]}
            />
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
                color={colors.monarchGold}
                glowColor={withAlpha(colors.monarchGold, 0.6)}
                style={styles.newLevel}
              >
                {payload.newLevel}
              </Text>
            </Animated.View>
          </View>

          {payload.rankChanged && (
            <Animated.View entering={FadeIn.delay(1400)}>
              <Text variant="heading" color={rc} glowColor={withAlpha(rc, 0.6)}>
                {'「'}RANK: {payload.newRank}{'」'}
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
  backdrop: { flex: 1, backgroundColor: withAlpha(colors.bg, 0.97) },
  beam: {
    position: 'absolute',
    left: '48%',
    width: 4,
    top: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: height * 0.05,
  },
  header: { fontSize: 28, letterSpacing: 6, marginBottom: 10 },
  levelStack: { alignItems: 'center', gap: 6, marginVertical: 10 },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    top: -20,
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  oldLevel: { fontSize: 44 },
  newLevel: { fontSize: 72, lineHeight: 78 },
  capacity: { marginTop: 12, letterSpacing: 2 },
  tapHint: { position: 'absolute', bottom: -height * 0.28 },
});
