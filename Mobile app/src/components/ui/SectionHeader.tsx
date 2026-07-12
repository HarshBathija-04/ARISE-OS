import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text } from './Text';
import { colors, spacing } from '@/theme';

interface SectionHeaderProps {
  title: string;
  accent?: string;
  onPress?: () => void;
  actionLabel?: string;
}

export function SectionHeader({ title, accent = colors.energy, onPress, actionLabel }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.tick, { backgroundColor: accent }]} />
        <Text variant="label" color={colors.textSecondary}>
          {title}
        </Text>
      </View>
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
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tick: { width: 3, height: 13, borderRadius: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
