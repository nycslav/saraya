import * as Calendar from 'expo-calendar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, CalendarDays, Camera, Image as ImageIcon, MapPin, Settings } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

type PermissionState = 'Allowed' | 'Not allowed' | 'Not requested' | 'Unavailable';
type PermissionItem = { label: string; purpose: string; state: PermissionState; icon: typeof MapPin };

function stateOf(permission?: { granted?: boolean; status?: string; canAskAgain?: boolean }): PermissionState {
  if (!permission) return 'Unavailable';
  if (permission.granted || permission.status === 'granted') return 'Allowed';
  if (permission.status === 'undetermined') return 'Not requested';
  return 'Not allowed';
}

export function AppPermissionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PermissionItem[]>([]);
  const [error, setError] = useState<string>();

  useFocusEffect(useCallback(() => {
    let active = true;
    if (Platform.OS === 'web') {
      setItems([]);
      return () => { active = false; };
    }
    void Promise.allSettled([
      Location.getForegroundPermissionsAsync(), Notifications.getPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(), ImagePicker.getCameraPermissionsAsync(),
      Calendar.getCalendarPermissions(true),
    ]).then((results) => {
      if (!active) return;
      const value = (index: number) => results[index]?.status === 'fulfilled'
        ? results[index].value as { granted?: boolean; status?: string; canAskAgain?: boolean }
        : undefined;
      setItems([
        { label: 'Location', purpose: 'Find safety information for your region when you choose “Use my current location.”', state: stateOf(value(0)), icon: MapPin },
        { label: 'Notifications', purpose: 'Send safety updates and festival reminders you choose to receive.', state: stateOf(value(1)), icon: Bell },
        { label: 'Photos', purpose: 'Choose a profile picture or add a photo to a Journey memory.', state: stateOf(value(2)), icon: ImageIcon },
        { label: 'Camera', purpose: 'Take a photo when recording a Journey memory.', state: stateOf(value(3)), icon: Camera },
        { label: 'Calendar', purpose: 'Add a confirmed festival date only when you ask Saraya to add it.', state: stateOf(value(4)), icon: CalendarDays },
      ]);
    });
    return () => { active = false; };
  }, []));

  const openSettings = async () => {
    setError(undefined);
    try { await Linking.openSettings(); }
    catch { setError('Open your device settings and choose Saraya to manage permissions.'); }
  };

  return (
    <Screen backAction={{ accessibilityLabel: 'Back to Privacy and Account', onPress: () => router.canGoBack() ? router.back() : router.replace('/account/privacy') }}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>App permissions</Text>
        <Text style={styles.subtitle}>Saraya asks only when you use a feature that needs access. You can keep using other features if you say no.</Text>
      </View>
      {Platform.OS === 'web' ? (
        <StatusPanel title="Managed by your browser" message="Use your browser’s site settings to review permissions for Saraya." />
      ) : (
        <Card>{items.map(({ icon: Icon, label, purpose, state }, index) => (
          <View accessible accessibilityLabel={`${label}. ${state}. ${purpose}`} key={label} style={[styles.row, index < items.length - 1 && styles.border]}>
            <View accessibilityElementsHidden style={styles.icon}><Icon color={colors.blue} size={22} /></View>
            <View style={styles.copy}><Text style={styles.label}>{label}</Text><Text style={styles.purpose}>{purpose}</Text></View>
            <Text style={styles.state}>{state}</Text>
          </View>
        ))}</Card>
      )}
      {Platform.OS !== 'web' ? <Button icon={Settings} label="Open device settings" onPress={() => void openSettings()} variant="secondary" /> : null}
      {error ? <StatusPanel title="Settings could not open" message={error} tone="warning" /> : null}
      <Text style={styles.note}>Saraya does not request background location and does not keep a location history.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  row: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  border: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  purpose: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 17 },
  state: { maxWidth: 82, color: colors.blue, fontFamily: type.bold, fontSize: 11, textAlign: 'right' },
  note: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
});
