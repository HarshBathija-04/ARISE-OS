import { View, StyleSheet } from 'react-native';
import { Panel } from '@/components/ui/Panel';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, spacing, withAlpha } from '@/theme';
import { rankColor } from '@/constants/ranks';
import { getLevelProgress } from '@/game-engine/level-engine';
import { useGameStore } from '@/store/gameStore';
import { TITLE_DEFS } from '@/constants/titles';

/**
 * Solo Leveling「PLAYER STATUS」window — mimics the floating status
 * window from the manhwa with rank insignia, stat layout, HP/MP bars,
 * and cold system readouts.
 */
export function PlayerStatusPanel() {
  const profile = useGameStore((s) => s.profile);
  const progress = getLevelProgress(profile.lifetimeXp);
  const rc = rankColor(profile.rank);
  const title = TITLE_DEFS.find((t) => t.key === profile.equippedTitleKey);

  return (
    <Panel label="PLAYER STATUS" accent={rc}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="title" color={colors.text} glowColor={withAlpha(rc, 0.3)}>
            {profile.displayName.toUpperCase()}
          </Text>
          <View style={styles.rankRow}>
            {/* Rank insignia dot with glow */}
            <View
              style={[
                styles.rankDot,
                {
                  backgroundColor: rc,
                  shadowColor: rc,
                },
              ]}
            />
            <Text variant="label" color={rc}>
              {profile.rank}
            </Text>
            {title && (
              <Text variant="caption" color={colors.monarchGold}>
                · {title.name}
              </Text>
            )}
          </View>
        </View>
        {/* Level readout with glow */}
        <View style={styles.levelBox}>
          <Text variant="caption" color={colors.textDim}>
            LEVEL
          </Text>
          <Text variant="readout" color={colors.text} glowColor={withAlpha(rc, 0.6)}>
            {profile.level}
          </Text>
        </View>
      </View>

      {/* XP Progress — Solo Leveling HP bar style */}
      <View style={styles.xpBlock}>
        <View style={styles.xpLabels}>
          <Text variant="caption" color={colors.textSecondary}>
            XP {progress.currentXpIntoLevel.toLocaleString()}
          </Text>
          <Text variant="caption" color={colors.textDim}>
            {progress.isMax ? 'MAX LEVEL' : `NEXT ${progress.xpForThisLevel.toLocaleString()}`}
          </Text>
        </View>
        <ProgressBar progress={progress.progress} color={colors.energyBright} segmented />
      </View>

      {/* Stats row — like the manhwa status window */}
      <View style={styles.footer}>
        <Stat label="LIFETIME XP" value={profile.lifetimeXp.toLocaleString()} color={colors.systemBlue} />
        <View style={styles.statDivider} />
        <Stat label="SOLO COINS" value={profile.coins.toLocaleString()} color={colors.monarchGold} />
      </View>
    </Panel>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" color={colors.textDim}>
        {label}
      </Text>
      <Text variant="heading" color={color} glowColor={withAlpha(color, 0.25)}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  rankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // Glow on rank insignia
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  levelBox: { alignItems: 'flex-end' },
  xpBlock: { marginTop: spacing.lg, gap: 6 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: withAlpha(colors.systemBlue, 0.15),
    gap: spacing.xl,
    alignItems: 'center',
  },
  stat: { gap: 2, flex: 1 },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: withAlpha(colors.systemBlue, 0.2),
  },
});
