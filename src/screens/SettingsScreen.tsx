import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useType } from '../design/fonts';
import { colors, spacing } from '../design/theme';
import { Card, fieldStyles, Section, ScreenTitle, ToggleRow } from '../design/ui';
import { notificationsSupported, requestPermission, usePermissionState, type PermissionState } from '../notifications/scheduler';
import {
  setDailyReminderEnabled,
  setDailyReminderTime,
  setDeadlineWarningsEnabled,
  setNotificationsEnabled,
  setScheduleRemindersEnabled,
  setStreakAtRiskEnabled,
  useNotificationPrefs,
} from '../notifications/store';
import { isTimeKey, sanitizeTimeInput } from '../schedule/time';

// Turns a type on with a permission prompt the first time it's needed, never before —
// this is the only place in the app that calls requestPermission. A denied prompt still
// saves the preference; the banner above explains why nothing will show up.
async function enable(next: boolean, permission: PermissionState, setter: (v: boolean) => void) {
  if (next && permission === 'undetermined') await requestPermission();
  setter(next);
}

export function SettingsScreen() {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { state: prefs, loaded } = useNotificationPrefs();
  const permission = usePermissionState();

  if (!loaded) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
        <ScreenTitle label="Reminders from the coach" title="SETTINGS" />

        {!notificationsSupported ? (
          <Card>
            <Text style={[type.body, styles.muted]}>
              Notifications aren't available on web — install the app on your phone to get reminders.
            </Text>
          </Card>
        ) : (
          <>
            {permission === 'denied' ? (
              <Card style={styles.warningCard}>
                <Text style={[type.bodyStrong, styles.warningTitle]}>Notifications are off in your phone's settings</Text>
                <Text style={[type.body, styles.muted]}>
                  Your preferences below are saved, but nothing will show up until you turn notifications back on for
                  Jinesist.
                </Text>
                <Text
                  style={[type.label, styles.link]}
                  onPress={() => Linking.openSettings()}
                  accessibilityRole="button"
                  accessibilityLabel="Open phone settings"
                >
                  Open settings
                </Text>
              </Card>
            ) : null}

            <Section label="All notifications">
              <Card>
                <ToggleRow
                  label="Notifications"
                  hint="One switch to turn every reminder below off, without losing your choices."
                  value={prefs.enabled}
                  onChange={setNotificationsEnabled}
                />
              </Card>
            </Section>

            <Section label="Reminders">
              <Card style={styles.list}>
                <View style={styles.item}>
                  <ToggleRow
                    label="Daily log reminder"
                    hint="If I haven't logged progress on my featured goal by this time, remind me."
                    value={prefs.dailyReminderEnabled}
                    onChange={(next) => enable(next, permission, setDailyReminderEnabled)}
                  />
                  {prefs.dailyReminderEnabled ? (
                    <TimeField value={prefs.dailyReminderTime} onChange={setDailyReminderTime} />
                  ) : null}
                </View>

                <View style={[styles.item, styles.divider]}>
                  <ToggleRow
                    label="Streak at risk"
                    hint="A sharper nudge late at night if today would break an active streak."
                    value={prefs.streakAtRiskEnabled}
                    onChange={(next) => enable(next, permission, setStreakAtRiskEnabled)}
                  />
                </View>

                <View style={[styles.item, styles.divider]}>
                  <ToggleRow
                    label="Schedule reminders"
                    hint="Remind me before events that have a lead time set — edit an event in Schedule to set one."
                    value={prefs.scheduleRemindersEnabled}
                    onChange={(next) => enable(next, permission, setScheduleRemindersEnabled)}
                  />
                </View>

                <View style={[styles.item, styles.divider]}>
                  <ToggleRow
                    label="Deadline warnings"
                    hint="A week before a goal's deadline, and again the day before."
                    value={prefs.deadlineWarningsEnabled}
                    onChange={(next) => enable(next, permission, setDeadlineWarningsEnabled)}
                  />
                </View>
              </Card>
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Local draft text so typing "19:0" doesn't get overwritten mid-keystroke by the last
// committed value — the persisted time only updates once the text is a full "HH:MM".
function TimeField({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const type = useType();
  const [text, setText] = useState(value);
  const valid = isTimeKey(text);
  return (
    <View style={styles.timeRow}>
      <Text style={type.label}>At</Text>
      <TextInput
        style={[fieldStyles.input, styles.timeInput, type.mono, !valid && styles.invalid]}
        value={text}
        onChangeText={(t) => {
          const sanitized = sanitizeTimeInput(t);
          setText(sanitized);
          if (isTimeKey(sanitized)) onChange(sanitized);
        }}
        onBlur={() => {
          if (!isTimeKey(text)) setText(value); // revert an unfinished edit
        }}
        placeholder="19:00"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        keyboardAppearance="dark"
        maxLength={5}
        accessibilityLabel="Daily reminder time"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  muted: { color: colors.textMuted },
  warningCard: { gap: spacing.xs, borderColor: colors.accentStrong },
  warningTitle: { color: colors.accentStrong },
  link: { color: colors.accent, marginTop: 2 },
  list: { gap: 0 },
  item: { paddingVertical: spacing.xs, gap: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 0 },
  timeInput: { width: 90, height: 38, textAlign: 'center' },
  invalid: { borderColor: colors.accentStrong },
});
