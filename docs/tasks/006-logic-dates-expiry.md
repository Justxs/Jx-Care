# 006 Logic: app day, expiry, cost and ingredients

**Phase:** A. Foundation · **Depends on:** 001 · **Spec:** Refinements 1 (day boundary) and 4 (no dates), P1 status rules, P2 cost per day, P3 live preview, P4 ingredient entry, L2 answer matching

## Goal

The date and product rules as pure, fully tested functions in `src/lib/`. No React, no Expo, no database: inputs in, values out. Screens and repositories call these and never re-implement them.

## Scope

In: `npm install date-fns@latest`. Each module gets a `*.test.ts` next to it.

### `src/lib/appDay.ts`

- `DAY_ENDS_AT_HOUR = 4`.
- `appDay(now: Date | number): string`: the app day as `'YYYY-MM-DD'` in the phone's time zone. 00:00–03:59 belongs to the previous day. Example: 2026-10-07 00:30 → `'2026-10-06'`; 2026-10-07 04:00 → `'2026-10-07'`.
- `nextDayBoundary(now): number`: ms of the next 04:00, for the store timer in task 005.
- Day maths on `'YYYY-MM-DD'` strings with no time-zone drift: `addDays(day, n)`, `diffDays(a, b)` (whole days, `a - b`), `weekdayOf(day)` (ISO 1–7), `weekStart(day)` (the Monday), `addMonths(day, n)` (clamps to month end: 2026-01-31 + 1 month = 2026-02-28), `isBefore`, `isAfter`, `compareDays`, `daysInMonthGrid(year, month)` (always 42 days, Monday first, for the 6-row calendar).
- Tests: DST change days in Europe/Vilnius (last Sunday of March and October), month ends, leap years, the 03:59 / 04:00 boundary.

### `src/lib/expiry.ts`

```ts
type ExpiryInput = { expiresAt: string | null; openedAt: string | null; paoMonths: number | null };
type ExpiryStatus = 'ok' | 'expiring' | 'expired' | 'unopened' | 'nodate';
```

- `effectiveExpiry(p)`: the earlier of `expiresAt` and `openedAt + paoMonths` (using `addMonths`); either side may be missing; `null` when neither exists.
- `expiryStatus(p, today, warnDays)`, by these rules (spec P1 and refinement 4):
  1. No effective expiry → `'nodate'`.
  2. Effective expiry before today → `'expired'`.
  3. Effective expiry within `warnDays` (today counts as 0 days left) → `'expiring'`.
  4. Not opened (`openedAt` null) → `'unopened'`.
  5. Otherwise `'ok'`.
- `daysLeft(p, today)`: `diffDays(effectiveExpiry, today)` or `null`; negative when expired.
- `expiryProgress(p, today)`: 0–1 from `openedAt` (or `purchasedAt` if passed) to effective expiry, for the P2 progress bar; `null` when not computable.
- `warningDay(p, warnDays)`: the day the expiry warning fires (`effectiveExpiry - warnDays`), used by task 021.
- `sortBySoonestExpiry(products, today)`: expired first (most overdue first), then soonest, then no date last; stable by name.

### `src/lib/cost.ts`

- `costPerDayCents(priceCents, openedAt, finishedAt)`: `round(price / max(1, diffDays(finishedAt, openedAt)))`; `null` if any input is missing or `finishedAt` is before `openedAt`. Also return the day count (P2 "€0.21 a day over 142 days").

### `src/lib/text.ts`

- `normalizeName(s)`: trim, collapse inner whitespace, Unicode NFKD, strip diacritics, lowercase. "  Niacinamide " and "niacinamide" match; "Ąžuolas" → "azuolas".
- `matchesAnswer(input, storedNormalized)`: compares after `normalizeName` (spec L2: ignore case, accents and extra spaces). Task 016 hashes the normalised form.

### `src/lib/ingredients.ts`

- `parseIngredientLines(text)`: split on `\n` (also `\r\n`), trim, collapse spaces, drop blank lines, merge duplicates by `normalizeName` keeping the first spelling, keep order. Commas inside a line stay part of that ingredient (one per line is the rule, spec P4).
- `classifyIngredients(parsed, known)`: given the user's known ingredients (`{ id, name, normalizedName }[]`), mark each parsed line `existing` (with id) or `new`.
- `suggestIngredients(prefix, known, limit = 5)`: case- and accent-insensitive prefix matches first, then substring matches.

Out:

- Schedules, streaks, hair and conflicts: task 007.
- Display formatting ("Expires in 12 days"): task 003.

## Acceptance criteria

- [ ] All functions above exist with the signatures shown (names can change only if you note it under Decisions).
- [ ] Tests cover every rule listed, including: printed date earlier than opened + PAO, PAO earlier than printed date, opened with no PAO and no printed date (`'nodate'`), unopened with a printed date inside the warning window (`'expiring'`), unopened far from expiry (`'unopened'`), expiring exactly on the warning boundary, expiring today (0 days, `'expiring'`), expired yesterday.
- [ ] Coverage of `src/lib/` files from this task is at least 95% of lines.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
