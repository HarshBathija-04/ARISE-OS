import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BootSequence } from '@/components/system/BootSequence';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/services/notifications/haptics';

type Stage = 'loading' | 'boot' | 'ready' | 'redirect';

/**
 * Entry orchestrator — Solo Leveling System Awakening:
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

  // ready — Solo Leveling "System Confirmed" screen
  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.ready}>
      {/* Ambient vertical light beam */}
      <Animated.View entering={FadeIn.delay(100).duration(800)} style={styles.beam}>
        <LinearGradient
          colors={['transparent', withAlpha(colors.systemBlue, 0.15), 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(600)}>
        <Text variant="label" color={colors.phantomCyan} center>
          {'「'}SYSTEM{'」'}
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.readyBody}>
        <Text variant="heading" color={colors.text} center>
          YOUR CURRENT STATE HAS BEEN RECORDED.
        </Text>
        <Text variant="heading" color={colors.systemBlue} center glowColor={withAlpha(colors.systemBlue, 0.6)}>
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
          {/* Dungeon gate gradient */}
          <LinearGradient
            colors={[colors.dungeonGateStart, colors.dungeonGateEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text variant="heading" color={colors.white}>
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
  beam: {
    position: 'absolute',
    left: '48%',
    width: 4,
    top: 0,
    bottom: 0,
  },
  readyBody: { gap: 16, alignItems: 'center' },
  enterWrap: { marginTop: 20 },
  enterBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    // Dungeon gate glow
    shadowColor: colors.systemBlue,
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
});
