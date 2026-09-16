import type Anthropic from '@anthropic-ai/sdk';

import { addDays, dayKey, formatDayKey, formatTime, isDayKey } from '../coach/days';
import { formatAmount, roundAmount } from '../coach/format';
import { goalProgress } from '../coach/stats';
import {
  addBuyItem,
  addTask,
  createGoal,
  getCoachState,
  logProgress,
  setGoalDeadline,
  toggleBought,
  toggleTask,
  type Goal,
} from '../coach/store';
import { addJournalEntry, getJournalState } from '../journal/store';
import { describeEventDays, describeEventTime } from '../schedule/format';
import { eventsOnDay } from '../schedule/occurrences';
import { addEvent, deleteEvent, getScheduleState, type EventType, type ScheduleEvent } from '../schedule/store';
import { isTimeKey } from '../schedule/time';
import type { ActionRecord } from '../types';

const DAY_FORMAT = 'Local date "YYYY-MM-DD".';
const TIME_FORMAT = '24-hour "HH:MM", e.g. "10:15".';
const MAX_JOURNAL_RESULTS = 20;
const MAX_SCHEDULE_RESULTS = 20;

const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

// "mon,wed" or "Mon + Wed" -> [1, 3]. Unrecognized words are dropped rather than
// failing the whole call, since a good partial match beats a confusing rejection.
function parseWeekdays(raw: string): number[] {
  const days = raw
    .split(/[,+/&]|\s+and\s+|\s+/i)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => WEEKDAY_NAMES[s])
    .filter((n): n is number => n !== undefined);
  return [...new Set(days)].sort((a, b) => a - b);
}

// Every tool the coach can call, in a shape neutral to any provider: a flat set of
// string/number fields (no nesting), which is all nine tools need. `toAnthropicTools`
// and `toGeminiFunctionDeclarations` below turn this into each provider's own wire
// format; `executeCoachTool` (further down) runs a call from either one the same way.
type FieldType = 'string' | 'number';

interface ToolField {
  type: FieldType;
  description?: string;
  enum?: string[];
  // The field may be sent as an explicit null (e.g. to clear a deadline).
  nullable?: boolean;
}

export interface ToolSpec {
  name: string;
  description: string;
  properties: Record<string, ToolField>;
  required: string[];
}

