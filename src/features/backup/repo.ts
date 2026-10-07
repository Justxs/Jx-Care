import { eq, isNotNull, sql } from 'drizzle-orm';

import type { Db } from '@/db';
import { product, progressPhoto } from '@/db/schema';
import { allTables } from '@/features/security/repo';
import { saveSettings } from '@/features/settings/repo';

import { backupTables, rebasePhotoUri, type BackupData } from './format';

/** Rows per insert statement, well under SQLite's limit on bound values. */
const INSERT_CHUNK = 100;

/** Every row of every backed-up table, as Drizzle returns them. */
export function readAllData(db: Db): BackupData {
  const data: BackupData = {};
  for (const [name, table] of backupTables) {
    data[name] = db.select().from(table).all() as Record<string, unknown>[];
  }
  return data;
}

/**
 * Restore: deletes every row of every table (the notification bookkeeping too) and inserts the
 * backup's rows with their ids, in one transaction. Foreign keys are checked at commit, so the
 * order doesn't matter, and any error (a broken row, a key that points nowhere) rolls everything
 * back and leaves the current data as it was.
 */
export function replaceAllData(db: Db, data: BackupData): void {
  db.transaction((tx) => {
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);
    for (const table of allTables) tx.delete(table).run();
    for (const [name, table] of backupTables) {
      const rows = data[name] ?? [];
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        tx.insert(table)
          .values(rows.slice(i, i + INSERT_CHUNK) as never)
          .run();
      }
    }
  });
}

/** Remembers when the last backup was made (S8, the backup reminder, the reset dialog). */
export function markBackedUp(db: Db, at: number): void {
  saveSettings(db, { lastBackupAt: at });
}

/**
 * At every launch: points saved product and progress photo uris at this launch's documents
 * folder (`rebasePhotoUri`), so photos survive an app update that moved it (iOS). Returns how many
 * rows changed; usually none.
 */
export function rebasePhotoUris(db: Db, documentUri: string): number {
  let changed = 0;
  db.transaction((tx) => {
    const products = tx
      .select({ id: product.id, uri: product.photoUri })
      .from(product)
      .where(isNotNull(product.photoUri))
      .all();
    for (const row of products) {
      const uri = rebasePhotoUri(row.uri ?? '', documentUri);
      if (row.uri === uri) continue;
      // Raw SQL, so `updated_at` keeps the person's last edit.
      tx.run(
        sql`UPDATE ${product} SET ${sql.identifier('photo_uri')} = ${uri} WHERE ${product.id} = ${row.id}`,
      );
      changed++;
    }
    const photos = tx
      .select({ id: progressPhoto.id, uri: progressPhoto.fileUri })
      .from(progressPhoto)
      .all();
    for (const row of photos) {
      const uri = rebasePhotoUri(row.uri, documentUri);
      if (row.uri === uri) continue;
      tx.update(progressPhoto).set({ fileUri: uri }).where(eq(progressPhoto.id, row.id)).run();
      changed++;
    }
  });
  return changed;
}
