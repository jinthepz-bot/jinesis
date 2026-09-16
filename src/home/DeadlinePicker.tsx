import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { describeDayDistance, formatDayKey } from '../coach/days';
import { useType } from '../design/fonts';
import { Sheet } from '../design/Sheet';
import { colors, spacing } from '../design/theme';
import { Button } from '../design/ui';
import { MonthCalendar } from './MonthCalendar';

interface Props {
  visible: boolean;
  title?: string;
  value: string | null;
  todayKey: string;
  onSave: (day: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function DeadlinePicker({ visible, onClose, ...rest }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <PickerBody onClose={onClose} {...rest} />
    </Sheet>
  );
}

function PickerBody({ title = 'Deadline', value, todayKey, onSave, onClear, onClose }: Omit<Props, 'visible'>) {
  const type = useType();
  const [selected, setSelected] = useState<string | null>(value);

  return (
    <>
      <Text style={type.label} numberOfLines={1}>
        {title}
      </Text>
      <MonthCalendar selected={selected} onSelect={setSelected} todayKey={todayKey} />
      <Text style={[type.mono, styles.summary]}>
        {selected ? `${formatDayKey(selected, todayKey)} · ${describeDayDistance(todayKey, selected)}` : 'Pick a day'}
      </Text>
      <View style={styles.actions}>
        <View style={styles.actionsStart}>
          {value ? (
            <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove deadline">
              <Text style={[type.label, styles.removeText]}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
        <Button label="Cancel" variant="secondary" onPress={onClose} />
        <Button label="Save" onPress={() => selected && onSave(selected)} disabled={!selected} accessibilityLabel="Save deadline" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionsStart: { flex: 1, alignItems: 'flex-start' },
  removeText: { color: colors.accentStrong },
});
