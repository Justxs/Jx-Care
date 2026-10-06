# 033 Hair done, hair calendar and hair reminders

**Phase:** I. Hair · **Depends on:** 020, 025, 028, 032 · **Spec:** T1 (Hair due, hair streak chip), T3, C1 (Hair view, hair streak card), C2 (hair section), Notifications (Hair task due, Other care due), refinement 6, sequence 6 · **Design:** [screens.md](../design/screens.md) HairDoneSheet, CalendarScreen

## Goal

Marking hair care as done from Today or a notification, seeing washes on the calendar, the hair streak, and reminders on due days.

## Scope

In: `src/features/hair/components/HairDoneSheet.tsx` (rendered by the `/hair/done/[taskId]` modal route from task 010), `components/HairDueRows.tsx`, `src/features/calendar/components/HairMonthView.tsx`, `src/features/hair/reminders.ts`.

### T3 Hair task done (sheet)

- Title = task name; date (`DateField`, today by default, can be moved to earlier days, not the future); product chips pre-selected from the task (tap to unselect, + opens the product picker to add); note (max 280). Button "Mark as done" (`useMarkHairDone`).
- After saving, the button area shows "Next wash: Friday, 9 Oct" (or "Next trim: …") in place of the button, **at the same height**, then the sheet closes after a short pause or on tap.

### Today (fill task 025's slots)

- **Hair due** section: rows for tasks due today or overdue ("Wash: shampoo + conditioner", "Overdue 1 day" in `warning`), tap opens T3. A ticked-off row collapses (200 ms).
- **Hair streak chip** in the header (`hairStreak`, task 007), counting up after a wash.
- Add these queries to `prefetchToday`.

### C1 Hair view (fill task 028's placeholder)

- Same 6-row Monday-first grid; marks from `hairMonthMarks`: wash done (filled `hair`), late wash (filled with a `warning` ring), due (outlined `hair`), overdue (`warning`), other care as small icons (scissors, palette, flask) under the day number. Spoken labels: "9 October, wash due", "5 October, wash done late, trim done".
- Hair `StreakCard` (current and best) above the grid; washes only.

### C2 Day detail (fill task 028's slot)

- Hair tasks done that day (with products and note), and for a day with nothing: "Nothing done · Next wash was due 6 Oct" when a wash was due. Logs within 7 days can be deleted (`useDeleteHairLog`, dialog) to fix mistakes.

### Reminders (planner registered with task 020)

- For each active task with `reminderTime`, when `settings.hairRemindersOn`: one notification on its next due day at that time within 14 days, text "Hair wash day: shampoo + conditioner" (washes) or "Time for a trim (8 weeks)" (other care), category `hair` (Done, Snooze) or `other_care` (Done), channel `hair`, `data.url` `/hair/done/<id>`.
- **Done** action (`opensAppToForeground: false`) marks it done for today in the background with the task's products (`markHairDone`) and re-plans the task. If the background handler can't open the database on a platform, make the action open T3 instead and note it under Decisions.
- **Snooze** uses `settings.snoozeMinutes`.
- Replace task 031's `onHairTaskChanged` no-op with `syncEntity('hair_task', id)`; marking done re-plans that task.

Out:

- Hair setup and editor: 032.

## Acceptance criteria

- [ ] Marking a wash done (today, early or late) logs it, moves the next due date from the done day and updates Today, the calendar and the streak; the sheet shows the next due line at the same height.
- [ ] Hair calendar marks match `hairMonthMarks` for a seeded month; spoken labels include status.
- [ ] Planner tests: one reminder per task on its due day within the window; master switch off → none; text per kind; Done marks the task done (fake adapter test).
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
