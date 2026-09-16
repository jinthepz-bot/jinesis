import { StyleSheet, Text, View } from 'react-native';

import { useType } from '../design/fonts';
import { colors } from '../design/theme';
import { Card } from '../design/ui';

export function GoalProgress({ current, target }: { current: number; target: number }) {
  const type = useType();
  const percent = Math.min(100, Math.round((current / target) * 100));

  return (
    <Card style={styles.card}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: target, now: current }}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.caption}>
        <Text style={[type.mono, styles.captionText]}>
          {current} / {target} nonstop
        </Text>
        <Text style={[type.mono, styles.percent]}>{percent}%</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 6 },
  caption: { flexDirection: 'row', justifyContent: 'space-between' },
  captionText: { color: colors.text },
  percent: { color: colors.accent },
});
