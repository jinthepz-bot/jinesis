import { addDays, formatDayKey } from '../coach/days';
import { formatAmount } from '../coach/format';
import { currentStreak, deadlineStatus, goalProgress } from '../coach/stats';
import { entriesForGoal, getFeaturedGoal, type CoachState, type Goal } from '../coach/store';
import { formatTime } from '../coach/days';
import type { JournalEntry } from '../journal/store';
import { describeEventTime } from '../schedule/format';
import { eventsOnDay } from '../schedule/occurrences';
import type { ScheduleEvent } from '../schedule/store';

// Keep the state summary small: it is rebuilt and sent on every message.
const MAX_TASKS = 15;
const MAX_BUY_ITEMS = 15;
const MAX_JOURNAL_ENTRIES = 5;
const MAX_JOURNAL_CHARS = 200;

function describeDeadline(goal: Goal, todayKey: string): string {
  const status = deadlineStatus(goal.deadline, todayKey);
  if (status.kind === 'unset' || !goal.deadline) return 'no deadline';
  const date = formatDayKey(goal.deadline, todayKey);
  if (status.kind === 'upcoming') {
    return `deadline ${date}, ${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'} left`;
  }
  return `deadline ${date}, ${status.daysOver} ${status.daysOver === 1 ? 'day' : 'days'} overdue`;
}

function describeGoal(goal: Goal, todayKey: string): string {
  const { percent, done } = goalProgress(goal);
  const unit = goal.unit ? ` ${goal.unit}` : '';
  const kind = goal.type === 'best' ? 'best result' : 'cumulative';
  return (
    `- "${goal.title}" (id: ${goal.id}, ${kind}): ${formatAmount(goal.current)} / ${formatAmount(goal.target)}${unit}` +
    ` (${percent}%${done ? ', reached' : ''}), ${describeDeadline(goal, todayKey)}`
  );
}

function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function describeScheduleEvent(event: ScheduleEvent): string {
  const location = event.location ? `, ${event.location}` : '';
  return `- "${event.title}" (id: ${event.id}): ${describeEventTime(event)}${location}`;
}

// A snapshot of the user's data, sent as its own system block on each request so
// the coach never asks for something it can already see.
export function buildCoachContext(
  state: CoachState,
  journal: JournalEntry[],
  schedule: ScheduleEvent[],
  todayKey: string,
): string {
  const featured = getFeaturedGoal(state);
  const streak = currentStreak(entriesForGoal(state, featured.id), todayKey);
  const others = state.goals.filter((g) => !g.featured);
  const openTasks = state.tasks.filter((t) => !t.done);
  const unbought = state.toBuy.filter((b) => !b.bought);

  const lines = [
    `CURRENT STATE (today is ${formatDayKey(todayKey, todayKey)}, ${todayKey})`,
    '',
    'FEATURED GOAL (drives the Home screen):',
    describeGoal(featured, todayKey),
    `Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}. ` +
      `Best ${featured.unit || 'result'} ever: ${formatAmount(featured.current)}.`,
  ];

  const todayEntry = entriesForGoal(state, featured.id).find((e) => e.date === todayKey);
  lines.push(
    todayEntry
      ? `Logged today: ${formatAmount(todayEntry.value)}${featured.unit ? ` ${featured.unit}` : ''}${todayEntry.note ? ` (note: ${truncate(todayEntry.note, 80)})` : ''}.`
      : 'Nothing logged today yet.',
  );

  const tomorrowKey = addDays(todayKey, 1);
  const todaySchedule = eventsOnDay(schedule, todayKey);
  const tomorrowSchedule = eventsOnDay(schedule, tomorrowKey);
  lines.push('', `TODAY'S SCHEDULE (${todaySchedule.length}):`);
  lines.push(...(todaySchedule.length > 0 ? todaySchedule.map(describeScheduleEvent) : ['- nothing scheduled']));
  lines.push('', `TOMORROW'S SCHEDULE (${tomorrowSchedule.length}):`);
  lines.push(...(tomorrowSchedule.length > 0 ? tomorrowSchedule.map(describeScheduleEvent) : ['- nothing scheduled']));

  lines.push('', `OTHER GOALS (${others.length}):`);
  lines.push(...(others.length > 0 ? others.map((g) => describeGoal(g, todayKey)) : ['- none']));

  lines.push('', `OPEN TASKS (${openTasks.length}):`);
  lines.push(
    ...(openTasks.length > 0
      ? openTasks.slice(0, MAX_TASKS).map((t) => `- "${truncate(t.text, 100)}" (id: ${t.id})`)
      : ['- none']),
  );

  lines.push('', `TO-BUY LIST (${unbought.length} unbought):`);
  lines.push(
    ...(unbought.length > 0
      ? unbought
          .slice(0, MAX_BUY_ITEMS)
          .map((b) => `- "${truncate(b.name, 80)}" (id: ${b.id})${b.price !== null ? `, price ${formatAmount(b.price)}` : ''}`)
      : ['- none']),
  );

  const recent = journal.slice(0, MAX_JOURNAL_ENTRIES);
  lines.push('', `RECENT JOURNAL (${recent.length} of ${journal.length}, newest first):`);
  lines.push(
    ...(recent.length > 0
      ? recent.map((e) => {
          const day = formatDayKey(new Date(e.createdAt).toISOString().slice(0, 10), todayKey);
          return `- ${day} ${formatTime(e.createdAt)}: ${truncate(e.text, MAX_JOURNAL_CHARS)}`;
        })
      : ['- none']),
  );

  return lines.join('\n');
}
