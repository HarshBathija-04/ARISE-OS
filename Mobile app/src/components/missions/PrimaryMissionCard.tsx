import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, ArrowRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DifficultyBadge } from './DifficultyBadge';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import type { Mission } from '@/types';

export function PrimaryMissionCard({ mission }: { mission: Mission | null }) {
  const router = useRouter();
  const initiate = useGameStore((s) => s.initiateMission);

  if (!mission) {
    return (
      <View style={styles.emptyCard}>
        <Text variant="label" color={colors.cyan}>
          PRIMARY MISSION
        </Text>
        <Text dim style={{ marginTop: 8 }}>
          All core objectives cleared for today. The System is satisfied — for now.
        </Text>
      </View>
    );
  }

  const active = mission.status === 'ACTIVE';
  const attr = mission.attributeRewards.map((a) => `${a.code}+${a.xp}`).join('  ');

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[withAlpha(colors.energy, 0.16), withAlpha(colors.violet, 0.06), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.labelRow}>
            <Zap size={13} color={colors.cyan} fill={colors.cyan} />
            <Text variant="label" color={colors.cyan}>
              PRIMARY MISSION
            </Text>
          </View>
          <DifficultyBadge difficulty={mission.difficulty} />
        </View>

        <Text variant="title" color={colors.text} style={styles.title}>
          {mission.title}
        </Text>
        <Text dim variant="body">
          {mission.description}
        </Text>

        <View style={styles.rewardRow}>
          <Reward label="XP" value={`+${mission.xpReward}`} color={colors.energyBright} />
          <Reward label="COINS" value={`+${mission.coinReward}`} color={colors.gold} />
          <Reward label="ATTRIBUTES" value={attr || '—'} color={colors.violetBright} />
        </View>

        {(mission.objectiveType === 'COUNT' || mission.objectiveType === 'DURATION_MINUTES') && (
          <View style={styles.progressBlock}>
            <ProgressBar
              progress={mission.targetValue ? mission.currentProgress / mission.targetValue : 0}
              height={6}
            />
            <Text variant="caption" color={colors.textDim}>
              {mission.currentProgress}/{mission.targetValue}
              {mission.objectiveType === 'DURATION_MINUTES' ? ' min' : ''}
            </Text>
          </View>
        )}

        <Button
          label={active ? 'CONTINUE' : 'INITIATE'}
          variant="primary"
          full
          icon={<ArrowRight size={18} color={colors.bg} />}
          haptic="heavy"
          onPress={() => {
            if (!active) initiate(mission.id);
            router.push(`/mission/${mission.id}`);
          }}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </View>
  );
}

function Reward({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.reward}>
      <Text variant="caption" color={colors.textDim}>
        {label}
      </Text>
      <Text variant="mono" color={color}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.energy, 0.35),
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  inner: { padding: spacing.base, gap: spacing.sm },
  emptyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.base,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { marginTop: 4 },
  rewardRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  reward: { gap: 2 },
  progressBlock: { gap: 4, marginTop: spacing.xs },
});
