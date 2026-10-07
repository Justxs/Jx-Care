/**
 * Progress photo data for stories (C3–C7, Day detail, the Calendar photos row). The app keeps
 * photos as files in private storage, which a story database doesn't have, so the photo rows
 * point at images bundled with the app instead. Everything else goes through the repo functions.
 */
import { Image } from 'react-native';

import type { Db } from '@/db';
import type { PhotoAngle, ProgressArea } from '@/db/enums';
import { createFakeFiles } from '@/features/progress/fakeFiles';
import { saveCheckIn, skipWeek } from '@/features/progress/repo';
import { saveSettings } from '@/features/settings/repo';
import { addDays, momentOf, weekStart } from '@/lib/appDay';

import { FIXTURE_TODAY, seedDemo } from '../fixtures';

// Bundled images (metro serves them on the device). Jest has no asset server, so there they
// resolve to a placeholder uri that simply draws nothing.
const bundled: Record<'front' | 'left' | 'right', number> = {
  front: require('../../../assets/images/icon.png') as number,
  left: require('../../../assets/images/splash-icon.png') as number,
  right: require('../../../assets/images/adaptive-icon.png') as number,
};

function assetUri(module: number, name: string): string {
  return Image.resolveAssetSource(module)?.uri ?? `file:///storybook/${name}.png`;
}

/** A photo uri for an angle: front, left and right look different; back and top reuse them. */
export function storyPhotoUri(angle: PhotoAngle = 'front'): string {
  const key = angle === 'left' || angle === 'top' ? 'left' : angle === 'front' ? 'front' : 'right';
  return assetUri(bundled[key], key);
}

const thisWeek = weekStart(FIXTURE_TODAY);

/** The weeks and days `seedProgress` fills when it runs on `FIXTURE_TODAY` (Monday 5 Oct week). */
export const progressWeeks = {
  /** This week: nothing yet, so "Take this week's photo" shows. */
  thisWeek,
  /** Last week: skin front, left and right (Sunday 4 Oct), rated 4, tags and a note. */
  lastWeek: addDays(thisWeek, -7),
  /** The day last week's skin photos were taken. */
  lastWeekSkinDay: addDays(thisWeek, -1),
  /** The day last week's hair photos were taken (Saturday 3 Oct). */
  lastWeekHairDay: addDays(thisWeek, -2),
  /** Two weeks ago: no entry, a "No photo" tile. */
  emptyWeek: addDays(thisWeek, -14),
  /** Three weeks ago: skipped. */
  skippedWeek: addDays(thisWeek, -21),
  /** Four weeks ago: skin front only, not rated. */
  frontOnlyWeek: addDays(thisWeek, -28),
  /** Five weeks ago: skin front, left and right, rated 3 (the "4 weeks ago vs now" Before). */
  firstWeek: addDays(thisWeek, -35),
} as const;

type Shot = {
  area: ProgressArea;
  week: string;
  /** Days after the week's Monday the photos were taken. */
  takenOn: number;
  angles: PhotoAngle[];
  rating: number | null;
  tags: string[];
  note: string | null;
};

function addCheckIn(db: Db, shot: Shot): void {
  const day = addDays(shot.week, shot.takenOn);
  saveCheckIn(
    db,
    {
      area: shot.area,
      weekStart: shot.week,
      photos: shot.angles.map((angle) => ({ angle, fileUri: storyPhotoUri(angle) })),
      rating: shot.rating,
      tags: shot.tags,
      note: shot.note,
      takenAt: momentOf(day, '10:00'),
    },
    createFakeFiles(),
  );
}

/**
 * `seedDemo` plus weekly photos: Weekly photo on (Sundays), skin angles front, left and right,
 * the hair album on, five weeks of skin check-ins (taken, empty, skipped, front only, taken) and
 * last week's hair photos. See `progressWeeks`.
 */
export function seedProgress(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  saveSettings(db, {
    weeklyPhotoOn: true,
    weeklyPhotoWeekday: 7,
    skinAngles: ['front', 'left', 'right'],
    hairAlbumOn: true,
    hairAngles: ['front', 'back', 'top'],
  });
  const week = (n: number) => addDays(weekStart(today), -7 * n);

  addCheckIn(db, {
    area: 'skin',
    week: week(5),
    takenOn: 6,
    angles: ['front', 'left', 'right'],
    rating: 3,
    tags: ['dry', 'redness'],
    note: 'Flaky around the nose after the new toner.',
  });
  addCheckIn(db, {
    area: 'skin',
    week: week(4),
    takenOn: 5,
    angles: ['front'],
    rating: null,
    tags: [],
    note: null,
  });
  skipWeek(db, 'skin', week(3));
  addCheckIn(db, {
    area: 'skin',
    week: week(1),
    takenOn: 6,
    angles: ['front', 'left', 'right'],
    rating: 4,
    tags: ['calm', 'glow'],
    note: 'Less redness on the cheeks.',
  });
  addCheckIn(db, {
    area: 'hair',
    week: week(1),
    takenOn: 5,
    angles: ['front', 'back', 'top'],
    rating: 4,
    tags: ['shiny'],
    note: null,
  });
}

/** `seedDemo` with Weekly photo on but no photos yet (Progress photos' empty state). */
export function seedWeeklyPhotoOn(db: Db, today: string = FIXTURE_TODAY): void {
  seedDemo(db, today);
  saveSettings(db, { weeklyPhotoOn: true, weeklyPhotoWeekday: 7 });
}
