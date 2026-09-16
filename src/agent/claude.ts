import Anthropic from '@anthropic-ai/sdk';

import { sentLabel } from '../dates';
import type { ActionRecord, AppMessage } from '../types';
import { describeTask } from './describeTask';
import { PERSONALITY } from './personality';
import { COACH_TOOL_SPECS, executeCoachTool, toAnthropicTools } from './tools';
import { TurnError, type AgentBackend, type TurnOutput } from './types';

const MAX_TOOL_ROUNDS = 6;
const MAX_TOKENS = 4000;

// This backend's own wire format. AppMessage.transcript is typed as the opaque
// ApiMessage (see ../types), so incoming transcripts are checked against
// isClaudeTranscript before being trusted as this shape (see toApiMessages).
type ClaudeMessage = Anthropic.Beta.BetaMessageParam;

const TOOLS = toAnthropicTools(COACH_TOOL_SPECS);

export function createClaudeBackend(options: { apiKey: string; model: string }): AgentBackend {
  // dangerouslyAllowBrowser: the key is bundled into the app (dev-only setup) and
  // the SDK would otherwise refuse to start when running on Expo web.
  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true });

  // Server-side refusal fallbacks are only wired up for Claude Opus 5 here.
  const fallbackParams =
    options.model === 'claude-opus-5'
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {};

  async function call(messages: ClaudeMessage[], context: string, signal: AbortSignal) {
    try {
      const response = await client.beta.messages.create(
        {
          model: options.model,
          max_tokens: MAX_TOKENS,
          // Medium effort keeps replies quick enough for a chat.
          output_config: { effort: 'medium' },
          tools: TOOLS,
          system: [
            // Stable prefix: cached across turns. The state block changes every turn,
            // so it goes after the cache breakpoint.
            { type: 'text', text: PERSONALITY, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: context },
          ],
          messages,
          ...fallbackParams,
        },
        { signal },
      );
      if (response.stop_reason === 'refusal') {
        throw new Error('Claude declined to help with this request.');
      }
      if (!Array.isArray(response.content)) {
        throw new Error('The Anthropic API returned a reply in an unexpected shape.');
      }
      return response;
    } catch (err) {
      throw friendlyError(err);
    }
  }

  return {
    async respond(history, context, signal): Promise<TurnOutput> {
      const base = toApiMessages(history);
      const transcript: ClaudeMessage[] = [];
      const actions: ActionRecord[] = [];

      try {
        for (let round = 1; ; round++) {
          const response = await call([...base, ...transcript], context, signal);
          const toolUses = response.content.filter(
            (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use',
          );

          if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
            // A tool call cut off by max_tokens may have incomplete input, so it is never run.
            const content = response.content.filter((b) => b.type !== 'tool_use');
            if (content.some((b) => b.type === 'text')) transcript.push({ role: 'assistant', content });
            const text = textOf(response);
            return { text: text || (actions.length > 0 ? 'Done.' : "I didn't get a reply. Try again?"), actions, transcript };
          }

          transcript.push({ role: 'assistant', content: response.content });

          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const use of toolUses) {
            const run = executeCoachTool(use.name, use.input);
            if (run.action) actions.push(run.action);
            results.push({
              type: 'tool_result',
              tool_use_id: use.id,
              content: run.content,
              ...(run.isError ? { is_error: true } : {}),
            });
          }
          // All results for one assistant message go back in a single user message.
          transcript.push({ role: 'user', content: results });

          if (round >= MAX_TOOL_ROUNDS) throw new Error('Stopped after too many tool calls in one reply.');
        }
      } catch (err) {
        throw new TurnError(err instanceof Error ? err.message : String(err), actions, transcript);
      }
    },
  };
}

// A stored transcript replays only if it is actually in this backend's wire format
// (someone may have chatted under a different provider before switching).
function isClaudeTranscript(value: unknown): value is ClaudeMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((m) => m !== null && typeof m === 'object' && 'role' in m && 'content' in m)
  );
}

// The API history is rebuilt from stored messages. Turns replay their stored
// transcripts (tool calls included) so the conversation stays consistent.
function toApiMessages(history: AppMessage[]): ClaudeMessage[] {
  const messages: ClaudeMessage[] = [];
  for (const m of history) {
    if (m.kind === 'task') {
      // Multi-step tasks are no longer created; older ones stay readable as a summary.
      messages.push({ role: 'assistant', content: describeTask(m) });
    } else if (m.role === 'user') {
      messages.push({ role: 'user', content: `[Sent: ${sentLabel(m.createdAt)}]\n${m.text}` });
    } else if (isClaudeTranscript(m.transcript)) {
      messages.push(...m.transcript);
    } else if (!m.isError) {
      messages.push({ role: 'assistant', content: m.text });
    }
  }
  // The API history must start with a plain user message.
  while (messages.length > 0 && !(messages[0].role === 'user' && typeof messages[0].content === 'string')) {
    messages.shift();
  }
  return messages;
}

function textOf(response: Anthropic.Beta.BetaMessage): string {
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim();
  if (response.stop_reason === 'max_tokens' && text) return `${text}\n\n(Reply was cut off.)`;
  return text;
}

function friendlyError(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) {
    return new Error('Your Anthropic API key was rejected. Check EXPO_PUBLIC_ANTHROPIC_API_KEY in .env and restart Expo.');
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new Error('Rate limited by the Anthropic API. Wait a moment and try again.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new Error("Couldn't reach the Anthropic API. Check your connection and try again.");
  }
  if (err instanceof Anthropic.APIError) {
    return new Error(`Claude API error${err.status ? ` (${err.status})` : ''}: ${err.message}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}
