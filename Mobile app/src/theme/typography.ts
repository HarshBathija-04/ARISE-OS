/**
 * SOLO OS — Typography system.
 *
 * Solo Leveling–inspired:
 *  - `mono` : System readouts, 「SYSTEM」 messages — cold terminal.
 *  - `sans` : Body / descriptions.
 *  - `systemWindow`: Authoritarian System window headers with wide tracking.
 *
 * We use platform default fonts (no custom font files required to run),
 * but centralize sizes, weights, spacing so the "System" feel is consistent.
 */
import { Platform, TextStyle } from 'react-native';

const monoFamily = Platform.select({
  android: 'monospace',
  ios: 'Menlo',
  default: 'monospace',
});

export const fontFamily = {
  mono: monoFamily as string,
  sans: Platform.select({ android: 'sans-serif', default: 'System' }) as string,
  sansMedium: Platform.select({
    android: 'sans-serif-medium',
    default: 'System',
  }) as string,
} as const;

export const fontSize = {
  micro: 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 38,
  '4xl': 48,
  display: 64,
} as const;

export const letterSpacing = {
  tight: -0.4,
  normal: 0,
  wide: 1,
  wider: 2,
  widest: 4,
  /** Extra-wide for 「SYSTEM」 announcements. */
  system: 6,
} as const;

/** Named text presets used throughout the UI. */
export const textPresets = {
  /** Big terminal-style headers: "SOLO OS", "LEVEL INCREASE". */
  systemTitle: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.widest,
    fontWeight: '700',
  } as TextStyle,
  /** 「SYSTEM」 window titles — authoritarian, cold, wide. */
  systemWindow: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    letterSpacing: letterSpacing.system,
    fontWeight: '700',
  } as TextStyle,
  /** Section labels like "DAILY MISSIONS". */
  label: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: '600',
  } as TextStyle,
  /** Large numeric readouts (level number, score). */
  readout: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.tight,
    fontWeight: '700',
  } as TextStyle,
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,
  caption: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,
} as const;
