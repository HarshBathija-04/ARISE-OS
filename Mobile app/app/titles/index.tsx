import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Award, Check, Lock } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing, radius, withAlpha, rarityColor } from '@/theme';
import { TITLE_DEFS, titleDef } from '@/constants/titles';
import { useGameStore } from '@/store/gameStore';
import { useAchievementStore } from '@/store/achievementStore';
import { haptics } from '@/services/notifications/haptics';
import type { TitleDef } from '@/types';

export default function TitlesScreen() {
  const router = useRouter();
  const equippedKey = useGameStore((s) => s.profile.equippedTitleKey);
  const equipTitle = useGameStore((s) => s.equipTitle);
  const unlockedAchievements = useAchievementStore((s) => s.unlocked);

  // A title is unlocked if the associated achievement is unlocked.
  const unlockedTitleKeys = new Set<string>();
  for (const ach of unlockedAchievements) {
    // Find achievement defs that unlock titles.
    const { ALL_ACHIEVEMENTS } = require('@/constants/achievements');
    const def = ALL_ACHIEVEMENTS.find((a: any) => a.key === ach.key && a.unlocksTitleKey);
    if (def?.unlocksTitleKey) unlockedTitleKeys.add(def.unlocksTitleKey);
  }
  // THE INITIATE is always unlocked.
  unlockedTitleKeys.add('the_initiate');

  const handleEquip = (key: string) => {
    if (!unlockedTitleKeys.has(key)) return;
    if (equippedKey === key) {
      equipTitle(null);
      haptics.tick();
      return;
    }
    haptics.heavy();
    equipTitle(key);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.gold}>TITLES</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" color={colors.textDim}>
          EQUIP ONE TITLE. TITLES MAY PROVIDE SMALL BONUSES (MAX 5%).
        </Text>

        <View style={styles.list}>
          {TITLE_DEFS.map((t) => {
            const isUnlocked = unlockedTitleKeys.has(t.key);
            const isEquipped = equippedKey === t.key;
            const rc = rarityColor[t.rarity];

            return (
              <Pressable
                key={t.key}
                style={[styles.card, {
                  borderColor: isEquipped ? rc : isUnlocked ? withAlpha(rc, 0.3) : colors.border,
                  backgroundColor: isEquipped ? withAlpha(rc, 0.08) : colors.surface,
                }]}
                onPress={() => handleEquip(t.key)}
                disabled={!isUnlocked}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.icon, {
                    backgroundColor: isUnlocked ? withAlpha(rc, 0.15) : colors.surface2,
                  }]}>
                    {isUnlocked ? (
                      <Award size={18} color={rc} />
                    ) : (
                      <Lock size={16} color={colors.textDim} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading" color={isUnlocked ? colors.text : colors.textDim}>
                      {t.name}
                    </Text>
                    <Text variant="caption" color={colors.textDim}>
                      {t.description}
                    </Text>
                  </View>
                  {isEquipped && (
                    <View style={[styles.equippedBadge, { borderColor: rc }]}>
                      <Check size={12} color={rc} />
                      <Text variant="caption" color={rc}>EQUIPPED</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBottom}>
                  <Text variant="caption" color={rc}>{t.rarity}</Text>
                  {t.bonusType && t.bonusType !== 'NONE' && t.bonusValue ? (
                    <Text variant="caption" color={colors.gold}>
                      +{Math.round((t.bonusValue ?? 0) * 100)}% {t.bonusType}
                    </Text>
                  ) : (
                    <Text variant="caption" color={colors.textDim}>NO BONUS</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
  list: { gap: spacing.sm, marginTop: spacing.md },
  card: {
    borderWidth: 1, borderRadius: radius.base, padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  equippedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.sm, paddingTop: spacing.xs,
    borderTopWidth: 1, borderTopColor: withAlpha(colors.border, 0.5),
  },
});
