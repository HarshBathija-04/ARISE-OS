import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Gift, Plus, Clock, Coins } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing, radius, withAlpha } from '@/theme';
import { useRewardStore } from '@/store/rewardStore';
import { useGameStore } from '@/store/gameStore';
import { canPurchase } from '@/game-engine/coin-engine';
import { haptics } from '@/services/notifications/haptics';
import { nowIso } from '@/utils/date';
import type { Reward } from '@/types';

export default function RewardsScreen() {
  const router = useRouter();
  const rewards = useRewardStore((s) => s.rewards);
  const purchase = useRewardStore((s) => s.purchase);
  const addCustom = useRewardStore((s) => s.addCustomReward);
  const ensureSeeded = useRewardStore((s) => s.ensureSeeded);
  const coins = useGameStore((s) => s.profile.coins);
  const history = useRewardStore((s) => s.purchaseHistory);
  const [showAdd, setShowAdd] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCost, setCustomCost] = useState('100');
  const [customCooldown, setCustomCooldown] = useState('24');

  useEffect(() => { ensureSeeded(); }, [ensureSeeded]);

  const handlePurchase = (reward: Reward) => {
    Alert.alert(
      'AUTHORIZE REWARD',
      `Spend ${reward.coinCost} coins on "${reward.name}"?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'AUTHORIZE',
          onPress: () => {
            const result = purchase(reward.id);
            if (result.ok) {
              haptics.heavy();
              Alert.alert('REWARD AUTHORIZED', reward.name);
            } else {
              haptics.warning();
              Alert.alert('DENIED', result.error ?? 'Purchase failed.');
            }
          },
        },
      ],
    );
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    addCustom(
      customName.trim(),
      customDesc.trim() || 'Custom reward.',
      parseInt(customCost) || 100,
      parseInt(customCooldown) || 24,
    );
    haptics.tick();
    setShowAdd(false);
    setCustomName('');
    setCustomDesc('');
    setCustomCost('100');
    setCustomCooldown('24');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={colors.violetBright}>REWARD VAULT</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance */}
        <Panel accent={colors.gold} label="SOLO COINS">
          <View style={styles.balanceRow}>
            <Coins size={24} color={colors.gold} />
            <Text variant="readout" color={colors.gold}>{coins}</Text>
          </View>
        </Panel>

        {/* Rewards */}
        <SectionHeader title="AVAILABLE REWARDS" accent={colors.violetBright} />
        <View style={styles.list}>
          {rewards.map((reward) => {
            const check = canPurchase(coins, reward.coinCost, reward.lastPurchasedAt, reward.cooldownHours, nowIso());
            return (
              <Pressable
                key={reward.id}
                style={[styles.card, {
                  borderColor: check.ok ? withAlpha(colors.violetBright, 0.3) : colors.border,
                }]}
                onPress={() => handlePurchase(reward)}
                disabled={!check.ok}
              >
                <View style={styles.cardTop}>
                  <Gift size={18} color={check.ok ? colors.violetBright : colors.textDim} />
                  <View style={{ flex: 1 }}>
                    <Text variant="heading" color={check.ok ? colors.text : colors.textDim}>
                      {reward.name}
                    </Text>
                    <Text variant="caption" color={colors.textDim} numberOfLines={1}>
                      {reward.description}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="mono" color={check.ok ? colors.gold : colors.textDim}>
                      {reward.coinCost} 🪙
                    </Text>
                    {!check.ok && check.reason === 'ON_COOLDOWN' && (
                      <View style={styles.cooldownTag}>
                        <Clock size={10} color={colors.textDim} />
                        <Text variant="caption" color={colors.textDim}>COOLDOWN</Text>
                      </View>
                    )}
                  </View>
                </View>
                {reward.purchaseCount > 0 && (
                  <Text variant="caption" color={colors.textDim} style={{ marginTop: 4 }}>
                    Purchased {reward.purchaseCount}x
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Add custom reward */}
        {showAdd ? (
          <Panel label="NEW CUSTOM REWARD" accent={colors.cyan} style={{ marginTop: spacing.md }}>
            <TextInput value={customName} onChangeText={setCustomName} placeholder="Reward name" placeholderTextColor={colors.textDim} style={styles.input} />
            <TextInput value={customDesc} onChangeText={setCustomDesc} placeholder="Description" placeholderTextColor={colors.textDim} style={[styles.input, { marginTop: spacing.sm }]} />
            <View style={styles.customRow}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.textDim}>COST</Text>
                <TextInput value={customCost} onChangeText={setCustomCost} keyboardType="number-pad" style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.textDim}>COOLDOWN (h)</Text>
                <TextInput value={customCooldown} onChangeText={setCustomCooldown} keyboardType="number-pad" style={styles.input} />
              </View>
            </View>
            <View style={styles.customActions}>
              <Button label="CANCEL" variant="outline" onPress={() => setShowAdd(false)} style={{ flex: 1 }} />
              <Button label="CREATE" variant="primary" onPress={handleAddCustom} style={{ flex: 1 }} />
            </View>
          </Panel>
        ) : (
          <Button
            label="CREATE CUSTOM REWARD"
            variant="outline"
            full
            icon={<Plus size={16} color={colors.cyan} />}
            onPress={() => setShowAdd(true)}
            style={{ marginTop: spacing.md }}
          />
        )}

        {/* Recent purchases */}
        {history.length > 0 && (
          <>
            <SectionHeader title="RECENT PURCHASES" accent={colors.textSecondary} />
            <View style={styles.list}>
              {history.slice(0, 5).map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <Text variant="mono" color={colors.crimson}>{tx.amount} 🪙</Text>
                  <Text variant="caption" color={colors.textDim}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  content: { padding: spacing.base },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.base,
    padding: spacing.base,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cooldownTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  input: {
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: spacing.md,
    color: colors.text, fontFamily: 'monospace', fontSize: 14,
  },
  customRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  customActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.md,
  },
});
