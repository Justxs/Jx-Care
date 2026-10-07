import { photoAngles, type PhotoAngle, type ProgressArea } from '@/db/enums';

import { addDays, weekStart } from './appDay';

/**
 * Weekly progress photo rules (task 036): which day of each week it is due, when Today's photo
 * row shows, and the angles a session takes.
 */

/** The weekly photo day (ISO weekday 1–7) in the week that holds `day`. */
export function photoDayOfWeek(day: string, weekday: number): string {
  return addDays(weekStart(day), Math.min(7, Math.max(1, Math.round(weekday))) - 1);
}

/**
 * Today's photo row shows from the chosen weekday to the end of that week (Sunday), until the
 * week's photo is taken or skipped. A new week starts hidden again until its weekday.
 */
export function isPhotoRowDay(today: string, weekday: number): boolean {
  return today >= photoDayOfWeek(today, weekday);
}

/** The photo day of this week and of the `weeks - 1` weeks after it, oldest first. */
export function photoDays(today: string, weekday: number, weeks: number): string[] {
  const first = photoDayOfWeek(today, weekday);
  return Array.from({ length: Math.max(0, weeks) }, (_, i) => addDays(first, i * 7));
}

const skinOrder: readonly PhotoAngle[] = ['front', 'left', 'right'];
const hairOrder: readonly PhotoAngle[] = ['front', 'back', 'top'];

/**
 * The angles one camera session takes, in order: skin is always Front, then Left side and Right
 * side when tracked; hair is Front, Back, Top as switched on (Front when none is).
 */
export function sessionAngles(
  area: ProgressArea,
  tracked: { skinAngles: readonly PhotoAngle[]; hairAngles: readonly PhotoAngle[] },
): PhotoAngle[] {
  if (area === 'skin') {
    return skinOrder.filter((a) => a === 'front' || tracked.skinAngles.includes(a));
  }
  const hair = hairOrder.filter((a) => tracked.hairAngles.includes(a));
  return hair.length > 0 ? hair : ['front'];
}

/** True for a known angle name (route params). */
export function isPhotoAngle(value: unknown): value is PhotoAngle {
  return typeof value === 'string' && (photoAngles as readonly string[]).includes(value);
}
