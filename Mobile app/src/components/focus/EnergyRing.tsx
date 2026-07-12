import { useEffect } from 'react';
import { Canvas, Path, Skia, Group, BlurMask, SweepGradient, vec } from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme';

interface EnergyRingProps {
  size: number;
  progress: number; // 0..1
  color: string;
  running: boolean;
}

/** Minimal animated energy ring for the focus timer. */
export function EnergyRing({ size, progress, color, running }: EnergyRingProps) {
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const rot = useSharedValue(0);
  useEffect(() => {
    if (running) {
      rot.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false);
    } else {
      rot.value = 0;
    }
  }, [running, rot]);

  const ringPath = Skia.Path.Make();
  ringPath.addCircle(cx, cy, r);

  const progressPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addArc(
      { x: stroke, y: stroke, width: r * 2, height: r * 2 },
      -90,
      360 * Math.max(0, Math.min(1, progress)),
    );
    return p;
  }, [progress]);

  const transform = useDerivedValue(() => [{ rotate: (rot.value * Math.PI) / 180 }]);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Track */}
      <Path path={ringPath} style="stroke" strokeWidth={stroke} color={colors.surface2} />
      {/* Rotating glow accent */}
      <Group origin={vec(cx, cy)} transform={transform}>
        <Path path={ringPath} style="stroke" strokeWidth={stroke} opacity={0.25}>
          <SweepGradient c={vec(cx, cy)} colors={['transparent', color, 'transparent']} />
        </Path>
        <BlurMask blur={8} style="normal" />
      </Group>
      {/* Progress arc */}
      <Group>
        <Path
          path={progressPath}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
          color={color}
        />
        <BlurMask blur={6} style="solid" />
      </Group>
    </Canvas>
  );
}
