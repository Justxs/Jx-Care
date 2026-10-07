# 016 PIN and secure storage service

**Phase:** D. Security · **Depends on:** 004 · **Spec:** O2 (PIN rules), O3, O4 (recovery question), L1 (lockout), L2 (answer matching, lockout), refinement 7, sequences 1 and 2, S6, S8 reset

## Goal

One tested module that owns the PIN, the recovery question and answer, biometrics and the lockout timers, backed by the phone's secure storage. Screens (tasks 017–019) only call this module.

## Scope

In: `npx expo install expo-secure-store expo-crypto expo-local-authentication`; add the `expo-local-authentication` and `expo-secure-store` config plugins in `app.json` with an iOS `faceIDPermission` text (EN: "Unlock Jx-Care with Face ID."). Files: `src/features/security/pin.ts`, `secureStore.ts`, `biometrics.ts`, `pin.test.ts`.

### Storage

Everything here lives in expo-secure-store (Keychain / Keystore), never in SQLite or the backup file:

| Key | Value |
| --- | --- |
| `pin` | `{ salt, hash }`: 16 random bytes (`expo-crypto` `getRandomBytes`) as hex, `hash = SHA-256(salt + pin)` |
| `recovery` | `{ question: { kind: 'preset', id: 'first_pet' \| 'mother_maiden' \| 'first_school' \| 'favourite_teacher' \| 'birth_city' } \| { kind: 'custom', text }, salt, hash }` with `hash = SHA-256(salt + normalizeName(answer))` (task 006) |
| `pinAttempts` | `{ failures, lockedUntil }` (ms) |
| `recoveryAttempts` | `{ failures, lockedUntil }` |

Wrap expo-secure-store behind a tiny `SecureKV` interface (`get`, `set`, `delete`) so tests use an in-memory map and `expo-crypto` is mocked with Node's `crypto`.

### Functions (`pin.ts`)

- `isPinSet()`.
- `validateNewPin(pin)` → `null` or an error key: not 4 digits; `0000`, `1234`, or four identical digits are rejected ("1234 is too easy to guess. Try another."). Reject only these; don't add other rules.
- `setPin(pin)`, `setRecovery(question, answer)` (answer at least 3 characters after trim).
- `completeOnboarding({ pin, question, answer })`: writes PIN and recovery together; nothing is saved before this (spec O1–O5: quitting mid-way restarts onboarding).
- `verifyPin(pin, now)` → `{ ok: true } | { ok: false, failures, lockedUntil? } | { ok: false, locked: true, lockedUntil }`:
  - while `lockedUntil > now`, refuse without checking;
  - a wrong PIN increments `failures`; on the 5th failure lock for 30 s; on the 10th for 5 min (and every 5 failures after that, 5 min again);
  - a correct PIN resets `failures` to 0.
