import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '@/theme';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  glow?: boolean;
  animated?: boolean;
  style?: ViewStyle;
}

/** Glowing animated energy line used for XP and progress. */
export function ProgressBar({
  progress,
  color = colors.energyBright,
  trackColor = colors.surface2,
  height = 8,
  glow = true,
  animated = true,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress));
  const w = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    w.value = animated ? withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) }) : pct;
  }, [pct, animated, w]);

  useEffect(() => {
    if (!glow) return;
    shimmer.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, shimmer]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.4 + shimmer.value * 0.5 }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}>
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillStyle]}>
        <LinearGradient
          colors={[withAlpha(color, 0.7), color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {glow && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: height / 2,
                shadowColor: color,
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 6,
              },
              glowStyle,
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', overflow: 'hidden' },
});
