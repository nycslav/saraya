import type {
  BucketListItem,
  BucketListPriority,
  BucketListStatus,
  DestinationDetail,
  DestinationSummary,
} from '@saraya/contracts';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, Heart, MoreVertical, Plus, Route, Trash2, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { destinationGateway } from '@/features/discovery/gateways';
import { Button, Chip, LoadingState, Screen, SearchField, StatusPanel } from '@/ui/components';
import { colors, radius, spacing, type } from '@/ui/theme';

import { bucketListGateway } from '../gateways';

type Filter = 'all' | 'planned' | 'visited' | 'high';
type DisplayItem = { item: BucketListItem; destination: DestinationDetail };

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'planned', label: 'Planned' },
  { id: 'visited', label: 'Visited' },
  { id: 'high', label: 'High priority' },
];

export function BucketListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorItem, setEditorItem] = useState<DisplayItem | null>();
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bucketItems, destinationOptions] = await Promise.all([
        bucketListGateway.list(),
        destinationGateway.list({ search: '' }),
      ]);
      const details = await Promise.all(
        bucketItems.map(async (item) => ({
          item,
          destination: await destinationGateway.getById(item.destinationId),
        })),
      );
      setItems(details.filter(
        (entry): entry is DisplayItem => entry.destination !== null,
      ));
      setDestinations(destinationOptions);
    } catch {
      setError('Your saved places could not be loaded. Check the API connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const visibleItems = useMemo(() => items.filter(({ item }) => {
    if (filter === 'planned') return item.status === 'planned';
    if (filter === 'visited') return item.status === 'visited';
    if (filter === 'high') return item.priority === 'high';
    return true;
  }), [filter, items]);
  const plannedCount = items.filter(({ item }) => item.status === 'planned').length;

  const toggleVisited = async ({ item }: DisplayItem) => {
    setSavingId(item.id);
    try {
      await bucketListGateway.update(item.id, {
        status: item.status === 'visited' ? 'planned' : 'visited',
      });
      await load();
    } catch {
      setError('That saved place could not be updated.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>My Bucket List</Text>
          <Text style={styles.subtitle}>Small plans, big island stories.</Text>
        </View>
        <View style={styles.savedBadge}>
          <Heart color={colors.coral} size={17} />
          <Text style={styles.savedText}>{items.length} saved</Text>
        </View>
        <Pressable
          accessibilityLabel="Add destination"
          accessibilityRole="button"
          onPress={() => setEditorItem(null)}
          style={styles.addButton}
        >
          <Plus color={colors.navy} size={26} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {filters.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            onPress={() => setFilter(option.id)}
            selected={filter === option.id}
          />
        ))}
      </ScrollView>

      {loading ? <LoadingState label="Opening your saved places..." /> : null}
      {error ? (
        <StatusPanel
          action={<Button label="Try again" onPress={() => void load()} variant="secondary" />}
          message={error}
          title="We could not open your list"
          tone="error"
        />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Heart color={colors.blue} size={30} /></View>
          <Text style={styles.emptyTitle}>Start your Philippine wish list</Text>
          <Text style={styles.emptyBody}>Save destinations from Discover or add one here.</Text>
          <Button icon={Plus} label="Add a destination" onPress={() => setEditorItem(null)} />
        </View>
      ) : null}

      {!loading && !error && items.length > 0 && visibleItems.length === 0 ? (
        <StatusPanel
          message="Choose another filter to see the rest of your saved places."
          title="No matching places"
          tone="warning"
        />
      ) : null}

      {!loading && !error ? visibleItems.map((entry) => (
        <View key={entry.item.id} style={styles.itemCard}>
          <Pressable
            accessibilityLabel={
              entry.item.status === 'visited'
                ? `Mark ${entry.destination.name} as planned`
                : `Mark ${entry.destination.name} as visited`
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: entry.item.status === 'visited', busy: savingId === entry.item.id }}
            disabled={savingId === entry.item.id}
            onPress={() => void toggleVisited(entry)}
            style={[
              styles.checkButton,
              entry.item.status === 'visited' && styles.checkButtonDone,
            ]}
          >
            {entry.item.status === 'visited' ? <Check color={colors.white} size={18} /> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/destinations/[id]',
              params: { id: entry.destination.id },
            })}
            style={styles.itemCopy}
          >
            <Text style={styles.itemTitle}>{entry.destination.name}</Text>
            <Text style={styles.itemMeta}>
              {entry.destination.province} · {entry.destination.category}
            </Text>
            <View style={[
              styles.statusBadge,
              entry.item.status === 'visited' && styles.statusBadgeDone,
              entry.item.status === 'skipped' && styles.statusBadgeSkipped,
            ]}>
              <Text style={styles.statusText}>
                {entry.item.status === 'visited'
                  ? 'DONE'
                  : entry.item.status === 'skipped'
                    ? 'SKIPPED'
                    : entry.item.priority === 'high'
                      ? 'HIGH'
                      : 'PLAN'}
              </Text>
            </View>
            {entry.item.personalNotes ? (
              <Text numberOfLines={1} style={styles.note}>{entry.item.personalNotes}</Text>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityLabel={`Edit ${entry.destination.name}`}
            accessibilityRole="button"
            onPress={() => setEditorItem(entry)}
            style={styles.moreButton}
          >
            <MoreVertical color={colors.muted} size={22} />
          </Pressable>
        </View>
      )) : null}

      {!loading && !error && plannedCount >= 2 ? (
        <View style={styles.routePanel}>
          <Route color={colors.blue} size={25} />
          <View style={styles.routeCopy}>
            <Text style={styles.routeTitle}>{plannedCount} places are ready to connect</Text>
            <Text style={styles.routeText}>Your highest-priority stops appear first.</Text>
          </View>
        </View>
      ) : null}

      {editorItem !== undefined ? (
        <BucketItemEditor
          destinations={destinations}
          entry={editorItem}
          onClose={() => setEditorItem(undefined)}
          onSaved={async () => {
            setEditorItem(undefined);
            await load();
          }}
        />
      ) : null}
    </Screen>
  );
}

