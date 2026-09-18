import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { describeDayDistance, formatDayKey } from '../coach/days';
import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { Sheet } from '../design/Sheet';
import { colors, radius, spacing } from '../design/theme';
import { Button, fieldStyles } from '../design/ui';
import { MonthCalendar } from '../home/MonthCalendar';
import { EVENT_COLORS, type EventColor, type EventType, type NewEventInput, type ScheduleEvent } from './store';
import { isTimeKey, sanitizeTimeInput } from './time';

interface Props {
  visible: boolean;
  todayKey: string;
  editing: ScheduleEvent | null; // null = creating a new event
  onCancel: () => void;
  onSave: (input: NewEventInput) => void;
  onDelete?: () => void;
}

const TYPES: { value: EventType; label: string; hint: string }[] = [
  { value: 'recurring', label: 'Recurring', hint: 'Repeats weekly, like a class — pick which day(s).' },
  { value: 'one-off', label: 'One-off', hint: 'A single date, like an exam or appointment.' },
];

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' },
];

const WEEKDAY_CHIPS: { value: number; label: string }[] = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];

const COLOR_LABELS: Record<EventColor, string> = {
  accent: 'Amber',
  soft: 'Muted amber',
  strong: 'Rust',
  success: 'Sage',
};

export function EventForm({ visible, onCancel, ...rest }: Props) {
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <FormBody onCancel={onCancel} {...rest} />
    </Sheet>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const type = useType();
  return (
    <View style={[styles.field, style]}>
      <Text style={type.label}>{label}</Text>
      {children}
    </View>
  );
}

