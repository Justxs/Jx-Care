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

- **Files.** `src/features/hair/`: `components/HairDoneSheet.tsx` (rendered by `screens/HairDoneScreen.tsx`, the `/hair/done/[taskId]` route), `components/HairDueRows.tsx`, `components/HairDaySection.tsx` (C2), `reminders.ts` (planner, Done action, permission ask) with `reminders.test.ts`; `src/features/calendar/components/HairMonthView.tsx`. New reads in `repo.ts` (`washDueOn`, `hasWashTask`, `listReminderTasks`, `hasHairLogOn`) and a pure `dueDayAsOf` in `src/lib/hair.ts`. No schema change.
- **T3 sheet.** Title is the task name. The task is kept as it was when the sheet opened, so refetches after saving never reset the form. Date is a `DateField` (today by default, no later than today). Washes show the task's products as chips, all selected; tapping one unselects it and it stays in place; the "Add a product" chip opens task 032's `HairProductPickerSheet` (swap for the shared picker with 032). Other care has no products. Note uses `hairDoneSchema` (280 max, error in the reserved line). Mark as done → `useMarkHairDone`; a second log for the same task and day replaces the first (task 031).
- **After saving.** The footer keeps a 52 pt box: the button is replaced by a tappable `hair-soft` line "Next wash: Saturday, 10 Oct" ("Next trim / colour / hair mask: …", plain other care "Next due: …"), announced to screen readers. The sheet closes after 1.8 s or on tap; with a screen reader on it stays until tapped (like toasts). No toast.
- **Nested sheets.** The route is a `transparentModal`, so the sheet wraps itself in its own `BottomSheetModalProvider`; otherwise the product picker and the iOS date picker would open under the modal screen.
- **Today.** `useHairDueSlot` renders `HairDueRows` from `useHairDueToday` (task 031): a "Hair care" card, most overdue first, each row with the kind icon, "Wash: Shampoo + Conditioner" (product names joined with " + ", the name alone without products) and "Due today" or "Overdue 1 day" in `warning`; tap opens `/hair/done/<id>`. A row that leaves fades while the others glide (`rowExiting` / `rowLayout`); when the last one goes the whole section leaves with Today's section motion.
- **Hair streak chip.** Washes only (`hairStreak`, task 007), from `hairStreakChipQuery`: null while no active wash task exists. Like the skin chip it waits for the first routine (T1: no streak chips until a routine exists). `TodayHeader` now counts the hair chip up with `useCountUp`, as it does for skin. `prefetchToday` also runs `prefetchHair` (due rows and the chip).
- **C1 Hair view.** `HairMonthView` on `MonthGrid`, from `useHairMonth` (`hairMonthMarks`). One 12 pt wash mark per day, by shape as well as colour: done = filled `hair` dot; late = the same dot in a `warning` ring; due = `hair` ring; overdue (the missed due day) = dashed `warning` ring. A log wins over a due day and late wins over on time. Other care done that day adds 12 pt `hair` icons beside it (scissors, palette, flask; at most two fit a 360 pt cell); plain "other" care, which has no glyph, a 6 pt dot. Spoken labels list every flag: "4 October, wash done late, trim done", "7 October, today, wash due". The hair `StreakCard` (current and best, `restarted` like skin) sits above the grid and is hidden while no active wash task exists; with no hair task at all the grid shows no marks and "Hair care is not set up" under it. `CalendarScreen` switches to it for the Hair segment; Condition keeps its placeholder.
- **C2 hair section.** `HairDaySection` under the skin routines: each log with its kind icon, task name, products, note and, for a late wash, "Done late, was due 3 Oct" in `warning`. Logs from today and the six days before (`canEditDay`, task 028) have a delete button (44 pt, "Delete Wash from this day") with an AlertDialog; `useDeleteHairLog` puts the schedule back (task 031). A day with no logs says "Nothing done · Next wash was due 3 Oct" when a wash had come due by then (`washDueOn`: the due day answered by the first later log, or the current next due; today reads "Nothing done yet · Next wash is due …"), otherwise "No hair care logged this day." Future days with nothing logged and apps with no hair task show no section.
- **Reminders planner** (`registerPlanner('hair', …)`, imported by `src/notifications/tasks.ts` for headless starts). While `settings.hairRemindersOn`: for every active task with a `reminderTime`, one notification at that time on its next due day (`momentOf`, so a time before 04:00 falls on the next calendar date); the scheduler keeps the 14-day window. A due day already past (overdue) or a time already gone today gets none, so an overdue task never nags daily; it waits on Today. Key `hair_task:<id>:hair:<due day>`, title the task name, body "Hair wash day: Shampoo + Conditioner" ("Hair wash day" without products) or "Time for a trim (8 weeks)" ("Time to colour your hair", "Time for a hair mask", "Time for <name>"; the interval in weeks or days, nothing for set days), in the app language. Category `hair` (Done, Snooze) for washes and `other_care` (Done) for other care, channel `hair`, `data.url` `/hair/done/<id>`.
- **Done action** (both categories, `opensAppToForeground: false`): marks the task done for the current app day with its products (the task's products that still exist) and no note, cancels any snoozed copy, re-plans the task with `syncEntity` and invalidates the app's hair, Today and calendar queries. A task already logged that day keeps its log and note. The headless start (task 020's `ensureReady`) opens the database itself, so no fallback to opening T3 was needed. Snooze is task 020's handler with `settings.snoozeMinutes`.
- **Re-planning.** `onHairTaskChanged(id)` is now `syncEntity('hair_task', id)` (fire and forget; the next full sync catches a failure), so saving, quick setup, pausing, deleting, marking done and deleting a log all re-plan; marking done from the sheet also cancels a snoozed copy.
- **Permission ask.** Task 021's `askForReminders` was being built at the same time, so `reminders.ts` has a small `askForHairReminders()` that calls `src/notifications/permission.ts` directly: only while permission is undetermined, `requestPermission()`, then `sync()` when granted. The editor's Reminder switch calls it when turned on. Point it at 021's helper on merge.
- **Strings** are under `hair.done`, `hair.today`, `hair.calendar`, `hair.day` and `hair.reminder`, with LT plurals for weeks and days.
- **Tests.** `src/lib/hair.test.ts` (`dueDayAsOf`), `repo.test.ts` (new reads), `reminders.test.ts` (planner on the fake OS: one per task on its due day, today only before the time, overdue / no time / paused / past the window skipped, master switch off, text per kind and in LT, moves after an early wash; Done in the background logs today with the products and plans the next one; other care Done keeps today's log; Snooze then Done; the permission ask), `screens/__tests__/hairDone.test.tsx` (T3 sheet and Today's rows and chip), `calendar/screens/__tests__/hairCalendar.test.tsx` (marks match `hairMonth` for a seeded month, spoken labels, streak card, C2 section and delete), `today/prefetch.test.tsx` (hair queries cached). Moving the date in the sheet is not driven in Jest (the native picker has no test handle); `markHairDone` with earlier days is covered by task 031's repository tests.

### Check on a real device

- T3 from Today and from a reminder tap: the sheet slides up over the tab; the product picker and (iOS) the date picker open above it; after Mark as done the "Next wash" line replaces the button with no height change, then the sheet closes after about 2 s or on tap. With VoiceOver/TalkBack the line is read and the sheet stays until tapped.
- Today: the Hair care rows, "Overdue 1 day" in amber, a row fading out after Mark as done with the rows below gliding up, the section leaving when the last row goes, and the hair chip counting up after an on-time wash.
- Calendar Hair view in light and dark: the filled, ringed, ringed-late and dashed overdue marks are readable at 12 pt (also on the selected `accent-soft` day), the 12 pt scissors / palette / flask icons fit next to the mark at 360 pt, and the streak card.
- C2: the hair section, its delete dialog, and the "Nothing done · Next wash was due …" line in Lithuanian.
- Hair reminders: one notification on the due day at the chosen time; Done (Android with the app closed, in the background and open) logs the wash without opening the app, dismisses it, and the next reminder is scheduled; Snooze comes back after the snooze length; other care shows only Done. On iOS check that Done reaches JS when the app was killed (task 020 note).
- Turning a hair reminder on the first time shows the system permission prompt once.
- Light, dark, 360 pt and a native Lithuanian read of the new `hair.*` strings ("Laikas kirptis (8 savaitės)", "plaukai išplauti pavėluotai").
