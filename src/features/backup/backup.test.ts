import { strFromU8 } from 'fflate';

import * as schema from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { createPinService } from '@/features/security/pin';
import { deleteAllRows } from '@/features/security/repo';
import { createMemoryKV } from '@/features/security/secureStore';
import { getSettings, saveSettings } from '@/features/settings/repo';

import { backupFileName, buildBackupFile, exportBackup, writeBackup } from './export';
import { createFakeBackupFiles, FAKE_DOCUMENTS } from './fakeFiles';
import {
  BACKUP_JSON_NAME,
  backupTables,
  BackupError,
  CURRENT_SCHEMA_VERSION,
  FORMAT_VERSION,
  isSafePhotoPath,
  migrateForward,
  parseBackupJson,
  toRelativePath,
  validateBackup,
  type BackupFile,
} from './format';
import { prepareImport, restoreBackup } from './import';
import { readAllData } from './repo';
import { listZipEntries, readZipEntry } from './zip';

jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

type TestDb = ReturnType<typeof createTestDb>;

const EXPORTED_AT = new Date(2026, 8, 1, 12, 0).getTime();
const noPause = async () => {};

/** One or more rows in every table, photos on the fake disk. */
function seed(db: TestDb, files: ReturnType<typeof createFakeBackupFiles>) {
  saveSettings(db, {
    language: 'lt',
    currency: 'GBP',
    expiryRemindersOn: true,
    skinAngles: ['front', 'left'],
    photoGuideOpacity: 0.45,
    setupDoneAt: '2026-08-20',
  });
  const productPhoto = files.addPhoto('products/serum.jpg');
  const [serum, shampoo] = db
    .insert(schema.product)
    .values([
      {
        name: 'Vitamin C serum',
        brand: 'Brand',
        area: 'skin',
        category: 'serum',
        photoUri: productPhoto,
        size: 30.5,
        unit: 'ml',
        priceCents: 2499,
        purchasedAt: '2026-08-01',
        openedAt: '2026-08-02',
        paoMonths: 6,
        rating: 4,
        wouldRebuy: true,
      },
      { name: 'Shampoo', area: 'hair', archivedAt: '2026-09-01', wouldRebuy: false },
    ])
    .returning()
    .all();
  const [group] = db.insert(schema.ingredientGroup).values({ name: 'Retinoids' }).returning().all();
  const [ing] = db
    .insert(schema.ingredient)
    .values({ name: 'Retinol', normalizedName: 'retinol', groupId: group!.id })
    .returning()
    .all();
  db.insert(schema.productIngredient)
    .values({ productId: serum!.id, ingredientId: ing!.id, position: 2 })
    .run();
  db.insert(schema.conflict)
    .values({ leftKind: 'group', leftId: group!.id, rightKind: 'ingredient', rightId: ing!.id })
    .run();
  db.insert(schema.avoidItem).values({ kind: 'ingredient', refId: ing!.id, note: 'Itchy' }).run();
  const [routine] = db
    .insert(schema.routine)
    .values({ name: 'Evening', timeOfDay: 'evening', daysOfWeek: [1, 3, 5], reminderTime: '21:00' })
    .returning()
    .all();
  const [step] = db
    .insert(schema.routineStep)
    .values({
      routineId: routine!.id,
      productId: serum!.id,
      scheduleKind: 'interval',
      everyNDays: 3,
      startDate: '2026-08-01',
      waitSeconds: 60,
    })
    .returning()
    .all();
  db.insert(schema.routineLog)
    .values({
      routineId: routine!.id,
      day: '2026-09-01',
      dueStepIds: [step!.id],
      doneStepIds: [step!.id],
      completedAt: EXPORTED_AT - 1000,
    })
    .run();
  db.insert(schema.routineChoice)
    .values({ timeOfDayKey: 'evening', weekday: 1, routineId: routine!.id })
    .run();
  const [task] = db
    .insert(schema.hairTask)
    .values({ name: 'Wash', kind: 'wash', productIds: [shampoo!.id], everyNDays: 3 })
    .returning()
    .all();
  db.insert(schema.hairLog)
    .values({ hairTaskId: task!.id, day: '2026-09-01', productIds: [shampoo!.id], note: 'ok' })
    .run();
  db.insert(schema.shoppingItem)
    .values({ productId: shampoo!.id, name: 'Shampoo', list: 'to_buy' })
    .run();
  db.insert(schema.shoppingDismissal)
    .values({ productId: serum!.id, dismissedAt: EXPORTED_AT - 5000 })
    .run();
  const [entry] = db
    .insert(schema.progressEntry)
    .values({
      area: 'skin',
      weekStart: '2026-08-31',
      takenAt: EXPORTED_AT - 2000,
      rating: 4,
      tags: ['calm', 'glow'],
      note: 'Better',
    })
    .returning()
    .all();
  const front = files.addPhoto('progress/skin/2026-08-31/front-1.jpg');
  const left = files.addPhoto('progress/skin/2026-08-31/left-1.jpg');
  db.insert(schema.progressPhoto)
    .values([
      { entryId: entry!.id, angle: 'front', fileUri: front },
      { entryId: entry!.id, angle: 'left', fileUri: left },
    ])
    .run();
  db.insert(schema.conditionLog)
    .values({ day: '2026-09-01', area: 'skin', states: ['dry'], note: 'Cold' })
    .run();
  db.insert(schema.productNote)
    .values({ productId: serum!.id, day: '2026-09-01', text: 'Stings a bit', tags: ['redness'] })
    .run();
  db.insert(schema.scheduledNotification)
    .values({
      entityType: 'product',
      entityId: serum!.id,
      kind: 'expiry_warning',
      notificationId: 'product:1:expiry_warning:x#abc',
      fireAt: EXPORTED_AT + 1000,
    })
    .run();
}

