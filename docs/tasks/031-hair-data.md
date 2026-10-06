# 031 Hair data

**Phase:** I. Hair · **Depends on:** 005, 007 · **Spec:** R1 hair rows, R5 (quick setup and editor fields), T1 hair due rows, T3 (hair task done), C1 hair view, C2 hair section, refinement 6, sequence 6

## Goal

Repository functions and query hooks for hair tasks and the hair log, using task 007's hair rules for next due dates, timing and the hair streak.

## Scope

In: `src/features/hair/repo.ts`, `repo.test.ts`, `api.ts`, `schema.ts`.

### Repository functions

| Function | Does |
| --- | --- |
| `listHairTasks(db, today)` | Active tasks with `nextDue`, `state` (`upcoming` / `due` / `overdue`), `overdueDays`, `lastDoneAt`, product names, grouped by `kind` (Washes / Other care) |
| `getHairTask(db, id, today)` | One task with products and its last 10 logs |
| `saveHairTask(db, input)` | Insert or update. A new task's `lastDoneAt` is the "Last done" field (spec R5: it sets the first due date) |
| `quickSetup(db, { frequency, lastWash, trim })` | Spec R5 quick setup: creates the wash task from `quickSetupToTask()` (task 007) with name from i18n ("Wash") and, when `trim` is on, an Other care task "Trim" (`otherKind: 'trim'`, interval 56 days, `intervalUnit: 'weeks'`, `lastDoneAt` = today). One transaction |
| `markHairDone(db, taskId, { day, productIds, note })` | Inserts `hair_log` with `dueDay` = the task's current next due, sets `lastDoneAt = day` (only if `day` is later than the current `lastDoneAt`, so logging an older wash doesn't move the schedule back); returns the new next due date ("Next wash: Friday, 9 Oct") |
| `deleteHairLog(db, logId)` | For day detail edits; recomputes `lastDoneAt` from the remaining logs |
| `deleteHairTask(db, id)` / `setHairTaskActive` | |
| `hairDueToday(db, today)` | Tasks due today or overdue, for Today's "Hair due" rows |
| `hairMonth(db, monthDays, today)` | `hairMonthMarks()` input for the C1 Hair view |
| `hairLogsOnDay(db, day)` | For C2 day detail |
| `hairStreakInput(db, today)` | For `hairStreak()` |
| `hairTaskCountByProduct(db, productId)` | Extends task 012's P2 "Used in" |

### Validation (`schema.ts`)

Name required (max 40); kind required; products only for washes (Hair or Both products); frequency: `interval` with 1–365 days (weeks unit multiplies by 7), or `days` with at least one weekday; last done ≤ today; reminder time `HH:mm`.

### Query hooks

`useHairTasks()`, `useHairTask(id)`, `useHairDueToday()`, `useHairMonth(month)`, `useHairStreak()`, `useHairLogsOnDay(day)`, mutations `useSaveHairTask`, `useQuickHairSetup`, `useMarkHairDone`, `useDeleteHairLog`, `useDeleteHairTask`. Invalidate `qk.hair.*`, `qk.today(day)` and calendar keys; leave a no-op `onHairTaskChanged(id)` for task 033's reminders.

Out:

- Screens: 032 (setup, editor, list), 033 (done sheet, Today rows, calendar, reminders).

## Acceptance criteria

- [ ] Repository tests: quick setup "every 3 days, last wash yesterday, trim on" creates two tasks with the right next due dates; marking a wash done early moves the next due date from the done day; logging an older wash doesn't move the schedule back; deleting the latest log restores the previous `lastDoneAt`; other care never appears in the streak input as a wash; "twice a week" quick setup gives Monday/Thursday.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
