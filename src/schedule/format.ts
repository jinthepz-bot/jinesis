import { formatDayKey } from '../coach/days';
import type { ScheduleEvent } from './store';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeWeekdays(days: number[]): string {
  return days.map((d) => WEEKDAY_SHORT[d]).join(' + ');
}

export function describeEventTime(event: Pick<ScheduleEvent, 'startTime' | 'endTime'>): string {
  return event.endTime ? `${event.startTime}–${event.endTime}` : event.startTime;
}

// "German A2, Mon + Wed" for a recurring event, or the date for a one-off one.
export function describeEventDays(event: ScheduleEvent, todayKey: string): string {
  if (event.type === 'one-off') return event.date ? formatDayKey(event.date, todayKey) : '';
  return describeWeekdays(event.days);
}
