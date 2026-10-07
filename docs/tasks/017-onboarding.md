# 017 Onboarding

**Phase:** D. Security · **Depends on:** 010, 016 · **Spec:** O1–O5, sequence 1, Navigation map (first launch) · **Design:** [screens.md](../design/screens.md) WelcomeScreen, CreatePinScreen, ConfirmPinScreen, RecoveryScreen, BiometricsScreen; [components.md](../design/components.md) PinPad, StepDots, RadioList, Input (`secret`)

## Goal

The five first-launch steps: language, create PIN, confirm PIN, recovery question and biometrics, ending on Today's first-run state. Nothing is saved until the recovery step finishes.

## Scope

In: `src/features/onboarding/screens/*`, `src/features/onboarding/draft.ts` (an in-memory TanStack Store holding language, PIN and question while onboarding runs; cleared on finish or when the app is killed).

- **Layout for all steps:** `space-6` gutter, `StepDots` ("1 of 5" … "5 of 5") in a fixed-height row at the top, Back on every step after the first, logo at 64 pt or more on O1. Steps push.
- **O1 Welcome + language:** logo, "Jx Care" in `title-l`, the pitch "Track your skin and hair care in one place", two large choices as a `RadioList` (task 008; round marks, no LT/EN squares; each row shows the native name with the other language under it: "Lietuvių" / "Lithuanian", "English" / "Anglų"), pre-selected from the phone language (task 003), the privacy line "Everything stays on this phone. No account needed." (LT "Viskas lieka šiame telefone. Paskyros nereikia."), Continue. Picking a language re-renders all strings in place at once.
- **O2 Create PIN:** "Create a 4-digit PIN", `PinPad`; moves on after the 4th digit. `validateNewPin` (task 016) errors show in the reserved line under the dots ("1234 is too easy to guess. Try another.") and clear the dots.
- **O3 Confirm PIN:** "Enter it again". Mismatch: dots shake (300 ms) with a haptic, "PINs don't match" in the hint line, then back to O2 with empty dots.
- **O4 Recovery question:** `SelectField` with the 5 presets (first pet, mother's maiden name, first school, favourite teacher, birth city) plus "Write my own" (shows a text field for the question); answer field (min 3 characters), a `secret` `Input` (task 009): hidden as typed, with an eye button to show it ("Show answer" / "Hide answer"); helper "Hidden as you type. Tap the eye to check it." Continue calls `completeOnboarding` (task 016) and creates the `settings` row with the chosen language and currency EUR (task 005 `saveSettings`). This is the first moment anything is saved.
- **O5 Biometrics:** only when `biometricsAvailable()` says so (otherwise O4 goes straight to Today). Bare icon (`scan-face` or `fingerprint`, no tile), "Unlock with Face ID?" / "Unlock with fingerprint?", Turn on (runs one `authenticate()` to confirm, then sets `settings.biometricsOn`) / Not now. Either lands on Today with the stack replaced (no Back into onboarding).
- **Gate:** update `app/index.tsx` from task 010: no PIN set (`isPinSet()` false) → onboarding; a settings row without a PIN (killed mid-way after an old reset) → onboarding.
- Quitting mid-way and reopening restarts at O1 (nothing saved, spec).
- After onboarding the app is unlocked for this session (task 018 starts locking from the next background).

Out:

- Lock screen and auto-lock: 018. Today's first-run card: 025 (until then Today's placeholder).

## Acceptance criteria

- [x] A fresh install walks O1 → O5 → Today; the settings row and secure keys exist only after O4.
- [x] Weak PINs and mismatches show the right messages in place, with the shake and haptic; the keypad never moves.
- [x] Phones without biometrics skip O5.
- [x] Killing the app on O3 and reopening starts at O1 with nothing saved (test the draft store and the gate logic).
- [x] The language choice is a RadioList; the recovery answer is hidden as typed and the eye button shows it.
- [ ] Back works on every step after O1; Lithuanian strings fit at 360 pt; light and dark checked.
- [x] `pnpm check` passes.

## Decisions

