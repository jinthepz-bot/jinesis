// Pure scheduling logic: given the app's current data, decide exactly what local
// notifications should exist. No expo-notifications import here, on purpose, so this
// stays testable under plain Node — the native half lives in notifications/scheduler.ts,
// which just wipes and replays whatever this returns.
import { addDays, parseDayKey } from '../coach/days';
import { currentStreak } from '../coach/stats';
import { entriesForGoal, getFeaturedGoal, type CoachState } from '../coach/store';
import { occurrencesInWindow } from '../schedule/occurrences';
import type { ScheduleEvent } from '../schedule/store';
import type { NotificationPrefs } from './store';
import { dailyReminderCopy, deadlineDayCopy, deadlineWeekCopy, eventReminderCopy, streakAtRiskCopy } from './voice';

export interface PlannedNotification {
  id: string; // stable per slot, so re-scheduling the same slot replaces rather than duplicates
  title: string;
  body: string;
  date: number; // epoch ms, always in the future
}

// How far ahead reminders are (re)projected each time the plan is rebuilt — matches the
// rest of the coach's "never project further than about a week" convention (see
// agent/context.ts). Reminders roll forward every time the app is opened or the
// underlying data changes; see notifications/NotificationsEngine.tsx.
const WINDOW_DAYS = 7;

// iOS caps an app at 64 pending local notification requests. Soonest-first is kept and
// anything past this is dropped rather than silently failing to schedule.
const MAX_PENDING = 60;

// A fixed "late evening" hour for the streak nudge — sharper and later than the
// user's own daily-reminder time, which they picked for a gentler heads-up.
const STREAK_RISK_HOUR = 22;
const DEADLINE_WARNING_TIME = '09:00';

// Local wall-clock time for a "YYYY-MM-DD" + "HH:MM" pair — deliberately not the UTC
// arithmetic in coach/days.ts, since a scheduled notification has to fire at the time
// shown on the user's own clock.
function localTime(dayKey: string, time: string): number {
  const day = parseDayKey(dayKey);
  const [hour, minute] = time.split(':').map(Number);
  if (!day) return NaN;
  return new Date(day.year, day.month - 1, day.day, hour, minute, 0, 0).getTime();
}

export interface PlanInput {
  coach: CoachState;
  events: ScheduleEvent[];
  prefs: NotificationPrefs;
  todayKey: string;
  now: number; // Date.now(), passed in so this stays pure and testable
}

export function buildNotificationPlan({ coach, events, prefs, todayKey, now }: PlanInput): PlannedNotification[] {
  if (!prefs.enabled) return [];

  const plan: PlannedNotification[] = [];
  const featured = getFeaturedGoal(coach);
  const featuredEntries = entriesForGoal(coach, featured.id);
  const loggedOn = (day: string) => featuredEntries.some((e) => e.date === day && e.value > 0);

  if (prefs.dailyReminderEnabled) {
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const day = addDays(todayKey, i);
      const at = localTime(day, prefs.dailyReminderTime);
      if (!(at > now)) continue; // today, once the time has already passed
      if (i === 0 && loggedOn(day)) continue; // only today's "already logged" state is knowable in advance
      plan.push({ id: `daily-${day}`, ...dailyReminderCopy(featured.title), date: at });
    }
  }

  if (prefs.streakAtRiskEnabled) {
    const streak = currentStreak(featuredEntries, todayKey);
    const at = localTime(todayKey, `${String(STREAK_RISK_HOUR).padStart(2, '0')}:00`);
    if (streak > 0 && !loggedOn(todayKey) && at > now) {
      const midnight = localTime(addDays(todayKey, 1), '00:00');
      const hoursLeft = Math.max(1, Math.round((midnight - at) / 3_600_000));
      plan.push({ id: `streak-${todayKey}`, ...streakAtRiskCopy(streak, hoursLeft), date: at });
    }
  }

  if (prefs.scheduleRemindersEnabled) {
    for (const { event, date } of occurrencesInWindow(events, todayKey, WINDOW_DAYS)) {
      if (!event.reminderMinutesBefore) continue;
      const at = localTime(date, event.startTime) - event.reminderMinutesBefore * 60_000;
      if (!(at > now)) continue;
      plan.push({ id: `event-${event.id}-${date}`, ...eventReminderCopy(event.title, event.reminderMinutesBefore), date: at });
    }
  }

  if (prefs.deadlineWarningsEnabled) {
    for (const goal of coach.goals) {
      if (!goal.deadline) continue;
      const weekAt = localTime(addDays(goal.deadline, -7), DEADLINE_WARNING_TIME);
      const dayAt = localTime(addDays(goal.deadline, -1), DEADLINE_WARNING_TIME);
      if (weekAt > now) plan.push({ id: `deadline-week-${goal.id}`, ...deadlineWeekCopy(goal.title), date: weekAt });
      if (dayAt > now) plan.push({ id: `deadline-day-${goal.id}`, ...deadlineDayCopy(goal.title), date: dayAt });
    }
  }

  plan.sort((a, b) => a.date - b.date);
  return plan.slice(0, MAX_PENDING);
}
