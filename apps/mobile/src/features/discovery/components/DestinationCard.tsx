import type { DestinationSummary } from '@saraya/contracts';
import { useRouter } from 'expo-router';
import { ArrowRight, MapPin, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, DestinationArtwork } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

type DestinationCardProps = {
  destination: DestinationSummary;
  variant?: 'full' | 'carousel';
  style?: StyleProp<ViewStyle>;
};

export function DestinationCard({
  destination,
  variant = 'full',
  style,
}: DestinationCardProps) {
  const router = useRouter();
  const carousel = variant === 'carousel';

  return (
    <Pressable
      accessibilityHint="Opens destination details"
      accessibilityLabel={`${destination.name}, ${destination.province}, rated ${destination.rating}`}
      accessibilityRole="button"
      onPress={() => router.push(`/destinations/${destination.id}`)}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      <Card style={carousel ? styles.carouselCard : undefined}>
        <DestinationArtwork
          compact={carousel}
          label={destination.name}
          tone={destination.heroTone}
        />
        <View style={[styles.body, carousel && styles.carouselBody]}>
          <View style={styles.topline}>
            {!carousel ? (
              <View style={styles.location}>
                <MapPin accessible={false} color={colors.blue} size={16} />
                <Text style={styles.eyebrow}>{destination.islandGroup.toUpperCase()}</Text>
              </View>
            ) : (
              <Text numberOfLines={1} style={styles.carouselProvince}>
                {destination.province}
              </Text>
            )}
            <View style={styles.location}>
              <Star accessible={false} color={colors.yellow} fill={colors.yellow} size={16} />
              <Text style={styles.rating}>{destination.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text
            numberOfLines={carousel ? 1 : undefined}
            style={[styles.title, carousel && styles.carouselTitle]}
          >
            {destination.name}
          </Text>
          <Text
            numberOfLines={carousel ? 2 : undefined}
            style={[styles.summary, carousel && styles.carouselSummary]}
          >
            {destination.summary}
          </Text>
          <View style={styles.footer}>
            <Text numberOfLines={1} style={styles.region}>
              {carousel ? destination.category : `${destination.province} · ${destination.category}`}
            </Text>
            <ArrowRight accessible={false} color={colors.coral} size={20} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78 },
  carouselCard: {
    minHeight: 144,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: { padding: spacing.lg, gap: spacing.sm },
  carouselBody: { flex: 1, minWidth: 0, padding: 0, gap: spacing.xs },
  topline: { flexDirection: 'row', justifyContent: 'space-between' },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 11, letterSpacing: 0.6 },
  rating: { color: colors.navy, fontFamily: type.bold, fontSize: 13 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 22 },
  carouselTitle: { fontSize: 18 },
  carouselProvince: { flex: 1, color: colors.blue, fontFamily: type.bold, fontSize: 11 },
  summary: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  carouselSummary: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  region: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
});
