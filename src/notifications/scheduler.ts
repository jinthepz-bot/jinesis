// The only file in notifications/ that touches expo-notifications — everything else
// (store.ts, plan.ts, voice.ts) stays plain and Node-testable, matching the split used
// for photos in notes/photos.ts.
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { PlannedNotification } from './plan';

// expo-notifications has no web implementation to speak of (scheduling and permissions
// both throw); this mirrors the `photosSupported` gate in notes/photos.ts.
export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

async function readPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (err) {
    console.warn('Could not read notification permission', err);
    return 'denied';
  }
}

// Read-only: never prompts. Safe to call on every render/effect.
export function usePermissionState(): PermissionState {
  const [state, setState] = useState<PermissionState>('undetermined');

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      readPermission().then((s) => {
        if (!cancelled) setState(s);
      });
    };
    check();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return state;
}

// Only call this from an explicit user action (a Settings toggle) — never on launch or
// from a background effect. If the user has already said no and the OS won't ask again,
// this just returns 'denied' without a prompt.
export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'denied';
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  } catch (err) {
    console.warn('Could not request notification permission', err);
    return 'denied';
  }
}

// Runs are chained so a new plan's cancel-all can't land in the middle of an older
// plan's scheduling loop, the same way persistedStore.ts chains its writes.
let chain: Promise<void> = Promise.resolve();

// Replaces every pending local notification with this plan. Cancel-and-replay is simple
// and always correct here because this app only ever schedules through this one path —
// there's no other feature competing for the notification list.
export function applyNotificationPlan(plan: PlannedNotification[]): Promise<void> {
  chain = chain.then(() => replaceAll(plan));
  return chain;
}

async function replaceAll(plan: PlannedNotification[]): Promise<void> {
  if (!notificationsSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return;
    for (const item of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: { title: item.title, body: item.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
      });
    }
  } catch (err) {
    console.warn('Could not schedule notifications', err);
  }
}
