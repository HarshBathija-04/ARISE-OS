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
  /** Show 25% tick segment marks (Solo Leveling HP/MP bar style). */
  segmented?: boolean;
  style?: ViewStyle;
}

/**
 * Solo Leveling HP/MP bar — a glowing energy line with optional segment
 * tick marks, an inner bright core, and a bloom glow on the fill tip.
 */
export function ProgressBar({
  progress,
  color = colors.energyBright,
  trackColor,
  height = 8,
  glow = true,
  animated = true,
  segmented = false,
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

  const resolvedTrackColor = trackColor ?? withAlpha(colors.systemBlue, 0.12);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: resolvedTrackColor,
          borderWidth: 1,
          borderColor: withAlpha(colors.systemBlue, 0.15),
        },
        style,
      ]}
    >
      {/* Segment tick marks at 25%, 50%, 75% */}
      {segmented && (
        <>
          <View style={[styles.tick, { left: '25%', height: height - 2 }]} />
          <View style={[styles.tick, { left: '50%', height: height - 2 }]} />
          <View style={[styles.tick, { left: '75%', height: height - 2 }]} />
        </>
      )}

      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillStyle]}>
        <LinearGradient
          colors={[withAlpha(color, 0.6), color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Inner bright core line */}
        <View
          style={[
            styles.coreLine,
            {
              top: Math.floor(height / 2) - 1,
              backgroundColor: withAlpha('#FFFFFF', 0.3),
            },
          ]}
        />
        {glow && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: height / 2,
                shadowColor: color,
                shadowOpacity: 1,
                shadowRadius: 10,
                elevation: 8,
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
  coreLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 1,
  },
  tick: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: withAlpha(colors.bg, 0.4),
    zIndex: 1,
  },
});
