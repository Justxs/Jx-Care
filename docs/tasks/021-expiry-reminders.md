# 021 Expiry reminders and the Reminders screen

**Phase:** E. Expiry reminders · **Depends on:** 011, 014, 020 · **Spec:** P3 reminder ask, refinement 8, Notifications table (Expiry warning, Expiry day, Weekly digest), S5, sequence 3 · **Design:** [screens.md](../design/screens.md) ReminderAskSheet, RemindersScreen

## Goal

Products get a reminder before they expire and on the day, permission is asked at the moment it makes sense, the weekly digest summarises what's expiring, and the Reminders screen controls all notification settings, showing honestly when the phone has notifications off.

## Scope

In: `src/features/products/reminders.ts` (planners), `src/features/settings/screens/RemindersScreen.tsx`, `src/features/products/components/ReminderAskSheet.tsx`, `src/notifications/askPermission.ts`.

### Planners (registered with task 020)

- **Expiry:** for every active product with an effective expiry (task 006) and status not `nodate`: a warning at `warningDay(p, settings.expiryWarnDays)` at `settings.expiryReminderTime`, text "Vitamin C serum expires in 30 days" (the real day count), category `expiry_warning` (action Buy again, wired by task 034; until then the action opens the product), `data.url` `/products/<id>`; and, when `settings.expiryDayReminderOn`, one on the expiry day: "Vitamin C serum expires today", category `expiry_day` (action Mark finished, which calls task 012's `markFinished` in the background handler). Nothing when `settings.expiryRemindersOn` is false. Days already past are skipped.
- **Weekly digest:** when `settings.weeklyDigestOn`, Monday 09:00: "2 expiring soon, 1 expired, 3 unopened" (counts at the moment of planning; skip when all are 0), opens `/products?filter=expiring`. Note: the counts are planned ahead, so they can be a few days stale; re-planning on every app open and daily background sync keeps them close.
- Replace task 012's `onProductChanged(id)` no-op with `syncEntity('product', id)`.

### Reminder ask (P3)

- `onProductSaved` from task 014: when the saved product is the **first with an expiry date** and `settings.reminderAskDone` is false, open `ReminderAskSheet` over the product: "Get a reminder before it expires?", one line naming the product and when it would fire ("30 days before and on the day"), an example notification preview, Allow reminders (primary) / Not now (ghost).
- Allow → `requestPermission()` (system prompt). Granted → `expiryRemindersOn = true`, then `sync()`. Denied → leave it off and show the toast "Notifications are off in phone settings" with "Open settings". Either way `reminderAskDone = true`.
- Not now → `reminderAskDone = true`; never asked again from here.
- Export `askForReminders({ reason })` so task 027 can ask the same way when the first routine reminder is switched on.

### S5 Reminders screen

- Rows per the S5 table: Expiry warning (switch, then sub-rows: 7 / 14 / 30 / 60 days and time), Expiry day (switch, time shared), Routine reminders (master switch, "Set in each routine"), Hair tasks (master switch), Weekly photo (switch, weekday, time; task 036 uses it), Weekly digest (switch), Snooze length (5 / 15 / 30 min). Sub-rows under a switch open and close with fade + height (`Collapsible`).
- Turning on any reminder while permission is undetermined asks first through `askForReminders`.
- **Permission off** (`usePermission()` = denied): an amber card at the top, "Notifications are off in phone settings" / "Your choices below are kept, but nothing is sent until notifications are on.", with the filled button "Open phone settings" (`Linking.openSettings()`). Every switch is replaced by its saved state as text ("Paused" for ones that are on, "Off" for ones that are off) so nothing looks on when it isn't. The card's space is reserved so the list doesn't jump when permission comes back (re-checked on foreground).
- Every change saves at once and calls `sync()`.

Out:

- Routine, hair, weekly photo and backup planners: 027, 033, 036, 040.

## Acceptance criteria

- [ ] Planner tests: warning and expiry-day items with the right days and times; nothing for `nodate`, archived or reminders-off products; the warning window setting changes the day; digest text and skip-when-zero.
- [ ] Saving the first product with an expiry shows the ask once; Not now never shows it again; Allow with permission granted schedules reminders (test the flow logic with a fake permission adapter).
- [ ] Reminders screen saves every setting; with permission denied it shows the card and "Paused"/"Off" texts instead of switches, without the list jumping when permission returns.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
