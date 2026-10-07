import { Directory, File, Paths } from 'expo-file-system';

import { db } from './client';
import { backupDatabaseTo, DB_BACKUP_FOLDER, type MigrationPlan } from './migrate';
/** How many copies to keep (one per update that changed the database). */
const KEEP = 2;

/** A `file://` uri as a file system path, which SQLite needs. */
function pathOf(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ''));
}

/**
 * Before an app update changes the database (docs/releasing.md): writes a copy to
 * `db-backups/jx-care-<from migration>.db` and keeps the newest two. The migration itself runs in
 * one transaction, so a failed update already leaves the data as it was; this copy is for an
 * update that succeeds but turns out wrong, so a later release can bring the data back. A copy
 * that can't be written (a full phone) doesn't stop the update.
 */
export function backupBeforeMigrating(plan: MigrationPlan): void {
  if (!plan.current) return;
  try {
    const dir = new Directory(Paths.document, DB_BACKUP_FOLDER);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = new File(dir, `jx-care-${plan.current.tag}.db`);
    if (file.exists) file.delete();
    backupDatabaseTo(db, pathOf(file.uri));

    // Tags start with the zero-padded migration number, so names sort oldest first.
    const copies = dir
      .list()
      .filter(
        (item): item is File => item instanceof File && /^jx-care-\d{4}.*\.db$/.test(item.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const old of copies.slice(0, -KEEP)) old.delete();
  } catch {
    // Never blocks the update.
  }
}
