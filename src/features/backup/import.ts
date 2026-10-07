import { getTableName } from 'drizzle-orm';
import { strFromU8 } from 'fflate';

import type { Db } from '@/db';
import * as schema from '@/db/schema';

import { yieldToUi, type BackupProgress } from './export';
import type { BackupFiles } from './files';
import {
  absolutisePhotos,
  BACKUP_JSON_NAME,
  BackupError,
  isSafePhotoPath,
  parseBackupJson,
  PHOTO_ROOTS,
  previewOf,
  PREVIOUS_FOLDER,
  referencedPhotoPaths,
  type BackupData,
  type BackupFile,
  type BackupPreview,
  STAGING_FOLDER,
} from './format';
import { replaceAllData } from './repo';
import { isZip, listZipEntries, readZipEntry } from './zip';

/** A checked backup waiting for "Replace all data". */
export type PreparedImport = {
  file: BackupFile;
  preview: BackupPreview;
  source: { kind: 'json' } | { kind: 'zip'; uri: string; photoPaths: string[] };
};

/**
 * Reads a picked file (JSON or zip), validates it and counts what it holds, without touching
 * anything on the phone. Throws a `BackupError`.
 */
export async function prepareImport(uri: string, files: BackupFiles): Promise<PreparedImport> {
  let bytes: Uint8Array;
  try {
    bytes = await files.readBytes(uri);
  } catch {
    throw new BackupError('readFailed');
  }
  if (!isZip(bytes)) {
    const file = parseBackupJson(strFromU8(bytes));
    return { file, preview: previewOf(file), source: { kind: 'json' } };
  }

  let names: string[];
  let json: Uint8Array | undefined;
  try {
    names = listZipEntries(bytes);
    json = readZipEntry(bytes, BACKUP_JSON_NAME);
  } catch {
    throw new BackupError('damaged');
  }
  if (!json) throw new BackupError('notBackup');
  const file = parseBackupJson(strFromU8(json));
  const photoPaths = names.filter(isSafePhotoPath);
  return {
    file,
    preview: previewOf(file, photoPaths.length),
    source: { kind: 'zip', uri, photoPaths },
  };
}

/**
 * Photos that won't exist after the restore (a JSON backup on another phone, a zip missing a
 * file): a product keeps its row and shows its placeholder; a progress photo row is left out, so
 * the week has no photo instead of an empty box. The week's entry (rating, tags, note) stays.
 */
function dropMissingPhotos(data: BackupData, available: (path: string) => boolean): BackupData {
  const product = getTableName(schema.product);
  const progressPhoto = getTableName(schema.progressPhoto);
  return {
    ...data,
    [product]: (data[product] ?? []).map((row) =>
      typeof row.photoUri === 'string' && !available(row.photoUri)
        ? { ...row, photoUri: null }
        : row,
    ),
    [progressPhoto]: (data[progressPhoto] ?? []).filter(
      (row) => typeof row.fileUri === 'string' && available(row.fileUri),
    ),
  };
}

/**
 * Puts a zip's staged photo folders in place of `products/` and `progress/`, with folder renames
 * only: the current folders move into `PREVIOUS_FOLDER`, then the staged ones into their place.
 * A failed move puts back what was moved and throws. Returns `undo`, which does the same once
 * the folders are swapped (when the rows can't be replaced).
 */
function swapInStaged(files: BackupFiles): () => void {
  files.removeFolder(PREVIOUS_FOLDER);
  const done: [from: string, to: string][] = [];
  const move = (from: string, to: string) => {
    if (!files.folderExists(from)) return;
    files.moveFolder(from, to);
    done.push([from, to]);
  };
  const undo = () => {
    for (const [from, to] of done.toReversed()) files.moveFolder(to, from);
  };
  try {
    for (const root of PHOTO_ROOTS) move(root, `${PREVIOUS_FOLDER}/${root}`);
    for (const root of PHOTO_ROOTS) move(`${STAGING_FOLDER}/${root}`, root);
  } catch (error) {
    undo();
    throw error;
  }
  return undo;
}

export type RestoreDeps = {
  db: Db;
  files: BackupFiles;
  onProgress?: (progress: BackupProgress) => void;
  pause?: () => Promise<void>;
};

/**
 * Replace all data (sequence 9). Never merges. A failure at any step leaves the phone on its
 * current rows and photos.
 *
 * 1. A zip's photos are unpacked into a staging folder first, so a broken zip stops here.
 * 2. A zip's staged folders are swapped in for `products/` and `progress/`; the current folders
 *    are kept aside until the rows are in.
 * 3. One transaction deletes every row and inserts the backup's rows with their ids. An error
 *    rolls it back and puts the current photo folders back.
 * 4. A zip: the folders kept aside are deleted. A JSON backup has no photos: files the restored
 *    rows still point at stay (same phone), the rest are removed.
 *
 * Clearing the query cache, the language and the notifications are the caller's (`api.ts`).
 */
export async function restoreBackup(
  prepared: PreparedImport,
  { db, files, onProgress, pause = yieldToUi }: RestoreDeps,
): Promise<void> {
  const { file, source } = prepared;
  files.removeFolder(STAGING_FOLDER);
  let available: (path: string) => boolean;
  let undoSwap: (() => void) | undefined;

  if (source.kind === 'zip') {
    const total = source.photoPaths.length;
    const staged = new Set<string>();
    try {
      const bytes = await files.readBytes(source.uri);
      for (const [i, path] of source.photoPaths.entries()) {
        await pause();
        const entry = readZipEntry(bytes, path);
        if (entry) {
          files.writeStaged(path, entry);
          staged.add(path);
        }
        onProgress?.({ done: i + 1, total });
      }
    } catch (error) {
      files.removeFolder(STAGING_FOLDER);
      throw error instanceof BackupError ? error : new BackupError('damaged');
    }
    available = (path) => staged.has(path);
  } else {
    available = (path) => files.photoExists(path);
  }

  const data = absolutisePhotos(dropMissingPhotos(file.data, available), files.documentUri());
  try {
    if (source.kind === 'zip') undoSwap = swapInStaged(files);
    replaceAllData(db, data);
  } catch (error) {
    try {
      undoSwap?.();
    } finally {
      files.removeFolder(STAGING_FOLDER);
    }
    throw error;
  }

  // The rows and photos are in; a file that can't be removed must not undo that.
  try {
    if (source.kind === 'zip') {
      files.removeFolder(PREVIOUS_FOLDER);
      files.removeFolder(STAGING_FOLDER);
    } else {
      files.prunePhotos(referencedPhotoPaths(file.data));
    }
  } catch {
    // Leftover files at worst; the next restore clears both folders.
  }
}
