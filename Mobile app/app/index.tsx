import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BootSequence } from '@/components/system/BootSequence';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/services/notifications/haptics';

type Stage = 'loading' | 'boot' | 'ready' | 'redirect';

/**
 * Entry orchestrator:
 *  - If onboarding already complete → straight to the System tab.
 *  - Otherwise → cinematic boot → "state recorded" → ENTER SYSTEM.
 * Onboarding completion is persisted (local store + Supabase when connected),
 * so the full boot does not replay on every launch.
 */
export default function Index() {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const onboardingComplete = useGameStore((s) => s.profile.onboardingComplete);
  const ensureSeeded = useGameStore((s) => s.ensureSeeded);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const [stage, setStage] = useState<Stage>('loading');

  useEffect(() => {
    if (!hydrated) return;
    ensureSeeded();
    // Boot gating: decide the entry stage once persistence has hydrated.
    if (onboardingComplete) router.replace('/(tabs)/system');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage(onboardingComplete ? 'redirect' : 'boot');
  }, [hydrated, onboardingComplete, ensureSeeded, router]);

  if (stage === 'loading' || stage === 'redirect') {
    return <View style={styles.blank} />;
  }

  if (stage === 'boot') {
    return <BootSequence onComplete={() => setStage('ready')} />;
  }

  // ready
  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.ready}>
      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Text variant="label" color={colors.cyan} center>
          SYSTEM MESSAGE
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.readyBody}>
        <Text variant="heading" color={colors.text} center>
          YOUR CURRENT STATE HAS BEEN RECORDED.
        </Text>
        <Text variant="heading" color={colors.energyBright} center glowColor={colors.energy}>
          PROGRESSION BEGINS NOW.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(1000).duration(600)} style={styles.enterWrap}>
        <Pressable
          style={styles.enterBtn}
          onPress={() => {
            haptics.heavy();
            completeOnboarding();
            router.replace('/(tabs)/system');
          }}
        >
          <Text variant="heading" color={colors.bg}>
            ENTER SYSTEM
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  ready: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  readyBody: { gap: 16, alignItems: 'center' },
  enterWrap: { marginTop: 20 },
  enterBtn: {
    backgroundColor: colors.energyBright,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: colors.energy,
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
});
