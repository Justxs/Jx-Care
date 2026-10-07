import {
  conditionLog,
  hairLog,
  hairTask,
  product,
  progressEntry,
  progressPhoto,
} from '@/db/schema';
import { routine, routineLog, routineStep } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { momentOf } from '@/lib/appDay';

import { createFakeFiles } from './fakeFiles';
import {
  deletePhoto,
  deleteWeek,
  getWeekEntry,
  lastPhoto,
  listTimeline,
  photoForDay,
  saveCheckIn,
  saveCheckInWithFiles,
  skipWeek,
  thisWeekStatus,
  weekContext,
} from './repo';
import type { CheckInInput } from './types';

const TODAY = '2026-10-07'; // Wednesday
const THIS_WEEK = '2026-10-05';
const LAST_WEEK = '2026-09-28';
const OLD_WEEK = '2026-09-14';

type Fake = ReturnType<typeof createFakeFiles>;

/** Saves photos for a week through the fake file store and the repository. */
function takeWeek(
  db: ReturnType<typeof createTestDb>,
  files: Fake,
  weekStart: string,
  takenAt: number,
  over: Partial<CheckInInput> = {},
  angles: ('front' | 'left' | 'right')[] = ['front'],
) {
  const photos = angles.map((angle) => ({
    angle,
    fileUri: files.add({ area: 'skin', weekStart, angle }, takenAt),
  }));
  return saveCheckIn(
    db,
    { area: 'skin', weekStart, photos, rating: 4, tags: ['calm'], note: null, takenAt, ...over },
    files,
  );
}

describe('saveCheckIn', () => {
  it('saves a week with its photos in angle order', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const at = momentOf('2026-10-06', '10:00');
    takeWeek(db, files, THIS_WEEK, at, { note: '  Less red  ' }, ['right', 'front', 'left']);

    const week = getWeekEntry(db, 'skin', THIS_WEEK);
    expect(week).toMatchObject({ rating: 4, tags: ['calm'], note: 'Less red', skipped: false });
    expect(week?.takenAt).toBe(at);
    expect(week?.photos.map((p) => p.angle)).toEqual(['front', 'left', 'right']);
    expect(week?.byAngle.left?.fileUri).toContain(`/skin/${THIS_WEEK}/left-${at}.jpg`);
    expect(getWeekEntry(db, 'skin', LAST_WEEK)).toBeNull();
  });

  it('replaces the photos when a week is saved twice and deletes the old files', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const first = takeWeek(db, files, THIS_WEEK, momentOf('2026-10-05', '09:00'), {}, [
      'front',
      'left',
    ]);
    const oldUris = getWeekEntry(db, 'skin', THIS_WEEK)!.photos.map((p) => p.fileUri);

    const later = momentOf('2026-10-06', '20:00');
    const second = takeWeek(db, files, THIS_WEEK, later, { rating: 2, tags: ['dry', 'dry'] });

    expect(second.entryId).toBe(first.entryId);
    expect(second.replaced.sort()).toEqual([...oldUris].sort());
    expect(files.deleted.sort()).toEqual([...oldUris].sort());
    for (const uri of oldUris) expect(files.files.has(uri)).toBe(false);

    const week = getWeekEntry(db, 'skin', THIS_WEEK)!;
    expect(week.photos).toHaveLength(1);
    expect(week.photos[0]!.fileUri).toContain(`front-${later}.jpg`);
    expect(week).toMatchObject({ rating: 2, tags: ['dry'], takenAt: later });
    expect(db.select().from(progressEntry).all()).toHaveLength(1);
    expect(db.select().from(progressPhoto).all()).toHaveLength(1);
  });

  it('keeps a file that the new save still uses', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    takeWeek(db, files, THIS_WEEK, 1000);
    const uri = getWeekEntry(db, 'skin', THIS_WEEK)!.photos[0]!.fileUri;
    const result = saveCheckIn(
      db,
      {
        area: 'skin',
        weekStart: THIS_WEEK,
        photos: [{ angle: 'front', fileUri: uri }],
        rating: 5,
        tags: [],
        note: null,
      },
      files,
    );
    expect(result.replaced).toEqual([]);
    expect(files.deleted).toEqual([]);
  });

  it('turns a skipped week into a taken one', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    skipWeek(db, 'skin', THIS_WEEK);
    takeWeek(db, files, THIS_WEEK, momentOf(TODAY, '10:00'));
    expect(getWeekEntry(db, 'skin', THIS_WEEK)?.skipped).toBe(false);
    expect(thisWeekStatus(db, 'skin', TODAY)).toBe('taken');
  });
});

