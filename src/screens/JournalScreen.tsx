import { useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTodayKey } from '../coach/useTodayKey';
import { useType } from '../design/fonts';
import { colors, radius, spacing } from '../design/theme';
import { Button, Card, fieldStyles, ScreenTitle } from '../design/ui';
import { ChecklistCard } from '../notes/ChecklistCard';
import { NoteForm } from '../notes/NoteForm';
import { QuickNoteCard } from '../notes/QuickNoteCard';
import { RecipeCard } from '../notes/RecipeCard';
import { addQuickNote, searchNotes, useNotes, type Note, type NoteType } from '../notes/store';

type Filter = 'all' | NoteType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'quick', label: 'Quick' },
  { value: 'recipe', label: 'Recipes' },
  { value: 'checklist', label: 'Lists' },
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
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  query: string;
  onQueryChange: (q: string) => void;
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
  const { state, loaded } = useNotes();
  const todayKey = useTodayKey();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  if (!loaded) return <View style={styles.root} />;

  const count = state.notes.length;
  const byType = filter === 'all' ? state.notes : state.notes.filter((n) => n.type === filter);
  const visible = searchNotes(byType, query);
  const filtering = filter !== 'all' || query.trim() !== '';

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          data={visible}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NoteRow note={item} todayKey={todayKey} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenTitle label={`${count} ${count === 1 ? 'note' : 'notes'}`} title="JOURNAL" />
              <Composer />
              <FilterBar filter={filter} onFilterChange={setFilter} query={query} onQueryChange={setQuery} />
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
});
