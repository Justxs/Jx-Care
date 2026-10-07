# 038 Condition log

**Phase:** L. Condition and notes · **Depends on:** 025, 028 · **Spec:** T1 (Check-in card: "How's your skin today?", "Hair and note"), T4, C1 (Condition view), C2 (condition section), feature plan 11 · **Design:** [screens.md](../design/screens.md) ConditionLogSheet, TodayScreen (Check-in), CalendarScreen; [design/README.md known differences](../design/README.md#known-differences) (seven skin tags, chips not a scale)

## Goal

A one-tap daily log of how skin and hair are, from Today or any calendar day, and a calendar view that makes patterns visible.

## Scope

In: `src/features/condition/repo.ts`, `repo.test.ts`, `api.ts`, `components/ConditionChips.tsx`, `components/ConditionLogSheet.tsx`, `src/features/calendar/components/ConditionMonthView.tsx`.

### Data

- Tags (stable keys, translated at display), always shown in this standard order: skin `calm`, `glow`, `oily`, `dry`, `breakout`, `redness`, `itchy` (Calm, Glow, Oily, Dry, Breakout, Redness, Itchy); hair `shiny`, `frizzy`, `oily_roots`, `dry_ends`, `flaky_scalp` (Shiny, Frizzy, Oily roots, Dry ends, Flaky scalp).
- `getConditionDay(db, day)` → `{ skin?: { states, note }, hair?: { states, note } }`; `toggleState(db, day, area, state)` (creates or updates the row, deletes it when it ends with no states and no note); `saveConditionDay(db, day, { skin, hair })`; `conditionMonth(db, days)` → per day the skin states; `conditionSummary(db, fromDay, toDay)` (used by task 035's week context).

### Today Check-in, condition part (fill task 025's slot)

In the Check-in card task 025 builds, below the photo row and a separator: "How's your skin today?" with compact skin chips (the seven skin tags in the standard order, multi-select); tapping a chip saves at once (optimistic) with a light haptic. No hair chips on Today: "Hair and note" opens T4 for today, for hair tags and a note. Add to `prefetchToday`.

### T4 Condition log (sheet)

Date at the top (`DateField`, today by default, not future), a Skin / Hair `ToggleGroup` over the tag chips, each side showing how many tags are picked, so only the 7 skin or 5 hair chips show at once; chips multi-select, both optional, in the standard order. Note (max 280, counter). Save. Opens from Today ("Hair and note") and C2.

### C1 Condition view (fill task 028's placeholder)

Same 6-row grid; each day with a log shows a small coloured chip for its main skin state: calm `ok` tones, oily `warning` tones, dry `hair` tones (blue-violet), breakout `danger` tones, redness `brand`/accent-soft tones, glow and itchy as listed in the legend (pick token pairs that keep 4.5:1 for any text and note them under Decisions). When several states are logged, show the first by severity order (breakout, redness, itchy, oily, dry, calm, glow) and add a "+1" dot-free count in the spoken label. **Legend** below the grid (word + colour, never colour alone). Spoken labels: "5 October, breakout and oily".

### C2 Day detail (fill task 028's slot)

The day's skin and hair states as chips plus the note, or "Log how your skin was" opening T4 for that day (within any past day; condition logs aren't limited to 7 days).

Out:

- Product notes: 039.

## Acceptance criteria

- [x] Repository tests: toggling creates, updates and deletes rows; one row per day and area; month query.
- [x] Tapping a chip on Today saves immediately and survives a restart; T4 saves states and note for any past day.
- [x] Today shows the seven skin chips in the standard order and "Hair and note"; T4's Skin / Hair switch shows the picked count on each side and the five hair tags.
- [x] Condition view shows chips and the legend; spoken labels name the states.
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes. (`pnpm check` passes; the visual checks need a device, listed under Decisions.)

## Decisions

- **Files.** `src/features/condition/`: `tags.ts` (standard and severity order, note cleaning, the toggle rule; pure and shared by the repo and the optimistic update), `repo.ts` (`getConditionDay`, `toggleState`, `saveConditionDay`, `conditionMonth`, `conditionSummary`), `api.ts`, `labels.ts` (tag words, "breakout and oily", the Condition view's spoken day label), and `components/`: `ConditionChips`, `ConditionLogSheet` (+ `useConditionLogSheet`), `SkinCheckIn` (Today's slot), `ConditionDaySection` (C2), `ConditionTone` (state colours, the grid mark, the legend, the C2 pills). Calendar: `components/ConditionMonthView.tsx`. The pure helpers live in the feature folder rather than `src/lib/` because they build on the tag lists in `src/db/enums.ts`, and `src/lib` imports nothing from the app. No schema change (`condition_log` from task 004 already has one row per day and area).
- **Data rules.** Tags are stored as their stable keys, always in the standard order, unknown ones dropped. A note is trimmed and cut to 280; empty is null. A row with no tags and no note is deleted (by `toggleState` and by `saveConditionDay`). `saveConditionDay` replaces only the areas it is given. `toggleState` refuses a tag of the other area. `conditionMonth` returns the skin states in severity order (breakout, redness, itchy, oily, dry, calm, glow), days without skin states left out. `conditionSummary(db, from, to)` returns `{ skin, hair }` with days logged and each tag's count (most frequent first, ties in the standard order); task 035's `weekContext` now calls it instead of its own copy.
- **Queries.** `qk.condition.day(day)` for a day and `[...qk.condition.all, 'month', month]` for the Condition view (neighbour months prefetched, previous data kept while the month changes). Both mutations invalidate `qk.condition.all` and `qk.progress.all` (the week summary). `prefetchToday` also prefetches today's condition day.
- **Today chips.** The seven skin chips use the shared `Chip` (36 pt, wrapping). A tap is optimistic (the cached day is updated with the same `toggleInDay` rule the repo uses, rolled back on error) with a light haptic; taps run in one mutation scope so quick taps never overtake each other. The Check-in card now always shows (also in the first-run state), since the skin question is there every day; Today's section-order tests gained `checkIn`. "Hair and note" is a small ghost button with `notebook-pen` (one filled button per screen stays with the routine cards).
- **One note per area.** The schema keeps a note per day and area, so T4's note follows the Skin / Hair switch ("Skin note" / "Hair note", counter "12 of 280" in the field's helper line). The switch always shows both counts, also 0, so the segments never change. T4 opens on Hair from Today and on Skin from C2; the Routine done screen (task 026) can open it on Skin with `useConditionLogSheet().open(day, 'skin')`.
- **T4 date.** Today by default, no future dates (`max` = today; a future `day` prop falls back to today). Picking another date loads that day's log into the fields (one log per day and area, so the sheet always edits the chosen day); unsaved changes to the previous date are dropped without asking. Closing with unsaved changes asks "Discard changes?" (the shared Sheet guard). Save closes the sheet; no toast, since the chips or C2 show the result in place.
- **Condition view.** Each logged day shows an 8 × 18 pt bar in its main skin state's colour, and "+N" (13 pt, `ink-muted`) when more states were logged; the mark row is always 18 pt, so the 52 pt cell holds the number and the mark at every day. The mark is hidden from screen readers; the cell's label names every state in severity order ("5 October, breakout and oily", LT "spalio 5 d., išbėrimai ir riebi") and "today" on today. The legend under the grid lists all seven states (swatch and word, in the standard order) and reads as one element ("Legend: Calm, Glow, …").
- **Colours.** Bars and swatches use the solid token (graphics need 3:1); pills with a word use a pair DESIGN.md already uses for text, so they keep 4.5:1 in both themes: calm `ok` on `ok-soft`, glow `skin` on `skin-soft`, oily `warning` on `warning-soft`, dry `hair` on `hair-soft`, breakout `danger` on `danger-soft`, redness `accent` on `accent-soft`, itchy `neutral` on `neutral-soft`. Legend words are `ink`. Hair tags on C2 are `ink` on `subtle`.
- **C2.** A "Condition log" section under the skin routines for today and past days (any past day, not only the last 7); future days show nothing. With a log: a card with Skin and Hair parts (tags as pills in the standard order, then the note), each read as one line ("Skin: Oily, Breakout. New serum"), and an Edit word in the heading row. Without one: a secondary "Log how your skin was" button. Both open T4 for that day.
- **Strings** under `condition.*`; skin tag words stay in `common.tags.*`, hair tags are `condition.hairTags.*` (LT Blizga, Pasišiaušę, Riebios šaknys, Sausi galiukai, Pleiskanoja galvos oda).
- **Tests.** `repo.test.ts` (tag helpers; toggling creates, updates and deletes; one row per day and area; save; month; summary) and `components/__tests__/condition.test.tsx` (Today chips save at once and survive a restart, Hair and note opens T4 on Hair with counts and the five hair tags, C2 logs a day older than 7 days, the Condition view's marks, "+1", spoken labels and legend, LT label). The "You're set" Today test now waits for the next day's sections, which were racing under a loaded test run.

Check on a real device:

- Light, dark, 360 pt and Lithuanian: the seven skin chips wrap cleanly on Today and in T4; the Skin / Hair switch with counts; the note field and its counter with the keyboard up (the note scrolls into view without a jump).
- The Condition view at 360 pt: bar plus "+1" fits each cell, the number doesn't move between days, and the bars are easy to tell apart, especially breakout (`danger`) next to redness (`accent`) and calm (`ok`) next to glow (`skin`), also on the selected (`accent-soft`) day and in dark mode.
- The light haptic on a chip tap; the chip changes at once.
- VoiceOver and TalkBack read "5 October, breakout and oily" per day and the legend as one line.
- Picking a date in T4 (iOS sheet and Android dialog) refuses future days and loads that day's log.
- A native Lithuanian read of the new `condition.*` strings.
