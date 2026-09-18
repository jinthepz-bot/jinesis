import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// expo-file-system's File/Directory classes are native-only (the web shim is an
// empty stub), and the camera/library pickers only make sense on a phone, so photo
// attachment is a native-only feature — the web preview hides the button instead.
export const photosSupported = Platform.OS !== 'web';

const PHOTOS_DIR_NAME = 'notePhotos';

function photosDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

// Copies a picked/captured image into the app's own document directory and returns
// its file:// path. Only that path is ever stored in a note — never image bytes.
function persistPickedPhoto(sourceUri: string): string {
  const ext = /\.\w+$/.exec(sourceUri)?.[0] ?? '.jpg';
  const name = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}${ext}`;
  const destination = new File(photosDirectory(), name);
  new File(sourceUri).copySync(destination);
  return destination.uri;
}

export type PickPhotoResult = { uri: string } | { canceled: true } | { error: string };

export async function pickPhotoFromLibrary(): Promise<PickPhotoResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return { error: "Photo library access wasn't granted." };
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || result.assets.length === 0) return { canceled: true };
    return { uri: persistPickedPhoto(result.assets[0].uri) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not open the photo library.' };
  }
}

export async function pickPhotoFromCamera(): Promise<PickPhotoResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return { error: "Camera access wasn't granted." };
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || result.assets.length === 0) return { canceled: true };
    return { uri: persistPickedPhoto(result.assets[0].uri) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not open the camera.' };
  }
}

// Best-effort: a note should never fail to delete just because its photo file is
// already gone.
export function deleteNotePhoto(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (err) {
    console.warn('Failed to delete note photo', err);
  }
}
