import { StyleSheet, Text, View } from 'react-native';

import { weekdayShort } from '../coach/days';
import { useType } from '../design/fonts';
import { colors } from '../design/theme';
import { EventRow } from './EventRow';
import type { ScheduleEvent } from './store';

interface Props {
  day: string;
  isToday: boolean;
  events: ScheduleEvent[];
  onEventPress: (id: string) => void;
}

// One day of the week view: a header (visually distinct when it's today) and its events.
export function DayRow({ day, isToday, events, onEventPress }: Props) {
  const type = useType();
  return (
    <View style={[styles.row, isToday && styles.today]}>
      <View style={styles.header}>
        <Text style={[type.label, isToday && styles.todayText]}>
          {weekdayShort(day).toUpperCase()} {Number(day.slice(8))}
        </Text>
        {isToday ? <Text style={[type.label, styles.badge]}>TODAY</Text> : null}
      </View>
      {events.length === 0 ? (
        <Text style={[type.mono, styles.empty]}>Nothing scheduled</Text>
      ) : (
        events.map((event) => <EventRow key={event.id} event={event} onPress={() => onEventPress(event.id)} />)
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
