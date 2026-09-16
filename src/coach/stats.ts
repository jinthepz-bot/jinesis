import { addDays, daysBetween, weekdayIndex } from './days';
import type { Goal, LogEntry } from './store';

export interface DayActivity {
  key: string;
  letter: string;
  total: number;
  isToday: boolean;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Oldest first, ending with today. Values on the same day are added together.
export function last7Days(entries: LogEntry[], todayKey: string): DayActivity[] {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.date, (totals.get(e.date) ?? 0) + e.value);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey, i - 6);
    return { key, letter: DAY_LETTERS[weekdayIndex(key)], total: totals.get(key) ?? 0, isToday: i === 6 };
  });
}

// Consecutive active days counting back from today. If today isn't logged yet,
// the count starts from yesterday so the streak isn't shown as broken until the day ends.
export function currentStreak(entries: LogEntry[], todayKey: string): number {
  const active = new Set(entries.filter((e) => e.value > 0).map((e) => e.date));
  let day = active.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (active.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export type DeadlineStatus =
  | { kind: 'unset' }
  | { kind: 'upcoming'; daysLeft: number }
  | { kind: 'passed'; daysOver: number };

export function deadlineStatus(deadline: string | null, todayKey: string): DeadlineStatus {
  if (!deadline) return { kind: 'unset' };
  const days = daysBetween(todayKey, deadline);
  return days >= 0 ? { kind: 'upcoming', daysLeft: days } : { kind: 'passed', daysOver: -days };
}

export function goalProgress(goal: Goal): { percent: number; done: boolean } {
  const percent = Math.max(0, Math.min(100, Math.floor((goal.current / goal.target) * 100)));
  return { percent, done: goal.current >= goal.target };
}
