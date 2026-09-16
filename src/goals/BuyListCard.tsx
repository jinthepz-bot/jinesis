import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatAmount, parseAmount, sanitizeAmountInput } from '../coach/format';
import type { BuyItem } from '../coach/store';
import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import { Card } from '../design/ui';

interface Props {
  items: BuyItem[];
  onAdd: (name: string, price: number | null) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function BuyListCard({ items, onAdd, onToggle, onDelete }: Props) {
  const type = useType();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const canAdd = name.trim() !== '';

  // Still-to-buy first, bought items sink to the bottom.
  const sorted = [...items].sort((a, b) => Number(a.bought) - Number(b.bought) || a.createdAt - b.createdAt);

  const add = () => {
    if (!canAdd) return;
    onAdd(name.trim(), parseAmount(price));
    setName('');
    setPrice('');
  };

  return (
    <Card style={styles.card}>
      {sorted.length === 0 ? (
        <Text style={[type.body, styles.empty]}>Nothing to buy. Add an item below.</Text>
      ) : (
        sorted.map((item, i) => (
          <View key={item.id} style={[styles.row, i > 0 && styles.divider]}>
            <Pressable
              onPress={() => onToggle(item.id)}
              hitSlop={10}
              style={[styles.checkbox, item.bought && styles.checked]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.bought }}
              aria-checked={item.bought}
              accessibilityLabel={`Bought ${item.name}`}
            >
              {item.bought ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
            </Pressable>
            <Text style={[type.body, styles.name, item.bought && styles.boughtText]} onPress={() => onToggle(item.id)}>
              {item.name}
            </Text>
            {item.price !== null ? (
              <Text style={[type.mono, styles.price, item.bought && styles.boughtText]}>{formatAmount(item.price)}</Text>
            ) : null}
            <Pressable
              onPress={() => onDelete(item.id)}
              hitSlop={10}
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, type.body, styles.nameInput]}
          value={name}
          onChangeText={setName}
          placeholder="Item"
          placeholderTextColor={colors.textMuted}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={add}
          submitBehavior="submit"
          accessibilityLabel="Item name"
        />
        <TextInput
          style={[styles.input, type.mono, styles.priceInput]}
          value={price}
          onChangeText={(text) => setPrice(sanitizeAmountInput(text))}
          placeholder="Price"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          accessibilityLabel="Item price"
        />
        <Pressable
          onPress={add}
          disabled={!canAdd}
          style={({ pressed }) => [styles.addButton, !canAdd && styles.disabled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add item"
        >
          <Ionicons name="add" size={22} color={colors.onAccent} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  empty: { color: colors.textMuted, paddingHorizontal: 14, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.success, borderColor: colors.success },
  name: { flex: 1 },
  price: { color: colors.text, fontSize: 13 },
  boughtText: { color: colors.textMuted, textDecorationLine: 'line-through' },
  delete: { padding: 2 },
  pressed: { opacity: 0.6 },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface2,
  },
  input: {
    height: 42,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 10,
    color: colors.text,
  },
  nameInput: { flex: 1, minWidth: 0 },
  priceInput: { width: 84 },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
});
