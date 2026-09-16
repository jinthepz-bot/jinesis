import { useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dayKey, formatDayKey, formatTime } from '../coach/days';
import { useTodayKey } from '../coach/useTodayKey';
import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { colors, spacing } from '../design/theme';
import { Button, Card, fieldStyles, IconButton, ScreenTitle } from '../design/ui';
import { addJournalEntry, deleteJournalEntry, useJournal, type JournalEntry } from '../journal/store';

// Holds its own draft state so typing doesn't re-render the entry list.
function Composer() {
  const type = useType();
  const [text, setText] = useState('');
  const canSave = text.trim() !== '';

  const save = () => {
    if (addJournalEntry(text)) {
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
        accessibilityLabel="Journal entry"
      />
      <View style={styles.composerFooter}>
        <Text style={[type.mono, styles.hint]}>Saved with today's date and time</Text>
        <Button label="Save" onPress={save} disabled={!canSave} accessibilityLabel="Save entry" />
      </View>
    </Card>
  );
}

function EntryCard({ entry, todayKey }: { entry: JournalEntry; todayKey: string }) {
  const type = useType();
  const day = dayKey(new Date(entry.createdAt));
  const stamp = `${day === todayKey ? 'Today' : formatDayKey(day, todayKey)} · ${formatTime(entry.createdAt)}`;

  const confirmDelete = () =>
    confirmDestructive({
      title: 'Delete this entry?',
      message: entry.text.length > 120 ? `${entry.text.slice(0, 117)}...` : entry.text,
      confirmLabel: 'Delete',
      onConfirm: () => deleteJournalEntry(entry.id),
    });

  return (
    <Card style={styles.entry}>
      <View style={styles.entryHeader}>
        <Text style={type.label}>{stamp}</Text>
        <IconButton icon="trash-outline" label={`Delete journal entry from ${stamp}`} onPress={confirmDelete} />
      </View>
      <Text selectable style={type.body}>
        {entry.text}
      </Text>
    </Card>
  );
}

export function JournalScreen() {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { state, loaded } = useJournal();
  const todayKey = useTodayKey();

  if (!loaded) return <View style={styles.root} />;

  const count = state.entries.length;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          data={state.entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EntryCard entry={item} todayKey={todayKey} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenTitle label={`${count} ${count === 1 ? 'entry' : 'entries'}`} title="JOURNAL" />
              <Composer />
              {count > 0 ? <Text style={type.label}>Newest first</Text> : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={[type.body, styles.empty]}>Nothing here yet. Write down whatever is on your mind.</Text>
          }
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </KeyboardAvoidingView>
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
  entry: { gap: 6 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  empty: { color: colors.textMuted },
  separator: { height: spacing.sm },
});
