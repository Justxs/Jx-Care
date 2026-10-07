# 018 Lock screen and forgot PIN

**Phase:** D. Security · **Depends on:** 017 · **Spec:** L1, L2, refinement 7, Global UI rules (Privacy: app switcher blur), sequence 2, Motion (paint Today complete) · **Design:** [screens.md](../design/screens.md) LockScreen, ForgotPinScreen; [components.md](../design/components.md) AlertDialog (reset copy)

## Goal

The app is locked on every open and after time away, unlocks with the PIN or biometrics straight back to where the person was, hides its content in the app switcher, and lets someone who forgot the PIN reset it with the recovery answer or, as a last resort, reset the app.

## Scope

In: `pnpm expo install expo-blur`. Files: `src/features/security/screens/LockScreen.tsx`, `ForgotPinScreen.tsx`, `src/features/security/lock.ts`, `src/features/security/resetApp.ts`, `components/PrivacyOverlay.tsx`.

### Locking (`lock.ts`)

- Locked at launch (after onboarding has ever completed).
- `AppState` listener: on `background`, store `lastBackgroundAt`; on `active`, lock if `now - lastBackgroundAt >= settings.autoLockSeconds` (0 / 60 / 300, default 60).
- The lock screen is a full-screen layer **above** the navigation (not a route that replaces it), so unlocking reveals exactly the screen the person left, with its state. Render it in the root layout when `lockStore.locked` is true.
- **PrivacyOverlay:** while the app is `inactive` or `background`, cover everything with a blurred view (`expo-blur`) and the logo, so the app switcher never shows content.
- While locked, call `prefetchToday` (task 005) so Today paints complete on unlock.
- After unlock, if `lockStore.pendingUrl` is set (a notification tap, task 020), navigate to it and clear it.

### L1 Lock screen

- Logo, "Enter PIN", four dots, `PinPad` with the biometrics key when `settings.biometricsOn`, "Forgot PIN?" ghost button.
- Biometrics prompt opens automatically **once** on arrival (not again after a failed or cancelled prompt until the key is tapped).
- `verifyPin` (task 016): wrong → dots shake (300 ms) + haptic; locked out → keypad disabled and "Try again in 30 s" counting down in the reserved hint line (`tabular-nums`), then 5 min after the 10th wrong try. The countdown keeps running correctly if the app is backgrounded (compute from `lockedUntil`).
- Unlock fades the lock layer out (200 ms; 100 ms fade with Reduce Motion).

### L2 Forgot PIN

- Push from the lock screen. Shows the saved question (preset questions translated), answer field, Continue. The answer field is a `secret` `Input` (task 009): hidden as typed, with the same eye button as O4 ("Show answer" / "Hide answer").
- Correct (`verifyRecoveryAnswer`): Create new PIN and Confirm (reuse the O2/O3 PinPad screens), then unlocked on Today.
- 5 wrong answers: "Try again in 15 min" countdown, field disabled.
- Bottom link "Reset app and delete all data" opens the reset dialog below.

### Reset app (`resetApp.ts` + dialog)

- The dialog names what is lost with **real counts** and never suggests exporting from here (the person is locked out): "This deletes 84 products, 6 routines and 52 progress photos. Progress photos are not in your gallery, so they are lost too. Your last backup is from 1 Sep; you can restore it after the reset." (omit the backup sentence when there was never a backup). The action needs typing RESET (`AlertDialog confirmText`, task 009).
- `resetApp()`: cancels all notifications (task 020), deletes the database file and re-runs migrations (or drops all rows in one transaction; note which), deletes `products/` and `progress/` folders, `resetAll()` secure keys (task 016), clears the query cache and stores, and navigates to O1.
- Export a `ResetDialog` component with a `fromSettings` prop for task 040: from Settings the same text plus an "Export backup" button above Reset app, and the PIN is asked first.

Out:

- Security settings (auto-lock choice, change PIN): 019. Settings entry to Reset app: 040 wires `ResetDialog` with `fromSettings`.

## Acceptance criteria

