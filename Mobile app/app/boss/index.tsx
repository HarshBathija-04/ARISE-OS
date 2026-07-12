import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Swords, Shield, Skull } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useBossStore } from '@/store/bossStore';
import { getBossDef } from '@/constants/bosses';
import { useEffect } from 'react';

export default function BossIndexScreen() {
  const router = useRouter();
  const bosses = useBossStore((s) => s.bosses);
  const ensureSeeded = useBossStore((s) => s.ensureSeeded);

  useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  const active = bosses.filter((b) => b.status === 'ACTIVE');
  const defeated = bosses.filter((b) => b.status === 'DEFEATED');
  const locked = bosses.filter((b) => b.status === 'LOCKED');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.crimson}>BOSS ENCOUNTERS</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {active.length > 0 && (
          <>
            <SectionHeader title="ACTIVE BATTLES" accent={colors.crimson} />
            <View style={styles.list}>
              {active.map((b) => (
                <BossCard key={b.id} boss={b} onPress={() => router.push(`/boss/${b.id}`)} />
              ))}
            </View>
          </>
        )}

        {locked.length > 0 && (
          <>
            <SectionHeader title="LOCKED" accent={colors.textDim} />
            <View style={styles.list}>
              {locked.map((b) => (
                <BossCard key={b.id} boss={b} locked />
              ))}
            </View>
          </>
        )}

        {defeated.length > 0 && (
          <>
            <SectionHeader title="DEFEATED" accent={colors.green} />
            <View style={styles.list}>
              {defeated.map((b) => (
                <BossCard key={b.id} boss={b} onPress={() => router.push(`/boss/${b.id}`)} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BossCard({ boss, locked, onPress }: { boss: any; locked?: boolean; onPress?: () => void }) {
  const def = getBossDef(boss.id);
  const hpRatio = boss.maxHp > 0 ? boss.currentHp / boss.maxHp : 0;
  const isDefeated = boss.status === 'DEFEATED';
  const accent = isDefeated ? colors.green : locked ? colors.textDim : colors.crimson;

  return (
    <Pressable
      style={[styles.card, { borderColor: withAlpha(accent, 0.4) }]}
      onPress={locked ? undefined : onPress}
      disabled={locked}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          {isDefeated ? (
            <Skull size={20} color={colors.green} />
          ) : locked ? (
            <Shield size={20} color={colors.textDim} />
          ) : (
            <Swords size={20} color={colors.crimson} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading" color={locked ? colors.textDim : colors.text}>
            {boss.name}
          </Text>
          <Text variant="caption" color={colors.textDim} numberOfLines={1}>
            {def?.objective ?? boss.description}
          </Text>
        </View>
        {!locked && (
          <View style={styles.phaseTag}>
            <Text variant="caption" color={accent}>
              {isDefeated ? 'DEFEATED' : `PHASE ${boss.phase}`}
            </Text>
          </View>
        )}
      </View>

      {!locked && (
        <View style={styles.hpSection}>
          <View style={styles.hpHeader}>
            <Text variant="caption" color={colors.textDim}>HP</Text>
            <Text variant="mono" color={accent}>
              {boss.currentHp} / {boss.maxHp}
            </Text>
          </View>
          <ProgressBar
            progress={hpRatio}
            color={isDefeated ? colors.green : hpRatio > 0.5 ? colors.crimson : hpRatio > 0.25 ? colors.gold : colors.energyBright}
          />
        </View>
      )}
    </Pressable>
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
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.base,
    padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.crimson, 0.1),
  },
  phaseTag: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  hpSection: { marginTop: spacing.md },
  hpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});
