# 028 Skin calendar and day detail

**Phase:** G. Calendar · **Depends on:** 007, 010, 022 · **Spec:** C1 (Skin view, month swipe, Progress photos row), C2, Words and copy (Not done, streaks, photo dates), Motion (fixed calendar height), Empty states (Calendar) · **Design:** [screens.md](../design/screens.md) CalendarScreen, DayDetailScreen; [components.md](../design/components.md) StreakCard

## Goal

The Calendar tab with its view switch and the Skin month view with streaks, plus the day detail screen where the past week can still be corrected.

## Scope

In: `src/features/calendar/screens/CalendarScreen.tsx`, `DayDetailScreen.tsx`, `components/MonthGrid.tsx`, `components/DayCell.tsx`, `src/features/calendar/api.ts`.

### C1 Calendar

- **Top:** title "Calendar", `ToggleGroup` Skin / Hair / Condition (three segments; Progress is not a segment). Hair and Condition show placeholders until tasks 033 and 038. The header and switch never move.
- **Streak cards:** skin `StreakCard` (`calendar-check`, never a flame) with current and best ("12 days in a row · Best 21 days", from `skinStreak`, task 007) above the grid (hair card slot for task 033). After a break it reads "Started again. Your best is still 21 days." (`restarted`).
- **MonthGrid** (build it; don't use react-native-calendars, so the 6-row height, marks and labels are exactly ours):
  - always 6 rows × 7 columns from `daysInMonthGrid` (task 006), **Monday first**, weekday letters from i18n; days outside the month in `ink-muted`;
  - each day a **12 pt mark** from `skinDayStatus` that differs by shape as well as colour: done (filled `accent`), partly done (half-filled), not done (grey ring; a past day with routines set and none finished, never called "Missed"), pending (today, nothing yet: no mark), none (no mark); today has an `accent` outline; the **selected day** uses the `accent-soft` background with `ink` text (never the solid done colour);
  - each day's spoken label includes date and status ("5 October, partly done");
  - swipe left/right between months with a horizontal slide (200 ms), the grid height never changes; a "Today" button returns to the current month (hidden on the current month, space reserved);
  - tapping a day selects it and pushes C2.
- **Progress photos row** under the grid ("Last photo 29 Sep · next one Sunday") that pushes C3, the Progress photos screen (task 037 fills the line and the screen; until then the row opens a placeholder).
- **Data:** `useSkinMonth(month)` returns statuses for the 42 grid days in one query (logs in range + routines + steps through task 007), so the grid paints in one go; prefetch the neighbouring months.
- **Empty:** with no routines at all, show the grid with no marks and the line "Your month fills in as you go" / "Each day you tick a routine gets a dot here." under it.

### C2 Day detail (`/calendar/day/[day]`)

- Title: the date ("Monday, 5 Oct").
- **Skin routines** due that day, each with its status (done / partly done / not done) and every due step with a `Checkbox` showing whether it was ticked.
- **Editable up to 7 days back** (including today): ticking a forgotten step uses `useTickStep` for that day and updates the streak; older days are read-only (checkboxes shown as static ticks, a caption "Older days can't be changed").
- Slots for: hair tasks done (033), condition log or "Log how your skin was" (038), product notes written that day (039), weekly photo thumbnail named by its date, never a week number ("Skin photo, taken 6 Oct.", 037).
- A day with nothing done says so and what was due ("Nothing done · Evening was due"; task 033 adds "Next wash was due 6 Oct").

Out:

- Hair view and hair streak: 033. Condition view: 038. Progress photos screen: 037.

## Acceptance criteria

- [ ] Month grid always 6 rows, Monday first, correct for October 2026 (1 Oct is a Thursday) and for months starting on Monday and Sunday.
- [ ] Day marks (12 pt, filled, half or ring) match `skinDayStatus` for a seeded month (done, partly done, not done, none, today pending); the selected day uses accent-soft; spoken labels include status and say "not done", never "missed".
- [ ] The switch has three segments; the Progress photos row pushes C3.
- [ ] Swiping months doesn't change the grid height; "Today" returns.
- [ ] Day detail edits work for the last 7 days and update marks and streak; older days are read-only.
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes.

## Decisions

- **Files.** Besides the files in Scope: `repo.ts` (`getSkinMonth`, `getSkinDay`, the edit window), `month.ts` ('YYYY-MM' months, like the hair hooks of task 031), `labels.ts` (month title and spoken day labels), and `components/DayMark.tsx`, `SkinCalendar.tsx`, `SkinDaySection.tsx`, `ProgressPhotosRow.tsx`.
- **Data.** `useSkinMonth(month)` (key `[...qk.calendar.month('skin', month), today]`) loads routines, steps and the logs of the 42 grid days once through the new `skinRangeInput` in the routines repo and runs `skinDayStatuses` (task 007); it prefetches the months either side. `useSkinDay(day)` uses `[...qk.calendar.day(day), 'skin', today, warnDays]`, next to the hair day key. Everything sits under `qk.calendar`, so routine and tick mutations refresh it.
- **Deleted steps.** `skinRangeInput` (and so `streakInput`) drops steps deleted since a day's snapshot, as Today does (task 022 "Day snapshot"), so the calendar, the streak and C2 agree.
- **Marks.** Done: filled `accent` dot. Partly done: `accent` ring with the left half filled. Not done: `ink-muted` ring (`border-strong` is too faint on the dark selected background). Pending, none and future days keep the 12 pt space with no mark. Spoken labels say "5 October, partly done" (LT "spalio 5 d., iš dalies atlikta"), add "today" on today, and leave the status out for days with nothing due and days still to come.
- **Selected day.** Nothing is selected on first open (today only has its outline); tapping a day selects it (`accent-soft`, `ink` text) and pushes C2, and stays selected on return.
- **Swipe.** RNGH `Gesture.Pan` (48 pt or 400 pt/s). The new month slides in from the side it came from in 200 ms (ease-out) while the old one fades out (150 ms); under Reduce Motion both are 100 ms fades. The first month paints in place (`LayoutAnimationConfig skipEntering`). The grid box is a fixed 312 pt (6 × 52 pt cells). "Today" sits beside the month arrows, invisible and hidden from screen readers on the current month so its space stays.
- **Streak card.** `restarted` when best > current (a longer run ended before this one). With no routines at all the card is hidden and the empty line shows under the grid. The hair card slot is marked for task 033.
- **Loading.** The grid numbers never wait for data; marks appear with the month's single query (SQLite answers before the first frame in practice). The streak card and the C2 section show a skeleton until their query has data.
- **Edit window.** Today and the six days before it (7 days, `EDIT_WINDOW_DAYS`); older days show static ticks and "Older days can't be changed". Future days are read-only too, with "You can tick these on the day.".
- **C2 routines.** A routine shows when it counts for the calendar mark (a snapshot that day, or created by then with steps due). Of A/B options at one time of day only the started one shows, so the other never reads "Not done"; when none was started, all show. Each routine card shows its name, its time of day, its status (Done, Partly done, Not done, or "Not done yet" for today) and its due steps; a step is labelled by its product, else its note, else "Step 2". A past day with nothing done shows "Nothing done · Morning, Evening were due".
- **Ticks on C2** go through `useTickStep` (Today's mutation) with the routine's due step ids as the snapshot; `useTickDayStep` also updates the C2 cache at once and rolls it back on error. The mutation invalidates `qk.calendar`, so marks and the streak follow.
- **Hair and Condition** show a "Built in task 033/038" placeholder with the Progress photos row until those tasks replace them with views built on `MonthGrid` (it takes `renderMark` and `dayLabel`). The Progress photos row has no detail line yet (task 037).
- **LT copy.** Month titles "2026 m. spalis"; spoken dates use the genitive ("spalio 5 d."). Condition is "Būklė".

Check on a real device:

- The month slide feels right in both directions and the grid height never jumps (including after the Today button appears).
- A horizontal swipe on the grid doesn't fight the vertical scroll of the screen.
- The partly-done half dot and the not-done ring are readable at 12 pt in light and dark, also on the selected (`accent-soft`) day.
- VoiceOver and TalkBack read "5 October, partly done" per day, and skip the hidden Today button.
- 360 pt width: day cells stay at least 44 pt wide; Lithuanian month title and C2 status labels wrap without clipping.
- A native Lithuanian read of the `calendar.*` strings.
