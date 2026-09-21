import type { CheckInMood, DestinationSummary } from '@saraya/contracts';
import { ApiClientError } from '@saraya/api-client';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, Image as ImageIcon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { destinationGateway } from '@/features/discovery/gateways';
import { Button, Chip, Screen, SearchField, StatusPanel } from '@/ui/components';
import { colors, spacing, type } from '@/ui/theme';
import { journeyGateway } from '../gateways';

const moods: { value: CheckInMood; label: string }[] = [
  { value: 'calm', label: 'Calm' }, { value: 'happy', label: 'Happy' },
  { value: 'brave', label: 'Brave' }, { value: 'amazed', label: 'Amazed' },
  { value: 'reflective', label: 'Reflective' },
];
const visitTags = ['Nature', 'Food', 'Heritage', 'Beach', 'Adventure', 'Culture'];

export function CreateCheckInScreen() {
  const params = useLocalSearchParams<{ destinationId?: string }>();
  const router = useRouter();
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [destinationId, setDestinationId] = useState(params.destinationId ?? '');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [journalEntry, setJournalEntry] = useState('');
  const [mood, setMood] = useState<CheckInMood | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [companions, setCompanions] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void destinationGateway.list({ search: '' }).then(setDestinations).catch(() => setError('Destinations could not be loaded.'));
  }, []);

  const options = useMemo(() => destinations.filter((destination) =>
    `${destination.name} ${destination.province}`.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 8), [destinations, search]);
  const selected = destinations.find((destination) => destination.id === destinationId);

  const choosePhoto = async (camera: boolean) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(`Allow ${camera ? 'camera' : 'photo library'} access to add a travel photo.`);
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0] ?? null);
  };

  const submit = async () => {
    if (!destinationId) { setError('Choose the destination you visited.'); return; }
    const parsedDate = date === formatLocalDate(new Date())
      ? new Date()
      : new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) { setError('Use a valid date in YYYY-MM-DD format.'); return; }
    const visitedAt = parsedDate.toISOString();
    setSaving(true);
    setError(null);
    try {
      const photoUrl = photo ? await journeyGateway.uploadPhoto(photo.uri, photo.mimeType, photo.fileName) : null;
      const result = await journeyGateway.create({
        destinationId,
        visitedAt,
        journalEntry,
        mood,
        tags,
        companions: companions.split(',').map((name) => name.trim()).filter(Boolean),
        photoUrl,
      });
      router.replace({
        pathname: '/(tabs)/journey',
        params: { unlocked: result.newlyUnlockedAchievements.map((item) => item.title).join(', ') },
      });
    } catch (caught) {
      setError(caught instanceof ApiClientError
        ? caught.message
        : 'This travel memory could not be saved. Check the API connection and try again.');
    } finally { setSaving(false); }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/journey')} style={styles.iconButton}>
          <ArrowLeft color={colors.navy} size={23} />
        </Pressable>
        <View style={styles.headerCopy}><Text style={styles.title}>Record a visit</Text><Text style={styles.subtitle}>Add a memory to your Journey.</Text></View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Destination</Text>
        {selected ? (
          <Pressable onPress={() => setDestinationId('')} style={styles.selectedDestination}>
            <View style={styles.selectedCheck}><Check color={colors.white} size={16} /></View>
            <View><Text style={styles.optionTitle}>{selected.name}</Text><Text style={styles.optionMeta}>{selected.province} · {selected.category}</Text></View>
          </Pressable>
        ) : (
          <>
            <SearchField onChangeText={setSearch} placeholder="Search destinations" value={search} />
            <View style={styles.options}>{options.map((destination) => (
              <Pressable key={destination.id} onPress={() => setDestinationId(destination.id)} style={styles.option}>
                <View style={styles.optionCopy}><Text style={styles.optionTitle}>{destination.name}</Text><Text style={styles.optionMeta}>{destination.province} · {destination.category}</Text></View>
                <View style={styles.radio} />
              </Pressable>
            ))}</View>
          </>
        )}
      </View>

      <View style={styles.group}><Text style={styles.label}>Visit date</Text><TextInput accessibilityLabel="Visit date" onChangeText={setDate} placeholder="YYYY-MM-DD" style={styles.input} value={date} /></View>

      <View style={styles.photoArea}>
        {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} /> : <ImageIcon color={colors.blue} size={34} />}
        <Text style={styles.photoTitle}>{photo ? 'Travel photo selected' : 'Add your travel photo'}</Text>
        <View style={styles.photoActions}>
          <Button icon={Camera} label="Camera" onPress={() => void choosePhoto(true)} style={styles.photoButton} variant="quiet" />
          <Button icon={ImageIcon} label="Library" onPress={() => void choosePhoto(false)} style={styles.photoButton} variant="secondary" />
        </View>
      </View>

      <View style={styles.group}><Text style={styles.label}>How did it feel?</Text><View style={styles.chips}>{moods.map((item) => <Chip key={item.value} label={item.label} onPress={() => setMood(item.value)} selected={mood === item.value} />)}</View></View>
      <View style={styles.group}><Text style={styles.label}>Journal note</Text><TextInput maxLength={2000} multiline onChangeText={setJournalEntry} placeholder="What made this visit memorable?" placeholderTextColor={colors.muted} style={[styles.input, styles.journal]} value={journalEntry} /><Text style={styles.count}>{journalEntry.length}/2000</Text></View>
      <View style={styles.group}><Text style={styles.label}>Tags</Text><View style={styles.chips}>{visitTags.map((tag) => <Chip key={tag} label={tag} onPress={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} selected={tags.includes(tag)} />)}</View></View>
      <View style={styles.group}><Text style={styles.label}>Travel companions</Text><TextInput onChangeText={setCompanions} placeholder="Names separated by commas" placeholderTextColor={colors.muted} style={styles.input} value={companions} /></View>
      {error ? <StatusPanel message={error} title="Unable to save" tone="error" /> : null}
      <Button icon={Check} label="Save to My Journey" loading={saving} onPress={() => void submit()} />
    </Screen>
  );
}

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.md }, header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 }, title: { color: colors.navy, fontFamily: type.black, fontSize: 25 }, subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  group: { gap: spacing.sm }, label: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  input: { minHeight: 52, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, color: colors.navy, fontFamily: type.medium, fontSize: 15 },
  journal: { minHeight: 116, paddingTop: spacing.lg, textAlignVertical: 'top' }, count: { textAlign: 'right', color: colors.muted, fontFamily: type.medium, fontSize: 11 },
  options: { gap: spacing.sm }, option: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 8, padding: spacing.md },
  selectedDestination: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.blue, backgroundColor: colors.blueSoft, borderRadius: 8, padding: spacing.md },
  selectedCheck: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 }, optionTitle: { color: colors.navy, fontFamily: type.black, fontSize: 15 }, optionMeta: { color: colors.muted, fontFamily: type.medium, fontSize: 12 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  photoArea: { minHeight: 190, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.blue, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, overflow: 'hidden', padding: spacing.md },
  photo: { width: '100%', height: 150, borderRadius: 6 }, photoTitle: { color: colors.navy, fontFamily: type.bold, fontSize: 14 }, photoActions: { width: '100%', flexDirection: 'row', gap: spacing.sm }, photoButton: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
