/**
 * SOLO OS — Timeline Block.
 * Individual block in the vertical timetable timeline.
 * Shows time range, activity, state indicator, XP badge, and action buttons.
 */
import { View, StyleSheet, Pressable } from 'react-native';
import {
  Play, CheckCircle2, XCircle, SkipForward, Pause, AlertTriangle, Zap, Clock,
} from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, withAlpha } from '@/theme';
import {
  formatBlockTime,
  blockDurationMinutes,
  categoryDef,
  BLOCK_STATE_STYLES,
  type TimetableBlock,
  type TimetableBlockState,
} from '@/constants/timetable';

interface Props {
  block: TimetableBlock;
  state: TimetableBlockState;
  overtimeMinutes?: number;
  isEditing?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  onDelete?: () => void;
}

const ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  SkipForward,
  Pause,
  AlertTriangle,
  Zap,
};

export function TimelineBlock({
  block,
  state,
  overtimeMinutes,
  isEditing,
  onStart,
  onComplete,
  onSkip,
  onDelete,
}: Props) {
  const cat = categoryDef(block.category);
  const stateStyle = BLOCK_STATE_STYLES[state];
  const duration = blockDurationMinutes(block);
  const IconComponent = ICONS[stateStyle.icon] ?? Clock;
  const isActive = state === 'ACTIVE';
  const isDone = state === 'COMPLETED' || state === 'FINISHED_EARLY';
  const isActionable = state === 'UPCOMING' || state === 'ACTIVE' || state === 'PAUSED';

  return (
    <View style={styles.container}>
      {/* Timeline connector */}
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: stateStyle.color }]} />
        <View style={[styles.timelineLine, { backgroundColor: withAlpha(stateStyle.color, 0.3) }]} />
      </View>

      {/* Block card */}
      <View
        style={[
          styles.card,
          {
            borderColor: stateStyle.borderColor,
            backgroundColor: stateStyle.bgColor,
            opacity: isDone || state === 'MISSED' || state === 'SKIPPED' ? 0.7 : 1,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.stateBadge, { borderColor: stateStyle.color }]}>
              <IconComponent size={11} color={stateStyle.color} />
              <Text variant="caption" color={stateStyle.color} style={{ fontSize: 9 }}>
                {stateStyle.label}
              </Text>
            </View>
            <View style={[styles.catBadge, { borderColor: withAlpha(cat.color, 0.4) }]}>
              <Text variant="caption" color={cat.color} style={{ fontSize: 9 }}>
                {cat.label.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text variant="caption" color={colors.energyBright}>
            +{block.xpReward} XP
          </Text>
        </View>

        {/* Activity name */}
        <Text
          variant="heading"
          color={isDone ? colors.textSecondary : colors.text}
          style={isDone ? styles.strike : undefined}
          numberOfLines={1}
        >
          {block.activity}
        </Text>

        {/* Time range */}
        <View style={styles.timeRow}>
          <Text variant="mono" color={colors.textSecondary} style={{ fontSize: 12 }}>
            {formatBlockTime(block.startHour, block.startMin)}
          </Text>
          <Text variant="caption" color={colors.textDim}> → </Text>
          <Text variant="mono" color={colors.textSecondary} style={{ fontSize: 12 }}>
            {formatBlockTime(block.endHour, block.endMin)}
          </Text>
          <Text variant="caption" color={colors.textDim} style={{ marginLeft: 8 }}>
            {duration}m
          </Text>
        </View>

        {/* Mission link */}
        <Text variant="caption" color={colors.textDim}>
          ⟶ {cat.missionLink}
        </Text>

        {/* Overtime warning */}
        {overtimeMinutes != null && overtimeMinutes > 0 && (
          <View style={styles.overtimeBanner}>
            <AlertTriangle size={13} color={colors.crimson} />
            <Text variant="caption" color={colors.crimson}>
              {overtimeMinutes} MIN OVER SCHEDULE
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {!isEditing && isActionable && (
          <View style={styles.actions}>
            {(state === 'UPCOMING' || state === 'PAUSED') && onStart && (
              <Button
                label="START"
                variant="primary"
                haptic="heavy"
                onPress={onStart}
                icon={<Play size={14} color={colors.bg} fill={colors.bg} />}
                style={{ flex: 1 }}
              />
            )}
            {isActive && onComplete && (
              <Button
                label="DONE"
                variant="primary"
                haptic="heavy"
                onPress={onComplete}
                icon={<CheckCircle2 size={14} color={colors.bg} />}
                style={{ flex: 1 }}
              />
            )}
            {isActionable && onSkip && (
              <Button
                label="SKIP"
                variant="ghost"
                onPress={onSkip}
                style={{ flex: 0.5 }}
              />
            )}
          </View>
        )}

        {/* Edit mode delete */}
        {isEditing && onDelete && (
          <Button
            label="DELETE"
            variant="danger"
            full
            onPress={onDelete}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeline: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.base,
    padding: spacing.md,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 6,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  catBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  overtimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: withAlpha(colors.crimson, 0.1),
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: withAlpha(colors.crimson, 0.3),
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
