import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { ShieldCheck } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import type { Mission } from '@/types';

interface Props {
  mission: Mission;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Verification sheet. Implements MANUAL, TIMER, and PROGRESS_VALUE now;
 * PHOTO / HEALTH_DATA render a "coming soon" note but keep the same contract
 * so they can be enabled without changing callers.
 */
export function VerificationSheet({ mission, onConfirm, onCancel }: Props) {
  const updateProgress = useGameStore((s) => s.updateMissionProgress);
  const [value, setValue] = useState(String(mission.currentProgress || ''));

  const type = mission.verificationType;
  const needsValue = type === 'PROGRESS_VALUE' || mission.objectiveType === 'COUNT';
  const numeric = Number(value);
  const meetsTarget = !needsValue || numeric >= mission.targetValue;

  const confirm = () => {
    if (needsValue) {
      updateProgress(mission.id, Math.min(mission.targetValue, Math.max(0, numeric)));
    }
    onConfirm();
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <Animated.View entering={SlideInDown.duration(240)} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.iconWrap}>
          <ShieldCheck size={28} color={colors.cyan} />
        </View>
        <Text variant="heading" color={colors.text} center>
          SYSTEM VERIFICATION
        </Text>
        <Text dim center variant="mono" style={styles.sub}>
          {verificationLabel(type)}
        </Text>

        {needsValue && (
          <View style={styles.valueBlock}>
            <Text variant="caption" color={colors.textDim}>
              REPORT VALUE (TARGET {mission.targetValue})
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
          </View>
        )}

        {(type === 'PHOTO' || type === 'HEALTH_DATA') && (
          <Text variant="caption" color={colors.textDim} center style={{ marginTop: 8 }}>
            {type === 'PHOTO' ? 'Photo evidence' : 'Health data'} capture arrives in a later
            update. Confirm manually for now.
          </Text>
        )}

        <Text variant="caption" color={colors.textDim} center style={styles.warn}>
          The System validates honestly reported actions. False reports only
          deceive yourself.
        </Text>

        <View style={styles.actions}>
          <Button label="CANCEL" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
          <Button
            label="VALIDATE"
            variant={meetsTarget ? 'primary' : 'secondary'}
            haptic="heavy"
            onPress={confirm}
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function verificationLabel(type: Mission['verificationType']): string {
  switch (type) {
    case 'TIMER': return 'TIMER VERIFIED';
    case 'PROGRESS_VALUE': return 'PROGRESS VALUE';
    case 'PHOTO': return 'PHOTO EVIDENCE';
    case 'HEALTH_DATA': return 'HEALTH DATA';
    default: return 'MANUAL CONFIRMATION';
  }
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
    gap: spacing.sm,
    alignItems: 'stretch',
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
  sub: { marginTop: 2 },
  valueBlock: { marginTop: spacing.base, gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 22,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  warn: { marginTop: spacing.base, lineHeight: 16, paddingHorizontal: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
