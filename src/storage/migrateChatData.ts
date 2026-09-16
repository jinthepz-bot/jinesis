import AsyncStorage from '@react-native-async-storage/async-storage';

import { addTask, coachReady } from '../coach/store';
import { addJournalEntry, journalReady } from '../journal/store';

const OLD_KEY = 'jinesis.data.v1'; // Stage 1 chat to-dos and notes
const FLAG_KEY = 'jinesist.chatDataMigrated.v1';

interface OldTodo {
  title?: unknown;
  due?: unknown;
  done?: unknown;
}

interface OldNote {
  text?: unknown;
  createdAt?: unknown;
}

// The Chat screen used to keep its own to-do and note lists. Those are now Home
// tasks and Journal entries, so bring the old data over once. Open to-dos become
// tasks (done ones are history), notes become journal entries keeping their time.
export async function migrateChatData(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(FLAG_KEY)) return;

    const raw = await AsyncStorage.getItem(OLD_KEY);
    if (raw) {
      const old = JSON.parse(raw) as { todos?: OldTodo[]; notes?: OldNote[] };
      await Promise.all([coachReady, journalReady]);

      for (const todo of Array.isArray(old.todos) ? old.todos : []) {
        if (typeof todo?.title !== 'string' || todo.done === true) continue;
        addTask(typeof todo.due === 'string' ? `${todo.title} (was due ${todo.due})` : todo.title);
      }
      for (const note of Array.isArray(old.notes) ? old.notes : []) {
        if (typeof note?.text !== 'string') continue;
        addJournalEntry(note.text, typeof note.createdAt === 'number' ? note.createdAt : undefined);
      }
    }

    await AsyncStorage.setItem(FLAG_KEY, new Date().toISOString());
  } catch (err) {
    console.warn('Failed to bring over old chat to-dos and notes', err);
  }
}
