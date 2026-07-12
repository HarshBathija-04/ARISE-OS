import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import { systemDateLabel } from '@/utils/date';

/**
 * 「SOLO · OS」 masthead — Solo Leveling System header with pulsing
 * blue aura, scan line, and cold system date display.
 */
export function SystemHeader() {
  const pulse = useSharedValue(0.3);
  const scanX = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    scanX.value = withRepeat(withTiming(1, { duration: 3000 }), -1, false);
  }, [pulse, scanX]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const scanStyle = useAnimatedStyle(() => ({
    opacity: 0.15 - scanX.value * 0.15,
    transform: [{ translateX: scanX.value * 320 }],
  }));

  return (
    <View style={styles.header}>
      {/* Ambient glow behind title */}
      <LinearGradient
        colors={[withAlpha(colors.systemBlue, 0.1), 'transparent']}
        style={styles.ambientGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
      />

      <View>
        <Text
          variant="systemTitle"
          color={colors.text}
          glowColor={withAlpha(colors.systemBlue, 0.6)}
          style={styles.brand}
        >
          {'「'}SOLO · OS{'」'}
        </Text>
        <Text variant="caption" color={colors.textDim}>
          MISSION DATE // {systemDateLabel().toUpperCase()}
        </Text>
      </View>

      <View style={styles.statusCol}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.dot, dotStyle]} />
          <Text variant="caption" color={colors.phantomCyan}>
            SYSTEM ONLINE
          </Text>
        </View>
      </View>

      {/* Faint horizontal scan line */}
      <Animated.View style={[styles.scanLine, scanStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 200,
    height: 100,
  },
  brand: { fontSize: 26, letterSpacing: 5 },
  statusCol: { alignItems: 'flex-end', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.phantomCyan,
    shadowColor: colors.phantomCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  scanLine: {
    position: 'absolute',
    bottom: -2,
    left: -20,
    width: 60,
    height: 1,
    backgroundColor: colors.systemBlue,
  },
});
