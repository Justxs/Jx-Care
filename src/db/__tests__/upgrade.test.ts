/**
 * @jest-environment node
 *
 * App updates never lose data (docs/releasing.md). For every migration there is a frozen
 * snapshot of realistic data as the app stored it at that version (`src/db/upgrade-fixtures/`).
 * Each one is loaded into a database at its version and upgraded to the newest; every row and
 * value must still be there. Also checks that shipped migrations are unchanged, that the journal
 * can't skip a migration and that schema.ts has no change without a migration.
 *
 * `pnpm db:fixture` (WRITE_DB_FIXTURES=1) writes the snapshot for a new migration.
 */
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

import { seedProgress } from '@/storybook/seeds/progress';
import { deleteRoutine } from '@/features/routines/repo';
import { allTables } from '@/features/security/repo';

import { checkJournal, runMigrations, type JournalEntry, type MigrationBundle } from '../migrate';
import appBundle from '../migrations/migrations';
import * as schema from '../schema';
import {
  product,
  progressEntry,
  progressPhoto,
  scheduledNotification,
  shoppingDismissal,
} from '../schema';
import { createEmptyTestDb, MIGRATIONS_FOLDER, readMigrationFolder } from '../test-db';
import type { Db } from '../types';

type Row = Record<string, string | number | null>;
type Tables = Record<string, Row[]>;
type Fixture = { tag: string; note: string; tables: Tables };

const FIXTURES = path.join(__dirname, '..', 'upgrade-fixtures');
const LOCK = path.join(__dirname, '..', 'migrations.lock.json');
const WRITE = process.env.WRITE_DB_FIXTURES === '1';

/**
 * Intended data changes, keyed by the migration that makes them: how that migration changes the
 * data of the version before it (a renamed column, a split table, a value rewritten). A migration
 * that only adds tables, columns or indexes needs nothing here. Anything a migration changes that
 * isn't listed fails the test: that is data a phone would lose.
 */
const expectedChanges: Record<string, (tables: Tables) => Tables> = {};

const bundle = readMigrationFolder();
const entries = checkJournal(bundle);
const latest = entries[entries.length - 1] as JournalEntry;

const upTo = (entry: JournalEntry): MigrationBundle => ({
  journal: { entries: entries.slice(0, entry.idx + 1) },
  migrations: bundle.migrations,
});

type TestDb = ReturnType<typeof createEmptyTestDb>;

function dbAt(entry: JournalEntry): TestDb {
  const db = createEmptyTestDb();
  runMigrations(db, upTo(entry));
  return db;
}

const INTERNAL = new Set(['__drizzle_migrations', 'sqlite_sequence']);

function tableNames(db: TestDb): string[] {
  return db.$client
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid`)
    .pluck()
    .all()
    .filter((name) => !INTERNAL.has(name as string)) as string[];
}

function columnsOf(db: TestDb, table: string): string[] {
  return db.$client.prepare(`SELECT name FROM pragma_table_info(?)`).pluck().all(table) as string[];
}

function dump(db: TestDb): Tables {
  const out: Tables = {};
  for (const table of tableNames(db)) {
    out[table] = db.$client.prepare(`SELECT * FROM "${table}" ORDER BY rowid`).all() as Row[];
  }
  return out;
}

function load(db: TestDb, tables: Tables): void {
  db.$client.pragma('foreign_keys = OFF');
  for (const [table, rows] of Object.entries(tables)) {
    for (const row of rows) {
      const cols = Object.keys(row);
      db.$client
        .prepare(
          `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        )
        .run(...cols.map((c) => row[c]));
    }
  }
  db.$client.pragma('foreign_keys = ON');
  expect(db.$client.pragma('foreign_key_check')).toEqual([]);
}

const fixturePath = (tag: string) => path.join(FIXTURES, `${tag}.json`);

function readFixture(tag: string): Fixture | null {
  const file = fixturePath(tag);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Fixture) : null;
}

// ─── Writing a snapshot (pnpm db:fixture) ───────────────────────────────────

