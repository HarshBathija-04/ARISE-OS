import { ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, withAlpha, glow } from '@/theme';
import { Text } from './Text';
import { haptics } from '@/services/notifications/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  /** Render the icon after the label instead of before. */
  iconRight?: boolean;
  style?: ViewStyle;
  full?: boolean;
  haptic?: 'tap' | 'heavy' | 'none';
}

const variantColors: Record<Variant, { bg: string; fg: string; border: string; glow?: string; gradient?: [string, string] }> = {
  primary: {
    bg: colors.systemBlue,
    fg: colors.white,
    border: colors.systemBlue,
    glow: colors.systemBlue,
    gradient: [colors.dungeonGateStart, colors.dungeonGateEnd],
  },
  secondary: { bg: colors.surface2, fg: colors.text, border: colors.borderBright },
  ghost: { bg: 'transparent', fg: colors.textSecondary, border: colors.border },
  danger: { bg: withAlpha(colors.crimson, 0.14), fg: colors.crimson, border: withAlpha(colors.crimson, 0.55) },
  gold: {
    bg: colors.monarchGold,
    fg: colors.bg,
    border: colors.monarchGold,
    glow: colors.monarchGold,
    gradient: [colors.monarchGold, '#FFD700'],
  },
  outline: { bg: 'transparent', fg: colors.text, border: colors.borderBright },
};

// Every size keeps a comfortable tap target (>= 44px, the platform minimum).
const sizeStyle: Record<Size, { minHeight: number; padV: number; padH: number; text: 'heading' | 'label' }> = {
  sm: { minHeight: 40, padV: 8, padH: 16, text: 'label' },
  md: { minHeight: 48, padV: 12, padH: 20, text: 'heading' },
  lg: { minHeight: 54, padV: 15, padH: 24, text: 'heading' },
};

/**
 * Solo Leveling–styled button. Primary variant uses the iconic
 * dungeon-gate gradient (system blue → shadow violet) with glow.
 */
export function Button({
  label, onPress, variant = 'primary', size = 'md', disabled, loading, icon, iconRight,
  style, full, haptic = 'tap',
}: ButtonProps) {
  const c = variantColors[variant];
  const sz = sizeStyle[size];
  const isDisabled = disabled || loading;
  const glowStyle = c.glow && !isDisabled ? glow(c.glow, 'medium') : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={() => {
        if (isDisabled) return;
        try {
          if (haptic === 'tap') haptics.tap();
          else if (haptic === 'heavy') haptics.heavy();
        } catch {}
        onPress?.();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: sz.minHeight,
          paddingVertical: sz.padV,
          paddingHorizontal: sz.padH,
          backgroundColor: c.gradient ? 'transparent' : c.bg,
          borderColor: c.border,
          opacity: isDisabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        glowStyle,
        full && styles.full,
        style,
      ]}
    >
      {/* Dungeon gate gradient for primary & gold */}
      {c.gradient && !isDisabled && (
        <LinearGradient
          colors={c.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {c.gradient && isDisabled && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: 0.5 }]} />
      )}
      {loading ? (
        <ActivityIndicator color={c.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {!iconRight && icon}
          <Text variant={sz.text} color={c.fg} numberOfLines={1}>
            {label}
          </Text>
          {iconRight && icon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  full: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
