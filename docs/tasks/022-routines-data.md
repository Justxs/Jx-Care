# 022 Routines data

**Phase:** F. Routines and Today · **Depends on:** 007, 012 · **Spec:** R1 skin cards, R2 (fields, templates, unsaved changes), R3 (step fields), T1 routine cards (A/B choice), T2 (ticks, finished product), refinements 2, 3, 11, sequences 4 and 5

## Goal

Repository functions and query hooks for skin routines, their steps, daily ticks and the A/B choice, using the task 007 rules for everything that depends on the date.

## Scope

In: `src/features/routines/repo.ts`, `repo.test.ts`, `api.ts`, `schema.ts`, `templates.ts`.

### Repository functions

| Function | Does |
| --- | --- |
| `listRoutines(db)` | All routines with their steps (step product name, brand, photo, area, status, `archivedAt`), grouped later by the screen; each with `stepCount`, `reminderTime`, `active` |
| `getRoutine(db, id)` | Routine + ordered steps with product info |
| `saveRoutine(db, input)` | Insert or update the routine **and** its full step list in one transaction (the editor saves everything at once; steps not in the list are deleted, new ones inserted, `position` rewritten 0…n) |
| `setRoutineActive(db, id, active)` | R1 switch |
| `duplicateRoutine(db, id)` | "Duplicate as variant": copies routine and steps, name + " (copy)" from i18n passed in, reminder off |
| `deleteRoutine(db, id)` | Cascades steps, logs and choices |
| `replaceStepProduct(db, stepId, productId)` | "Pick another" from T2 and sequence 7's "replace missing steps on request" |
| `getDayLog(db, routineId, day)` | The `routine_log` row or null |
| `tickStep(db, routineId, stepId, day, done, dueStepIds)` | Adds or removes the step in `doneStepIds`; creates the log on first tick with the `dueStepIds` snapshot; sets `completedAt` when all due steps are done and clears it when one is unticked |
| `setChoice(db, timeOfDayKey, weekday, routineId)` | Remembers the A/B pick for that weekday |
| `getTodayRoutines(db, day)` | Data for Today and the player: uses `todayGroups`, `dueSteps` and `routineProgress` from task 007 over all active routines, steps, the day's logs and choices. Each step carries its product's status so a finished (archived) or expired product can be shown (refinement 11) |
| `logsInRange(db, fromDay, toDay)` | For the calendar and streaks (task 028) |
| `streakInput(db, today)` | Everything `skinStreak()` needs, loaded once |
| `recentStepProducts(db, area, limit = 5)` | R4 picker's Recent group: products most recently added to any routine step or hair task of that area, newest first, active only |
| `routineCountByProduct(db, productId)` | Fills P2 "Used in" (extend task 012's `usedIn`) |

### Templates (`templates.ts`)

The routine starter (spec R2 "Starting a routine"): Morning: Basics (cleanser, moisturiser, SPF), Light (rinse, moisturiser, SPF), Start empty. Evening: Treatment (cleanser, serum, moisturiser), Basics (cleanser, moisturiser), Start empty. `buildFromTemplate(template, products)` fills each step with the newest active skin product of that category (`rinse` has no product: step note "Rinse with water", product null); gaps get `productId: null` ("Pick a product later"). Template names and step labels are i18n keys.

### Validation (`schema.ts`, zod, used by task 024)

Name required (max 60); time of day required; custom needs a name and a default time; at least one day; at least one step to save; a step with `scheduleKind: 'days'` needs at least one day, limited to the routine's days; `interval` needs `everyNDays` 2–60 and a `startDate`; `waitSeconds` one of 0, 30, 60, 120, 300, 600, 900, 1200; reminder time `HH:mm`.

### Query hooks

`useRoutines()`, `useRoutine(id)`, `useTodayRoutines()` (keyed by `activeDay`), `useSkinStreak()`, and mutations `useSaveRoutine`, `useSetRoutineActive`, `useDuplicateRoutine`, `useDeleteRoutine`, `useTickStep`, `useSetChoice`, `useReplaceStepProduct`. `useTickStep` updates the cache optimistically (the checkbox must fill in 150 ms with no wait) and rolls back on error. Mutations invalidate `qk.routines.all`, `qk.today(day)` and the calendar keys; leave a no-op `onRoutineChanged(id)` hook for task 027's reminders and task 030's conflict cache.

Out:

- Conflict checks: task 030 (it reads the same data through task 007).
- Screens: 023–026. Reminders: 027. Calendar: 028.

## Acceptance criteria

- [ ] Repository tests: saving a routine with reordered, added and removed steps; ticking the last due step sets `completedAt`, unticking clears it; the `dueStepIds` snapshot is kept after the routine is edited; a step with a finished product still appears with its status; A/B choice is remembered per weekday; deleting a routine removes its logs.
- [ ] `getTodayRoutines` returns one group per time of day with the right A/B options for a set of routines on a Monday and a Tuesday (reuse task 007's fixtures).
- [ ] `buildFromTemplate` picks the newest product per category and leaves gaps.
- [ ] `npm run check` passes.

## Decisions

- **Expiry context in reads.** `listRoutines`, `getRoutine`, `getTodayRoutines` and `recentStepProducts` also take the app day and `warnDays` (like the products repo), so every step product carries its expiry `status`, `effectiveExpiry` and `daysLeft`. The hooks pass `appStore.activeDay` and the settings' warning window, and both are part of the query keys.
- **Step product problem.** Each step product has `problem: 'finished' | 'expired' | null`; finished (archived) wins over expired (refinement 11). Steps with no product have `product: null`.
- **Routine created day** is `appDay(createdAt)`, so days before a routine existed never count (README decision).
- **Past days are frozen before a schedule change** (follow-up to the PR #2 review). Before `saveRoutine` updates a routine or `setRoutineActive` switches it, in the same transaction, `freezePastDays` gives every day from its created day to yesterday that is due under the old definition and has no snapshot a log with that day's due steps, no ticks and `completedAt` null (a log whose snapshot steps were all deleted gets one too, keeping its ticks), in one insert. Then `createdAt` moves to now, so a past day with no log stays empty whatever the new schedule says (more days or switching back on can't turn a free day into a missed one). The calendar, C2, the streak, the player and the C6 week counts read such a log exactly as the schedule read the day (nothing ticked, so not started). Only the first save after a long time writes many rows (one per due day, about 365 for a year); later saves start from the last change. The first-run card picks the first routine by id now, since `createdAt` moves. Deleting a routine still deletes its logs: the delete dialog says its calendar history goes too, and switching it off is the way to keep the history.
- **saveRoutine.** A step id that doesn't belong to the routine is inserted as a new step, never moved. Steps whose values didn't change are not updated, so `routine_step.updatedAt` means "last changed" and drives the picker's Recent group. `active` is optional in the input: new routines start active, edits keep the switch.
- **Day snapshot.** The first tick of a day saves the `dueStepIds` passed in; later routine edits never change it. Steps deleted since the snapshot are dropped from it (when reading, and saved on the next tick) so a deleted step can never block a day. A step added after the day's first tick doesn't count that day. Unticking a day with no log does nothing; unticking every step keeps the log row with no ticks.
- **Bulk ticks.** `tickSteps(db, routineId, stepIds, …)` ticks or unticks several steps in one transaction (All done and its Undo, tasks 025 and 026); `tickStep` is the one-step form. `useTickStep` takes `{ routineId, stepIds, day, done, dueStepIds }` and updates both the Today and player caches at once; `applyTickToRoutine` and `applyTickToGroups` are the pure optimistic updates.
- **Today groups.** Each group adds `timeOfDay`, `customName`, `started` (anything ticked) and `complete` (either A/B option complete). `chosenId` is the routine already ticked when there is one, otherwise the weekday's remembered pick, otherwise the first option, so the choice is fixed after the first tick.
- **Player data.** `getRoutineDay(db, id, day, warnDays)` and `useRoutineDay(id)` (key `qk.routines.player`) give one routine on a day with its due steps, progress and log, for task 026.
- **Recent products.** `recentStepProducts(db, area, today, warnDays, limit = 5)`: skin reads routine steps, hair reads hair tasks, both by `updatedAt`; only active (not finished) products of that area or "both". They come back as `PickerProduct` with expiry fields so the picker can still put an expired one in "Can't be picked".
- **Used in.** `routinesUsingProduct` is registered with `addUsedInSource` when `routines/repo.ts` loads; `app/_layout.tsx` imports that module once so product detail always lists routines. `routineCountByProduct` counts distinct routines.
- **Duplicate.** `duplicateRoutine(db, id, makeName)` takes a function so the hook can translate `routines.copyName` ("{{name}} (copy)"). The copy keeps the days and active state; the reminder is off.
- **Templates.** `buildFromTemplate` treats "both" products as skin, skips finished and (when `status` is given) expired products, and picks the newest by `createdAt`. Templates have a `nameKey` for the starter list ("Basics") and a `routineNameKey` for the pre-filled routine name ("Morning basics"); Start empty pre-fills "Morning" or "Evening". `draftFromTemplate(built, t)` turns a built template into editor values.
- **Schema.** Morning and evening always get `sortTime` 07:00 and 21:00 (only Custom has a time field, spec R2); custom name max 30; step note max 100; `everyNDays` accepts the typed text or a number; fields of the schedules not chosen are cleared; days are sorted and de-duplicated. Error messages are `routines.errors.*` keys in both languages.
- **Invalidation.** Mutations invalidate `qk.routines.all`, every `today` key and `qk.calendar.all` (routine changes can touch any day); saves, duplicates, deletes and product swaps also invalidate `qk.products.all` because product detail shows "Used in". `useSkinStreak` uses `[...qk.calendar.streaks, 'skin', day]`.
- `onRoutineChanged(id)` (no-op, in `api.ts`) runs after save, active switch, duplicate (new id), delete and product swap.

Check on a real device:

- The step checkbox fills within 150 ms of a tap (optimistic tick) in a release build.
- Product detail lists routines under "Used in" on a cold start, before the Routines tab was opened.
- A native Lithuanian read of the new `routines.templates.*` and `routines.errors.*` strings.