describe('saveCheckInWithFiles', () => {
  it('copies camera photos into storage and keeps photos already saved', async () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const kept = files.add({ area: 'skin', weekStart: THIS_WEEK, angle: 'left' }, 1);
    const now = momentOf(TODAY, '10:00');
    await saveCheckInWithFiles(
      db,
      {
        area: 'skin',
        weekStart: THIS_WEEK,
        photos: [
          { angle: 'front', uri: 'file:///cache/Camera/abc.jpg' },
          { angle: 'left', uri: kept },
        ],
        rating: null,
        tags: [],
        note: null,
      },
      files,
      now,
    );
    const week = getWeekEntry(db, 'skin', THIS_WEEK)!;
    expect(week.byAngle.front?.fileUri).toBe(
      `file:///documents/progress/skin/${THIS_WEEK}/front-${now}.jpg`,
    );
    expect(week.byAngle.left?.fileUri).toBe(kept);
    expect(week.takenAt).toBe(now);
  });

  it('removes the files it saved when a photo fails to save', async () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const save = files.savePhoto.bind(files);
    let calls = 0;
    files.savePhoto = async (uri, target, at) => {
      calls += 1;
      if (calls === 2) throw new Error('disk full');
      return save(uri, target, at);
    };
    await expect(
      saveCheckInWithFiles(
        db,
        {
          area: 'skin',
          weekStart: THIS_WEEK,
          photos: [
            { angle: 'front', uri: 'file:///cache/a.jpg' },
            { angle: 'left', uri: 'file:///cache/b.jpg' },
          ],
          rating: null,
          tags: [],
          note: null,
        },
        files,
        5,
      ),
    ).rejects.toThrow('disk full');
    expect(files.files.size).toBe(0);
    expect(getWeekEntry(db, 'skin', THIS_WEEK)).toBeNull();
  });
});

describe('skipWeek and thisWeekStatus', () => {
  it('is due until taken or skipped', () => {
    const db = createTestDb();
    expect(thisWeekStatus(db, 'skin', TODAY)).toBe('due');
    skipWeek(db, 'skin', THIS_WEEK);
    expect(thisWeekStatus(db, 'skin', TODAY)).toBe('skipped');
    expect(thisWeekStatus(db, 'hair', TODAY)).toBe('due');
    // Next week is due again.
    expect(thisWeekStatus(db, 'skin', '2026-10-12')).toBe('due');
  });

  it('shows a skipped week as skipped in the timeline', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    takeWeek(db, files, LAST_WEEK, momentOf('2026-10-04', '10:00'));
    skipWeek(db, 'skin', THIS_WEEK);
    const tiles = listTimeline(db, 'skin', THIS_WEEK);
    expect(tiles.map((t) => [t.weekStart, t.status])).toEqual([
      [THIS_WEEK, 'skipped'],
      [LAST_WEEK, 'taken'],
    ]);
    expect(tiles[0]).toMatchObject({ photo: null, takenDay: null, current: true });
  });

  it('leaves a week that already has photos alone', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const { entryId } = takeWeek(db, files, THIS_WEEK, 1000);
    expect(skipWeek(db, 'skin', THIS_WEEK)).toBe(entryId);
    expect(getWeekEntry(db, 'skin', THIS_WEEK)?.skipped).toBe(false);
    expect(thisWeekStatus(db, 'skin', TODAY)).toBe('taken');
  });
});

describe('listTimeline', () => {
  it('is empty before the first photo', () => {
    expect(listTimeline(createTestDb(), 'skin', THIS_WEEK)).toEqual([]);
  });

  it('fills empty weeks from the first entry to this week, newest first', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const at = momentOf('2026-09-20', '10:00'); // Sunday of the old week
    takeWeek(db, files, OLD_WEEK, at, {}, ['left', 'front']);
    takeWeek(db, files, LAST_WEEK, momentOf('2026-10-04', '11:00'));

    const tiles = listTimeline(db, 'skin', THIS_WEEK);
    expect(tiles.map((t) => [t.weekStart, t.status])).toEqual([
      [THIS_WEEK, 'empty'],
      [LAST_WEEK, 'taken'],
      ['2026-09-21', 'empty'],
      [OLD_WEEK, 'taken'],
    ]);
    const old = tiles[3]!;
    expect(old.photo?.angle).toBe('front');
    expect(old).toMatchObject({ photoCount: 2, takenAt: at, takenDay: '2026-09-20' });
    expect(tiles[2]).toMatchObject({ entryId: null, photo: null, current: false });
    expect(tiles[0]!.current).toBe(true);
    expect(listTimeline(db, 'hair', THIS_WEEK)).toEqual([]);
  });

  it('labels a photo taken after midnight with the app day before', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    takeWeek(db, files, LAST_WEEK, momentOf('2026-10-01', '01:30'));
    expect(listTimeline(db, 'skin', THIS_WEEK)[1]?.takenDay).toBe('2026-10-01');
  });
});

