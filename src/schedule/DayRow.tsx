import { StyleSheet, Text, View } from 'react-native';

import { weekdayShort } from '../coach/days';
import { useType } from '../design/fonts';
import { colors } from '../design/theme';
import { EventRow } from './EventRow';
import type { DayItem } from './occurrences';
import { TaskRow } from './TaskRow';

interface Props {
  day: string;
  isToday: boolean;
  items: DayItem[];
  onEventPress: (id: string) => void;
  onTaskToggle: (id: string) => void;
  onTaskEdit: (id: string) => void;
}

// One day of the week view: a header (visually distinct when it's today) and its
// agenda — events and dated tasks together, in the order agendaForDay puts them in.
export function DayRow({ day, isToday, items, onEventPress, onTaskToggle, onTaskEdit }: Props) {
  const type = useType();
  return (
    <View style={[styles.row, isToday && styles.today]}>
      <View style={styles.header}>
        <Text style={[type.label, isToday && styles.todayText]}>
          {weekdayShort(day).toUpperCase()} {Number(day.slice(8))}
        </Text>
        {isToday ? <Text style={[type.label, styles.badge]}>TODAY</Text> : null}
      </View>
      {items.length === 0 ? (
        <Text style={[type.mono, styles.empty]}>Nothing scheduled</Text>
      ) : (
        items.map((item) =>
          item.kind === 'event' ? (
            <EventRow key={item.id} event={item.event} onPress={() => onEventPress(item.id)} />
          ) : (
            <TaskRow
              key={item.id}
              task={item.task}
              onToggle={() => onTaskToggle(item.id)}
              onEdit={() => onTaskEdit(item.id)}
            />
          ),
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 2,
  },
  today: { backgroundColor: colors.accentSoft },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 18 },
  todayText: { color: colors.accent },
  badge: { color: colors.accent },
  empty: { color: colors.textMuted, paddingVertical: 6 },
});
