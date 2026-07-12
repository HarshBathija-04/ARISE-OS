import { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence,
  withRepeat, Easing, FadeIn, useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha, rarityColor } from '@/theme';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';

const { height } = Dimensions.get('window');

/** Full-screen rarity-colored ACHIEVEMENT UNLOCKED overlay. */
export function AchievementUnlockOverlay() {
  const payload = useOverlayStore((s) => s.achievement);
  const clear = useOverlayStore((s) => s.clearAchievement);
  if (!payload) return null;
  return <Content payload={payload} onDismiss={clear} />;
}

function Content({
  payload,
  onDismiss,
}: {
  payload: NonNullable<ReturnType<typeof useOverlayStore.getState>['achievement']>;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion();
  const badgeScale = useSharedValue(reduced ? 1 : 0.3);
  const ring = useSharedValue(0);
  const rc = rarityColor[payload.rarity] ?? colors.rarityCommon;

  useEffect(() => {
    haptics.success();
    if (reduced) return;
    badgeScale.value = withSequence(
      withTiming(1.18, { duration: 420, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 }),
    );
    ring.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [badgeScale, ring, reduced]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 - ring.value * 0.5,
    transform: [{ scale: 0.6 + ring.value * 1.5 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 280)} style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <LinearGradient colors={[withAlpha(rc, 0.22), colors.bg, colors.bg]} style={StyleSheet.absoluteFill} />

        <View style={styles.center}>
          <Text variant="label" color={colors.cyan}>SYSTEM EVENT</Text>
          <Text variant="title" color={rc} glowColor={rc} style={styles.header}>ACHIEVEMENT UNLOCKED</Text>

          <View style={styles.badgeStack}>
            {!reduced && <Animated.View style={[styles.ring, { borderColor: rc }, ringStyle]} />}
            <Animated.View style={[styles.badge, { borderColor: rc, backgroundColor: withAlpha(rc, 0.12) }, badgeStyle]}>
              <Trophy size={44} color={rc} />
            </Animated.View>
          </View>

          <Text variant="heading" color={colors.text} glowColor={rc} center style={styles.name}>
            {payload.name.toUpperCase()}
          </Text>
          <View style={[styles.rarityChip, { borderColor: rc }]}>
            <Text variant="caption" color={rc}>{payload.rarity}</Text>
          </View>
          <Text variant="body" color={colors.textSecondary} center style={styles.desc}>
            {payload.description}
          </Text>

          <Animated.View entering={FadeIn.delay(reduced ? 0 : 900)} style={styles.tapHint}>
            <Text variant="caption" color={colors.textDim}>TAP TO CONTINUE</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: withAlpha(colors.bg, 0.96) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  header: { fontSize: 24, letterSpacing: 4, marginBottom: 8, textAlign: 'center' },
  badgeStack: { alignItems: 'center', justifyContent: 'center', marginVertical: 12, width: 160, height: 160 },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2 },
  badge: {
    width: 108, height: 108, borderRadius: 54, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { marginTop: 4, letterSpacing: 2 },
  rarityChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3 },
  desc: { marginTop: 4, lineHeight: 20 },
  tapHint: { position: 'absolute', bottom: -height * 0.26 },
});
