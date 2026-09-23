import type { SafetyAlert, SafetyAlertQuery, WeatherResponse } from '@saraya/contracts';
import { MapPin, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  requestForegroundLocation,
  type ForegroundLocationProvider,
} from '@/core/location';
import { Button, Chip, LoadingState, Mascot, Screen, SectionTitle, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { SafetyAlertCard } from '../components/SafetyAlertCard';
import { safetyDestinations, safetyRegions } from '../data/demoSafety';
import { safetyAlertGateway, type SafetyAlertGateway } from '../gateways';

type LoadState = 'choosing' | 'loading' | 'ready' | 'error';

export function SafetyAlertListScreen({
  gateway = safetyAlertGateway,
  locationProvider,
}: {
  gateway?: SafetyAlertGateway;
  locationProvider?: ForegroundLocationProvider;
}) {
  const [state, setState] = useState<LoadState>('choosing');
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [weather, setWeather] = useState<WeatherResponse>();
  const [weatherUnavailable, setWeatherUnavailable] = useState(false);
  const [contextLabel, setContextLabel] = useState<string>();
  const [locationMessage, setLocationMessage] = useState<string>();
  const [lastQuery, setLastQuery] = useState<SafetyAlertQuery>();

  const load = useCallback(async (query: SafetyAlertQuery) => {
    setState('loading');
    setLastQuery(query);
    setLocationMessage(undefined);
    setWeatherUnavailable(false);
    try {
      const alertResult = await gateway.list(query);
      setAlerts(alertResult.alerts);
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

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>TRAVEL WITH CONTEXT</Text>
          <Text accessibilityRole="header" style={styles.title}>Safety alerts</Text>
          <Text style={styles.subtitle}>Choose the place you want to check. GPS is never requested automatically.</Text>
        </View>
        <Mascot mood="wave" size={88} />
      </View>

      <Button icon={MapPin} label="Use my current location" onPress={() => void handleCurrentLocation()} />
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
          message="Saraya could not load alerts. No assumption has been made that conditions are safe."
          tone="error"
          action={lastQuery ? <Button icon={RefreshCw} label="Try again" onPress={() => void load(lastQuery)} variant="secondary" /> : undefined}
        />
      ) : null}

      {state === 'ready' && contextLabel ? <StatusPanel title="Current safety context" message={contextLabel} tone="success" /> : null}
      {state === 'ready' && weather ? <WeatherPanel weather={weather} /> : null}
      {state === 'ready' && weatherUnavailable ? (
        <StatusPanel
          title="Weather unavailable"
          message="Saraya could not load weather context and has not assumed that conditions are safe. Try the lookup again before travel."
          tone="warning"
        />
      ) : null}
      {state === 'ready' ? <SectionTitle title="Active alerts" /> : null}
      {state === 'ready' && alerts.length === 0 ? (
        <StatusPanel
          title="No active alerts in this dataset"
          message="This does not guarantee safe conditions. Check current official guidance before travel."
        />
      ) : null}
      {state === 'ready' ? alerts.map((alert) => <SafetyAlertCard alert={alert} key={alert.id} />) : null}
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
        Source: {weather.source.name}{weather.providerStatus === 'stale' ? ' · cached' : ''}
      </Text>
      {weather.source.isDemo ? <Text style={styles.demo}>DEMO WEATHER — VERIFY REAL CONDITIONS BEFORE TRAVEL</Text> : null}
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
});