- `lockoutRemaining(now)` → seconds, for the "Try again in 30 s" countdown.
- `getRecoveryQuestion()` → the question (so L2 can show it in the app's language: presets are i18n keys).
- `verifyRecoveryAnswer(answer, now)`: same shape; 5 wrong answers lock for 15 min. A correct answer resets the counter and returns `ok`, after which the caller may call `setPin`.
- `changePin(oldPin, newPin)`: verifies the old PIN with the same lockout rules (S6).
- `changeRecovery(pin, question, answer)`: needs the PIN (S6).
- `resetAll()`: deletes every secure key (used by Reset app, task 018/040, together with wiping the database and files).

### Biometrics (`biometrics.ts`)

- `biometricsAvailable()` → `{ available, kind: 'face' | 'fingerprint' | 'iris' | null }` (`hasHardwareAsync`, `isEnrolledAsync`, `supportedAuthenticationTypesAsync`), so O5 can say "Face ID" or "fingerprint".
- `authenticate(promptText)` → boolean; `disableDeviceFallback: true` so the phone passcode is not an alternative to the app PIN.
- Whether biometrics is on lives in `settings.biometricsOn` (task 004), set by O5 and S6.

Out:

- Screens: 017 (onboarding), 018 (lock, forgot PIN, reset), 019 (security settings).
- Auto-lock timing: task 018.

## Acceptance criteria

- [x] Unit tests with the in-memory store cover: weak PIN rejection; set and verify; the 5th failure locks for 30 s and refuses even a correct PIN until the time passes; the 10th failure locks for 5 min; success resets failures; recovery answer matches "  Rex " against "rex" and "Réx"; 5 wrong answers lock for 15 min; changePin with a wrong old PIN counts as a failure; resetAll clears everything.
- [x] Lockout survives a restart (counters are stored, not in memory) — test by creating a new module instance over the same store.
- [x] No PIN, answer or hash is ever logged or put in SQLite (review your diff for `console.log`).
- [x] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Notes

- A 4-digit PIN is protected by the lockout and the Keychain/Keystore, not by the hash; plain salted SHA-256 is enough, don't add slow key stretching that blocks the JS thread.

## Decisions

- **Shape.** `pin.ts` exports `createPinService(kv)` plus a default `pinService` over expo-secure-store, and the default instance's functions by name (`verifyPin`, `setPin`, ...). Tests build services over `createMemoryKV()`; a second service over the same map is "the app after a restart".
- **Results.** Every check returns `{ ok: true } | { ok: false, locked: false, failures, lockedUntil? } | { ok: false, locked: true, lockedUntil }`. The extra `locked: false` makes the union narrow on `r.locked`. `lockedUntil` is set on the failure that starts a lockout.
- **Lockout counting.** Failures keep counting across lockouts and only a correct entry resets them: PIN locks on every 5th failure (5th: 30 s, 10th, 15th, ...: 5 min); recovery locks 15 min on every 5th wrong answer. PIN and recovery counters are separate, so a PIN lockout does not block Forgot PIN.
- **`setPin` clears the PIN lockout.** After a correct recovery answer the new PIN works at once, even if the old one was locked for 5 min. `setRecovery` clears the recovery counter the same way.
- **`changePin` / `changeRecovery`** take an optional `now` (default `Date.now()`) and use the same counter as L1. Inputs that break the rules (weak new PIN, answer under 3 characters, empty custom question) throw before the old PIN is checked, so they never cost an attempt; screens call `validateNewPin` / `validateAnswer` first and show the error key.
- **Error keys.** `validateNewPin` returns `security.errors.pinFormat` or `security.errors.pinTooEasy` (EN "{{pin}} is too easy to guess. Try another."; pass `{ pin }`). `validateAnswer` returns `security.errors.answerShort`. Preset question texts are `security.questions.<id>` (`presetQuestionKey(id)`).
- **Extras beyond the task list:** `validateAnswer`, `recoveryLockoutRemaining(now)` (L2 needs its own countdown), `presetQuestionIds`, `presetQuestionKey`.
- **`completeOnboarding`** validates everything first, writes the recovery answer, then the PIN, so `isPinSet()` true always means a recovery answer exists. A custom question is stored trimmed.
- **Counter writes are serialised** in one promise queue per service, so two quick submits cannot both read the old failure count.
- **Hashing:** `SHA-256(salt + value)` with `digestStringAsync` (hex), salt = 16 `getRandomBytes` as hex, no stretching (per Notes). The recovery hash is over `normalizeName(answer)`.
- **Secure store options:** expo-secure-store defaults (`WHEN_UNLOCKED`), no `requireAuthentication`, so reading the PIN never shows a system prompt.
- **Biometrics.** `pickKind` prefers fingerprint, then face, then iris (Android can report several; fingerprint is the strong sensor on most phones). `authenticate(promptText, cancelText?)` passes `disableDeviceFallback: true`, hides the iOS passcode fallback (`fallbackLabel: ''`) and always sets `cancelLabel` (default `security.biometrics.usePin`, "Use PIN"): Android's BiometricPrompt throws if the negative button text is empty once the device credential is not allowed. Cancel, failure and errors return false.
- **Note for 017/018 (iOS reinstall):** the iOS Keychain survives uninstalling the app while the database does not, so after a reinstall `isPinSet()` can be true with no `settings` row. The launch gate should treat "no settings row" as a first launch and call `resetAll()` before onboarding.

Check on a real device:

- Face ID prompt shows the `faceIDPermission` text on first use (iOS) and no "Enter passcode" button after failed scans.
- Android prompt shows "Use PIN" as the cancel button and does not offer the phone PIN/pattern; cancelling returns to the app PIN.
- `biometricsAvailable()` reports `face` on a Face ID iPhone and `fingerprint` on an Android phone with a fingerprint enrolled; `available: false` with nothing enrolled.
- PIN and lockout counters survive killing and reopening the app (Keychain / Keystore).
- iOS reinstall behaviour described above.
