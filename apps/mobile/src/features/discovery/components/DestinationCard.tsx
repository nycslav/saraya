import type { DestinationSummary } from '@saraya/contracts';
import { useRouter } from 'expo-router';
import { ArrowRight, MapPin, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, DestinationArtwork } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

export function DestinationCard({ destination }: { destination: DestinationSummary }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityHint="Opens destination details"
      accessibilityLabel={`${destination.name}, ${destination.province}, rated ${destination.rating}`}
      accessibilityRole="button"
      onPress={() => router.push(`/destinations/${destination.id}`)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card>
        <DestinationArtwork
          imageUrl={destination.thumbnailImageUrl}
          label={destination.name}
          tone={destination.heroTone}
        />
        <View style={styles.body}>
          <View style={styles.topline}>
            <View style={styles.location}>
              <MapPin color={colors.blue} size={16} />
              <Text style={styles.eyebrow}>{destination.islandGroup.toUpperCase()}</Text>
            </View>
            <View style={styles.location}>
              <Star color={colors.yellow} fill={colors.yellow} size={16} />
              <Text style={styles.rating}>{destination.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.title}>{destination.name}</Text>
          <Text style={styles.summary}>{destination.summary}</Text>
          <View style={styles.footer}>
            <Text style={styles.region}>{destination.province} · {destination.category}</Text>
            <ArrowRight color={colors.coral} size={20} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78 },
  body: { padding: spacing.lg, gap: spacing.sm },
  topline: { flexDirection: 'row', justifyContent: 'space-between' },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 11, letterSpacing: 0.6 },
  rating: { color: colors.navy, fontFamily: type.bold, fontSize: 13 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 22 },
  summary: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  region: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
});