export const COACH_TOOL_SPECS: ToolSpec[] = [
  {
    name: 'log_progress',
    description:
      "Log progress toward a goal. Use it when the user says they did something countable (\"did 24 push-ups\", " +
      '"saved 50 today"). For a best-result goal this replaces today\'s entry and only raises the record if it is ' +
      'higher; for a cumulative goal it adds to the total.',
    properties: {
      goal_id: { type: 'string', description: 'Exact goal id from CURRENT STATE.' },
      value: { type: 'number', description: 'How much, as a positive number.' },
      note: { type: 'string', description: "Optional short note in the user's words." },
    },
    required: ['goal_id', 'value'],
  },
  {
    name: 'create_goal',
    description:
      'Create a new goal. Only when the user asks for one. Ask first if the target number or the type is unclear.',
    properties: {
      title: { type: 'string', description: 'Short goal title.' },
      target: { type: 'number', description: 'Target number to reach.' },
      type: {
        type: 'string',
        enum: ['best', 'cumulative'],
        description:
          '"best" when the highest single result counts (push-ups in one set); ' +
          '"cumulative" when logged values add up (money saved, books read).',
      },
      deadline: { type: 'string', description: `Optional deadline. ${DAY_FORMAT}` },
    },
    required: ['title', 'target', 'type'],
  },
  {
    name: 'set_deadline',
    description: "Set, change, or clear a goal's deadline.",
    properties: {
      goal_id: { type: 'string', description: 'Exact goal id from CURRENT STATE.' },
      date: { type: 'string', nullable: true, description: `The deadline. ${DAY_FORMAT} Use null to remove it.` },
    },
    required: ['goal_id', 'date'],
  },
  {
    name: 'add_task',
    description:
      'Add a task to the user\'s list ("remind me to email my professor"). For things to do, not things to buy.',
    properties: { text: { type: 'string', description: "The task in the user's words." } },
    required: ['text'],
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done. Use the exact task id from CURRENT STATE.',
    properties: { task_id: { type: 'string' } },
    required: ['task_id'],
  },
  {
    name: 'add_buy_item',
    description: 'Add something the user wants to buy, with an optional price.',
    properties: {
      name: { type: 'string' },
      price: { type: 'number', description: 'Optional price as a number.' },
    },
    required: ['name'],
  },
  {
    name: 'mark_bought',
    description: 'Mark a to-buy item as bought. Use the exact item id from CURRENT STATE.',
    properties: { item_id: { type: 'string' } },
    required: ['item_id'],
  },
  {
    name: 'save_journal_entry',
    description:
      'Save a journal entry when the user wants a thought written down ("note down that..."). ' +
      'The app stamps the date and time automatically.',
    properties: { text: { type: 'string', description: "The entry in the user's words." } },
    required: ['text'],
  },
  {
    name: 'get_recent_journal',
    description:
      'Read journal entries from the last N days. Only needed to look further back than the entries already in ' +
      'CURRENT STATE. Changes nothing.',
    properties: { days: { type: 'number', description: 'How many days back to read.' } },
    required: ['days'],
  },
  {
    name: 'add_event',
    description:
      'Add a class, exam, appointment, or deadline to the schedule. For a recurring class use type "recurring" ' +
      'and day_of_week; for a single date (exam, appointment) use type "one-off" and date.',
    properties: {
      title: { type: 'string', description: 'Short event title.' },
      type: {
        type: 'string',
        enum: ['recurring', 'one-off'],
        description: '"recurring" for something that repeats weekly, "one-off" for a single date.',
      },
      day_of_week: {
        type: 'string',
        nullable: true,
        description:
          'Required when type is "recurring". Comma-separated weekday names it repeats on, e.g. "mon,wed".',
      },
      date: {
        type: 'string',
        nullable: true,
        description: `Required when type is "one-off". The event's date. ${DAY_FORMAT}`,
      },
      start_date: {
        type: 'string',
        nullable: true,
        description: `Optional, recurring only: when it starts repeating, e.g. a semester start. ${DAY_FORMAT}`,
      },
      end_date: {
        type: 'string',
        nullable: true,
        description: `Optional, recurring only: when it stops repeating, e.g. a semester end. ${DAY_FORMAT}`,
      },
      start_time: { type: 'string', description: `Start time. ${TIME_FORMAT}` },
      end_time: { type: 'string', nullable: true, description: `Optional end time. ${TIME_FORMAT}` },
      location: { type: 'string', nullable: true, description: 'Optional location.' },
      note: { type: 'string', nullable: true, description: 'Optional note.' },
    },
    required: ['title', 'type', 'start_time'],
  },
  {
    name: 'delete_event',
    description: 'Remove an event from the schedule. Use the exact event id from CURRENT STATE.',
    properties: { event_id: { type: 'string' } },
    required: ['event_id'],
  },
  {
    name: 'get_schedule',
    description:
      "Read the user's schedule for a range. Only needed to look further than what's already in CURRENT STATE " +
      '(which already has today and tomorrow). Changes nothing.',
    properties: {
      range: { type: 'string', enum: ['today', 'tomorrow', 'this_week'], description: 'Which range to read.' },
    },
    required: ['range'],
  },
];

export function toAnthropicTools(specs: ToolSpec[]): Anthropic.Beta.BetaTool[] {
  return specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    strict: true,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(spec.properties).map(([key, field]) => [
          key,
          field.nullable
            ? { anyOf: [{ type: field.type }, { type: 'null' }], description: field.description }
            : { type: field.type, description: field.description, enum: field.enum },
        ]),
      ),
      required: spec.required,
      additionalProperties: false,
    },
  }));
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: 'STRING' | 'NUMBER'; description?: string; enum?: string[]; nullable?: boolean }>;
    required: string[];
  };
}

const GEMINI_TYPE: Record<FieldType, 'STRING' | 'NUMBER'> = { string: 'STRING', number: 'NUMBER' };

// Gemini's Schema object has no `additionalProperties` and spells nullability as its
// own `nullable: true` flag rather than Anthropic's `anyOf: [type, "null"]`.
export function toGeminiFunctionDeclarations(specs: ToolSpec[]): GeminiFunctionDeclaration[] {
  return specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    parameters: {
      type: 'OBJECT',
      properties: Object.fromEntries(
        Object.entries(spec.properties).map(([key, field]) => [
          key,
          { type: GEMINI_TYPE[field.type], description: field.description, enum: field.enum, nullable: field.nullable },
        ]),
      ),
      required: spec.required,
    },
  }));
}

export interface ToolRun {
  content: string;
  isError?: boolean;
  action?: ActionRecord;
}

const fail = (content: string): ToolRun => ({ content, isError: true });
const ok = (result: unknown, action?: ActionRecord): ToolRun => ({ content: JSON.stringify(result), action });

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const positiveNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? roundAmount(value) : null;

function findGoal(id: unknown): Goal | ToolRun {
  const goal = typeof id === 'string' ? getCoachState().goals.find((g) => g.id === id) : undefined;
  return goal ?? fail(`No goal has id "${String(id)}". Use an id from CURRENT STATE.`);
}

function describeGoalResult(goal: Goal) {
  const { percent, done } = goalProgress(goal);
  return {
    id: goal.id,
    title: goal.title,
    current: goal.current,
    target: goal.target,
    percent,
    reached: done,
    deadline: goal.deadline,
  };
}