describe('lastPhoto and photoForDay', () => {
  it('finds the latest photo of an angle before this week', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    takeWeek(db, files, OLD_WEEK, 1, {}, ['front', 'left']);
    takeWeek(db, files, LAST_WEEK, 2, {}, ['front']);
    takeWeek(db, files, THIS_WEEK, 3, {}, ['front']);

    expect(lastPhoto(db, 'skin', 'front', THIS_WEEK)).toMatchObject({
      weekStart: LAST_WEEK,
      angle: 'front',
      takenAt: 2,
    });
    expect(lastPhoto(db, 'skin', 'left', THIS_WEEK)?.weekStart).toBe(OLD_WEEK);
    expect(lastPhoto(db, 'skin', 'right', THIS_WEEK)).toBeNull();
    expect(lastPhoto(db, 'hair', 'front', THIS_WEEK)).toBeNull();
  });

  it('returns the photos taken on an app day', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    takeWeek(db, files, THIS_WEEK, momentOf('2026-10-06', '23:30'));
    expect(photoForDay(db, '2026-10-06')).toEqual([
      expect.objectContaining({ area: 'skin', weekStart: THIS_WEEK }),
    ]);
    expect(photoForDay(db, '2026-10-07')).toEqual([]);
  });
});

describe('deleting', () => {
  it('deleting a week removes its rows, files and folder', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const { entryId } = takeWeek(db, files, LAST_WEEK, 1, {}, ['front', 'left']);
    takeWeek(db, files, THIS_WEEK, 2);

    expect(deleteWeek(db, entryId, files)).toBe(true);
    expect(getWeekEntry(db, 'skin', LAST_WEEK)).toBeNull();
    expect(files.deletedFolders).toEqual([`skin/${LAST_WEEK}`]);
    expect([...files.files.keys()].some((u) => u.includes(LAST_WEEK))).toBe(false);
    expect(db.select().from(progressPhoto).all()).toHaveLength(1);
    expect(deleteWeek(db, entryId, files)).toBe(false);
  });

  it('deleting one photo keeps the week; deleting the last one removes it', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    takeWeek(db, files, THIS_WEEK, 1, {}, ['front', 'left']);
    const [front, left] = getWeekEntry(db, 'skin', THIS_WEEK)!.photos;

    expect(deletePhoto(db, left!.id, files)).toEqual({ entryDeleted: false });
    expect(files.deleted).toEqual([left!.fileUri]);
    expect(getWeekEntry(db, 'skin', THIS_WEEK)?.photos).toHaveLength(1);

    expect(deletePhoto(db, front!.id, files)).toEqual({ entryDeleted: true });
    expect(getWeekEntry(db, 'skin', THIS_WEEK)).toBeNull();
    expect(files.deletedFolders).toEqual([`skin/${THIS_WEEK}`]);
    expect(deletePhoto(db, front!.id, files)).toBeNull();
  });

  it('a file that fails to delete does not undo the delete', () => {
    const db = createTestDb();
    const files = createFakeFiles();
    const { entryId } = takeWeek(db, files, THIS_WEEK, 1);
    files.deletePhotoFile = () => {
      throw new Error('locked');
    };
    expect(deleteWeek(db, entryId, files)).toBe(true);
    expect(getWeekEntry(db, 'skin', THIS_WEEK)).toBeNull();
  });
});

const log = (routineId: number, stepId: number, day: string, done: boolean) => ({
  routineId,
  day,
  dueStepIds: [stepId],
  doneStepIds: done ? [stepId] : [],
});

