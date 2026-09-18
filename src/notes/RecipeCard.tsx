import { Image, StyleSheet, Text, View } from 'react-native';

import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import { Card, IconButton } from '../design/ui';
import { deleteNotePhoto } from './photos';
import { deleteNote, type RecipeNote } from './store';

function ListSection({ label, items, ordered }: { label: string; items: string[]; ordered?: boolean }) {
  const type = useType();
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={type.label}>{label}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.listRow}>
          <Text style={[type.mono, styles.bullet]}>{ordered ? `${i + 1}.` : '•'}</Text>
          <Text style={[type.body, styles.listText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function RecipeCard({ note }: { note: RecipeNote }) {
  const type = useType();

  const confirmDelete = () =>
    confirmDestructive({
      title: `Delete "${note.title}"?`,
      message: note.photoUri ? 'Its photo is deleted too.' : undefined,
      confirmLabel: 'Delete',
      onConfirm: () => {
        deleteNotePhoto(note.photoUri);
        deleteNote(note.id);
      },
    });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[type.bodyStrong, styles.title]} numberOfLines={2}>
          {note.title}
        </Text>
        <IconButton icon="trash-outline" label={`Delete recipe "${note.title}"`} onPress={confirmDelete} />
      </View>

      {note.photoUri ? <Image source={{ uri: note.photoUri }} style={styles.photo} resizeMode="cover" /> : null}

      <ListSection label="Ingredients" items={note.ingredients} />
      <ListSection label="Steps" items={note.steps} ordered />

      {note.notes ? (
        <View style={styles.section}>
          <Text style={type.label}>Notes</Text>
          <Text style={type.body}>{note.notes}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1 },
  photo: { width: '100%', height: 180, borderRadius: radius.control, backgroundColor: colors.surface2 },
  section: { gap: 4 },
  listRow: { flexDirection: 'row', gap: 8 },
  bullet: { width: 18, color: colors.accent },
  listText: { flex: 1 },
});