/** A phone's documents folder on iOS; it moves when the app updates (see rebasePhotoUris). */
const PHONE_DOCUMENTS =
  'file:///var/mobile/Containers/Data/Application/0F8E1C2A-5B7D-4E39-9A61-3D2C8B4F7E10/Documents/';

/** Realistic data through the app's own repo functions, so it is what a phone would store. */
function seedRealisticData(db: Db): void {
  seedProgress(db);
  const now = Date.parse('2026-10-07T08:00:00Z');
  for (const id of [1, 3, 7]) {
    db.update(product)
      .set({ photoUri: `${PHONE_DOCUMENTS}products/mg${id}k2x-${id}f9a8c1d.jpg` })
      .where(eq(product.id, id))
      .run();
  }
  const photos = db
    .select({
      id: progressPhoto.id,
      angle: progressPhoto.angle,
      area: progressEntry.area,
      week: progressEntry.weekStart,
    })
    .from(progressPhoto)
    .innerJoin(progressEntry, eq(progressEntry.id, progressPhoto.entryId))
    .all();
  for (const p of photos) {
    db.update(progressPhoto)
      .set({ fileUri: `${PHONE_DOCUMENTS}progress/${p.area}/${p.week}/${p.angle}-${now}.jpg` })
      .where(eq(progressPhoto.id, p.id))
      .run();
  }
  db.insert(shoppingDismissal).values({ productId: 5, dismissedAt: now }).run();
  db.insert(scheduledNotification)
    .values([
      {
        entityType: 'product',
        entityId: 2,
        kind: 'expiry_warning',
        notificationId: 'n-expiry-2',
        fireAt: now + 86_400_000,
      },
      {
        entityType: 'routine',
        entityId: 1,
        kind: 'routine',
        notificationId: 'n-routine-1',
        fireAt: now + 3_600_000,
      },
    ])
    .run();
  // Evening B deleted (a soft delete keeps its past days in the calendar).
  deleteRoutine(db, 3, now);
}

/** Snapshot for `entry`: realistic data at the newest version, cut to the tables and columns `entry` had. */
function makeFixture(entry: JournalEntry): Fixture {
  const db = dbAt(latest);
  seedRealisticData(db);
  const data = dump(db);
  const old = dbAt(entry);
  const tables: Tables = {};
  for (const table of tableNames(old)) {
    const cols = new Set(columnsOf(old, table));
    tables[table] = (data[table] ?? []).map((row) =>
      Object.fromEntries(Object.entries(row).filter(([col]) => cols.has(col))),
    );
  }
  return {
    tag: entry.tag,
    note: 'Frozen: data as the app stored it at this migration. Never edit; see docs/releasing.md.',
    tables,
  };
}

if (WRITE) {
  fs.mkdirSync(FIXTURES, { recursive: true });
  for (const entry of entries) {
    if (!fs.existsSync(fixturePath(entry.tag))) {
      fs.writeFileSync(fixturePath(entry.tag), `${JSON.stringify(makeFixture(entry), null, 2)}\n`);
    }
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('migration files', () => {
  it('the app bundles exactly the migration files on disk', () => {
    const app = appBundle as MigrationBundle;
    expect(app.journal.entries).toEqual(bundle.journal.entries);
    expect(Object.keys(app.migrations).sort()).toEqual(Object.keys(bundle.migrations).sort());
    for (const [key, text] of Object.entries(bundle.migrations)) {
      expect(app.migrations[key]?.replace(/\r\n/g, '\n')).toBe(text.replace(/\r\n/g, '\n'));
    }
  });

  it('every migration is locked and unchanged since it was locked', () => {
    const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8')) as {
      migrations: Record<string, string>;
    };
    const actual = Object.fromEntries(
      entries.map((e) => [
        e.tag,
        createHash('sha256')
          .update(
            fs
              .readFileSync(path.join(MIGRATIONS_FOLDER, `${e.tag}.sql`), 'utf8')
              .replace(/\r\n/g, '\n'),
          )
          .digest('hex'),
      ]),
    );
    // A failure here: a shipped migration was edited or removed (put the change in a new
    // migration), or a new one isn't locked yet (run `node scripts/db-lock.mjs`).
    expect(actual).toEqual(lock.migrations);
  });

  it('schema.ts has no change that is missing a migration', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const kit = require('drizzle-kit/api') as {
      generateSQLiteDrizzleJson: (schema: Record<string, unknown>) => Promise<unknown>;
      generateSQLiteMigration: (prev: unknown, cur: unknown) => Promise<string[]>;
    };
    const snapshot = JSON.parse(
      fs.readFileSync(
        path.join(MIGRATIONS_FOLDER, 'meta', `${latest.tag.slice(0, 4)}_snapshot.json`),
        'utf8',
      ),
    ) as unknown;
    const current = await kit.generateSQLiteDrizzleJson({ ...schema });
    // A failure here: run `pnpm db:generate` to add the migration.
    expect(await kit.generateSQLiteMigration(snapshot, current)).toEqual([]);
  });
});

