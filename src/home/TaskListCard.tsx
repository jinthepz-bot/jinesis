import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Task } from '../coach/store';
import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import { Card } from '../design/ui';

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
}

export function TaskListCard({ tasks, onToggle, onDelete, onAdd }: Props) {
  const type = useType();
  const [draft, setDraft] = useState('');
  const canAdd = draft.trim() !== '';

  const add = () => {
    if (!canAdd) return;
    onAdd(draft.trim());
    setDraft('');
  };

  return (
    <Card style={styles.card}>
      {tasks.length === 0 ? (
        <Text style={[type.body, styles.empty]}>No tasks yet. Add one below.</Text>
      ) : (
        tasks.map((task, i) => (
          <View key={task.id} style={[styles.row, i > 0 && styles.divider]}>
            <Pressable
              onPress={() => onToggle(task.id)}
              hitSlop={10}
              style={[styles.checkbox, task.done && styles.checked]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.done }}
              aria-checked={task.done}
              accessibilityLabel={task.text}
            >
              {task.done ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
            </Pressable>
            <Text style={[type.body, styles.title, task.done && styles.titleDone]} onPress={() => onToggle(task.id)}>
              {task.text}
            </Text>
            <Pressable
              onPress={() => onDelete(task.id)}
              hitSlop={10}
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${task.text}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, type.body]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a task"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={add}
          submitBehavior="submit"
          accessibilityLabel="New task"
        />
        <Pressable
          onPress={add}
          disabled={!canAdd}
          style={({ pressed }) => [styles.addButton, !canAdd && styles.disabled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <Ionicons name="add" size={22} color={colors.onAccent} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  empty: { color: colors.textMuted, paddingHorizontal: 14, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  title: { flex: 1 },
  titleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  delete: { padding: 2 },
  pressed: { opacity: 0.6 },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 10,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
});
