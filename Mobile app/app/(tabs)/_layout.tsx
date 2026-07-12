import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

/**
 * Solo Leveling tab bar — void-black bar with system-blue active glow,
 * cold text, and a sharp system-border top edge.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Post-onboarding: set up local notifications and flush any pending sync.
  useEffect(() => {
    void useNotificationStore.getState().initialize();
    void useSyncStore.getState().start();
  }, []);

  // Respect the device's bottom inset (gesture bar / home indicator) so the bar
  // never crowds the OS chrome on any phone.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.systemBlue,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: withAlpha(colors.systemBlue, 0.2),
          borderTopWidth: 1,
          height: 56 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          // Subtle glow from the top border
          shadowColor: colors.systemBlue,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 1.4,
          fontWeight: '600',
        },
        tabBarItemStyle: { paddingVertical: 2 },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveBackgroundColor: withAlpha(colors.systemBlue, 0.06),
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
