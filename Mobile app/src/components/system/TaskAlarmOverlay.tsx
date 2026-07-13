import { useEffect } from 'react';
import { View, StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing, FadeIn,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, withAlpha, radius } from '@/theme';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';

const { width, height } = Dimensions.get('screen');

/**
 * Solo Leveling in-app alarm popup — FULL-SCREEN EXCLUSIVE.
 * Covers the entire screen (including status bar area) so no underlying
 * content is visible. Requires explicit acknowledgement to dismiss.
 */
export function TaskAlarmOverlay() {
  const payload = useOverlayStore((s) => s.taskAlarm);
  const clear = useOverlayStore((s) => s.clearTaskAlarm);

  if (!payload) return null;
  return <TaskAlarmContent payload={payload} onDismiss={clear} />;
}

function TaskAlarmContent({
  payload,
  onDismiss,
}: {
  payload: NonNullable<ReturnType<typeof useOverlayStore.getState>['taskAlarm']>;
  onDismiss: () => void;
}) {
  const pulse = useSharedValue(0);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    // Initial heavy haptic burst
    haptics.heavy();
    setTimeout(() => haptics.heavy(), 300);
    setTimeout(() => haptics.heavy(), 600);

    // Continuous pulse for the background and text
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true
    );

    // Expanding rings
    ringScale.value = withRepeat(
      withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 400 }),
        withTiming(0, { duration: 1600 }),
      ),
      -1,
      false
    );
  }, [pulse, ringScale, ringOpacity]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + pulse.value * 0.2,
  }));

  const textGlowStyle = useAnimatedStyle(() => ({
    textShadowRadius: 10 + pulse.value * 15,
    textShadowOpacity: 0.5 + pulse.value * 0.5,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.fullScreen}>
      {/* Hide status bar content while alarm is showing */}
      <StatusBar backgroundColor={colors.bg} barStyle="light-content" />

      {/* Fully opaque background — NO content visible behind */}
      <Animated.View style={[styles.backdrop, bgStyle]}>
        <LinearGradient
          colors={[
            withAlpha(colors.crimson, 0.12),
            colors.bg,
            withAlpha(colors.systemBlue, 0.12),
          ]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]} />
        {/* Second expanding ring for depth */}
        <Animated.View style={[styles.ring2, ringStyle]} />

        <Text variant="label" color={colors.phantomCyan}>
          {'「'}SYSTEM ALERT{'」'}
        </Text>

        <Animated.Text
          style={[
            styles.header,
            { color: colors.systemBlue, textShadowColor: colors.systemBlue, textShadowOffset: { width: 0, height: 0 } },
            textGlowStyle,
          ]}
        >
          {'「'}TASK STARTING{'」'}
        </Animated.Text>

        <View style={styles.taskCard}>
          <LinearGradient
            colors={[withAlpha(colors.systemBlue, 0.12), 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <Text variant="mono" color={colors.textSecondary} center style={{ letterSpacing: 2, marginBottom: 8 }}>
            CURRENT OBJECTIVE
          </Text>
          <Text variant="title" color={colors.text} center style={{ fontSize: 28, lineHeight: 34 }}>
            {payload.activity.toUpperCase()}
          </Text>
        </View>

        <View style={styles.actionWrap}>
          <Button
            label="ACKNOWLEDGE"
            onPress={() => {
              haptics.tick();
              onDismiss();
            }}
            variant="primary"
            size="lg"
            haptic="heavy"
            full
          />
        </View>
      </View>
    </Animated.View>
  );
}

const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

const styles = StyleSheet.create({
  fullScreen: {
    position: 'absolute',
    top: -statusBarHeight,
    left: 0,
    width: width,
    height: height + statusBarHeight,
    zIndex: 99999,
    elevation: 99999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: statusBarHeight,
    gap: 12,
    zIndex: 10,
  },
  header: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    letterSpacing: 6,
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: colors.systemBlue,
    top: '50%',
    marginTop: -150,
  },
  ring2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 0.5,
    borderColor: withAlpha(colors.systemBlue, 0.4),
    top: '50%',
    marginTop: -110,
  },
  taskCard: {
    width: '100%',
    backgroundColor: withAlpha(colors.systemBlue, 0.06),
    borderWidth: 1,
    borderColor: withAlpha(colors.systemBlue, 0.3),
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 40,
    overflow: 'hidden',
  },
  actionWrap: {
    width: '100%',
    paddingHorizontal: 32,
  },
});
