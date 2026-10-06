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

- [ ] Planner tests: reminders only on run days with due steps; one per A/B group; none when the master switch is off; today's skipped when complete; text counts due steps.
- [ ] Completing a routine cancels today's pending and snoozed reminders (test with the fake OS adapter).
- [ ] Tapping the reminder opens the player after unlock (manual check, note under Decisions).
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
