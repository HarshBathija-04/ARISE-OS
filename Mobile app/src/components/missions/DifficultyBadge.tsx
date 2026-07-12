import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, withAlpha } from '@/theme';
import type { MissionDifficulty } from '@/types';

const DIFF_COLOR: Record<MissionDifficulty, string> = {
  E: colors.textSecondary,
  D: colors.green,
  C: colors.energy,
  B: colors.cyan,
  A: colors.violetBright,
  S: colors.gold,
  SS: colors.crimson,
};

export function DifficultyBadge({ difficulty, size = 'md' }: { difficulty: MissionDifficulty; size?: 'sm' | 'md' }) {
  const c = DIFF_COLOR[difficulty];
  const dim = size === 'sm' ? 22 : 28;
  return (
    <View
      style={[
        styles.badge,
        { width: dim, height: dim, borderColor: c, backgroundColor: withAlpha(c, 0.12) },
      ]}
    >
      <Text variant="label" color={c} style={{ fontSize: size === 'sm' ? 10 : 12 }}>
        {difficulty}
      </Text>
    </View>
  );
}

export function difficultyColor(d: MissionDifficulty) {
  return DIFF_COLOR[d];
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
