import type { DestinationSummary, IslandGroup } from '@saraya/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, LoadingState, Mascot, SearchField, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

import { DestinationCard } from '../components/DestinationCard';
import { PhilippinesHeroMap } from '../components/PhilippinesHeroMap';
import { destinationGateway } from '../gateways';

export const islandGroups: IslandGroup[] = ['Luzon', 'Visayas', 'Mindanao'];
export const discoverTipCompletedKey = 'saraya:discover:island-tip-completed';

export function groupDestinations(destinations: DestinationSummary[]) {
  return Object.fromEntries(
    islandGroups.map((group) => [
      group,
      destinations
        .filter((destination) => destination.islandGroup === group)
        .sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name)),
    ]),
  ) as Record<IslandGroup, DestinationSummary[]>;
}

export function scrollToMeasuredSection(
  scrollView: Pick<ScrollView, 'scrollTo'> | null,
  y: number,
  reducedMotion: boolean,
) {
  scrollView?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: !reducedMotion });
}

export function getCarouselCardWidth(viewportWidth: number) {
  return Math.min(440, Math.round(viewportWidth * 0.8));
}

export function DiscoverScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const [sectionY, setSectionY] = useState<Partial<Record<IslandGroup, number>>>({});
  const [reducedMotion, setReducedMotion] = useState(false);
  const [search, setSearch] = useState('');
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIslandTip, setShowIslandTip] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDestinations(await destinationGateway.list({ search }));
    } catch {
      setError(
        'Destinations could not be loaded. Check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 180);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(discoverTipCompletedKey)
      .then((completed) => {
        if (active) setShowIslandTip(completed !== 'true');
      })
      .catch(() => {
        if (active) setShowIslandTip(true);
      });
    return () => { active = false; };
  }, []);

  const grouped = groupDestinations(destinations);
  const carouselCardWidth = getCarouselCardWidth(viewportWidth);
  const carouselSnapInterval = carouselCardWidth + spacing.md;
  const enabled = Object.fromEntries(
    islandGroups.map((group) => [group, sectionY[group] !== undefined]),
  ) as Record<IslandGroup, boolean>;

  const saveSectionPosition = (region: IslandGroup) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setSectionY((current) => (current[region] === y ? current : { ...current, [region]: y }));
  };

  const scrollToRegion = (region: IslandGroup) => {
    const y = sectionY[region];
    if (y === undefined) return;
    scrollToMeasuredSection(scrollViewRef.current, y, reducedMotion);
    setShowIslandTip(false);
    void AsyncStorage.setItem(discoverTipCompletedKey, 'true').catch(() => undefined);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandCopy}>
            <Text style={styles.brand}>Saraya</Text>
            <Text accessibilityRole="header" style={styles.greeting}>
              Mabuhay, traveler!
            </Text>
            <Text style={styles.subtitle}>Find your next Philippine story.</Text>
          </View>
          <Mascot mood="wave" size={88} />
        </View>

        <PhilippinesHeroMap enabled={enabled} onSelect={scrollToRegion} />

        <SearchField
          onChangeText={setSearch}
          placeholder="Search places, food, culture…"
          value={search}
        />

        {loading ? <LoadingState label="Finding destinations…" /> : null}
        {error ? (
          <StatusPanel
            action={<Button label="Try again" onPress={() => void load()} variant="secondary" />}
            message={error}
            title="Destinations could not load"
            tone="error"
          />
        ) : null}

        {islandGroups.map((region) => (
          <View
            key={region}
            onLayout={saveSectionPosition(region)}
            style={styles.section}
            testID={`destination-section-${region.toLowerCase()}`}
          >
            <View style={styles.sectionHeading}>
              <View
                style={[styles.regionBar, styles[region.toLowerCase() as Lowercase<IslandGroup>]]}
              />
              <View style={styles.sectionCopy}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{region} Destinations</Text>
                <Text style={styles.sectionSubtitle}>Highest rated first</Text>
              </View>
            </View>

            {!loading && !error && grouped[region].length === 0 ? (
              <StatusPanel
                message={
                  search
                    ? `No ${region} destinations match “${search}”.`
                    : `No ${region} destinations are available right now.`
                }
                title={`No ${region} results`}
                tone="warning"
              />
            ) : null}

            {!loading && !error && grouped[region].length > 0 ? (
              <ScrollView
                accessibilityLabel={`${region} destinations`}
                contentContainerStyle={styles.carouselContent}
                decelerationRate="fast"
                directionalLockEnabled
                disableIntervalMomentum
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={carouselSnapInterval}
              >
                {grouped[region].map((destination) => (
                  <DestinationCard
                    destination={destination}
                    key={destination.id}
                    style={{ width: carouselCardWidth }}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        ))}
      </ScrollView>
      {showIslandTip ? (
        <View style={styles.tipFloat} testID="discover-tip-float">
          <Text style={styles.tipText}>
            Tap a labeled island group to jump to its destinations.
          </Text>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.tipMascot}
          >
            <Mascot mood="star" size={72} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 120, gap: spacing.lg },
  brandRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandCopy: { flex: 1, gap: 2 },
  brand: { color: colors.blue, fontFamily: type.black, fontSize: 28 },
  greeting: { color: colors.navy, fontFamily: type.black, fontSize: 20 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 14 },
  tipFloat: {
    minHeight: 80,
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  tipText: {
    flexShrink: 1,
    maxWidth: 340,
    color: colors.navy,
    fontFamily: type.bold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  tipMascot: { flexShrink: 0, marginLeft: spacing.xs },
  section: { gap: spacing.md, paddingTop: spacing.lg },
  sectionHeading: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  regionBar: { width: 6, borderRadius: 3 },
  luzon: { backgroundColor: '#00AEEF' },
  visayas: { backgroundColor: '#FDB813' },
  mindanao: { backgroundColor: '#FF5A5F' },
  sectionCopy: { gap: 2 },
  sectionTitle: { color: colors.navy, fontFamily: type.black, fontSize: 22 },
  sectionSubtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 12 },
  carouselContent: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.xl },
});
