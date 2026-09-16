import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDayKey } from '../coach/days';
import { formatAmount } from '../coach/format';
import {
  addBuyItem,
  createGoal,
  deleteBuyItem,
  deleteGoal,
  getFeaturedGoal,
  logProgress,
  setGoalDeadline,
  toggleBought,
  useCoach,
  type Goal,
} from '../coach/store';
import { useTodayKey } from '../coach/useTodayKey';
import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { colors, radius, spacing } from '../design/theme';
import { ScreenTitle, Section } from '../design/ui';
import { BuyListCard } from '../goals/BuyListCard';
import { GoalCard } from '../goals/GoalCard';
import { GoalForm } from '../goals/GoalForm';
import { LogProgressSheet } from '../goals/LogProgressSheet';
import { DeadlinePicker } from '../home/DeadlinePicker';

export function GoalsScreen() {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { state, loaded } = useCoach();
  const todayKey = useTodayKey();
  const [creating, setCreating] = useState(false);
  const [logGoalId, setLogGoalId] = useState<string | null>(null);
  const [deadlineGoalId, setDeadlineGoalId] = useState<string | null>(null);

  if (!loaded) return <View style={styles.root} />;

  const featured = getFeaturedGoal(state);
  const others = state.goals.filter((g) => !g.featured);
  const logGoal = state.goals.find((g) => g.id === logGoalId) ?? null;
  const deadlineGoal = state.goals.find((g) => g.id === deadlineGoalId) ?? null;

  const toBuyLeft = state.toBuy.filter((b) => !b.bought);
  const toBuyTotal = toBuyLeft.reduce((sum, b) => sum + (b.price ?? 0), 0);
  const buyAside = `${toBuyLeft.length} left${toBuyTotal > 0 ? ` · ${formatAmount(toBuyTotal)}` : ''}`;

  const confirmDeleteGoal = (goal: Goal) =>
    confirmDestructive({
      title: `Delete "${goal.title}"?`,
      message: 'Its progress history is deleted too.',
      confirmLabel: 'Delete',
      onConfirm: () => deleteGoal(goal.id),
    });

  const cardFor = (goal: Goal) => (
    <GoalCard
      key={goal.id}
      goal={goal}
      todayKey={todayKey}
      onLog={() => setLogGoalId(goal.id)}
      onEditDeadline={() => setDeadlineGoalId(goal.id)}
      onDelete={goal.featured ? undefined : () => confirmDeleteGoal(goal)}
    />
  );

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <ScreenTitle
            label={`${state.goals.length} ${state.goals.length === 1 ? 'goal' : 'goals'} · ${formatDayKey(todayKey, todayKey)}`}
            title="GOALS"
          />

          <Section label="Featured · on Home">{cardFor(featured)}</Section>

          <Section label="Other goals" aside={others.length > 0 ? String(others.length) : undefined}>
            {others.length === 0 ? (
              <Text style={[type.body, styles.muted]}>No other goals yet.</Text>
            ) : (
              others.map(cardFor)
            )}
            <Pressable
              onPress={() => setCreating(true)}
              style={({ pressed }) => [styles.newGoal, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="New goal"
            >
              <Text style={[type.label, styles.newGoalText]}>+ New goal</Text>
            </Pressable>
          </Section>

          <Section label="To buy" aside={buyAside}>
            <BuyListCard items={state.toBuy} onAdd={addBuyItem} onToggle={toggleBought} onDelete={deleteBuyItem} />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <GoalForm
        visible={creating}
        todayKey={todayKey}
        onCancel={() => setCreating(false)}
        onCreate={(input) => {
          createGoal(input);
          setCreating(false);
        }}
      />

      <LogProgressSheet
        goal={logGoal}
        onClose={() => setLogGoalId(null)}
        onSave={(value, note) => {
          if (logGoal) logProgress(logGoal.id, value, note, todayKey);
          setLogGoalId(null);
        }}
      />

      <DeadlinePicker
        visible={deadlineGoal !== null}
        title={deadlineGoal ? `Deadline · ${deadlineGoal.title}` : 'Deadline'}
        value={deadlineGoal?.deadline ?? null}
        todayKey={todayKey}
        onSave={(day) => {
          if (deadlineGoal) setGoalDeadline(deadlineGoal.id, day);
          setDeadlineGoalId(null);
        }}
        onClear={() => {
          if (deadlineGoal) setGoalDeadline(deadlineGoal.id, null);
          setDeadlineGoalId(null);
        }}
        onClose={() => setDeadlineGoalId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  muted: { color: colors.textMuted },
  newGoal: {
    height: 48,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGoalText: { color: colors.accent },
  pressed: { opacity: 0.7 },
});
