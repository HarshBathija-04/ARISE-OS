import { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Text } from './Text';

interface PanelProps {
  children?: ReactNode;
  label?: string;
  /** Accent color for the label bar + left edge. */
  accent?: string;
  style?: ViewStyle;
  padded?: boolean;
  right?: ReactNode;
}

/**
 * The core "system panel" surface — a dark card with a hairline border,
 * a subtle accented header, and an energy edge. Used for every section.
 */
export function Panel({
  children,
  label,
  accent = colors.energy,
  style,
  padded = true,
  right,
}: PanelProps) {
  return (
    <View style={[styles.panel, style]}>
      {label ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.tick, { backgroundColor: accent }]} />
            <Text variant="label" color={colors.textSecondary}>
              {label}
            </Text>
          </View>
          {right}
        </View>
      ) : null}
      <View style={padded ? styles.body : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.border, 0.6),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 3, height: 12, borderRadius: 2 },
  body: { padding: spacing.base },
});
