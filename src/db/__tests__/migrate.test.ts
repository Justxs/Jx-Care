/** @jest-environment node */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  backupDatabaseTo,
  checkJournal,
  DatabaseNewerError,
  planMigrations,
  runMigrations,
  type JournalEntry,
  type MigrationBundle,
} from '../migrate';
import { createEmptyTestDb, MIGRATIONS_FOLDER, readMigrationFolder } from '../test-db';

const entry = (idx: number, when: number): JournalEntry => ({
  idx,
  tag: `${idx.toString().padStart(4, '0')}_test`,
  when,
  breakpoints: true,
});

function makeBundle(...sqls: string[]): MigrationBundle {
  return {
    journal: { entries: sqls.map((_, i) => entry(i, 1000 + i)) },
    migrations: Object.fromEntries(sqls.map((s, i) => [`m${i.toString().padStart(4, '0')}`, s])),
  };
}

const upTo = (bundle: MigrationBundle, count: number): MigrationBundle => ({
  journal: { entries: bundle.journal.entries.slice(0, count) },
  migrations: bundle.migrations,
});

const PARENT_CHILD = [
  'CREATE TABLE `parent` (`id` integer PRIMARY KEY NOT NULL, `name` text NOT NULL);--> statement-breakpoint\n' +
    'CREATE TABLE `child` (`id` integer PRIMARY KEY NOT NULL, `parent_id` integer NOT NULL REFERENCES `parent`(`id`) ON DELETE CASCADE);',
  // How drizzle-kit changes a column in SQLite: build a new table, copy, drop, rename.
  'PRAGMA foreign_keys=OFF;--> statement-breakpoint\n' +
    'CREATE TABLE `__new_parent` (`id` integer PRIMARY KEY NOT NULL, `name` text NOT NULL, `note` text);--> statement-breakpoint\n' +
    'INSERT INTO `__new_parent` (`id`, `name`) SELECT `id`, `name` FROM `parent`;--> statement-breakpoint\n' +
    'DROP TABLE `parent`;--> statement-breakpoint\n' +
    'ALTER TABLE `__new_parent` RENAME TO `parent`;--> statement-breakpoint\n' +
    'PRAGMA foreign_keys=ON;',
];

function seedParentChild(db: ReturnType<typeof createEmptyTestDb>): void {
  db.$client.exec(
    "INSERT INTO parent VALUES (1, 'Serum'), (2, 'Cream'); INSERT INTO child VALUES (1, 1), (2, 1), (3, 2);",
  );
}

describe('checkJournal', () => {
  it('accepts the real journal', () => {
    expect(() => checkJournal(readMigrationFolder())).not.toThrow();
  });

  it('refuses a migration dated before the one it follows (phones would skip it)', () => {
    const bundle = makeBundle('SELECT 1', 'SELECT 1');
    bundle.journal.entries = [entry(0, 2000), entry(1, 1500)];
    expect(() => checkJournal(bundle)).toThrow(/dated before/);
  });

  it('refuses gaps, missing SQL and missing breakpoints', () => {
    const gap = makeBundle('SELECT 1', 'SELECT 1');
    gap.journal.entries = [entry(0, 1), entry(2, 2)];
    expect(() => checkJournal(gap)).toThrow(/expected 1/);

    const missing = makeBundle('SELECT 1');
    missing.migrations = {};
    expect(() => checkJournal(missing)).toThrow(/Missing SQL/);

    const noBreakpoints = makeBundle('SELECT 1');
    noBreakpoints.journal.entries = [{ ...entry(0, 1), breakpoints: false }];
    expect(() => checkJournal(noBreakpoints)).toThrow(/breakpoints/);
  });
});

