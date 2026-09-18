import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useType } from '../design/fonts';
import { Sheet } from '../design/Sheet';
import { colors, radius, spacing } from '../design/theme';
import { Button, fieldStyles } from '../design/ui';
import { pickPhotoFromCamera, pickPhotoFromLibrary, photosSupported } from './photos';
import { addChecklist, addQuickNote, addRecipe, RECIPE_CATEGORIES, type NoteType, type RecipeCategory } from './store';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

const TYPES: { value: NoteType; label: string; hint: string }[] = [
  { value: 'quick', label: 'Quick note', hint: 'Free text, stamped with the date and time.' },
  { value: 'recipe', label: 'Recipe', hint: 'A photo, ingredients, and numbered steps.' },
  { value: 'checklist', label: 'Checklist', hint: 'A title plus items you can check off.' },
];

// "One per line" text areas are split into arrays; blank lines are dropped.
const splitLines = (text: string): string[] => text.split('\n').map((l) => l.trim()).filter(Boolean);

export function NoteForm({ visible, onCancel, onSaved }: Props) {
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <FormBody onCancel={onCancel} onSaved={onSaved} />
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const type = useType();
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      {children}
    </View>
  );
}

function PhotoField({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const type = useType();
  const [busy, setBusy] = useState(false);

  if (!photosSupported) {
    return (
      <Field label="Photo (optional)">
        <Text style={[type.mono, styles.muted]}>
          Camera and photo library access aren't available on web — add a photo from the app on your phone.
        </Text>
      </Field>
    );
  }

  const pick = async (source: 'camera' | 'library') => {
    setBusy(true);
    const result = source === 'camera' ? await pickPhotoFromCamera() : await pickPhotoFromLibrary();
    setBusy(false);
    if ('uri' in result) onChange(result.uri);
  };

  return (
    <Field label="Photo (optional)">
      {uri ? (
        <View style={styles.photoRow}>
          <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove photo">
            <Text style={[type.label, styles.removeText]}>Remove</Text>
          </Pressable>
        </View>
      ) : busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.photoButtons}>
          <Button label="Camera" variant="secondary" small onPress={() => pick('camera')} />
          <Button label="Library" variant="secondary" small onPress={() => pick('library')} />
        </View>
      )}
    </Field>
  );
}

