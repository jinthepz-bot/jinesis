import type { ActionRecord, ApiMessage, AppMessage } from '../types';

export interface TurnOutput {
  text: string;
  actions: ActionRecord[];
  transcript?: ApiMessage[];
}

// Thrown when a turn fails or is stopped, carrying any tool calls that already
// ran so the app can still show them and keep them in the conversation.
export class TurnError extends Error {
  readonly actions: ActionRecord[];
  readonly transcript: ApiMessage[];

  constructor(message: string, actions: ActionRecord[], transcript: ApiMessage[]) {
    super(message);
    this.name = 'TurnError';
    this.actions = actions;
    this.transcript = transcript;
  }
}

export interface AgentBackend {
  // `context` is the snapshot of the user's data for this turn (see context.ts).
  respond(history: AppMessage[], context: string, signal: AbortSignal): Promise<TurnOutput>;
}
