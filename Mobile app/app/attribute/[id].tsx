import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { colors, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { attributeDef, ACTIVITY_ATTRIBUTE_MAP } from '@/constants/attributes';
import type { AttributeCode, ActivityType } from '@/types';

export default function AttributeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const code = id as AttributeCode;
  const attr = useGameStore((s) => s.attributes.find((a) => a.code === code));
  const def = attributeDef(code);

  if (!attr) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text dim center>Attribute not found.</Text>
      </SafeAreaView>
    );
  }

  const pct = attr.requiredXp ? attr.currentXp / attr.requiredXp : 0;

  // Which activities feed this attribute (from the map).
  const contributing = (Object.entries(ACTIVITY_ATTRIBUTE_MAP) as [ActivityType, Record<string, number>][])
    .filter(([, w]) => code in w)
    .map(([act, w]) => ({ act, weight: w[code] }))
    .sort((a, b) => b.weight - a.weight);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.textSecondary}>ATTRIBUTE</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { borderColor: withAlpha(def.color, 0.4) }]}>
          <Text variant="readout" color={def.color} glowColor={def.color}>
            {attr.code}
          </Text>
          <Text variant="heading" color={colors.text}>{def.name}</Text>
          <Text dim center variant="body" style={{ marginTop: 6 }}>{def.description}</Text>
          <View style={styles.levelRow}>
            <Text variant="caption" color={colors.textDim}>LEVEL</Text>
            <Text variant="title" color={colors.text}>{attr.level}</Text>
          </View>
        </View>

        <Panel label="XP PROGRESS" accent={def.color} style={styles.block}>
          <ProgressBar progress={pct} color={def.color} />
          <View style={styles.xpRow}>
            <Text variant="caption" color={colors.textSecondary}>
              {attr.currentXp} / {attr.requiredXp}
            </Text>
            <Text variant="caption" color={colors.textDim}>
              LIFETIME {attr.lifetimeXp.toLocaleString()}
            </Text>
          </View>
        </Panel>

        <Panel label="CONTRIBUTING ACTIVITIES" accent={def.color} style={styles.block}>
          <View style={{ gap: spacing.sm }}>
            {contributing.map(({ act, weight }) => (
              <View key={act} style={styles.actRow}>
                <Text variant="mono" color={colors.text}>{act.replace(/_/g, ' ')}</Text>
                <View style={styles.weightPips}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pip,
                        { backgroundColor: i < weight ? def.color : colors.surface2 },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Panel>

        <Panel label="STRONGEST CONTRIBUTOR" accent={def.color} style={styles.block}>
          <Text variant="heading" color={def.color}>
            {contributing[0] ? contributing[0].act.replace(/_/g, ' ') : '—'}
          </Text>
          <Text dim variant="caption" style={{ marginTop: 4 }}>
            Complete these activities to raise {def.name}.
          </Text>
        </Panel>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: spacing.base },
  hero: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    gap: 4,
  },
  levelRow: { alignItems: 'center', marginTop: spacing.md },
  block: { marginTop: spacing.base },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightPips: { flexDirection: 'row', gap: 4 },
  pip: { width: 16, height: 4, borderRadius: 2 },
});
