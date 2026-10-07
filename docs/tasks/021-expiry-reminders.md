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

- [x] Planner tests: warning and expiry-day items with the right days and times; nothing for `nodate`, archived or reminders-off products; the warning window setting changes the day; digest text and skip-when-zero.
- [x] Saving the first product with an expiry shows the ask once; Not now never shows it again; Allow with permission granted schedules reminders (test the flow logic with a fake permission adapter).
- [x] Reminders screen saves every setting; with permission denied it shows the card and "Paused"/"Off" texts instead of switches, without the list jumping when permission returns.
- [x] `npm run check` passes.

## Decisions

- **Files:** planners and the two action buttons in `src/features/products/reminders.ts` (registered by one import line in `src/notifications/tasks.ts`); the ask logic in `src/notifications/askPermission.ts`; the sheet and its host in `src/features/products/components/ReminderAskSheet.tsx`; S5 in `src/features/settings/screens/RemindersScreen.tsx` (the task 010 placeholder in `src/features/notifications/` is gone, the route points here).
- **Notification text** is the title (the spec's example sentence, "Vitamin C serum expires in 30 days"); the body is empty. The warning's day count is the real distance from the warning day to the effective expiry, which is always the warning window. Days already past are skipped, so a product saved 10 days before it expires gets only the expiry-day reminder.
- **Weekly digest:** every Monday at 09:00 inside the 14-day window (so two are pending), with the counts of active products that are expiring, expired and not opened at planning time, using the same status rules as P1 (an unopened product inside the warning window counts as expiring). Parts that are 0 are left out ("2 expiring soon, 3 unopened"); all 0 plans nothing. No category, so no buttons. The digest's link `/products?filter=expiring` is handled in the Products route (`app/(tabs)/products/index.tsx`): it sets the filter to expired + expiring on My products, once (`showExpiringProducts` in `listState.ts`), then clears the param.
- **Action buttons:** Expiry day "Mark finished" archives the product with today's app day (skipped if it is already finished), refreshes products, Today and shopping, and re-syncs that product. Expiry warning "Buy again" calls `addToShoppingList` (task 034). Both run without opening the app.
- **`askForReminders({ reason, productName? })`** (exported from `@/notifications`) is the one ask for every feature; it resolves `'granted' | 'denied' | 'notNow'`. Reasons: `expiry` (always shows the sheet, even with permission already granted, because expiry reminders start off; either answer sets `reminderAskDone`, Allow + granted sets `expiryRemindersOn` and syncs), `routine` / `hair` / `weeklyPhoto` (tasks 027, 033, 036: granted returns at once, denied shows the "Notifications are off in phone settings" toast with Open settings, undetermined shows the sheet worded for that reason, then the system prompt on Allow and a sync), `settings` (the Reminders screen: undetermined goes straight to the system prompt, since the screen already explains itself). Those other reasons never touch `reminderAskDone`; it only stops the product-save ask. One ask shows at a time; a second one while it is open resolves `'notNow'`.
- **The sheet** is mounted once in `app/_layout.tsx` (`ReminderAskHost`), driven by `reminderAskStore`, so it opens over whatever screen the product form returns to (or over the form after Save and add another). Closing it any other way (Close in the header, backdrop, drag) counts as Not now. The example notification is a small mock-up with the logo, "Jx-Care", "now" and the real text; the line under the title uses the saved warning window and time, and leaves out "and on the day" when the expiry-day reminder is off.
- **Permission adapter:** `setPermissionAdapter({ get, request })` swaps the phone's permission for a fake in tests; the default uses `getPermission` / `requestPermission` from task 020.
- **Reminders screen layout:** Expiry card (Expiry warning switch; under it, opening with `Collapsible`: Days before 7 / 14 / 30 / 60 as a radio list, Time with a hint that it is shared, and the Expiry day switch, since expiry reminders off turns both off in the planner), Routines and hair care card (two master switches, "Set in each routine" / "Set in each task"), Every week card (Weekly photo with day and time under it, Weekly digest "Mondays at 09:00"), Snooze length radio list. The radio lists inside a card drop their own surface so there is no card in a card. Switching expiry reminders on here also sets `reminderAskDone`. Every change saves at once and calls `sync()` (the settings watcher from task 020 also syncs; the second run changes nothing).
- **Permission off:** the amber card (copy from `notifications.permissionOff.*`) and every switch shown as "Paused" / "Off" text in a row of the same height. Once the card has shown, its space stays for the rest of the visit: when permission comes back it fades out (200 ms, or the reduced-motion fade) and is hidden from screen readers, so nothing below moves. Sub-row choices (days, times) stay editable while paused, as the card says the choices are kept.
- **Device checks needed:**
  - Save the first product with an expiry date: the sheet opens over Products (and over the form after Save and add another); Allow shows the system prompt; granted schedules the reminders (check pending notifications), denied shows the toast and Open settings opens the app's page in phone settings.
  - Expiry warning and expiry day notifications arrive at the set time with the right text in both languages; Buy again adds to the shopping list and Mark finished archives the product with the app closed (Android) and in the background.
  - The Monday digest arrives at 09:00 and opens Products filtered to expiring and expired.
  - Reminders screen in light and dark, in Lithuanian at 360 pt wide (long labels wrap); the collapsible sub-rows open and close smoothly; the time pickers on both platforms.
  - Turn notifications off in phone settings and return: the card and Paused/Off appear; turn them on and return: switches come back and the list doesn't jump.
- **Routine editor's Reminder switch** (`onRoutineReminderSwitchedOn()` from task 024) is wired to `askForReminders({ reason: 'routine' })` with task 027.
