import type {
  CulturalGuideCategory,
  CulturalGuideVerificationStatus,
  FestivalDetailWithCulture,
} from '@saraya/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, LoadingState, Screen, SectionTitle, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { FestivalArtwork } from '../components/FestivalArtwork';
import { FestivalActions } from '../components/FestivalActions';
import { festivalGateway, type FestivalGateway } from '../gateways';
import { formatFestivalDate, getFestivalSchedulePresentation } from '../services/festival-schedule';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const culturalSections: { category: CulturalGuideCategory; title: string }[] = [
  { category: 'history', title: 'Historical timeline and significance' },
  { category: 'customs', title: 'Local customs and traditions' },
  { category: 'payment', title: 'Payment and tipping' },
  { category: 'pasalubong', title: 'Pasalubong' },
  { category: 'dining', title: 'Dining and kamayan etiquette' },
  { category: 'photography-social', title: 'Photography and social interaction' },
];

const culturalStatusLabels: Record<CulturalGuideVerificationStatus, string> = {
  verified: 'Verified',
  'partially-verified': 'Partially verified',
  'general-guidance': 'Traveler guidance',
  'insufficient-evidence': 'Evidence still needed',
};

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function FestivalDetailScreen({ gateway = festivalGateway }: { gateway?: FestivalGateway }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<FestivalDetailWithCulture | null>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void gateway
      .getById(id)
      .then((result) => {
        if (active) setFestival(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, gateway, id]);

  if (festival === undefined && !error) {
    return (
      <Screen>
        <LoadingState label="Opening festival guide…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <StatusPanel
          action={
            <Button
              label="Try again"
              onPress={() => {
                setFestival(undefined);
                setError(false);
                setAttempt((current) => current + 1);
              }}
              variant="secondary"
            />
          }
          message="The festival guide could not be loaded."
          title="We lost the parade route"
          tone="error"
        />
        <Button label="Back to Events" onPress={() => router.replace('/(tabs)/events')} />
      </Screen>
    );
  }

  if (festival === undefined) {
    return null;
  }

  if (festival === null) {
    return (
      <Screen>
        <StatusPanel
          message="This festival guide is unavailable or may have moved."
          title="Festival not found"
          tone="error"
        />
        <Button label="Back to Events" onPress={() => router.replace('/(tabs)/events')} />
      </Screen>
    );
  }

  const schedulePresentation = getFestivalSchedulePresentation(festival);
  const lastVerified = new Date(festival.occurrence.lastVerifiedAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const cultureLastReviewed = new Date(
    `${festival.culturalGuide.lastReviewedAt}T00:00:00+08:00`,
  ).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const sourceBackedCategories = Object.values(festival.culturalGuide.categories).filter(
    (category) => category.sourceIds.length > 0,
  ).length;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.back}
      >
        <ArrowLeft color={colors.navy} size={24} />
      </Pressable>

      <FestivalArtwork
        label={festival.name}
        month={(monthNames[festival.typicalMonth - 1] ?? '').toUpperCase()}
        tone={festival.heroTone}
      />
      <View style={styles.titleBlock}>
        <View style={styles.eyebrowRow}>
          <MapPin color={colors.blue} size={17} />
          <Text style={styles.eyebrow}>
            {festival.city} · {festival.province}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {festival.name}
        </Text>
        <Text style={styles.date}>
          {schedulePresentation.shortLabel} · {festival.category}
        </Text>
        <Text style={styles.summary}>{festival.summary}</Text>
      </View>

      <StatusPanel
        message={schedulePresentation.message}
        title={schedulePresentation.title}
        tone={schedulePresentation.tone}
      />

      <Text style={styles.verified}>Information last verified {lastVerified}</Text>

      <FestivalActions festival={festival} />

      <SectionTitle title="History and meaning" />
      <Text style={styles.body}>{festival.history}</Text>
      <Text style={styles.body}>{festival.culturalSignificance}</Text>

      <SectionTitle title="Signature experiences" />
      <View style={styles.tags}>
        {festival.signatureEvents.map((event) => (
          <Text key={event} style={styles.tag}>
            {event}
          </Text>
        ))}
      </View>

      {festival.occurrence.events.length > 0 ? (
        <>
          <SectionTitle title={`${festival.occurrence.scheduleYear} confirmed highlights`} />
          <Card style={styles.scheduleCard}>
            {festival.occurrence.events.map((item) => (
              <View key={`${item.date}-${item.title}`} style={styles.scheduleRow}>
                <CalendarDays color={colors.green} size={20} />
                <View style={styles.scheduleCopy}>
                  <Text style={styles.scheduleTime}>
                    {formatFestivalDate(item.date)}
                    {item.time ? ` · ${item.time}` : ''}
                  </Text>
                  <Text style={styles.scheduleTitle}>{item.title}</Text>
                  <Text style={styles.scheduleDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle title="Typical festival-day flow" />
      <Card style={styles.scheduleCard}>
        {festival.typicalSchedule.map((item) => (
          <View key={`${item.time}-${item.title}`} style={styles.scheduleRow}>
            <CalendarDays color={colors.coral} size={20} />
            <View style={styles.scheduleCopy}>
              <Text style={styles.scheduleTime}>{item.time}</Text>
              <Text style={styles.scheduleTitle}>{item.title}</Text>
              <Text style={styles.scheduleDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle title="Cultural guide" />
      <Text style={styles.sourceIntro}>
        {sourceBackedCategories} of 6 categories currently have reviewed external evidence · Last
        reviewed {cultureLastReviewed}
      </Text>
      <View style={styles.culturalList}>
        {culturalSections.map(({ category, title }) => {
          const guide = festival.culturalGuide.categories[category];
          return (
            <Card key={category} style={styles.culturalCard}>
              <View style={styles.culturalHeading}>
                <Text style={styles.culturalTitle}>{title}</Text>
                <Text
                  style={[
                    styles.culturalStatus,
                    guide.verificationStatus === 'general-guidance' &&
                      styles.culturalStatusGuidance,
                    guide.verificationStatus === 'insufficient-evidence' &&
                      styles.culturalStatusInsufficient,
                  ]}
                >
                  {culturalStatusLabels[guide.verificationStatus]}
                </Text>
              </View>
              <Text style={styles.body}>{guide.text}</Text>
            </Card>
          );
        })}
      </View>

      {festival.culturalGuide.sources.length > 0 ? (
        <>
          <SectionTitle title="Cultural sources" />
          <View style={styles.sourceList}>
            {festival.culturalGuide.sources.map((source) => (
              <Pressable
                accessibilityHint="Opens the direct cultural source website"
                accessibilityLabel={`Open cultural source: ${source.title}`}
                accessibilityRole="link"
                key={source.id}
                onPress={() => void Linking.openURL(source.url)}
                style={({ pressed }) => [styles.sourceCard, pressed && styles.sourcePressed]}
              >
                <Text style={styles.sourceType}>
                  {source.sourceType.replaceAll('-', ' ')} · {source.supports.join(', ')}
                </Text>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourcePublisher}>
                  {source.publisher} · accessed {source.accessedAt}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <StatusPanel
        message="The practical recommendations below are written by Saraya for trip planning. They are not statements from the government or festival organizers."
        title="Saraya-curated guidance"
      />

      <View style={styles.guideHeading}>
        <Sparkles color={colors.blue} size={22} />
        <SectionTitle title="Travel advice" />
      </View>
      <BulletList items={festival.sarayaEditorial.travelAdvice} />

      <View style={styles.guideHeading}>
        <ShieldCheck color={colors.green} size={22} />
        <SectionTitle title="Survival guide" />
      </View>
      <BulletList items={festival.sarayaEditorial.survivalGuide} />

      <View style={styles.warningGrid}>
        <View style={styles.warningCard}>
          <BedDouble color={colors.violet} size={23} />
          <Text style={styles.warningTitle}>Accommodation</Text>
          <Text style={styles.warningBody}>{festival.sarayaEditorial.accommodationWarning}</Text>
        </View>
        <View style={styles.warningCard}>
          <Utensils color={colors.coral} size={23} />
          <Text style={styles.warningTitle}>Dining</Text>
          <Text style={styles.warningBody}>{festival.sarayaEditorial.diningWarning}</Text>
        </View>
      </View>

      <SectionTitle title="Sources" />
      <Text style={styles.sourceIntro}>
        Sources support festival facts and schedule status. Saraya-curated guidance is identified
        separately above.
      </Text>
      <View style={styles.sourceList}>
        {festival.sources.map((source) => (
          <Pressable
            accessibilityHint="Opens the direct source website"
            accessibilityLabel={`Open source: ${source.title}`}
            accessibilityRole="link"
            key={source.id}
            onPress={() => void Linking.openURL(source.url)}
            style={({ pressed }) => [styles.sourceCard, pressed && styles.sourcePressed]}
          >
            <Text style={styles.sourceType}>
              {source.sourceType.replaceAll('-', ' ')} · {source.purpose}
            </Text>
            <Text style={styles.sourceTitle}>{source.title}</Text>
            <Text style={styles.sourcePublisher}>
              {source.publisher} · accessed {source.accessedAt}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.md },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleBlock: { gap: spacing.sm },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 30 },
  date: { color: colors.coral, fontFamily: type.black, fontSize: 14 },
  verified: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
  summary: { color: colors.muted, fontFamily: type.medium, fontSize: 16, lineHeight: 24 },
  body: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 23 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    color: colors.navy,
    fontFamily: type.bold,
    fontSize: 13,
    backgroundColor: colors.yellowSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  scheduleCard: { padding: spacing.lg, gap: spacing.lg },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  scheduleCopy: { flex: 1 },
  scheduleTime: {
    color: colors.coral,
    fontFamily: type.black,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  scheduleTitle: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  scheduleDescription: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 13,
    lineHeight: 19,
  },
  culturalList: { gap: spacing.md },
  culturalCard: { padding: spacing.lg, gap: spacing.sm },
  culturalHeading: { gap: spacing.sm, alignItems: 'flex-start' },
  culturalTitle: { color: colors.navy, fontFamily: type.black, fontSize: 16 },
  culturalStatus: {
    color: colors.green,
    backgroundColor: colors.greenSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: type.black,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  culturalStatusGuidance: { color: colors.blue, backgroundColor: colors.blueSoft },
  culturalStatusInsufficient: { color: colors.coral, backgroundColor: colors.coralSoft },
  guideHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletList: { gap: spacing.md },
  bulletRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral, marginTop: 7 },
  bulletText: {
    flex: 1,
    color: colors.navy,
    fontFamily: type.medium,
    fontSize: 14,
    lineHeight: 21,
  },
  warningGrid: { gap: spacing.md },
  warningCard: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  warningTitle: { color: colors.navy, fontFamily: type.black, fontSize: 16 },
  warningBody: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 20 },
  sourceIntro: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 20 },
  sourceList: { gap: spacing.sm },
  sourceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sourcePressed: { opacity: 0.72 },
  sourceType: {
    color: colors.blue,
    fontFamily: type.black,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  sourceTitle: { color: colors.navy, fontFamily: type.bold, fontSize: 14 },
  sourcePublisher: { color: colors.muted, fontFamily: type.medium, fontSize: 12 },
});
