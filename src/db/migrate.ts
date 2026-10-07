import { sql } from 'drizzle-orm';

import type { Db } from './types';

/**
 * Runs the Drizzle migrations so an app update never loses data (docs/releasing.md).
 *
 * Same bookkeeping as Drizzle's own migrator (`__drizzle_migrations`, a migration runs when its
 * journal `when` is newer than the newest applied one), so installs migrated by either keep
 * working. On top of it:
 *
 * - The journal is checked first: numbered 0, 1, 2… with `when` always increasing. A migration
 *   generated with an older timestamp would otherwise be skipped on phones without a word.
 * - A database written by a newer app (more migrations than this app knows) is refused with
 *   `DatabaseNewerError` instead of being opened with a schema the code doesn't match.
 * - `beforeMigrate` runs before anything changes on a phone that already has data, so the app
 *   can copy the database first (`backupDatabaseTo`).
 * - Every pending migration runs in one transaction with foreign keys off, so a table rebuild
 *   (`DROP TABLE` + rename, how SQLite changes a column) doesn't cascade-delete child rows.
 *   `PRAGMA foreign_key_check` runs before the commit; any broken reference rolls it all back.
 *
 * Pure: works on expo-sqlite in the app and on better-sqlite3 in Jest.
 */

export const MIGRATIONS_TABLE = '__drizzle_migrations';

/** Under the documents folder: copies of the database taken just before an update migrated it. */
export const DB_BACKUP_FOLDER = 'db-backups';

export type JournalEntry = { idx: number; tag: string; when: number; breakpoints: boolean };

/** What `src/db/migrations/migrations.js` exports: the journal and each migration's SQL. */
export type MigrationBundle = {
  journal: { entries: readonly JournalEntry[] };
  migrations: Readonly<Record<string, string>>;
};

export type MigrationPlan = {
  /** The newest migration already in the database; null on a fresh install. */
  current: JournalEntry | null;
  /** Migrations still to run, oldest first. */
  pending: JournalEntry[];
  /** The newest migration this app has. */
  latest: JournalEntry;
};

/** The database was written by a newer version of the app. */
export class DatabaseNewerError extends Error {
  constructor(
    readonly appliedAt: number,
    readonly latestKnown: string,
  ) {
    super(`The database is newer than this app (latest known migration ${latestKnown})`);
    this.name = 'DatabaseNewerError';
  }
}

/** The innermost message of an error (duck-typed: native errors can come from another realm). */
function reasonOf(error: unknown): string {
  let current: unknown = error;
  while (typeof current === 'object' && current !== null && 'cause' in current && current.cause) {
    current = current.cause;
  }
  return typeof current === 'object' && current !== null && 'message' in current
    ? String(current.message)
    : String(current);
}

const sqlKey = (idx: number) => `m${idx.toString().padStart(4, '0')}`;

/** Checks the journal and returns its entries; throws on anything that could skip a migration. */
export function checkJournal(bundle: MigrationBundle): readonly JournalEntry[] {
  const entries = bundle.journal.entries;
  if (entries.length === 0) throw new Error('Migration journal is empty');
  entries.forEach((entry, i) => {
    if (entry.idx !== i)
      throw new Error(`Migration ${entry.tag} has idx ${entry.idx}, expected ${i}`);
    if (!entry.tag.startsWith(sqlKey(i).slice(1))) {
      throw new Error(`Migration ${entry.tag} should start with ${sqlKey(i).slice(1)}`);
    }
    if (!entry.breakpoints) throw new Error(`Migration ${entry.tag} needs breakpoints: true`);
    if (typeof bundle.migrations[sqlKey(i)] !== 'string') {
      throw new Error(`Missing SQL for migration ${entry.tag} (add it to migrations.js)`);
    }
    const before = entries[i - 1];
    if (before && entry.when <= before.when) {
      throw new Error(
        `Migration ${entry.tag} is dated before ${before.tag}; phones would skip it. Give it a later "when".`,
      );
    }
  });
  return entries;
}

/** The statements of one migration, split at Drizzle's breakpoints. */
export function statementsOf(bundle: MigrationBundle, entry: JournalEntry): string[] {
  return (bundle.migrations[sqlKey(entry.idx)] ?? '')
    .split('--> statement-breakpoint')
    .filter((statement) => statement.trim() !== '');
}

function newestApplied(db: Db): number | null {
  const table = db.get<{ n: number }>(
    sql`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ${MIGRATIONS_TABLE}`,
  );
  if (!table?.n) return null;
  const row = db.get<{ newest: number | string | null }>(
    sql`SELECT max(created_at) AS newest FROM ${sql.identifier(MIGRATIONS_TABLE)}`,
  );
  return row?.newest == null ? null : Number(row.newest);
}

/** What `runMigrations` would do, without changing anything. */
export function planMigrations(db: Db, bundle: MigrationBundle): MigrationPlan {
  const entries = checkJournal(bundle);
  const latest = entries[entries.length - 1] as JournalEntry;
  const applied = newestApplied(db);
  if (applied === null) return { current: null, pending: [...entries], latest };
  if (applied > latest.when) throw new DatabaseNewerError(applied, latest.tag);
  return {
    current: entries.filter((e) => e.when <= applied).at(-1) ?? null,
    pending: entries.filter((e) => e.when > applied),
    latest,
  };
}

export type RunOptions = {
  /** Runs before the first change on a database that already has migrations (not a fresh one). */
  beforeMigrate?: (plan: MigrationPlan) => void;
};

/** Brings the database up to the newest migration; returns the plan it carried out. */
export function runMigrations(
  db: Db,
  bundle: MigrationBundle,
  { beforeMigrate }: RunOptions = {},
): MigrationPlan {
  const plan = planMigrations(db, bundle);
  if (plan.pending.length === 0) return plan;
  if (plan.current) beforeMigrate?.(plan);

  const foreignKeys = db.get<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`)?.foreign_keys;
  // Can't change inside a transaction, so it is switched off around it.
  db.run(sql`PRAGMA foreign_keys = OFF`);
  try {
    db.transaction((tx) => {
      tx.run(
        sql`CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_TABLE)} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
      );
      for (const entry of plan.pending) {
        for (const statement of statementsOf(bundle, entry)) {
          try {
            tx.run(sql.raw(statement));
          } catch (error) {
            // Drizzle's own message only quotes the query; SQLite's reason is in `cause`.
            throw new Error(`Migration ${entry.tag} failed: ${reasonOf(error)}`, { cause: error });
          }
        }
        tx.run(
          sql`INSERT INTO ${sql.identifier(MIGRATIONS_TABLE)} ("hash", "created_at") VALUES (${entry.tag}, ${entry.when})`,
        );
      }
      const broken = tx.all<{ table: string; parent: string }>(sql`PRAGMA foreign_key_check`);
      if (broken.length > 0) {
        const first = broken[0];
        throw new Error(
          `Migration left ${broken.length} broken reference(s), e.g. ${first?.table} → ${first?.parent}`,
        );
      }
    });
  } finally {
    if (foreignKeys) db.run(sql`PRAGMA foreign_keys = ON`);
  }
  return plan;
}

/**
 * Writes a consistent copy of the whole database to `path` (a file system path, not a uri; the
 * file must not exist). Works in WAL mode; can't run inside a transaction.
 */
export function backupDatabaseTo(db: Db, path: string): void {
  db.run(sql.raw(`VACUUM INTO '${path.replaceAll("'", "''")}'`));
}
