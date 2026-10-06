# 017 Onboarding

**Phase:** D. Security · **Depends on:** 010, 016 · **Spec:** O1–O5, sequence 1, Navigation map (first launch) · **Design:** [screens.md](../design/screens.md) WelcomeScreen, CreatePinScreen, ConfirmPinScreen, RecoveryScreen, BiometricsScreen; [components.md](../design/components.md) PinPad, StepDots

## Goal

The five first-launch steps: language, create PIN, confirm PIN, recovery question and biometrics, ending on Today's first-run state. Nothing is saved until the recovery step finishes.

## Scope

In: `src/features/onboarding/screens/*`, `src/features/onboarding/draft.ts` (an in-memory TanStack Store holding language, PIN and question while onboarding runs; cleared on finish or when the app is killed).

- **Layout for all steps:** `space-6` gutter, `StepDots` ("1 of 5" … "5 of 5") in a fixed-height row at the top, Back on every step after the first, logo at 64 pt or more on O1. Steps push.
- **O1 Welcome + language:** logo, "Jx-Care" in `title-l`, the pitch "Track your skin and hair care in one place", two large choices Lietuvių / English pre-selected from the phone language (task 003), the privacy line "Everything stays on this phone. No account needed." (LT "Viskas lieka šiame telefone. Paskyros nereikia."), Continue. Picking a language re-renders all strings in place at once.
- **O2 Create PIN:** "Create a 4-digit PIN", `PinPad`; moves on after the 4th digit. `validateNewPin` (task 016) errors show in the reserved line under the dots ("1234 is too easy to guess. Try another.") and clear the dots.
- **O3 Confirm PIN:** "Enter it again". Mismatch: dots shake (300 ms) with a haptic, "PINs don't match" in the hint line, then back to O2 with empty dots.
- **O4 Recovery question:** `SelectField` with the 5 presets (first pet, mother's maiden name, first school, favourite teacher, birth city) plus "Write my own" (shows a text field for the question); answer field (min 3 characters); helper "You'll need this if you forget your PIN." Continue calls `completeOnboarding` (task 016) and creates the `settings` row with the chosen language and currency EUR (task 005 `saveSettings`). This is the first moment anything is saved.
- **O5 Biometrics:** only when `biometricsAvailable()` says so (otherwise O4 goes straight to Today). Bare icon (`scan-face` or `fingerprint`, no tile), "Unlock with Face ID?" / "Unlock with fingerprint?", Turn on (runs one `authenticate()` to confirm, then sets `settings.biometricsOn`) / Not now. Either lands on Today with the stack replaced (no Back into onboarding).
- **Gate:** update `app/index.tsx` from task 010: no PIN set (`isPinSet()` false) → onboarding; a settings row without a PIN (killed mid-way after an old reset) → onboarding.
- Quitting mid-way and reopening restarts at O1 (nothing saved, spec).
- After onboarding the app is unlocked for this session (task 018 starts locking from the next background).

Out:

- Lock screen and auto-lock: 018. Today's first-run card: 025 (until then Today's placeholder).

## Acceptance criteria

- [ ] A fresh install walks O1 → O5 → Today; the settings row and secure keys exist only after O4.
- [ ] Weak PINs and mismatches show the right messages in place, with the shake and haptic; the keypad never moves.
- [ ] Phones without biometrics skip O5.
- [ ] Killing the app on O3 and reopening starts at O1 with nothing saved (test the draft store and the gate logic).
- [ ] Back works on every step after O1; Lithuanian strings fit at 360 pt; light and dark checked.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
