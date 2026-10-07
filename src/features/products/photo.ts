import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Longest side of a saved product photo, in pixels. */
export const PHOTO_SIZE = 1200;

export type PhotoSource = 'camera' | 'library';

export type PickResult =
  | { status: 'picked'; uri: string }
  | { status: 'cancelled' }
  | { status: 'denied' };

function newName(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
}

/**
 * Takes or chooses a photo cropped square, shrinks it to 1200 px and saves it as a JPEG in the
 * app's own storage (`documents/products/`). Nothing is saved to the phone's gallery.
 */
export async function pickProductPhoto(source: PhotoSource): Promise<PickResult> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };

  const resized = await ImageManipulator.manipulate(asset.uri)
    .resize(asset.width >= asset.height ? { width: PHOTO_SIZE } : { height: PHOTO_SIZE })
    .renderAsync();
  const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  const dir = new Directory(Paths.document, 'products');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, newName());
  new File(saved.uri).move(target);
  return { status: 'picked', uri: target.uri };
}
