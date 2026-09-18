import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { CoachState } from '../coach/store';
import { useCoach } from '../coach/store';
import { useTodayKey } from '../coach/useTodayKey';
import type { ScheduleEvent } from '../schedule/store';
import { useSchedule } from '../schedule/store';
import { buildNotificationPlan } from './plan';
import { applyNotificationPlan, notificationsSupported } from './scheduler';
import type { NotificationPrefs } from './store';
import { useNotificationPrefs } from './store';

function refresh(coach: CoachState, events: ScheduleEvent[], prefs: NotificationPrefs, todayKey: string) {
  const plan = buildNotificationPlan({ coach, events, prefs, todayKey, now: Date.now() });
  applyNotificationPlan(plan);
}

// Renders nothing. Mounted once at the app root (see App.tsx) so it can recompute and
// re-lay-out every scheduled local notification whenever the data behind them changes —
// logging progress, adding or editing an event, changing a deadline, or flipping a
// setting — without every mutation site needing to remember to call a "reschedule"
// function itself. It also re-runs on every return to the foreground, so the rolling
// reminder window (see plan.ts) keeps extending even on days nothing else changed.
export function NotificationsEngine() {
  const { state: coach, loaded: coachLoaded } = useCoach();
  const { state: schedule, loaded: scheduleLoaded } = useSchedule();
  const { state: prefs, loaded: prefsLoaded } = useNotificationPrefs();
  const todayKey = useTodayKey();
  const ready = notificationsSupported && coachLoaded && scheduleLoaded && prefsLoaded;

  useEffect(() => {
    if (ready) refresh(coach, schedule.events, prefs, todayKey);
  }, [ready, coach, schedule, prefs, todayKey]);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active' && ready) refresh(coach, schedule.events, prefs, todayKey);
    });
    return () => sub.remove();
  }, [ready, coach, schedule, prefs, todayKey]);

  return null;
}
