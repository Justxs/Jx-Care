/**
 * App days. A calendar day in Jx-Care is a 'YYYY-MM-DD' string and ends at 04:00, not midnight
 * (spec refinement 1), so an evening routine finished at 00:30 counts for the evening before.
 * Day maths works on the strings through UTC dates, so time zones and DST never shift a day.
 */

export const DAY_ENDS_AT_HOUR = 4;

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

function toUtc(day: string): Date {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** The local calendar date of a moment, ignoring the 04:00 rule. */
export function localDate(now: Date | number): string {
  const d = new Date(now);
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The app day of a moment in the phone's time zone: 00:00–03:59 belongs to the previous day. */
export function appDay(now: Date | number): string {
  const d = new Date(now);
  const day = localDate(d);
  return d.getHours() < DAY_ENDS_AT_HOUR ? addDays(day, -1) : day;
}

/** Epoch ms of the next 04:00 local time after `now`. */
export function nextDayBoundary(now: Date | number): number {
  const d = new Date(now);
  const sameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_ENDS_AT_HOUR, 0, 0, 0);
  if (sameDay.getTime() > d.getTime()) return sameDay.getTime();
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + 1,
    DAY_ENDS_AT_HOUR,
    0,
    0,
    0,
  ).getTime();
}

/** Epoch ms of a time ('HH:MM') on an app day, in local time. Times before 04:00 fall on the next calendar date. */
export function momentOf(day: string, hhmm: string): number {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const [h = 0, min = 0] = hhmm.split(':').map(Number);
  const extra = h < DAY_ENDS_AT_HOUR ? 1 : 0;
  return new Date(y, m - 1, d + extra, h, min, 0, 0).getTime();
}

export function addDays(day: string, n: number): string {
  const d = toUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** Whole days from b to a (a - b). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(a).getTime() - toUtc(b).getTime()) / 86_400_000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekdayOf(day: string): number {
  const js = toUtc(day).getUTCDay();
  return js === 0 ? 7 : js;
}

/** The Monday of the week that contains `day`. */
export function weekStart(day: string): string {
  return addDays(day, 1 - weekdayOf(day));
}

/** Adds calendar months, clamping to the month end (2026-01-31 + 1 month = 2026-02-28). */
export function addMonths(day: string, n: number): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return fromUtc(target);
}

export function minDay(a: string, b: string): string {
  return a < b ? a : b;
}

/** 'YYYY-MM-DD' of a year and 1-based month's first day. */
export function firstOfMonth(year: number, month: number): string {
  return `${pad(year, 4)}-${pad(month)}-01`;
}

/** Inclusive list of days from `from` to `to`. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * The 42 days (6 rows, Monday first) shown for a month in the calendar, so the grid never
 * changes height. `month` is 1-based.
 */
export function daysInMonthGrid(year: number, month: number): string[] {
  const first = firstOfMonth(year, month);
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return fromUtc(toUtc(day)) === day;
}
