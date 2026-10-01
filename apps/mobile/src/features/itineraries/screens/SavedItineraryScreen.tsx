import type { GeneratedItinerary } from '@saraya/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BedDouble, Bus, MapPinned, Trash2, Utensils, Waves } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { destinationGateway } from '@/features/discovery/gateways';
import { Button, Chip, LoadingState, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { itineraryGateway } from '../services/adapters';

export function SavedItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>();
  const [destinationName, setDestinationName] = useState('Destination');
  const [activeDay, setActiveDay] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void itineraryGateway
      .getById(id)
      .then(async (result) => {
        if (!active) return;
        setItinerary(result);
        const destination = await destinationGateway.getById(result.destinationId);
        if (active && destination) setDestinationName(destination.name);
      })
      .catch(() => {
        if (active) setError('This trip plan could not be opened. It may have been removed.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const remove = () => {
    if (!itinerary) return;
    Alert.alert('Remove trip plan?', `${itinerary.title} will be removed from your Bucket.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          void itineraryGateway
            .delete(itinerary.id)
            .then(() => router.replace({
              pathname: '/(tabs)/bucket-list',
              params: { view: 'plans' },
            }))
            .catch(() => setError('This trip plan could not be removed.'))
            .finally(() => setDeleting(false));
        },
      },
    ]);
  };

  if (error) {
    return (
      <Screen backAction={{ onPress: () => router.back() }}>
        <StatusPanel message={error} title="Trip plan unavailable" tone="error" />
        <Button
          label="Back to Trip plans"
          onPress={() => router.replace({
            pathname: '/(tabs)/bucket-list',
            params: { view: 'plans' },
          })}
        />
      </Screen>
    );
  }

  if (!itinerary) {
    return <Screen backAction={{ onPress: () => router.back() }}><LoadingState label="Opening your trip plan..." /></Screen>;
  }

  const day = itinerary.days.find((item) => item.dayNumber === activeDay) ?? itinerary.days[0];

  return (
    <Screen backAction={{ onPress: () => router.back() }}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          {itinerary.preferences.durationDays} DAYS · {destinationName.toUpperCase()}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>{itinerary.title}</Text>
        <Text style={styles.subtitle}>{itinerary.subtitle}</Text>
        <MapPinned color={colors.blue} size={30} />
      </View>

      <View style={styles.dayTabs}>
        {itinerary.days.map((item) => (
          <Chip
            key={item.dayNumber}
            label={`Day ${item.dayNumber}`}
            onPress={() => setActiveDay(item.dayNumber)}
            selected={activeDay === item.dayNumber}
          />
        ))}
      </View>

      <Text style={styles.dayTitle}>{day?.title}</Text>
      {day?.stops.map((stop, index) => {
        const Icon = { transport: Bus, activity: Waves, meal: Utensils, stay: BedDouble }[
          stop.kind
        ];
        return (
          <View key={stop.id} style={styles.stopRow}>
            <View style={styles.stopRail}>
              <View style={styles.stopIcon}><Icon color={colors.navy} size={20} /></View>
              {index < day.stops.length - 1 ? <View style={styles.railLine} /> : null}
            </View>
            <View style={styles.stopCopy}>
              <Text style={styles.stopTime}>{stop.time}</Text>
              <Text style={styles.stopTitle}>{stop.title}</Text>
              <Text style={styles.stopDetail}>{stop.detail}</Text>
            </View>
          </View>
        );
      })}

      <Button
        icon={Trash2}
        label="Remove from Bucket"
        loading={deleting}
        onPress={remove}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, backgroundColor: colors.blueSoft, padding: spacing.xl, gap: spacing.sm },
  eyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 12 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 25 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
  dayTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayTitle: { color: colors.navy, fontFamily: type.black, fontSize: 21 },
  stopRow: { flexDirection: 'row', gap: spacing.md },
  stopRail: { width: 42, alignItems: 'center' },
  stopIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.yellowSoft, alignItems: 'center', justifyContent: 'center' },
  railLine: { width: 2, flex: 1, minHeight: 34, backgroundColor: colors.border },
  stopCopy: { flex: 1, minWidth: 0, paddingBottom: spacing.lg },
  stopTime: { color: colors.muted, fontFamily: type.bold, fontSize: 11 },
  stopTitle: { color: colors.navy, fontFamily: type.black, fontSize: 16 },
  stopDetail: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
});
