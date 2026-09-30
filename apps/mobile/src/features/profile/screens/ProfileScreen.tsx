import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Bell, BookOpen, ChevronRight, LogOut, Pencil, ShieldCheck, Sparkles, UserRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { bucketListGateway } from '@/features/bucket-list/gateways';
import { journeyGateway } from '@/features/journey/gateways';
import { Button, Card, LoadingState, Screen } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { ProfileAvatar } from '../components/ProfileAvatar';

type ProfileStats = {
  places?: number;
  saved?: number;
  badges?: number;
};

async function loadProfileStats(): Promise<ProfileStats> {
  const [journeyResult, bucketListResult] = await Promise.allSettled([
    journeyGateway.statistics(),
    bucketListGateway.list(),
  ]);

  return {
    places: journeyResult.status === 'fulfilled'
      ? journeyResult.value.uniqueDestinations
      : undefined,
    badges: journeyResult.status === 'fulfilled'
      ? journeyResult.value.achievementsUnlocked
      : undefined,
    saved: bucketListResult.status === 'fulfilled'
      ? bucketListResult.value.length
      : undefined,
  };
}

export function ProfileScreen() {
  const router = useRouter();
  const { user, restoring, isDevelopmentPreview, logout } = useAuth();
  const userId = user?.id;
  const [stats, setStats] = useState<ProfileStats>({});

  useFocusEffect(useCallback(() => {
    if (restoring) return;
    if (!userId) {
      setStats({});
      return;
    }

    let active = true;
    void loadProfileStats().then((nextStats) => {
      if (active) setStats(nextStats);
    });
    return () => { active = false; };
  }, [restoring, userId]));

  const handleLogout = async () => {
    await logout();
    router.replace('/(tabs)/discover');
  };

  if (restoring) return <Screen><LoadingState label="Restoring your profile…" /></Screen>;

  if (!user) {
    return (
      <Screen contentContainerStyle={styles.signedOut}>
        <View style={styles.avatar}><UserRound color={colors.blue} size={44} /></View>
        <Text accessibilityRole="header" style={styles.title}>Your travel profile</Text>
        <Text style={styles.subtitle}>Sign in to keep your Journey and Bucket List across devices.</Text>
        <Button label="Continue with Google" onPress={() => router.push('/(auth)/login' as Href)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.header}>My travel profile</Text>
      <View style={styles.identityRow}>
        <ProfileAvatar avatarUrl={user.avatarUrl} label={`${user.displayName}'s profile picture`} />
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.identityBadge}>
            <Text style={styles.identityBadgeText}>
              {isDevelopmentPreview ? 'Development preview' : 'Google account'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
          onPress={() => router.push('/account/edit-profile' as Href)}
          style={({ pressed }) => [styles.editButton, pressed && styles.toolRowPressed]}
        >
          <Pencil color={colors.blue} size={20} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <ProfileStat value={stats.places} label="places" color={colors.blueSoft} />
        <ProfileStat value={stats.saved} label="saved" color={colors.coralSoft} />
        <ProfileStat value={stats.badges} label="badges" color={colors.yellowSoft} />
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>Travel tools</Text>
      <Card>
        <ToolRow
          icon={BookOpen}
          label="My Journey"
          status="View"
          onPress={() => router.push('/(tabs)/journey' as Href)}
        />
        <ToolRow
          icon={Bell}
          label="Notifications"
          status="Manage"
          onPress={() => router.push('/notifications/preferences' as Href)}
        />
        <ToolRow
          icon={Sparkles}
          label="Saraya Premium"
          status="View plans"
          onPress={() => router.push('/premium/paywall' as Href)}
        />
        <ToolRow
          icon={ShieldCheck}
          label="Privacy & Account"
          status="View details"
          last
          onPress={() => router.push('/account/privacy' as Href)}
        />
      </Card>

      <Button
        icon={LogOut}
        label="Log out"
        onPress={() => void handleLogout()}
        variant="secondary"
      />
    </Screen>
  );
}

function ProfileStat({ value, label, color }: { value?: number; label: string; color: string }) {
  const displayValue = value ?? '—';
  return (
    <View accessible accessibilityLabel={`${displayValue} ${label}`} style={[styles.stat, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{displayValue}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToolRow({
  icon: Icon,
  label,
  status,
  last = false,
  onPress,
}: {
  icon: typeof BookOpen;
  label: string;
  status: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${status}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolRow,
        !last && styles.toolBorder,
        pressed && onPress && styles.toolRowPressed,
      ]}
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
  editButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
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
  toolRowPressed: { backgroundColor: colors.blueSoft },
  toolBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  toolLabel: { flex: 1, color: colors.navy, fontFamily: type.bold, fontSize: 14 },
  toolStatus: { color: colors.muted, fontFamily: type.medium, fontSize: 11 },
});
