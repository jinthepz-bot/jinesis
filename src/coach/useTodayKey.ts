import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey } from './days';

// Today's local day key, refreshed when the date rolls over or the app comes back
// to the foreground, so the chart and streak don't go stale overnight.
export function useTodayKey(): string {
  const [key, setKey] = useState(() => dayKey());

  useEffect(() => {
    const check = () => setKey(dayKey());
    const timer = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return key;
}
