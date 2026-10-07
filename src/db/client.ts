import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'jx-care.db';

/** Any synchronous Drizzle SQLite database with our schema: expo-sqlite in the app, better-sqlite3 in Jest. */
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

export const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: false });
expoDb.execSync('PRAGMA foreign_keys = ON;');
expoDb.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(expoDb, { schema });

/** The app database typed as `Db`, for repositories. */
export const appDb: Db = db;
