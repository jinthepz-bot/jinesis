import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useType } from '../design/fonts';
import { colors, spacing } from '../design/theme';
import type { Activity } from '../types';

interface Props {
  activity: Activity;
  mock: boolean;
  canClear: boolean;
  onClear: () => void;
}

export function Header({ activity, mock, canClear, onClear }: Props) {
  const type = useType();
  const busy = activity.kind !== 'idle';

  return (
    <View style={styles.header}>
      <View style={styles.statusRow}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
        ) : (
          <View style={styles.dot} />
        )}
        <Text style={[type.label, busy && styles.busyText]}>{busy ? 'Thinking...' : 'Your coach'}</Text>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Text style={[type.display, styles.title]} accessibilityRole="header">
            CHAT
          </Text>
          {mock ? <Text style={[type.label, styles.mockBadge]}>Mock</Text> : null}
        </View>
        <Pressable onPress={onClear} disabled={!canClear} hitSlop={10} accessibilityRole="button">
          <Text style={[type.label, styles.clear, !canClear && styles.clearDisabled]}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 18 },
  spinner: { transform: [{ scale: 0.6 }], width: 8, marginHorizontal: -2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  busyText: { color: colors.accent },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 44, lineHeight: 50, letterSpacing: 1.5 },
  mockBadge: {
    fontSize: 10,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  clear: { color: colors.accent },
  clearDisabled: { color: colors.border },
});