- [ ] Cold start shows the lock; unlocking returns to the last screen with its state; returning after more than the auto-lock time locks again, less doesn't (unit test `lock.ts` with fake timers and a mocked `AppState`).
- [ ] The app switcher shows the blurred overlay, never content (manual check on both platforms, note under Decisions).
- [ ] Lockout countdowns show and survive backgrounding; the 5th and 10th wrong PIN and the 5th wrong answer lock for the right time.
- [ ] The Forgot PIN answer is hidden as typed and the eye button shows it.
- [ ] Forgot PIN with the right answer sets a new PIN; reset deletes everything (test that `resetApp` calls every cleanup with fakes) and lands on O1; the dialog shows real counts.
- [ ] A notification tapped while locked opens its screen right after unlock.
- [ ] `pnpm check` and `pnpm expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

- **PrivacyOverlay** is an `expo-blur` `BlurView` (intensity 60, light or dark tint from the theme) with the 96 pt logo. expo-blur was installed by the integrator after this task was built.
- **Files.** `lock.ts` holds the auto-lock listener (`startAutoLock`), `shouldLockOnReturn`, the privacy cover store (`privacyStore`), `unlock()` and `pauseAutoLock` / `withAutoLockPaused`. `repo.ts` holds `resetCounts` and `deleteAllRows`, `resetApp.ts` the reset itself, and `useCountdown.ts` the lockout countdown plus `tryAgainText`. Components are `components/LockGate.tsx` (the layer and its host), `PrivacyOverlay.tsx`, `ResetDialog.tsx`, `PinConfirmDialog.tsx` and `NewPinStep.tsx`; screens are `screens/LockScreen.tsx` (L1) and `screens/ForgotPinScreen.tsx` (L2). Strings are under `lock.*`.
- **The lock is a layer, not a route.** `LockGate` wraps everything in the root layout: the navigation, `ToastHost` and the default `PortalHost`. The layer renders after them, so a toast or a dialog that was open when the app locked stays under the lock and can't be pressed. Content under the layer is hidden from screen readers (`no-hide-descendants`), and the layer is `accessibilityViewIsModal`. The layer shows while `lockStore.locked` is true, the gate has no `pinMissing` and a settings row exists, so it never shows during onboarding. `app/lock.tsx`, `app/forgot-pin.tsx`, their `Stack.Screen` entries, the `src/features/lock/` placeholders and the two paths in `routes.test.ts` are removed. conventions.md still lists `lock.tsx, forgot-pin.tsx` under `app/`. The integrator may want to drop that line.
- **L2 inside the layer.** Forgot PIN slides in from the right over L1 inside the layer (300 ms, ease-out; a 100 ms fade with Reduce Motion) and slides out on Back. L1 stays mounted underneath, so its lockout countdown and its single biometrics prompt carry over. The three steps (answer, Create a new PIN, Enter it again) are local state in `ForgotPinScreen`. Back from Enter it again returns to Create a new PIN; Back from the other two returns to L1. Android back works the same way. On L1, Android back calls `BackHandler.exitApp()` instead of popping the stack behind the lock.
- **New PIN steps.** The new PIN steps use `NewPinStep` and `usePinDigits`, which copy the O2/O3 layout. Onboarding's `PinStep` couldn't be reused: it sits in `OnboardingFrame` (step dots "x of 5"), and `usePinEntry` uses `useFocusEffect`, which needs a navigator screen. The checks and wording match: `validateNewPin` with the same error text, a mismatch shakes, says "PINs don't match" and returns to step one after `MISMATCH_BACK_MS`. Saving calls `setPin`, which also clears the PIN lockout. The app then dismisses pushed screens, navigates to `/` and calls `unlock()`, which also opens a pending notification URL.
- **Auto-lock.** `lastBackgroundAt` is stored on the first `background` event and cleared on `active`. On `active` the app locks when `now - lastBackgroundAt >= autoLockSeconds * 1000`, read from the cached settings with 60 s as the fallback. "Immediately" (0) always locks. `inactive` alone (iOS app switcher, Control Centre, the Face ID prompt) never locks. Nothing locks while onboarding is needed. The same listener updates the lock and the privacy cover in one handler, so React batches them and content never shows between "uncovered" and "locked".
- **Pausing auto-lock for phone screens.** With "Immediately", a trip to the camera or photo picker (Android puts the app in the background) would lock the app on return. `withAutoLockPaused(task)` raises the bar to 5 min while such a screen is open. It wraps the camera permission request and the picker in `products/photo.ts`. The notification permission ask (020/021) and the progress camera permission (036) were not wrapped, so they can still lock with "Immediately" on Android. 041 can wrap them the same way.
- **Biometrics.** The prompt opens once when the lock arrives, after the stored lockout has been read and settings are loaded, and never during a lockout. After a cancel or failure only the key opens it again. The key shows when `settings.biometricsOn`. During a PIN lockout the whole keypad is off, the biometrics key included (spec: "PinPad disabled").
- **Wrong PIN.** A wrong PIN shakes the dots with a haptic (PinPad's `shake()`), clears them and shows "Wrong PIN. Try again." in the reserved hint line until the next digit, so screen reader users hear it too. The 5th and 10th failures replace that with "Try again in 30 s" and "Try again in 5:00". Under a minute the countdown reads "N s"; from a minute up it reads m:ss (`formatCountdown`), in tabular figures. Each tick computes the time left from the stored `lockedUntil` (new `lockoutUntil` / `recoveryLockoutUntil` on the PIN service, in ms) and re-reads it when the app becomes active, so time in the background or a restart counts. `PinPad`'s message line and `Field`'s error line gained `tabular-nums`.
- **Forgot PIN form.** It is a single field checked by the secure store, so it uses plain state rather than TanStack Form. The answer is a `secret` `Input` with the O4 helper text. A wrong answer shows "That answer doesn't match. Check it and try again." in the helper line. The 5th wrong answer shows "Try again in 15:00", turns the field off (`editable={false}`) and disables Continue. The reset link stays available. If no question is saved (not expected), the screen says so and offers only the reset.
- **Reset dialog.** `ResetDialog` counts every product (archived too), routine and progress photo row each time it opens. The text follows the spec. The gallery sentence is left out when there are no photos. When there was never a backup, the backup sentence is replaced by "This can't be undone." (spec: destructive actions say whether they can be undone). The backup date is `formatDate(appDay(lastBackupAt))`. The action needs `RESET` typed (the same word in LT). For 040, `fromSettings` first shows `PinConfirmDialog` (a numeric password field checked on the 4th digit under the L1 lockout), then the same dialog with `onExport` as an "Export backup" secondary button above Reset app. `AlertDialog` gained `secondaryAction` and `portalHost` props for this. The lock layer renders its dialogs into its own `PortalHost name="lock"`.
- **resetApp.** It drops all rows in one transaction (`PRAGMA defer_foreign_keys = ON`, then `DELETE` on every table in the schema) rather than deleting the database file: the expo-sqlite connection is opened at module load, and the drizzle migrations table stays, so nothing needs migrating again. The order is: cancel notifications (best effort), drop the rows (if this throws, nothing else runs and the error goes to the dialog, which shows "Couldn't reset. Try again." inline on L2 and as a toast elsewhere), delete `products/` and `progress/`, run `resetAll()` on the secure keys, clear the query cache, the onboarding draft and the toasts, open O1 (`dismissAll` + `replace('/welcome')`) while the lock still covers the app, then unlock the store and mark onboarding as needed (new `markNeedsOnboarding()` in `onboarding/gate.ts`). Every step can be injected, and `resetApp.test.ts` checks each is called and in which order.
- **Today prefetch.** While the layer is shown it calls `prefetchToday(queryClient, activeDay)` again for the current app day (a no-op when the cache is fresh), so Today paints complete after a re-lock on a new day.
- **Locking clears what was open.** Locking dismisses the keyboard, every bottom sheet (`useBottomSheetModal().dismissAll()`, because gorhom sheets render above the layer) and the toasts. The product `PhotoViewer` is a native `Modal`, which draws above any view, so it now closes itself when `lockStore.locked` turns true.

Check on a real device:

- The app switcher on iOS and Android shows the logo cover, never content. On Android the recents thumbnail may be taken before JS renders the cover. If content shows there, the fix is `FLAG_SECURE` (expo-screen-capture), which also blocks screenshots. Check the blur on both platforms.
- Face ID (iOS) and fingerprint (Android) prompt once on arrival. A cancel doesn't re-prompt, and the key does. The cover appearing behind the Face ID prompt (the app goes `inactive`) looks acceptable.
- Leave the app for 59 s and for 61 s with the default, and try Immediately and 5 min (once 019 adds the setting): the app re-locks only past the limit and reveals the same screen with its scroll position and form input.
- Lockout countdowns: wait out 30 s and 5 min with the app in the background and after killing it.
- Unlock fade (200 ms; 100 ms with Reduce Motion) and the L2 slide (300 ms). Check light and dark, Lithuanian at 360 pt wide (the lock screen fits with logo, title, keypad and Forgot PIN).
- Android back on L1 leaves the app; on L2 it returns to L1.
- Tap a notification while locked, from a cold start and from the background: the lock shows, and the target screen opens right after the PIN (or after biometrics).
- Reset app from Forgot PIN: notifications are gone from the phone's pending list, the `products/` and `progress/` folders are deleted, and onboarding starts at O1 with the phone language.
- With Immediately, take a product photo with the camera: the app doesn't lock on return.
