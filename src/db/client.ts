import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import type { Db } from './types';

export type { Db };

export const DATABASE_NAME = 'jx-care.db';

export const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: false });
expoDb.execSync('PRAGMA foreign_keys = ON;');
expoDb.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(expoDb, { schema });

/** The app database typed as `Db`, for repositories. */
export const appDb: Db = db;
