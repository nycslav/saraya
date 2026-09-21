import { useRouter, type Href } from 'expo-router';
import { Bell, BookOpen, ChevronRight, LogOut, ShieldCheck, Sparkles, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { Button, Card, LoadingState, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

export function ProfileScreen() {
  const router = useRouter();
  const { user, restoring, logout } = useAuth();

  if (restoring) return <Screen><LoadingState label="Restoring your profile…" /></Screen>;

  if (!user) {
    return (
      <Screen contentContainerStyle={styles.signedOut}>
        <View style={styles.avatar}><UserRound color={colors.blue} size={44} /></View>
        <Text accessibilityRole="header" style={styles.title}>Your travel profile</Text>
        <Text style={styles.subtitle}>Sign in to save preferences and connect your travel progress when those services are ready.</Text>
        <Button label="Log in or sign up" onPress={() => router.push('/(auth)/login' as Href)} />
        <StatusPanel
          message="Journey totals, badges, journals, safety settings, and premium status will appear only after their real services are integrated."
          title="No sample profile data"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.header}>My travel profile</Text>
      <View style={styles.identityRow}>
        <View style={styles.avatar}><UserRound color={colors.blue} size={40} /></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.identityBadge}>
            <Text style={styles.identityBadgeText}>{user.travelStyle ?? 'Travel style not set'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <UnavailableStat label="places" color={colors.blueSoft} />
        <UnavailableStat label="saved" color={colors.coralSoft} />
        <UnavailableStat label="badges" color={colors.yellowSoft} />
      </View>

      <StatusPanel
        message="Member 2’s journey service will supply places, saved items, badges, and journal counts after integration."
        title="Travel progress not connected"
      />

      <Text accessibilityRole="header" style={styles.sectionTitle}>Travel tools</Text>
      <Card>
        <ToolRow icon={BookOpen} label="Journal highlights" status="Not connected" />
        <ToolRow icon={Bell} label="Safety alerts" status="Not connected" />
        <ToolRow icon={Sparkles} label="Saraya Plus" status="Service unavailable" />
        <ToolRow icon={ShieldCheck} label="Privacy and preferences" status="Coming next" last />
      </Card>

      <Button
        icon={LogOut}
        label="Log out"
        onPress={() => void logout()}
        variant="secondary"
      />
    </Screen>
  );
}

function UnavailableStat({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: color }]}>
      <Text style={styles.statValue}>—</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToolRow({
  icon: Icon,
  label,
  status,
  last = false,
}: {
  icon: typeof BookOpen;
  label: string;
  status: string;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${status}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.toolRow, !last && styles.toolBorder]}
    >
      <Icon color={colors.blue} size={21} />
      <Text style={styles.toolLabel}>{label}</Text>
      <Text style={styles.toolStatus}>{status}</Text>
      <ChevronRight color={colors.border} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  signedOut: { justifyContent: 'center', minHeight: '100%' },
  header: { color: colors.navy, fontFamily: type.black, fontSize: 25 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  identityCopy: { flex: 1, alignItems: 'flex-start', gap: spacing.xs },
  name: { color: colors.navy, fontFamily: type.black, fontSize: 20 },
  email: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  identityBadge: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.violetSoft },
  identityBadgeText: { color: colors.violet, fontFamily: type.bold, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, minHeight: 82, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statValue: { color: colors.navy, fontFamily: type.black, fontSize: 24 },
  statLabel: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
  sectionTitle: { color: colors.navy, fontFamily: type.black, fontSize: 19 },
  toolRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  toolBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  toolLabel: { flex: 1, color: colors.navy, fontFamily: type.bold, fontSize: 14 },
  toolStatus: { color: colors.muted, fontFamily: type.medium, fontSize: 11 },
});
