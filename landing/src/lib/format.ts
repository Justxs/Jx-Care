import type { Locale } from '@/lib/i18n';

/** EN dates read the British way ("Tuesday 6 October"), as in the app. */
export function intlLocale(locale: Locale) {
  return locale === 'en' ? 'en-GB' : 'lt';
}

/** The day the sample data is set on: Tuesday 6 October 2026. */
export const SAMPLE_TODAY = new Date(2026, 9, 6);

export function longDate(locale: Locale, date: Date = SAMPLE_TODAY) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** Monday-first single letters (or LT short forms) for the weekday dots. */
export function weekdayLetters(locale: Locale): string[] {
  const format = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'narrow' });
  // 5 October 2026 is a Monday.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 9, 5 + index)));
}

export function weekdayNames(locale: Locale): string[] {
  const format = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long' });
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 9, 5 + index)));
}
