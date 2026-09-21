import type { DestinationDetail } from '@saraya/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Sparkles, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, DestinationArtwork, LoadingState, Screen, SectionTitle, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';
import { destinationGateway } from '@/features/discovery/gateways';

export function DestinationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [destination, setDestination] = useState<DestinationDetail | null>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void destinationGateway.getById(id)
      .then((result) => {
        if (active) setDestination(result);
      })
      .catch(() => {
        if (active) setError('The destination service is unavailable. Check the API connection and try again.');
      });
    return () => { active = false; };
  }, [id]);

  if (error) {
    return (
      <Screen>
        <StatusPanel message={error} title="Unable to load destination" tone="error" />
        <Button label="Back to Discover" onPress={() => router.replace('/(tabs)/discover')} />
      </Screen>
    );
  }

  if (destination === undefined) return <Screen><LoadingState label="Opening destination…" /></Screen>;
  if (destination === null) {
    return (
      <Screen>
        <StatusPanel message="This destination is unavailable or may have moved." title="Destination not found" tone="error" />
        <Button label="Back to Discover" onPress={() => router.replace('/(tabs)/discover')} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screen}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color={colors.navy} size={24} />
      </Pressable>
      <DestinationArtwork label={destination.name} tone={destination.heroTone} />
      <View style={styles.titleBlock}>
        <View style={styles.eyebrowRow}>
          <MapPin color={colors.blue} size={17} />
          <Text style={styles.eyebrow}>{destination.province} · {destination.islandGroup}</Text>
          <Star color={colors.yellow} fill={colors.yellow} size={17} />
          <Text style={styles.rating}>{destination.rating.toFixed(1)}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>{destination.name}</Text>
        <Text style={styles.description}>{destination.description}</Text>
      </View>

      <SectionTitle title="Trip highlights" />
      <View style={styles.tagWrap}>
        {destination.highlights.map((highlight) => <Text key={highlight} style={styles.tag}>{highlight}</Text>)}
      </View>

      <View style={styles.guide}>
        <View style={styles.guideTitle}>
          <Sparkles color={colors.blue} size={22} />
          <Text style={styles.guideHeading}>Travel with context</Text>
        </View>
        <Text style={styles.guideBody}>{destination.culturalGuide.historicalContext}</Text>
        {destination.culturalGuide.etiquette.map((tip) => (
          <View key={tip} style={styles.tipRow}><View style={styles.tipDot} /><Text style={styles.tip}>{tip}</Text></View>
        ))}
        <View style={styles.phrase}><Text style={styles.phraseLabel}>LOCAL PHRASE</Text><Text style={styles.phraseText}>{destination.culturalGuide.localPhrase}</Text></View>
      </View>

      <Button
        icon={Sparkles}
        label={`Plan a ${destination.name} trip`}
        onPress={() => router.push({ pathname: '/premium/itinerary', params: { destinationId: destination.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.md },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  titleBlock: { gap: spacing.sm },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 12, flex: 1 },
  rating: { color: colors.navy, fontFamily: type.bold, fontSize: 13 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 30 },
  description: { color: colors.muted, fontFamily: type.medium, fontSize: 16, lineHeight: 24 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { color: colors.navy, fontFamily: type.bold, fontSize: 13, backgroundColor: colors.yellowSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  guide: { backgroundColor: colors.blueSoft, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  guideTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guideHeading: { color: colors.navy, fontFamily: type.black, fontSize: 19 },
  guideBody: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 23 },
  tipRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  tipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral, marginTop: 7 },
  tip: { flex: 1, color: colors.navy, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
  phrase: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, gap: 3 },
  phraseLabel: { color: colors.blue, fontFamily: type.black, fontSize: 10, letterSpacing: 0.8 },
  phraseText: { color: colors.navy, fontFamily: type.bold, fontSize: 15 },
});
