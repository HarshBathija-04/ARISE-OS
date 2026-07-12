import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Text } from './Text';
import { haptics } from '@/services/notifications/haptics';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Accent color when selected. */
  accent?: string;
  icon?: ReactNode;
  /** Sub-line under the label (e.g. "MIN"). */
  sub?: string;
  /** Grow to fill the row equally (segmented style). */
  grow?: boolean;
  style?: ViewStyle;
}

/**
 * Solo Leveling system-chip — a selectable pill with a blue glow border
 * on selected state. Geometric feel with system window tinting.
 */
export function Chip({ label, selected, onPress, accent = colors.systemBlue, icon, sub, grow, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        try { haptics.tick(); } catch {}
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        grow && styles.grow,
        {
          borderColor: selected ? withAlpha(accent, 0.7) : withAlpha(colors.border, 0.6),
          backgroundColor: selected ? withAlpha(accent, 0.12) : withAlpha(colors.surface, 0.8),
          opacity: pressed ? 0.85 : 1,
        },
        selected && {
          shadowColor: accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text variant={sub ? 'heading' : 'mono'} color={selected ? accent : colors.textSecondary} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {sub ? (
        <Text variant="caption" color={selected ? withAlpha(accent, 0.8) : colors.textDim}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
