# Jinesist

A personal accountability coach for your phone. Built with Expo (SDK 57) and Google's Gemini API (free tier).

Five tabs:

- **Home** — the featured goal (100 push-ups in one set): scoreboard, progress bar, 7-day chart, quick log, tasks, and a Today strip showing what's on the schedule today.
- **Goals** — all goals with their own progress bars, plus a to-buy list.
- **Journal** — free-text entries stamped with the date and time.
- **Schedule** — recurring classes and one-off events: a week view (today highlighted) plus a "coming up" list.
- **Chat** — a tough-love coach that can see your data and change it for you.

Everything is stored on the device with AsyncStorage. Only the Chat screen calls an API; the rest works fully offline.

## Run it

```bash
npm install
cp .env.example .env      # optional: add your key (see below)
npm start                 # phone: scan the QR code with Expo Go
npm run web               # or open it in a browser at http://localhost:8081
```

Without a key the Chat screen runs in **mock mode** (a MOCK badge shows in its header) and understands a few typed commands: `log 24`, `remind me to <task>`, `note down <thought>`, `buy <item>`. Everything outside Chat behaves the same with or without a key.

> **Why not `npx expo start`?** The parent folder name (`Agent:Asisstant Jinesis`) contains a colon, which breaks how npm and npx add `node_modules/.bin` to `PATH`. The npm scripts call Expo's CLI through `node` directly to get around this. Renaming the folder to drop the colon also fixes it.

## Gemini API setup

**Gemini is the default and only needs a free-tier key** — that's the point of using it here instead of Claude. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey), put it in `.env`, then restart Expo:

```
EXPO_PUBLIC_GEMINI_API_KEY=AIza...
```

**Security note:** `EXPO_PUBLIC_*` values are compiled into the JavaScript bundle. That's fine for running on your own phone during development, but anyone with a build of the app could extract the key. Before sharing the app, move the API call behind a small server that holds the key.

| Variable | Default | Notes |
|---|---|---|
| `EXPO_PUBLIC_GEMINI_MODEL` | `gemini-2.5-flash` | Any Gemini model with function-calling support works. |
| `EXPO_PUBLIC_LLM_PROVIDER` | `gemini` | Set to `claude` to use the Claude API instead — needs a paid Anthropic key (`EXPO_PUBLIC_ANTHROPIC_API_KEY`, `EXPO_PUBLIC_ANTHROPIC_MODEL`). Everything else about the coach (personality, state block, tools, ambiguity handling) is identical either way. |
| `EXPO_PUBLIC_USE_MOCK` | `false` | `true` forces mock mode even with a key set. |

### Swapping providers

The coach's personality, tools, and turn logic don't belong to either provider:

- [personality.ts](src/agent/personality.ts) — the one shared system prompt
- [tools.ts](src/agent/tools.ts) — the 12 tools, defined once as plain `{name, description, properties, required}` specs, with two converters (`toAnthropicTools`, `toGeminiFunctionDeclarations`) that produce each provider's own wire format — uppercase `Schema.type` and a `nullable` flag for Gemini, `anyOf: [type, "null"]` and `additionalProperties: false` for Claude — from the same source
- [types.ts](src/agent/types.ts) — the `AgentBackend` interface both backends implement, and `TurnOutput` / `TurnError`

[claude.ts](src/agent/claude.ts) and [gemini.ts](src/agent/gemini.ts) each own only what's actually provider-specific: the HTTP call, their message/content wire shape, the tool-call loop against that shape, and mapping that provider's errors to a readable message. A stored chat transcript only replays on the backend whose shape it matches (checked at runtime); switching providers mid-history just falls back to that message's plain text instead of crashing.

## The coach (Chat)

**Personality:** direct, calls out excuses and inconsistency, always on your side, never cruel. Replies are 2–5 sentences, plain text, no emojis unless you use them first, at most one question per reply. It's in [personality.ts](src/agent/personality.ts), shared by every provider.

**What it can see.** Every message is sent with a freshly built state block ([context.ts](src/agent/context.ts)): the featured goal and progress, streak, best result, days to deadline, other goals, open tasks, unbought items, the 5 most recent journal entries (trimmed), today's and tomorrow's schedule, and today's date. Each item carries its id so the coach can act without guessing, and it's told never to ask for something already in the block. The block is kept small (a few hundred tokens) — the schedule only ever contributes today and tomorrow, never the whole semester.

