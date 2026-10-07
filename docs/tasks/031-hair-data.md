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

- [x] Repository tests: quick setup "every 3 days, last wash yesterday, trim on" creates two tasks with the right next due dates; marking a wash done early moves the next due date from the done day; logging an older wash doesn't move the schedule back; deleting the latest log restores the previous `lastDoneAt`; other care never appears in the streak input as a wash; "twice a week" quick setup gives Monday/Thursday.
- [x] `npm run check` passes.

## Decisions

- **Files:** `src/features/hair/repo.ts`, `api.ts`, `schema.ts` with `repo.test.ts`, `api.test.tsx`, `schema.test.ts`. Types (`HairTaskRow`, `HairTaskGroups`, `HairTaskDetail`, `HairLogRow`, `HairDayLog`, `HairStreakInput`, `HairProductRef`) are exported from `repo.ts`. No schema change.
- **Signatures that needed more than the table:** `saveHairTask(db, input, id?)` (no `id` inserts); `quickSetup(db, { frequency, lastWash, trim }, today, names)` takes `today` for the trim's `lastDoneAt` and the translated names (`useQuickHairSetup` passes `hair.defaultNames.wash` / `.trim`, so the repo stays free of i18n); `markHairDone` returns `{ logId, nextDue }`; `deleteHairLog` returns the task id (or null) so reminders can re-plan it.
- **Same day twice:** a second `markHairDone` for the same task and day updates that log's products and note instead of adding a second log, so the notification Done action plus the sheet can't count a wash twice in the streak.
- **Deleting the latest log:** `lastDoneAt` becomes the latest of the remaining earlier logs and `previousScheduledBefore(task, deletedLog.dueDay)` (new pure helper in `src/lib/hair.ts`), the earliest "last done" that gives the deleted log's due day. That brings back the setup's "Last done" when no log is left (there is no column for it). For interval tasks it is exact; for set days it can be an earlier day with the same next due day (e.g. Tue becomes Mon for a Mon/Thu task). Deleting an older log (not the one that set `lastDoneAt`) never moves the schedule.
- **Logging an older wash:** its `dueDay` is the task's current next due (as the table says), so a back-filled wash counts as on time.
- **Lists:** `listHairTasks` and `hairDueToday` show active tasks only, sorted by next due then name (most overdue first). `getHairTask` returns inactive tasks too. Product references keep the task's order and skip deleted products; archived products are flagged `archived`.
- **Products on save:** the repo keeps only existing Hair or Both products, for washes only; other care always saves `productIds: []`. Other care without an `otherKind` saves as `'other'`.
- **Streak input:** wash tasks (active or not, so history still counts) and only their logs; other care is left out entirely.
- **Month:** `hairMonth` returns a plain `Record<day, HairDayMark>` (from `hairMonthMarks`). `useHairMonth('YYYY-MM')` uses the 42-day grid. Its key sits under `qk.calendar.month('hair', month)` and day logs under `qk.calendar.day(day)`, so calendar invalidation refreshes them; the other hooks key under `qk.hair.all` plus the app day. No changes to `queryKeys.ts`.
- **Extra hooks:** `useHasHairTask` (Today setup row 3, Hair empty state) and `useSetHairTaskActive`. `onHairTaskChanged(id)` is a no-op for task 033.
- **Validation (`schema.ts`):** `hairTaskSchema(today)` works on form values (interval typed as text in days or weeks, `reminderOn` + `reminderTime`) and outputs `HairTaskInput` with `everyNDays` in days; `hairTaskToForm` maps a saved task back. "Last done" is required (it anchors the schedule). Also `hairDoneSchema(today)` for T3 (day not after today, note max 280) and `quickHairSetupSchema(today)`. Error messages are keys under `hair.errors`.
- **Used in:** `hairUsedIn` is registered with `addUsedInSource` when `repo.ts` loads; `app/_layout.tsx` imports the module so it is registered before any product detail opens.

### Check on a real device

- Nothing visual in this task. Once 032/033 use it: quick setup creates both tasks in one go on expo-sqlite (transaction), and marking done, deleting a log and the "Used in" section on product detail behave the same as in the Node tests.
