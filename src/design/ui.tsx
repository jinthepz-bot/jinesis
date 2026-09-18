import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useType } from './fonts';
import { colors, radius, spacing } from './theme';

// Rounded surface with a 1px border: the basic container for every section.
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Small uppercase mono label above a section, with an optional note on the right.
export function Section({ label, aside, children }: { label: string; aside?: string; children: ReactNode }) {
  const type = useType();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={type.label}>{label}</Text>
        {aside ? <Text style={type.label}>{aside}</Text> : null}
      </View>
      {children}
    </View>
  );
}

// Small mono label + big condensed title, used at the top of each coach screen.
export function ScreenTitle({ label, title }: { label: string; title: string }) {
  const type = useType();
  return (
    <View style={styles.titleBlock}>
      <Text style={type.label}>{label}</Text>
      <Text style={[type.display, styles.title]} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  small?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', small, disabled, accessibilityLabel, style }: ButtonProps) {
  const type = useType();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        primary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[type.label, styles.buttonText, { color: primary ? colors.onAccent : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.textMuted,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={17} color={color} />
    </Pressable>
  );
}

// An on/off row: a label (and optional hint) with a switch, themed for the dark surfaces.
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const type = useType();
  return (
    <View style={[styles.toggleRow, disabled && styles.disabled]}>
      <View style={styles.toggleText}>
        <Text style={type.body}>{label}</Text>
        {hint ? <Text style={[type.mono, styles.toggleHint]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.surface2, true: colors.accent }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.surface2}
        accessibilityLabel={label}
      />
    </View>
  );
}

// Shared text-field look for inputs on the dark surfaces.
export const fieldStyles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 10,
    color: colors.text,
  },
  single: { height: 46 },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
  },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  titleBlock: { gap: 2 },
  title: { fontSize: 56, lineHeight: 62, letterSpacing: 1.5 },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { height: 36, paddingHorizontal: 14 },
  primary: { backgroundColor: colors.accent },
  secondary: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 12 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  toggleText: { flex: 1, gap: 2 },
  toggleHint: { color: colors.textMuted },
});
