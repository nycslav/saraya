import type { FestivalSummary } from '@saraya/contracts';
import { type Href, useRouter } from 'expo-router';
import { CalendarDays, Rows3, ShieldCheck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Chip,
  LoadingState,
  Mascot,
  Screen,
  SearchField,
  SectionTitle,
  StatusPanel,
} from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { FestivalCard } from '../components/FestivalCard';
import { festivalRegions } from '../data/mockFestivals';
import { festivalGateway, type FestivalGateway } from '../gateways';

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function FestivalListScreen({ gateway = festivalGateway }: { gateway?: FestivalGateway }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<string>();
  const [month, setMonth] = useState<number>();
  const [festivals, setFestivals] = useState<FestivalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void gateway
      .list({ search, region, month })
      .then((result) => {
        if (active) setFestivals(result);
      })
      .catch(() => {
        if (active) {
          setError('Festival guides could not be loaded. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, gateway, month, region, search]);

  const beginQuery = () => {
    setLoading(true);
    setError(null);
  };

  const updateSearch = (value: string) => {
    beginQuery();
    setSearch(value);
  };

  const updateRegion = (value?: string) => {
    beginQuery();
    setRegion(value);
  };

  const updateMonth = (value?: number) => {
    beginQuery();
    setMonth(value);
  };

  const calendarGroups = useMemo(() => {
    const groups = new Map<number, FestivalSummary[]>();
    [...festivals]
      .sort(
        (left, right) =>
          left.typicalMonth - right.typicalMonth || left.name.localeCompare(right.name),
      )
      .forEach((festival) => {
        const items = groups.get(festival.typicalMonth) ?? [];
        items.push(festival);
        groups.set(festival.typicalMonth, items);
      });
    return [...groups.entries()];
  }, [festivals]);

  const clearFilters = () => {
    beginQuery();
    setSearch('');
    setRegion(undefined);
    setMonth(undefined);
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>CELEBRATE WITH CONTEXT</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Philippine festivals
          </Text>
          <Text style={styles.subtitle}>Plan around the season, then travel with respect.</Text>
        </View>
        <Mascot mood="star" size={82} />
      </View>

      <SearchField
        accessibilityLabel="Search festivals"
        onChangeText={updateSearch}
        placeholder="Search festival, place, or tradition…"
        value={search}
      />

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>REGION</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChips}
        >
          <Chip label="All regions" onPress={() => updateRegion()} selected={!region} />
          {festivalRegions.map((item) => (
            <Chip
              key={item}
              label={item}
              onPress={() => updateRegion(item)}
              selected={region === item}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>MONTH</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChips}
        >
          <Chip label="Any" onPress={() => updateMonth()} selected={!month} />
          {months.map((label, index) => (
            <Chip
              key={label}
              label={label}
              onPress={() => updateMonth(index + 1)}
              selected={month === index + 1}
            />
          ))}
        </ScrollView>
      </View>

      <StatusPanel
        message="Festival dates and programs can shift. Every guide includes a reminder to verify the official local schedule before booking."
        title="Plan, then confirm"
      />

      <Button
        icon={ShieldCheck}
        label="Check safety alerts"
        onPress={() => router.push('/alerts' as Href)}
        variant="secondary"
      />

      <SectionTitle
        action={
          <View style={styles.modeToggle}>
            {(['list', 'calendar'] as const).map((mode) => {
              const Icon = mode === 'list' ? Rows3 : CalendarDays;
              return (
                <Pressable
                  accessibilityLabel={`${mode} view`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: viewMode === mode }}
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={[styles.modeButton, viewMode === mode && styles.modeButtonActive]}
                >
                  <Icon color={viewMode === mode ? colors.navy : colors.muted} size={19} />
                </Pressable>
              );
            })}
          </View>
        }
        title={viewMode === 'list' ? 'Upcoming festivals' : 'Festival calendar'}
      />

      {loading ? <LoadingState label="Gathering festival stories…" /> : null}
      {error ? (
        <StatusPanel
          action={
            <Button
              label="Try again"
              onPress={() => {
                beginQuery();
                setAttempt((current) => current + 1);
              }}
              variant="secondary"
            />
          }
          message={error}
          title="The celebration paused"
          tone="error"
        />
      ) : null}
      {!loading && !error && festivals.length === 0 ? (
        <StatusPanel
          action={<Button label="Clear filters" onPress={clearFilters} variant="secondary" />}
          message="Try another festival name, region, or month."
          title="No festivals match"
          tone="warning"
        />
      ) : null}

      {!loading && !error && viewMode === 'list'
        ? festivals.map((festival) => <FestivalCard festival={festival} key={festival.id} />)
        : null}

      {!loading && !error && viewMode === 'calendar'
        ? calendarGroups.map(([monthNumber, items]) => (
            <View key={monthNumber} style={styles.monthGroup}>
              <View style={styles.monthHeading}>
                <Text style={styles.monthName}>{months[monthNumber - 1]}</Text>
                <Text style={styles.monthCount}>
                  {items.length} {items.length === 1 ? 'festival' : 'festivals'}
                </Text>
              </View>
              {items.map((festival) => (
                <FestivalCard compact festival={festival} key={festival.id} />
              ))}
            </View>
          ))
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  kicker: { color: colors.coral, fontFamily: type.black, fontSize: 10, letterSpacing: 1.1 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 14, lineHeight: 20 },
  filterSection: { gap: spacing.sm },
  filterLabel: { color: colors.muted, fontFamily: type.black, fontSize: 10, letterSpacing: 0.9 },
  horizontalChips: { gap: spacing.sm, paddingRight: spacing.xl },
  modeToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  modeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  modeButtonActive: { backgroundColor: colors.blueSoft },
  monthGroup: { gap: spacing.md },
  monthHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  monthName: { color: colors.navy, fontFamily: type.black, fontSize: 18 },
  monthCount: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
});
