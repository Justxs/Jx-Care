# 003 Translations and formatting

**Phase:** A. Foundation · **Depends on:** 001 · **Spec:** Global UI rules (Language, Dates and numbers), Words and copy

## Goal

Every string in the app comes from Lithuanian and English translation files, the language can change at runtime, and dates, numbers, money and relative day counts are formatted the way the spec says, from one tested module.

## Scope

In:

1. **Packages:** `npm install i18next@latest react-i18next@latest`, `npx expo install expo-localization`.
2. **Files:** `src/i18n/en.json`, `src/i18n/lt.json`, `src/i18n/index.ts`.
   - Nested keys by area: `common.*`, `tabs.*`, `onboarding.*`, `lock.*`, `today.*`, `products.*`, `shopping.*`, `routines.*`, `hair.*`, `calendar.*`, `progress.*`, `condition.*`, `settings.*`, `notifications.*`, `errors.*`, `a11y.*`.
   - Seed `common.*` with the shared words from the spec's "Words and copy" table so later tasks reuse them instead of inventing synonyms: `buyAgain`, `markFinished`, `finished`, `archive`, `start`, `timeOfDay`, `morning`, `evening`, `custom`, `everyTime`, `setDays`, `everyFewDays`, `repeatEveryDays`, `otherCare`, `mild`, `weeklyPhoto`, `save`, `cancel`, `delete`, `edit`, `done`, `undo`, `continue`, `back`, `notNow`, `skin`, `hair`, `skinAndHair` (area pill "Skin + hair"), and the skin tags `tags.calm/glow/oily/dry/breakout/redness/itchy`.
   - Lithuanian: polite plural ("jūs") forms, no "I"/"we" (see the design system content rules in DESIGN.md and the spec). Plurals use i18next's `_one`, `_few`, `_many`, `_other` suffixes; Lithuanian needs `one`, `few` and `many`/`other`, so test "1 diena", "2 dienos", "10 dienų", "21 diena".
   - Weekday letters for WeekdayDots: EN `M T W T F S S`, LT `P A T K P Š S`.
3. **Language choice:** default from `expo-localization` (`getLocales()[0].languageCode === 'lt'` → `lt`, otherwise `en`). The chosen language is stored in the `settings` table (task 004/005); until the database is ready, use the phone default. `setLanguage(lang)` changes i18next and the store at once, with no restart (spec S7: "applies at once").
4. **`src/i18n/format.ts`** with pure, tested functions that take the language explicitly (no hidden globals):
   - `formatDate(day, lang, today)`: `day` and `today` are `'YYYY-MM-DD'`. EN: "15 Oct", and "1 Mar 2027" when the year isn't the current year. LT: "2026-10-15". Uses `Intl.DateTimeFormat`.
   - `formatDateField(day, lang, today)`: as above, but today reads "Today, 6 Oct" (LT "Šiandien, 2026-10-06").
   - `formatWeekdayDate(day, lang)`: "Tuesday, 6 Oct" (Today header, "Next wash: Friday, 9 Oct"); LT "antradienis, 2026-10-06" with the first letter capitalised where it starts a line.
   - `formatTime(hhmm, lang)`: 24-hour in LT ("07:30"); EN follows the phone's 12/24-hour setting if `expo-localization` exposes it, otherwise 24-hour. Write which under Decisions.
   - `formatMoney(cents, currency, locale)`: LT "12,50 €", EN "€12.50". Numbers and currency follow the phone's locale (spec), but the currency code comes from settings.
   - `formatDays(n, lang)`: "1 day" / "12 days"; LT plural forms.
   - `formatRelativeExpiry(daysLeft, lang)`: "Expires in 12 days", "Expires today", "Expired 3 days ago" (ProductRow badge text).
   - `formatDuration(seconds, lang)`: wait chips "30 s", "1 min", countdown "0:42".
   - `weekLabel(day, lang)`: "Week 41 · 6 Oct" (ISO week number).
5. **Hook:** `useFormat()` returns the functions above bound to the current language, locale and currency, so screens call `fmt.date(day)`.
6. **Missing keys:** in development, a missing key logs a warning and shows the key; a Jest test fails if `en.json` and `lt.json` don't have exactly the same set of keys.

Out:

- Translating screens: every later task adds its own strings to both files.
- The language switch UI: task 011 (Settings) and task 017 (onboarding O1).

## Acceptance criteria

- [ ] `t('common.buyAgain')` returns "Buy again" / the Lithuanian string, and switching language re-renders mounted screens.
- [ ] `format.ts` has unit tests covering: EN current-year and other-year dates, LT dates, "Today, …", money in LT and EN locales, Lithuanian plural forms (1, 2, 10, 21), negative and zero day counts, durations under and over a minute, ISO week numbers around New Year.
- [ ] The key-parity test passes.
- [ ] `npm run check` passes.

## Notes

- Hermes on SDK 57 ships `Intl.DateTimeFormat`, `Intl.NumberFormat` and `Intl.PluralRules`. If a locale is missing on Android, fall back to a hand-written LT format and note it.
- Don't format with `date-fns` `format()` for display; use it only for date maths (task 006).

## Decisions

(Write any choices you make here.)
