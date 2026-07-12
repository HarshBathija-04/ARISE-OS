/**
 * SOLO OS — Responsive scaling helpers.
 *
 * The app must feel right on a 320-wide budget phone and a 430-wide flagship
 * alike. We scale a handful of key sizes off the device width (guideline base
 * = 375, the iPhone X/11 width the layouts were tuned on) and clamp the result
 * so nothing balloons on large devices or collapses on small ones.
 *
 * Use `moderateScale` for spacing/sizes that should grow gently with the screen,
 * and `useResponsive()` in components that need live width / breakpoint info.
 */
import { Dimensions, PixelRatio } from 'react-native';
import { useWindowDimensions } from 'react-native';

const GUIDELINE_BASE_WIDTH = 375;

/** Small/large phone breakpoints (portrait width). */
export const breakpoints = {
  small: 350, // iPhone SE / older compact Androids
  large: 410, // Plus / Max / large Androids
} as const;

/** Linear scale of `size` by the device width vs the guideline width. */
export function scale(size: number, width = Dimensions.get('window').width): number {
  return (width / GUIDELINE_BASE_WIDTH) * size;
}

/**
 * Scale `size` toward the linear scale by `factor` (0 = no scaling, 1 = full),
 * then clamp to ±18% of the original so budget/flagship devices stay sane.
 * Rounded to the nearest pixel for crisp borders.
 */
export function moderateScale(size: number, factor = 0.5, width?: number): number {
  const target = size + (scale(size, width) - size) * factor;
  const min = size * 0.9;
  const max = size * 1.18;
  const clamped = Math.min(max, Math.max(min, target));
  return PixelRatio.roundToNearestPixel(clamped);
}

export interface Responsive {
  width: number;
  height: number;
  /** Compact device — tighten paddings, drop non-essential chrome. */
  isSmall: boolean;
  /** Large device — allow a touch more breathing room. */
  isLarge: boolean;
  /** Standard horizontal screen gutter, scaled to the device. */
  gutter: number;
  /** Scale a base size gently with the device width. */
  ms: (size: number, factor?: number) => number;
}

/** Live responsive info; re-renders on rotation / foldable resize. */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isSmall = width <= breakpoints.small;
  const isLarge = width >= breakpoints.large;
  const gutter = isSmall ? 14 : isLarge ? 20 : 16;
  return {
    width,
    height,
    isSmall,
    isLarge,
    gutter,
    ms: (size: number, factor = 0.5) => moderateScale(size, factor, width),
  };
}
