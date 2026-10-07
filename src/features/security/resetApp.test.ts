import { sql } from 'drizzle-orm';

import { createQueryClient } from '@/db/queryClient';
import * as schema from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { draftStore, setDraftPin } from '@/features/onboarding/draft';
import { gateStore, needsOnboarding } from '@/features/onboarding/gate';
import { hasSettingsRow, saveSettings } from '@/features/settings/repo';
import { i18n, setI18nLanguage } from '@/i18n';
import { lockStore } from '@/state/lock';
import { dismissToast, showToast, uiStore } from '@/state/ui';

import { resetDescription } from './components/ResetDialog';
import { allTables, deleteAllRows, resetCounts } from './repo';
import { resetApp } from './resetApp';

function seed(db: ReturnType<typeof createTestDb>, opts: { lastBackupAt?: number | null } = {}) {
  saveSettings(db, { language: 'en', lastBackupAt: opts.lastBackupAt ?? null });
  const products = db
    .insert(schema.product)
    .values([
      { name: 'Vitamin C serum', area: 'skin' },
      { name: 'Shampoo', area: 'hair' },
      { name: 'Old toner', area: 'skin', archivedAt: '2026-09-01' },
    ])
    .returning({ id: schema.product.id })
    .all();
  const [ing] = db
    .insert(schema.ingredient)
    .values({ name: 'Niacinamide', normalizedName: 'niacinamide' })
    .returning({ id: schema.ingredient.id })
    .all();
  db.insert(schema.productIngredient)
    .values({ productId: products[0]!.id, ingredientId: ing!.id })
    .run();
  const [routine] = db
    .insert(schema.routine)
    .values({ name: 'Morning', timeOfDay: 'morning' })
    .returning({ id: schema.routine.id })
    .all();
  db.insert(schema.routineStep)
    .values({ routineId: routine!.id, productId: products[0]!.id })
    .run();
  const [entry] = db
    .insert(schema.progressEntry)
    .values({ area: 'skin', weekStart: '2026-10-05', takenAt: 1 })
    .returning({ id: schema.progressEntry.id })
    .all();
  db.insert(schema.progressPhoto)
    .values([
      { entryId: entry!.id, angle: 'front', fileUri: 'file:///progress/a.jpg' },
      { entryId: entry!.id, angle: 'left', fileUri: 'file:///progress/b.jpg' },
    ])
    .run();
}

function rowCount(db: ReturnType<typeof createTestDb>, table: (typeof allTables)[number]): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(table)
      .get()?.n ?? 0
  );
}

describe('reset counts', () => {
  it('counts every product (archived too), every routine and every progress photo', () => {
    const db = createTestDb();
    seed(db, { lastBackupAt: Date.UTC(2026, 8, 1, 12) });
    expect(resetCounts(db)).toEqual({
      products: 3,
      routines: 1,
      photos: 2,
      lastBackupAt: Date.UTC(2026, 8, 1, 12),
    });
  });

  it('is all zero on an empty database', () => {
    expect(resetCounts(createTestDb())).toEqual({
      products: 0,
      routines: 0,
      photos: 0,
      lastBackupAt: null,
    });
  });
});

describe('deleteAllRows', () => {
  it('knows every table in the schema', () => {
    expect(allTables.length).toBeGreaterThanOrEqual(20);
    expect(allTables).toContain(schema.settings);
    expect(allTables).toContain(schema.scheduledNotification);
  });

  it('empties every table in one go and keeps the migrations', () => {
    const db = createTestDb();
    seed(db);
    deleteAllRows(db);
    for (const table of allTables) expect(rowCount(db, table)).toBe(0);
    expect(hasSettingsRow(db)).toBe(false);
    const migrations = db.$client
      .prepare('select count(*) as n from __drizzle_migrations')
      .get() as { n: number };
    expect(migrations.n).toBeGreaterThan(0);
    // Foreign keys are still on afterwards.
    expect(() => db.insert(schema.routineStep).values({ routineId: 999 }).run()).toThrow(
      'FOREIGN KEY',
    );
  });
});

