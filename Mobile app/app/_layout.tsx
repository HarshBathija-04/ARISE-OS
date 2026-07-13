import '../global.css';
import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { colors } from '@/theme';
import { LevelUpOverlay } from '@/components/system/LevelUpOverlay';
import { AchievementUnlockOverlay } from '@/components/system/AchievementUnlockOverlay';
import { StreakMilestoneOverlay } from '@/components/system/StreakMilestoneOverlay';
import { CriticalImpactOverlay } from '@/components/system/CriticalImpactOverlay';
import { TaskAlarmOverlay } from '@/components/system/TaskAlarmOverlay';
import { initSync } from '@/services/sync/bootstrap';
import { useTimetableStore } from '@/store/timetableStore';
import { useOverlayStore } from '@/store/overlayStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const foregroundListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const cleanup = initSync();

    // Check for alarms every 15 seconds for more responsive alarm triggers
    const alarmInterval = setInterval(() => {
      useTimetableStore.getState().checkAlarms();
    }, 15_000);

    // ── Background alarm: listen for notification taps ──────────────
    // When the user taps a timetable notification (app was backgrounded/killed),
    // immediately show the in-app alarm overlay.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'TIMETABLE_ALARM') {
          useOverlayStore.getState().showTaskAlarm({
            blockId: String(data.blockId ?? ''),
            activity: String(data.activity ?? 'TASK'),
            category: String(data.category ?? 'GENERAL'),
          });
        }
      },
    );

    // ── Foreground alarm: when a notification arrives while app is open ─
    foregroundListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (data?.type === 'TIMETABLE_ALARM') {
          useOverlayStore.getState().showTaskAlarm({
            blockId: String(data.blockId ?? ''),
            activity: String(data.activity ?? 'TASK'),
            category: String(data.category ?? 'GENERAL'),
          });
        }
      },
    );

    return () => {
      cleanup();
      clearInterval(alarmInterval);
      if (responseListener.current) {
        responseListener.current.remove();
      }
      if (foregroundListener.current) {
        foregroundListener.current.remove();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="mission/[id]" options={{ presentation: 'card' }} />
          </Stack>
          <LevelUpOverlay />
          <AchievementUnlockOverlay />
          <StreakMilestoneOverlay />
          <CriticalImpactOverlay />
          {/* TaskAlarmOverlay rendered in its own absolute container to guarantee z-order */}
          <View style={styles.alarmContainer} pointerEvents="box-none">
            <TaskAlarmOverlay />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  alarmContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
});
