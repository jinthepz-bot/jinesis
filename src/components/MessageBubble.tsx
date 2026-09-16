import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import type { TextMessage } from '../types';
import { ActionChips } from './ActionChips';

export function MessageBubble({ message }: { message: TextMessage }) {
  const type = useType();
  const isUser = message.role === 'user';
  return (
    <View>
      {message.actions?.length ? <ActionChips actions={message.actions} style={styles.chips} /> : null}
      {message.text ? (
        <View style={[styles.bubble, isUser ? styles.user : styles.assistant, message.isError && styles.error]}>
          <Text selectable style={[type.body, isUser && styles.userText, message.isError && styles.errorText]}>
            {message.text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ThinkingBubble() {
  const type = useType();
  return (
    <View style={[styles.bubble, styles.assistant, styles.thinking]}>
      <ActivityIndicator size="small" color={colors.accent} />
      <Text style={type.label}>Thinking...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { marginTop: 4 },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.card,
    borderWidth: 1,
    marginVertical: 4,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderBottomRightRadius: 3,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomLeftRadius: 3,
  },
  error: { backgroundColor: colors.accentStrongSoft, borderColor: colors.accentStrong },
  userText: { color: colors.onAccent },
  errorText: { color: colors.text },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
