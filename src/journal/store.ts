import { createPersistedStore } from '../storage/persistedStore';

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: number;
}

interface JournalState {
  entries: JournalEntry[]; // newest first
}

function normalize(raw: unknown): JournalState {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const entries = (Array.isArray(obj.entries) ? obj.entries : [])
    .filter(
      (e): e is JournalEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof e.id === 'string' &&
        typeof e.text === 'string' &&
        typeof e.createdAt === 'number',
    )
    .map(({ id, text, createdAt }) => ({ id, text, createdAt }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return { entries };
}

const store = createPersistedStore<JournalState>({
  key: 'jinesist.journal.v1',
  initial: { entries: [] },
  normalize,
  label: 'journal',
});

export const journalReady = store.ready;
export const getJournalState = store.get;
export const useJournal = () => store.useStore();

// Saves an entry stamped with the current date and time. `createdAt` is only passed
// when bringing over older data that already has a timestamp.
export function addJournalEntry(text: string, createdAt: number = Date.now()): JournalEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const entry: JournalEntry = {
    id: `journal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    createdAt,
  };
  store.update((s) => ({ entries: [entry, ...s.entries].sort((a, b) => b.createdAt - a.createdAt) }));
  return entry;
}

export function deleteJournalEntry(id: string) {
  store.update((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
}

export function resetJournal() {
  store.set({ entries: [] });
}
