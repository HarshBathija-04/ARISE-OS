/**
 * SOLO OS — Theme barrel + layout tokens.
 *
 * Solo Leveling–inspired utilities:
 *  - `systemGlow()` – the iconic blue window-edge glow
 *  - `shadowAura()` – violet ambient aura for monarch energy
 *  - `statusWindowBorder()` – double-line system window borders
 *
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

/**
 * System Window glow — the iconic Solo Leveling blue border glow.
 * Used on panel edges and active elements.
 */
export function systemGlow(intensity: 'soft' | 'medium' | 'strong' = 'medium'): ViewStyle {
  return glow(colors.systemBlue, intensity);
}

/**
 * Shadow Aura — violet ambient glow for monarch-energy themed elements.
 */
export function shadowAura(intensity: 'soft' | 'medium' | 'strong' = 'soft'): ViewStyle {
  return glow(colors.shadowViolet, intensity);
}

/**
 * Status Window border style — the double-line system window look
 * from Solo Leveling's floating panels. Outer hairline + inner glow.
 */
export function statusWindowBorder(accent: string = colors.systemBlue): ViewStyle {
  return {
    borderWidth: 1,
    borderColor: withAlpha(accent, 0.4),
    shadowColor: accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
  systemGlow,
  shadowAura,
  statusWindowBorder,
  withAlpha,
} as const;

export type Theme = typeof theme;
export { colors, withAlpha, fontFamily, fontSize, letterSpacing, textPresets };
export { rarityColor } from './colors';
export {
  scale,
  moderateScale,
  useResponsive,
  breakpoints,
  type Responsive,
} from './responsive';