- **Files.** `draft.ts` (the in-memory TanStack Store: language, PIN, mismatch flag, question, `saved`, `biometricKind`), `gate.ts` (launch check), `save.ts` (`saveOnboarding`, the end of O4), `finish.ts`, `schema.ts` (O4 zod schema and question options), `components/OnboardingFrame.tsx` (top row with Back and StepDots, `px-6` body, pinned footer that rides above the keyboard), `components/PinStep.tsx` (O2/O3 layout and `usePinEntry`).
- **Gate.** There is no `app/index.tsx`; `/` is `app/(tabs)/index.tsx`, so the gate stays in `app/(tabs)/_layout.tsx`. It redirects to `/welcome` when there is no settings row, or when the boot check found no PIN. `checkOnboarding(db)` runs in `bootstrapAfterMigrations` (async secure storage read): no settings row means a first launch, so it calls `resetAll()` first (iOS Keychain survives an uninstall); a settings row without a PIN also goes to onboarding (the row is kept and updated at O4). If secure storage can't be read it assumes the PIN is set, so onboarding can never overwrite a real PIN by accident.
- **Onboarding layout guard.** `app/(onboarding)/_layout.tsx` decides once when the flow opens: if onboarding isn't needed (a `jxcare://create-pin` link after setup) it redirects to `/`, so a link can't be used to set a new PIN past the lock. O3 and O4 opened without a PIN in the draft, and O5 opened before O4 saved, redirect to `/welcome`. These checks read the draft once on mount, so clearing the draft on finish never re-routes a screen that is leaving.
- **Saving (O4).** `saveOnboarding` calls `completeOnboarding` (PIN and answer to secure storage) first, then `saveSettings({ language, currency: 'EUR' })`; if secure storage throws, nothing reaches the database and a toast says "Couldn't save. Try again.". It then clears the gate flag, marks the draft saved and calls `setLocked(false)`, so the app is unlocked for the rest of this session (018 locks from the next background).
- **Language (O1).** Picking calls `setLanguage(lang, { persist: false })`: strings switch at once and nothing is written before O4, even when an old settings row exists. Pre-selected value: the draft, else the current i18n language (the phone language on a first launch). The row texts ("Lietuvių" / "Lithuanian", "English" / "Anglų") are constants in `WelcomeScreen` (`LANGUAGE_CHOICES`), like `LANGUAGE_NAMES` in Settings: they are the same in both languages, so they are not i18n keys.
- **PIN steps.** Digits live in a ref plus a `filled` count; entry clears whenever the step comes into focus (`useFocusEffect`), so Back from O3, or O3 sending the person back, always shows empty dots. Weak PIN on O2: shake + haptic (PinPad's `shake()`), the `security.errors.pinTooEasy` / `pinFormat` text in PinPad's reserved line, dots cleared; the message clears on the next digit. Mismatch on O3: shake + haptic, "PINs don't match" on O3 with the keys off, then after `MISMATCH_BACK_MS` (300 ms shake + 400 ms to read) back to O2, which shows the same message until the next digit. The PinPad sits at the bottom of the step, so title wrapping or a message never moves it.
- **O4.** `SelectField` in `sheet` mode: the questions are long (LT up to ~46 characters), and the sheet's RadioList rows wrap, where the menu would not. No question is pre-selected ("Choose a question"); "Write my own" opens a "Your question" field (max 120 characters) through `Collapsible`. Answer field is a `secret` Input with the helper "Hidden as you type. Tap the eye to check it."; the design note's "You'll need this if you forget your PIN." is the line under the title. Errors: `onboarding.errors.questionRequired`, `onboarding.errors.customRequired`, `security.errors.answerShort`.
- **O5.** Shown when `biometricsAvailable()` (checked at O4 submit) says so; the kind travels in the draft. Title per kind: Face ID, fingerprint, and "iris scan" for the rare iris-only phone; icon `scan-face` for face, `fingerprint` otherwise, 64 pt in accent, no tile. Turn on runs one `authenticate()` (cancel button "Cancel", not "Use PIN", since no PIN prompt is behind it); success saves `biometricsOn: true` and finishes, failure or cancel keeps O5 with "Not turned on. Try again, or tap Not now." in a reserved line. Back on O5 returns to O4; continuing again re-saves the same PIN and answer, which is harmless.
- **Finish.** `router.replace('/')` from O4 or O5 replaces the whole onboarding group in the root stack (tested: nothing to go back to), then the draft (with the PIN) is cleared.
- **Logo.** New shared `src/components/Logo.tsx` draws `assets/brand/logo.svg` with react-native-svg in `brand-pink` (from `useThemeColors`, as SVG fills can't take a class); 72 pt on O1. 018 can reuse it on the lock screen. The mask uses literal white/black, which are mask luminance, not colours.
- **Shared changes.** `FieldButton` and `SelectField` take `valueLines` (default 1) so the chosen question can wrap to 2 lines. `useAppForm` (form.tsx) gained a form `onChange` listener: a field that has an error re-runs the form check as it is edited. Without it, choosing from a SelectField (which blurs) checked the whole form, marked the untouched answer as too short, and that stale error kept Continue from submitting even after the answer was typed (TanStack Form skips validation on a first submit while `canSubmit` is false).
- **Note for 018.** The lock gate must not show the lock while onboarding runs (use `needsOnboarding(db)` / `useNeedsOnboarding(db)` from `gate.ts`); `lockStore.locked` is set to false at the end of O4.

Check on a real device:

- O1 to O5 in Lithuanian at 360 pt wide (small Android): titles wrap without pushing the keypad off screen, the two-line question in the O4 field, footer buttons fit.
- Light and dark: logo pink on canvas, PinPad keys, the O5 icon.
- Shake and error haptic on a weak PIN and on a mismatch; the keypad never moves.
- O4 keyboard: the Continue button rides above the keyboard and the answer field scrolls into view; the eye button shows and hides the answer.
- Face ID prompt on Turn on (iOS) and fingerprint prompt (Android), with Cancel returning to O5; a phone with nothing enrolled goes straight from O4 to Today.
- Killing the app on O3 and reopening starts at O1; after finishing, Android back from Today leaves the app instead of returning to onboarding.
- iOS: delete and reinstall the app; onboarding starts fresh and the old PIN no longer works.