describe.each(entries.map((e) => [e.tag, e] as const))('upgrading from %s', (tag, entry) => {
  const fixture = readFixture(tag);

  it('has a frozen snapshot of realistic data', () => {
    // A failure here: run `pnpm db:fixture` and commit src/db/upgrade-fixtures/.
    expect(fixture).not.toBeNull();
    const db = dbAt(entry);
    // Every table of that version has rows, so every table is covered.
    for (const table of tableNames(db))
      expect([table, fixture?.tables[table]?.length ?? 0]).not.toEqual([table, 0]);
  });

  if (!fixture) return;

  function expected(): Tables {
    let tables = fixture!.tables;
    for (const e of entries.slice(entry.idx + 1))
      tables = expectedChanges[e.tag]?.(tables) ?? tables;
    return tables;
  }

  /** Every expected row, value for value, in the upgraded database. */
  function expectNothingLost(db: TestDb): void {
    const after = dump(db);
    for (const [table, rows] of Object.entries(expected())) {
      expect([table, table in after]).toEqual([table, true]);
      const kept = new Set(columnsOf(db, table));
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      // A dropped column is lost data, unless expectedChanges says so.
      expect(cols.filter((c) => !kept.has(c)).map((c) => `${table}.${c}`)).toEqual([]);
      const pick = (r: Row) => JSON.stringify(cols.map((c) => r[c] ?? null));
      expect((after[table] ?? []).map(pick).sort()).toEqual(rows.map(pick).sort());
    }
  }

  it('keeps every row and value when updating straight to the newest version', () => {
    const db = dbAt(entry);
    load(db, fixture.tables);
    const backups: string[] = [];
    const plan = runMigrations(db, bundle, { beforeMigrate: (p) => backups.push(p.current!.tag) });

    expect(plan.pending.map((e) => e.tag)).toEqual(entries.slice(entry.idx + 1).map((e) => e.tag));
    // An existing install is copied before anything changes.
    expect(backups).toEqual(plan.pending.length > 0 ? [tag] : []);
    expectNothingLost(db);
    expect(db.$client.pragma('foreign_key_check')).toEqual([]);
    expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1);
    // The app's own schema reads every table of the upgraded database.
    for (const table of allTables) expect(() => db.select().from(table).all()).not.toThrow();
  });

  it('ends with the same data when updating one version at a time', () => {
    const db = dbAt(entry);
    load(db, fixture.tables);
    for (const next of entries.slice(entry.idx + 1)) runMigrations(db, upTo(next));
    expectNothingLost(db);

    const direct = dbAt(entry);
    load(direct, fixture.tables);
    runMigrations(direct, bundle);
    expect(dump(db)).toEqual(dump(direct));
  });

  it('opens with no work on the next launch', () => {
    const db = dbAt(entry);
    load(db, fixture.tables);
    runMigrations(db, bundle);
    const before = dump(db);
    expect(runMigrations(db, bundle).pending).toEqual([]);
    expect(dump(db)).toEqual(before);
  });
});
