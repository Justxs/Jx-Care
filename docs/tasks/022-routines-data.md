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

(Write any choices you make here.)
