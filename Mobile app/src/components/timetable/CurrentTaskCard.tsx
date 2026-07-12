/**
 * SOLO OS — Current Task Card.
 * Hero card at the top of the Timetable showing the active block with
 * progress ring, countdown, and remaining time.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Zap, Moon } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { EnergyRing } from '@/components/focus/EnergyRing';
import { colors, radius, spacing, withAlpha } from '@/theme';
import {
  formatBlockTime,
  blockDurationMinutes,
  categoryDef,
  isSleepTime,
  type TimetableBlock,
} from '@/constants/timetable';

interface Props {
  currentBlock: TimetableBlock | null;
}

export function CurrentTaskCard({ currentBlock }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isSleepTime(now)) {
    return (
      <View style={styles.sleepCard}>
        <Moon size={32} color={colors.violet} />
        <Text variant="title" color={colors.violet} style={{ marginTop: spacing.md }}>
          SLEEP MODE
        </Text>
        <Text variant="mono" color={colors.textDim} style={{ marginTop: spacing.sm }}>
          Next schedule starts at 5:00 AM
        </Text>
        <Text variant="caption" color={colors.textDim} style={{ marginTop: spacing.xs }}>
          Rest is part of the protocol.
        </Text>
      </View>
    );
  }

  if (!currentBlock) {
    return (
      <View style={styles.emptyCard}>
        <Text variant="label" color={colors.textDim}>NO ACTIVE BLOCK</Text>
        <Text variant="caption" color={colors.textDim} style={{ marginTop: 4 }}>
          You are between scheduled activities.
        </Text>
      </View>
    );
  }

  const cat = categoryDef(currentBlock.category);
  const totalMinutes = blockDurationMinutes(currentBlock);
  const startMinutes = currentBlock.startHour * 60 + currentBlock.startMin;
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const elapsed = Math.max(0, currentMinutes - startMinutes);
  const remaining = Math.max(0, totalMinutes - elapsed);
  const progress = totalMinutes > 0 ? Math.min(1, elapsed / totalMinutes) : 0;

  const remainHours = Math.floor(remaining / 60);
  const remainMins = Math.floor(remaining % 60);
  const remainStr = remainHours > 0 ? `${remainHours}h ${remainMins}m` : `${remainMins}m`;

  const currentTimeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={[styles.card, { borderColor: withAlpha(cat.color, 0.5) }]}>
      <View style={styles.labelRow}>
        <Zap size={13} color={cat.color} fill={cat.color} />
        <Text variant="label" color={cat.color}>CURRENT TASK</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.ringWrap}>
          <EnergyRing size={120} progress={progress} color={cat.color} running={true} />
          <View style={styles.ringCenter}>
            <Text variant="caption" color={colors.textDim}>LEFT</Text>
            <Text variant="heading" color={colors.text} style={{ fontSize: 18 }}>
              {remainStr}
            </Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text variant="title" color={colors.text} numberOfLines={2} style={{ fontSize: 18 }}>
            {currentBlock.activity}
          </Text>
          <View style={styles.metaItem}>
            <Text variant="caption" color={colors.textDim}>TIME</Text>
            <Text variant="mono" color={colors.text}>{currentTimeStr}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text variant="caption" color={colors.textDim}>REMAINING</Text>
            <Text variant="mono" color={cat.color}>{remainStr}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text variant="caption" color={colors.textDim}>ENDS AT</Text>
            <Text variant="mono" color={colors.textSecondary}>
              {formatBlockTime(currentBlock.endHour, currentBlock.endMin)}
            </Text>
          </View>
          <View style={styles.xpBadge}>
            <Text variant="caption" color={colors.energyBright}>
              +{currentBlock.xpReward} XP
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.md,
  },
  sleepCard: {
    backgroundColor: withAlpha(colors.violet, 0.06),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.violet, 0.3),
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  info: {
    flex: 1,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: withAlpha(colors.energyBright, 0.4),
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: withAlpha(colors.energyBright, 0.08),
    marginTop: 2,
  },
});
