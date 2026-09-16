import { StyleSheet, Text, View } from 'react-native';

import { useType } from '../design/fonts';
import { colors } from '../design/theme';
import { Card } from '../design/ui';
import type { DayActivity } from '../coach/stats';

const BAR_AREA = 84;

export function WeekBars({ days }: { days: DayActivity[] }) {
  const type = useType();
  const max = Math.max(1, ...days.map((d) => d.total));

  return (
    <Card>
      <View style={styles.row}>
        {days.map((day) => {
          const active = day.total > 0;
          const height = active ? Math.max(8, Math.round((day.total / max) * BAR_AREA)) : 4;
          return (
            <View
              key={day.key}
              style={styles.column}
              accessible
              accessibilityLabel={`${day.isToday ? 'Today' : day.letter}: ${day.total}`}
            >
              <Text style={[type.mono, styles.value, !active && styles.hidden]}>{day.total}</Text>
              <View style={styles.barArea}>
                <View style={[styles.bar, { height }, active ? styles.barActive : styles.barEmpty]} />
              </View>
              <Text style={[type.label, styles.letter, day.isToday && styles.today]}>{day.letter}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center', gap: 6 },
  value: { fontSize: 10 },
  hidden: { opacity: 0 },
  barArea: { height: BAR_AREA, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '55%', maxWidth: 26, borderRadius: 3 },
  barActive: { backgroundColor: colors.accent },
  barEmpty: { backgroundColor: colors.surface2 },
  letter: { letterSpacing: 0 },
  today: { color: colors.text },
});
