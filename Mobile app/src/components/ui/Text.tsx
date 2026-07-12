import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { colors, fontFamily, fontSize, letterSpacing } from '@/theme';

type Variant =
  | 'systemTitle'
  | 'systemWindow'
  | 'title'
  | 'heading'
  | 'label'
  | 'readout'
  | 'body'
  | 'caption'
  | 'mono';

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  dim?: boolean;
  center?: boolean;
  glowColor?: string;
  /** Wrap text in Solo Leveling 「」 system brackets. */
  brackets?: boolean;
}

const variantStyle: Record<Variant, TextStyle> = {
  systemTitle: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.widest,
    fontWeight: '700',
  },
  systemWindow: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    letterSpacing: letterSpacing.system,
    fontWeight: '700',
  },
  title: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xl,
    letterSpacing: letterSpacing.wider,
    fontWeight: '700',
  },
  heading: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.md,
    letterSpacing: letterSpacing.wide,
    fontWeight: '600',
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    fontWeight: '600',
  },
  readout: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.tight,
    fontWeight: '700',
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
  },
  caption: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.micro,
    letterSpacing: letterSpacing.wide,
  },
  mono: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.normal,
  },
};

/** Themed text. Defaults to cold-white body. Solo Leveling double-shadow depth on glow. */
export function Text({
  variant = 'body',
  color,
  dim,
  center,
  glowColor,
  brackets,
  style,
  children,
  ...rest
}: TextProps) {
  const resolved = color ?? (dim ? colors.textSecondary : colors.text);

  // Solo Leveling–style double-layer text shadow for depth
  const glowStyle: TextStyle = glowColor
    ? {
        textShadowColor: glowColor,
        textShadowRadius: 16,
        textShadowOffset: { width: 0, height: 0 },
      }
    : {};

  const content = brackets ? `「${children}」` : children;

  return (
    <RNText
      // Respect the user's OS text-size preference, but cap it so large
      // accessibility sizes can't shatter tight terminal layouts.
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        variantStyle[variant],
        { color: resolved },
        center && { textAlign: 'center' },
        glowStyle,
        style,
      ]}
    >
      {content}
    </RNText>
  );
}
