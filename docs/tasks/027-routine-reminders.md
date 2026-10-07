# 027 Routine reminders

**Phase:** F. Routines and Today · **Depends on:** 020, 024, 026 · **Spec:** Notifications (Routine reminder), refinement 8, S5 (routine master switch, snooze length), sequence 4

## Goal

Each routine with a reminder time sends a notification on its days, skipped when the routine is already done, with Snooze, opening the routine player.

## Scope

In: `src/features/routines/reminders.ts` (planner + action handlers).

- **Planner** (registered with task 020): for each active routine with `reminderTime`, when `settings.routineRemindersOn`, one notification per day it runs within the 14-day window, at that time, text "Evening routine: 5 steps" (time of day or custom name, and the number of steps **due that day**, task 007), category `routine`, channel `routines`, `data.url` `/player/<id>`.
  - Days with nothing due for that routine get no reminder.
  - When two routines share a time of day on a day (A/B), send one reminder for the group, using the remembered choice for that weekday (or the first option), text naming the time of day.
  - Today's reminder is skipped when the group is already complete for today.
- **Completion:** replace task 026's `onRoutineCompleted` no-op: cancel today's pending reminder for that group (`syncEntity('routine', id)`).
- **Snooze** action: schedules a one-off copy after `settings.snoozeMinutes` (5 / 15 / 30) unless the routine gets completed first (the snoozed notification is cancelled on completion too).
- **Edits:** replace task 022's `onRoutineChanged` no-op with `syncEntity('routine', id)`.
- **Permission:** the first time a reminder is switched on in the editor (task 024), `askForReminders` (task 021) runs; this task makes sure a granted permission triggers `sync()`.

Out:

- Hair reminders: 033. Weekly photo: 036.

## Acceptance criteria

- [x] Planner tests: reminders only on run days with due steps; one per A/B group; none when the master switch is off; today's skipped when complete; text counts due steps.
- [x] Completing a routine cancels today's pending and snoozed reminders (test with the fake OS adapter).
- [ ] Tapping the reminder opens the player after unlock (manual check, note under Decisions).
- [x] `npm run check` passes.

## Decisions

- **Files:** everything is in `src/features/routines/reminders.ts` (pure `routineReminders()`, the planner, the snooze handler, and the hooks the routines code calls), registered with one import line in `src/notifications/tasks.ts`. Tests in `reminders.test.ts` with `createFakeOS`.
- **Which reminders:** for each app day from today through today + 14 (the scheduler keeps its 14-day window and 60 cap), the Today groups for that day are built exactly as Today builds them (`todayGroups` + `dayRoutine` + `groupDayRoutines`), so "due that day", A/B picks and completion mean the same thing on Today and in reminders. One reminder per group that is not complete and whose routine has steps due. Inactive routines and routines without a reminder time get none; nothing at all while `settings.routineRemindersOn` is off (S5 master switch; `start.ts` already re-syncs when it changes).
- **A/B:** the reminder is for the group's chosen routine (already started today, else the weekday's remembered pick, else the first by time). Its time is the chosen routine's reminder time; when the chosen one has none, the first option that has one. Step count, body and `/player/<id>` all come from the chosen routine. Picking A or B on Today (`useSetChoice`) re-syncs, because the pick decides what that weekday's reminder names and opens.
- **Text:** title "Evening routine: 5 steps" / "Morning routine: 1 step" / "<custom time of day>: 3 steps" (`routines.reminders.*`, plural, LT "Vakaro rutina: 5 žingsniai"); body is the routine's name so A and B (and two custom routines) can be told apart. Category `routine`, channel `routines`. Key `routine:<chosenId>:routine:<day>`, entity `('routine', chosenId)`.
- **Edits sync everything:** `onRoutineChanged` runs a full `sync()` rather than `syncEntity('routine', id)`. One reminder covers a whole time of day, so changing one routine (its time of day, active switch, deletion, A/B) can move the reminder to another routine's entity, which `syncEntity` on the edited routine would leave behind. `syncEntity` plans every planner anyway, so a full sync costs the same and still only touches what changed.
- **Completion:** `onRoutineCompleted` (task 026) calls `cancelTodaysRoutineReminders(id)`: `syncEntity` plus `cancelSnoozes` for every routine at the same time of day, because finishing either A or B completes the evening and the reminder (or its snoozed copy) may belong to the other option.
- **Snooze:** the scheduler's snooze handler (copy after `settings.snoozeMinutes`, task 020) is wrapped for the `routine` category: if the time of day is already done today, it schedules nothing. A snoozed copy that is pending when the routine is completed is cancelled as above.
- **Permission:** `onRoutineReminderSwitchedOn` calls task 021's `askForReminders({ reason: 'routine' })` (granted already: nothing shown; denied: the "off in phone settings" toast; undetermined: the sheet, then the system prompt on Allow) and runs `sync()` when the outcome is `granted`.
- **Errors:** reminder work runs fire-and-forget on one queue and swallows failures (a missed sync is redone at the next app open, unlock, new app day or daily refresh); without an OS adapter (other screens' tests) it simply does nothing.
- **Changes outside this task's file:** `src/features/routines/api.ts` (the two no-ops now call into `reminders.ts`, plus one line in `useSetChoice`), `src/features/routines/events.ts` (`onRoutineCompleted` body), `src/notifications/tasks.ts` (import line), `src/i18n/en.json` and `lt.json` (`routines.reminders.*`). No schema change.
- **Device checks needed:**
  - Tap a routine reminder while locked (cold start and from the background): PIN first, then the player for that routine on today's app day. Tap while unlocked opens the player at once.
  - Snooze on Android and iOS with the app closed, in the background and open: the copy fires after the snooze length (5 / 15 / 30) with the same text and its own Snooze; snoozing after finishing the routine does nothing.
  - Finishing the routine in the player (or All done on Today) before the reminder time: today's reminder no longer fires, a pending snoozed copy is gone, tomorrow's still fires.
  - An A/B evening: only one reminder fires, for the remembered pick of that weekday; changing the pick on Today changes which routine the reminder names and opens.
  - A reminder time after midnight (for example 00:30) fires on the night after the app day it belongs to.
  - Switching on the first routine reminder shows the reminder ask, and Allow schedules the reminders after the routine is saved; the S5 Routine reminders master switch removes and restores them.
  - Language switch: pending reminder titles change to LT ("Vakaro rutina: 5 žingsniai") at the next sync.
