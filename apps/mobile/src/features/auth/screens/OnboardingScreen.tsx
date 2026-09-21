import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Chip, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';

import { useAuth } from '../AuthProvider';
import { AuthShell } from '../components';

const travelStyles = ['Culture', 'Nature', 'Food', 'Adventure'];
const budgets = ['Budget-friendly', 'Balanced', 'Comfort'];
const regions = ['Luzon', 'Visayas', 'Mindanao'];

export function OnboardingScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [travelStyle, setTravelStyle] = useState<string>();
  const [budget, setBudget] = useState<string>();
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const toggleRegion = (region: string) => {
    setPreferredRegions((current) => current.includes(region)
      ? current.filter((item) => item !== region)
      : [...current, region]);
  };

  const finish = async () => {
    if (!travelStyle || !budget || preferredRegions.length === 0) {
      setError('Choose a travel style, budget, and at least one island group.');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      await updateProfile({
        travelStyle,
        budget,
        interests: [travelStyle],
        preferredRegions,
        onboardingComplete: true,
      });
      router.replace('/(tabs)/discover');
    } catch {
      setError('Preferences could not be saved. Check the Saraya API and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AuthShell onBack={() => router.replace('/(auth)/login' as Href)}>
        <StatusPanel message="Sign in before setting your travel preferences." title="Account required" tone="warning" />
        <Button label="Go to login" onPress={() => router.replace('/(auth)/login' as Href)} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Welcome, {user.displayName}</Text>
        <Text style={styles.subtitle}>Tell Saraya what kind of Philippine stories you want to find.</Text>
      </View>
      {error ? <StatusPanel message={error} title="Preferences need attention" tone="error" /> : null}
      <ChoiceGroup label="Travel style" onPress={setTravelStyle} options={travelStyles} selected={[travelStyle]} />
      <ChoiceGroup label="Trip budget" onPress={setBudget} options={budgets} selected={[budget]} />
      <ChoiceGroup label="Island groups" onPress={toggleRegion} options={regions} selected={preferredRegions} />
      <Button label="Start discovering" loading={loading} onPress={() => void finish()} />
      <Text style={styles.note}>Location permission is not requested here. Saraya asks only when you open weather or safety features.</Text>
    </AuthShell>
  );
}

function ChoiceGroup({
  label,
  options,
  selected,
  onPress,
}: {
  label: string;
  options: string[];
  selected: (string | undefined)[];
  onPress: (value: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => <Chip key={option} label={option} onPress={() => onPress(option)} selected={selected.includes(option)} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', gap: spacing.sm },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28, textAlign: 'center' },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  group: { gap: spacing.md },
  groupLabel: { color: colors.navy, fontFamily: type.black, fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { color: colors.muted, fontFamily: type.medium, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
