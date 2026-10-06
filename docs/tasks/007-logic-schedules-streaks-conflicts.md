# 007 Logic: schedules, streaks, hair and conflicts

**Phase:** A. Foundation · **Depends on:** 006 · **Spec:** Refinements 2, 3, 5, 6; T1 routine cards; T2; R2 conflict panel; R3 step schedules; R5 hair frequency; C1 day colours and streaks; S4 avoid list. Rules this plan pins down are in [README.md, "Decisions this plan makes"](README.md#decisions-this-plan-makes).

## Goal

The rules behind routines, streaks, hair care and ingredient conflicts as pure, fully tested functions in `src/lib/`. They take plain arrays (rows shaped like the task 004 tables, or narrower types) and return plain values, so they run the same in screens, repositories and tests.

## Scope

In: each module gets a `*.test.ts` next to it. Use the day helpers from `src/lib/appDay.ts` (task 006) for all date maths.

### `src/lib/schedule.ts` (skin routines)

Types (narrow versions of the table rows):

```ts
type RoutineLite = { id: number; name: string; timeOfDay: 'morning' | 'evening' | 'custom'; customName: string | null; sortTime: string; daysOfWeek: number[]; active: boolean; createdDay: string };
type StepLite = { id: number; routineId: number; productId: number | null; position: number; scheduleKind: 'always' | 'days' | 'interval'; daysOfWeek: number[] | null; everyNDays: number | null; startDate: string | null };
```

- `routineRunsOn(routine, day)`: active, `day >= createdDay`, and the weekday of `day` is in `daysOfWeek`.
- `stepDueOn(step, routine, day)`: the routine runs that day **and**: `always` → yes; `days` → weekday in the step's `daysOfWeek`; `interval` → `day >= startDate` and `diffDays(day, startDate) % everyNDays === 0`. An interval step that lands on a day the routine doesn't run is simply not due that day.
- `dueSteps(routine, steps, day)`: due steps in `position` order (refinement 2: only these count toward done).
- `timeOfDayKey(routine)`: `'morning'`, `'evening'` or `'custom:<customName>'`.
- `todayGroups(routines, steps, day, choices)`: the routine cards for Today (spec T1, refinement 3). One group per time of day that has at least one routine with due steps that day, ordered by `sortTime`. Each group: `{ key, routines (A/B options, by sortTime then id), chosenId }`, where `chosenId` comes from `choices` (`{ timeOfDayKey, weekday, routineId }[]`) for that weekday, else the first option.
- `routineProgress(routine, steps, log, day)`: `{ due: number, done: number, complete: boolean }` where `done` counts only due steps found in `log.doneStepIds`. If the log has a `dueStepIds` snapshot, use it instead of recomputing (so editing a routine doesn't rewrite a finished day).

### `src/lib/streak.ts` (skin)

Input: `{ routines, steps, logs, today }` (logs: `{ routineId, day, dueStepIds, doneStepIds }[]`).

- `groupComplete(group, …)`: true when **any** routine in the time-of-day group is complete that day (refinement 3: finishing either A or B completes it).
- `skinDayStatus(day, input)` → `'none' | 'done' | 'partly' | 'missed' | 'pending'`:
  - `none`: no group due that day.
  - `done`: every group due that day is complete.
  - `partly`: at least one due step ticked, not every group complete.
  - `missed`: nothing ticked, and the day is before today.
  - `pending`: today with nothing ticked yet (today is never `missed`).
- `skinDaySucceeded(day, input)`: at least one routine due that day is complete (feature plan rule).
- `skinStreak(input)` → `{ current, best }`:
  - Walk days backwards from today. Days with nothing due are skipped (neither break nor extend). A succeeded day adds 1. A failed day stops the walk. **Today** adds 1 if it succeeded and is skipped (not a failure) if not.
  - `best` is the longest run over the whole history, from the earliest `createdDay`, using the same rules; `best >= current`.
- Performance: the history can be a few years; compute in one pass over days with maps keyed by `routineId|day`, not nested filters. A test with 3 routines over 3 years must run in under 200 ms.

### `src/lib/hair.ts`

```ts
type HairTaskLite = { id: number; kind: 'wash' | 'other'; otherKind: 'trim' | 'colour' | 'mask' | 'other' | null; scheduleKind: 'interval' | 'days'; everyNDays: number | null; daysOfWeek: number[] | null; lastDoneAt: string | null; active: boolean; createdDay: string };
type HairLogLite = { hairTaskId: number; day: string; dueDay: string };
```

- `nextDue(task)`: `interval` → `lastDoneAt + everyNDays`; `days` → the first day **after** `lastDoneAt` whose weekday is in `daysOfWeek`; a task never done is due on `createdDay`.
- `hairTaskState(task, today)` → `{ dueDay, state: 'upcoming' | 'due' | 'overdue', overdueDays }` ("Overdue 1 day" in orange on Today).
- `logTiming(doneDay, dueDay)` → `'on_time' | 'late'`: on or before the due day is on time (refinement 6: early counts as on time and resets the next due date, because `lastDoneAt` becomes the done day).
- `hairStreak(tasks, logs, today)` → `{ current, best }`, washes only (other care never counts):
  - Order wash logs by day. A run is consecutive on-time logs; a late log ends the run (the late log itself doesn't count).
  - `current` is the run at the end, but **0** if any active wash task is overdue today (a missed due day breaks it; due today and not done yet does not).
  - `best` is the longest run ever.
- `hairMonthMarks(tasks, logs, days, today)` for the C1 Hair view → per day `{ washDone, washLate, washDue, overdue, otherCare: ('trim' | 'colour' | 'mask' | 'other')[] }` (other care done that day, from each task's `otherKind`). Future due days are projected by repeating the schedule from `nextDue`, up to the end of the shown month.
- `quickSetupToTask(choice)`: maps the quick setup frequency chips (spec R5) to a schedule: every day → interval 1; every 2 days → 2; every 3 days → 3; twice a week → `days` [1, 4] (Monday, Thursday); once a week → interval 7.

### `src/lib/conflicts.ts`

```ts
type Token = `i:${number}` | `g:${number}`;     // ingredient or group
type Rule = { id: number; leftKind: 'ingredient' | 'group'; leftId: number; rightKind: 'ingredient' | 'group'; rightId: number };
type ConflictInput = { routines: RoutineLite[]; steps: StepLite[]; productIngredients: Map<number, number[]>; ingredientGroup: Map<number, number | null>; rules: Rule[] };
type ConflictHit = { ruleId: number; weekday: number; a: { routineId: number; stepId: number; productId: number; token: Token }; b: { … }; mild: boolean };
```

- `productTokens(productId, input)`: every ingredient token plus the token of each ingredient's group.
- `ruleMatches(rule, tokensA, tokensB)`: A has the left side and B the right side, or the other way round. Returns which tokens matched (for the "Retinol × Glycolic acid" text).
- `weeklyConflicts(input)` → `ConflictHit[]` (spec refinement 5, sequence 5): for each weekday 1–7, collect steps that **can** be due that weekday across all active skin routines (morning, evening and custom together: the check is for the whole day). A step can be due when its routine runs that weekday and it is `always`, or `days` including that weekday, or `interval` (it may land on that weekday). Compare every pair of steps with **different products** (a product is never compared with itself; two steps in the same routine are compared). **Never compare two different routines with the same `timeOfDayKey`**: A/B routines at one time of day are alternatives, and only one of them is done on a day (spec refinements 3 and 5, from the 2026-10-06 critique). A hit is `mild` when either step is `interval`.
- `routineConflictSummary(hits, routineId)`: hits that involve the routine, merged by (rule, step pair) with their weekdays, for the R2 panel ("2 conflicts this week"; "Retinol (step 3) × Glycolic acid in Evening B, Tue" with "mild" when every merged hit is mild). Also return `alternatives`: the other routines with the same `timeOfDayKey` that run on at least one of this routine's days, so the panel can say "Evening A is the other evening choice, so it is not compared." 
- `dayConflicts(input, day)`: conflicts among steps actually due on that date (exact interval maths, `mild` always false), with the same alternatives rule, for the routine player's ConflictTag and the Today card's ConflictTag. Each hit carries enough to write the amber line under the player list (other routine name, both products, the rule's note).
- To check a routine **before** it is saved (the editor), the caller passes the input with the draft routine and steps in place of the saved ones; no special function needed. Add a test that shows this.

### `src/lib/avoid.ts`

- `avoidMatches(productIngredientIds, ingredientGroup, avoidItems)` → the avoid items the product hits (directly by ingredient or through its group). Used for the red Avoid badge (P1, P2) and the P3 save warning.
- `parsedLinesAvoidMatches(lines, known, ingredientGroup, avoidItems)`: the same for ingredients typed in the form before saving (new ingredients can only match by name, so compare `normalizeName`).

Out:

- Reading this data from the database: feature data tasks (022, 029, 031).
- UI text for conflicts and streaks: screen tasks.

## Acceptance criteria

- [ ] Every function listed exists with tests that cover each rule in its bullet points, including:
  - a Tue/Fri step inside a Mon–Sun routine is due only on Tue and Fri; an every-3-days step from a start date; an interval step on a day the routine doesn't run;
  - two Evening routines (A on Mon/Wed/Fri, B on Tue/Thu) give one Evening group per day; two routines on the same day give one group with A/B options and the remembered choice;
  - finishing B completes the Evening group even though A is untouched;
  - a day with nothing due between two done days keeps the streak going; a missed day breaks it; an unfinished today doesn't break it; `best` over a history with two runs;
  - a routine created yesterday doesn't make last week "missed";
  - washing a day early is on time and moves the next due date; washing late ends the hair run; a currently overdue wash makes `current` 0; other care never counts;
  - retinol in Evening A (Mon) and an AHA product in Morning (Mon) is a conflict on Monday; the same products on different weekdays are not; a group rule ("Acids") matches an ingredient in that group; an interval step gives a `mild` hit; a product is never in conflict with itself; Evening A and Evening B on the same weekday are never compared with each other, but each is still compared with Morning; `routineConflictSummary` lists Evening B as an alternative of Evening A;
  - an avoid item that is a group matches a product through one of its ingredients.
- [ ] Coverage of the files from this task is at least 95% of lines.
- [ ] The streak performance test passes.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
