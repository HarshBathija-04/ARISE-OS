import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Target, Clock, Coins, Zap, AlertTriangle } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DifficultyBadge } from '@/components/missions/DifficultyBadge';
import { VerificationSheet } from '@/components/missions/VerificationSheet';
import { colors, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';
import { attributeDef } from '@/constants/attributes';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mission = useGameStore((s) => s.missions.find((m) => m.id === id));
  const initiate = useGameStore((s) => s.initiateMission);
  const abandon = useGameStore((s) => s.abandonMission);
  const completeMission = useGameStore((s) => s.completeMission);
  const handleCompletion = useOverlayStore((s) => s.handleCompletion);
  const [verifying, setVerifying] = useState(false);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text dim center>Mission not found.</Text>
        <Button label="BACK" variant="ghost" onPress={() => router.back()} style={{ margin: 24 }} />
      </SafeAreaView>
    );
  }

  const active = mission.status === 'ACTIVE';
  const completed = mission.status === 'COMPLETED';
  const failed = mission.status === 'FAILED' || mission.status === 'EXPIRED';

  const onComplete = () => {
    const outcome = completeMission(mission.id);
    setVerifying(false);
    if (outcome.ok) {
      haptics.success();
      handleCompletion(outcome);
      setTimeout(() => router.back(), outcome.levelsGained > 0 ? 400 : 150);
    } else {
      haptics.error();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.textSecondary}>
          {mission.type} MISSION
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text variant="title" color={colors.text}>
              {mission.title}
            </Text>
            <Text variant="caption" color={colors.textDim} style={{ marginTop: 4 }}>
              {mission.category}
            </Text>
          </View>
          <DifficultyBadge difficulty={mission.difficulty} />
        </View>

        <Text dim variant="body" style={styles.desc}>
          {mission.description}
        </Text>

        {/* Status banner */}
        {completed && <Banner color={colors.cyan} text="MISSION COMPLETED" />}
        {failed && <Banner color={colors.crimson} text="MISSION FAILED" />}

        {/* Objective + progress */}
        <Panel label="OBJECTIVE" style={styles.block}>
          <View style={styles.objRow}>
            <Target size={16} color={colors.energy} />
            <Text variant="body" color={colors.text}>
              {objectiveText(mission.objectiveType, mission.targetValue)}
            </Text>
          </View>
          {(mission.objectiveType === 'COUNT' || mission.objectiveType === 'DURATION_MINUTES') && (
            <View style={{ marginTop: spacing.md, gap: 6 }}>
              <ProgressBar
                progress={mission.targetValue ? mission.currentProgress / mission.targetValue : 0}
              />
              <Text variant="caption" color={colors.textDim}>
                {mission.currentProgress}/{mission.targetValue}
              </Text>
            </View>
          )}
        </Panel>

        {/* Rewards */}
        <Panel label="REWARDS" style={styles.block}>
          <View style={styles.rewardGrid}>
            <RewardItem icon={<Zap size={15} color={colors.energyBright} />} label="XP" value={`+${mission.xpReward}`} color={colors.energyBright} />
            <RewardItem icon={<Coins size={15} color={colors.gold} />} label="COINS" value={`+${mission.coinReward}`} color={colors.gold} />
          </View>
          <View style={styles.attrList}>
            {mission.attributeRewards.map((a) => {
              const def = attributeDef(a.code);
              return (
                <View key={a.code} style={[styles.attrChip, { borderColor: withAlpha(def.color, 0.5) }]}>
                  <Text variant="caption" color={def.color}>
                    {a.code} +{a.xp}
                  </Text>
                </View>
              );
            })}
          </View>
        </Panel>

        {/* Deadline / failure */}
        <Panel label="CONDITIONS" style={styles.block}>
          <View style={styles.condRow}>
            <Clock size={14} color={colors.textSecondary} />
            <Text variant="mono" color={colors.textSecondary}>
              {mission.deadline ? `Deadline ${mission.deadline}` : 'Resets at end of day'}
            </Text>
          </View>
          {mission.failureConsequence && (
            <View style={[styles.condRow, { marginTop: 8 }]}>
              <AlertTriangle size={14} color={colors.crimson} />
              <Text variant="mono" color={colors.crimson}>
                {mission.failureConsequence}
              </Text>
            </View>
          )}
          <View style={[styles.condRow, { marginTop: 8 }]}>
            <Text variant="caption" color={colors.textDim}>
              VERIFICATION: {mission.verificationType.replace('_', ' ')}
            </Text>
          </View>
        </Panel>

        {/* Actions */}
        {!completed && !failed && (
          <View style={styles.actions}>
            {!active ? (
              <Button
                label="INITIATE MISSION"
                variant="primary"
                full
                haptic="heavy"
                onPress={() => initiate(mission.id)}
              />
            ) : (
              <>
                <Button
                  label="COMPLETE MISSION"
                  variant="primary"
                  full
                  haptic="heavy"
                  onPress={() => setVerifying(true)}
                />
                <Button
                  label="ABANDON"
                  variant="danger"
                  full
                  onPress={() => {
                    abandon(mission.id);
                    router.back();
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {verifying && (
        <VerificationSheet
          mission={mission}
          onCancel={() => setVerifying(false)}
          onConfirm={onComplete}
        />
      )}
    </SafeAreaView>
  );
}

function objectiveText(type: string, target: number): string {
  switch (type) {
    case 'DURATION_MINUTES': return `Complete ${target} minutes of focused work.`;
    case 'COUNT': return `Complete ${target} items.`;
    case 'VALUE': return `Reach a value of ${target}.`;
    default: return 'Confirm completion of this objective.';
  }
}

function Banner({ color, text }: { color: string; text: string }) {
  return (
    <View style={[styles.banner, { borderColor: color, backgroundColor: withAlpha(color, 0.12) }]}>
      <Text variant="label" color={color}>{text}</Text>
    </View>
  );
}

function RewardItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <View style={styles.rewardItem}>
      {icon}
      <Text variant="caption" color={colors.textDim}>{label}</Text>
      <Text variant="heading" color={color}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { padding: 2 },
  content: { padding: spacing.base },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  desc: { marginTop: spacing.md, lineHeight: 21 },
  block: { marginTop: spacing.base },
  objRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardGrid: { flexDirection: 'row', gap: spacing.xl },
  rewardItem: { alignItems: 'flex-start', gap: 3 },
  attrList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  attrChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { marginTop: spacing.xl },
  banner: {
    marginTop: spacing.base,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
