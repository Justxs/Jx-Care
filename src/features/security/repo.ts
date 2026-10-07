import { count, is, sql } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { Db } from '@/db';
import * as schema from '@/db/schema';

/** What Reset app deletes, for the dialog's real counts (spec L2). */
export type ResetCounts = {
  products: number;
  routines: number;
  photos: number;
  /** When the last backup was made (ms), null when there never was one. */
  lastBackupAt: number | null;
};

function countRows(db: Db, table: SQLiteTable): number {
  return db.select({ n: count() }).from(table).get()?.n ?? 0;
}

/** Every product (archived ones too), every routine and every progress photo file. */
export function resetCounts(db: Db): ResetCounts {
  const settingsRow = db
    .select({ lastBackupAt: schema.settings.lastBackupAt })
    .from(schema.settings)
    .get();
  return {
    products: countRows(db, schema.product),
    routines: countRows(db, schema.routine),
    photos: countRows(db, schema.progressPhoto),
    lastBackupAt: settingsRow?.lastBackupAt ?? null,
  };
}

/** Every table in the schema, so a table added later is wiped too. */
export const allTables: readonly SQLiteTable[] = (Object.values(schema) as unknown[]).filter(
  (value): value is SQLiteTable => is(value, SQLiteTable),
);

/**
 * Reset app: deletes every row of every table in one transaction, the settings row included,
 * so the next launch is a first launch (onboarding). The migrations table is not in the schema
 * and stays, so the database doesn't need migrating again. Foreign keys are checked at commit,
 * when every table is empty, so the order doesn't matter.
 */
export function deleteAllRows(db: Db): void {
  db.transaction((tx) => {
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);
    for (const table of allTables) tx.delete(table).run();
  });
}
