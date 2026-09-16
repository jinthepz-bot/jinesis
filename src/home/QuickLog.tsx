import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LogEntry } from '../coach/store';
import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import { Card } from '../design/ui';

interface Props {
  unit: string;
  todayEntry?: LogEntry;
  onLog: (count: number, note: string) => { isNewBest: boolean };
}

export function QuickLog({ unit, todayEntry, onLog }: Props) {
  const type = useType();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<{ isNewBest: boolean } | null>(null);

  const value = Number.parseInt(amount, 10);
  const valid = Number.isFinite(value) && value > 0;

  const submit = () => {
    if (!valid) return;
    setSaved(onLog(value, note));
    setAmount('');
    setNote('');
    Keyboard.dismiss();
  };

  const edit = (setter: (text: string) => void) => (text: string) => {
    setSaved(null);
    setter(text);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, type.number, styles.amount]}
          value={amount}
          onChangeText={edit((text) => setAmount(text.replace(/[^0-9]/g, '')))}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          accessibilityLabel={`Amount in ${unit}`}
        />
        <TextInput
          style={[styles.input, type.body, styles.note]}
          value={note}
          onChangeText={edit(setNote)}
          placeholder="Note (optional)"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={submit}
          accessibilityLabel="Note"
        />
        <Pressable
          style={({ pressed }) => [styles.button, !valid && styles.buttonDisabled, pressed && styles.pressed]}
          onPress={submit}
          disabled={!valid}
          accessibilityRole="button"
        >
          <Text style={[type.label, styles.buttonText]}>Log it</Text>
        </Pressable>
      </View>

      <View style={styles.status}>
        <Text style={[type.mono, todayEntry && styles.todayText]}>
          {todayEntry
            ? `Today: ${todayEntry.value} ${unit}${todayEntry.note ? ` · ${todayEntry.note}` : ''}`
            : 'Nothing logged today'}
        </Text>
        {saved ? (
          <Text style={[type.mono, styles.saved]}>{saved.isNewBest ? 'Saved · New best set!' : 'Saved'}</Text>
        ) : todayEntry ? (
          <Text style={type.mono}>Logging again replaces today's entry.</Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    height: 46,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 10,
    color: colors.text,
  },
  amount: { width: 64, fontSize: 24, textAlign: 'center' },
  note: { flex: 1, minWidth: 0 },
  button: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonText: { color: colors.onAccent, fontSize: 12 },
  status: { gap: 2 },
  todayText: { color: colors.text },
  saved: { color: colors.success },
});
