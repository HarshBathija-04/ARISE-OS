/**
 * SOLO OS — Timetable Tab.
 * Main timetable screen with current task hero card, vertical timeline,
 * overtime warnings, study tracking, and editing capabilities.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Edit3, RotateCcw } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CurrentTaskCard } from '@/components/timetable/CurrentTaskCard';
import { TimelineBlock } from '@/components/timetable/TimelineBlock';
import { OvertimeWarning } from '@/components/timetable/OvertimeWarning';
import { StudyTracker } from '@/components/timetable/StudyTracker';
import { EditTimetableModal } from '@/components/timetable/EditTimetableModal';
import { colors, spacing, withAlpha, radius } from '@/theme';
import { useTimetableStore } from '@/store/timetableStore';
import { useGameStore } from '@/store/gameStore';
import { useOverlayStore } from '@/store/overlayStore';
import { haptics } from '@/services/notifications/haptics';
import { categoryDef, getOvertimeMinutes, type TimetableBlock as TBlock } from '@/constants/timetable';
import type { FocusCategory } from '@/types';

export default function TimetableScreen() {
  const router = useRouter();
  const blocks = useTimetableStore((s) => s.blocks);
  const blockStates = useTimetableStore((s) => s.blockStates);
  const ensureToday = useTimetableStore((s) => s.ensureToday);
  const hydrateFromServer = useTimetableStore((s) => s.hydrateFromServer);
  const remote = useTimetableStore((s) => s.remote);
  const getCurrentBlock = useTimetableStore((s) => s.getCurrentBlock);
  const computeBlockState = useTimetableStore((s) => s.computeBlockState);
  const startBlock = useTimetableStore((s) => s.startBlock);
  const completeBlock = useTimetableStore((s) => s.completeBlock);
  const skipBlock = useTimetableStore((s) => s.skipBlock);
  const deleteBlock = useTimetableStore((s) => s.deleteBlock);
  const getOvertimeBlock = useTimetableStore((s) => s.getOvertimeBlock);
  const ackOvertime = useTimetableStore((s) => s.ackOvertime);
  const editing = useTimetableStore((s) => s.editing);
  const toggleEditing = useTimetableStore((s) => s.toggleEditing);
  const resetToDefaults = useTimetableStore((s) => s.resetToDefaults);
  const completeTimetableBlock = useGameStore((s) => s.completeTimetableBlock);
  const handleCompletion = useOverlayStore((s) => s.handleCompletion);

  const [showStudyTracker, setShowStudyTracker] = useState<TBlock | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Refresh time every 30 seconds
  useEffect(() => {
    ensureToday();
    // Pull the shared schedule when signed in (relational source of truth).
    void hydrateFromServer();
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [ensureToday, hydrateFromServer]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    ensureToday();
    if (remote) await hydrateFromServer();
    setNow(new Date());
    setRefreshing(false);
  }, [ensureToday, hydrateFromServer, remote]);

  const currentBlock = useMemo(() => getCurrentBlock(), [blocks, now, getCurrentBlock]);
  const overtime = useMemo(() => getOvertimeBlock(), [blocks, blockStates, now, getOvertimeBlock]);

  // Count completed / total
  const completedCount = useMemo(
    () => blocks.filter((b) => {
      const state = blockStates[b.id] || computeBlockState(b.id);
      return state === 'COMPLETED' || state === 'FINISHED_EARLY';
    }).length,
    [blocks, blockStates, computeBlockState],
  );
  const totalXpEarned = useMemo(
    () => blocks.filter((b) => {
      const state = blockStates[b.id] || computeBlockState(b.id);
      return state === 'COMPLETED' || state === 'FINISHED_EARLY';
    }).reduce((sum, b) => sum + b.xpReward, 0),
    [blocks, blockStates, computeBlockState],
  );

  const handleStart = useCallback((block: TBlock) => {
    try { haptics.heavy(); } catch {}
    startBlock(block.id);
    const cat = categoryDef(block.category);
    if (cat.focusCategory) {
      // Navigate to focus mode with the mapped category
      router.push({
        pathname: '/focus/active',
        params: {
          category: cat.focusCategory as FocusCategory,
          minutes: String(Math.round(
            ((block.endHour * 60 + block.endMin) - (block.startHour * 60 + block.startMin)),
          )),
        },
      });
    }
  }, [startBlock, router]);

  const handleComplete = useCallback((block: TBlock) => {
    try { haptics.success(); } catch {}
    completeBlock(block.id);

    // Award XP via game store
    if (block.xpReward > 0) {
      const outcome = completeTimetableBlock(block.id, block.xpReward);
      if (outcome.levelsGained > 0) handleCompletion(outcome);
    }

    // Show study tracker for study blocks
    if (block.category === 'STUDY') {
      setShowStudyTracker(block);
    }
  }, [completeBlock, completeTimetableBlock, handleCompletion]);

  const handleSkip = useCallback((block: TBlock) => {
    try { haptics.tap(); } catch {}
    skipBlock(block.id);
  }, [skipBlock]);

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.head}>
        <View>
          <Text variant="title" color={colors.text}>TIMETABLE</Text>
          <Text variant="caption" color={colors.textDim} style={{ marginTop: 2 }}>
            {completedCount}/{blocks.length} completed · +{totalXpEarned} XP
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { try { haptics.tap(); } catch {} toggleEditing(); }}
            style={[styles.iconBtn, editing && styles.iconBtnActive]}
          >
            <Edit3 size={18} color={editing ? colors.cyan : colors.textSecondary} />
          </Pressable>
          {editing && (
            <>
              <Pressable
                onPress={() => { try { haptics.tap(); } catch {} setShowAddModal(true); }}
                style={styles.iconBtn}
              >
                <Plus size={18} color={colors.green} />
              </Pressable>
              <Pressable
                onPress={() => { try { haptics.tap(); } catch {} resetToDefaults(); }}
                style={styles.iconBtn}
              >
                <RotateCcw size={16} color={colors.crimson} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Current Task Card */}
      <View style={{ marginTop: spacing.md }}>
        <CurrentTaskCard currentBlock={currentBlock} />
      </View>

      {/* Overtime Warning */}
      {overtime && (
        <View style={{ marginTop: spacing.md }}>
          <OvertimeWarning
            block={overtime.block}
            overtimeMinutes={overtime.minutes}
            onAcknowledge={() => ackOvertime(overtime.block.id)}
          />
        </View>
      )}

      {/* Timeline */}
      <SectionHeader
        title="DAILY SCHEDULE"
        accent={colors.energy}
      />
      <View style={styles.timeline}>
        {blocks.map((block) => {
          const state = blockStates[block.id] || computeBlockState(block.id);
          const blockOvertime = state === 'ACTIVE' ? getOvertimeMinutes(block, now) : 0;
          return (
            <TimelineBlock
              key={block.id}
              block={block}
              state={state}
              overtimeMinutes={blockOvertime > 0 ? blockOvertime : undefined}
              isEditing={editing}
              onStart={() => handleStart(block)}
              onComplete={() => handleComplete(block)}
              onSkip={() => handleSkip(block)}
              onDelete={() => deleteBlock(block.id)}
            />
          );
        })}

        {/* Sleep block indicator */}
        <View style={styles.sleepIndicator}>
          <View style={styles.sleepDot} />
          <Text variant="mono" color={colors.textDim} style={{ fontSize: 11 }}>
            11:00 PM — SLEEP MODE
          </Text>
        </View>
      </View>

      <View style={{ height: 32 }} />

      {/* Study Tracker Modal */}
      {showStudyTracker && (
        <StudyTracker
          block={showStudyTracker}
          onClose={() => setShowStudyTracker(null)}
        />
      )}

      {/* Add Block Modal */}
      {showAddModal && (
        <EditTimetableModal
          onClose={() => setShowAddModal(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  iconBtnActive: {
    borderColor: withAlpha(colors.cyan, 0.5),
    backgroundColor: withAlpha(colors.cyan, 0.08),
  },
  timeline: {
    gap: spacing.sm,
  },
  sleepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: 5,
    paddingVertical: spacing.md,
  },
  sleepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textDim,
  },
});
