# 028 Skin calendar and day detail

**Phase:** G. Calendar · **Depends on:** 007, 010, 022 · **Spec:** C1 (Skin view, month swipe), C2, Motion (fixed calendar height), Empty states (Calendar) · **Design:** [screens.md](../design/screens.md) CalendarScreen, DayDetailScreen; [components.md](../design/components.md) StreakCard

## Goal

The Calendar tab with its view switch and the Skin month view with streaks, plus the day detail screen where the past week can still be corrected.

## Scope

In: `src/features/calendar/screens/CalendarScreen.tsx`, `DayDetailScreen.tsx`, `components/MonthGrid.tsx`, `components/DayCell.tsx`, `src/features/calendar/api.ts`.

### C1 Calendar

- **Top:** title "Calendar", `ToggleGroup` Skin / Hair / Condition / Progress. Hair and Condition show placeholders until tasks 033 and 038; Progress opens C3 (task 037; placeholder until then). The header and switch never move.
- **Streak cards:** skin `StreakCard` with current and "Best 21 days" (from `skinStreak`, task 007) above the grid (hair card slot for task 033).
- **MonthGrid** (build it; don't use react-native-calendars, so the 6-row height, marks and labels are exactly ours):
  - always 6 rows × 7 columns from `daysInMonthGrid` (task 006), **Monday first**, weekday letters from i18n; days outside the month in `ink-muted`;
  - each day a **10 pt mark** from `skinDayStatus`: done (filled `accent`), partly done (half-filled), missed (grey ring), pending (today, nothing yet: no mark), none (no mark); today has an `accent` outline; the **selected day** uses the `accent-soft` background with `ink` text (never the solid done colour);
  - each day's spoken label includes date and status ("5 October, partly done");
  - swipe left/right between months with a horizontal slide (200 ms), the grid height never changes; a "Today" button returns to the current month (hidden on the current month, space reserved);
  - tapping a day selects it and pushes C2.
- **Data:** `useSkinMonth(month)` returns statuses for the 42 grid days in one query (logs in range + routines + steps through task 007), so the grid paints in one go; prefetch the neighbouring months.
- **Empty:** with no routines at all, show the grid with no marks and the line "Your month fills in as you go" / "Each day you tick a routine gets a dot here." under it.

### C2 Day detail (`/calendar/day/[day]`)

- Title: the date ("Monday, 5 Oct").
- **Skin routines** due that day, each with its status (done / partly / missed) and every due step with a `Checkbox` showing whether it was ticked.
- **Editable up to 7 days back** (including today): ticking a forgotten step uses `useTickStep` for that day and updates the streak; older days are read-only (checkboxes shown as static ticks, a caption "Older days can't be changed").
- Slots for: hair tasks done (033), condition log or "Log how your skin was" (038), product notes written that day (039), weekly photo thumbnail "Week 41 photo, taken 6 Oct." (037).
- A day with nothing done says so and what was due ("Nothing done · Evening was due"; task 033 adds "Next wash was due 6 Oct").

Out:

- Hair view and hair streak: 033. Condition view: 038. Progress: 037.

## Acceptance criteria

- [ ] Month grid always 6 rows, Monday first, correct for October 2026 (1 Oct is a Thursday) and for months starting on Monday and Sunday.
- [ ] Day marks match `skinDayStatus` for a seeded month (done, partly, missed, none, today pending); the selected day uses accent-soft; spoken labels include status.
- [ ] Swiping months doesn't change the grid height; "Today" returns.
- [ ] Day detail edits work for the last 7 days and update marks and streak; older days are read-only.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
