import { View, StyleSheet, Switch, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, RotateCcw, Award, Gift, BarChart3, Bot, Bell, Cloud, CloudOff } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Row';
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
  { label: 'TITLES', icon: Award, route: '/titles', color: colors.monarchGold },
  { label: 'REWARD VAULT', icon: Gift, route: '/rewards', color: colors.violetBright },
  { label: 'ANALYTICS', icon: BarChart3, route: '/analytics', color: colors.systemBlue },
  { label: 'ECHO GUIDE', icon: Bot, route: '/guide', color: colors.phantomCyan },
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
      '「SYSTEM RESET」',
      'This wipes all local progress (level, XP, missions, coins). This cannot be undone.',
      [
        { text: 'CANCEL', style: 'cancel' },
        { text: 'RESET', style: 'destructive', onPress: () => { haptics.warning(); resetAll(); } },
      ],
    );
  };

  return (
    <Screen scroll title="PLAYER" accent={rc}>
      <Panel label="IDENTITY" accent={rc} style={styles.block}>
        <Text variant="title" color={colors.text} glowColor={withAlpha(rc, 0.3)}>{profile.displayName.toUpperCase()}</Text>
        <View style={styles.rankRow}>
          <View style={[styles.dot, { backgroundColor: rc, shadowColor: rc }]} />
          <Text variant="label" color={rc}>{profile.rank} · LVL {profile.level}</Text>
        </View>
        <Text variant="caption" color={colors.monarchGold} style={{ marginTop: 6 }}>
          {title ? `TITLE: ${title.name}` : 'NO TITLE EQUIPPED'}
        </Text>

        <View style={styles.statsRow}>
          <Stat label="HEIGHT" value={`${Math.round(profile.heightCm)} cm`} />
          <Stat label="WEIGHT" value={`${Math.round(profile.weightKg)} kg`} />
          <Stat label="WAKE" value={profile.wakeTarget} />
          <Stat label="SLEEP" value={`${profile.sleepTargetHours}h`} />
        </View>
      </Panel>

      <SectionHeader title="SYSTEMS" accent={colors.systemBlue} />
      <View style={styles.grid}>
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Row
              key={l.label}
              label={l.label}
              icon={<Icon size={19} color={l.color} />}
              accent={l.color}
              onPress={() => router.push(l.route as never)}
            />
          );
        })}
      </View>

      <SectionHeader title="SETTINGS" accent={colors.shadowViolet} />
      <Row
        label="PRIVACY MODE"
        sub="Hide Shadow Habit labels & use neutral notifications"
        icon={<Shield size={18} color={colors.violetBright} />}
        right={
          <Switch
            value={profile.privacyMode}
            onValueChange={(v) => { haptics.tick(); setPrivacyMode(v); }}
            trackColor={{ false: colors.surface2, true: withAlpha(colors.shadowViolet, 0.6) }}
            thumbColor={profile.privacyMode ? colors.violetBright : colors.textDim}
          />
        }
      />

      <SectionHeader title="CLOUD SYNC" accent={colors.phantomCyan} />
      <Panel style={styles.block}>
        <View style={styles.settingLeft}>
          {authUser ? <Cloud size={18} color={colors.phantomCyan} /> : <CloudOff size={18} color={colors.textDim} />}
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
          <View style={styles.syncBtns}>
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
      <Button
        label="RESET SYSTEM"
        variant="danger"
        size="lg"
        full
        icon={<RotateCcw size={18} color={colors.crimson} />}
        onPress={confirmReset}
        haptic="heavy"
      />
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
  block: { marginTop: spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // Rank glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: withAlpha(colors.systemBlue, 0.15),
  },
  stat: { gap: 3 },
  grid: { gap: spacing.sm },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, paddingRight: 8 },
  syncBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base },
});
