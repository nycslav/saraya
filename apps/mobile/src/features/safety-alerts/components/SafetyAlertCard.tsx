import type { SafetyAlert, SafetySeverity } from '@saraya/contracts';
import { type Href, useRouter } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/ui/theme';

const severityCopy: Record<SafetySeverity, { label: string; meaning: string }> = {
  green: { label: 'GREEN', meaning: 'Routine guidance' },
  yellow: { label: 'YELLOW', meaning: 'Use caution' },
  red: { label: 'RED', meaning: 'High-risk disruption' },
};

const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function SafetyAlertCard({ alert }: { alert: SafetyAlert }) {
  const router = useRouter();
  const severity = severityCopy[alert.severity];
  return (
    <Pressable
      accessibilityHint="Opens safety alert details"
      accessibilityLabel={`${severity.label} alert: ${alert.title}`}
      accessibilityRole="button"
      onPress={() => router.push(`/alerts/${alert.id}` as Href)}
      style={({ pressed }) => [styles.card, styles[alert.severity], pressed && styles.pressed]}
    >
      <View style={styles.heading}>
        <View style={styles.icon}><ShieldCheck color={colors.navy} size={22} /></View>
        <View style={styles.headingCopy}>
          <Text style={styles.severity}>{severity.label} · {severity.meaning}</Text>
          <Text style={styles.title}>{alert.title}</Text>
        </View>
        <ArrowRight color={colors.muted} size={20} />
      </View>
      <Text style={styles.metadata}>
        {alert.alertType.replaceAll('_', ' ').toUpperCase()} · Updated {dateFormatter.format(new Date(alert.updatedAt))}
      </Text>
      <Text style={styles.metadata}>
        {alert.endsAt ? `Active until ${dateFormatter.format(new Date(alert.endsAt))}` : 'No published end time'}
      </Text>
      <Text style={styles.summary}>{alert.summary}</Text>
      <Text style={styles.area}>{alert.affectedAreaDescription}</Text>
      {alert.source.isDemo ? <Text style={styles.demo}>SYNTHETIC DEMO DATA — NOT A LIVE GOVERNMENT WARNING</Text> : null}
    </Pressable>
  );
}

export const safetySeverityCopy = severityCopy;

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderWidth: 2, borderRadius: radius.lg, backgroundColor: colors.surface },
  green: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  yellow: { borderColor: colors.yellow, backgroundColor: colors.yellowSoft },
  red: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.76 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headingCopy: { flex: 1, gap: 2 },
  severity: { color: colors.navy, fontFamily: type.black, fontSize: 11, letterSpacing: 0.5 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 17, lineHeight: 22 },
  metadata: { color: colors.muted, fontFamily: type.black, fontSize: 10, letterSpacing: 0.4 },
  summary: { color: colors.navy, fontFamily: type.medium, fontSize: 14, lineHeight: 21 },
  area: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
  demo: { color: colors.danger, fontFamily: type.black, fontSize: 10, lineHeight: 15, letterSpacing: 0.4 },
});