describe('resetDescription', () => {
  beforeAll(() => setI18nLanguage('en'));
  const t = i18n.getFixedT('en');
  const now = Date.UTC(2026, 9, 7, 12);

  it('names what is lost with real counts and the last backup', () => {
    const text = resetDescription(
      t,
      { products: 84, routines: 6, photos: 52, lastBackupAt: Date.UTC(2026, 8, 1, 12) },
      'en',
      now,
    );
    expect(text).toBe(
      'This deletes 84 products, 6 routines and 52 progress photos. Progress photos are not in ' +
        'your gallery, so they are lost too. Your last backup is from 1 Sep; you can restore it ' +
        'after the reset.',
    );
    expect(text).not.toMatch(/export/i);
  });

  it('leaves out the backup sentence when there never was a backup, and says so', () => {
    const text = resetDescription(
      t,
      { products: 1, routines: 0, photos: 0, lastBackupAt: null },
      'en',
      now,
    );
    expect(text).toBe(
      "This deletes 1 product, 0 routines and 0 progress photos. This can't be undone.",
    );
  });

  it('uses Lithuanian plural forms', () => {
    const lt = i18n.getFixedT('lt');
    const text = resetDescription(
      lt,
      { products: 84, routines: 6, photos: 21, lastBackupAt: Date.UTC(2026, 8, 1, 12) },
      'lt',
      now,
    );
    expect(text).toContain('84 produktai, 6 rutinos ir 21 progreso nuotrauka');
    expect(text).toContain('2026-09-01');
  });
});

function fakes() {
  const db = createTestDb();
  seed(db);
  const queryClient = createQueryClient({ gcTime: Infinity });
  queryClient.setQueryData(['products', 'list', {}], [1, 2, 3]);
  const calls: string[] = [];
  return {
    db,
    queryClient,
    calls,
    deps: {
      db,
      queryClient,
      cancelNotifications: jest.fn(async () => {
        // Notifications go first, while their rows are still there.
        calls.push(`notifications:${rowCount(db, schema.product)}`);
      }),
      deletePhotoFolders: jest.fn(() => {
        calls.push('folders');
      }),
      resetSecureKeys: jest.fn(async () => {
        calls.push('secure');
      }),
      openWelcome: jest.fn(() => {
        calls.push(`welcome:${lockStore.state.locked}`);
      }),
    },
  };
}

describe('resetApp', () => {
  beforeEach(() => {
    lockStore.setState(() => ({ locked: true, lastBackgroundAt: 5, pendingUrl: '/products/1' }));
    gateStore.setState(() => ({ pinMissing: false }));
  });

  afterEach(() => {
    for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  });

  it('calls every cleanup, empties the database and lands on O1', async () => {
    const { db, queryClient, calls, deps } = fakes();
    setDraftPin('2580');
    showToast({ message: 'Vitamin C serum moved to Archive' });

    await resetApp(deps);

    expect(deps.cancelNotifications).toHaveBeenCalledTimes(1);
    expect(deps.deletePhotoFolders).toHaveBeenCalledTimes(1);
    expect(deps.resetSecureKeys).toHaveBeenCalledTimes(1);
    expect(deps.openWelcome).toHaveBeenCalledTimes(1);
    // Notifications before the rows; O1 opens while the lock still covers the app.
    expect(calls).toEqual(['notifications:3', 'folders', 'secure', 'welcome:true']);
    for (const table of allTables) expect(rowCount(db, table)).toBe(0);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(draftStore.state.pin).toBeNull();
    expect(uiStore.state.toasts).toHaveLength(0);
    expect(lockStore.state).toEqual({ locked: false, lastBackgroundAt: null, pendingUrl: null });
    expect(gateStore.state.pinMissing).toBe(true);
    expect(needsOnboarding(db)).toBe(true);
  });

  it('keeps going when notifications, files or secure storage fail', async () => {
    const { db, deps } = fakes();
    deps.cancelNotifications.mockRejectedValueOnce(new Error('no permission'));
    deps.deletePhotoFolders.mockImplementationOnce(() => {
      throw new Error('busy');
    });
    deps.resetSecureKeys.mockRejectedValueOnce(new Error('keychain'));
    await resetApp(deps);
    expect(hasSettingsRow(db)).toBe(false);
    expect(deps.openWelcome).toHaveBeenCalled();
  });

  it('stops before deleting anything else when the database can not be emptied', async () => {
    const { db, deps } = fakes();
    const broken = Object.assign(Object.create(db) as typeof db, {
      transaction: () => {
        throw new Error('disk I/O error');
      },
    });
    await expect(resetApp({ ...deps, db: broken })).rejects.toThrow('disk I/O error');
    expect(deps.resetSecureKeys).not.toHaveBeenCalled();
    expect(deps.deletePhotoFolders).not.toHaveBeenCalled();
    expect(deps.openWelcome).not.toHaveBeenCalled();
    expect(hasSettingsRow(db)).toBe(true);
    expect(lockStore.state.locked).toBe(true);
  });
});
