import type { Db } from './types';

export type { Db };

/**
 * The database the query hooks use. The app sets the expo-sqlite database at start-up
 * (`app/_layout.tsx`); hook tests set a better-sqlite3 one from `createTestDb()`.
 * Kept out of `client.ts` so tests never load expo-sqlite.
 */
let current: Db | null = null;

export function setDb(db: Db): void {
  current = db;
}

export function getDb(): Db {
  if (!current) throw new Error('Database not set; call setDb() first');
  return current;
}
