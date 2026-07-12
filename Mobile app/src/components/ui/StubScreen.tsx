import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from './Text';
import { Panel } from './Panel';
import { colors, spacing } from '@/theme';

/**
 * Reusable placeholder for secondary screens not yet built in the current
 * phase. Keeps navigation alive (no dead ends) and communicates when the
 * feature lands. Replaced by the real screen in its phase.
 */
export function StubScreen({
  title,
  accent = colors.energy,
  body,
  phase,
}: {
  title: string;
  accent?: string;
  body: string;
  phase: string;
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color={accent}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel accent={accent}>
          <Text dim style={{ lineHeight: 21 }}>{body}</Text>
          <Text variant="caption" color={colors.textDim} style={{ marginTop: 12 }}>
            ARRIVES IN {phase}
          </Text>
        </Panel>
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
});
