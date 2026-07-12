import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme';
import { systemDateLabel } from '@/utils/date';

/** Top header: SOLO OS wordmark + pulsing SYSTEM ONLINE + date. */
export function SystemHeader() {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1300 }), -1, true);
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.header}>
      <View>
        <Text variant="systemTitle" color={colors.text} glowColor={colors.energy} style={styles.brand}>
          SOLO OS
        </Text>
        <Text variant="caption" color={colors.textDim}>
          {systemDateLabel()}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Animated.View style={[styles.dot, dotStyle]} />
        <Text variant="caption" color={colors.cyan}>
          SYSTEM ONLINE
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  brand: { fontSize: 26, letterSpacing: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.cyan },
});
