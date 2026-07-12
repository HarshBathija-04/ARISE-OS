import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Check, Circle, Play } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { CAMPAIGNS, type CampaignId } from '@/constants/campaigns';
import { useCampaignStore } from '@/store/campaignStore';
import { haptics } from '@/services/notifications/haptics';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const campaigns = useCampaignStore((s) => s.campaigns);
  const masterStage = useCampaignStore((s) => s.masterStage);
  const setStageStatus = useCampaignStore((s) => s.setStageStatus);
  const ensureSeeded = useCampaignStore((s) => s.ensureSeeded);

  useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  const def = useMemo(() => CAMPAIGNS.find((c) => c.id === id), [id]);
  const progress = useMemo(
    () => campaigns.find((c) => c.campaignId === id),
    [campaigns, id],
  );

  if (!def || !progress) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <Text variant="label" color={colors.energy}>CAMPAIGN NOT FOUND</Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>
    );
  }

  const mastered = progress.stages.filter((s) => s.status === 'MASTERED').length;

  const handleStageTap = (stageId: string, status: string) => {
    if (status === 'LOCKED') return;
    if (status === 'MASTERED') return;
    if (status === 'AVAILABLE') {
      setStageStatus(id as CampaignId, stageId, 'ACTIVE');
      haptics.tick();
      return;
    }
    // ACTIVE → confirm mastery
    Alert.alert(
      'MASTER THIS STAGE?',
      'Confirm you have completed this stage. The next stage will unlock.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'MASTER',
          onPress: () => {
            haptics.heavy();
            masterStage(id as CampaignId, stageId);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={def.color}>{def.name}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="body" color={colors.textSecondary}>
          {def.description}
        </Text>
        <Text variant="caption" color={def.color} style={{ marginTop: spacing.sm }}>
          {mastered} / {def.stages.length} STAGES MASTERED
        </Text>

        {/* Vertical progression path */}
        <View style={styles.path}>
          {def.stages.map((stage, i) => {
            const sp = progress.stages.find((s) => s.stageId === stage.id);
            const status = sp?.status ?? 'LOCKED';
            const isLast = i === def.stages.length - 1;

            const nodeColor =
              status === 'MASTERED' ? colors.green :
              status === 'ACTIVE' ? def.color :
              status === 'AVAILABLE' ? colors.textSecondary :
              colors.textDim;

            return (
              <View key={stage.id}>
                <Pressable
                  style={styles.nodeRow}
                  onPress={() => handleStageTap(stage.id, status)}
                  disabled={status === 'LOCKED' || status === 'MASTERED'}
                >
                  {/* Node icon */}
                  <View style={[styles.nodeIcon, {
                    borderColor: nodeColor,
                    backgroundColor: status === 'MASTERED' ? withAlpha(colors.green, 0.15) :
                      status === 'ACTIVE' ? withAlpha(def.color, 0.15) : 'transparent',
                  }]}>
                    {status === 'MASTERED' ? (
                      <Check size={14} color={colors.green} />
                    ) : status === 'ACTIVE' ? (
                      <Play size={12} color={def.color} fill={def.color} />
                    ) : status === 'AVAILABLE' ? (
                      <Circle size={12} color={colors.textSecondary} />
                    ) : (
                      <Lock size={12} color={colors.textDim} />
                    )}
                  </View>

                  {/* Label */}
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="mono"
                      color={status === 'LOCKED' ? colors.textDim : colors.text}
                    >
                      {stage.name}
                    </Text>
                    <Text variant="caption" color={nodeColor}>
                      {status}
                    </Text>
                  </View>

                  <Text variant="caption" color={colors.textDim}>
                    {stage.order}
                  </Text>
                </Pressable>

                {/* Connection line */}
                {!isLast && (
                  <View style={styles.lineWrap}>
                    <View
                      style={[styles.line, {
                        backgroundColor: status === 'MASTERED'
                          ? withAlpha(colors.green, 0.4)
                          : withAlpha(colors.border, 0.6),
                      }]}
                    />
                  </View>
                )}
              </View>
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
  path: { marginTop: spacing.lg },
  nodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  nodeIcon: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  lineWrap: { paddingLeft: 15, height: 20 },
  line: { width: 2, height: '100%', borderRadius: 1 },
});
