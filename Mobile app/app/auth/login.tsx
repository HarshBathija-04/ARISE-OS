import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import { Screen, Text, Button, Input } from '@/components/ui';
import { colors, radius, spacing, withAlpha } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { isApiEnabled } from '@/services/api/client';
import { pullSnapshot } from '@/services/sync/snapshot';
import { useTimetableStore } from '@/store/timetableStore';
import { haptics } from '@/services/notifications/haptics';

type Mode = 'login' | 'register';

/**
 * Shared-backend sign-in. Optional: the app runs local-first without it, but
 * signing in enables cross-device sync with the website.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const busy = status === 'authenticating';
  const canSubmit = isApiEnabled && email.trim().length > 0 && password.length > 0 && !busy;

  async function submit() {
    try { haptics.tap(); } catch {}
    const ok = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim() || 'Player');
    if (ok) {
      await pullSnapshot();
      await useTimetableStore.getState().hydrateFromServer();
      router.replace('/(tabs)/system');
    }
  }

  const footer = (
    <>
      <Button
        label={busy ? 'PLEASE WAIT…' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
        onPress={submit}
        size="lg"
        loading={busy}
        disabled={!canSubmit}
        full
      />
      <Pressable onPress={() => router.replace('/(tabs)/system')} style={styles.skip} hitSlop={8}>
        <Text variant="caption" dim center>Continue offline →</Text>
      </Pressable>
    </>
  );

  return (
    <Screen scroll avoidKeyboard footer={footer}>
      <Stack.Screen options={{ title: 'Cloud Sync', headerShown: false }} />

      <View style={styles.header}>
        <Text variant="label" color={colors.cyan} center>SOLO OS</Text>
        <Text variant="title" color={colors.text} center>
          {mode === 'login' ? 'SYSTEM LOGIN' : 'CREATE ACCOUNT'}
        </Text>
        <Text variant="caption" dim center style={styles.sub}>
          Sync your progression with the web System. Optional — the app works offline.
        </Text>
      </View>

      {!isApiEnabled && (
        <View style={styles.warn}>
          <Text variant="caption" color={colors.gold} center>
            Cloud sync is not configured. Set EXPO_PUBLIC_API_BASE_URL to enable it.
          </Text>
        </View>
      )}

      <View style={styles.form}>
        {mode === 'register' && (
          <Input
            label="DISPLAY NAME"
            value={name}
            onChangeText={setName}
            placeholder="What should the System call you?"
            icon={<User size={18} color={colors.textDim} />}
            autoCapitalize="words"
          />
        )}
        <Input
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          icon={<Mail size={18} color={colors.textDim} />}
        />
        <Input
          label="PASSWORD"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secure
          autoCapitalize="none"
          autoCorrect={false}
          icon={<Lock size={18} color={colors.textDim} />}
        />

        {error && (
          <Text variant="caption" color={colors.crimson} center style={{ marginTop: 4 }}>
            {error}
          </Text>
        )}

        <Pressable onPress={() => setMode((m) => (m === 'login' ? 'register' : 'login'))} style={styles.switch} hitSlop={8}>
          <Text variant="caption" color={colors.cyan} center>
            {mode === 'login' ? 'No account? Create one' : 'Have an account? Log in'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, gap: 6 },
  sub: { marginTop: 8, paddingHorizontal: spacing.lg, lineHeight: 18 },
  warn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.gold, 0.5),
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: withAlpha(colors.gold, 0.08),
  },
  form: { marginTop: spacing.xl, gap: spacing.base },
  switch: { marginTop: spacing.base, padding: spacing.sm },
  skip: { paddingTop: spacing.xs },
});
