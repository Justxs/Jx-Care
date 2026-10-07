import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import type { Db } from '@/db';
import migrations from '@/db/migrations/migrations';
import * as schema from '@/db/schema';

import type { StoryDb } from './appData';

/**
 * On the device: a new in-memory expo-sqlite database (its own connection, so stories never share
 * one) with every migration applied. Never touches the app's jx-care.db.
 */
export async function createExpoStoryDb(): Promise<StoryDb> {
  const sqlite = openDatabaseSync(':memory:', { useNewConnection: true });
  sqlite.execSync('PRAGMA foreign_keys = ON;');
  const db = drizzle(sqlite, { schema });
  await migrate(db, migrations);
  return {
    db: db as Db,
    close: () => {
      try {
        sqlite.closeSync();
      } catch {
        // Already closed.
      }
    },
  };
}
