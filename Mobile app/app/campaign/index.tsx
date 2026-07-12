import { useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { CAMPAIGNS } from '@/constants/campaigns';
import { useCampaignStore } from '@/store/campaignStore';

export default function CampaignsScreen() {
  const router = useRouter();
  const campaigns = useCampaignStore((s) => s.campaigns);
  const ensureSeeded = useCampaignStore((s) => s.ensureSeeded);

  useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.energy}>MAIN CAMPAIGNS</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption" color={colors.textDim} style={{ marginBottom: spacing.md }}>
          LONG-TERM PROGRESSION PATHS
        </Text>

        <View style={styles.list}>
          {CAMPAIGNS.map((def) => {
            const progress = campaigns.find((c) => c.campaignId === def.id);
            const mastered = progress?.stages.filter((s) => s.status === 'MASTERED').length ?? 0;
            const total = def.stages.length;
            const ratio = total > 0 ? mastered / total : 0;

            return (
              <Pressable
                key={def.id}
                style={[styles.card, { borderColor: withAlpha(def.color, 0.3) }]}
                onPress={() => router.push(`/campaign/${def.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.icon, { backgroundColor: withAlpha(def.color, 0.12) }]}>
                    <GitBranch size={18} color={def.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading" color={colors.text}>{def.name}</Text>
                    <Text variant="caption" color={colors.textDim} numberOfLines={1}>
                      {def.description}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textDim} />
                </View>
                <View style={styles.progressRow}>
                  <ProgressBar progress={ratio} color={def.color} />
                  <Text variant="caption" color={def.color} style={{ marginTop: 4 }}>
                    {mastered} / {total} STAGES
                  </Text>
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
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.base,
    padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  progressRow: { marginTop: spacing.md },
});
