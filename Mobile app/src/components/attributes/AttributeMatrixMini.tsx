import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { attributeDef } from '@/constants/attributes';
import { useGameStore } from '@/store/gameStore';

/**
 * Solo Leveling attribute matrix — compact 4×2 grid of mini system windows,
 * each showing an attribute code, level, and a micro HP/MP bar.
 */
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
            style={({ pressed }) => [
              styles.cell,
              {
                borderColor: pressed
                  ? withAlpha(def.color, 0.5)
                  : withAlpha(colors.border, 0.6),
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => router.push(`/attribute/${a.code}`)}
          >
            {/* Mini corner bracket */}
            <View style={[styles.miniCorner, { borderColor: withAlpha(def.color, 0.5) }]} />

            <View style={styles.cellTop}>
              <Text variant="label" color={def.color} glowColor={withAlpha(def.color, 0.2)}>
                {a.code}
              </Text>
              <Text variant="heading" color={colors.text}>
                {a.level}
              </Text>
            </View>
            {/* Micro HP bar */}
            <View style={[styles.miniTrack, { borderColor: withAlpha(def.color, 0.15) }]}>
              <View
                style={[
                  styles.miniFill,
                  {
                    width: `${Math.min(100, pct * 100)}%`,
                    backgroundColor: def.color,
                    shadowColor: def.color,
                  },
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
    backgroundColor: withAlpha(colors.surface, 0.85),
    borderWidth: 1,
    borderRadius: radius.base,
    padding: spacing.sm,
    gap: 6,
    overflow: 'hidden',
    // Subtle system glow
    shadowColor: colors.systemBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  miniCorner: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopLeftRadius: radius.base,
  },
  cellTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: withAlpha(colors.systemBlue, 0.1),
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
    // Micro glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
});
