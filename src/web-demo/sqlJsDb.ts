import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import type { Db } from '@/db';
import migrations from '@/db/migrations/migrations';
import * as schema from '@/db/schema';
import type { StoryDb } from '@/storybook/appData';

/**
 * In the browser: an in-memory SQLite (sql.js, WebAssembly) with every migration applied, the same
 * tables the phone has. The .wasm file sits next to the page (`scripts/build-web-demo.mjs` copies it).
 */
export async function createSqlJsStoryDb(): Promise<StoryDb> {
  const SQL = await initSqlJs({ locateFile: (file) => new URL(file, document.baseURI).href });
  const sqlite = new SQL.Database();
  sqlite.run('PRAGMA foreign_keys = ON;');
  for (const entry of migrations.journal.entries) {
    const key = `m${String(entry.idx).padStart(4, '0')}` as keyof typeof migrations.migrations;
    for (const statement of migrations.migrations[key].split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.run(statement);
    }
  }
  const db = drizzle(sqlite, { schema });
  return { db: db as unknown as Db, close: () => sqlite.close() };
}
