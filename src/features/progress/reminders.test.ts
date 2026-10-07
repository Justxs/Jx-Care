import type { Db } from '@/db';
import { setDb } from '@/db';
import { createTestDb } from '@/db/test-db';
import { getSettings, saveSettings, type SettingsPatch } from '@/features/settings/repo';
import { i18n, setI18nLanguage } from '@/i18n';
import { createFakeOS, type FakeOS } from '@/notifications/fakeOS';
import { setNotificationOS, sync } from '@/notifications/scheduler';

import { createFakeFiles } from './fakeFiles';
import { planWeeklyPhoto, skipWeekAction } from './reminders';
import { saveCheckIn, skipWeek, thisWeekStatus } from './repo';

// Wednesday 7 Oct 2026, 12:00. The week starts Monday 5 Oct; Sunday is 11 Oct.
const NOW = new Date(2026, 9, 7, 12, 0).getTime();
const WEEK = '2026-10-05';
const NEXT_WEEK = '2026-10-12';

let db: Db;

function setup(patch: SettingsPatch = {}) {
  db = createTestDb();
  setDb(db);
  saveSettings(db, { language: 'en', weeklyPhotoOn: true, ...patch });
}

function plan(now = NOW) {
  const settings = getSettings(db);
  return planWeeklyPhoto({ db, now, settings, t: i18n.getFixedT(settings.language) });
}

function takePhoto(area: 'skin' | 'hair', weekStart: string) {
  saveCheckIn(
    db,
    {
      area,
      weekStart,
      photos: [
        { angle: 'front', fileUri: `file:///documents/progress/${area}/${weekStart}/f.jpg` },
      ],
      rating: 4,
      tags: [],
      note: null,
    },
    createFakeFiles(),
  );
}

beforeEach(async () => {
  await setI18nLanguage('en');
});

describe('planWeeklyPhoto', () => {
  it('plans the chosen weekday and time of each week', () => {
    setup();
    const items = plan();
    expect(items.map((p) => new Date(p.fireAt))).toEqual([
      new Date(2026, 9, 11, 10, 0),
      new Date(2026, 9, 18, 10, 0),
      new Date(2026, 9, 25, 10, 0),
    ]);
    expect(items[0]).toMatchObject({
      key: `weekly_photo:-:weekly_photo:${WEEK}`,
      entityType: 'weekly_photo',
      entityId: null,
      kind: 'weekly_photo',
      title: 'Weekly photo',
      body: "Time for this week's skin photo",
      categoryId: 'weekly_photo',
      channelId: 'photos',
      data: { url: '/progress/camera?area=skin' },
    });
  });

  it('follows the weekday and time settings', () => {
    setup({ weeklyPhotoWeekday: 5, weeklyPhotoTime: '19:30' });
    expect(new Date(plan()[0]!.fireAt)).toEqual(new Date(2026, 9, 9, 19, 30));
  });

  it("skips this week's day once it has passed: a missed week gets no extra reminder", () => {
    // Monday photo day; Wednesday now.
    setup({ weeklyPhotoWeekday: 1 });
    expect(new Date(plan()[0]!.fireAt)).toEqual(new Date(2026, 9, 12, 10, 0));
    // Wednesday photo day, later the same day.
    setup({ weeklyPhotoWeekday: 3, weeklyPhotoTime: '10:00' });
    expect(new Date(plan()[0]!.fireAt)).toEqual(new Date(2026, 9, 14, 10, 0));
  });

  it('plans nothing for a week already taken or skipped', () => {
    setup();
    takePhoto('skin', WEEK);
    expect(new Date(plan()[0]!.fireAt)).toEqual(new Date(2026, 9, 18, 10, 0));

    setup();
    skipWeek(db, 'skin', WEEK);
    skipWeek(db, 'skin', NEXT_WEEK);
    expect(new Date(plan()[0]!.fireAt)).toEqual(new Date(2026, 9, 25, 10, 0));
  });

  it('plans nothing when Weekly photo is off', () => {
    setup({ weeklyPhotoOn: false });
    expect(plan()).toEqual([]);
  });

  it('names hair photos too while the hair album is on', async () => {
    setup({ hairAlbumOn: true });
    expect(plan()[0]!.body).toBe("Time for this week's skin and hair photos");

    // Skin done: hair only, and the tap opens the hair camera.
    takePhoto('skin', WEEK);
    expect(plan()[0]).toMatchObject({
      body: "Time for this week's hair photo",
      data: { url: '/progress/camera?area=hair' },
    });

    // Both done: nothing this week.
    takePhoto('hair', WEEK);
    expect(new Date(plan()[0]!.fireAt)).toEqual(new Date(2026, 9, 18, 10, 0));
  });

  it('is written in the app language', async () => {
    setup({ language: 'lt' });
    expect(plan()[0]).toMatchObject({
      title: 'Savaitės nuotrauka',
      body: 'Laikas šios savaitės odos nuotraukai',
    });
  });
});

describe('weekly photo with the notification layer', () => {
  let os: FakeOS;

  beforeEach(() => {
    os = createFakeOS();
    setNotificationOS(os);
  });

  afterEach(() => setNotificationOS(null));

  it('schedules the reminders through sync and drops this week once it is taken', async () => {
    setup();
    await sync(NOW);
    const fireTimes = () => [...os.pending.values()].map((r) => new Date(r.fireAt));
    // The 14-day window holds this Sunday and next.
    expect(fireTimes()).toEqual([new Date(2026, 9, 11, 10, 0), new Date(2026, 9, 18, 10, 0)]);

    takePhoto('skin', WEEK);
    await sync(NOW);
    expect(fireTimes()).toEqual([new Date(2026, 9, 18, 10, 0)]);

    saveSettings(db, { weeklyPhotoOn: false });
    await sync(NOW);
    expect(os.pending.size).toBe(0);
  });

  it('"Skip this week" skips every album still due', async () => {
    setup({ hairAlbumOn: true });
    const settings = getSettings(db);
    // Sunday 10:00, when the reminder fires.
    const now = new Date(2026, 9, 11, 10, 0).getTime();
    await skipWeekAction({
      actionId: 'skip_week',
      now,
      db,
      settings,
      title: 'Weekly photo',
      body: "Time for this week's skin and hair photos",
      categoryId: 'weekly_photo',
      channelId: 'photos',
      data: {
        url: '/progress/camera?area=skin',
        key: `weekly_photo:-:weekly_photo:${WEEK}`,
        entityType: 'weekly_photo',
        entityId: null,
        kind: 'weekly_photo',
        channelId: 'photos',
      },
    });
    expect(thisWeekStatus(db, 'skin', '2026-10-11')).toBe('skipped');
    expect(thisWeekStatus(db, 'hair', '2026-10-11')).toBe('skipped');
    expect(thisWeekStatus(db, 'skin', NEXT_WEEK)).toBe('due');
  });
});
