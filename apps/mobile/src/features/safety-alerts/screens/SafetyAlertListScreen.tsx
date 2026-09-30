import type { ResolvedLocation, SafetyAlert, SafetyAlertQuery, SafetyAlertSubscriptionInput, WeatherResponse } from '@saraya/contracts';
import { useRouter } from 'expo-router';
import { MapPin, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  requestForegroundLocation,
  type ForegroundLocationProvider,
} from '@/core/location';
import { Button, Chip, LoadingState, Mascot, Screen, SectionTitle, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { SafetyAlertCard } from '../components/SafetyAlertCard';
import { safetyDestinations, safetyRegions } from '../data/demoSafety';
import { useAuth } from '@/features/auth/AuthProvider';
import { notificationGateway, type NotificationGateway } from '@/features/notifications/gateway';
import { safetyAlertGateway, safetySubscriptionGateway, type SafetyAlertGateway, type SafetySubscriptionGateway } from '../gateways';

type LoadState = 'choosing' | 'loading' | 'ready' | 'error';

export function SafetyAlertListScreen({
  gateway = safetyAlertGateway,
  locationProvider,
  subscriptions = safetySubscriptionGateway,
  notifications = notificationGateway,
}: {
  gateway?: SafetyAlertGateway;
  locationProvider?: ForegroundLocationProvider;
  subscriptions?: SafetySubscriptionGateway;
  notifications?: NotificationGateway;
}) {
  const router = useRouter();
  const { user, isDevelopmentPreview } = useAuth();
  const [state, setState] = useState<LoadState>('choosing');
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [weather, setWeather] = useState<WeatherResponse>();
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [contextLabel, setContextLabel] = useState<string>();
  const [locationMessage, setLocationMessage] = useState<string>();
  const [lastQuery, setLastQuery] = useState<SafetyAlertQuery>();
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation>();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string>();
  const [notificationSettingsNeeded, setNotificationSettingsNeeded] = useState(false);
  const [locationExplanationOpen, setLocationExplanationOpen] = useState(false);

  const subscriptionInput = useMemo<SafetyAlertSubscriptionInput | undefined>(() => {
    if (!resolvedLocation) return undefined;
    return resolvedLocation.kind === 'destination' && resolvedLocation.destinationId
      ? { scope: 'destination', key: resolvedLocation.destinationId }
      : { scope: 'region', key: resolvedLocation.region };
  }, [resolvedLocation]);

  useEffect(() => {
    let active = true;
    if (!subscriptionInput || !user || isDevelopmentPreview) return () => { active = false; };
    void subscriptions.get(subscriptionInput).then(
      (value) => { if (active) setSubscribed(value.subscribed); },
      () => { if (active) setSubscriptionMessage('Saraya could not check your alert setting. You can still view safety information.'); },
    );
    return () => { active = false; };
  }, [isDevelopmentPreview, subscriptionInput, subscriptions, user]);

  const load = useCallback(async (query: SafetyAlertQuery) => {
    setState('loading');
    setLastQuery(query);
    setLocationMessage(undefined);
    setWeatherUnavailable(false);
    try {
      const alertResult = await gateway.list(query);
      setAlerts(alertResult.alerts);
      setSubscribed(false);
      setResolvedLocation(alertResult.location);
      setContextLabel(alertResult.location.kind === 'coordinates'
        ? 'Showing alerts near your current location'
        : `Showing alerts for ${alertResult.location.label}`);
      try {
        setWeather(await gateway.getWeather(query));
      } catch {
        setWeather(undefined);
        setWeatherUnavailable(true);
      }
      setState('ready');
    } catch {
      setState('error');
    }
  }, [gateway]);

  const handleCurrentLocation = async () => {
    setLocationExplanationOpen(false);
    setLocationMessage(undefined);
    const result = await requestForegroundLocation(locationProvider);
    if (result.status === 'success') {
      await load(result.coordinates);
      return;
    }
    const messages = {
      denied: 'Location permission was denied. Choose a region or destination below instead.',
      unavailable: 'Location services are unavailable. Choose a region or destination below instead.',
      error: 'Saraya could not get your location. Choose a region or destination below instead.',
    } as const;
    setLocationMessage(messages[result.status]);
    setState('choosing');
  };

  const toggleSubscription = async () => {
    if (!subscriptionInput) return;
    if (!user || isDevelopmentPreview) {
      router.push('/(auth)/login');
      return;
    }
    setSubscriptionBusy(true);
    setSubscriptionMessage(undefined);
    setNotificationSettingsNeeded(false);
    try {
      if (subscribed) {
        await subscriptions.unsubscribe(subscriptionInput);
        setSubscribed(false);
        setSubscriptionMessage('Safety notifications for this place are turned off.');
      } else {
        const preferences = await notifications.enable({ safetyAlertsEnabled: true });
        if (!preferences.safetyAlertsEnabled) {
          setSubscriptionMessage('Notifications are off. Open device settings and allow notifications before following this place.');
          setNotificationSettingsNeeded(true);
          return;
        }
        await subscriptions.subscribe(subscriptionInput);
        setSubscribed(true);
        setSubscriptionMessage(`You’ll receive important safety updates for ${resolvedLocation?.kind === 'coordinates' ? resolvedLocation.region : resolvedLocation?.label}.`);
      }
    } catch {
      setSubscriptionMessage('Your safety notification choice could not be saved. Check your connection and try again.');
    } finally { setSubscriptionBusy(false); }
  };

  return (
    <Screen backAction={{ accessibilityLabel: 'Back from safety alerts', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)/events') }}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>TRAVEL WITH CONTEXT</Text>
          <Text accessibilityRole="header" style={styles.title}>Safety alerts</Text>
          <Text style={styles.subtitle}>Choose the place you want to check. GPS is never requested automatically.</Text>
        </View>
        <Mascot mood="wave" size={88} />
      </View>

      <Button icon={MapPin} label="Use my current location" onPress={() => setLocationExplanationOpen(true)} />
      {locationMessage ? <StatusPanel title="Manual selection is available" message={locationMessage} tone="warning" /> : null}

      <View style={styles.selector}>
        <Text style={styles.label}>CHOOSE A REGION</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {safetyRegions.map((region) => <Chip key={region} label={region} onPress={() => void load({ region })} />)}
        </ScrollView>
      </View>

      <View style={styles.selector}>
        <Text style={styles.label}>OR CHOOSE A DESTINATION</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {safetyDestinations.map((destination) => (
            <Chip key={destination.id} label={destination.name} onPress={() => void load({ destinationId: destination.id })} />
          ))}
        </ScrollView>
      </View>

      {state === 'choosing' ? (
        <StatusPanel
          title="No location selected"
          message="Use your location once, or choose a region or destination. Saraya does not store a location history."
        />
      ) : null}
      {state === 'loading' ? <LoadingState label="Checking safety information…" /> : null}
      {state === 'error' ? (
        <StatusPanel
          title="Safety information unavailable"
          message="Safety updates could not be loaded. Check your internet connection and official local guidance before traveling."
          tone="error"
          action={lastQuery ? <Button icon={RefreshCw} label="Try again" onPress={() => void load(lastQuery)} variant="secondary" /> : undefined}
        />
      ) : null}

      {state === 'ready' && contextLabel ? <StatusPanel title="Current safety context" message={contextLabel} tone="success" /> : null}
      {state === 'ready' && subscriptionInput ? (
        <View style={styles.followCard}>
          <View style={styles.followCopy}>
            <Text style={styles.followTitle}>{subscribed ? 'Following this place' : 'Get safety updates for this place'}</Text>
            <Text style={styles.followText}>Saraya will notify you only about important safety information for this destination or region.</Text>
          </View>
          <Button label={subscribed ? 'Turn off alerts' : 'Follow this place'} loading={subscriptionBusy} onPress={() => void toggleSubscription()} variant={subscribed ? 'secondary' : 'primary'} />
        </View>
      ) : null}
      {subscriptionMessage ? (
        <StatusPanel
          title="Safety notifications"
          message={subscriptionMessage}
          tone={subscribed ? 'success' : 'warning'}
          action={notificationSettingsNeeded ? <Button label="Open device settings" onPress={() => void Linking.openSettings()} variant="secondary" /> : undefined}
        />
      ) : null}
      {state === 'ready' && weather ? <WeatherPanel weather={weather} /> : null}
      {state === 'ready' && weatherUnavailable ? (
        <StatusPanel
          title="Weather unavailable"
          message="Weather details could not be loaded. Try again and check an official forecast before traveling."
          tone="warning"
        />
      ) : null}
      {state === 'ready' ? <SectionTitle title="Active alerts" /> : null}
      {state === 'ready' && alerts.length === 0 ? (
        <StatusPanel
          title="No active alerts found"
          message="This does not guarantee safe conditions. Check current official guidance before travel."
        />
      ) : null}
      {state === 'ready' ? alerts.map((alert) => <SafetyAlertCard alert={alert} key={alert.id} />) : null}

      <Modal animationType="fade" onRequestClose={() => setLocationExplanationOpen(false)} transparent visible={locationExplanationOpen}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.permissionCard}>
            <View accessibilityElementsHidden style={styles.permissionIcon}><MapPin color={colors.blue} size={28} /></View>
            <Text accessibilityRole="header" style={styles.permissionTitle}>Use your location once?</Text>
            <Text style={styles.permissionText}>Saraya uses your current location to find your region and show nearby weather and safety information. Your coordinates are not saved, and Saraya does not track you in the background.</Text>
            <Button label="Continue with location" onPress={() => void handleCurrentLocation()} />
            <Button label="Choose a place instead" onPress={() => setLocationExplanationOpen(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function WeatherPanel({ weather }: { weather: WeatherResponse }) {
  const unavailable = weather.providerStatus === 'unavailable';
  return (
    <View style={styles.weather} accessibilityLabel="Weather context">
      <View style={styles.weatherHeading}>
        <ShieldCheck color={colors.navy} size={22} />
        <Text style={styles.weatherTitle}>Weather context</Text>
      </View>
      <Text style={styles.weatherCondition}>{weather.condition ?? 'Weather unavailable'}</Text>
      {!unavailable && weather.temperatureCelsius !== null ? (
        <Text style={styles.weatherMetrics}>
          {weather.temperatureCelsius}°C · {weather.precipitationMillimeters ?? '—'} mm precipitation
        </Text>
      ) : null}
      <Text style={styles.weatherSummary}>{weather.summary}</Text>
      <Text style={styles.weatherSource}>
        Information from {weather.source.name}{weather.providerStatus === 'stale' ? ' · last available update' : ''}
      </Text>
      {weather.source.isDemo ? <Text style={styles.demo}>SAMPLE WEATHER — CHECK A LIVE FORECAST BEFORE TRAVEL</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 112, flexDirection: 'row', alignItems: 'center' },
  heroCopy: { flex: 1, gap: spacing.xs },
  kicker: { color: colors.danger, fontFamily: type.black, fontSize: 10, letterSpacing: 1.1 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 30 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 20 },
  selector: { gap: spacing.sm },
  label: { color: colors.muted, fontFamily: type.black, fontSize: 10, letterSpacing: 0.9 },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  weather: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.blueSoft },
  weatherHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weatherTitle: { color: colors.navy, fontFamily: type.black, fontSize: 16 },
  weatherCondition: { color: colors.navy, fontFamily: type.black, fontSize: 20 },
  weatherMetrics: { color: colors.blue, fontFamily: type.bold, fontSize: 14 },
  weatherSummary: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  weatherSource: { color: colors.muted, fontFamily: type.bold, fontSize: 11 },
  demo: { color: colors.danger, fontFamily: type.black, fontSize: 10, lineHeight: 15 },
  followCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  followCopy: { gap: spacing.xs },
  followTitle: { color: colors.navy, fontFamily: type.black, fontSize: 16 },
  followText: { color: colors.muted, fontFamily: type.medium, fontSize: 13, lineHeight: 19 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(10, 42, 56, 0.48)' },
  permissionCard: { gap: spacing.md, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.surface },
  permissionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  permissionTitle: { color: colors.navy, fontFamily: type.black, fontSize: 23 },
  permissionText: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
});