function FormBody({ onCancel, onSaved }: Omit<Props, 'visible'>) {
  const type = useType();
  const [noteType, setNoteType] = useState<NoteType>('quick');

  // Quick
  const [text, setText] = useState('');

  // Checklist
  const [checklistTitle, setChecklistTitle] = useState('');
  const [items, setItems] = useState('');

  // Recipe
  const [recipeTitle, setRecipeTitle] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cookTime, setCookTime] = useState('');
  const [category, setCategory] = useState<RecipeCategory>('Main dish');
  const [rating, setRating] = useState<1 | 2 | 3>(1);
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [recipeNotes, setRecipeNotes] = useState('');

  const canSave =
    noteType === 'quick'
      ? text.trim() !== ''
      : noteType === 'checklist'
        ? checklistTitle.trim() !== ''
        : recipeTitle.trim() !== '';

  const save = () => {
    if (!canSave) return;
    if (noteType === 'quick') addQuickNote(text);
    else if (noteType === 'checklist') addChecklist(checklistTitle, splitLines(items));
    else {
      addRecipe({
        title: recipeTitle,
        photoUri,
        cookTime,
        category,
        rating,
        ingredients: splitLines(ingredients),
        steps: splitLines(steps),
        notes: recipeNotes,
      });
    }
    onSaved();
  };

  return (
    <>
      <Text style={[type.display, styles.heading]}>NEW NOTE</Text>

      <Field label="Type">
        <View style={styles.segment} accessibilityRole="radiogroup">
          {TYPES.map((option) => {
            const selected = option.value === noteType;
            return (
              <Pressable
                key={option.value}
                style={[styles.segmentOption, selected && styles.segmentSelected]}
                onPress={() => setNoteType(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                accessibilityLabel={option.label}
              >
                <Text style={[type.label, styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={type.mono}>{TYPES.find((t) => t.value === noteType)!.hint}</Text>
      </Field>

      {noteType === 'quick' ? (
        <Field label="Note">
          <TextInput
            style={[fieldStyles.input, type.body, styles.textArea]}
            value={text}
            onChangeText={setText}
            placeholder="What are you thinking about or curious about right now?"
            placeholderTextColor={colors.textMuted}
            keyboardAppearance="dark"
            multiline
            textAlignVertical="top"
            autoFocus
            accessibilityLabel="Note text"
          />
        </Field>
      ) : noteType === 'checklist' ? (
        <>
          <Field label="Title">
            <TextInput
              style={[fieldStyles.input, fieldStyles.single, type.body]}
              value={checklistTitle}
              onChangeText={setChecklistTitle}
              placeholder="e.g. Packing list"
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              autoFocus
              accessibilityLabel="Checklist title"
            />
          </Field>
          <Field label="Items (optional, one per line)">
            <TextInput
              style={[fieldStyles.input, type.body, styles.textAreaSmall]}
              value={items}
              onChangeText={setItems}
              placeholder={'Passport\nCharger\nToothbrush'}
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Checklist items"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Title">
            <TextInput
              style={[fieldStyles.input, fieldStyles.single, type.body]}
              value={recipeTitle}
              onChangeText={setRecipeTitle}
              placeholder="e.g. Weeknight pasta"
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              autoFocus
              accessibilityLabel="Recipe title"
            />
          </Field>
          <PhotoField uri={photoUri} onChange={setPhotoUri} />
          <Field label="Cook time (optional)">
            <TextInput
              style={[fieldStyles.input, fieldStyles.single, type.body]}
              value={cookTime}
              onChangeText={setCookTime}
              placeholder="e.g. 30 min"
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              accessibilityLabel="Cook time"
            />
          </Field>
          <Field label="Category">
            <View style={styles.choiceWrap} accessibilityRole="radiogroup">
              {RECIPE_CATEGORIES.map((option) => {
                const selected = category === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.choice, selected && styles.choiceSelected]}
                    onPress={() => setCategory(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={option}
                  >
                    <Text style={[type.label, selected && styles.choiceTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="Rating">
            <View style={styles.ratingRow} accessibilityRole="radiogroup">
              {[1, 2, 3].map((value) => {
                const selected = value === rating;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRating(value as 1 | 2 | 3)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                    style={[styles.starButton, selected && styles.starSelected]}
                  >
                    <Text style={[styles.star, selected && styles.starActive]}>★</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="Ingredients (optional, one per line)">
            <TextInput
              style={[fieldStyles.input, type.body, styles.textAreaSmall]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder={'200g flour\n2 eggs\nPinch of salt'}
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Ingredients"
            />
          </Field>
          <Field label="Steps (optional, one per line)">
            <TextInput
              style={[fieldStyles.input, type.body, styles.textAreaSmall]}
              value={steps}
              onChangeText={setSteps}
              placeholder={'Boil water\nCook pasta 9 minutes\nToss with sauce'}
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Steps"
            />
          </Field>
          <Field label="Notes (optional)">
            <TextInput
              style={[fieldStyles.input, fieldStyles.single, type.body]}
              value={recipeNotes}
              onChangeText={setRecipeNotes}
              placeholder="Cook time, servings, where it's from..."
              placeholderTextColor={colors.textMuted}
              keyboardAppearance="dark"
              accessibilityLabel="Recipe notes"
            />
          </Field>
        </>
      )}

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} />
        <Button label="Save" onPress={save} disabled={!canSave} accessibilityLabel="Save note" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 34, lineHeight: 38, letterSpacing: 1 },
  field: { gap: 6 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    padding: 3,
  },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.control - 2 },
  segmentSelected: { backgroundColor: colors.accent },
  segmentText: { fontSize: 10 },
  segmentTextSelected: { color: colors.onAccent },
  textArea: { minHeight: 120, paddingTop: 10, paddingBottom: 10 },
  textAreaSmall: { minHeight: 80, paddingTop: 10, paddingBottom: 10 },
  muted: { color: colors.textMuted },
  photoButtons: { flexDirection: 'row', gap: spacing.sm },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoPreview: { width: 64, height: 64, borderRadius: radius.control, backgroundColor: colors.surface2 },
  removeText: { color: colors.accentStrong },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border },
  choiceSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  choiceTextSelected: { color: colors.onAccent },
  ratingRow: { flexDirection: 'row', gap: 8 },
  starButton: { width: 42, height: 38, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  starSelected: { backgroundColor: colors.surface2, borderColor: colors.accent },
  star: { color: colors.textMuted, fontSize: 22 },
  starActive: { color: colors.accent },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
});
