// One backend's raw wire messages for a turn (tool calls and results included),
// stored so later requests can replay the conversation exactly as it happened.
// Each provider (see src/agent/) defines and validates its own shape; this stays
// opaque here so switching providers can never be a type error, only a provider
// choosing not to replay a transcript it doesn't recognize (see e.g. claude.ts's
// isClaudeTranscript).
export type ApiMessage = unknown;

export type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'stopped';

// 'reporting' = all steps finished, the assistant is writing the final report.
export type TaskStatus = 'running' | 'reporting' | 'done' | 'error' | 'stopped';

export type ActionKind =
  | 'progress_logged'
  | 'goal_created'
  | 'deadline_set'
  | 'task_added'
  | 'task_completed'
  | 'buy_added'
  | 'buy_bought'
  | 'journal_saved'
  | 'event_added'
  | 'event_deleted';

// A change the assistant made to the user's data, shown in the chat.
export interface ActionRecord {
  kind: ActionKind;
  label: string;
}

export interface TaskStep {
  title: string;
  status: StepStatus;
  output?: string;
  actions?: ActionRecord[];
  transcript?: ApiMessage[];
}

export interface TextMessage {
  id: string;
  kind: 'text';
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  actions?: ActionRecord[];
  transcript?: ApiMessage[];
  createdAt: number;
}

export interface TaskMessage {
  id: string;
  kind: 'task';
  role: 'assistant';
  title: string;
  steps: TaskStep[];
  status: TaskStatus;
  result?: string;
  error?: string;
  // Changes made while planning or writing the report (step changes live on steps).
  actions?: ActionRecord[];
  // The planning turn, ending with the start_task tool result.
  transcript?: ApiMessage[];
  createdAt: number;
}

export type AppMessage = TextMessage | TaskMessage;

// What the assistant is doing right now, shown in the header.
export type Activity = { kind: 'idle' } | { kind: 'thinking' };

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
