// Local notifications can't call the LLM for copy — there's no network round trip for a
// scheduled OS notification. So this is hand-written to match the coach's voice in
// agent/personality.ts: direct, warm, occasional emoji, never a wall of text.

export interface NotificationCopy {
  title: string;
  body: string;
}

export function dailyReminderCopy(goalTitle: string): NotificationCopy {
  return {
    title: "Don't let today slip",
    body: `You haven't logged ${goalTitle} yet today. A couple minutes now beats scrambling later 👊`,
  };
}

export function streakAtRiskCopy(streakDays: number, hoursLeft: number): NotificationCopy {
  const days = streakDays === 1 ? '1 day' : `${streakDays} days`;
  const hours = hoursLeft === 1 ? '1 hour' : `${hoursLeft} hours`;
  return {
    title: 'Your streak is on the line',
    body: `${days} streak ends in ${hours} if you don't log something. Don't let it die tonight.`,
  };
}

export function eventReminderCopy(eventTitle: string, minutesBefore: number): NotificationCopy {
  const when = minutesBefore >= 60 && minutesBefore % 60 === 0 ? `${minutesBefore / 60}h` : `${minutesBefore} min`;
  return {
    title: `${eventTitle} in ${when}`,
    body: `Heads up — ${eventTitle} starts in ${when}. Wrap up what you're doing and get moving.`,
  };
}

export function deadlineWeekCopy(goalTitle: string): NotificationCopy {
  return {
    title: '1 week out',
    body: `${goalTitle} is due in a week. Where do you actually stand? Let's close the gap 🎯`,
  };
}

export function deadlineDayCopy(goalTitle: string): NotificationCopy {
  return {
    title: 'Deadline is tomorrow',
    body: `${goalTitle} is due tomorrow. Today's the day to make it count.`,
  };
}
