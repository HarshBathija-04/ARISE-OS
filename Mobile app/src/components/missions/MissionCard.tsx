import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Circle, Loader, ChevronRight, XCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DifficultyBadge } from './DifficultyBadge';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { haptics } from '@/services/notifications/haptics';
import type { Mission } from '@/types';

/**
 * Solo Leveling quest card — system window treatment with pulsing blue
 * edge on active missions, double-border effect, and cold system styling.
 */
export function MissionCard({ mission, onPress }: { mission: Mission; onPress?: () => void }) {
  const router = useRouter();
  const completed = mission.status === 'COMPLETED';
  const active = mission.status === 'ACTIVE';
  const failed = mission.status === 'FAILED' || mission.status === 'EXPIRED';

  const Icon = completed ? Check : failed ? XCircle : active ? Loader : Circle;
  const iconColor = completed ? colors.green : failed ? colors.crimson : active ? colors.systemBlue : colors.textDim;

  const showProgress =
    (mission.objectiveType === 'COUNT' || mission.objectiveType === 'DURATION_MINUTES') &&
    !completed && !failed;

  const durationSuffix = mission.objectiveType === 'DURATION_MINUTES' ? ' min' : '';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tick();
        if (onPress) onPress();
        else router.push(`/mission/${mission.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: active
            ? withAlpha(colors.systemBlue, 0.5)
            : withAlpha(colors.border, 0.7),
          opacity: pressed ? 0.85 : 1,
        },
        active && styles.activeGlow,
      ]}
    >
      {/* Active edge glow — system blue */}
      {active ? <View style={styles.activeEdge} /> : null}

      <View style={styles.row}>
        {/* Status icon in system circle */}
        <View
          style={[
            styles.status,
            {
              borderColor: withAlpha(iconColor, 0.5),
              backgroundColor: withAlpha(iconColor, 0.08),
              shadowColor: iconColor,
            },
          ]}
        >
          <Icon size={16} color={iconColor} />
        </View>

        <View style={styles.body}>
          <Text
            variant="heading"
            color={completed ? colors.textSecondary : colors.text}
            style={completed ? styles.strike : undefined}
            numberOfLines={2}
          >
            {mission.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" color={colors.systemBlue}>+{mission.xpReward} XP</Text>
            {mission.coinReward > 0 ? (
              <Text variant="caption" color={colors.monarchGold}>+{mission.coinReward}</Text>
            ) : null}
            <Text variant="caption" color={colors.textDim} numberOfLines={1} style={styles.cat}>
              · {mission.category.toLowerCase()}
            </Text>
          </View>
        </View>

        <View style={styles.tail}>
          <DifficultyBadge difficulty={mission.difficulty} size="sm" />
          {!completed && !failed ? <ChevronRight size={16} color={colors.textDim} /> : null}
        </View>
      </View>

      {showProgress && (
        <View style={styles.progress}>
          <ProgressBar
            progress={mission.targetValue ? mission.currentProgress / mission.targetValue : 0}
            height={5}
            glow={active}
            color={active ? colors.systemBlue : colors.energy}
          />
          <Text variant="caption" color={colors.textDim} style={styles.progressLabel}>
            {mission.currentProgress}/{mission.targetValue}{durationSuffix}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: withAlpha(colors.surface, 0.9),
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.sm,
    minHeight: 68,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeGlow: {
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  activeEdge: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    backgroundColor: colors.systemBlue,
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  status: {
    width: 34, height: 34, borderRadius: radius.full, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    // Icon glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  body: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cat: { flex: 1 },
  tail: { alignItems: 'center', gap: 6, flexDirection: 'row' },
  strike: { textDecorationLine: 'line-through' },
  progress: { gap: 4, paddingLeft: 34 + spacing.md },
  progressLabel: { alignSelf: 'flex-end' },
});
