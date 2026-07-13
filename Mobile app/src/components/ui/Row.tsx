import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Text } from './Text';
import { haptics } from '@/services/notifications/haptics';

interface RowProps {
  label: string;
  /** Secondary line under the label. */
  sub?: string;
  /** Leading icon element. */
  icon?: ReactNode;
  /** Trailing content (overrides the default chevron). */
  right?: ReactNode;
  onPress?: () => void;
  /** Hide the trailing chevron on navigable rows. */
  hideChevron?: boolean;
  accent?: string;
  style?: ViewStyle;
}

/**
 * Solo Leveling system-row — a tappable list entry with the system window
 * border treatment, left edge accent bar with glow, and cold text styling.
 *
 * Layout: [accent-edge] [icon] [label + sub] [right / chevron]
 * All in a single horizontal flex row.
 */
export function Row({ label, sub, icon, right, onPress, hideChevron, accent, style }: RowProps) {
  const interactive = !!onPress;

  const content = (
    <>
      {accent ? (
        <View style={[styles.edge, { backgroundColor: accent, shadowColor: accent }]} />
      ) : null}
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.body}>
        <Text variant="mono" color={colors.text} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" color={colors.textDim} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (interactive && !hideChevron ? <ChevronRight size={18} color={colors.textDim} /> : null)}
    </>
  );

  if (interactive) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          try { haptics.tick(); } catch {}
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.row,
          {
            opacity: pressed ? 0.85 : 1,
            borderColor: pressed ? withAlpha(accent ?? colors.systemBlue, 0.5) : withAlpha(colors.border, 0.8),
          },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    backgroundColor: withAlpha(colors.surface, 0.9),
    borderWidth: 1,
    borderColor: withAlpha(colors.border, 0.8),
    borderRadius: radius.md,
    paddingLeft: spacing.base + 3, // extra left padding to clear the accent edge
    paddingRight: spacing.base,
    paddingVertical: spacing.md,
    overflow: 'hidden',
    // Subtle system glow
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { width: 24, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    // Glow on accent edge
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
});
