import { useSelector } from '@tanstack/react-store';
import { getCalendars, getLocales } from 'expo-localization';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/features/settings/api';
import { appStore } from '@/state/app';

import {
  formatCountdown,
  formatDate,
  formatDateField,
  formatDays,
  formatDuration,
  formatMoney,
  formatNumber,
  formatRelativeExpiry,
  formatTime,
  formatWeekday,
  formatWeekdayDate,
  formatWeekdayList,
} from './format';
import { isLanguage, type Language } from './index';

function phoneLocale(): string {
  try {
    return getLocales()[0]?.languageTag ?? 'en-GB';
  } catch {
    return 'en-GB';
  }
}

function phoneUses24h(): boolean {
  try {
    return getCalendars()[0]?.uses24hourClock ?? true;
  } catch {
    return true;
  }
}

export type Formatter = ReturnType<typeof makeFormatter>;

export function makeFormatter(opts: {
  lang: Language;
  locale: string;
  currency: string;
  today: string;
  uses24h: boolean;
}) {
  const { lang, locale, currency, today, uses24h } = opts;
  return {
    lang,
    today,
    date: (day: string) => formatDate(day, lang, today),
    dateField: (day: string) => formatDateField(day, lang, today),
    weekdayDate: (day: string) => formatWeekdayDate(day, lang, today),
    weekday: (isoWeekday: number) => formatWeekday(isoWeekday, lang),
    weekdayList: (days: readonly number[]) => formatWeekdayList(days, lang),
    time: (hhmm: string) => formatTime(hhmm, lang, uses24h),
    money: (cents: number) => formatMoney(cents, currency, locale),
    number: (value: number, digits = 0) => formatNumber(value, locale, digits),
    days: (n: number) => formatDays(n, lang),
    relativeExpiry: (daysLeft: number) => formatRelativeExpiry(daysLeft, lang),
    duration: (seconds: number) => formatDuration(seconds, lang),
    countdown: formatCountdown,
  };
}

/**
 * Formatting bound to the current language, the phone's locale, the currency from settings and
 * the current app day.
 */
export function useFormat(): Formatter {
  const { i18n } = useTranslation();
  const today = useSelector(appStore, (s) => s.activeDay);
  const currency = useSettings().data?.currency ?? 'EUR';
  const lang: Language = isLanguage(i18n.language) ? i18n.language : 'en';
  return useMemo(
    () => makeFormatter({ lang, locale: phoneLocale(), currency, today, uses24h: phoneUses24h() }),
    [lang, currency, today],
  );
}
