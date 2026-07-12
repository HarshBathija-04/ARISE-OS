import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Screen, Text, Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
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

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Cloud Sync', headerShown: false }} />
      <View style={styles.header}>
        <Text variant="label" color={colors.cyan} center>SOLO OS</Text>
        <Text variant="heading" color={colors.text} center>
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
          <Field label="DISPLAY NAME" value={name} onChange={setName} placeholder="Harsh" />
        )}
        <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="PASSWORD" value={password} onChange={setPassword} placeholder="••••••••" secure />

        {error && (
          <Text variant="caption" color={colors.crimson} center style={{ marginTop: 4 }}>
            {error}
          </Text>
        )}

        <Button
          label={busy ? 'PLEASE WAIT…' : mode === 'login' ? 'LOG IN' : 'REGISTER'}
          onPress={submit}
          disabled={busy || !isApiEnabled}
          full
          style={{ marginTop: spacing.base }}
        />

        <Pressable onPress={() => setMode((m) => (m === 'login' ? 'register' : 'login'))} style={styles.switch}>
          <Text variant="caption" color={colors.cyan} center>
            {mode === 'login' ? 'No account? Create one' : 'Have an account? Log in'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(tabs)/system')} style={styles.skip}>
          <Text variant="caption" dim center>Continue offline →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Field({
  label, value, onChange, placeholder, secure, keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color={colors.textDim}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, gap: 6 },
  sub: { marginTop: 8, paddingHorizontal: spacing.lg, lineHeight: 18 },
  warn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.base,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  form: { marginTop: spacing.xl, gap: spacing.md },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  switch: { marginTop: spacing.base, padding: spacing.sm },
  skip: { marginTop: 2, padding: spacing.sm },
});
