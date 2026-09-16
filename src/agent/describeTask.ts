import type { TaskMessage } from '../types';

// Multi-step tasks are no longer created (the coach personality replaced them), but
// older ones may still be in someone's history, so every backend can summarize one
// as a single turn of plain text.
export function describeTask(task: TaskMessage): string {
  const steps = task.steps.map((s, i) => `${i + 1}. ${s.title} (${s.status})`).join('\n');
  return `Task "${task.title}" steps:\n${steps}\n\n${task.result ?? 'This task did not finish.'}`;
}
