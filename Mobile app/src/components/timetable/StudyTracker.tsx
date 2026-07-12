/**
 * SOLO OS — Study Tracker Modal.
 * Appears after completing a study block. Records subject, deep work score,
 * distractions, notes, and shows XP earned.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BookOpen, Target, Zap } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { STUDY_SUBJECTS, type StudySubject, categoryDef, type TimetableBlock } from '@/constants/timetable';
import { useTimetableStore } from '@/store/timetableStore';

interface Props {
  block: TimetableBlock;
  onClose: () => void;
}

export function StudyTracker({ block, onClose }: Props) {
  const logStudy = useTimetableStore((s) => s.logStudy);
  const cat = categoryDef(block.category);
  const [subject, setSubject] = useState<StudySubject | string>('GATE');
  const [deepWorkScore, setDeepWorkScore] = useState(7);
  const [distractions, setDistractions] = useState(0);
  const [notes, setNotes] = useState('');
  const [customSubject, setCustomSubject] = useState('');

  const activeSubject = subject === 'Custom' ? customSubject : subject;
  const duration = Math.round(
    ((block.endHour * 60 + block.endMin) - (block.startHour * 60 + block.startMin)),
  );

  const handleSave = () => {
    logStudy({
      blockId: block.id,
      subject: activeSubject,
      durationMinutes: duration,
      deepWorkScore,
      distractions,
      notes,
      missionLinked: cat.missionLink,
      xpEarned: block.xpReward,
    });
    onClose();
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View entering={SlideInDown.duration(240)} style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <BookOpen size={28} color={colors.energy} />
          </View>
          <Text variant="heading" color={colors.text} center>
            STUDY LOG
          </Text>
          <Text dim center variant="mono" style={{ marginTop: 4 }}>
            {block.activity}
          </Text>

          {/* Duration & XP */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="caption" color={colors.textDim}>DURATION</Text>
              <Text variant="heading" color={colors.text}>{duration}m</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="caption" color={colors.textDim}>XP EARNED</Text>
              <Text variant="heading" color={colors.energyBright}>+{block.xpReward}</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="caption" color={colors.textDim}>MISSION</Text>
              <Text variant="mono" color={colors.cyan} style={{ fontSize: 10 }}>{cat.missionLink}</Text>
            </View>
          </View>

          {/* Subject selector */}
          <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
            SUBJECT
          </Text>
          <View style={styles.chipGrid}>
            {STUDY_SUBJECTS.map((s) => {
              const selected = s === subject;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSubject(s)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? colors.energy : colors.border,
                      backgroundColor: selected ? withAlpha(colors.energy, 0.12) : colors.surface,
                    },
                  ]}
                >
                  <Text variant="mono" color={selected ? colors.energy : colors.textSecondary} style={{ fontSize: 11 }}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {subject === 'Custom' && (
            <TextInput
              value={customSubject}
              onChangeText={setCustomSubject}
              placeholder="Enter subject..."
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
          )}

          {/* Deep Work Score */}
          <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
            DEEP WORK SCORE
          </Text>
          <View style={styles.scoreRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => setDeepWorkScore(n)}
                style={[
                  styles.scoreBtn,
                  {
                    borderColor: n <= deepWorkScore ? colors.cyan : colors.border,
                    backgroundColor: n <= deepWorkScore ? withAlpha(colors.cyan, 0.15) : colors.surface,
                  },
                ]}
              >
                <Text
                  variant="mono"
                  color={n <= deepWorkScore ? colors.cyan : colors.textDim}
                  style={{ fontSize: 11 }}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Distractions */}
          <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
            DISTRACTIONS
          </Text>
          <View style={styles.counterRow}>
            <Pressable
              onPress={() => setDistractions(Math.max(0, distractions - 1))}
              style={styles.counterBtn}
            >
              <Text variant="heading" color={colors.text}>−</Text>
            </Pressable>
            <Text variant="heading" color={colors.text}>{distractions}</Text>
            <Pressable
              onPress={() => setDistractions(distractions + 1)}
              style={styles.counterBtn}
            >
              <Text variant="heading" color={colors.text}>+</Text>
            </Pressable>
          </View>

          {/* Notes */}
          <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
            NOTES
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you work on?"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            multiline
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Button label="CANCEL" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label="LOG SESSION"
              variant="primary"
              haptic="heavy"
              onPress={handleSave}
              icon={<Target size={14} color={colors.bg} />}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(colors.black, 0.7),
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.borderBright,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: { alignSelf: 'center', marginBottom: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
  },
  statItem: { alignItems: 'center', gap: 3 },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 4,
  },
  scoreBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingBottom: spacing.md,
  },
});
