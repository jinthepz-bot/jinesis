import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Task } from '../coach/store';
import { useType } from '../design/fonts';
import { colors } from '../design/theme';

interface Props {
  task: Task;
  onToggle: () => void;
  onEdit: () => void; // opens the full form to change its text, date, or time
}

// One dated task, shown alongside events for a day it's due on (see EventRow,
// which this mirrors). Tapping the row toggles it done, same as the Home task
// list; the trailing icon opens the full edit form, same as EventRow's whole-row tap.
export function TaskRow({ task, onToggle, onEdit }: Props) {
  const type = useType();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.tapArea, pressed && styles.pressed]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={task.text}
      >
        <Text style={[type.mono, styles.time]}>{task.time ?? ''}</Text>
        <View style={[styles.checkbox, task.done && styles.checked]}>
          {task.done ? <Ionicons name="checkmark" size={12} color={colors.onAccent} /> : null}
        </View>
        <Text style={[type.body, styles.title, task.done && styles.titleDone]} numberOfLines={1}>
          {task.text}
        </Text>
      </Pressable>
      <Pressable
        onPress={onEdit}
        hitSlop={10}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${task.text}`}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  tapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.6 },
  time: { width: 44, color: colors.text, paddingTop: 2 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  title: { flex: 1 },
  titleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  editButton: { padding: 2 },
});
