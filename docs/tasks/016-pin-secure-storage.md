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

- [ ] Unit tests with the in-memory store cover: weak PIN rejection; set and verify; the 5th failure locks for 30 s and refuses even a correct PIN until the time passes; the 10th failure locks for 5 min; success resets failures; recovery answer matches "  Rex " against "rex" and "Réx"; 5 wrong answers lock for 15 min; changePin with a wrong old PIN counts as a failure; resetAll clears everything.
- [ ] Lockout survives a restart (counters are stored, not in memory) — test by creating a new module instance over the same store.
- [ ] No PIN, answer or hash is ever logged or put in SQLite (review your diff for `console.log`).
- [ ] `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Notes

- A 4-digit PIN is protected by the lockout and the Keychain/Keystore, not by the hash; plain salted SHA-256 is enough, don't add slow key stretching that blocks the JS thread.

## Decisions

(Write any choices you make here.)
