import { View, StyleSheet } from 'react-native';
import {
  Canvas, Path, Skia, Group, BlurMask, LinearGradient, vec,
} from '@shopify/react-native-skia';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';

interface PerformanceHexProps {
  score: number; // 0..100
  status: string;
  size?: number;
}

function hexPath(cx: number, cy: number, r: number) {
  const p = Skia.Path.Make();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.close();
  return p;
}

function scoreColor(score: number): string {
  if (score >= 85) return colors.phantomCyan;
  if (score >= 70) return colors.systemBlue;
  if (score >= 50) return colors.monarchGold;
  if (score >= 30) return colors.shadowViolet;
  return colors.crimson;
}

/**
 * Solo Leveling hexagonal performance indicator — layered glow rings
 * with system-blue and shadow-violet energy fills.
 */
export function PerformanceHex({ score, status, size = 150 }: PerformanceHexProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.42;
  const mid = size * 0.34;
  const fillR = mid * (0.4 + (Math.max(0, Math.min(100, score)) / 100) * 0.6);
  const color = scoreColor(score);

  const outerPath = hexPath(cx, cy, outer);
  const midPath = hexPath(cx, cy, mid);
  const fillPath = hexPath(cx, cy, fillR);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ width: size, height: size, position: 'absolute' }}>
        {/* Outer ring — system border */}
        <Path path={outerPath} style="stroke" strokeWidth={1.5} color={withAlpha(colors.systemBlue, 0.3)} />
        {/* Mid ring with system glow */}
        <Group>
          <Path path={midPath} style="stroke" strokeWidth={1.5} color={color} opacity={0.6} />
          <BlurMask blur={8} style="solid" />
        </Group>
        {/* Filled core — shadow energy gradient */}
        <Group>
          <Path path={fillPath} style="fill" opacity={0.85}>
            <LinearGradient
              start={vec(cx, cy - fillR)}
              end={vec(cx, cy + fillR)}
              colors={[color, colors.surface]}
            />
          </Path>
          <BlurMask blur={14} style="normal" />
        </Group>
        <Path path={fillPath} style="stroke" strokeWidth={1.5} color={color} opacity={0.9} />
      </Canvas>

      <View style={styles.center}>
        <Text
          variant="readout"
          color={colors.text}
          glowColor={withAlpha(color, 0.4)}
          style={styles.scoreText}
        >
          {Math.round(score)}
        </Text>
        <Text variant="caption" color={color}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 40, lineHeight: 44 },
});
