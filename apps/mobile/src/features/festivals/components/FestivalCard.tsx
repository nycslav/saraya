import type { FestivalSummary } from '@saraya/contracts';
import { type Href, useRouter } from 'expo-router';
import { ArrowRight, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

import { FestivalArtwork } from './FestivalArtwork';
import { getFestivalSchedulePresentation } from '../services/festival-schedule';

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

export function FestivalCard({
  festival,
  compact = false,
}: {
  festival: FestivalSummary;
  compact?: boolean;
}) {
  const router = useRouter();
  const month = monthNames[festival.typicalMonth - 1] ?? '';
  const schedule = getFestivalSchedulePresentation(festival);

  return (
    <Pressable
      accessibilityHint="Opens festival details and travel guidance"
      accessibilityLabel={`${festival.name}, ${festival.city}, ${schedule.shortLabel}`}
      accessibilityRole="button"
      onPress={() => router.push(`/festivals/${festival.id}` as Href)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={compact ? styles.compactCard : undefined}>
        <FestivalArtwork
          compact={compact}
          label={festival.name}
          month={month.slice(0, 3).toUpperCase()}
          tone={festival.heroTone}
        />
        <View style={[styles.body, compact && styles.compactBody]}>
          <View style={styles.location}>
            <MapPin color={colors.blue} size={15} />
            <Text numberOfLines={1} style={styles.eyebrow}>
              {festival.city} · {festival.region}
            </Text>
          </View>
          <Text style={[styles.title, compact && styles.compactTitle]}>{festival.name}</Text>
          {!compact ? <Text style={styles.summary}>{festival.summary}</Text> : null}
          <View style={styles.footer}>
            <View style={styles.dateCopy}>
              <Text style={styles.date}>{schedule.shortLabel}</Text>
              <Text style={styles.category}>{festival.category}</Text>
            </View>
            <ArrowRight color={colors.coral} size={20} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78 },
  compactCard: { flexDirection: 'row' },
  body: { padding: spacing.lg, gap: spacing.sm },
  compactBody: { flex: 1, justifyContent: 'center' },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: {
    flex: 1,
    color: colors.blue,
    fontFamily: type.black,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 21 },
  compactTitle: { fontSize: 17 },
  summary: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateCopy: { flex: 1 },
  date: { color: colors.navy, fontFamily: type.bold, fontSize: 12 },
  category: { color: colors.muted, fontFamily: type.medium, fontSize: 11 },
});
