/**
 * SOLO OS — Offline sync status.
 *
 * Shows the live state of the pending-action queue and lets the operator retry
 * or dismiss any action the server sent back for review.
 */
import { View, StyleSheet, Pressable } from 'react-native';
import { RefreshCw, CheckCircle2, CloudOff, AlertTriangle, X } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useSyncStore } from '@/store/syncStore';
import { SYNC_LABEL } from '@/services/sync/types';
import { haptics } from '@/services/notifications/haptics';

export function SyncStatus() {
  const queue = useSyncStore((s) => s.queue);
  const flushing = useSyncStore((s) => s.flushing);
  const flush = useSyncStore((s) => s.flush);
  const retryReview = useSyncStore((s) => s.retryReview);
  const dismiss = useSyncStore((s) => s.dismiss);

  const pending = queue.filter((a) => a.status === 'PENDING' || a.status === 'SYNCING');
  const review = queue.filter((a) => a.status === 'REVIEW');
  const failed = queue.filter((a) => a.status === 'FAILED');

  // All clear.
  if (pending.length === 0 && review.length === 0 && failed.length === 0) {
    return (
      <Panel label="SYSTEM SYNC" accent={colors.green}>
        <View style={styles.row}>
          <CheckCircle2 size={16} color={colors.green} />
          <Text variant="mono" color={colors.green}>{SYNC_LABEL.VALIDATED}</Text>
          <Text variant="caption" color={colors.textDim} style={{ marginLeft: 'auto' }}>ALL ACTIONS CLEARED</Text>
        </View>
      </Panel>
    );
  }

  const accent = review.length > 0 || failed.length > 0 ? colors.crimson : colors.gold;

  return (
    <Panel
      label="SYSTEM SYNC"
      accent={accent}
      right={
        <Pressable onPress={() => { haptics.tick(); void flush(); }} hitSlop={10}>
          <RefreshCw size={15} color={flushing ? colors.textDim : colors.textSecondary} />
        </Pressable>
      }
    >
      <View style={{ gap: spacing.md }}>
        {pending.length > 0 && (
          <View style={styles.row}>
            <CloudOff size={16} color={colors.gold} />
            <Text variant="mono" color={colors.gold}>{SYNC_LABEL.PENDING}</Text>
            <Text variant="caption" color={colors.textDim} style={{ marginLeft: 'auto' }}>
              {pending.length} QUEUED
            </Text>
          </View>
        )}

        {review.map((a) => (
          <View key={a.id} style={styles.reviewRow}>
            <AlertTriangle size={16} color={colors.crimson} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.crimson}>{SYNC_LABEL.REVIEW}</Text>
              <Text variant="caption" color={colors.textDim}>{a.type} · {a.note ?? 'Rejected by server.'}</Text>
            </View>
            <Pressable onPress={() => { haptics.tick(); retryReview(a.id); }} style={styles.miniBtn}>
              <Text variant="caption" color={colors.energyBright}>RETRY</Text>
            </Pressable>
            <Pressable onPress={() => dismiss(a.id)} hitSlop={8}>
              <X size={14} color={colors.textDim} />
            </Pressable>
          </View>
        ))}

        {failed.map((a) => (
          <View key={a.id} style={styles.reviewRow}>
            <AlertTriangle size={16} color={colors.textDim} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textDim}>{SYNC_LABEL.FAILED}</Text>
              <Text variant="caption" color={colors.textDim}>{a.type}</Text>
            </View>
            <Pressable onPress={() => { haptics.tick(); retryReview(a.id); }} style={styles.miniBtn}>
              <Text variant="caption" color={colors.energyBright}>RETRY</Text>
            </Pressable>
            <Pressable onPress={() => dismiss(a.id)} hitSlop={8}>
              <X size={14} color={colors.textDim} />
            </Pressable>
          </View>
        ))}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniBtn: {
    borderWidth: 1, borderColor: withAlpha(colors.energy, 0.4),
    borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4,
  },
});
