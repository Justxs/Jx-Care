import type { Db } from '@/db';
import { setDb } from '@/db';
import * as schema from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { getSettings, saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { i18n, setI18nLanguage } from '@/i18n';
import { createFakeOS, type FakeOS } from '@/notifications/fakeOS';
import { setNotificationOS, sync } from '@/notifications/scheduler';

import { writeBackup } from './export';
import { createFakeBackupFiles } from './fakeFiles';
import { prepareImport, restoreBackup } from './import';
import { BACKUP_URL, isBackupDue, planBackupReminder } from './reminders';
import { markBackedUp } from './repo';

// Wednesday 7 Oct 2026, 12:00.
const NOW = new Date(2026, 9, 7, 12, 0).getTime();
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0).getTime();

let db: Db;

function setup(patch: SettingsPatch = {}) {
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en', ...patch });
}

function addProduct(createdAt: number) {
  db.insert(schema.product).values({ name: 'Serum', area: 'skin', createdAt }).run();
}

function plan(now = NOW) {
  const settings = getSettings(db);
  return planBackupReminder({ db, now, settings, t: i18n.getFixedT(settings.language) });
}

const fireDates = (now = NOW) => plan(now).map((p) => new Date(p.fireAt));

beforeEach(async () => {
  await setI18nLanguage('en');
});

describe('planBackupReminder', () => {
  it('plans nothing with no backup and no products', () => {
    setup();
    expect(plan()).toEqual([]);
  });

  it('reminds at 10:00 thirty days after the last backup, opening Backup and restore', () => {
    setup({ lastBackupAt: at(2026, 9, 20) });
    const [item, ...rest] = plan();
    expect(rest).toEqual([]);
    expect(new Date(item!.fireAt)).toEqual(new Date(2026, 9, 20, 10, 0));
    expect(item).toMatchObject({
      entityType: 'backup',
      kind: 'backup',
      title: 'Back up your Jx Care data',
      channelId: 'digest',
      data: { url: BACKUP_URL },
    });
  });

  it('with no backup yet, counts from the first product', () => {
    setup();
    addProduct(at(2026, 9, 25));
    addProduct(at(2026, 10, 1));
    expect(fireDates()).toEqual([new Date(2026, 9, 25, 10, 0)]);
  });

  it('when the day has passed, waits a month for the next one (at most once a month)', () => {
    setup({ lastBackupAt: at(2026, 8, 20) });
    // Due 19 Sep; that reminder has fired, the next is 30 days later (19 Oct).
    expect(fireDates()).toEqual([new Date(2026, 9, 19, 10, 0)]);
    // Later on the due day itself, the same: never a second one that day.
    expect(fireDates(at(2026, 9, 19, 11))).toEqual([new Date(2026, 9, 19, 10, 0)]);
    expect(fireDates(at(2026, 9, 19, 9))).toEqual([new Date(2026, 8, 19, 10, 0)]);
  });

  it('gives the same answer every time it is planned, so sync never adds one', () => {
    setup({ lastBackupAt: at(2026, 6, 1) });
    const a = plan();
    const b = plan(NOW + 3 * 60 * 60 * 1000);
    expect(b).toEqual(a);
  });

  it('is written in the app language', async () => {
    setup({ language: 'lt', lastBackupAt: at(2026, 9, 20) });
    await setI18nLanguage('lt');
    expect(plan()[0]!.title).toBe('Pasidarykite Jx Care duomenų atsarginę kopiją');
  });
});

describe('isBackupDue', () => {
  it('is due with no backup, or one older than 30 days', () => {
    const today = '2026-10-07';
    expect(isBackupDue(null, today)).toBe(true);
    expect(isBackupDue(at(2026, 9, 7), today)).toBe(false);
    expect(isBackupDue(at(2026, 9, 6), today)).toBe(true);
    // Before 04:00 still counts as the day before.
    expect(isBackupDue(at(2026, 9, 7, 3), today)).toBe(true);
  });
});

describe('with the scheduler', () => {
  let os: FakeOS;
  beforeEach(() => {
    os = createFakeOS();
    setNotificationOS(os);
  });
  afterEach(() => setNotificationOS(null));

  it('schedules the reminder and drops it once a backup is made', async () => {
    setup({ lastBackupAt: at(2026, 9, 12) });
    await sync(NOW);
    expect([...os.pending.values()].map((r) => new Date(r.fireAt))).toEqual([
      new Date(2026, 9, 12, 10, 0),
    ]);
    markBackedUp(db, NOW);
    await sync(NOW);
    expect(os.pending.size).toBe(0);
  });

  it('after a restore, sync with reconcile cancels what the old data had scheduled', async () => {
    setup({ lastBackupAt: at(2026, 9, 12) });
    await sync(NOW);
    expect(os.pending.size).toBe(1);

    // A backup made today, restored over the current data.
    const files = createFakeBackupFiles();
    const uri = await writeBackup('json', { db, files, now: NOW });
    await restoreBackup(await prepareImport(uri, files), { db, files });
    await sync(NOW, { reconcile: true });
    expect(os.pending.size).toBe(0);
  });
});
