# 019 PIN and security settings

**Phase:** D. Security · **Depends on:** 011, 018 · **Spec:** S6 · **Design:** [screens.md](../design/screens.md) SecurityScreen

## Goal

The PIN and security screen: change PIN, change recovery question, biometrics switch and auto-lock time.

## Scope

In: `src/features/security/screens/SecurityScreen.tsx` and small flows it pushes.

- Rows in a flush card:
  - **Change PIN:** pushes a three-step flow (old PIN, new PIN, confirm) using `PinPad`; `changePin` (task 016) with the same lockout rules and messages as the lock screen; success shows the toast "PIN changed" and pops back.
  - **Recovery question:** asks for the PIN first, then the O4 form (preset or own question, answer ≥ 3 characters); `changeRecovery`; toast "Recovery question changed".
  - **Unlock with Face ID / fingerprint:** `Switch` shown only when `biometricsAvailable()`; turning it on runs one `authenticate()` first; saves `settings.biometricsOn`.
  - **Auto-lock:** `SelectField` with Immediately / 1 min / 5 min → `settings.autoLockSeconds` 0 / 60 / 300; takes effect from the next background (task 018 reads it).
- All changes apply immediately (no Save button).

Out:

- Reset app: task 040 (Settings, Data). Lock behaviour: 018.

## Acceptance criteria

- [x] Changing the PIN requires the old one, counts wrong tries toward the lockout and works with the new PIN on the next lock.
- [x] Changing the recovery question requires the PIN; the new answer works in Forgot PIN.
- [x] Biometrics switch is hidden without hardware, and needs a successful prompt to turn on.
- [x] Auto-lock choice is saved and used.
- [ ] Light, dark, 360 pt and Lithuanian checked; `pnpm check` passes.

## Decisions

- **Files.** `screens/SecurityScreen.tsx` (S6, route `app/(tabs)/settings/security.tsx`), `screens/ChangePinScreen.tsx` and `screens/ChangeRecoveryScreen.tsx`, and `components/CurrentPinStep.tsx` (the "enter your current PIN" PinPad step both flows start with). Strings are under `security.settings.*`, `security.changePin.*` and `security.recovery.*`. The flows reuse `lock.wrongPin`, `lock.newPin.*` and the O4 form labels under `onboarding.*`.
- **Routes.** The two flows are root stack screens, `app/security/change-pin.tsx` and `app/security/recovery.tsx` (`/security/change-pin`, `/security/recovery`), pushed with the normal stack animation. They sit outside the Settings tab stack so the tab bar is not shown under the PinPad: with the header and the tab bar, the 4-row keypad would not fit on a small phone. No `Stack.Screen` entry was needed in the root layout. `routes.test.ts` lists both paths.
- **Change PIN.** Step 1 checks the current PIN with `verifyPin` at once, so a wrong PIN shakes and says "Wrong PIN. Try again." straight away and counts toward the same lockout as L1 (5th: 30 s, 10th: 5 min, keypad off with the countdown, read from the stored `lockedUntil` on arrival). Step 2 uses `validateNewPin` with the O2 messages (the new PIN may equal the old one; no extra rules). Step 3 mismatch shakes, says "PINs don't match" and returns to step 2 after `MISMATCH_BACK_MS`, as in L2. A match calls `changePin(old, new)`, which re-checks the old PIN under the lockout; on success the toast "PIN changed" shows and the screen pops. If that re-check fails (not expected), the flow restarts at step 1. Header Back, Android back and the swipe step back one step (confirm → new → current PIN) and only leave from the first step. The PINs are kept in memory only while the screen is open.
- **Recovery question.** The PIN comes first (same `CurrentPinStep` and lockout), then the O4 form (`recoverySchema`, `questionOptions`, `toRecoveryQuestion` from `onboarding/schema.ts`) with the saved question already picked (or "Write my own" with its text) and an empty answer. Save (the one filled button, in the bottom bar) calls `changeRecovery(pin, question, answer)`, shows "Recovery question changed" and pops. Leaving with edits asks "Discard changes?" (header Back, Android back and the swipe), as other forms do.
- **Biometrics switch.** `biometricsAvailable()` is asked each time the screen opens. The row sits in a `Collapsible`, so when it turns out to be available it animates open instead of pushing the auto-lock field down. Its label follows the kind: "Unlock with Face ID", "Unlock with fingerprint" or "Unlock with iris scan". Turning it on runs one `authenticate()` (cancel button "Cancel"); a cancel or failure leaves it off and the row's detail line says "Not turned on. Try again." Turning it off needs no prompt. When the phone loses biometrics (nothing enrolled) the row is hidden and a saved `biometricsOn` is left as it is; L1's key then just fails and the PIN works.
- **Auto-lock.** A `SelectField` (menu) labelled "Lock after" with Immediately / 1 min / 5 min, saved through `useUpdateSettings` to `autoLockSeconds` 0 / 60 / 300. That also updates the cached settings, which `LockGate` reads the next time the app goes to the background, so it applies from then on.
- **Rows.** One flush card: Change PIN and Recovery question with icons (`key-round`, `shield`), the biometrics row (`scan-face` or `fingerprint`), then the auto-lock field with a plain separator.

Check on a real device:

- Change PIN with the right and a wrong current PIN; 5 wrong tries show "Try again in 30 s" here and on the lock screen. Lock the app after a change: only the new PIN unlocks.
- Change the recovery question, then use Forgot PIN on the lock screen with the new answer.
- Face ID (iOS) and fingerprint (Android): the switch shows only with something enrolled; cancelling the prompt leaves it off; after turning it on, the lock screen prompts on arrival.
- Auto-lock Immediately, 1 min and 5 min take effect from the next time the app goes to the background.
- Light and dark, Lithuanian at 360 pt: the security card, the PinPad steps (no tab bar, keypad fits) and the recovery form with the keyboard open (Save rides above it).
- Android back and the iOS swipe in the Change PIN flow step back one step.
