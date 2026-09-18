import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDayKey } from '../coach/days';
import { goal as homeGoal } from '../coach/goal';
import { currentStreak, deadlineStatus, last7Days, longestStreak } from '../coach/stats';
import {
  addTask,
  deleteTask,
  entriesForGoal,
  getFeaturedGoal,
  logProgress,
  resetCoachData,
  setGoalDeadline,
  toggleTask,
  updateTask,
  useCoach,
} from '../coach/store';
import { useTodayKey } from '../coach/useTodayKey';
import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { colors, spacing } from '../design/theme';
import { Section } from '../design/ui';
import { DeadlinePicker } from '../home/DeadlinePicker';
import { GoalProgress } from '../home/GoalProgress';
import { QuickLog } from '../home/QuickLog';
import { StatTile } from '../home/StatTile';
import { TaskForm } from '../home/TaskForm';
import { TaskListCard } from '../home/TaskListCard';
import { TodayStrip } from '../home/TodayStrip';
import { WeekBars } from '../home/WeekBars';
import { deleteNotePhoto } from '../notes/photos';
import { resetNotes, useNotes } from '../notes/store';
import { eventsOnDay } from '../schedule/occurrences';
import { resetSchedule, useSchedule } from '../schedule/store';

function confirmReset() {
  confirmDestructive({
    title: 'Reset all data?',
    message:
      'This permanently deletes your goals and their progress, tasks, to-buy list, notes, and schedule on this device. ' +
      "Chat isn't affected.",
    confirmLabel: 'Reset',
    onConfirm: () => {
      resetCoachData();
      for (const note of resetNotes()) {
        if (note.type === 'recipe') deleteNotePhoto(note.photoUri);
      }
      resetSchedule();
    },
  });
}

// Home is driven by the featured goal selected from Goals.
export function HomeScreen() {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { state, loaded } = useCoach();
  const notes = useNotes(); // loaded here too so Reset can't run before notes are read
  const schedule = useSchedule(); // loaded here too so Reset can't run before the schedule is read
  const todayKey = useTodayKey();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<{ editingId: string | null; initialText: string } | null>(null);

  // Blank until stored data is read, so numbers don't flash from 0.
  if (!loaded || !notes.loaded || !schedule.loaded) return <View style={styles.root} />;

  const featured = getFeaturedGoal(state);
  const entries = entriesForGoal(state, featured.id);
  const todayEntry = entries.find((e) => e.date === todayKey);
  const loggedToday = (todayEntry?.value ?? 0) > 0;
  const week = last7Days(entries, todayKey);
  const activeDays = week.filter((d) => d.total > 0).length;
  const streak = currentStreak(entries, todayKey);
  const best = longestStreak(entries);
  const deadline = deadlineStatus(featured.deadline, todayKey);
  const undatedTasks = state.tasks.filter((t) => t.date === null); // dated ones show on Schedule instead
  const doneCount = undatedTasks.filter((t) => t.done).length;
  const dateLabel = formatDayKey(todayKey, todayKey);

  const daysLeftTile =
    deadline.kind === 'unset'
      ? { value: 'Not set', unit: undefined, tone: 'muted' as const }
      : deadline.kind === 'upcoming'
        ? {
            value: deadline.daysLeft,
            unit: deadline.daysLeft === 1 ? 'day' : 'days',
            tone: deadline.daysLeft <= 7 ? ('warning' as const) : ('default' as const),
          }
        : { value: deadline.daysOver, unit: 'over', tone: 'warning' as const };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: loggedToday ? colors.success : colors.accent }]} />
              <Text style={type.label}>
                {loggedToday ? 'On track' : 'Not logged today'} · {dateLabel}
              </Text>
            </View>
            <Text
              style={[type.display, styles.appName]}
              numberOfLines={1}
              adjustsFontSizeToFit
              accessibilityRole="header"
            >
              JINESIST
            </Text>
            <Text style={[type.body, styles.mission]}>{homeGoal.mission}</Text>
          </View>

          <Section label="Today">
            <TodayStrip events={eventsOnDay(schedule.state.events, todayKey)} />
          </Section>

          <Section label="Scoreboard">
            <View style={styles.tiles}>
              <StatTile label="Best set" value={featured.current} unit={featured.unit} />
              <StatTile label="Day streak" value={streak} unit={streak === 1 ? 'day' : 'days'} />
              <StatTile
                label="Best run"
                value={best}
                unit={best === 1 ? 'day' : 'days'}
                tone={best > 0 && best === streak ? 'default' : 'muted'}
              />
              <StatTile
                label="Days left"
                {...daysLeftTile}
                onPress={() => setPickerOpen(true)}
                accessibilityHint="Set or change your deadline"
              />
            </View>
          </Section>

          <Section
            label="Main goal"
            aside={featured.deadline ? `Deadline ${formatDayKey(featured.deadline, todayKey)}` : undefined}
          >
            <GoalProgress current={featured.current} target={featured.target} />
          </Section>

          <Section label="Last 7 days" aside={`${activeDays}/7 active`}>
            <WeekBars days={week} />
          </Section>

          <Section label="Quick log">
            <QuickLog
              unit={featured.unit}
              todayEntry={todayEntry}
              onLog={(count, note) => logProgress(featured.id, count, note, todayKey) ?? { isNewBest: false }}
            />
          </Section>

          <Section label="Tasks" aside={`${doneCount}/${undatedTasks.length} done`}>
            <TaskListCard
              tasks={undatedTasks}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onAdd={addTask}
              onEdit={(id) => setTaskForm({ editingId: id, initialText: '' })}
              onSchedule={(draftText) => setTaskForm({ editingId: null, initialText: draftText })}
            />
          </Section>

          <View style={styles.footer}>
            <Pressable onPress={confirmReset} hitSlop={10} accessibilityRole="button">
              <Text style={[type.label, styles.resetText]}>Reset all data</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DeadlinePicker
        visible={pickerOpen}
        title={`Deadline · ${featured.title}`}
        value={featured.deadline}
        todayKey={todayKey}
        onSave={(day) => {
          setGoalDeadline(featured.id, day);
          setPickerOpen(false);
        }}
        onClear={() => {
          setGoalDeadline(featured.id, null);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <TaskForm
        visible={taskForm !== null}
        todayKey={todayKey}
        editing={taskForm?.editingId ? (state.tasks.find((t) => t.id === taskForm.editingId) ?? null) : null}
        initialText={taskForm?.initialText}
        onCancel={() => setTaskForm(null)}
        onSave={(input) => {
          if (taskForm?.editingId) updateTask(taskForm.editingId, input);
          else addTask(input.text, input.date, input.time);
          setTaskForm(null);
        }}
        onDelete={
          taskForm?.editingId
            ? () => {
                deleteTask(taskForm.editingId!);
                setTaskForm(null);
              }
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { gap: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  appName: { fontSize: 68, lineHeight: 72, letterSpacing: 1.5, marginTop: 4 },
  mission: { color: colors.textMuted },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    marginTop: spacing.xl * 2,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  resetText: { color: colors.textMuted, fontSize: 10 },
});
