import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/** Any synchronous Drizzle SQLite database with our schema: expo-sqlite in the app, better-sqlite3 in Jest. */
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** A transaction handle; repo helpers that run inside a transaction accept either. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;
