import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { attributeDef } from '@/constants/attributes';
import { useGameStore } from '@/store/gameStore';

/** Compact 4×2 attribute grid for the home screen. */
export function AttributeMatrixMini() {
  const router = useRouter();
  const attributes = useGameStore((s) => s.attributes);

  return (
    <View style={styles.grid}>
      {attributes.map((a) => {
        const def = attributeDef(a.code);
        const pct = a.requiredXp ? a.currentXp / a.requiredXp : 0;
        return (
          <Pressable
            key={a.code}
            style={styles.cell}
            onPress={() => router.push(`/attribute/${a.code}`)}
          >
            <View style={styles.cellTop}>
              <Text variant="label" color={def.color}>
                {a.code}
              </Text>
              <Text variant="heading" color={colors.text}>
                {a.level}
              </Text>
            </View>
            <View style={styles.miniTrack}>
              <View
                style={[
                  styles.miniFill,
                  { width: `${Math.min(100, pct * 100)}%`, backgroundColor: def.color },
                ]}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: '23.5%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    padding: spacing.sm,
    gap: 6,
  },
  cellTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: withAlpha(colors.border, 0.8),
    overflow: 'hidden',
  },
  miniFill: { height: '100%', borderRadius: 2 },
});
