import type { NotificationPreferences } from '@saraya/contracts';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { LoadingState, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';
import { notificationGateway } from '../gateway';

export function NotificationPreferencesScreen() {
  const { user, restoring } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void notificationGateway.getPreferences()
      .then((value) => { if (active) setPreferences(value); })
      .catch(() => { if (active) setError('Notification preferences could not be loaded.'); });
    return () => { active = false; };
  }, [user]);

  if (restoring || (user && !preferences && !error)) return <Screen><LoadingState label="Loading notification preferences…" /></Screen>;
  if (!user) return <Screen><StatusPanel title="Sign in required" message="Sign in before enabling notifications so Saraya can associate this device only with your account." /></Screen>;

  const toggle = async (key: keyof NotificationPreferences, enabled: boolean) => {
    const previous = preferences!;
    setPreferences({ ...previous, [key]: enabled });
    setSaving(true);
    setError(undefined);
    try {
      const updated = enabled
        ? await notificationGateway.enable({ [key]: true })
        : await notificationGateway.updatePreferences({ [key]: false });
      setPreferences(updated);
      if (enabled && !updated[key]) setError('Permission was not granted. Saraya remains usable without notifications.');
    } catch (caught) {
      setPreferences(previous);
      setError(caught instanceof Error ? caught.message : 'The preference could not be saved.');
    } finally { setSaving(false); }
  };

  return <Screen>
    <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
    <Text style={styles.description}>Choose what Saraya may send. Permission is requested only when you turn a category on.</Text>
    <View style={styles.card}>
      <PreferenceRow label="Safety alerts" description="Important weather and travel-safety updates." value={preferences?.safetyAlertsEnabled ?? false} disabled={saving} onChange={(value) => void toggle('safetyAlertsEnabled', value)} />
      <PreferenceRow label="Festival reminders" description="Reminders you choose for upcoming festivals." value={preferences?.festivalRemindersEnabled ?? false} disabled={saving} onChange={(value) => void toggle('festivalRemindersEnabled', value)} />
    </View>
    {error ? <StatusPanel title="Notifications unchanged" message={error} /> : null}
    <Text style={styles.note}>Saraya does not use background location for notifications.</Text>
  </Screen>;
}

function PreferenceRow({ label, description, value, disabled, onChange }: {
  label: string; description: string; value: boolean; disabled: boolean; onChange(value: boolean): void;
}) {
  return <View style={styles.row}>
    <View style={styles.copy}><Text style={styles.label}>{label}</Text><Text style={styles.rowDescription}>{description}</Text></View>
    <Switch accessibilityLabel={label} disabled={disabled} value={value} onValueChange={onChange} trackColor={{ true: colors.blue }} />
  </View>;
}

const styles = StyleSheet.create({
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  description: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1 },
  row: { minHeight: 88, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomColor: colors.border, borderBottomWidth: 1 },
  copy: { flex: 1, gap: spacing.xs },
  label: { color: colors.navy, fontFamily: type.bold, fontSize: 16 },
  rowDescription: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 18 },
  note: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
});
