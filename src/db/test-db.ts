import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';

import { runMigrations, type MigrationBundle } from './migrate';
import type { Db } from './types';
import * as schema from './schema';

export const MIGRATIONS_FOLDER = path.join(__dirname, 'migrations');

/**
 * The migrations as the app bundles them (`migrations.js`), read from disk. Reading the files
 * (not importing `migrations.js`) keeps Jest's transform cache from serving an edited .sql stale.
 */
export function readMigrationFolder(folder: string = MIGRATIONS_FOLDER): MigrationBundle {
  const journal = JSON.parse(
    fs.readFileSync(path.join(folder, 'meta', '_journal.json'), 'utf8'),
  ) as MigrationBundle['journal'];
  const migrations: Record<string, string> = {};
  for (const entry of journal.entries) {
    const key = `m${entry.idx.toString().padStart(4, '0')}`;
    migrations[key] = fs.readFileSync(path.join(folder, `${entry.tag}.sql`), 'utf8');
  }
  return { journal, migrations };
}

/** An in-memory database with no migrations applied. */
export function createEmptyTestDb(): Db & { $client: Database.Database } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

/** A fresh in-memory database with every migration applied, for repository tests. */
export function createTestDb(): Db & { $client: Database.Database } {
  const db = createEmptyTestDb();
  runMigrations(db, readMigrationFolder());
  return db;
}
