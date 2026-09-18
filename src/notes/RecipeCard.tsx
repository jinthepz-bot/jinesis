import { Image, StyleSheet, Text, View } from 'react-native';

import { confirmDestructive } from '../design/confirm';
import { useType } from '../design/fonts';
import { colors, radius } from '../design/theme';
import { Card, IconButton } from '../design/ui';
import { deleteNotePhoto } from './photos';
import { deleteNote, type RecipeNote } from './store';

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
      <View style={styles.imageWrap}>
        {note.photoUri ? (
          <Image source={{ uri: note.photoUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={[type.label, styles.placeholderText]}>NO PHOTO</Text>
          </View>
        )}
        <IconButton icon="trash-outline" label={`Delete recipe "${note.title}"`} onPress={confirmDelete} color={colors.onAccent} />
      </View>
      <Text style={[type.bodyStrong, styles.title]} numberOfLines={2}>
        {note.title}
      </Text>
      <View style={styles.tags}>
        {note.cookTime ? <Text style={[type.mono, styles.tag]}>{note.cookTime}</Text> : null}
        <Text style={[type.mono, styles.tag]}>{note.category}</Text>
      </View>
      <View style={styles.rating} accessibilityLabel={`${note.rating} out of 3 stars`}>
        {[1, 2, 3].map((star) => (
          <Text key={star} style={[styles.star, star <= note.rating && styles.starActive]}>
            ★
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, padding: 0, overflow: 'hidden', gap: 8 },
  imageWrap: { position: 'relative' },
  photo: { width: '100%', aspectRatio: 1.15, backgroundColor: colors.surface2 },
  placeholder: {
    width: '100%',
    aspectRatio: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placeholderText: { color: colors.accent, letterSpacing: 1 },
  title: { paddingHorizontal: 10, paddingTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingHorizontal: 10 },
  tag: { color: colors.accent, backgroundColor: colors.surface2, borderRadius: radius.control, paddingHorizontal: 6, paddingVertical: 3, fontSize: 9 },
  rating: { flexDirection: 'row', gap: 2, paddingHorizontal: 10, paddingBottom: 10 },
  star: { color: colors.border, fontSize: 15 },
  starActive: { color: colors.accent },
});
