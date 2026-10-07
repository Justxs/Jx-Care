import { File } from 'expo-file-system';

/** Removes a saved product photo from the app's storage; a missing file is fine. */
export function deletePhotoFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}
