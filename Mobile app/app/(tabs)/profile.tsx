import { View, StyleSheet, Switch, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, RotateCcw, Award, Gift, BarChart3, Bot, Bell, ChevronRight, Cloud, CloudOff } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SyncStatus } from '@/components/system/SyncStatus';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { pushSnapshot } from '@/services/sync/snapshot';
import { rankColor } from '@/constants/ranks';
import { titleDef } from '@/constants/titles';
import { haptics } from '@/services/notifications/haptics';

const LINKS = [
  { label: 'TITLES', icon: Award, route: '/titles', color: colors.gold },
  { label: 'REWARD VAULT', icon: Gift, route: '/rewards', color: colors.violetBright },
  { label: 'ANALYTICS', icon: BarChart3, route: '/analytics', color: colors.energy },
  { label: 'ECHO GUIDE', icon: Bot, route: '/guide', color: colors.cyan },
  { label: 'NOTIFICATIONS', icon: Bell, route: '/settings/notifications', color: colors.green },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useGameStore((s) => s.profile);
  const setPrivacyMode = useGameStore((s) => s.setPrivacyMode);
  const resetAll = useGameStore((s) => s.resetAll);
  const authUser = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const rc = rankColor(profile.rank);
  const title = titleDef(profile.equippedTitleKey);

  const confirmReset = () => {
    Alert.alert(
      'RESET SYSTEM',
      'This wipes all local progress (level, XP, missions, coins). This cannot be undone.',
      [
        { text: 'CANCEL', style: 'cancel' },
        { text: 'RESET', style: 'destructive', onPress: () => { haptics.warning(); resetAll(); } },
      ],
    );
  };

  return (
    <Screen scroll>
      <Text variant="title" color={colors.text}>PLAYER</Text>

      <Panel label="IDENTITY" accent={rc} style={styles.block}>
        <Text variant="title" color={colors.text}>{profile.displayName.toUpperCase()}</Text>
        <View style={styles.rankRow}>
          <View style={[styles.dot, { backgroundColor: rc }]} />
          <Text variant="label" color={rc}>{profile.rank} · LVL {profile.level}</Text>
        </View>
        <Text variant="caption" color={colors.gold} style={{ marginTop: 6 }}>
          {title ? `TITLE: ${title.name}` : 'NO TITLE EQUIPPED'}
        </Text>

        <View style={styles.statsRow}>
          <Stat label="HEIGHT" value={`${Math.round(profile.heightCm)} cm`} />
          <Stat label="WEIGHT" value={`${Math.round(profile.weightKg)} kg`} />
          <Stat label="WAKE" value={profile.wakeTarget} />
          <Stat label="SLEEP" value={`${profile.sleepTargetHours}h`} />
        </View>
      </Panel>

      <SectionHeader title="SYSTEMS" accent={colors.energy} />
      <View style={styles.linkGrid}>
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Pressable key={l.label} style={styles.linkCard} onPress={() => router.push(l.route as never)}>
              <Icon size={19} color={l.color} />
              <Text variant="mono" color={colors.text} style={{ flex: 1 }}>{l.label}</Text>
              <ChevronRight size={16} color={colors.textDim} />
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="SETTINGS" accent={colors.violet} />
      <Panel padded={false}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Shield size={18} color={colors.violetBright} />
            <View>
              <Text variant="mono" color={colors.text}>PRIVACY MODE</Text>
              <Text variant="caption" color={colors.textDim}>
                Hide Shadow Habit labels & use neutral notifications
              </Text>
            </View>
          </View>
          <Switch
            value={profile.privacyMode}
            onValueChange={(v) => { haptics.tick(); setPrivacyMode(v); }}
            trackColor={{ false: colors.surface2, true: withAlpha(colors.violet, 0.6) }}
            thumbColor={profile.privacyMode ? colors.violetBright : colors.textDim}
          />
        </View>
      </Panel>

      <SectionHeader title="CLOUD SYNC" accent={colors.cyan} />
      <Panel style={styles.block}>
        <View style={styles.settingLeft}>
          {authUser ? <Cloud size={18} color={colors.cyan} /> : <CloudOff size={18} color={colors.textDim} />}
          <View style={{ flex: 1 }}>
            <Text variant="mono" color={colors.text}>
              {authUser ? 'SIGNED IN' : 'OFFLINE (LOCAL ONLY)'}
            </Text>
            <Text variant="caption" color={colors.textDim}>
              {authUser ? authUser.email : 'Sign in to sync with the web System'}
            </Text>
          </View>
        </View>
        {authUser ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base }}>
            <Button label="SYNC NOW" variant="secondary" onPress={() => { void pushSnapshot(); }} style={{ flex: 1 }} />
            <Button label="SIGN OUT" variant="ghost" onPress={() => { void signOut(); }} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button
            label="SIGN IN / REGISTER"
            onPress={() => router.push('/auth/login' as never)}
            full
            style={{ marginTop: spacing.base }}
          />
        )}
      </Panel>

      <SectionHeader title="SYNC" accent={colors.green} />
      <SyncStatus />

      <SectionHeader title="DANGER ZONE" accent={colors.crimson} />
      <Pressable style={styles.resetBtn} onPress={confirmReset}>
        <RotateCcw size={18} color={colors.crimson} />
        <Text variant="heading" color={colors.crimson}>RESET SYSTEM</Text>
      </Pressable>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" color={colors.textDim}>{label}</Text>
      <Text variant="mono" color={colors.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.base },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: withAlpha(colors.border, 0.6),
  },
  stat: { gap: 3 },
  linkGrid: { gap: spacing.sm },
  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.base, padding: spacing.base,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, paddingRight: 8 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: withAlpha(colors.crimson, 0.5),
    backgroundColor: withAlpha(colors.crimson, 0.08),
    borderRadius: radius.base, paddingVertical: spacing.base,
  },
});
