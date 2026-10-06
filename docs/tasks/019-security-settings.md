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

- [ ] Changing the PIN requires the old one, counts wrong tries toward the lockout and works with the new PIN on the next lock.
- [ ] Changing the recovery question requires the PIN; the new answer works in Forgot PIN.
- [ ] Biometrics switch is hidden without hardware, and needs a successful prompt to turn on.
- [ ] Auto-lock choice is saved and used.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` passes.

## Decisions

(Write any choices you make here.)
