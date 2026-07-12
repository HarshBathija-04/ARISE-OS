import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { colors, fontFamily, fontSize, letterSpacing } from '@/theme';

type Variant =
  | 'systemTitle'
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
}

const variantStyle: Record<Variant, TextStyle> = {
  systemTitle: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.widest,
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

/** Themed text. Defaults to cold-white body. */
export function Text({
  variant = 'body',
  color,
  dim,
  center,
  glowColor,
  style,
  ...rest
}: TextProps) {
  const resolved = color ?? (dim ? colors.textSecondary : colors.text);
  const glowStyle: TextStyle = glowColor
    ? { textShadowColor: glowColor, textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } }
    : {};
  return (
    <RNText
      {...rest}
      style={[
        variantStyle[variant],
        { color: resolved },
        center && { textAlign: 'center' },
        glowStyle,
        style,
      ]}
    />
  );
}