function setUp() {
  const db = createTestDb();
  const files = createFakeBackupFiles();
  seed(db, files);
  return { db, files };
}

/** Every table as an export at `EXPORTED_AT` writes it (the file says it is the last backup). */
function asExported(db: TestDb) {
  const before = readAllData(db);
  before.settings = before.settings!.map((row) => ({ ...row, lastBackupAt: EXPORTED_AT }));
  return before;
}

describe('seed', () => {
  it('fills every table a backup holds', () => {
    const { db } = setUp();
    for (const [name, rows] of Object.entries(readAllData(db))) {
      expect([name, rows.length > 0]).toEqual([name, true]);
    }
    expect([...backupTables.keys()]).not.toContain('scheduled_notification');
  });
});

describe('format', () => {
  it('writes the envelope, relative photo paths and no notification rows', () => {
    const { db } = setUp();
    const file = buildBackupFile(db, FAKE_DOCUMENTS, EXPORTED_AT);
    expect(file).toMatchObject({
      app: 'jx-care',
      formatVersion: FORMAT_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: EXPORTED_AT,
    });
    expect(CURRENT_SCHEMA_VERSION).toMatch(/^\d{4}_/);
    expect(file.data.product![0]!.photoUri).toBe('products/serum.jpg');
    expect(file.data.progress_photo!.map((p) => p.fileUri)).toEqual([
      'progress/skin/2026-08-31/front-1.jpg',
      'progress/skin/2026-08-31/left-1.jpg',
    ]);
    expect(file.data.scheduled_notification).toBeUndefined();
    expect(file.data.settings![0]!.lastBackupAt).toBe(EXPORTED_AT);
  });

  it('never holds the PIN or the recovery question and answer', async () => {
    const { db, files } = setUp();
    const kv = createMemoryKV();
    await createPinService(kv).completeOnboarding({
      pin: '2580',
      question: { kind: 'custom', text: 'Street I grew up on' },
      answer: 'Vilniaus gatve',
    });
    expect(kv.map.size).toBeGreaterThan(0);
    const uri = await writeBackup('json', { db, files, now: EXPORTED_AT });
    const text = strFromU8(files.disk.get(uri)!);
    for (const value of ['2580', 'Street I grew up on', 'Vilniaus', ...kv.map.values()]) {
      expect(text).not.toContain(value);
    }
    const secretParts = [...kv.map.values()]
      .flatMap((raw) => Object.values(JSON.parse(raw) as Record<string, unknown>))
      .filter((part): part is string => typeof part === 'string' && part.length > 3);
    expect(secretParts.length).toBeGreaterThan(0);
    for (const part of [...secretParts, ...[...kv.map.keys()].map((key) => `"${key}"`)]) {
      expect(text).not.toContain(part);
    }
    const keys = new Set<string>();
    for (const rows of Object.values((JSON.parse(text) as BackupFile).data)) {
      for (const row of rows) for (const key of Object.keys(row)) keys.add(key);
    }
    expect([...keys].filter((k) => /pin|recover|answer|secure/i.test(k))).toEqual([]);
  });

  it('turns photo uris into paths, also from another documents folder', () => {
    expect(toRelativePath('file:///documents/products/a.jpg', FAKE_DOCUMENTS)).toBe(
      'products/a.jpg',
    );
    expect(toRelativePath('file:///old/Documents/progress/skin/w/a.jpg', FAKE_DOCUMENTS)).toBe(
      'progress/skin/w/a.jpg',
    );
  });

  it('accepts only photo paths inside the photo folders', () => {
    expect(isSafePhotoPath('products/a.jpg')).toBe(true);
    expect(isSafePhotoPath('progress/skin/2026-08-31/front-1.jpg')).toBe(true);
    for (const bad of [
      '../products/a.jpg',
      'products/../../x',
      '/products/a.jpg',
      'products/',
      'secure/pin',
      'products\\..\\x',
      'products',
    ]) {
      expect([bad, isSafePhotoPath(bad)]).toEqual([bad, false]);
    }
  });

  it('runs the data migrations from the backup schema up to the app', () => {
    const calls: number[] = [];
    const out = migrateForward({ product: [{ id: 1, title: 'A' }] }, '0000_a', '0002_c', {
      0: (data) => {
        calls.push(0);
        return {
          ...data,
          product: data.product!.map(({ title, ...rest }) => ({ ...rest, name: title })),
        };
      },
      1: (data) => {
        calls.push(1);
        return data;
      },
      2: () => {
        throw new Error('not reached');
      },
    });
    expect(calls).toEqual([0, 1]);
    expect(out.product).toEqual([{ id: 1, name: 'A' }]);
  });
});

