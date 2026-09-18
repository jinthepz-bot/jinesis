import { useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount } from '../coach/format';
import { addBuyItem, deleteBuyItem, toggleBought, useCoach } from '../coach/store';
import { useTodayKey } from '../coach/useTodayKey';
import { useType } from '../design/fonts';
import { colors, radius, spacing } from '../design/theme';
import { Button, Card, fieldStyles, ScreenTitle, Section } from '../design/ui';
import { BuyListCard } from '../goals/BuyListCard';
import { ChecklistCard } from '../notes/ChecklistCard';
import { NoteForm } from '../notes/NoteForm';
import { QuickNoteCard } from '../notes/QuickNoteCard';
import { RecipeCard } from '../notes/RecipeCard';
import {
  addQuickNote,
  RECIPE_CATEGORIES,
  searchNotes,
  useNotes,
  type Note,
  type NoteType,
  type RecipeCategory,
} from '../notes/store';

type Filter = 'all' | NoteType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'quick', label: 'Quick' },
  { value: 'recipe', label: 'Recipes' },
  { value: 'checklist', label: 'Lists' },
];

const CATEGORY_FILTERS: { value: RecipeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
  ...RECIPE_CATEGORIES.map((category) => ({ value: category, label: category })),
];

// Holds its own draft state so typing doesn't re-render the note list. Always
// creates a quick note — the "+ New note" flow below is where you pick a type.
function Composer() {
  const type = useType();
  const [text, setText] = useState('');
  const canSave = text.trim() !== '';

  const save = () => {
    if (addQuickNote(text)) {
      setText('');
      Keyboard.dismiss();
    }
  };

  return (
    <Card style={styles.composer}>
      <TextInput
        style={[fieldStyles.input, type.body, styles.textArea]}
        value={text}
        onChangeText={setText}
        placeholder="What are you thinking about or curious about right now?"
        placeholderTextColor={colors.textMuted}
        keyboardAppearance="dark"
        multiline
        textAlignVertical="top"
        accessibilityLabel="Quick note"
      />
      <View style={styles.composerFooter}>
        <Text style={[type.mono, styles.hint]}>Saved with today's date and time</Text>
        <Button label="Save" onPress={save} disabled={!canSave} accessibilityLabel="Save quick note" />
      </View>
    </Card>
  );
}

function FilterBar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  query: string;
  onQueryChange: (q: string) => void;
  category: RecipeCategory | 'all';
  onCategoryChange: (category: RecipeCategory | 'all') => void;
}) {
  const type = useType();
  return (
    <View style={styles.filterWrap}>
      <View style={styles.segment} accessibilityRole="radiogroup">
        {FILTERS.map((option) => {
          const selected = option.value === filter;
          return (
            <Pressable
              key={option.value}
              style={[styles.segmentOption, selected && styles.segmentSelected]}
              onPress={() => onFilterChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              accessibilityLabel={`Show ${option.label.toLowerCase()}`}
            >
              <Text style={[type.label, styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={[fieldStyles.input, fieldStyles.single, type.body]}
        value={query}
        onChangeText={onQueryChange}
        placeholder="Search notes"
        placeholderTextColor={colors.textMuted}
        keyboardAppearance="dark"
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel="Search notes"
      />
      <View style={styles.categoryRow} accessibilityRole="radiogroup">
        {CATEGORY_FILTERS.map((option) => {
          const selected = option.value === category;
          return (
            <Pressable
              key={option.value}
              style={[styles.categoryOption, selected && styles.categorySelected]}
              onPress={() => onCategoryChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Filter by ${option.label}`}
            >
              <Text style={[type.label, selected && styles.categoryTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NoteRow({ note, todayKey }: { note: Note; todayKey: string }) {
  if (note.type === 'quick') return <QuickNoteCard note={note} todayKey={todayKey} />;
  if (note.type === 'checklist') return <ChecklistCard note={note} />;
  return <RecipeCard note={note} />;
}

export function JournalScreen() {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state: notesState, loaded } = useNotes();
  const { state: coachState } = useCoach();
  const todayKey = useTodayKey();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RecipeCategory | 'all'>('all');
  const [creating, setCreating] = useState(false);

  if (!loaded) return <View style={styles.root} />;

  const count = notesState.notes.length;
  const byType = filter === 'all' ? notesState.notes : notesState.notes.filter((n) => n.type === filter);
  const byCategory = category === 'all' ? byType : byType.filter((n) => n.type === 'recipe' && n.category === category);
  const visible = searchNotes(byCategory, query);
  const recipeGrid = filter === 'recipe' || category !== 'all';
  const columns = width >= 1050 ? 4 : width >= 700 ? 3 : 2;
  const filtering = filter !== 'all' || category !== 'all' || query.trim() !== '';

  const toBuyLeft = coachState.toBuy.filter((b) => !b.bought);
  const toBuyTotal = toBuyLeft.reduce((sum, b) => sum + (b.price ?? 0), 0);
  const buyAside = `${toBuyLeft.length} left${toBuyTotal > 0 ? ` · ${formatAmount(toBuyTotal)}` : ''}`;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          data={visible}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NoteRow note={item} todayKey={todayKey} />}
          numColumns={recipeGrid ? columns : 1}
          columnWrapperStyle={recipeGrid ? styles.recipeRow : undefined}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenTitle label={`${count} ${count === 1 ? 'note' : 'notes'}`} title="JOURNAL" />
              <Composer />
              <Section label="Shopping list" aside={buyAside}>
                <BuyListCard items={coachState.toBuy} onAdd={addBuyItem} onToggle={toggleBought} onDelete={deleteBuyItem} />
              </Section>
              <FilterBar
                filter={filter}
                onFilterChange={(next) => {
                  setFilter(next);
                  if (next !== 'recipe') setCategory('all');
                }}
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={(next) => {
                  setCategory(next);
                  if (next !== 'all') setFilter('recipe');
                }}
              />
              <Pressable
                onPress={() => setCreating(true)}
                style={({ pressed }) => [styles.newNote, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="New note"
              >
                <Text style={[type.label, styles.newNoteText]}>+ New note (recipe or checklist)</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <Text style={[type.body, styles.empty]}>
              {filtering ? 'No notes match.' : 'Nothing here yet. Write down whatever is on your mind.'}
            </Text>
          }
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </KeyboardAvoidingView>

      <NoteForm visible={creating} onCancel={() => setCreating(false)} onSaved={() => setCreating(false)} />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { gap: spacing.lg, marginBottom: spacing.sm },
  composer: { gap: 10 },
  textArea: { minHeight: 120, paddingTop: 10, paddingBottom: 10 },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  hint: { flex: 1, fontSize: 11 },
  filterWrap: { gap: spacing.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryOption: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border },
  categorySelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryTextSelected: { color: colors.onAccent },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: 3,
  },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.control - 2 },
  segmentSelected: { backgroundColor: colors.accent },
  segmentText: { fontSize: 10 },
  segmentTextSelected: { color: colors.onAccent },
  newNote: {
    height: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newNoteText: { color: colors.accent },
  pressed: { opacity: 0.7 },
  empty: { color: colors.textMuted },
  separator: { height: spacing.sm },
  recipeRow: { gap: spacing.sm, alignItems: 'stretch' },
});
