import { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Swords, GitBranch, Flame, Trophy, ChevronRight } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AttributeMatrixMini } from '@/components/attributes/AttributeMatrixMini';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { getLevelProgress } from '@/game-engine/level-engine';
import { rankColor, RANK_TIERS } from '@/constants/ranks';

const LINKS = [
  { label: 'MAIN CAMPAIGNS', icon: GitBranch, route: '/campaign', color: colors.energy },
  { label: 'BOSS ENCOUNTERS', icon: Swords, route: '/boss', color: colors.crimson },
  { label: 'STREAKS', icon: Flame, route: '/streaks', color: colors.gold },
  { label: 'ACHIEVEMENTS', icon: Trophy, route: '/achievements', color: colors.violetBright },
] as const;

export default function ProgressScreen() {
  const router = useRouter();
  const profile = useGameStore((s) => s.profile);
  const progress = useMemo(() => getLevelProgress(profile.lifetimeXp), [profile.lifetimeXp]);
  const rc = rankColor(profile.rank);
  const tier = RANK_TIERS.find((t) => t.name === profile.rank);

  return (
    <Screen scroll>
      <Text variant="title" color={colors.text}>PROGRESS</Text>

      <Panel label="ASCENSION" accent={rc} style={styles.block}>
        <View style={styles.levelRow}>
          <View>
            <Text variant="caption" color={colors.textDim}>RANK</Text>
            <Text variant="heading" color={rc} glowColor={withAlpha(rc, 0.5)}>{profile.rank}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color={colors.textDim}>LEVEL</Text>
            <Text variant="readout" color={colors.text}>{profile.level}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md, gap: 6 }}>
          <ProgressBar progress={progress.progress} color={rc} />
          <View style={styles.xpRow}>
            <Text variant="caption" color={colors.textSecondary}>
              {progress.currentXpIntoLevel.toLocaleString()} / {progress.xpForThisLevel.toLocaleString()}
            </Text>
            {tier && (
              <Text variant="caption" color={colors.textDim}>
                TIER {tier.minLevel}-{tier.maxLevel}
              </Text>
            )}
          </View>
        </View>
      </Panel>

      <SectionHeader title="ATTRIBUTE MATRIX" accent={colors.violet} />
      <AttributeMatrixMini />

      <SectionHeader title="SYSTEMS" accent={colors.energy} />
      <View style={styles.linkGrid}>
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Pressable
              key={l.label}
              style={styles.linkCard}
              onPress={() => router.push(l.route as never)}
            >
              <Icon size={20} color={l.color} />
              <Text variant="mono" color={colors.text} style={styles.linkLabel}>
                {l.label}
              </Text>
              <ChevronRight size={16} color={colors.textDim} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.base, marginBottom: spacing.sm },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  linkGrid: { gap: spacing.sm },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    padding: spacing.base,
  },
  linkLabel: { flex: 1 },
});
