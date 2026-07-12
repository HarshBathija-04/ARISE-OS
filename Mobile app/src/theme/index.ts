/**
 * SOLO OS — Theme barrel + layout tokens.
 * Import `theme` for a single object, or import individual pieces.
 */
import { ViewStyle } from 'react-native';
import { colors, withAlpha } from './colors';
import { fontFamily, fontSize, letterSpacing, textPresets } from './typography';

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

/** Glow presets — used sparingly to represent energy / progression. */
export function glow(color: string, intensity: 'soft' | 'medium' | 'strong' = 'medium'): ViewStyle {
  const map = {
    soft: { radius: 8, opacity: 0.35, elevation: 3 },
    medium: { radius: 16, opacity: 0.55, elevation: 6 },
    strong: { radius: 28, opacity: 0.8, elevation: 12 },
  } as const;
  const g = map[intensity];
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: g.opacity,
    shadowRadius: g.radius,
    elevation: g.elevation,
  };
}

export const theme = {
  colors,
  spacing,
  radius,
  fontFamily,
  fontSize,
  letterSpacing,
  text: textPresets,
  glow,
  withAlpha,
} as const;

export type Theme = typeof theme;
export { colors, withAlpha, fontFamily, fontSize, letterSpacing, textPresets };
export { rarityColor } from './colors';
