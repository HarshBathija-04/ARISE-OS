/**
 * SOLO OS — Edit Timetable Modal.
 * Modal form for adding, editing, or configuring timetable blocks.
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Settings, Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, withAlpha } from '@/theme';
import {
  CATEGORY_DEFS,
  TIMETABLE_XP,
  type TimetableCategory,
  type TimetableBlock,
} from '@/constants/timetable';
import { useTimetableStore } from '@/store/timetableStore';

interface Props {
  onClose: () => void;
  editBlock?: TimetableBlock; // null = add new
}

export function EditTimetableModal({ onClose, editBlock }: Props) {
  const addBlock = useTimetableStore((s) => s.addBlock);
  const editBlockAction = useTimetableStore((s) => s.editBlock);

  const [activity, setActivity] = useState(editBlock?.activity ?? '');
  const [category, setCategory] = useState<TimetableCategory>(editBlock?.category ?? 'STUDY');
  const [startHour, setStartHour] = useState(String(editBlock?.startHour ?? 9));
  const [startMin, setStartMin] = useState(String(editBlock?.startMin ?? 0));
  const [endHour, setEndHour] = useState(String(editBlock?.endHour ?? 10));
  const [endMin, setEndMin] = useState(String(editBlock?.endMin ?? 0));

  const xpReward = TIMETABLE_XP[category] ?? 0;
  const isEdit = !!editBlock;

  const handleSave = () => {
    const sH = Math.min(23, Math.max(0, parseInt(startHour) || 0));
    const sM = Math.min(59, Math.max(0, parseInt(startMin) || 0));
    const eH = Math.min(23, Math.max(0, parseInt(endHour) || 0));
    const eM = Math.min(59, Math.max(0, parseInt(endMin) || 0));

    if (!activity.trim()) return;

    const blockData = {
      startHour: sH,
      startMin: sM,
      endHour: eH,
      endMin: eM,
      activity: activity.trim(),
      category,
      xpReward,
    };

    if (isEdit && editBlock) {
      editBlockAction(editBlock.id, blockData);
    } else {
      addBlock(blockData);
    }

    onClose();
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View entering={SlideInDown.duration(240)} style={styles.sheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            {isEdit ? <Settings size={28} color={colors.violet} /> : <Plus size={28} color={colors.cyan} />}
          </View>
          <Text variant="heading" color={colors.text} center>
            {isEdit ? 'EDIT BLOCK' : 'ADD BLOCK'}
          </Text>

          {/* Activity Name */}
          <Text variant="label" color={colors.textSecondary} style={styles.label}>
            ACTIVITY NAME
          </Text>
          <TextInput
            value={activity}
            onChangeText={setActivity}
            placeholder="e.g. Study Session 6"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />

          {/* Category */}
          <Text variant="label" color={colors.textSecondary} style={styles.label}>
            CATEGORY
          </Text>
          <View style={styles.chipGrid}>
            {CATEGORY_DEFS.filter((c) => c.code !== 'SLEEP').map((c) => {
              const selected = c.code === category;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => setCategory(c.code)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? c.color : colors.border,
                      backgroundColor: selected ? withAlpha(c.color, 0.12) : colors.surface,
                    },
                  ]}
                >
                  <Text
                    variant="mono"
                    color={selected ? c.color : colors.textSecondary}
                    style={{ fontSize: 10 }}
                  >
                    {c.label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time inputs */}
          <Text variant="label" color={colors.textSecondary} style={styles.label}>
            START TIME
          </Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={startHour}
                onChangeText={setStartHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={colors.textFaint}
                style={styles.timeInput}
              />
              <Text variant="caption" color={colors.textDim}>HOUR</Text>
            </View>
            <Text variant="heading" color={colors.textDim}>:</Text>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={startMin}
                onChangeText={setStartMin}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={colors.textFaint}
                style={styles.timeInput}
              />
              <Text variant="caption" color={colors.textDim}>MIN</Text>
            </View>
          </View>

          <Text variant="label" color={colors.textSecondary} style={styles.label}>
            END TIME
          </Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={endHour}
                onChangeText={setEndHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={colors.textFaint}
                style={styles.timeInput}
              />
              <Text variant="caption" color={colors.textDim}>HOUR</Text>
            </View>
            <Text variant="heading" color={colors.textDim}>:</Text>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={endMin}
                onChangeText={setEndMin}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={colors.textFaint}
                style={styles.timeInput}
              />
              <Text variant="caption" color={colors.textDim}>MIN</Text>
            </View>
          </View>

          {/* XP preview */}
          <View style={styles.xpPreview}>
            <Text variant="caption" color={colors.textDim}>XP REWARD</Text>
            <Text variant="heading" color={colors.energyBright}>+{xpReward}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button label="CANCEL" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label={isEdit ? 'SAVE' : 'ADD BLOCK'}
              variant="primary"
              haptic="heavy"
              onPress={handleSave}
              disabled={!activity.trim()}
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
  label: { marginTop: spacing.lg, marginBottom: spacing.sm },
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
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.base,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeInputWrap: {
    flex: 1,
    gap: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 20,
    fontFamily: 'monospace',
    textAlign: 'center',
    fontWeight: '700',
  },
  xpPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingBottom: spacing.md,
  },
});
