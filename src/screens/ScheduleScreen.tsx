import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, formatDayKey, startOfWeek } from '../coach/days';
import { useTodayKey } from '../coach/useTodayKey';
import { useType } from '../design/fonts';
import { colors, radius, spacing } from '../design/theme';
import { Card, ScreenTitle, Section } from '../design/ui';
import { DayRow } from '../schedule/DayRow';
import { EventForm } from '../schedule/EventForm';
import { eventsOnDay, upcomingOccurrences } from '../schedule/occurrences';
import { addEvent, deleteEvent, updateEvent, useSchedule } from '../schedule/store';
import { UpcomingRow } from '../schedule/UpcomingRow';

const UPCOMING_LIMIT = 8;

export function ScheduleScreen() {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { state, loaded } = useSchedule();
  const todayKey = useTodayKey();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey));
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!loaded) return <View style={styles.root} />;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const onCurrentWeek = weekStart === startOfWeek(todayKey);
  const editingEvent = state.events.find((e) => e.id === editingId) ?? null;
  const upcoming = upcomingOccurrences(state.events, todayKey, UPCOMING_LIMIT);
  const weekRange = `${formatDayKey(weekDays[0], todayKey)} – ${formatDayKey(weekDays[6], todayKey)}`;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle
          label={`${state.events.length} ${state.events.length === 1 ? 'event' : 'events'} · ${formatDayKey(todayKey, todayKey)}`}
          title="SCHEDULE"
        />

        <Section label="This week">
          <Card style={styles.weekCard}>
            <View style={styles.weekNav}>
              <Pressable
                onPress={() => setWeekStart((w) => addDays(w, -7))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Previous week"
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => setWeekStart(startOfWeek(todayKey))} disabled={onCurrentWeek} hitSlop={6}>
                <Text style={[type.mono, styles.weekRange, !onCurrentWeek && styles.weekRangeLink]}>{weekRange}</Text>
              </Pressable>
              <Pressable
                onPress={() => setWeekStart((w) => addDays(w, 7))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Next week"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>
            {weekDays.map((day, i) => (
              <View key={day} style={i > 0 && styles.dayDivider}>
                <DayRow day={day} isToday={day === todayKey} events={eventsOnDay(state.events, day)} onEventPress={setEditingId} />
              </View>
            ))}
          </Card>
        </Section>

        <Section label="Coming up">
          <Card>
            {upcoming.length === 0 ? (
              <Text style={[type.body, styles.muted]}>Nothing coming up.</Text>
            ) : (
              upcoming.map((occurrence, i) => (
                <View key={occurrence.event.id} style={i > 0 && styles.upcomingDivider}>
                  <UpcomingRow occurrence={occurrence} todayKey={todayKey} onPress={() => setEditingId(occurrence.event.id)} />
                </View>
              ))
            )}
          </Card>
        </Section>

        <Pressable
          onPress={() => setCreating(true)}
          style={({ pressed }) => [styles.newEvent, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="New event"
        >
          <Text style={[type.label, styles.newEventText]}>+ New event</Text>
        </Pressable>
      </ScrollView>

      <EventForm
        visible={creating}
        todayKey={todayKey}
        editing={null}
        onCancel={() => setCreating(false)}
        onSave={(input) => {
          addEvent(input);
          setCreating(false);
        }}
      />

      <EventForm
        visible={editingEvent !== null}
        todayKey={todayKey}
        editing={editingEvent}
        onCancel={() => setEditingId(null)}
        onSave={(input) => {
          if (editingEvent) updateEvent(editingEvent.id, input);
          setEditingId(null);
        }}
        onDelete={() => {
          if (editingEvent) deleteEvent(editingEvent.id);
          setEditingId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  weekCard: { gap: spacing.sm },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  weekRange: { color: colors.text },
  weekRangeLink: { color: colors.accent },
  dayDivider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 4 },
  upcomingDivider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 4 },
  muted: { color: colors.textMuted },
  newEvent: {
    height: 48,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newEventText: { color: colors.accent },
  pressed: { opacity: 0.7 },
});
