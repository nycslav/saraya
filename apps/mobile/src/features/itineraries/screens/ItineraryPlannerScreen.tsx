import {
  tripPreferencesSchema,
  type Budget,
  type GenerationQuota,
  type GeneratedItinerary,
  type ItineraryStatus,
  type PremiumAccess,
  type TravelPace,
  type TripPreferences,
} from '@saraya/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BedDouble,
  Bus,
  Check,
  MapPinned,
  RefreshCw,
  Sparkles,
  Utensils,
  Waves,
  WifiOff,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { destinationGateway } from '@/features/discovery/gateways';
import { generationQuotaGateway, premiumGateway } from '@/features/subscriptions';
import { Button, Chip, LoadingState, Mascot, Screen, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { PreferenceGroup } from '../components/PreferenceGroup';
import { itineraryGateway, pendingItineraryStore } from '../services/adapters';

const durations = [3, 5, 7] as const;
const budgets: readonly Budget[] = ['Budget', 'Comfort', 'Premium'];
const paces: readonly TravelPace[] = ['Relaxed', 'Balanced', 'Full days'];
const interests = ['Nature', 'Local food', 'Heritage', 'Beaches', 'Adventure', 'Culture'] as const;

export function ItineraryPlannerScreen() {
  const { destinationId = 'south-cebu', resumeAfterPurchase } = useLocalSearchParams<{
    destinationId?: string;
    resumeAfterPurchase?: string;
  }>();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const resumeAttemptedRef = useRef(false);
  const [destinationName, setDestinationName] = useState<string>();
  const [pendingPreferences, setPendingPreferences] = useState<TripPreferences | null>();
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [status, setStatus] = useState<ItineraryStatus>('idle');
  const [durationDays, setDurationDays] = useState<3 | 5 | 7>(3);
  const [budget, setBudget] = useState<Budget>('Comfort');
  const [pace, setPace] = useState<TravelPace>('Balanced');
  const [startingPoint, setStartingPoint] = useState('Nearest transport hub');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Nature',
    'Local food',
    'Culture',
  ]);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('No special requirements');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess>('free');
  const [quota, setQuota] = useState<GenerationQuota>();
  const [activeDay, setActiveDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void destinationGateway
      .getById(destinationId)
      .then((destination) => {
        if (destination) setDestinationName(destination.name);
        else setDestinationError('This destination is unavailable.');
      })
      .catch(() =>
        setDestinationError(
          'The destination service is unavailable. Check the API configuration and try again.',
        ),
      );
    void pendingItineraryStore.load().then((pending) => {
      if (!pending || pending.destinationId !== destinationId) {
        setPendingPreferences(null);
        if (resumeAfterPurchase === 'true') {
          setFieldError(
            'Your saved trip choices could not be found. Please review them and try again.',
          );
        }
        return;
      }
      setStartingPoint(pending.startingPoint);
      setDurationDays(pending.durationDays === 5 ? 5 : pending.durationDays === 7 ? 7 : 3);
      setBudget(pending.budget);
      setPace(pending.pace);
      setSelectedInterests(pending.interests);
      setAccessibilityNeeds(pending.accessibilityNeeds);
      setPendingPreferences(pending);
    });
    return () => abortRef.current?.abort();
  }, [destinationId, resumeAfterPurchase]);

  const preferences = useMemo<TripPreferences>(
    () => ({
      destinationId,
      startingPoint,
      durationDays,
      budget,
      interests: selectedInterests,
      pace,
      accessibilityNeeds,
    }),
    [
      accessibilityNeeds,
      budget,
      destinationId,
      durationDays,
      pace,
      selectedInterests,
      startingPoint,
    ],
  );

  const generate = useCallback(
    async (nextPreferences: TripPreferences, access: PremiumAccess) => {
      abortRef.current?.abort();
      try {
        const availableQuota = await generationQuotaGateway.getQuota(access);
        setPremiumAccess(access);
        setQuota(availableQuota);
        if (!availableQuota.canGenerate) {
          setStatus('idle');
          router.push({ pathname: '/premium/paywall', params: { destinationId } });
          return;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        setStatus('generating');
        setFieldError(null);
        setSaved(false);
        const result = await itineraryGateway.generate(nextPreferences, controller.signal);
        const consumption = await generationQuotaGateway.consumeAfterSuccess(access);
        setItinerary(result);
        setQuota(consumption.quota);
        setActiveDay(1);
        setStatus('ready');
        await pendingItineraryStore.clear();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setStatus('cancelled');
        } else {
          setStatus('error');
        }
      }
    },
    [destinationId, router],
  );

  const beginGeneration = useCallback(
    async (nextPreferences: TripPreferences) => {
      try {
        setStatus('checking-access');
        setFieldError(null);
        await pendingItineraryStore.save(nextPreferences);
        const access = await premiumGateway.getAccess();
        await generate(nextPreferences, access);
      } catch {
        setStatus('idle');
        setFieldError(
          'Generation access could not be checked. Check your connection and try again.',
        );
      }
    },
    [generate],
  );

  useEffect(() => {
    if (
      resumeAfterPurchase !== 'true' ||
      pendingPreferences === undefined ||
      resumeAttemptedRef.current
    )
      return;
    resumeAttemptedRef.current = true;
    if (!pendingPreferences) return;

    let active = true;
    void premiumGateway
      .getAccess()
      .then((access) => {
        if (!active) return;
        void generate(pendingPreferences, access);
      })
      .catch(() => {
        if (!active) return;
        setStatus('idle');
        setFieldError('Generation access could not be checked. Please try again.');
      });

    return () => {
      active = false;
    };
  }, [generate, pendingPreferences, resumeAfterPurchase]);

  const submit = async () => {
    const parsed = tripPreferencesSchema.safeParse(preferences);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Review your trip preferences.');
      return;
    }
    await beginGeneration(parsed.data);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  };

  if (destinationError) {
    return (
      <Screen contentContainerStyle={styles.centeredScreen}>
        <StatusPanel
          message={destinationError}
          title="Destination service unavailable"
          tone="error"
        />
        <Button label="Back to Discover" onPress={() => router.replace('/(tabs)/discover')} />
      </Screen>
    );
  }

  if (!destinationName)
    return (
      <Screen>
        <LoadingState label="Preparing trip choices…" />
      </Screen>
    );

  if (status === 'checking-access') {
    return (
      <Screen>
        <LoadingState label="Checking premium access and preserving your choices…" />
      </Screen>
    );
  }

  if (status === 'generating') {
    return (
      <Screen contentContainerStyle={styles.centeredScreen}>
        <Mascot mood="star" size={150} />
        <Text accessibilityRole="header" style={styles.centerTitle}>
          Building your {destinationName} itinerary
        </Text>
        <Text style={styles.centerBody}>
          Matching stops to your {pace.toLowerCase()} pace and {budget.toLowerCase()} budget.
        </Text>
        {[
          'Preferences understood',
          'Travel times checked',
          'Food and stays matched',
          'Day-by-day plan',
        ].map((step, index) => (
          <View key={step} style={styles.progressRow}>
            <View style={[styles.progressDot, index < 2 && styles.progressDotDone]}>
              {index < 2 ? <Check color={colors.navy} size={16} /> : null}
            </View>
            <Text style={styles.progressText}>{step}</Text>
          </View>
        ))}
        <StatusPanel
          message="Cancel safely and return to the choices you saved."
          title="Your preferences stay saved"
        />
        <Button
          icon={X}
          label="Cancel generation"
          onPress={() => abortRef.current?.abort()}
          variant="secondary"
        />
      </Screen>
    );
  }

  if (status === 'error' || status === 'cancelled') {
    return (
      <Screen contentContainerStyle={styles.centeredScreen}>
        <StatusPanel
          message={
            status === 'cancelled'
              ? 'Your preferences are still available.'
              : 'The itinerary service could not finish this request. Check the API connection and try again.'
          }
          title={status === 'cancelled' ? 'Generation cancelled' : 'We hit a detour'}
          tone={status === 'cancelled' ? 'warning' : 'error'}
        />
        <Button
          icon={RefreshCw}
          label="Try generation again"
          onPress={() => void beginGeneration(preferences)}
        />
        <Button label="Edit preferences" onPress={() => setStatus('idle')} variant="secondary" />
      </Screen>
    );
  }

  if (status === 'ready' && itinerary) {
    const day = itinerary.days.find((item) => item.dayNumber === activeDay) ?? itinerary.days[0];
    const isDeterministic = itinerary.generationSource === 'deterministic';
    const SourceIcon = isDeterministic ? WifiOff : Sparkles;
    const sourceLabel = isDeterministic
      ? 'Deterministic fallback'
      : itinerary.generationSource === 'gemini'
        ? 'Gemini generated'
        : 'OpenAI generated';
    return (
      <Screen>
        <BackButton onPress={() => setStatus('idle')} />
        <View style={styles.resultHero}>
          <View
            accessible
            accessibilityLabel={`Itinerary source: ${sourceLabel}`}
            accessibilityRole="text"
            style={[styles.sourceMarker, isDeterministic && styles.sourceMarkerFallback]}
          >
            <SourceIcon color={isDeterministic ? colors.coral : colors.green} size={14} />
            <Text
              style={[styles.sourceMarkerText, isDeterministic && styles.sourceMarkerTextFallback]}
            >
              {sourceLabel}
            </Text>
          </View>
          <Text style={styles.resultEyebrow}>
            {itinerary.preferences.durationDays} DAYS · {destinationName.toUpperCase()}
          </Text>
          <Text accessibilityRole="header" style={styles.resultTitle}>
            {itinerary.title}
          </Text>
          <Text style={styles.resultSubtitle}>{itinerary.subtitle}</Text>
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
                <View style={styles.stopIcon}>
                  <Icon color={colors.navy} size={20} />
                </View>
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
        {saved ? (
          <StatusPanel
            message="Your itinerary was saved through the Saraya API."
            title="Itinerary saved"
            tone="success"
          />
        ) : null}
        {quota ? (
          <StatusPanel
            message={`${quota.includedRemaining} included · ${quota.topUpRemaining} purchased generations remain.`}
            title={
              premiumAccess === 'premium' ? 'Premium generation balance' : 'Free generation balance'
            }
            tone={quota.canGenerate ? 'success' : 'warning'}
          />
        ) : null}
        <View style={styles.actions}>
          <Button
            icon={Check}
            label="Save itinerary"
            loading={saving}
            onPress={() => {
              setSaving(true);
              void itineraryGateway
                .save(itinerary)
                .then(() => setSaved(true))
                .catch(() => setStatus('error'))
                .finally(() => setSaving(false));
            }}
            style={styles.primaryAction}
          />
          {premiumAccess === 'premium' ? (
            <Button
              icon={RefreshCw}
              label={quota?.canRegenerate ? 'Regenerate' : 'Get more generations'}
              onPress={() => void beginGeneration(preferences)}
              variant="secondary"
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton onPress={() => router.back()} />
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Trip preferences
          </Text>
          <Text style={styles.subtitle}>
            {destinationName} · choices are saved before premium gating
          </Text>
        </View>
        <Mascot mood="wave" size={86} />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Starting point</Text>
        <TextInput
          accessibilityLabel="Starting point"
          onChangeText={setStartingPoint}
          placeholder="City, airport, or transport hub"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={startingPoint}
        />
      </View>
      <PreferenceGroup
        label="Trip length"
        onChange={setDurationDays}
        options={durations}
        value={durationDays}
      />
      <PreferenceGroup label="Budget" onChange={setBudget} options={budgets} value={budget} />
      <View style={styles.formGroup}>
        <Text style={styles.label}>Interests</Text>
        <View style={styles.wrap}>
          {interests.map((interest) => (
            <Chip
              key={interest}
              label={interest}
              onPress={() => toggleInterest(interest)}
              selected={selectedInterests.includes(interest)}
            />
          ))}
        </View>
      </View>
      <PreferenceGroup label="Travel pace" onChange={setPace} options={paces} value={pace} />
      <View style={styles.formGroup}>
        <Text style={styles.label}>Accessibility</Text>
        <TextInput
          accessibilityLabel="Accessibility requirements"
          multiline
          onChangeText={setAccessibilityNeeds}
          placeholder="Mobility, dietary, sensory, or other needs"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          value={accessibilityNeeds}
        />
      </View>
      {fieldError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {fieldError}
        </Text>
      ) : null}
      <StatusPanel
        message="Free accounts include 3 lifetime generations. Lifetime Premium includes 10 generations per calendar month."
        title="Your generation balance is checked next"
        tone="warning"
      />
      <Button icon={Sparkles} label="Generate my itinerary" onPress={() => void submit()} />
    </Screen>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.back}
    >
      <ArrowLeft color={colors.navy} size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { justifyContent: 'center', minHeight: '100%', paddingBottom: spacing.xxxl },
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
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 20 },
  formGroup: { gap: spacing.sm },
  label: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.navy,
    fontFamily: type.medium,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
  },
  multiline: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.danger, fontFamily: type.bold, fontSize: 14 },
  centerTitle: { color: colors.navy, fontFamily: type.black, fontSize: 27, textAlign: 'center' },
  centerBody: {
    color: colors.muted,
    fontFamily: type.medium,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%' },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: { backgroundColor: colors.blue, borderColor: colors.blue },
  progressText: { color: colors.navy, fontFamily: type.bold, fontSize: 15 },
  resultHero: {
    backgroundColor: colors.blueSoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  sourceMarker: {
    alignSelf: 'flex-start',
    minHeight: 28,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.greenSoft,
  },
  sourceMarkerFallback: { backgroundColor: colors.coralSoft },
  sourceMarkerText: { color: colors.green, fontFamily: type.bold, fontSize: 11 },
  sourceMarkerTextFallback: { color: colors.coral },
  resultEyebrow: { color: colors.blue, fontFamily: type.black, fontSize: 11, letterSpacing: 0.6 },
  resultTitle: { color: colors.navy, fontFamily: type.black, fontSize: 22, paddingRight: 38 },
  resultSubtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  dayTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayTitle: { color: colors.navy, fontFamily: type.black, fontSize: 20 },
  stopRow: { flexDirection: 'row', minHeight: 94 },
  stopRail: { width: 52, alignItems: 'center' },
  stopIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellowSoft,
  },
  railLine: { flex: 1, width: 2, backgroundColor: colors.border },
  stopCopy: { flex: 1, paddingBottom: spacing.xl, gap: 2 },
  stopTime: { color: colors.muted, fontFamily: type.bold, fontSize: 11 },
  stopTitle: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
  stopDetail: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  actions: { gap: spacing.sm },
  primaryAction: { flex: 1 },
});
