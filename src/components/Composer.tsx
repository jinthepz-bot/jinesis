import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

interface Props {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function Composer({ busy, onSend, onStop }: Props) {
  const type = useType();
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const canSend = !busy && text.trim() !== '';

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <View style={[styles.bar, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 10) }]}>
      <TextInput
        style={[type.body, styles.input]}
        value={text}
        onChangeText={setText}
        placeholder={busy ? 'Working on it...' : 'Message your coach'}
        placeholderTextColor={colors.textMuted}
        keyboardAppearance="dark"
        accessibilityLabel="Message"
        multiline
      />
      {busy ? (
        <Pressable style={[styles.button, styles.stop]} onPress={onStop} accessibilityRole="button">
          <Text style={[type.label, styles.stopText]}>Stop</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, !canSend && styles.disabled]}
          onPress={submit}
          disabled={!canSend}
          accessibilityRole="button"
        >
          <Text style={[type.label, styles.sendText]}>Send</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 11,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
  },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  disabled: { opacity: 0.45 },
  sendText: { color: colors.onAccent, fontSize: 12 },
  stop: { backgroundColor: colors.accentStrongSoft, borderWidth: 1, borderColor: colors.accentStrong },
  stopText: { color: colors.text, fontSize: 12 },
});