**What it can do** ([tools.ts](src/agent/tools.ts)) — all offline, all against your local data:

| Tool | Effect |
|---|---|
| `log_progress` | Log a value toward a goal ("did 24 push-ups") |
| `create_goal` | New goal with title, target, best/cumulative, optional deadline |
| `set_deadline` | Set, change, or clear a goal's deadline |
| `add_task` / `complete_task` | Add a task, or check one off |
| `add_buy_item` / `mark_bought` | Add something to buy, or mark it bought |
| `save_journal_entry` | Save a thought to the journal |
| `get_recent_journal` | Read entries from the last N days |
| `add_event` | Add a recurring class or a one-off event |
| `delete_event` | Remove an event from the schedule |
| `get_schedule` | Read today, tomorrow, or the next 7 days |

When it can't tell which goal, task or item you mean, it's instructed to ask rather than guess. Every change appears in the chat as a green line, and the tool handlers check their own input, so a bad id or number comes back to the coach as an error it has to deal with instead of a crash.

**Errors:** a rejected key, rate limiting (including the free tier's), being offline, a refusal, or a malformed reply all come back as a readable message in the chat. If a tool already ran before the failure, that change is kept and stays visible.

## How a turn works

```
your message
   │
   ▼
build state block (goals, streak, tasks, to-buy, recent journal, today+tomorrow's schedule)
   │
   ▼
call the model ──► called a tool? ── yes ──► run it locally, send the result back, call again
   │                                          (up to 6 rounds)
   no
   ▼
short reply + a green line for each change
```

Each turn's raw provider messages (tool calls and results) are saved with the chat message and replayed exactly on later requests, so the conversation stays consistent. (On Claude this also means prompt caching can reuse the prefix; Gemini has no equivalent here.)

## Storage

| Key | Contents |
|---|---|
| `jinesist.coach.v2` | `{ goals, entries, tasks, toBuy }` |
| `jinesist.journal.v1` | `{ entries }` |
| `jinesist.schedule.v1` | `{ events }` — recurring and one-off events |
| `jinesis.messages.v1` | Chat history |
| `jinesist.coach.v1` | Stage 2 data, converted into the featured goal on first launch, then kept as a backup |
| `jinesis.data.v1` | The old Chat to-do/note lists. Open to-dos became tasks and notes became journal entries ([migrateChatData.ts](src/storage/migrateChatData.ts)); kept as a backup |

**Reset all data** (bottom of Home, behind a confirmation) clears goals, progress, tasks, the to-buy list, the journal, and the schedule. **Clear** in the Chat header only deletes the conversation.

### Goal types

- **Best result** (push-ups): only your highest single result counts. Logging again the same day replaces that day's entry, and the record never drops.
- **Cumulative** (money saved, books read): every log adds to the total.

**Day streak** counts consecutive days with a logged value above 0, back from today. If today isn't logged yet it counts from yesterday, so the streak doesn't break until the day is over.

## Schedule

Two kinds of event ([schedule/store.ts](src/schedule/store.ts)):

- **Recurring** — repeats weekly on one or more days (a class), with an optional start and end date (e.g. a semester).
- **One-off** — a single date (an exam, an appointment).

Every event has a title, start time, optional end time, optional location, and optional note. The Schedule screen shows the current week (today's row is highlighted) and a "coming up" list of each event's next occurrence, soonest first ([schedule/occurrences.ts](src/schedule/occurrences.ts)); tapping an event edits it, editing can delete it. Home's Today strip is the same data filtered to just today, with a compact "nothing scheduled" state when there's nothing on.

## Files

- [src/agent/](src/agent/) — coach personality, state block, tools, both provider backends, mock backend
- [src/coach/](src/coach/) — goal store, date maths, streak and chart calculations, amount formatting
- [src/journal/store.ts](src/journal/store.ts), [src/storage/](src/storage/) — journal and the shared AsyncStorage store
- [src/schedule/](src/schedule/) — event store, occurrence maths, time-of-day helpers, screen pieces
- [src/design/](src/design/) — theme, fonts, cards, buttons, dialogs
- [src/home/](src/home/), [src/goals/](src/goals/), [src/components/](src/components/) — screen pieces
- [src/screens/](src/screens/), [src/navigation/](src/navigation/) — the five screens and the tab bar

## Scripts

- `npm start` — Expo dev server
- `npm run web` — dev server, opened in a browser
- `npm run typecheck` — TypeScript, no emit
