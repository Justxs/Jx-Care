# 018 Lock screen and forgot PIN

**Phase:** D. Security · **Depends on:** 017 · **Spec:** L1, L2, refinement 7, Global UI rules (Privacy: app switcher blur), sequence 2, Motion (paint Today complete) · **Design:** [screens.md](../design/screens.md) LockScreen, ForgotPinScreen; [components.md](../design/components.md) AlertDialog (reset copy)

## Goal

The app is locked on every open and after time away, unlocks with the PIN or biometrics straight back to where the person was, hides its content in the app switcher, and lets someone who forgot the PIN reset it with the recovery answer or, as a last resort, reset the app.

## Scope

In: `npx expo install expo-blur`. Files: `src/features/security/screens/LockScreen.tsx`, `ForgotPinScreen.tsx`, `src/features/security/lock.ts`, `src/features/security/resetApp.ts`, `components/PrivacyOverlay.tsx`.

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

- Push from the lock screen. Shows the saved question (preset questions translated), answer field, Continue.
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
- [ ] Forgot PIN with the right answer sets a new PIN; reset deletes everything (test that `resetApp` calls every cleanup with fakes) and lands on O1; the dialog shows real counts.
- [ ] A notification tapped while locked opens its screen right after unlock.
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

(Write any choices you make here.)
