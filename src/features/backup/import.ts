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
  previewOf,
  referencedPhotoPaths,
  type BackupData,
  type BackupFile,
  type BackupPreview,
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

/** A product photo that won't exist after the restore is dropped, so the product shows none. */
function dropMissingProductPhotos(data: BackupData, available: (path: string) => boolean) {
  const name = getTableName(schema.product);
  return {
    ...data,
    [name]: (data[name] ?? []).map((row) =>
      typeof row.photoUri === 'string' && !available(row.photoUri)
        ? { ...row, photoUri: null }
        : row,
    ),
  };
}

export type RestoreDeps = {
  db: Db;
  files: BackupFiles;
  onProgress?: (progress: BackupProgress) => void;
  pause?: () => Promise<void>;
};

/**
 * Replace all data (sequence 9). Never merges.
 *
 * 1. A zip's photos are unpacked into a staging folder first, so a broken zip stops here.
 * 2. One transaction deletes every row and inserts the backup's rows with their ids. An error
 *    rolls it back and the staged photos are thrown away: the current data stays untouched.
 * 3. A zip's photos replace the `products/` and `progress/` folders. A JSON backup has no photos:
 *    files the restored rows still point at stay (same phone), the rest are removed.
 *
 * Clearing the query cache, the language and the notifications are the caller's (`api.ts`).
 */
export async function restoreBackup(
  prepared: PreparedImport,
  { db, files, onProgress, pause = yieldToUi }: RestoreDeps,
): Promise<void> {
  const { file, source } = prepared;
  files.clearStaged();
  let available: (path: string) => boolean;

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
      files.clearStaged();
      throw error instanceof BackupError ? error : new BackupError('damaged');
    }
    available = (path) => staged.has(path);
  } else {
    available = (path) => files.photoExists(path);
  }

  const data = absolutisePhotos(
    dropMissingProductPhotos(file.data, available),
    files.documentUri(),
  );
  try {
    replaceAllData(db, data);
  } catch (error) {
    files.clearStaged();
    throw error;
  }

  // The data is in; a photo file that can't be moved or removed must not undo that.
  try {
    if (source.kind === 'zip') files.commitStaged();
    else files.prunePhotos(referencedPhotoPaths(file.data));
  } catch {
    files.clearStaged();
  }
}