const valid = () => buildBackupFile(setUp().db, FAKE_DOCUMENTS, EXPORTED_AT);

/** 'ok', or the code of the BackupError the file is refused with. */
function codeOf(input: unknown): string {
  try {
    validateBackup(input);
    return 'ok';
  } catch (error) {
    return error instanceof BackupError ? error.code : 'other';
  }
}

describe('validation', () => {
  it('accepts a backup it wrote', () => {
    expect(codeOf(JSON.parse(JSON.stringify(valid())))).toBe('ok');
  });

  it('refuses a file that is not a Jx Care backup', () => {
    expect(codeOf({ hello: 'world' })).toBe('notBackup');
    expect(codeOf(null)).toBe('notBackup');
    expect(() => parseBackupJson('not json {')).toThrow(BackupError);
  });

  it('refuses a newer format or schema with its own message', () => {
    expect(codeOf({ ...valid(), formatVersion: FORMAT_VERSION + 1 })).toBe('newer');
    expect(codeOf({ ...valid(), schemaVersion: '9999_future' })).toBe('newer');
  });

  it('refuses a broken file', () => {
    const file = valid();
    expect(codeOf({ ...file, data: 'nope' })).toBe('damaged');
    expect(codeOf({ ...file, exportedAt: 'yesterday' })).toBe('damaged');
    expect(codeOf({ ...file, schemaVersion: 'abc' })).toBe('damaged');
    // A required column missing.
    const noName = structuredClone(file);
    delete noName.data.product![0]!.name;
    expect(codeOf(noName)).toBe('damaged');
    // A wrong type.
    const badType = structuredClone(file);
    badType.data.routine![0]!.daysOfWeek = 'mon';
    expect(codeOf(badType)).toBe('damaged');
    // No settings row.
    expect(codeOf({ ...file, data: { ...file.data, settings: [] } })).toBe('damaged');
    // A photo path outside the photo folders.
    const escape = structuredClone(file);
    escape.data.product![0]!.photoUri = '../../secure/pin';
    expect(codeOf(escape)).toBe('damaged');
  });

  it('migrates an older schema forward and fills new columns from defaults', () => {
    const file = valid();
    const old = structuredClone(file);
    old.schemaVersion = '0000_ancient_ultron';
    delete old.data.settings![0]!.productView;
    const out = validateBackup(old);
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.data.settings![0]!.productView).toBeUndefined();
  });
});

