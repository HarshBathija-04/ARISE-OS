import { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Trophy } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha, rarityColor } from '@/theme';
import { useAchievementStore } from '@/store/achievementStore';
import { ALL_ACHIEVEMENTS } from '@/constants/achievements';
import type { AchievementDef, Rarity } from '@/types';

const RARITY_ORDER: Rarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];

export default function AchievementsScreen() {
  const router = useRouter();
  const unlocked = useAchievementStore((s) => s.unlocked);
  const metrics = useAchievementStore((s) => s.metrics);
  const [filter, setFilter] = useState<Rarity | 'ALL'>('ALL');
  const [showLocked, setShowLocked] = useState(true);

  const unlockedKeys = useMemo(() => new Set(unlocked.map((u) => u.key)), [unlocked]);

  const filtered = useMemo(() => {
    let list = ALL_ACHIEVEMENTS;
    if (filter !== 'ALL') list = list.filter((a) => a.rarity === filter);
    if (!showLocked) list = list.filter((a) => unlockedKeys.has(a.key));
    return list;
  }, [filter, showLocked, unlockedKeys]);

  const unlockedList = filtered.filter((a) => unlockedKeys.has(a.key));
  const lockedList = filtered.filter((a) => !unlockedKeys.has(a.key));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.violetBright}>ACHIEVEMENTS</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text variant="readout" color={colors.violetBright}>{unlocked.length}</Text>
          <Text variant="caption" color={colors.textDim}>
            / {ALL_ACHIEVEMENTS.length} UNLOCKED
          </Text>
        </View>

        {/* Rarity filter */}
        <View style={styles.filterRow}>
          {(['ALL', ...RARITY_ORDER] as const).map((r) => {
            const sel = filter === r;
            const rc = r === 'ALL' ? colors.text : rarityColor[r];
            return (
              <Pressable
                key={r}
                style={[styles.filterChip, {
                  borderColor: sel ? rc : colors.border,
                  backgroundColor: sel ? withAlpha(rc, 0.12) : 'transparent',
                }]}
                onPress={() => setFilter(r)}
              >
                <Text variant="caption" color={sel ? rc : colors.textDim}>{r}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Unlocked */}
        {unlockedList.length > 0 && (
          <>
            <SectionHeader title="UNLOCKED" accent={colors.green} />
            <View style={styles.list}>
              {unlockedList.map((a) => (
                <AchievementCard key={a.key} def={a} unlocked />
              ))}
            </View>
          </>
        )}

        {/* Locked */}
        {showLocked && lockedList.length > 0 && (
          <>
            <SectionHeader title="LOCKED" accent={colors.textDim} />
            <View style={styles.list}>
              {lockedList.map((a) => {
                const value = (metrics as any)?.[a.metric] ?? 0;
                const progress = a.threshold > 0 ? Math.min(1, value / a.threshold) : 0;
                return (
                  <AchievementCard key={a.key} def={a} progress={progress} currentValue={value} />
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({ def, unlocked, progress, currentValue }: {
  def: AchievementDef; unlocked?: boolean; progress?: number; currentValue?: number;
}) {
  const rc = rarityColor[def.rarity];

  return (
    <View style={[styles.card, { borderColor: unlocked ? withAlpha(rc, 0.4) : colors.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, {
          backgroundColor: unlocked ? withAlpha(rc, 0.15) : colors.surface2,
        }]}>
          {unlocked ? (
            <Trophy size={16} color={rc} />
          ) : (
            <Lock size={14} color={colors.textDim} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading" color={unlocked ? colors.text : colors.textDim}>
            {def.name}
          </Text>
          <Text variant="caption" color={colors.textDim} numberOfLines={2}>
            {def.description}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="caption" color={rc}>{def.rarity}</Text>
          <Text variant="caption" color={colors.gold}>+{def.coinReward} 🪙</Text>
        </View>
      </View>
      {!unlocked && progress !== undefined && (
        <View style={{ marginTop: spacing.sm }}>
          <ProgressBar progress={progress} color={rc} height={3} />
          <Text variant="caption" color={colors.textDim} style={{ marginTop: 2 }}>
            {currentValue ?? 0} / {def.threshold}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  content: { padding: spacing.base },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  filterChip: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.base,
    padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
});