function BucketItemEditor({
  destinations,
  entry,
  onClose,
  onSaved,
}: {
  destinations: DestinationSummary[];
  entry: DisplayItem | null | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [destinationId, setDestinationId] = useState(entry?.item.destinationId ?? '');
  const [priority, setPriority] = useState<BucketListPriority>(entry?.item.priority ?? 'medium');
  const [status, setStatus] = useState<BucketListStatus>(entry?.item.status ?? 'planned');
  const [notes, setNotes] = useState(entry?.item.personalNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
  };
  const options = destinations
    .filter((destination) => destination.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  const save = async () => {
    if (!entry && !destinationId) {
      setError('Choose a destination first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (entry) {
        await bucketListGateway.update(entry.item.id, {
          priority,
          status,
          personalNotes: notes,
        });
      } else {
        await bucketListGateway.create({ destinationId, priority, status, personalNotes: notes });
      }
      await onSaved();
    } catch {
      setError(entry
        ? 'Your changes could not be saved.'
        : 'This destination may already be in your bucket list.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!entry) return;
    Alert.alert('Remove saved place?', `${entry.destination.name} will leave your bucket list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setSaving(true);
          void bucketListGateway.delete(entry.item.id)
            .then(onSaved)
            .catch(() => setError('This destination could not be removed.'))
            .finally(() => setSaving(false));
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible>
      <View style={styles.modalScrim}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                {entry ? 'Edit saved place' : 'Add a destination'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {entry?.destination.name ?? 'Choose your next Philippine story.'}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={close} style={styles.closeButton}>
              <X color={colors.navy} size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {!entry ? (
              <>
                <SearchField onChangeText={setSearch} placeholder="Search destinations" value={search} />
                <View style={styles.destinationOptions}>
                  {options.map((destination) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: destinationId === destination.id }}
                      key={destination.id}
                      onPress={() => setDestinationId(destination.id)}
                      style={[
                        styles.destinationOption,
                        destinationId === destination.id && styles.destinationOptionSelected,
                      ]}
                    >
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>{destination.name}</Text>
                        <Text style={styles.optionMeta}>{destination.province} · {destination.category}</Text>
                      </View>
                      <View style={[
                        styles.optionRadio,
                        destinationId === destination.id && styles.optionRadioSelected,
                      ]} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <EditorChips
              label="Priority"
              onChange={(value) => setPriority(value as BucketListPriority)}
              options={['low', 'medium', 'high']}
              value={priority}
            />
            <EditorChips
              label="Status"
              onChange={(value) => setStatus(value as BucketListStatus)}
              options={['planned', 'visited', 'skipped']}
              value={status}
            />

            <View style={styles.editorGroup}>
              <Text style={styles.editorLabel}>Personal notes</Text>
              <TextInput
                accessibilityLabel="Personal notes"
                maxLength={500}
                multiline
                onChangeText={setNotes}
                placeholder="Food to try, booking reminders, or travel ideas"
                placeholderTextColor={colors.muted}
                style={styles.notesInput}
                value={notes}
              />
              <Text style={styles.characterCount}>{notes.length}/500</Text>
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.editorError}>{error}</Text> : null}
            <Button label={entry ? 'Save changes' : 'Add to Bucket List'} loading={saving} onPress={() => void save()} />
            {entry ? (
              <Button icon={Trash2} label="Remove from list" onPress={remove} variant="secondary" />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EditorChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.editorGroup}>
      <Text style={styles.editorLabel}>{label}</Text>
      <View style={styles.editorChips}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option[0]!.toUpperCase() + option.slice(1)}
            onPress={() => onChange(option)}
            selected={option === value}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.navy, fontFamily: type.black, fontSize: 28 },
  subtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  savedBadge: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.coralSoft },
  savedText: { color: colors.navy, fontFamily: type.bold, fontSize: 12 },
  addButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral },
  filters: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.xl },
  itemCard: { minHeight: 112, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkButton: { width: 27, height: 27, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkButtonDone: { borderColor: colors.blue, backgroundColor: colors.blue },
  itemCopy: { flex: 1, minWidth: 0, gap: 2 },
  itemTitle: { color: colors.navy, fontFamily: type.black, fontSize: 17 },
  itemMeta: { color: colors.muted, fontFamily: type.bold, fontSize: 12 },
  statusBadge: { alignSelf: 'flex-start', marginTop: spacing.xs, minHeight: 25, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: colors.blueSoft },
  statusBadgeDone: { backgroundColor: colors.yellowSoft },
  statusBadgeSkipped: { backgroundColor: colors.coralSoft },
  statusText: { color: colors.blue, fontFamily: type.black, fontSize: 10 },
  note: { color: colors.muted, fontFamily: type.medium, fontSize: 12, marginTop: spacing.xs },
  moreButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { minHeight: 330, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.navy, fontFamily: type.black, fontSize: 20, textAlign: 'center' },
  emptyBody: { color: colors.muted, fontFamily: type.medium, fontSize: 14, textAlign: 'center' },
  routePanel: { borderRadius: 8, backgroundColor: colors.blueSoft, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  routeCopy: { flex: 1 },
  routeTitle: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  routeText: { color: colors.blue, fontFamily: type.bold, fontSize: 12 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  modalSheet: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.background, paddingTop: spacing.lg },
  modalHeader: { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modalTitleCopy: { flex: 1 },
  modalTitle: { color: colors.navy, fontFamily: type.black, fontSize: 22 },
  modalSubtitle: { color: colors.muted, fontFamily: type.medium, fontSize: 13 },
  closeButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  modalContent: { padding: spacing.xl, paddingBottom: 44, gap: spacing.lg },
  destinationOptions: { gap: spacing.sm },
  destinationOption: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  destinationOptionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  optionCopy: { flex: 1 },
  optionTitle: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  optionMeta: { color: colors.muted, fontFamily: type.medium, fontSize: 11 },
  optionRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  optionRadioSelected: { borderWidth: 5, borderColor: colors.blue },
  editorGroup: { gap: spacing.sm },
  editorLabel: { color: colors.navy, fontFamily: type.black, fontSize: 14 },
  editorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notesInput: { minHeight: 96, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.navy, fontFamily: type.medium, fontSize: 15, lineHeight: 21, padding: spacing.lg, textAlignVertical: 'top' },
  characterCount: { color: colors.muted, fontFamily: type.medium, fontSize: 11, textAlign: 'right' },
  editorError: { color: colors.danger, fontFamily: type.bold, fontSize: 13 },
});
