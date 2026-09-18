import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import { Card, IconButton } from '../design/ui';
import { addChecklistItem, deleteChecklistItem, deleteNote, toggleChecklistItem, type ChecklistNote } from './store';

export function ChecklistCard({ note }: { note: ChecklistNote }) {
  const type = useType();
  const [draft, setDraft] = useState('');
  const canAdd = draft.trim() !== '';
  const doneCount = note.items.filter((i) => i.done).length;

  const add = () => {
    if (!canAdd) return;
    addChecklistItem(note.id, draft);
    setDraft('');
  };

  const confirmDelete = () =>
    confirmDestructive({
      title: `Delete "${note.title}"?`,
      confirmLabel: 'Delete',
      onConfirm: () => deleteNote(note.id),
    });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={type.bodyStrong} numberOfLines={2}>
          {note.title}
        </Text>
        <View style={styles.headerRight}>
          <Text style={type.label}>
            {doneCount}/{note.items.length}
          </Text>
          <IconButton icon="trash-outline" label={`Delete checklist "${note.title}"`} onPress={confirmDelete} />
        </View>
      </View>

      {note.items.length === 0 ? (
        <Text style={[type.body, styles.empty]}>No items yet.</Text>
      ) : (
        note.items.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && styles.divider]}>
            <Pressable
              onPress={() => toggleChecklistItem(note.id, item.id)}
              hitSlop={10}
              style={[styles.checkbox, item.done && styles.checked]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.done }}
              aria-checked={item.done}
              accessibilityLabel={item.text}
            >
              {item.done ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
            </Pressable>
            <Text
              style={[type.body, styles.itemText, item.done && styles.itemDone]}
              onPress={() => toggleChecklistItem(note.id, item.id)}
            >
              {item.text}
            </Text>
            <Pressable
              onPress={() => deleteChecklistItem(note.id, item.id)}
              hitSlop={10}
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Delete item "${item.text}"`}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, type.body]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add an item"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={add}
          submitBehavior="submit"
          accessibilityLabel={`Add item to "${note.title}"`}
        />
        <Pressable
          onPress={add}
          disabled={!canAdd}
          style={({ pressed }) => [styles.addButton, !canAdd && styles.disabled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add item"
        >
          <Ionicons name="add" size={20} color={colors.onAccent} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  itemText: { flex: 1 },
  itemDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  delete: { padding: 2 },
  pressed: { opacity: 0.6 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 38,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 10,
    color: colors.text,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
});