describe('round trip', () => {
  it('JSON: export, wipe, import gives every table back row for row with its ids', async () => {
    const { db, files } = setUp();
    const before = asExported(db);
    const shared: string[] = [];
    await exportBackup('json', {
      db,
      files,
      now: EXPORTED_AT,
      share: async (uri) => {
        shared.push(uri);
      },
    });
    expect(shared).toEqual([`file:///cache/${backupFileName('json', EXPORTED_AT)}`]);
    expect(getSettings(db).lastBackupAt).toBe(EXPORTED_AT);

    deleteAllRows(db);
    expect(readAllData(db).product).toEqual([]);

    const prepared = await prepareImport(shared[0]!, files);
    expect(prepared.preview).toEqual({
      products: 2,
      routines: 1,
      photos: 2,
      exportedAt: EXPORTED_AT,
      photoFiles: 0,
    });
    await restoreBackup(prepared, { db, files, pause: noPause });

    const after = readAllData(db);
    for (const name of backupTables.keys()) {
      expect([name, after[name]]).toEqual([name, before[name]]);
    }
    // What was scheduled on this phone isn't restored; sync() rebuilds it.
    expect(db.select().from(schema.scheduledNotification).all()).toEqual([]);
  });

  it('zip: restores the photo files and points the rows at them', async () => {
    const { db, files } = setUp();
    files.addPhoto('products/orphan.jpg', new Uint8Array([9, 9]));
    const progress: number[] = [];
    const uri = await writeBackup('zip', {
      db,
      files,
      now: EXPORTED_AT,
      pause: noPause,
      onProgress: (p) => progress.push(p.done / p.total),
    });
    expect(progress.at(-1)).toBe(1);
    const zipBytes = files.disk.get(uri)!;
    expect(listZipEntries(zipBytes).sort()).toEqual(
      [
        BACKUP_JSON_NAME,
        'products/orphan.jpg',
        'products/serum.jpg',
        'progress/skin/2026-08-31/front-1.jpg',
        'progress/skin/2026-08-31/left-1.jpg',
      ].sort(),
    );
    const photosBefore = files.photos();
    const before = readAllData(db);

    // A new phone: an empty database (after onboarding) and no photos.
    const db2 = createTestDb();
    saveSettings(db2, { language: 'en' });
    const files2 = createFakeBackupFiles();
    files2.addPhoto('products/from-this-phone.jpg');
    files2.disk.set(uri, zipBytes);

    const prepared = await prepareImport(uri, files2);
    expect(prepared.preview.photoFiles).toBe(4);
    await restoreBackup(prepared, { db: db2, files: files2, pause: noPause });

    expect(files2.photos()).toEqual(photosBefore);
    const after = readAllData(db2);
    for (const name of backupTables.keys()) {
      if (name === 'settings') continue;
      expect([name, after[name]]).toEqual([name, before[name]]);
    }
    expect(after.settings![0]).toEqual({ ...before.settings![0], lastBackupAt: EXPORTED_AT });
    expect(readZipEntry(zipBytes, 'products/serum.jpg')).toEqual(
      photosBefore.get('products/serum.jpg'),
    );
  });

  it('JSON on a phone without the photos: product photos are dropped, other files removed', async () => {
    const { db, files } = setUp();
    const uri = await writeBackup('json', { db, files, now: EXPORTED_AT });
    const db2 = createTestDb();
    const files2 = createFakeBackupFiles();
    files2.addPhoto('progress/skin/2020-01-06/front-1.jpg');
    files2.disk.set(uri, files.disk.get(uri)!);

    await restoreBackup(await prepareImport(uri, files2), { db: db2, files: files2 });
    const products = readAllData(db2).product!;
    expect(products.map((p) => p.photoUri)).toEqual([null, null]);
    // Progress photo rows keep their paths (the weeks keep rating, tags and notes).
    expect(readAllData(db2).progress_photo!.map((p) => p.fileUri)).toEqual([
      `${FAKE_DOCUMENTS}progress/skin/2026-08-31/front-1.jpg`,
      `${FAKE_DOCUMENTS}progress/skin/2026-08-31/left-1.jpg`,
    ]);
    expect(files2.photos().size).toBe(0);
  });
});

/** Seeded data and a JSON backup of it, to break before importing. */
async function currentAndBackup() {
  const { db, files } = setUp();
  const uri = await writeBackup('json', { db, files, now: EXPORTED_AT });
  const file = JSON.parse(strFromU8(files.disk.get(uri)!)) as BackupFile;
  return { db, files, file };
}

/** A zip backup of the seeded phone, and another phone with its own rows and photos. */
async function zipAndOtherPhone() {
  const { db, files } = setUp();
  const uri = await writeBackup('zip', { db, files, now: EXPORTED_AT, pause: noPause });
  const db2 = createTestDb();
  saveSettings(db2, { language: 'en' });
  const files2 = createFakeBackupFiles();
  db2
    .insert(schema.product)
    .values({ name: 'Old cream', area: 'skin', photoUri: files2.addPhoto('products/old.jpg') })
    .run();
  files2.addPhoto('progress/hair/2026-01-05/front-1.jpg');
  files2.disk.set(uri, files.disk.get(uri)!);
  const prepared = await prepareImport(uri, files2);
  return { db2, files2, prepared, rows: readAllData(db2), photos: files2.photos() };
}

