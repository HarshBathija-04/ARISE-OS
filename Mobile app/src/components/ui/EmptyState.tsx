import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { Text } from './Text';

interface EmptyStateProps {
  /** Lucide icon element, e.g. <Swords size={22} color={...} />. */
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  accent?: string;
}

/**
 * Solo Leveling empty state — a system window placeholder with a double-bordered
 * icon badge, cold text, and the system window background treatment.
 */
export function EmptyState({ icon, title, hint, accent = colors.systemBlue }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, { borderColor: withAlpha(accent, 0.2) }]}>
      {icon ? (
        <View
          style={[
            styles.badge,
            {
              borderColor: withAlpha(accent, 0.4),
              backgroundColor: withAlpha(accent, 0.06),
              shadowColor: accent,
            },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <Text variant="heading" color={colors.textSecondary} center>
        {title}
      </Text>
      {hint ? (
        <Text variant="caption" color={colors.textDim} center style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: withAlpha(colors.surface, 0.6),
    // Subtle system window glow
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    // Badge glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  hint: { maxWidth: 280, lineHeight: 16 },
});
