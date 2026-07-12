import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Circle, Loader } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DifficultyBadge } from './DifficultyBadge';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { haptics } from '@/services/notifications/haptics';
import type { Mission } from '@/types';

export function MissionCard({ mission, onPress }: { mission: Mission; onPress?: () => void }) {
  const router = useRouter();
  const completed = mission.status === 'COMPLETED';
  const active = mission.status === 'ACTIVE';
  const Icon = completed ? Check : active ? Loader : Circle;
  const iconColor = completed ? colors.cyan : active ? colors.energyBright : colors.textDim;

  const showProgress =
    (mission.objectiveType === 'COUNT' || mission.objectiveType === 'DURATION_MINUTES') &&
    !completed;

  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        if (onPress) onPress();
        else router.push(`/mission/${mission.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: active ? withAlpha(colors.energy, 0.5) : colors.border,
          opacity: pressed ? 0.85 : completed ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Icon size={18} color={iconColor} />
        <View style={styles.body}>
          <Text
            variant="heading"
            color={completed ? colors.textSecondary : colors.text}
            style={completed ? styles.strike : undefined}
            numberOfLines={1}
          >
            {mission.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" color={colors.textDim}>
              +{mission.xpReward} XP
            </Text>
            <Text variant="caption" color={colors.textDim}>
              · {mission.category}
            </Text>
          </View>
        </View>
        <DifficultyBadge difficulty={mission.difficulty} size="sm" />
      </View>
      {showProgress && (
        <View style={styles.progress}>
          <ProgressBar
            progress={mission.targetValue ? mission.currentProgress / mission.targetValue : 0}
            height={4}
            glow={false}
            color={colors.energy}
          />
          <Text variant="caption" color={colors.textDim} style={styles.progressLabel}>
            {mission.currentProgress}/{mission.targetValue}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  strike: { textDecorationLine: 'line-through' },
  progress: { gap: 4 },
  progressLabel: { alignSelf: 'flex-end' },
});
