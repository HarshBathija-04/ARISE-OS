/**
 * SOLO OS — Overtime Warning.
 * Full-width banner that appears when a timetable block exceeds its scheduled time.
 */
import { View, StyleSheet } from 'react-native';
import { AlertTriangle, Clock } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { formatBlockTime, type TimetableBlock } from '@/constants/timetable';

interface Props {
  block: TimetableBlock;
  overtimeMinutes: number;
  onAcknowledge: () => void;
}

export function OvertimeWarning({ block, overtimeMinutes, onAcknowledge }: Props) {
  const now = new Date();
  const currentTimeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <AlertTriangle size={22} color={colors.crimson} />
        <Text variant="heading" color={colors.crimson}>
          TIME OVERRUN DETECTED
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text variant="caption" color={colors.textDim}>ACTIVITY</Text>
          <Text variant="mono" color={colors.text}>{block.activity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="caption" color={colors.textDim}>SCHEDULED UNTIL</Text>
          <Text variant="mono" color={colors.textSecondary}>
            {formatBlockTime(block.endHour, block.endMin)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="caption" color={colors.textDim}>CURRENT TIME</Text>
          <Text variant="mono" color={colors.crimson}>{currentTimeStr}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="caption" color={colors.textDim}>STATUS</Text>
          <View style={styles.statusBadge}>
            <Clock size={12} color={colors.crimson} />
            <Text variant="mono" color={colors.crimson}>
              {overtimeMinutes} MINUTES OVER SCHEDULE
            </Text>
          </View>
        </View>
      </View>

      <Button
        label="ACKNOWLEDGE"
        variant="danger"
        full
        onPress={onAcknowledge}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: withAlpha(colors.crimson, 0.06),
    borderWidth: 1,
    borderColor: withAlpha(colors.crimson, 0.4),
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  details: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