// Runs one tool call from the coach against the local stores, regardless of which
// provider produced it. Input is checked here, so bad input comes back to the model
// as an error result instead of throwing.
export function executeCoachTool(name: string, rawInput: unknown): ToolRun {
  const input = (typeof rawInput === 'object' && rawInput !== null ? rawInput : {}) as Record<string, unknown>;

  switch (name) {
    case 'log_progress': {
      const goal = findGoal(input.goal_id);
      if ('content' in goal) return goal;
      const value = positiveNumber(input.value);
      if (value === null) return fail('value must be a positive number.');
      const result = logProgress(goal.id, value, text(input.note) ?? '', dayKey());
      if (!result) return fail('Could not log that progress.');
      const updated = getCoachState().goals.find((g) => g.id === goal.id)!;
      const unit = goal.unit ? ` ${goal.unit}` : '';
      return ok(
        { logged: value, ...describeGoalResult(updated), is_new_best: result.isNewBest },
        {
          kind: 'progress_logged',
          label: `Logged ${formatAmount(value)}${unit} to "${goal.title}"${result.isNewBest ? ' · new best' : ''}`,
        },
      );
    }

    case 'create_goal': {
      const title = text(input.title);
      const target = positiveNumber(input.target);
      const type = input.type === 'best' || input.type === 'cumulative' ? input.type : null;
      if (!title) return fail('title is required.');
      if (target === null) return fail('target must be a positive number.');
      if (!type) return fail('type must be "best" or "cumulative".');
      const rawDeadline = text(input.deadline);
      if (rawDeadline && !isDayKey(rawDeadline)) return fail(`deadline "${rawDeadline}" is not valid. ${DAY_FORMAT}`);
      const goal = createGoal({ title, target, type, deadline: rawDeadline ?? null });
      if (!goal) return fail('Could not create that goal.');
      return ok({ created: describeGoalResult(goal) }, { kind: 'goal_created', label: `Created goal "${goal.title}"` });
    }

    case 'set_deadline': {
      const goal = findGoal(input.goal_id);
      if ('content' in goal) return goal;
      const raw = text(input.date);
      if (raw && !isDayKey(raw)) return fail(`date "${raw}" is not valid. ${DAY_FORMAT} Use null to clear it.`);
      setGoalDeadline(goal.id, raw ?? null);
      const updated = getCoachState().goals.find((g) => g.id === goal.id)!;
      return ok(
        { updated: describeGoalResult(updated) },
        {
          kind: 'deadline_set',
          label: raw
            ? `Deadline for "${goal.title}" set to ${formatDayKey(raw)}`
            : `Removed deadline from "${goal.title}"`,
        },
      );
    }

    case 'add_task': {
      const value = text(input.text);
      if (!value) return fail('text is required.');
      addTask(value);
      const task = getCoachState().tasks.at(-1)!;
      return ok({ added: { id: task.id, text: task.text } }, { kind: 'task_added', label: `Added task "${task.text}"` });
    }

    case 'complete_task': {
      const id = text(input.task_id);
      const task = getCoachState().tasks.find((t) => t.id === id);
      if (!task) return fail(`No task has id "${String(input.task_id)}". Use an id from CURRENT STATE.`);
      if (task.done) return ok({ already_done: { id: task.id, text: task.text } });
      toggleTask(task.id);
      return ok(
        { completed: { id: task.id, text: task.text } },
        { kind: 'task_completed', label: `Completed "${task.text}"` },
      );
    }

    case 'add_buy_item': {
      const name_ = text(input.name);
      if (!name_) return fail('name is required.');
      const price = input.price === undefined || input.price === null ? null : positiveNumber(input.price);
      if (input.price !== undefined && input.price !== null && price === null) {
        return fail('price must be a positive number.');
      }
      addBuyItem(name_, price);
      const item = getCoachState().toBuy.at(-1)!;
      return ok(
        { added: { id: item.id, name: item.name, price: item.price } },
        {
          kind: 'buy_added',
          label: `Added "${item.name}" to buy${item.price !== null ? ` · ${formatAmount(item.price)}` : ''}`,
        },
      );
    }

    case 'mark_bought': {
      const id = text(input.item_id);
      const item = getCoachState().toBuy.find((b) => b.id === id);
      if (!item) return fail(`No to-buy item has id "${String(input.item_id)}". Use an id from CURRENT STATE.`);
      if (item.bought) return ok({ already_bought: { id: item.id, name: item.name } });
      toggleBought(item.id);
      return ok(
        { bought: { id: item.id, name: item.name } },
        { kind: 'buy_bought', label: `Marked "${item.name}" as bought` },
      );
    }

    case 'save_journal_entry': {
      const value = text(input.text);
      if (!value) return fail('text is required.');
      const entry = addJournalEntry(value);
      if (!entry) return fail('Could not save that entry.');
      return ok(
        { saved: { id: entry.id, saved_at: `${formatDayKey(dayKey(new Date(entry.createdAt)))} ${formatTime(entry.createdAt)}` } },
        { kind: 'journal_saved', label: `Saved journal entry: "${truncateLabel(value)}"` },
      );
    }

    case 'get_recent_journal': {
      const days = typeof input.days === 'number' && Number.isFinite(input.days) ? Math.max(1, Math.floor(input.days)) : null;
      if (days === null) return fail('days must be a number.');
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const entries = getJournalState()
        .entries.filter((e) => e.createdAt >= cutoff)
        .slice(0, MAX_JOURNAL_RESULTS)
        .map((e) => ({
          saved_at: `${formatDayKey(dayKey(new Date(e.createdAt)))} ${formatTime(e.createdAt)}`,
          text: e.text,
        }));
      return ok({ days, count: entries.length, entries });
    }

    case 'add_event': {
      const title = text(input.title);
      if (!title) return fail('title is required.');
      const type: EventType | null = input.type === 'recurring' || input.type === 'one-off' ? input.type : null;
      if (!type) return fail('type must be "recurring" or "one-off".');

      const startTime = text(input.start_time);
      if (!startTime || !isTimeKey(startTime)) {
        return fail(`start_time "${String(input.start_time)}" is not valid. ${TIME_FORMAT}`);
      }
      const endTime = text(input.end_time);
      if (endTime && !isTimeKey(endTime)) return fail(`end_time "${endTime}" is not valid. ${TIME_FORMAT}`);

      let days: number[] = [];
      let date: string | null = null;
      let startDate: string | null = null;
      let endDate: string | null = null;

      if (type === 'recurring') {
        const raw = text(input.day_of_week);
        if (!raw) return fail('day_of_week is required for a recurring event, e.g. "mon,wed".');
        days = parseWeekdays(raw);
        if (days.length === 0) return fail(`day_of_week "${raw}" could not be understood. Use names like "mon,wed".`);
        const rawStart = text(input.start_date);
        if (rawStart && !isDayKey(rawStart)) return fail(`start_date "${rawStart}" is not valid. ${DAY_FORMAT}`);
        const rawEnd = text(input.end_date);
        if (rawEnd && !isDayKey(rawEnd)) return fail(`end_date "${rawEnd}" is not valid. ${DAY_FORMAT}`);
        startDate = rawStart ?? null;
        endDate = rawEnd ?? null;
      } else {
        const rawDate = text(input.date);
        if (!rawDate || !isDayKey(rawDate)) {
          return fail(`date "${String(input.date)}" is not valid. ${DAY_FORMAT} Required for a one-off event.`);
        }
        date = rawDate;
      }

      const event = addEvent({
        title,
        type,
        days,
        date,
        startDate,
        endDate,
        startTime,
        endTime: endTime ?? null,
        location: text(input.location) ?? '',
        note: text(input.note) ?? '',
      });
      if (!event) return fail('Could not create that event.');
      return ok(
        { created: describeEventResult(event) },
        { kind: 'event_added', label: `Added "${event.title}" to schedule` },
      );
    }

    case 'delete_event': {
      const id = text(input.event_id);
      const event = getScheduleState().events.find((e) => e.id === id);
      if (!event) return fail(`No event has id "${String(input.event_id)}". Use an id from CURRENT STATE.`);
      deleteEvent(event.id);
      return ok(
        { deleted: { id: event.id, title: event.title } },
        { kind: 'event_deleted', label: `Removed "${event.title}" from schedule` },
      );
    }

    case 'get_schedule': {
      const range = input.range;
      if (range !== 'today' && range !== 'tomorrow' && range !== 'this_week') {
        return fail('range must be "today", "tomorrow", or "this_week".');
      }
      const today = dayKey();
      const events = getScheduleState().events;
      if (range === 'this_week') {
        const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
        const results = days.flatMap((d) => eventsOnDay(events, d).map((e) => describeEventResult(e, d)));
        return ok({ range, count: results.length, events: results.slice(0, MAX_SCHEDULE_RESULTS) });
      }
      const day = range === 'today' ? today : addDays(today, 1);
      const results = eventsOnDay(events, day).map((e) => describeEventResult(e, day));
      return ok({ range, count: results.length, events: results });
    }

    default:
      return fail(`Unknown tool "${name}".`);
  }
}

function describeEventResult(event: ScheduleEvent, onDay?: string) {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    when: onDay ? formatDayKey(onDay) : describeEventDays(event, dayKey()),
    time: describeEventTime(event),
    location: event.location || undefined,
    note: event.note || undefined,
  };
}

function truncateLabel(value: string): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 59)}…` : oneLine;
}
