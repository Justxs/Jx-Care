# 038 Condition log

**Phase:** L. Condition and notes · **Depends on:** 025, 028 · **Spec:** T1 ("How's your skin today?"), T4, C1 (Condition view), C2 (condition section), feature plan 11 · **Design:** [screens.md](../design/screens.md) ConditionLogSheet, CalendarScreen; [design/README.md known differences](../design/README.md#known-differences) (seven skin tags, chips not a scale)

## Goal

A one-tap daily log of how skin and hair are, from Today or any calendar day, and a calendar view that makes patterns visible.

## Scope

In: `src/features/condition/repo.ts`, `repo.test.ts`, `api.ts`, `components/ConditionChips.tsx`, `components/ConditionLogSheet.tsx`, `src/features/calendar/components/ConditionMonthView.tsx`.

### Data

- Tags (stable keys, translated at display): skin `calm`, `glow`, `oily`, `dry`, `breakout`, `redness`, `itchy`; hair `oily`, `dry`, `frizzy`, `shiny`.
- `getConditionDay(db, day)` → `{ skin?: { states, note }, hair?: { states, note } }`; `toggleState(db, day, area, state)` (creates or updates the row, deletes it when it ends with no states and no note); `saveConditionDay(db, day, { skin, hair })`; `conditionMonth(db, days)` → per day the skin states; `conditionSummary(db, fromDay, toDay)` (used by task 035's week context).

### Today section (fill task 025's slot)

"How's your skin today?" with compact skin chips (seven tags, multi-select) and a hair row; tapping a chip saves at once (optimistic) with a light haptic; "Add note" opens T4 for today. Add to `prefetchToday`.

### T4 Condition log (sheet)

Date at the top (`DateField`, today by default, not future), skin chips and hair chips (multi-select, both optional), note (max 280, counter). Save. Opens from Today ("Add note") and C2.

### C1 Condition view (fill task 028's placeholder)

Same 6-row grid; each day with a log shows a small coloured chip for its main skin state: calm `ok` tones, oily `warning` tones, dry `hair` tones (blue-violet), breakout `danger` tones, redness `brand`/accent-soft tones, glow and itchy as listed in the legend (pick token pairs that keep 4.5:1 for any text and note them under Decisions). When several states are logged, show the first by severity order (breakout, redness, itchy, oily, dry, calm, glow) and add a "+1" dot-free count in the spoken label. **Legend** below the grid (word + colour, never colour alone). Spoken labels: "5 October, breakout and oily".

### C2 Day detail (fill task 028's slot)

The day's skin and hair states as chips plus the note, or "Log how your skin was" opening T4 for that day (within any past day; condition logs aren't limited to 7 days).

Out:

- Product notes: 039.

## Acceptance criteria

- [ ] Repository tests: toggling creates, updates and deletes rows; one row per day and area; month query.
- [ ] Tapping a chip on Today saves immediately and survives a restart; T4 saves states and note for any past day.
- [ ] Condition view shows chips and the legend; spoken labels name the states.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
