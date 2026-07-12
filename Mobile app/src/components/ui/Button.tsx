import { ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { colors, radius, withAlpha } from '@/theme';
import { Text } from './Text';
import { haptics } from '@/services/notifications/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  full?: boolean;
  haptic?: 'tap' | 'heavy' | 'none';
}

const variantColors: Record<Variant, { bg: string; fg: string; border: string; glow?: string }> = {
  primary: { bg: colors.energyBright, fg: colors.bg, border: colors.energyBright, glow: colors.energy },
  secondary: { bg: colors.surface2, fg: colors.text, border: colors.borderBright },
  ghost: { bg: 'transparent', fg: colors.textSecondary, border: colors.border },
  danger: { bg: withAlpha(colors.crimson, 0.15), fg: colors.crimson, border: colors.crimson },
  gold: { bg: colors.gold, fg: colors.bg, border: colors.gold, glow: colors.gold },
  outline: { bg: 'transparent', fg: colors.text, border: colors.borderBright },
};

export function Button({
  label, onPress, variant = 'primary', disabled, loading, icon, style, full, haptic = 'tap',
}: ButtonProps) {
  const c = variantColors[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
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
          backgroundColor: c.bg,
          borderColor: c.border,
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
          shadowColor: c.glow ?? 'transparent',
          shadowOpacity: c.glow ? 0.6 : 0,
          shadowRadius: c.glow ? 16 : 0,
          elevation: c.glow ? 8 : 0,
        },
        full && styles.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="heading" color={c.fg}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.base,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