describe('runMigrations', () => {
  it('copies an existing database first, but not a fresh install or an up-to-date one', () => {
    const bundle = makeBundle('CREATE TABLE a (id integer)', 'CREATE TABLE b (id integer)');
    const db = createEmptyTestDb();
    const calls: (string | undefined)[] = [];
    const beforeMigrate = (plan: { current: JournalEntry | null }) => calls.push(plan.current?.tag);

    runMigrations(db, upTo(bundle, 1), { beforeMigrate });
    expect(calls).toEqual([]);
    runMigrations(db, bundle, { beforeMigrate });
    expect(calls).toEqual(['0000_test']);
    runMigrations(db, bundle, { beforeMigrate });
    expect(calls).toEqual(['0000_test']);
  });

  it('refuses a database written by a newer app and leaves it alone', () => {
    const bundle = makeBundle('CREATE TABLE a (id integer)', 'CREATE TABLE b (id integer)');
    const db = createEmptyTestDb();
    runMigrations(db, bundle);
    expect(() => runMigrations(db, upTo(bundle, 1))).toThrow(DatabaseNewerError);
    expect(() => planMigrations(db, upTo(bundle, 1))).toThrow(DatabaseNewerError);
  });

  it('rolls everything back when a statement fails, and works on the next try', () => {
    const good = makeBundle(
      'CREATE TABLE a (id integer);',
      'ALTER TABLE a ADD b integer;--> statement-breakpoint\nINSERT INTO a VALUES (1, 2);',
    );
    const bad = makeBundle(
      good.migrations.m0000 as string,
      'ALTER TABLE a ADD b integer;--> statement-breakpoint\nNOT SQL;',
    );
    const db = createEmptyTestDb();
    runMigrations(db, upTo(good, 1));
    db.$client.exec('INSERT INTO a VALUES (7)');

    expect(() => runMigrations(db, bad)).toThrow(/^Migration 0001_test failed: .*syntax error/);
    expect(db.$client.prepare('SELECT name FROM pragma_table_info(?)').pluck().all('a')).toEqual([
      'id',
    ]);
    expect(planMigrations(db, good).pending.map((e) => e.tag)).toEqual(['0001_test']);
    expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1);

    runMigrations(db, good);
    expect(db.$client.prepare('SELECT * FROM a ORDER BY id').all()).toEqual([
      { id: 1, b: 2 },
      { id: 7, b: null },
    ]);
  });

  it('keeps child rows when a migration rebuilds their parent table', () => {
    const bundle = makeBundle(...PARENT_CHILD);
    const db = createEmptyTestDb();
    runMigrations(db, upTo(bundle, 1));
    seedParentChild(db);

    runMigrations(db, bundle);
    expect(db.$client.prepare('SELECT count(*) FROM child').pluck().get()).toBe(3);
    expect(db.$client.prepare('SELECT name FROM parent ORDER BY id').pluck().all()).toEqual([
      'Serum',
      'Cream',
    ]);
    expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it("(Drizzle's own migrator loses those child rows, which is why the app doesn't use it)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jx-migrations-'));
    fs.mkdirSync(path.join(dir, 'meta'));
    const bundle = makeBundle(...PARENT_CHILD);
    const write = (count: number) => {
      for (const e of bundle.journal.entries) {
        fs.writeFileSync(
          path.join(dir, `${e.tag}.sql`),
          bundle.migrations[`m${e.tag.slice(0, 4)}`] as string,
        );
      }
      fs.writeFileSync(
        path.join(dir, 'meta', '_journal.json'),
        JSON.stringify({ entries: bundle.journal.entries.slice(0, count) }),
      );
    };
    const sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite);
    write(1);
    drizzleMigrate(db, { migrationsFolder: dir });
    seedParentChild(db as never);
    write(2);
    drizzleMigrate(db, { migrationsFolder: dir });
    expect(sqlite.prepare('SELECT count(*) FROM child').pluck().get()).toBe(0);
    fs.rmSync(dir, { recursive: true });
  });

  it('rolls back a migration that leaves a reference pointing nowhere', () => {
    const bundle = makeBundle(PARENT_CHILD[0] as string, 'DELETE FROM parent WHERE id = 1;');
    const db = createEmptyTestDb();
    runMigrations(db, upTo(bundle, 1));
    seedParentChild(db);
    expect(() => runMigrations(db, bundle)).toThrow(/broken reference/);
    expect(db.$client.prepare('SELECT count(*) FROM parent').pluck().get()).toBe(2);
    expect(planMigrations(db, bundle).pending).toHaveLength(1);
  });

  it('continues a database Drizzle migrated before (same bookkeeping)', () => {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite);
    drizzleMigrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    const plan = planMigrations(db as never, readMigrationFolder());
    expect(plan.pending).toEqual([]);
    expect(plan.current?.tag).toBe(plan.latest.tag);
  });
});

describe('backupDatabaseTo', () => {
  it('writes a full copy that opens on its own', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jx-backup-it's-"));
    const file = path.join(dir, 'copy.db');
    const db = createEmptyTestDb();
    runMigrations(db, makeBundle(PARENT_CHILD[0] as string));
    seedParentChild(db);

    backupDatabaseTo(db, file);
    const copy = new Database(file, { readonly: true });
    expect(copy.prepare('SELECT count(*) FROM child').pluck().get()).toBe(3);
    expect(copy.prepare('SELECT count(*) FROM __drizzle_migrations').pluck().get()).toBe(1);
    copy.close();
    fs.rmSync(dir, { recursive: true });
  });
});
