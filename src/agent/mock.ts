import { getFeaturedGoal, getCoachState } from '../coach/store';
import { config } from '../config';
import type { ActionRecord } from '../types';
import { executeCoachTool } from './tools';
import type { AgentBackend, TurnOutput } from './types';

const KEY_HINT =
  config.provider === 'claude'
    ? 'your Anthropic API key (EXPO_PUBLIC_ANTHROPIC_API_KEY)'
    : 'your Gemini API key (EXPO_PUBLIC_GEMINI_API_KEY)';

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('Stopped'));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Stopped'));
    });
  });
}

const randomDelay = () => 600 + Math.random() * 700;

function runTool(name: string, input: Record<string, unknown>): ActionRecord[] {
  const { action } = executeCoachTool(name, input);
  return action ? [action] : [];
}

// Rough keyword matching so the coach tools can be tried without an API key.
function mockReply(text: string): TurnOutput {
  const log = /^(?:log|did|done)\s+(\d+(?:\.\d+)?)/i.exec(text);
  if (log) {
    const featured = getFeaturedGoal(getCoachState());
    return {
      text: `(Mock) Logged ${log[1]} to ${featured.title}. Claude would tell you whether that's good enough.`,
      actions: runTool('log_progress', { goal_id: featured.id, value: Number(log[1]) }),
    };
  }

  const task = /^(?:remind me to|add task)\s+(.+)/i.exec(text);
  if (task) {
    return { text: '(Mock) Added that task.', actions: runTool('add_task', { text: task[1] }) };
  }

  const note = /^(?:note(?: down)?(?: that)?|journal)\s+(.+)/i.exec(text);
  if (note) {
    return {
      text: '(Mock) Saved that note.',
      actions: runTool('save_note', { type: 'quick', content: note[1] }),
    };
  }

  const buy = /^(?:buy|add to buy)\s+(.+)/i.exec(text);
  if (buy) {
    return { text: '(Mock) Added it to the to-buy list.', actions: runTool('add_buy_item', { name: buy[1] }) };
  }

  return {
    text:
      `(Mock coach) Add ${KEY_HINT} to .env for the real thing. ` +
      'Try "log 24", "remind me to email my professor", "note down that I felt strong", or "buy chalk".',
    actions: [],
  };
}

export const mockBackend: AgentBackend = {
  async respond(history, _context, signal) {
    await sleep(randomDelay(), signal);
    const last = history[history.length - 1];
    return mockReply(last?.kind === 'text' ? last.text : '');
  },
};
