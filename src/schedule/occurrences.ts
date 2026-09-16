import { addDays, weekdayIndex } from '../coach/days';
import type { ScheduleEvent } from './store';
import { compareTimes } from './time';

export interface Occurrence {
  event: ScheduleEvent;
  date: string;
}

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