// A date field that can be picked, changed, and (when `required` is false) cleared.
function DateField({
  label,
  value,
  todayKey,
  required,
  onChange,
}: {
  label: string;
  value: string | null;
  todayKey: string;
  required: boolean;
  onChange: (day: string | null) => void;
}) {
  const type = useType();
  const [open, setOpen] = useState(false);
  return (
    <Field label={label}>
      <View style={styles.dateRow}>
        <Text style={[type.mono, styles.dateText]}>
          {value ? `${formatDayKey(value, todayKey)} · ${describeDayDistance(todayKey, value)}` : 'None'}
        </Text>
        {value && !required ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
            <Text style={[type.label, styles.clearText]}>Clear</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setOpen((o) => !o)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={open ? `Hide ${label} calendar` : `Pick ${label}`}
        >
          <Text style={[type.label, styles.pickText]}>{open ? 'Hide' : value ? 'Change' : 'Pick'}</Text>
        </Pressable>
      </View>
      {open ? (
        <MonthCalendar
          selected={value}
          todayKey={todayKey}
          onSelect={(day) => {
            onChange(day);
            setOpen(false);
          }}
        />
      ) : null}
    </Field>
  );
}

function FormBody({ todayKey, editing, onCancel, onSave, onDelete }: Omit<Props, 'visible'>) {
  const type = useType();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [eventType, setEventType] = useState<EventType>(editing?.type ?? 'recurring');
  const [days, setDays] = useState<number[]>(editing?.days ?? []);
  const [date, setDate] = useState<string | null>(editing?.date ?? null);
  const [startDate, setStartDate] = useState<string | null>(editing?.startDate ?? null);
  const [endDate, setEndDate] = useState<string | null>(editing?.endDate ?? null);
  const [startTime, setStartTime] = useState(editing?.startTime ?? '');
  const [endTime, setEndTime] = useState(editing?.endTime ?? '');
  const [color, setColor] = useState<EventColor>(editing?.color ?? 'accent');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(editing?.reminderMinutesBefore ?? null);

  const toggleDay = (value: number) =>
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b)));

  const startTimeValid = isTimeKey(startTime);
  const endTimeValid = endTime.trim() === '' || isTimeKey(endTime);
  const canSave =
    title.trim() !== '' &&
    startTimeValid &&
    endTimeValid &&
    (eventType === 'recurring' ? days.length > 0 : date !== null);

  const save = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      type: eventType,
      days,
      date,
      startDate,
      endDate,
      startTime,
      endTime: endTime.trim() === '' ? null : endTime,
      color,
      location,
      note,
      reminderMinutesBefore,
    });
  };

  const confirmDelete = () => {
    if (!onDelete) return;
    confirmDestructive({
      title: `Delete "${title.trim() || 'this event'}"?`,
      confirmLabel: 'Delete',
      onConfirm: onDelete,
    });
  };

  return (
    <>
      <Text style={[type.display, styles.heading]}>{editing ? 'EDIT EVENT' : 'NEW EVENT'}</Text>

      <Field label="Title">
        <TextInput
          style={[fieldStyles.input, fieldStyles.single, type.body]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. German A2"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          autoFocus
          accessibilityLabel="Event title"
        />
      </Field>

      <Field label="Type">
        <View style={styles.segment} accessibilityRole="radiogroup">
          {TYPES.map((option) => {
            const selected = option.value === eventType;
            return (
              <Pressable
                key={option.value}
                style={[styles.segmentOption, selected && styles.segmentSelected]}
                onPress={() => setEventType(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                accessibilityLabel={option.label}
              >
                <Text style={[type.label, selected && styles.segmentTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={type.mono}>{TYPES.find((t) => t.value === eventType)!.hint}</Text>
      </Field>

      {eventType === 'recurring' ? (
        <>
          <Field label="Days">
            <View style={styles.weekdays} accessibilityRole="none">
              {WEEKDAY_CHIPS.map(({ value, label }, i) => {
                const selected = days.includes(value);
                return (
                  <Pressable
                    key={`${value}-${i}`}
                    onPress={() => toggleDay(value)}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    accessibilityLabel={`Toggle ${label}`}
                  >
                    <Text style={[type.label, selected && styles.dayChipTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <DateField label="Starts (optional)" value={startDate} todayKey={todayKey} required={false} onChange={setStartDate} />
          <DateField label="Ends (optional)" value={endDate} todayKey={todayKey} required={false} onChange={setEndDate} />
        </>
      ) : (
        <DateField label="Date" value={date} todayKey={todayKey} required onChange={setDate} />
      )}

      <View style={styles.timeRow}>
        <Field label="Start time" style={styles.timeField}>
          <TextInput
            style={[fieldStyles.input, fieldStyles.single, type.mono, styles.timeInput, !startTimeValid && startTime !== '' && styles.invalid]}
            value={startTime}
            onChangeText={(t) => setStartTime(sanitizeTimeInput(t))}
            placeholder="10:15"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            keyboardAppearance="dark"
            accessibilityLabel="Start time"
          />
        </Field>
        <Field label="End (optional)" style={styles.timeField}>
          <TextInput
            style={[fieldStyles.input, fieldStyles.single, type.mono, styles.timeInput, !endTimeValid && styles.invalid]}
            value={endTime}
            onChangeText={(t) => setEndTime(sanitizeTimeInput(t))}
            placeholder="11:45"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            keyboardAppearance="dark"
            accessibilityLabel="End time"
          />
        </Field>
      </View>

      <Field label="Colour">
        <View style={styles.colorOptions} accessibilityRole="radiogroup">
          {EVENT_COLORS.map((option) => {
            const selected = option === color;
            return (
              <Pressable
                key={option}
                onPress={() => setColor(option)}
                style={[styles.colorOption, selected && styles.colorOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={COLOR_LABELS[option]}
              >
                <View style={[styles.colorDot, styles[`color_${option}`]]} />
                <Text style={[type.label, selected && styles.colorTextSelected]}>{COLOR_LABELS[option]}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Location (optional)">
        <TextInput
          style={[fieldStyles.input, fieldStyles.single, type.body]}
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. HS 5"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          accessibilityLabel="Location"
        />
      </Field>

      <Field label="Note (optional)">
        <TextInput
          style={[fieldStyles.input, fieldStyles.single, type.body]}
          value={note}
          onChangeText={setNote}
          placeholder="Anything else worth remembering"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          accessibilityLabel="Note"
        />
      </Field>

      <Field label="Remind me before it starts">
        <View style={styles.reminderOptions} accessibilityRole="radiogroup">
          {REMINDER_OPTIONS.map((option) => {
            const selected = option.value === reminderMinutesBefore;
            return (
              <Pressable
                key={String(option.value)}
                style={[styles.reminderChip, selected && styles.segmentSelected]}
                onPress={() => setReminderMinutesBefore(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                accessibilityLabel={`Remind me ${option.label === 'None' ? 'never' : option.label + ' before'}`}
              >
                <Text style={[type.label, selected && styles.segmentTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <View style={styles.actions}>
        <View style={styles.actionsStart}>
          {onDelete ? (
            <Pressable onPress={confirmDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete event">
              <Text style={[type.label, styles.deleteText]}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
        <Button label="Cancel" variant="secondary" onPress={onCancel} />
        <Button label="Save" onPress={save} disabled={!canSave} accessibilityLabel="Save event" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 34, lineHeight: 38, letterSpacing: 1 },
  field: { gap: 6 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: 3,
  },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.control - 2 },
  segmentSelected: { backgroundColor: colors.accent },
  segmentTextSelected: { color: colors.onAccent },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reminderChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  weekdays: { flexDirection: 'row', gap: 6 },
  dayChip: {
    flex: 1,
    height: 36,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipTextSelected: { color: colors.onAccent },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 28 },
  dateText: { flex: 1, color: colors.text },
  clearText: { color: colors.accentStrong },
  pickText: { color: colors.accent },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  // Flexbox children default to a min-width based on their unwrapped content, which let
  // "End time (optional)" push past the sheet's edge on a narrow phone instead of
  // wrapping. flex: 1 + minWidth: 0 forces both halves to actually share the row.
  timeField: { flex: 1, minWidth: 0 },
  timeInput: { flex: 1 },
  invalid: { borderColor: colors.accentStrong },
  colorOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border },
  colorOptionSelected: { backgroundColor: colors.surface2, borderColor: colors.accent },
  colorTextSelected: { color: colors.accent },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  color_accent: { backgroundColor: colors.accent },
  color_soft: { backgroundColor: colors.accentSoft },
  color_strong: { backgroundColor: colors.accentStrong },
  color_success: { backgroundColor: colors.success },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  actionsStart: { flex: 1, alignItems: 'flex-start' },
  deleteText: { color: colors.accentStrong },
});
