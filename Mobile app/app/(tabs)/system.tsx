import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Swords, Skull } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SystemHeader } from '@/components/system/SystemHeader';
import { PerformanceHex } from '@/components/system/PerformanceHex';
import { PlayerStatusPanel } from '@/components/player/PlayerStatusPanel';
import { PrimaryMissionCard } from '@/components/missions/PrimaryMissionCard';
import { MissionCard } from '@/components/missions/MissionCard';
import { AttributeMatrixMini } from '@/components/attributes/AttributeMatrixMini';
import { colors, spacing, withAlpha } from '@/theme';
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
        <Panel label="LIFE PERFORMANCE" accent={colors.phantomCyan} style={{ flex: 1 }}>
          <View style={styles.perfInner}>
            <PerformanceHex score={perf.total} status={perf.status} size={140} />
            <View style={styles.perfLegend}>
              <PerfBar label="DISCIPLINE" value={perf.categories.discipline} color={colors.shadowViolet} />
              <PerfBar label="KNOWLEDGE" value={perf.categories.knowledge} color={colors.systemBlue} />
              <PerfBar label="PHYSICAL" value={perf.categories.physical} color={colors.crimson} />
              <PerfBar label="FOCUS" value={perf.categories.focus} color={colors.phantomCyan} />
              <PerfBar label="RECOVERY" value={perf.categories.recovery} color={colors.monarchGold} />
            </View>
          </View>
        </Panel>
      </View>

      {/* Primary mission */}
      <View style={styles.section}>
        <SectionHeader title="PRIMARY MISSION" accent={colors.phantomCyan} />
        <PrimaryMissionCard mission={primary} />
      </View>

      {/* Boss encounter (Phase 7 wires live data) */}
      <View style={styles.section}>
        <SectionHeader
          title="BOSS ENCOUNTER"
          accent={colors.crimson}
          onPress={() => router.push('/boss')}
        />
        <EmptyState
          icon={<Skull size={22} color={colors.crimson} />}
          title="NO ACTIVE ENCOUNTER"
          hint="Open Boss Encounters to challenge one and start dealing damage."
          accent={colors.crimson}
        />
      </View>

      {/* Daily missions */}
      <View style={styles.section}>
        <SectionHeader
          title="DAILY MISSIONS"
          onPress={() => router.push('/(tabs)/quests')}
        />
        <View style={styles.missionList}>
          {dailyList.length === 0 ? (
            <EmptyState
              icon={<Swords size={22} color={colors.systemBlue} />}
              title="NO MISSIONS YET"
              hint="Pull down to refresh and today's objectives will be generated."
            />
          ) : (
            dailyList.map((m) => <MissionCard key={m.id} mission={m} />)
          )}
        </View>
      </View>

      {/* Attribute matrix */}
      <View style={styles.section}>
        <SectionHeader
          title="ATTRIBUTE MATRIX"
          accent={colors.shadowViolet}
          onPress={() => router.push('/(tabs)/progress')}
        />
        <AttributeMatrixMini />
      </View>

      {/* Recent system events */}
      <View style={styles.section}>
        <SectionHeader title="RECENT SYSTEM EVENTS" accent={colors.systemBlue} />
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
        <View
          style={[
            styles.perfBarFill,
            {
              width: `${value}%`,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
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
    backgroundColor: withAlpha(colors.systemBlue, 0.1),
    overflow: 'hidden',
  },
  perfBarFill: {
    height: '100%',
    borderRadius: 2,
    // Micro glow on fill
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  perfBarVal: { width: 22, textAlign: 'right' },
  missionList: { gap: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md },
  eventBorder: { borderTopWidth: 1, borderTopColor: withAlpha(colors.systemBlue, 0.1) },
});
