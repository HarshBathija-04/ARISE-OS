import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Swords, GitBranch, Flame, Trophy } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { Row } from '@/components/ui/Row';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AttributeMatrixMini } from '@/components/attributes/AttributeMatrixMini';
import { colors, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { getLevelProgress } from '@/game-engine/level-engine';
import { rankColor, RANK_TIERS } from '@/constants/ranks';

const LINKS = [
  { label: 'MAIN CAMPAIGNS', icon: GitBranch, route: '/campaign', color: colors.systemBlue },
  { label: 'BOSS ENCOUNTERS', icon: Swords, route: '/boss', color: colors.crimson },
  { label: 'STREAKS', icon: Flame, route: '/streaks', color: colors.monarchGold },
  { label: 'ACHIEVEMENTS', icon: Trophy, route: '/achievements', color: colors.violetBright },
] as const;

export default function ProgressScreen() {
  const router = useRouter();
  const profile = useGameStore((s) => s.profile);
  const progress = useMemo(() => getLevelProgress(profile.lifetimeXp), [profile.lifetimeXp]);
  const rc = rankColor(profile.rank);
  const tier = RANK_TIERS.find((t) => t.name === profile.rank);

  return (
    <Screen scroll title="PROGRESS" accent={rc}>
      <Panel label="ASCENSION" accent={rc} style={styles.block}>
        <View style={styles.levelRow}>
          <View>
            <Text variant="caption" color={colors.textDim}>RANK</Text>
            <Text variant="title" color={rc} glowColor={withAlpha(rc, 0.5)}>{profile.rank}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" color={colors.textDim}>LEVEL</Text>
            <Text variant="readout" color={colors.text} glowColor={withAlpha(rc, 0.3)}>{profile.level}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md, gap: 6 }}>
          <ProgressBar progress={progress.progress} color={rc} height={8} segmented />
          <View style={styles.xpRow}>
            <Text variant="caption" color={colors.textSecondary}>
              {progress.currentXpIntoLevel.toLocaleString()} / {progress.xpForThisLevel.toLocaleString()} XP
            </Text>
            {tier && (
              <Text variant="caption" color={colors.textDim}>
                TIER {tier.minLevel}-{tier.maxLevel}
              </Text>
            )}
          </View>
        </View>
      </Panel>

      <SectionHeader title="ATTRIBUTE MATRIX" accent={colors.shadowViolet} />
      <AttributeMatrixMini />

      <SectionHeader title="SYSTEMS" accent={colors.systemBlue} />
      <View style={styles.linkGrid}>
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Row
              key={l.label}
              label={l.label}
              icon={<Icon size={20} color={l.color} />}
              accent={l.color}
              onPress={() => router.push(l.route as never)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.sm, marginBottom: spacing.sm },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  linkGrid: { gap: spacing.sm },
});
