// Calendar-day helpers. A day is a local "YYYY-MM-DD" key. Day arithmetic runs in
// UTC so daylight-saving changes never add or drop a day.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function makeDayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Today's key (or any date's) in the device's local time zone.
export function dayKey(date: Date = new Date()): string {
  return makeDayKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  const valid = check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return valid ? { year, month, day } : null;
}

export function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && parseDayKey(value) !== null;
}

function toUtc(key: string): number {
  const p = parseDayKey(key);
  if (!p) throw new Error(`Invalid day key: ${key}`);
  return Date.UTC(p.year, p.month - 1, p.day);
}

export function addDays(key: string, days: number): string {
  const d = new Date(toUtc(key) + days * DAY_MS);
  return makeDayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// Whole days from `from` to `to` (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

// 0 = Sunday ... 6 = Saturday
export function weekdayIndex(key: string): number {
  return new Date(toUtc(key)).getUTCDay();
}

export function weekdayShort(key: string): string {
  return WEEKDAYS[weekdayIndex(key)];
}

// The Monday of the week containing `key` (weeks start Monday, matching MonthCalendar).
export function startOfWeek(key: string): string {
  const sinceMonday = (weekdayIndex(key) + 6) % 7;
  return addDays(key, -sinceMonday);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// "today", "3 days from today", "2 days ago"
export function describeDayDistance(todayKey: string, key: string): string {
  const n = daysBetween(todayKey, key);
  if (n === 0) return 'today';
  const count = `${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'}`;
  return n > 0 ? `${count} from today` : `${count} ago`;
}

// "14:05" in local time.
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "Fri 18 Sep", with the year added when it differs from today's.
export function formatDayKey(key: string, todayKey: string = dayKey()): string {
  const p = parseDayKey(key);
  if (!p) return key;
  const base = `${WEEKDAYS[weekdayIndex(key)]} ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
  return p.year === parseDayKey(todayKey)?.year ? base : `${base} ${p.year}`;
}
