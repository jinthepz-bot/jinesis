import { addDays, weekdayIndex } from '../coach/days';
import { tasksOnDay, type Task } from '../coach/store';
import type { ScheduleEvent } from './store';
import { compareTimes } from './time';

export interface Occurrence {
  event: ScheduleEvent;
  date: string;
}

// One row in a day's agenda: an event occurrence or a task due that day, so the
// two can be shown together in one time-ordered list (see DayRow).
export type DayItem =
  | { kind: 'event'; id: string; event: ScheduleEvent }
  | { kind: 'task'; id: string; task: Task };

// Whether `event` occurs on `date`.
export function occursOn(event: ScheduleEvent, date: string): boolean {
  if (event.type === 'one-off') return event.date === date;
  if (!event.days.includes(weekdayIndex(date))) return false;
  if (event.startDate && date < event.startDate) return false;
  if (event.endDate && date > event.endDate) return false;
  return true;
}

// Every event occurring on `date`, earliest start time first.
export function eventsOnDay(events: ScheduleEvent[], date: string): ScheduleEvent[] {
  return events.filter((e) => occursOn(e, date)).sort((a, b) => compareTimes(a.startTime, b.startTime));
}

// Events and dated tasks due on `date`, merged into one time-ordered list. Untimed
// tasks (a date with no time) sort first, like an all-day item on a calendar.
export function agendaForDay(events: ScheduleEvent[], tasks: Task[], date: string): DayItem[] {
  const items: DayItem[] = [
    ...eventsOnDay(events, date).map((event): DayItem => ({ kind: 'event', id: event.id, event })),
    ...tasksOnDay(tasks, date).map((task): DayItem => ({ kind: 'task', id: task.id, task })),
  ];
  const timeOf = (item: DayItem) => (item.kind === 'event' ? item.event.startTime : (item.task.time ?? ''));
  return items.sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
}

// The next date on or after `from` that `event` occurs, or null if it never will
// again (a past one-off, or a recurring event whose end date has already passed).
export function nextOccurrence(event: ScheduleEvent, from: string): string | null {
  if (event.type === 'one-off') return event.date && event.date >= from ? event.date : null;
  const start = event.startDate && event.startDate > from ? event.startDate : from;
  if (event.endDate && start > event.endDate) return null;
  for (let i = 0; i < 7; i++) {
    const candidate = addDays(start, i);
    if (event.endDate && candidate > event.endDate) return null;
    if (event.days.includes(weekdayIndex(candidate))) return candidate;
  }
  return null;
}

// Every occurrence of every event across `days` days starting at `from` (inclusive),
// earliest first — a recurring class contributes one row per week it meets in the
// window. Used to schedule reminders across a rolling window, unlike `upcomingOccurrences`
// below, which only wants each event's single soonest occurrence for a "coming up" list.
export function occurrencesInWindow(events: ScheduleEvent[], from: string, days: number): Occurrence[] {
  const out: Occurrence[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    for (const event of eventsOnDay(events, date)) out.push({ event, date });
  }
  return out;
}

// Each event's soonest occurrence on or after `from`, soonest first. A recurring
// class contributes one row here, not one per future week.
export function upcomingOccurrences(events: ScheduleEvent[], from: string, limit: number): Occurrence[] {
  return events
    .map((event) => {
      const date = nextOccurrence(event, from);
      return date ? { event, date } : null;
    })
    .filter((o): o is Occurrence => o !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || compareTimes(a.event.startTime, b.event.startTime))
    .slice(0, limit);
}