describe('failures leave the current data untouched', () => {
  it('a row that breaks a constraint mid-insert rolls everything back', async () => {
    const { db, files, file } = await currentAndBackup();
    const before = readAllData(db);
    const photos = files.photos();
    // Two products with the same id: the second insert fails after every row was deleted.
    file.data.product = [file.data.product![0]!, { ...file.data.product![1]!, id: 1 }];
    files.disk.set('file:///cache/broken.json', new TextEncoder().encode(JSON.stringify(file)));

    const prepared = await prepareImport('file:///cache/broken.json', files);
    await expect(restoreBackup(prepared, { db, files })).rejects.toThrow(/UNIQUE constraint/);
    expect(readAllData(db)).toEqual(before);
    expect(files.photos()).toEqual(photos);
  });

  it('a key that points nowhere fails at commit and rolls back', async () => {
    const { db, files, file } = await currentAndBackup();
    const before = readAllData(db);
    file.data.routine_step = file.data.routine_step!.map((s) => ({ ...s, routineId: 999 }));
    files.disk.set('file:///cache/broken.json', new TextEncoder().encode(JSON.stringify(file)));

    const prepared = await prepareImport('file:///cache/broken.json', files);
    await expect(restoreBackup(prepared, { db, files })).rejects.toThrow(/FOREIGN KEY/);
    expect(readAllData(db)).toEqual(before);
  });

  it('a zip that breaks while unpacking photos changes nothing', async () => {
    const { db, files } = setUp();
    const uri = await writeBackup('zip', { db, files, now: EXPORTED_AT, pause: noPause });
    const prepared = await prepareImport(uri, files);
    const before = readAllData(db);
    const photos = files.photos();
    // The file is gone (or unreadable) by the time Replace all data is pressed.
    files.disk.delete(uri);
    await expect(restoreBackup(prepared, { db, files, pause: noPause })).rejects.toBeInstanceOf(
      BackupError,
    );
    expect(readAllData(db)).toEqual(before);
    expect(files.photos()).toEqual(photos);
    expect(files.folderExists('restore-staging')).toBe(false);
  });

  it('zip: a photo folder that fails to move at any step leaves the current rows and photos', async () => {
    const ok = await zipAndOtherPhone();
    const moves: string[] = [];
    ok.files2.onMove = (from, to) => moves.push(`${from} -> ${to}`);
    await restoreBackup(ok.prepared, { db: ok.db2, files: ok.files2, pause: noPause });
    expect(moves).toEqual([
      'products -> restore-previous/products',
      'progress -> restore-previous/progress',
      'restore-staging/products -> products',
      'restore-staging/progress -> progress',
    ]);
    expect(ok.files2.folderExists('restore-staging')).toBe(false);
    expect(ok.files2.folderExists('restore-previous')).toBe(false);

    for (const failAt of moves.keys()) {
      const { db2, files2, prepared, rows, photos } = await zipAndOtherPhone();
      let n = 0;
      files2.onMove = () => {
        if (n++ === failAt) throw new Error('disk full');
      };
      await expect(
        restoreBackup(prepared, { db: db2, files: files2, pause: noPause }),
      ).rejects.toThrow('disk full');
      expect([failAt, readAllData(db2)]).toEqual([failAt, rows]);
      expect([failAt, files2.photos()]).toEqual([failAt, photos]);
      expect(files2.folderExists('restore-staging')).toBe(false);
    }
  });

  it('zip: rows that fail to insert put the current photo folders back', async () => {
    const { db2, files2, prepared, rows, photos } = await zipAndOtherPhone();
    const products = prepared.file.data.product!;
    prepared.file.data.product = [products[0]!, { ...products[1]!, id: products[0]!.id }];

    await expect(
      restoreBackup(prepared, { db: db2, files: files2, pause: noPause }),
    ).rejects.toThrow(/UNIQUE constraint/);
    expect(readAllData(db2)).toEqual(rows);
    expect(files2.photos()).toEqual(photos);
    expect(files2.folderExists('restore-staging')).toBe(false);
  });

  it('a damaged zip or a zip without backup.json is refused before anything', async () => {
    const files = createFakeBackupFiles();
    files.disk.set('file:///cache/x.zip', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]));
    await expect(prepareImport('file:///cache/x.zip', files)).rejects.toMatchObject({
      code: 'damaged',
    });
    await expect(prepareImport('file:///cache/missing.json', files)).rejects.toMatchObject({
      code: 'readFailed',
    });
  });
});
