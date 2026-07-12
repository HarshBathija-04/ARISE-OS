import { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, Easing, cancelAnimation, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import { haptics } from '@/services/notifications/haptics';

const { width } = Dimensions.get('window');

interface BootLine {
  text: string;
  delay: number;
  kind?: 'normal' | 'warn' | 'title' | 'player' | 'ok' | 'system';
}

// ~9.5s total sequence — Solo Leveling 「SYSTEM」 awakening.
const LINES: BootLine[] = [
  { text: '「SOLO OS」', delay: 200, kind: 'title' },
  { text: '「SYSTEM」 CORE INITIALIZATION', delay: 900, kind: 'system' },
  { text: 'PLAYER SIGNAL DETECTED', delay: 1500 },
  { text: '「SYSTEM」 ANALYSING CURRENT STATE', delay: 2100, kind: 'system' },
  { text: 'CALIBRATING ATTRIBUTE MATRIX', delay: 2700 },
  { text: 'IDENTIFYING PRIMARY OBJECTIVES', delay: 3300 },
  { text: '⚠ DISCIPLINE INSTABILITY DETECTED', delay: 4000, kind: 'warn' },
  { text: '⚠ FOCUS VARIANCE DETECTED', delay: 4500, kind: 'warn' },
  { text: '⚠ PHYSICAL DEVELOPMENT REQUIRED', delay: 5000, kind: 'warn' },
  { text: 'TECHNICAL GROWTH PATH IDENTIFIED', delay: 5600 },
  { text: '「SYSTEM」 PLAYER PROFILE CREATED', delay: 6300, kind: 'ok' },
  { text: 'HARSH BATHIJA', delay: 6900, kind: 'player' },
  { text: 'LEVEL 1', delay: 7300, kind: 'player' },
  { text: 'RANK: INITIATE', delay: 7600, kind: 'player' },
  { text: '「SYSTEM」 LINK ESTABLISHED', delay: 8300, kind: 'ok' },
  { text: '「SOLO OS」 ONLINE', delay: 9000, kind: 'title' },
];

const TOTAL = 9800;

function lineColor(kind: BootLine['kind']): string {
  switch (kind) {
    case 'warn': return colors.crimson;
    case 'ok': return colors.phantomCyan;
    case 'player': return colors.monarchGold;
    case 'title': return colors.energyBright;
    case 'system': return colors.systemBlue;
    default: return colors.textSecondary;
  }
}

function BootLineView({ line, index }: { line: BootLine; index: number }) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(-8);
  const flicker = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      haptics.tick();
      opacity.value = withTiming(1, { duration: 260 });
      tx.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
      // brief flicker on reveal
      flicker.value = withSequence(
        withTiming(0.4, { duration: 40 }),
        withTiming(1, { duration: 60 }),
        withTiming(0.7, { duration: 40 }),
        withTiming(1, { duration: 60 }),
      );
    }, line.delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value * flicker.value,
    transform: [{ translateX: tx.value }],
  }));

  const isTitle = line.kind === 'title';
  const isPlayer = line.kind === 'player';
  const isSystem = line.kind === 'system';

  return (
    <Animated.View style={[styles.lineRow, style]}>
      {!isTitle && (
        <Text variant="caption" color={withAlpha(lineColor(line.kind), 0.5)} style={styles.marker}>
          {`>`}
        </Text>
      )}
      <Text
        variant={isTitle ? 'title' : isPlayer ? 'heading' : 'mono'}
        color={lineColor(line.kind)}
        glowColor={isTitle || isPlayer || isSystem ? lineColor(line.kind) : undefined}
        style={isTitle ? styles.titleText : undefined}
      >
        {line.text}
      </Text>
    </Animated.View>
  );
}

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const done = useRef(false);
  const scan = useSharedValue(0);
  const pulse = useSharedValue(0.3);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    haptics.success();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Progressive reveal counter (drives which lines are mounted).
    LINES.forEach((l, i) => {
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), l.delay);
    });
    const end = setTimeout(finish, TOTAL);

    scan.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    pulse.value = withRepeat(withTiming(0.7, { duration: 1400 }), -1, true);

    return () => {
      clearTimeout(end);
      cancelAnimation(scan);
      cancelAnimation(pulse);
    };
  }, [finish, scan, pulse]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * 620 - 60 }],
    opacity: 0.6 - scan.value * 0.4,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.container}>
      {/* Ambient radial glow — system blue */}
      <Animated.View style={[styles.ambient, glowStyle]}>
        <LinearGradient
          colors={[withAlpha(colors.systemBlue, 0.2), 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Secondary violet ambient */}
      <LinearGradient
        colors={['transparent', withAlpha(colors.shadowViolet, 0.06)]}
        style={styles.ambientBottom}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Scan line — thicker, system blue */}
      <Animated.View style={[styles.scanline, scanStyle]} />

      <View style={styles.content}>
        {LINES.slice(0, visibleCount).map((line, i) => (
          <BootLineView key={line.text + i} line={line} index={i} />
        ))}
      </View>

      <Pressable
        style={styles.skip}
        onPress={() => {
          runOnJS(finish)();
        }}
        hitSlop={16}
      >
        <Text variant="label" color={colors.textDim}>
          SKIP
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  ambientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  scanline: {
    position: 'absolute',
    left: 0,
    width,
    height: 3,
    backgroundColor: withAlpha(colors.systemBlue, 0.4),
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  marker: { width: 12 },
  titleText: { fontSize: 30, letterSpacing: 6, marginVertical: 8 },
  skip: {
    position: 'absolute',
    top: 56,
    right: 24,
    borderWidth: 1,
    borderColor: withAlpha(colors.systemBlue, 0.3),
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: withAlpha(colors.surface, 0.5),
  },
});
