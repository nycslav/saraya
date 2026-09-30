import { useRouter, type Href } from 'expo-router';
import { Bell, ChevronRight, Download, MapPin, Pencil, Settings, ShieldCheck, Trash2, UserRound, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { Button, Card, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

export function PrivacyAccountScreen() {
  const router = useRouter();
  const { user, isDevelopmentPreview, exportAccount, deleteAccount } = useAuth();
  const [message, setMessage] = useState<{ title: string; body: string; tone?: 'success' | 'error' }>();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const accountActionsDisabled = !user || isDevelopmentPreview;

  const handleExport = async () => {
    setExporting(true);
    setMessage(undefined);
    try {
      await exportAccount();
      setMessage({ title: 'Your export is ready', body: 'Choose where you want to save or share your Saraya data.', tone: 'success' });
    } catch {
      setMessage({ title: 'Export could not be created', body: 'Check your internet connection, confirm the connected Google account, and try again.', tone: 'error' });
    } finally { setExporting(false); }
  };

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') return;
    setDeleting(true);
    setMessage(undefined);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      router.replace('/(tabs)/discover');
    } catch {
      setMessage({ title: 'Account was not deleted', body: 'Check your internet connection, confirm the connected Google account, and try again.', tone: 'error' });
      setDeleteOpen(false);
    } finally { setDeleting(false); }
  };

  return (
    <Screen
      backAction={{
        accessibilityLabel: 'Back to profile',
        onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'),
      }}
    >
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Privacy &amp; Account</Text>
        <Text style={styles.subtitle}>See how your account and device permissions work in Saraya.</Text>
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>Account</Text>
      <Card style={styles.accountCard}>
        <View accessibilityElementsHidden style={styles.iconWrap}><UserRound color={colors.blue} size={24} /></View>
        <View style={styles.accountCopy}>
          <Text style={styles.accountName}>{user?.displayName ?? 'Not signed in'}</Text>
          {user?.email ? (
            <View style={styles.emailGroup}>
              <Text style={styles.emailLabel}>
                {isDevelopmentPreview ? 'Preview email (not connected)' : 'Connected Google email'}
              </Text>
              <Text style={styles.accountEmail}>{user.email}</Text>
            </View>
          ) : null}
          <Text style={styles.accountType}>
            {isDevelopmentPreview ? 'Development preview' : user ? 'Connected with Google' : 'Guest account'}
          </Text>
        </View>
      </Card>

      <Text accessibilityRole="header" style={styles.sectionTitle}>Settings</Text>
      <Card>
        <SettingsRow
          accessibilityLabel="Edit profile"
          description="Update your display name and profile picture."
          icon={Pencil}
          label="Edit profile"
          onPress={() => router.push('/account/edit-profile' as Href)}
        />
        <Pressable
          accessibilityLabel="Notifications, manage"
          accessibilityRole="button"
          onPress={() => router.push('/notifications/preferences' as Href)}
          style={({ pressed }) => [
            styles.settingsRow,
            styles.settingsBorder,
            pressed && styles.settingsRowPressed,
          ]}
        >
          <Bell color={colors.blue} size={22} />
          <View style={styles.settingsCopy}>
            <Text style={styles.settingsLabel}>Notifications</Text>
            <Text style={styles.settingsDescription}>Manage safety alerts and festival reminders.</Text>
          </View>
          <ChevronRight color={colors.border} size={19} />
        </Pressable>
        <SettingsRow
          accessibilityLabel="App permissions, view details"
          description="Review location, notifications, photos, camera, and calendar access."
          icon={Settings}
          label="App permissions"
          last
          onPress={() => router.push('/account/permissions' as Href)}
        />
      </Card>

      <Text accessibilityRole="header" style={styles.sectionTitle}>Your privacy</Text>
      <View style={styles.infoCard}>
        <View accessibilityElementsHidden style={styles.iconWrap}><MapPin color={colors.blue} size={23} /></View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Location stays in your control</Text>
          <Text style={styles.infoText}>Saraya asks for your current location only when you choose to use it. The app does not track your location in the background or keep a location history.</Text>
        </View>
      </View>
      <View style={styles.infoCard}>
        <View accessibilityElementsHidden style={styles.iconWrap}><ShieldCheck color={colors.blue} size={23} /></View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Travel details are personal</Text>
          <Text style={styles.infoText}>Journey notes, photos, and saved travel plans belong to your signed-in account. A real Google sign-in is required for account-connected actions.</Text>
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>Your data</Text>
      <Card>
        <SettingsRow
          accessibilityLabel="Export my data"
          description="Save a ZIP with your account data and Saraya-uploaded photos."
          disabled={accountActionsDisabled || exporting || deleting}
          icon={Download}
          label={exporting ? 'Preparing export…' : 'Export my data'}
          onPress={() => void handleExport()}
        />
        <SettingsRow
          accessibilityLabel="Delete account"
          description="Permanently remove your Saraya profile and travel data."
          destructive
          disabled={accountActionsDisabled || exporting || deleting}
          icon={Trash2}
          label="Delete account"
          last
          onPress={() => { setConfirmation(''); setDeleteOpen(true); }}
        />
      </Card>
      {accountActionsDisabled ? (
        <StatusPanel title={isDevelopmentPreview ? 'Preview account only' : 'Sign in required'} message={isDevelopmentPreview ? 'Export and deletion are available after signing in with a real Google account.' : 'Sign in with Google to export or delete account data.'} />
      ) : null}
      <Text style={styles.providerNote}>Deleting Saraya data does not erase purchase records kept by Google Play, the App Store, or their payment providers.</Text>
      {message ? <StatusPanel title={message.title} message={message.body} tone={message.tone} /> : null}

      <Modal animationType="fade" onRequestClose={() => !deleting && setDeleteOpen(false)} transparent visible={deleteOpen}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Pressable accessibilityLabel="Close delete account dialog" accessibilityRole="button" disabled={deleting} onPress={() => setDeleteOpen(false)} style={styles.modalClose}>
              <X color={colors.navy} size={22} />
            </Pressable>
            <View accessibilityElementsHidden style={styles.deleteIcon}><Trash2 color={colors.danger} size={28} /></View>
            <Text accessibilityRole="header" style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalBody}>This immediately removes your profile, Journey, saved places, itineraries, reminders, followed safety areas, and uploaded photos. This cannot be undone.</Text>
            <Text style={styles.confirmLabel}>Type DELETE to continue</Text>
            <TextInput accessibilityLabel="Type DELETE to confirm" autoCapitalize="characters" editable={!deleting} onChangeText={setConfirmation} placeholder="DELETE" placeholderTextColor={colors.muted} style={styles.confirmInput} value={confirmation} />
            <Button disabled={confirmation !== 'DELETE'} icon={Trash2} label="Permanently delete account" loading={deleting} onPress={() => void handleDelete()} />
            <Button disabled={deleting} label="Keep my account" onPress={() => setDeleteOpen(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function SettingsRow({
  accessibilityLabel,
  description,
  icon: Icon,
  label,
  last = false,
  disabled = false,
  destructive = false,
  onPress,
}: {
  accessibilityLabel: string;
  description: string;
  icon: typeof Pencil;
  label: string;
  last?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        !last && styles.settingsBorder,
        pressed && styles.settingsRowPressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon color={destructive ? colors.danger : colors.blue} size={22} />
      <View style={styles.settingsCopy}>
        <Text style={[styles.settingsLabel, destructive && styles.destructive]}>{label}</Text>
        <Text style={styles.settingsDescription}>{description}</Text>
      </View>
      <ChevronRight color={colors.border} size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.navy, fontFamily: type.black, fontSize: 19 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  accountCopy: { flex: 1, gap: 2 },
  accountName: { color: colors.navy, fontFamily: type.black, fontSize: 17 },
  emailGroup: { gap: 1, marginTop: spacing.xs },
  emailLabel: { color: colors.navy, fontFamily: type.bold, fontSize: 12 },
  accountEmail: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  accountType: { color: colors.blue, fontFamily: type.bold, fontSize: 12, marginTop: spacing.xs },
  settingsRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  settingsBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingsRowPressed: { backgroundColor: colors.blueSoft },
  settingsCopy: { flex: 1, gap: 2 },
  settingsLabel: { color: colors.navy, fontFamily: type.bold, fontSize: 15 },
  settingsDescription: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 17 },
  disabled: { opacity: 0.48 },
  destructive: { color: colors.danger },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  infoCopy: { flex: 1, gap: spacing.xs },
  infoTitle: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  infoText: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  providerNote: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 18 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(10, 42, 56, 0.48)' },
  modalCard: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface },
  modalClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  deleteIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  modalTitle: { color: colors.navy, fontFamily: type.black, fontSize: 24 },
  modalBody: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
  confirmLabel: { color: colors.navy, fontFamily: type.bold, fontSize: 13 },
  confirmInput: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.lg, color: colors.navy, fontFamily: type.black, fontSize: 16, backgroundColor: colors.background },
});
