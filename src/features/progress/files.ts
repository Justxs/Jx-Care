import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ProgressArea } from '@/db/enums';
import { portraitPlan, progressPhotoName } from '@/lib/photoCrop';

import type { ProgressFiles, SavePhotoTarget } from './types';

/**
 * Progress photo files (task 035). Photos live in the app's private documents folder under
 * `progress/<area>/<weekStart>/<angle>-<takenAt>.jpg`. That folder is not part of the phone's
 * gallery, and nothing here ever touches the media library.
 */

const ROOT = 'progress';
const JPEG_QUALITY = 0.85;

const weekDir = (area: ProgressArea, weekStart: string) =>
  new Directory(Paths.document, ROOT, area, weekStart);

const withSlash = (uri: string) => (uri.endsWith('/') ? uri : `${uri}/`);

export function isProgressFile(uri: string): boolean {
  return uri.startsWith(withSlash(new Directory(Paths.document, ROOT).uri));
}

/**
 * Crops a camera photo to 3:4 portrait, shrinks it to 1600 px on the long side, saves it as a
 * JPEG (quality 0.85) in the week's folder and returns its uri. The camera's temporary file is
 * removed once it is copied.
 */
export async function savePhoto(
  tempUri: string,
  { area, weekStart, angle }: SavePhotoTarget,
  takenAt: number = Date.now(),
): Promise<string> {
  const source = await ImageManipulator.manipulate(tempUri).renderAsync();
  const plan = portraitPlan(source.width, source.height);
  let context = ImageManipulator.manipulate(source);
  if (plan.crop) context = context.crop(plan.crop);
  if (plan.resize) context = context.resize(plan.resize);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const dir = weekDir(area, weekStart);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, progressPhotoName(angle, takenAt));
  if (target.exists) target.delete();
  await new File(saved.uri).move(target);

  // Only clean up files in the cache (the camera's temporary photo), never anything else.
  if (tempUri.startsWith(withSlash(Paths.cache.uri))) {
    const temp = new File(tempUri);
    if (temp.exists) temp.delete();
  }
  return target.uri;
}

/** Removes one photo file; a missing file is fine. */
export function deletePhotoFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

/** Removes a week's folder with everything in it; a missing folder is fine. */
export function deleteWeekFolder(area: ProgressArea, weekStart: string): void {
  const dir = weekDir(area, weekStart);
  if (dir.exists) dir.delete();
}

export const progressFiles: ProgressFiles = {
  savePhoto,
  isProgressFile,
  deletePhotoFile,
  deleteWeekFolder,
};
