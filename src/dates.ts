const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

const DUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

// Deadlines are stored as local wall-clock strings: "2026-09-18" or "2026-09-18T17:00".
export function parseDue(due: string): Date | null {
  const m = DUE_PATTERN.exec(due);
  if (!m) return null;
  const [y, mo, d, h = '0', mi = '0'] = m.slice(1).map((v) => v ?? undefined) as string[];
  const date = new Date(+y, +mo - 1, +d, +h, +mi);
  const valid =
    date.getFullYear() === +y && date.getMonth() === +mo - 1 && date.getDate() === +d && +h < 24 && +mi < 60;
  return valid ? date : null;
}

export function hasTime(due: string): boolean {
  return due.includes('T');
}

// The moment a deadline passes: its time, or the end of that day when there's no time.
export function dueMoment(due: string): number | null {
  const date = parseDue(due);
  if (!date) return null;
  if (!hasTime(due)) date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function localIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function utcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Written into each user message sent to Claude so it can resolve "Friday" or
// "tomorrow". Built by hand (not Intl) so the same message renders identically
// on every request, which keeps the prompt cache prefix stable.
export function sentLabel(ms: number): string {
  const d = new Date(ms);
  return `${WEEKDAYS[d.getDay()]} ${localIso(d).replace('T', ' ')} (${utcOffset(d)})`;
}

// For tool results: "2026-09-18 (Fri)" or "2026-09-18T17:00 (Fri)".
export function dueWithWeekday(due: string): string {
  const date = parseDue(due);
  return date ? `${due} (${WEEKDAYS[date.getDay()]})` : due;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// For the UI: "Fri 18 Sep" plus the time if set. With `relative`, today and
// tomorrow read as "Today" / "Tomorrow" (don't use that for labels that are stored).
export function formatDue(due: string, options: { relative?: boolean; now?: Date } = {}): string {
  const { relative = true, now = new Date() } = options;
  const date = parseDue(due);
  if (!date) return due;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let day = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  if (relative && isSameDay(date, now)) day = 'Today';
  else if (relative && isSameDay(date, tomorrow)) day = 'Tomorrow';
  if (date.getFullYear() !== now.getFullYear()) day += ` ${date.getFullYear()}`;
  return hasTime(due) ? `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

export function formatTimestamp(ms: number, now = new Date()): string {
  const d = new Date(ms);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (isSameDay(d, now)) return `Today, ${time}`;
  const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${time}`;
}
