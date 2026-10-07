import { strToU8 } from 'fflate';
import { getTableName } from 'drizzle-orm';

import type { Db } from '@/db';
import * as schema from '@/db/schema';
import { localDate } from '@/lib/appDay';

import type { BackupFiles } from './files';
import { BACKUP_JSON_NAME, makeBackupFile, relativisePhotos, type BackupFile } from './format';
import { markBackedUp, readAllData } from './repo';
import { createZipWriter } from './zip';

/** JSON: all data without photos. Zip: the JSON plus `products/` and `progress/`. */
export type ExportKind = 'json' | 'zip';

export const EXPORT_PREFIX = 'jx-care-backup-';

export const MIME_TYPES: Record<ExportKind, string> = {
  json: 'application/json',
  zip: 'application/zip',
};

/** Files written so far out of the total (the JSON counts as one), for the progress bar. */
export type BackupProgress = { done: number; total: number };

/** Lets the screen redraw between photos, so a large zip never freezes it. */
export const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export type ExportDeps = {
  db: Db;
  files: BackupFiles;
  /** Opens the share sheet for the written file. */
  share: (uri: string, kind: ExportKind) => Promise<void>;
  now?: number;
  onProgress?: (progress: BackupProgress) => void;
  pause?: () => Promise<void>;
};

/** `jx-care-backup-2026-10-07.zip`, by the local date of the export. */
export function backupFileName(kind: ExportKind, exportedAt: number): string {
  return `${EXPORT_PREFIX}${localDate(exportedAt)}.${kind}`;
}

/**
 * Every table as a backup file. The file is itself the newest backup, so its settings row
 * already says it was backed up at `exportedAt` (a restore then shows that date).
 */
export function buildBackupFile(db: Db, documentUri: string, exportedAt: number): BackupFile {
  const data = relativisePhotos(readAllData(db), documentUri);
  const settingsName = getTableName(schema.settings);
  data[settingsName] = (data[settingsName] ?? []).map((row) => ({
    ...row,
    lastBackupAt: exportedAt,
  }));
  return makeBackupFile(data, exportedAt);
}

/** Writes the backup into the cache folder and returns its uri. */
export async function writeBackup(
  kind: ExportKind,
  { db, files, now = Date.now(), onProgress, pause = yieldToUi }: Omit<ExportDeps, 'share'>,
): Promise<string> {
  const file = buildBackupFile(db, files.documentUri(), now);
  const json = JSON.stringify(file);
  const name = backupFileName(kind, now);
  try {
    files.clearExports(EXPORT_PREFIX);
  } catch {
    // An old export left in the cache is harmless; the phone clears the cache by itself.
  }
  if (kind === 'json') {
    const uri = files.writeCacheText(name, json);
    onProgress?.({ done: 1, total: 1 });
    return uri;
  }

  const photos = files.listPhotoFiles();
  const total = photos.length + 1;
  const out = files.createCacheFile(name);
  const zip = createZipWriter(out.append);
  zip.add(BACKUP_JSON_NAME, strToU8(json), true);
  onProgress?.({ done: 1, total });
  for (const [i, photo] of photos.entries()) {
    await pause();
    zip.add(photo.path, await files.readBytes(photo.uri), false);
    onProgress?.({ done: i + 2, total });
  }
  zip.end();
  return out.uri;
}

/**
 * Export backup (S8): writes the file, opens the share sheet (save to Files, Drive or email) and
 * then remembers the backup date. Returns that date.
 */
export async function exportBackup(kind: ExportKind, deps: ExportDeps): Promise<number> {
  const exportedAt = deps.now ?? Date.now();
  const uri = await writeBackup(kind, { ...deps, now: exportedAt });
  await deps.share(uri, kind);
  markBackedUp(deps.db, exportedAt);
  return exportedAt;
}
