import type { JourneyEntry, JourneyStatistics } from '@saraya/contracts';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Award, MapPin, Plus, Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, LoadingState, Screen, SectionTitle, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';
import { journeyGateway, resolvePhotoUrl } from '../gateways';

const emptyStats: JourneyStatistics = { totalVisits: 0, uniqueDestinations: 0, islandGroupsVisited: 0, achievementsUnlocked: 0 };

export function JourneyScreen() {
  const router = useRouter();
  const { unlocked } = useLocalSearchParams<{ unlocked?: string }>();
  const [entries, setEntries] = useState<JourneyEntry[]>([]);
  const [statistics, setStatistics] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [timeline, stats] = await Promise.all([journeyGateway.timeline(), journeyGateway.statistics()]);
      setEntries(timeline);
      setStatistics(stats);
    } catch { setError('Your Journey could not be loaded. Check the API connection and try again.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.title}>My Journey</Text><Text style={styles.subtitle}>Your Cebu story so far.</Text></View>
        <Pressable accessibilityLabel="Record a visit" onPress={() => router.push('/check-ins/create' as never)} style={styles.addButton}><Plus color={colors.white} size={25} /></Pressable>
      </View>
      {unlocked ? <StatusPanel message={unlocked} title="Badge unlocked" tone="success" /> : null}
      {error ? <StatusPanel action={<Button label="Try again" onPress={() => void load()} variant="secondary" />} message={error} title="Journey unavailable" tone="error" /> : null}
      {loading ? <LoadingState label="Loading your Journey..." /> : (
        <>
          <View style={styles.mapPanel}>
            <Text style={styles.mapEyebrow}>YOUR TRAVEL MAP</Text>
            <View style={styles.routeLine} />
            {entries.slice(0, 8).map((entry) => (
              <View key={entry.id} style={[styles.mapDot, markerPosition(entry)]} />
            ))}
            <Text style={styles.mapCaption}>{statistics.uniqueDestinations} places across {statistics.islandGroupsVisited} island groups</Text>
          </View>
          <View style={styles.stats}>
            <Stat value={statistics.uniqueDestinations} label="places" tone="blue" />
            <Stat value={statistics.achievementsUnlocked} label="badges" tone="coral" />
            <Stat value={statistics.totalVisits} label="visits" tone="yellow" />
          </View>
          <SectionTitle title="Travel timeline" action={<Pressable onPress={() => router.push('/achievements' as never)}><Text style={styles.link}>View badges</Text></Pressable>} />
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <MapPin color={colors.blue} size={40} />
              <Text style={styles.emptyTitle}>Your first story starts here</Text>
              <Text style={styles.emptyBody}>Record a destination you visited, then add a photo and note from the day.</Text>
              <Button icon={Plus} label="Record a visit" onPress={() => router.push('/check-ins/create' as never)} />
            </View>
          ) : entries.map((entry, index) => <TimelineEntry entry={entry} key={entry.id} last={index === entries.length - 1} />)}
          {entries.length > 0 ? <Button icon={Award} label="See all achievements" onPress={() => router.push('/achievements' as never)} variant="quiet" /> : null}
        </>
      )}
    </Screen>
  );
}

function markerPosition(entry: JourneyEntry) {
  const longitude = Math.max(116, Math.min(127, entry.coordinates.longitude));
  const latitude = Math.max(5, Math.min(21, entry.coordinates.latitude));
  return {
    left: `${8 + ((longitude - 116) / 11) * 84}%` as `${number}%`,
    top: `${25 + (1 - (latitude - 5) / 16) * 48}%` as `${number}%`,
  };
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'blue' | 'coral' | 'yellow' }) {
  const toneStyle = tone === 'blue' ? styles.statBlue : tone === 'coral' ? styles.statCoral : styles.statYellow;
  return <View style={[styles.stat, toneStyle]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function TimelineEntry({ entry, last }: { entry: JourneyEntry; last: boolean }) {
  const photoUrl = resolvePhotoUrl(entry.photoUrl);
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineTrack}><View style={styles.timelineDot} />{!last ? <View style={styles.timelineLine} /> : null}</View>
      <View style={styles.entry}>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.entryImage} /> : <View style={styles.entryArtwork}><Sparkles color={colors.blue} size={27} /></View>}
        <View style={styles.entryCopy}>
          <Text style={styles.entryDate}>{new Date(entry.visitedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          <Text style={styles.entryTitle}>{entry.destinationName}</Text>
          <Text style={styles.entryMeta}>{entry.province} · {entry.destinationCategory}</Text>
          {entry.journalEntry ? <Text numberOfLines={3} style={styles.entryNote}>{entry.journalEntry}</Text> : null}
          {entry.tags.length ? <Text style={styles.entryTags}>{entry.tags.join(' · ')}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg }, header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, headerCopy: { flex: 1 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 }, subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  mapPanel: { height: 142, borderRadius: 8, backgroundColor: colors.blueSoft, padding: spacing.lg, overflow: 'hidden' }, mapEyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 10 },
  routeLine: { position: 'absolute', top: 70, left: 42, right: 42, height: 3, backgroundColor: colors.blue, transform: [{ rotate: '-4deg' }] },
  mapDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.coral, borderWidth: 3, borderColor: colors.white },
  mapCaption: { position: 'absolute', left: spacing.lg, bottom: spacing.md, color: colors.navy, fontFamily: type.bold, fontSize: 12 },
  stats: { flexDirection: 'row', gap: spacing.sm }, stat: { flex: 1, minHeight: 78, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, statBlue: { backgroundColor: colors.blueSoft }, statCoral: { backgroundColor: colors.coralSoft }, statYellow: { backgroundColor: colors.yellowSoft }, statValue: { color: colors.navy, fontFamily: type.black, fontSize: 22 }, statLabel: { color: colors.muted, fontFamily: type.bold, fontSize: 11 },
  link: { color: colors.blue, fontFamily: type.black, fontSize: 12 }, empty: { minHeight: 310, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl }, emptyTitle: { color: colors.navy, fontFamily: type.black, fontSize: 20, textAlign: 'center' }, emptyBody: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  timelineRow: { flexDirection: 'row', gap: spacing.md, minHeight: 126 }, timelineTrack: { width: 18, alignItems: 'center' }, timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue, marginTop: 20 }, timelineLine: { width: 2, flex: 1, backgroundColor: colors.border },
  entry: { flex: 1, minWidth: 0, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg }, entryImage: { width: 88, height: 88, borderRadius: 8 }, entryArtwork: { width: 88, height: 88, borderRadius: 8, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, entryCopy: { flex: 1, minWidth: 0 }, entryDate: { color: colors.muted, fontFamily: type.bold, fontSize: 10 }, entryTitle: { color: colors.navy, fontFamily: type.black, fontSize: 16 }, entryMeta: { color: colors.blue, fontFamily: type.bold, fontSize: 11 }, entryNote: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 17, marginTop: spacing.xs }, entryTags: { color: colors.coral, fontFamily: type.bold, fontSize: 10, marginTop: spacing.xs },
});
