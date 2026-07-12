import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/theme';
import { LevelUpOverlay } from '@/components/system/LevelUpOverlay';
import { AchievementUnlockOverlay } from '@/components/system/AchievementUnlockOverlay';
import { StreakMilestoneOverlay } from '@/components/system/StreakMilestoneOverlay';
import { CriticalImpactOverlay } from '@/components/system/CriticalImpactOverlay';
import { TaskAlarmOverlay } from '@/components/system/TaskAlarmOverlay';
import { initSync } from '@/services/sync/bootstrap';
import { useTimetableStore } from '@/store/timetableStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const cleanup = initSync();

    // Check for alarms every 30 seconds
    const alarmInterval = setInterval(() => {
      useTimetableStore.getState().checkAlarms();
    }, 30_000);

    return () => {
      cleanup();
      clearInterval(alarmInterval);
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
          <TaskAlarmOverlay />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
