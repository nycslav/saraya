import { Tabs } from 'expo-router';
import { CalendarDays, Compass, Heart, Map, UserRound } from 'lucide-react-native';

import { colors, type } from '@/ui/theme';

const tabIcons = { discover: Compass, journey: Map, 'bucket-list': Heart, events: CalendarDays, profile: UserRound } as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: type.bold, fontSize: 11 },
        tabBarStyle: { height: 74, paddingTop: 8, paddingBottom: 10, borderTopColor: colors.border, backgroundColor: colors.surface },
        tabBarIcon: ({ color, size }) => {
          const Icon = tabIcons[route.name as keyof typeof tabIcons] ?? Compass;
          return <Icon color={color} size={size} strokeWidth={2.1} />;
        },
      })}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="journey" options={{ title: 'Journey' }} />
      <Tabs.Screen name="bucket-list" options={{ title: 'Bucket' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
