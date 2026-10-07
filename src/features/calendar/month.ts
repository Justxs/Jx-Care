import { addMonths, daysInMonthGrid } from '@/lib/appDay';

/** Calendar months are 'YYYY-MM' strings, like the hair month hooks (task 031). */

/** The month ('YYYY-MM') a day falls in. */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** Year and 1-based month number of a 'YYYY-MM' month. */
export function monthParts(month: string): { year: number; month: number } {
  const [year = 1970, m = 1] = month.split('-').map(Number);
  return { year, month: m };
}

/** The month `n` months after `month` (negative goes back). */
export function shiftMonth(month: string, n: number): string {
  return monthOf(addMonths(`${month}-01`, n));
}

/** The 42 grid days of a month: 6 rows, Monday first. */
export function gridDays(month: string): string[] {
  const p = monthParts(month);
  return daysInMonthGrid(p.year, p.month);
}
