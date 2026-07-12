import { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Text } from './Text';

interface PanelProps {
  children?: ReactNode;
  label?: string;
  /** Accent color for the label bar + system window glow. */
  accent?: string;
  style?: ViewStyle;
  padded?: boolean;
  right?: ReactNode;
}

/**
 * Solo Leveling 「System Window」 panel — a translucent blue-glass card
 * with a glowing accented border, corner bracket decorations, and a
 * subtle header gradient. The core visual building block.
 */
export function Panel({
  children,
  label,
  accent = colors.systemBlue,
  style,
  padded = true,
  right,
}: PanelProps) {
  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: withAlpha(accent, 0.3),
          shadowColor: accent,
        },
        style,
      ]}
    >
      {/* Top-left corner bracket 「 */}
      <View style={[styles.cornerTL, { borderColor: withAlpha(accent, 0.6) }]} />
      {/* Bottom-right corner bracket 」 */}
      <View style={[styles.cornerBR, { borderColor: withAlpha(accent, 0.6) }]} />

      {/* Inner glow border line */}
      <View
        style={[
          styles.innerGlow,
          { borderColor: withAlpha(accent, 0.08) },
        ]}
      />

      {label ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.tick, { backgroundColor: accent }]} />
            <Text variant="label" color={colors.textSecondary}>
              {'「'}{label}{'」'}
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
    backgroundColor: withAlpha(colors.surface, 0.9),
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    // System window glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md - 1,
    borderWidth: 1,
    margin: 2,
    pointerEvents: 'none',
  },
  cornerTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: radius.md,
    zIndex: 1,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: radius.md,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.border, 0.5),
    backgroundColor: withAlpha(colors.systemBlue, 0.04),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 3, height: 14, borderRadius: 2 },
  body: { padding: spacing.base },
});
