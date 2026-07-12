import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SystemHeader } from '@/components/system/SystemHeader';
import { PerformanceHex } from '@/components/system/PerformanceHex';
import { PlayerStatusPanel } from '@/components/player/PlayerStatusPanel';
import { PrimaryMissionCard } from '@/components/missions/PrimaryMissionCard';
import { MissionCard } from '@/components/missions/MissionCard';
import { AttributeMatrixMini } from '@/components/attributes/AttributeMatrixMini';
import { colors, spacing } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { todaysMissions, primaryMission, currentPerformance } from '@/store/selectors';
import { SYSTEM_EVENT_META } from '@/constants/events';

export default function SystemScreen() {
  const router = useRouter();
  const missions = useGameStore((s) => s.missions);
  const events = useGameStore((s) => s.events);
  const ensureToday = useGameStore((s) => s.ensureToday);

  const today = useMemo(() => todaysMissions(missions), [missions]);
  const primary = useMemo(() => primaryMission(missions), [missions]);
  const perf = useMemo(() => currentPerformance(), [missions]);
  const dailyList = today.filter((m) => m.type === 'DAILY');
  const recentEvents = events.slice(0, 5);

  return (
    <Screen scroll onRefresh={ensureToday} refreshing={false}>
      <SystemHeader />

      {/* Player status + performance */}
      <View style={styles.section}>
        <PlayerStatusPanel />
      </View>

      <View style={styles.perfRow}>
        <Panel label="LIFE PERFORMANCE" accent={colors.cyan} style={{ flex: 1 }}>
          <View style={styles.perfInner}>
            <PerformanceHex score={perf.total} status={perf.status} size={140} />
            <View style={styles.perfLegend}>
              <PerfBar label="DISCIPLINE" value={perf.categories.discipline} color={colors.violet} />
              <PerfBar label="KNOWLEDGE" value={perf.categories.knowledge} color={colors.energy} />
              <PerfBar label="PHYSICAL" value={perf.categories.physical} color={colors.crimson} />
              <PerfBar label="FOCUS" value={perf.categories.focus} color={colors.cyan} />
              <PerfBar label="RECOVERY" value={perf.categories.recovery} color={colors.gold} />
            </View>
          </View>
        </Panel>
      </View>

      {/* Primary mission */}
      <View style={styles.section}>
        <SectionHeader title="PRIMARY MISSION" accent={colors.cyan} />
        <PrimaryMissionCard mission={primary} />
      </View>

      {/* Boss encounter (Phase 7 wires live data) */}
      <View style={styles.section}>
        <SectionHeader
          title="BOSS ENCOUNTER"
          accent={colors.crimson}
          onPress={() => router.push('/boss')}
        />
        <Panel accent={colors.crimson}>
          <Text dim>
            Active boss encounters appear here. Open BOSS ENCOUNTERS to begin a battle.
          </Text>
        </Panel>
      </View>

      {/* Daily missions */}
      <View style={styles.section}>
        <SectionHeader
          title="DAILY MISSIONS"
          onPress={() => router.push('/(tabs)/quests')}
        />
        <View style={styles.missionList}>
          {dailyList.length === 0 ? (
            <Panel>
              <Text dim>No missions for today yet. Pull to refresh to generate them.</Text>
            </Panel>
          ) : (
            dailyList.map((m) => <MissionCard key={m.id} mission={m} />)
          )}
        </View>
      </View>

      {/* Attribute matrix */}
      <View style={styles.section}>
        <SectionHeader
          title="ATTRIBUTE MATRIX"
          accent={colors.violet}
          onPress={() => router.push('/(tabs)/progress')}
        />
        <AttributeMatrixMini />
      </View>

      {/* Recent system events */}
      <View style={styles.section}>
        <SectionHeader title="RECENT SYSTEM EVENTS" accent={colors.energy} />
        <Panel padded={false}>
          {recentEvents.length === 0 ? (
            <View style={{ padding: spacing.base }}>
              <Text dim>No events recorded yet. Complete a mission to begin.</Text>
            </View>
          ) : (
            recentEvents.map((e, i) => {
              const meta = SYSTEM_EVENT_META[e.type];
              return (
                <View
                  key={e.id}
                  style={[styles.eventRow, i > 0 && styles.eventBorder]}
                >
                  <Clock size={13} color={meta.color} />
                  <View style={{ flex: 1 }}>
                    <Text variant="mono" color={colors.text}>
                      {e.title}
                    </Text>
                    <Text variant="caption" color={colors.textDim}>
                      {e.detail}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Panel>
      </View>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function PerfBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.perfBarRow}>
      <Text variant="caption" color={colors.textDim} style={styles.perfBarLabel}>
        {label}
      </Text>
      <View style={styles.perfBarTrack}>
        <View style={[styles.perfBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text variant="caption" color={colors.textSecondary} style={styles.perfBarVal}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
  perfRow: { marginTop: spacing.lg },
  perfInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  perfLegend: { flex: 1, gap: 7 },
  perfBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perfBarLabel: { width: 74 },
  perfBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  perfBarFill: { height: '100%', borderRadius: 2 },
  perfBarVal: { width: 22, textAlign: 'right' },
  missionList: { gap: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md },
  eventBorder: { borderTopWidth: 1, borderTopColor: colors.border },
});
