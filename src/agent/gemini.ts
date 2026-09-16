import { sentLabel } from '../dates';
import type { ActionRecord, AppMessage } from '../types';
import { describeTask } from './describeTask';
import { PERSONALITY } from './personality';
import { COACH_TOOL_SPECS, executeCoachTool, toGeminiFunctionDeclarations } from './tools';
import { TurnError, type AgentBackend, type TurnOutput } from './types';

const MAX_TOOL_ROUNDS = 6;
const MAX_OUTPUT_TOKENS = 4000;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// This backend's own wire format (the Gemini REST `Content`/`Part` shapes).
// AppMessage.transcript is typed as the opaque ApiMessage (see ../types), so
// incoming transcripts are checked against isGeminiTranscript before being
// trusted as this shape (see toGeminiContents).
type Role = 'user' | 'model' | 'function';

interface FunctionCall {
  name: string;
  args?: Record<string, unknown>;
}

interface Part {
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface Content {
  role: Role;
  parts: Part[];
}

interface Candidate {
  content?: Content;
  finishReason?: string;
}

interface GenerateContentResponse {
  candidates?: Candidate[];
  promptFeedback?: { blockReason?: string };
}

const TOOLS = [{ functionDeclarations: toGeminiFunctionDeclarations(COACH_TOOL_SPECS) }];

export function createGeminiBackend(options: { apiKey: string; model: string }): AgentBackend {
  async function call(contents: Content[], context: string, signal: AbortSignal): Promise<GenerateContentResponse> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/${options.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
        body: JSON.stringify({
          contents,
          tools: TOOLS,
          // The personality is fixed; the state block changes every turn. Gemini has
          // no cache-breakpoint concept to split them on, so both go in as plain text.
          systemInstruction: { parts: [{ text: PERSONALITY }, { text: context }] },
          generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
        }),
        signal,
      });
    } catch {
      throw new Error("Couldn't reach the Gemini API. Check your connection and try again.");
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Gemini API error (${response.status}): could not read the response.`);
    }

    if (!response.ok) throw friendlyHttpError(response.status, body);

    const parsed = body as GenerateContentResponse;
    const candidate = parsed.candidates?.[0];
    if (parsed.promptFeedback?.blockReason || !candidate) {
      throw new Error('Gemini declined to help with this request.');
    }
    if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
      throw new Error(`Gemini declined to help with this request (${candidate.finishReason.toLowerCase()}).`);
    }
    return parsed;
  }

  return {
    async respond(history, context, signal): Promise<TurnOutput> {
      const base = toGeminiContents(history);
      const transcript: Content[] = [];
      const actions: ActionRecord[] = [];

      try {
        for (let round = 1; ; round++) {
          const response = await call([...base, ...transcript], context, signal);
          const candidate = response.candidates![0];
          const parts = candidate.content?.parts ?? [];
          const callParts = parts.filter((p) => p.functionCall);
          // A function call cut off by MAX_TOKENS may have incomplete args, so it is never run.
          const truncated = candidate.finishReason === 'MAX_TOKENS';

          if (callParts.length === 0 || truncated) {
            const textParts = parts.filter((p) => typeof p.text === 'string' && !p.functionCall);
            if (textParts.length > 0) transcript.push({ role: 'model', parts: textParts });
            const text = textParts
              .map((p) => p.text)
              .join('\n\n')
              .trim();
            const suffix = truncated && text ? '\n\n(Reply was cut off.)' : '';
            return {
              text: (text && `${text}${suffix}`) || (actions.length > 0 ? 'Done.' : "I didn't get a reply. Try again?"),
              actions,
              transcript,
            };
          }

          transcript.push({ role: 'model', parts: callParts });

          const responseParts: Part[] = [];
          for (const part of callParts) {
            const call_ = part.functionCall!;
            const run = executeCoachTool(call_.name, call_.args ?? {});
            if (run.action) actions.push(run.action);
            responseParts.push({
              functionResponse: { name: call_.name, response: run.isError ? { error: run.content } : safeParseObject(run.content) },
            });
          }
          // All results for one model turn go back in a single function turn.
          transcript.push({ role: 'function', parts: responseParts });

          if (round >= MAX_TOOL_ROUNDS) throw new Error('Stopped after too many tool calls in one reply.');
        }
      } catch (err) {
        throw new TurnError(err instanceof Error ? err.message : String(err), actions, transcript);
      }
    },
  };
}

// executeCoachTool's success results are always `JSON.stringify(someObject)` (see
// tools.ts's `ok()` helper), so this should never fall through to the catch - it's
// a defensive parse, not the expected path.
function safeParseObject(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : { result: parsed };
  } catch {
    return { result: json };
  }
}

// A stored transcript replays only if it is actually in this backend's wire format
// (someone may have chatted under a different provider before switching).
function isGeminiTranscript(value: unknown): value is Content[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((m) => m !== null && typeof m === 'object' && 'role' in m && Array.isArray((m as Content).parts))
  );
}

// The API history is rebuilt from stored messages. Turns replay their stored
// transcripts (tool calls included) so the conversation stays consistent.
function toGeminiContents(history: AppMessage[]): Content[] {
  const contents: Content[] = [];
  for (const m of history) {
    if (m.kind === 'task') {
      // Multi-step tasks are no longer created; older ones stay readable as a summary.
      contents.push({ role: 'model', parts: [{ text: describeTask(m) }] });
    } else if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: `[Sent: ${sentLabel(m.createdAt)}]\n${m.text}` }] });
    } else if (isGeminiTranscript(m.transcript)) {
      contents.push(...m.transcript);
    } else if (!m.isError) {
      contents.push({ role: 'model', parts: [{ text: m.text }] });
    }
  }
  // The API history must start with a user turn.
  while (contents.length > 0 && contents[0].role !== 'user') contents.shift();
  return contents;
}

function friendlyHttpError(status: number, body: unknown): Error {
  const apiMessage =
    typeof body === 'object' && body !== null && 'error' in body
      ? ((body as { error?: { message?: string } }).error?.message ?? undefined)
      : undefined;

  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(apiMessage ?? ''))) {
    return new Error('Your Gemini API key was rejected. Check EXPO_PUBLIC_GEMINI_API_KEY in .env and restart Expo.');
  }
  if (status === 429) {
    return new Error("Rate limited by the Gemini API's free tier. Wait a moment and try again.");
  }
  if (status >= 500) {
    return new Error(`Gemini API error (${status}): the service is temporarily unavailable. Try again shortly.`);
  }
  return new Error(`Gemini API error (${status})${apiMessage ? `: ${apiMessage}` : '.'}`);
}
