import type { SafetyAlert } from '@saraya/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, LoadingState, Screen, SectionTitle, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { safetySeverityCopy } from '../components/SafetyAlertCard';
import { safetyAlertGateway, type SafetyAlertGateway } from '../gateways';

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

export function SafetyAlertDetailScreen({ gateway = safetyAlertGateway }: { gateway?: SafetyAlertGateway }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [alert, setAlert] = useState<SafetyAlert | null>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (id ? gateway.getById(id) : Promise.resolve(null))
      .then((result) => {
        if (active) setAlert(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, gateway, id]);

  const retry = () => {
    setAlert(undefined);
    setError(false);
    setAttempt((value) => value + 1);
  };

  if (alert === undefined && !error) return <Screen><LoadingState label="Loading safety alert…" /></Screen>;
  if (error) return (
    <Screen contentContainerStyle={styles.centered}>
      <StatusPanel title="Safety alert unavailable" message="The alert could not be loaded. Try again before making a travel decision." tone="error" />
      <Button icon={RefreshCw} label="Try again" onPress={retry} />
    </Screen>
  );
  if (!alert) return (
    <Screen contentContainerStyle={styles.centered}>
      <StatusPanel title="Alert not found" message="This safety alert is unavailable or may have expired." tone="warning" />
      <Button label="Back to safety alerts" onPress={() => router.back()} />
    </Screen>
  );

  const severity = safetySeverityCopy[alert.severity];
  return (
    <Screen>
      <Pressable accessibilityLabel="Back to safety alerts" accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color={colors.navy} size={24} />
      </Pressable>
      <View style={[styles.hero, styles[alert.severity]]}>
        <ShieldCheck color={colors.navy} size={30} />
        <Text style={styles.severity}>{severity.label} · {severity.meaning}</Text>
        <Text style={styles.alertType}>{alert.alertType.replaceAll('_', ' ').toUpperCase()}</Text>
        <Text accessibilityRole="header" style={styles.title}>{alert.title}</Text>
        <Text style={styles.summary}>{alert.summary}</Text>
      </View>
      {alert.source.isDemo ? (
        <StatusPanel title="Synthetic demonstration alert" message="This is not a live PAGASA or government warning. Verify current official information before travel." tone="warning" />
      ) : null}
      <DetailSection title="Affected area" items={[alert.affectedAreaDescription, ...alert.affectedRegions]} />
      <DetailSection title="Active period" items={[
        `Starts ${dateFormatter.format(new Date(alert.startsAt))}`,
        alert.endsAt ? `Ends ${dateFormatter.format(new Date(alert.endsAt))}` : 'No published end time',
        `Updated ${dateFormatter.format(new Date(alert.updatedAt))}`,
      ]} />
      <View style={styles.copyBlock}><SectionTitle title="What this means" /><Text style={styles.body}>{alert.details}</Text></View>
      <DetailSection title="Traveler recommendations" items={alert.advice} />
      {alert.alternatives.length ? <DetailSection title="Alternatives" items={alert.alternatives} /> : null}
      <View style={styles.source}>
        <Text style={styles.sourceLabel}>SOURCE CONTEXT</Text>
        <Text style={styles.sourceName}>{alert.source.name}</Text>
        <Text style={styles.body}>Provider: {alert.source.provider}</Text>
      </View>
    </Screen>
  );
}

function DetailSection({ title, items }: { title: string; items: string[] }) {
  return <View style={styles.copyBlock}><SectionTitle title={title} />{items.map((item) => <Text key={item} style={styles.body}>• {item}</Text>)}</View>;
}

const styles = StyleSheet.create({
  centered: { minHeight: '100%', justifyContent: 'center' },
  back: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  hero: { gap: spacing.sm, padding: spacing.xl, borderWidth: 2, borderRadius: radius.lg },
  green: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  yellow: { borderColor: colors.yellow, backgroundColor: colors.yellowSoft },
  red: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  severity: { color: colors.navy, fontFamily: type.black, fontSize: 12, letterSpacing: 0.6 },
  alertType: { color: colors.muted, fontFamily: type.black, fontSize: 10, letterSpacing: 0.7 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 27, lineHeight: 33 },
  summary: { color: colors.navy, fontFamily: type.medium, fontSize: 15, lineHeight: 22 },
  copyBlock: { gap: spacing.sm },
  body: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
  source: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.blueSoft },
  sourceLabel: { color: colors.blue, fontFamily: type.black, fontSize: 10, letterSpacing: 0.8 },
  sourceName: { color: colors.navy, fontFamily: type.black, fontSize: 15 },
});
