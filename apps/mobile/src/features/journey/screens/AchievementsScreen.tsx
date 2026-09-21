import type { AchievementProgress } from '@saraya/contracts';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Award, LockKeyhole, Trophy } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LoadingState, Screen, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';
import { journeyGateway } from '../gateways';

export function AchievementsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    setError(false);
    void journeyGateway.achievements().then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  }, []));

  const unlocked = items.filter((item) => item.isUnlocked).length;
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/journey')} style={styles.back}><ArrowLeft color={colors.navy} size={23} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.title}>Achievements</Text><Text style={styles.subtitle}>{unlocked} of {items.length} badges unlocked</Text></View>
      </View>
      {error ? <StatusPanel message="Achievements could not be loaded." title="Badges unavailable" tone="error" /> : null}
      {loading ? <LoadingState label="Loading achievements..." /> : items.map((item) => <AchievementRow item={item} key={item.id} />)}
    </Screen>
  );
}

function AchievementRow({ item }: { item: AchievementProgress }) {
  const percent = Math.min(100, (item.progress / item.threshold) * 100);
  return (
    <View style={[styles.row, item.isUnlocked && styles.rowUnlocked]}>
      <View style={[styles.icon, item.isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
        {item.isUnlocked ? <Trophy color={colors.navy} size={25} /> : <LockKeyhole color={colors.muted} size={22} />}
      </View>
      <View style={styles.copy}>
        <View style={styles.nameRow}><Text style={styles.name}>{item.title}</Text>{item.isUnlocked ? <Award color={colors.coral} size={18} /> : null}</View>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
        <Text style={styles.progressText}>{item.progress} / {item.threshold}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.md }, header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 62 }, back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, headerCopy: { flex: 1 }, title: { color: colors.navy, fontFamily: type.black, fontSize: 26 }, subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  row: { minHeight: 124, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, opacity: 0.72 }, rowUnlocked: { opacity: 1, borderColor: colors.yellow, backgroundColor: colors.yellowSoft },
  icon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, iconUnlocked: { backgroundColor: colors.yellow }, iconLocked: { backgroundColor: colors.background }, copy: { flex: 1, minWidth: 0, gap: spacing.xs }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, name: { flex: 1, color: colors.navy, fontFamily: type.black, fontSize: 16 }, description: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 17 }, progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing.xs }, progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.coral }, progressText: { color: colors.muted, fontFamily: type.bold, fontSize: 10, textAlign: 'right' },
});
