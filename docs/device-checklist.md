# Device checklist

What the cloud build could not check: everything here needs a real phone. Install a `preview` build (see the root [README](../README.md)), then walk the sections in order. Each task file's Decisions section has the detailed checks for its screens; the list at the end points to them.

## 1. End to end (task 041 acceptance)

1. Fresh install: Welcome in the phone's language, switch EN/LT, create a PIN, confirm it, set the recovery question, turn biometrics on or skip.
2. Add a product with an opened date: the reminder ask appears; Allow shows the system prompt.
3. Build a routine from a template, swap in the product, set a reminder time.
4. Today: start the routine in the player, tick every step (the wait bar floats, nothing jumps), see the done screen with the streak counting up.
5. Set up hair care, mark a wash done from Today; the hair streak and next wash update.
6. Take a weekly progress photo (camera permission text in the phone's language), review and save it; it shows in Calendar → Progress photos and not in the phone's gallery.
7. Settings → Backup: export a zip, Reset app, import the zip. Products, routines, photos and the language come back, Today shows "Backup restored".

## 2. Whole app passes

- **Lithuanian at 360 × 800 and the largest system font:** every screen; text wraps instead of truncating, nothing overlaps, tab labels fit.
- **Light and dark:** every screen; no white flash between screens in dark mode.
- **Reduce Motion on:** slides and scales become short fades (sheets, toasts, the player), counters show the final number at once.
- **VoiceOver (iOS) and TalkBack (Android):** every control reads a role, a name and its state; icon-only buttons have names; calendar days read their status; the Today setup card's buttons are reachable and its title offers Hide as an action; rows read as one checkbox in the player and the shopping list.
- **Layout shift:** lists load without a jump, Today paints complete after unlock, form errors appear in their reserved line.
- **Privacy:** the app switcher shows the blurred logo on both platforms; the lock comes back after the auto-lock time; the share sheet, document picker, camera and notification prompts don't lock the app on return.
- **Performance (release build, mid-range Android):** Today, Products with 200 products and Calendar show their first frame quickly (target under 300 ms); ticking a step responds at once.

## 3. Notifications

- With 30+ products, several routines and hair tasks: pending notifications stay at 60 or fewer and top up when the app opens.
- Each notification opens its screen, after the PIN when locked (cold start and from the background).
- Actions with the app closed, in the background and open: Snooze, Buy again, Mark finished, Done and Skip this week. On iOS, check that actions which don't open the app still run when the app was killed.
- Channel names and button titles follow the language; the status bar icon is the white frog.
- The daily background sync runs; after a reboot (Android) notifications are still pending.

## 4. Per task

The detailed device notes live in each task's Decisions section:

- UI kit and shell: [008](tasks/008-base-components.md), [009](tasks/009-forms-overlays-feedback.md), [010](tasks/010-app-shell-navigation.md), [011](tasks/011-settings-preferences.md)
- Products: [013](tasks/013-products-list.md), [014](tasks/014-product-form-ingredients.md), [015](tasks/015-product-detail-archive.md)
- Security and onboarding: [016](tasks/016-pin-secure-storage.md), [017](tasks/017-onboarding.md), [018](tasks/018-lock-forgot-pin.md), [019](tasks/019-security-settings.md)
- Notifications: [020](tasks/020-notification-service.md), [021](tasks/021-expiry-reminders.md), [027](tasks/027-routine-reminders.md)
- Routines and Today: [022](tasks/022-routines-data.md), [023](tasks/023-routines-list-templates.md), [024](tasks/024-routine-editor.md), [025](tasks/025-today.md), [026](tasks/026-routine-player.md), [028](tasks/028-skin-calendar-day-detail.md)
- Ingredients and conflicts: [029](tasks/029-ingredients-conflict-rules.md), [030](tasks/030-conflict-warnings-avoid-list.md)
- Hair: [031](tasks/031-hair-data.md), [032](tasks/032-hair-setup-editor.md), [033](tasks/033-hair-done-calendar-reminders.md)
- Shopping, progress, condition, notes: [034](tasks/034-shopping-list.md), [035](tasks/035-progress-data-storage.md), [036](tasks/036-progress-camera-review.md), [037](tasks/037-progress-timeline-compare.md), [038](tasks/038-condition-log.md), [039](tasks/039-product-notes-rating.md)
- Backup: [040](tasks/040-backup-restore.md)

Every component and screen can also be checked in isolation in the on-device Storybook ([storybook.md](storybook.md)), in light/dark and EN/LT.
