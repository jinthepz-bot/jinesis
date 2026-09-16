import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppMessage } from './types';

const KEY = 'jinesis.messages.v1';

export async function loadMessages(): Promise<AppMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return markInterrupted(JSON.parse(raw) as AppMessage[]);
  } catch (err) {
    console.warn('Failed to load chat history', err);
    return [];
  }
}

export async function saveMessages(messages: AppMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(messages));
  } catch (err) {
    console.warn('Failed to save chat history', err);
  }
}

// A task that was mid-run when the app closed can't resume, so show it as stopped.
function markInterrupted(messages: AppMessage[]): AppMessage[] {
  return messages.map((m) => {
    if (m.kind !== 'task' || (m.status !== 'running' && m.status !== 'reporting')) return m;
    return {
      ...m,
      status: 'stopped',
      steps: m.steps.map((s) => (s.status === 'running' ? { ...s, status: 'stopped' } : s)),
    };
  });
}
