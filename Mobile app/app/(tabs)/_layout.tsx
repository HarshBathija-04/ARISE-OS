import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  Cpu,
  Swords,
  Calendar,
  Timer,
  TrendingUp,
  User,
} from 'lucide-react-native';
import { colors, withAlpha, fontFamily } from '@/theme';
import { useNotificationStore } from '@/store/notificationStore';
import { useSyncStore } from '@/store/syncStore';

export default function TabsLayout() {
  // Post-onboarding: set up local notifications and flush any pending sync.
  useEffect(() => {
    void useNotificationStore.getState().initialize();
    void useSyncStore.getState().start();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.energyBright,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 64 : 84,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 10 : 24,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 1.5,
          fontWeight: '600',
        },
        tabBarItemStyle: { paddingVertical: 2 },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveBackgroundColor: withAlpha(colors.energy, 0.06),
      }}
    >
      <Tabs.Screen
        name="system"
        options={{
          title: 'SYSTEM',
          tabBarIcon: ({ color, size }) => <Cpu color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'QUESTS',
          tabBarIcon: ({ color, size }) => <Swords color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: 'TIMETABLE',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'FOCUS',
          tabBarIcon: ({ color, size }) => <Timer color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'PROGRESS',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
