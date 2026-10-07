import { weekdayOf } from '@/lib/appDay';

import { i18n, type Language } from './index';

/**
 * Display formatting for dates, numbers, money and day counts. Every function takes the language
 * (and locale where numbers are involved) explicitly. Dates are 'YYYY-MM-DD' app days.
 */

const enMonths = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type DayParts = { year: number; month: number; day: number };

function parseDay(day: string): DayParts {
  const [y, m, d] = day.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1, day: d ?? 1 };
}

function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function t(lang: Language, key: string, options?: Record<string, unknown>): string {
  return i18n.getFixedT(lang)(key, options) as string;
}

/** "15 Oct", "1 Mar 2027" (EN); "2026-10-15" (LT). */
export function formatDate(day: string, lang: Language, today: string): string {
  if (lang === 'lt') return day;
  const p = parseDay(day);
  const base = `${p.day} ${enMonths[p.month - 1]}`;
  return p.year === parseDay(today).year ? base : `${base} ${p.year}`;
}

/** Like formatDate, but today reads "Today, 6 Oct" / "Šiandien, 2026-10-06". */
export function formatDateField(day: string, lang: Language, today: string): string {
  const date = formatDate(day, lang, today);
  return day === today ? t(lang, 'format.todayDate', { date }) : date;
}

/** "Tuesday, 6 Oct" (EN); "Antradienis, 2026-10-06" (LT). */
export function formatWeekdayDate(day: string, lang: Language, today: string = day): string {
  const weekday = t(lang, `weekdays.long.${weekdayOf(day)}`);
  return `${capitalise(weekday)}, ${formatDate(day, lang, today)}`;
}

/** Weekday name for an ISO weekday, as it would start a line. */
export function formatWeekday(isoWeekday: number, lang: Language): string {
  return capitalise(t(lang, `weekdays.long.${isoWeekday}`));
}

/** Short weekday list: "Mon, Thu" / "Pr, Kt". */
export function formatWeekdayList(isoWeekdays: readonly number[], lang: Language): string {
  return [...isoWeekdays]
    .sort((a, b) => a - b)
    .map((d) => t(lang, `weekdays.short.${d}`))
    .join(', ');
}

/**
 * "07:30" in 24-hour form; with `uses24h` false (EN only, following the phone) "7:30 AM".
 * `hhmm` is stored as "HH:MM".
 */
export function formatTime(hhmm: string, lang: Language, uses24h = true): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const mm = String(m).padStart(2, '0');
  if (lang === 'lt' || uses24h) return `${String(h).padStart(2, '0')}:${mm}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${suffix}`;
}

/** Money from integer cents: "12,50 €" (lt-LT), "€12.50" (en-GB). */
export function formatMoney(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** A plain number in the phone's locale ("0,21"). */
export function formatNumber(value: number, locale: string, fractionDigits = 0): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
}

/** "1 day", "12 days"; "1 diena", "2 dienos", "10 dienų", "21 diena". */
export function formatDays(n: number, lang: Language): string {
  return t(lang, 'format.days', { count: n });
}

/** "Expires in 12 days", "Expires today", "Expired 3 days ago". */
export function formatRelativeExpiry(daysLeft: number, lang: Language): string {
  if (daysLeft === 0) return t(lang, 'format.expiresToday');
  if (daysLeft > 0) return t(lang, 'format.expiresIn', { count: daysLeft });
  return t(lang, 'format.expiredAgo', { count: -daysLeft });
}

/** Wait chip text: "30 s", "1 min", "15 min". */
export function formatDuration(seconds: number, lang: Language): string {
  if (seconds < 60) return t(lang, 'format.seconds', { count: seconds });
  return t(lang, 'format.minutes', { count: Math.round(seconds / 60) });
}

/** Countdown "0:42", "1:00". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