describe('weekContext', () => {
  const created = new Date(2026, 0, 1, 12).getTime();

  function seedRoutines(db: ReturnType<typeof createTestDb>) {
    const [morning, evening] = db
      .insert(routine)
      .values([
        { name: 'Morning', timeOfDay: 'morning', sortTime: '07:00', createdAt: created },
        { name: 'Evening', timeOfDay: 'evening', sortTime: '21:00', createdAt: created },
      ])
      .returning()
      .all();
    const [mStep, eStep] = db
      .insert(routineStep)
      .values([
        { routineId: morning!.id, position: 0 },
        { routineId: evening!.id, position: 0 },
      ])
      .returning()
      .all();
    const week = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'];
    db.insert(routineLog)
      .values([
        ...week.map((d) => log(morning!.id, mStep!.id, d, true)),
        ...week.slice(0, 3).map((d) => log(evening!.id, eStep!.id, d, true)),
        log(evening!.id, eStep!.id, '2026-10-03', false),
        log(morning!.id, mStep!.id, '2026-10-06', true),
      ])
      .run();
  }

  it('counts routines done out of due for each time of day', () => {
    const db = createTestDb();
    seedRoutines(db);
    const ctx = weekContext(db, 'skin', LAST_WEEK, TODAY);
    expect(ctx.days).toBe(7);
    expect(ctx.routines).toEqual([
      { key: 'morning', timeOfDay: 'morning', customName: null, done: 5, due: 7 },
      { key: 'evening', timeOfDay: 'evening', customName: null, done: 3, due: 7 },
    ]);
    expect(ctx.hairTasks).toEqual([]);
  });

  it('counts a running week only up to today', () => {
    const db = createTestDb();
    seedRoutines(db);
    const ctx = weekContext(db, 'skin', THIS_WEEK, TODAY);
    expect(ctx.days).toBe(3);
    expect(ctx.routines.map((r) => [r.key, r.done, r.due])).toEqual([
      ['morning', 1, 3],
      ['evening', 0, 3],
    ]);
    expect(weekContext(db, 'skin', '2026-10-12', TODAY).routines).toEqual([]);
  });

  it('lists products started and stopped that week for the album area', () => {
    const db = createTestDb();
    db.insert(product)
      .values([
        { name: 'New serum', area: 'skin', openedAt: '2026-09-30' },
        { name: 'Old cream', area: 'both', openedAt: '2026-08-01', archivedAt: '2026-10-04' },
        { name: 'Earlier', area: 'skin', openedAt: '2026-09-27' },
        { name: 'Hair oil', area: 'hair', openedAt: '2026-09-29', archivedAt: '2026-10-01' },
      ])
      .run();

    const skin = weekContext(db, 'skin', LAST_WEEK, TODAY);
    expect(skin.started.map((p) => [p.name, p.day])).toEqual([['New serum', '2026-09-30']]);
    expect(skin.stopped.map((p) => [p.name, p.day])).toEqual([['Old cream', '2026-10-04']]);

    const hair = weekContext(db, 'hair', LAST_WEEK, TODAY);
    expect(hair.started.map((p) => p.name)).toEqual(['Hair oil']);
    expect(hair.stopped.map((p) => p.name)).toEqual(['Hair oil', 'Old cream']);
  });

  it('summarises the condition log with the most frequent tags first', () => {
    const db = createTestDb();
    db.insert(conditionLog)
      .values([
        { day: '2026-09-28', area: 'skin', states: ['breakout', 'oily'] },
        { day: '2026-09-29', area: 'skin', states: ['oily'] },
        { day: '2026-09-30', area: 'skin', states: ['calm'] },
        { day: '2026-10-05', area: 'skin', states: ['dry'] },
        { day: '2026-09-29', area: 'hair', states: ['frizzy'] },
      ])
      .run();
    expect(weekContext(db, 'skin', LAST_WEEK, TODAY).condition).toEqual({
      daysLogged: 3,
      tags: [
        { tag: 'oily', count: 2 },
        { tag: 'calm', count: 1 },
        { tag: 'breakout', count: 1 },
      ],
    });
  });

  it('counts hair tasks done for the hair album', () => {
    const db = createTestDb();
    const [wash] = db
      .insert(hairTask)
      .values({ name: 'Wash', kind: 'wash', everyNDays: 3 })
      .returning()
      .all();
    db.insert(hairLog)
      .values([
        { hairTaskId: wash!.id, day: '2026-09-28' },
        { hairTaskId: wash!.id, day: '2026-10-01' },
        { hairTaskId: wash!.id, day: '2026-10-06' },
      ])
      .run();
    const ctx = weekContext(db, 'hair', LAST_WEEK, TODAY);
    expect(ctx.hairTasks).toEqual([{ taskId: wash!.id, name: 'Wash', done: 2 }]);
    expect(ctx.routines).toEqual([]);
  });
});
