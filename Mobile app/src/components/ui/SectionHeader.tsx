import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from './Text';
import { colors, spacing, withAlpha } from '@/theme';

interface SectionHeaderProps {
  title: string;
  accent?: string;
  onPress?: () => void;
  actionLabel?: string;
}

/**
 * Solo Leveling section header — angular bracket 「」 prefix with
 * accent tick and a horizontal rule extending to the right edge.
 */
export function SectionHeader({ title, accent = colors.systemBlue, onPress, actionLabel }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.tick, { backgroundColor: accent }]} />
        <Text variant="label" color={colors.textSecondary}>
          {'「'}{title}{'」'}
        </Text>
      </View>
      {/* Faint horizontal rule extending right */}
      <View style={[styles.rule, { backgroundColor: withAlpha(accent, 0.15) }]} />
      {onPress && (
        <Pressable style={styles.action} onPress={onPress} hitSlop={10}>
          <Text variant="caption" color={colors.textDim}>
            {actionLabel ?? 'VIEW ALL'}
          </Text>
          <ChevronRight size={14} color={colors.textDim} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  tick: { width: 3, height: 14, borderRadius: 2 },
  rule: { flex: 1, height: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
});
