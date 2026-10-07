import * as Crypto from 'expo-crypto';

import { normalizeName } from '@/lib/text';

import { secureKV, type SecureKV } from './secureStore';

/**
 * The PIN, the recovery question and answer, and the lockout counters (spec O2–O4, L1, L2,
 * refinement 7). Everything lives in secure storage, never in SQLite or a backup. Screens only
 * call this module. Nothing here logs a PIN, an answer or a hash.
 */

export const presetQuestionIds = [
  'first_pet',
  'mother_maiden',
  'first_school',
  'favourite_teacher',
  'birth_city',
] as const;
export type PresetQuestionId = (typeof presetQuestionIds)[number];

export type RecoveryQuestion =
  | { kind: 'preset'; id: PresetQuestionId }
  | { kind: 'custom'; text: string };

/** i18n key of a preset question's text, in the app's language. */
export function presetQuestionKey(id: PresetQuestionId): `security.questions.${PresetQuestionId}` {
  return `security.questions.${id}`;
}

export type PinError = 'security.errors.pinFormat' | 'security.errors.pinTooEasy';
export type AnswerError = 'security.errors.answerShort';

/**
 * Result of a PIN or recovery answer check.
 * - `ok: true`: it matched; the failure counter is back to 0.
 * - `locked: false`: it was wrong; `lockedUntil` is set when this failure started a lockout.
 * - `locked: true`: refused without checking, because a lockout is still running.
 */
export type AttemptResult =
  | { ok: true }
  | { ok: false; locked: false; failures: number; lockedUntil?: number }
  | { ok: false; locked: true; lockedUntil: number };

export const PIN_LOCK_SHORT_MS = 30_000;
export const PIN_LOCK_LONG_MS = 5 * 60_000;
export const RECOVERY_LOCK_MS = 15 * 60_000;
const FAILURES_PER_LOCK = 5;
export const ANSWER_MIN_LENGTH = 3;

const KEYS = {
  pin: 'pin',
  recovery: 'recovery',
  pinAttempts: 'pinAttempts',
  recoveryAttempts: 'recoveryAttempts',
} as const;

type Hashed = { salt: string; hash: string };
type StoredRecovery = Hashed & { question: RecoveryQuestion };
type Attempts = { failures: number; lockedUntil: number };
type AttemptKind = 'pinAttempts' | 'recoveryAttempts';

const noAttempts: Attempts = { failures: 0, lockedUntil: 0 };

/** `null` when the PIN is acceptable, otherwise an i18n error key (O2). */
export function validateNewPin(pin: string): PinError | null {
  if (!/^\d{4}$/.test(pin)) return 'security.errors.pinFormat';
  if (pin === '1234' || /^(\d)\1{3}$/.test(pin)) return 'security.errors.pinTooEasy';
  return null;
}

/** `null` when the answer is long enough after trimming, otherwise an i18n error key (O4). */
export function validateAnswer(answer: string): AnswerError | null {
  return answer.trim().length >= ANSWER_MIN_LENGTH ? null : 'security.errors.answerShort';
}

function lockDuration(kind: AttemptKind, failures: number): number {
  if (failures === 0 || failures % FAILURES_PER_LOCK !== 0) return 0;
  if (kind === 'recoveryAttempts') return RECOVERY_LOCK_MS;
  return failures === FAILURES_PER_LOCK ? PIN_LOCK_SHORT_MS : PIN_LOCK_LONG_MS;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashWithSalt(salt: string, value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + value);
}

async function makeHash(value: string): Promise<Hashed> {
  const salt = toHex(Crypto.getRandomBytes(16));
  return { salt, hash: await hashWithSalt(salt, value) };
}

async function matches(stored: Hashed, value: string): Promise<boolean> {
  return (await hashWithSalt(stored.salt, value)) === stored.hash;
}

function parse<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function assertPin(pin: string) {
  if (validateNewPin(pin) !== null) throw new Error('PIN does not meet the rules');
}

function assertRecovery(question: RecoveryQuestion, answer: string) {
  if (validateAnswer(answer) !== null) throw new Error('Recovery answer is too short');
  if (question.kind === 'custom' && question.text.trim().length === 0) {
    throw new Error('Custom recovery question is empty');
  }
  if (question.kind === 'preset' && !presetQuestionIds.includes(question.id)) {
    throw new Error('Unknown preset question');
  }
}

/**
 * Builds the service over a key-value store. The app uses the default instance below (secure
 * storage); tests pass an in-memory store, and a second instance over the same store behaves like
 * the app after a restart.
 */
export function createPinService(kv: SecureKV = secureKV) {
  // Read-modify-write of the counters runs one at a time, so two quick submits can't both read
  // the old count.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  }

  async function readJson<T>(key: string): Promise<T | null> {
    return parse<T>(await kv.get(key));
  }

  async function writeJson(key: string, value: unknown): Promise<void> {
    await kv.set(key, JSON.stringify(value));
  }

  async function readAttempts(kind: AttemptKind): Promise<Attempts> {
    const stored = await readJson<Attempts>(KEYS[kind]);
    if (!stored || typeof stored.failures !== 'number') return noAttempts;
    return { failures: stored.failures, lockedUntil: stored.lockedUntil ?? 0 };
  }

  /** Runs one check under the lockout rules for `kind`. */
  function attempt(
    kind: AttemptKind,
    now: number,
    check: () => Promise<boolean>,
  ): Promise<AttemptResult> {
    return serial(async () => {
      const current = await readAttempts(kind);
      if (current.lockedUntil > now) {
        return { ok: false, locked: true, lockedUntil: current.lockedUntil };
      }
      if (await check()) {
        if (current.failures !== 0 || current.lockedUntil !== 0) {
          await writeJson(KEYS[kind], noAttempts);
        }
        return { ok: true };
      }
      const failures = current.failures + 1;
      const duration = lockDuration(kind, failures);
      const lockedUntil = duration > 0 ? now + duration : 0;
      await writeJson(KEYS[kind], { failures, lockedUntil });
      return duration > 0
        ? { ok: false, locked: false, failures, lockedUntil }
        : { ok: false, locked: false, failures };
    });
  }

  async function checkPin(pin: string): Promise<boolean> {
    const stored = await readJson<Hashed>(KEYS.pin);
    return stored !== null && (await matches(stored, pin));
  }

  async function remaining(kind: AttemptKind, now: number): Promise<number> {
    const { lockedUntil } = await readAttempts(kind);
    return lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  }

  async function until(kind: AttemptKind, now: number): Promise<number> {
    const { lockedUntil } = await readAttempts(kind);
    return lockedUntil > now ? lockedUntil : 0;
  }

  async function writeRecovery(question: RecoveryQuestion, answer: string): Promise<void> {
    const q: RecoveryQuestion =
      question.kind === 'custom' ? { kind: 'custom', text: question.text.trim() } : question;
    const stored: StoredRecovery = { question: q, ...(await makeHash(normalizeName(answer))) };
    await writeJson(KEYS.recovery, stored);
  }

  /**
   * Saves a new PIN and clears the PIN lockout (used by onboarding, forgot PIN after a correct
   * answer, and change PIN). Throws if the PIN breaks the O2 rules; check `validateNewPin` first.
   */
  async function setPin(pin: string): Promise<void> {
    assertPin(pin);
    await writeJson(KEYS.pin, await makeHash(pin));
    await kv.delete(KEYS.pinAttempts);
  }

  /** Saves the recovery question and answer. Throws if the answer is under 3 characters. */
  async function setRecovery(question: RecoveryQuestion, answer: string): Promise<void> {
    assertRecovery(question, answer);
    await writeRecovery(question, answer);
    await kv.delete(KEYS.recoveryAttempts);
  }

  return {
    async isPinSet(): Promise<boolean> {
      return (await readJson<Hashed>(KEYS.pin)) !== null;
    },

    setPin,
    setRecovery,

    /**
     * Saves the PIN and the recovery answer at the end of O4. Both are checked before anything is
     * written, so a bad input leaves storage untouched.
     */
    async completeOnboarding(input: {
      pin: string;
      question: RecoveryQuestion;
      answer: string;
    }): Promise<void> {
      assertPin(input.pin);
      assertRecovery(input.question, input.answer);
      await kv.delete(KEYS.pinAttempts);
      await kv.delete(KEYS.recoveryAttempts);
      await writeRecovery(input.question, input.answer);
      await writeJson(KEYS.pin, await makeHash(input.pin));
    },

    /** L1: checks the PIN under the 5 → 30 s, 10 → 5 min lockout. */
    verifyPin(pin: string, now: number): Promise<AttemptResult> {
      return attempt('pinAttempts', now, () => checkPin(pin));
    },

    /** Seconds left in the PIN lockout, 0 when not locked ("Try again in 30 s"). */
    lockoutRemaining(now: number): Promise<number> {
      return remaining('pinAttempts', now);
    },

    /** Seconds left in the recovery answer lockout, 0 when not locked. */
    recoveryLockoutRemaining(now: number): Promise<number> {
      return remaining('recoveryAttempts', now);
    },

    /** When the PIN lockout ends (ms), 0 when not locked; countdowns compute from it (L1). */
    lockoutUntil(now: number): Promise<number> {
      return until('pinAttempts', now);
    },

    /** When the recovery answer lockout ends (ms), 0 when not locked (L2). */
    recoveryLockoutUntil(now: number): Promise<number> {
      return until('recoveryAttempts', now);
    },

    /** The saved question, so L2 can show it (presets through `presetQuestionKey`). */
    async getRecoveryQuestion(): Promise<RecoveryQuestion | null> {
      return (await readJson<StoredRecovery>(KEYS.recovery))?.question ?? null;
    },

    /**
     * L2: compares ignoring case, accents and extra spaces; 5 wrong answers lock for 15 min.
     * After `ok` the caller sets the new PIN with `setPin`.
     */
    verifyRecoveryAnswer(answer: string, now: number): Promise<AttemptResult> {
      return attempt('recoveryAttempts', now, async () => {
        const stored = await readJson<StoredRecovery>(KEYS.recovery);
        return stored !== null && (await matches(stored, normalizeName(answer)));
      });
    },

    /**
     * S6: checks the old PIN under the same lockout as L1, then saves the new one. Throws if the
     * new PIN breaks the O2 rules (checked before the old PIN, so it never costs an attempt).
     */
    async changePin(oldPin: string, newPin: string, now: number = Date.now()) {
      assertPin(newPin);
      const result = await attempt('pinAttempts', now, () => checkPin(oldPin));
      if (result.ok) await setPin(newPin);
      return result;
    },

    /** S6: needs the PIN (same lockout as L1), then replaces the question and answer. */
    async changeRecovery(
      pin: string,
      question: RecoveryQuestion,
      answer: string,
      now: number = Date.now(),
    ): Promise<AttemptResult> {
      assertRecovery(question, answer);
      const result = await attempt('pinAttempts', now, () => checkPin(pin));
      if (result.ok) await setRecovery(question, answer);
      return result;
    },

    /** Deletes every secure key (Reset app, together with the database and files). */
    resetAll(): Promise<void> {
      return serial(async () => {
        for (const key of Object.values(KEYS)) await kv.delete(key);
      });
    },
  };
}

export type PinService = ReturnType<typeof createPinService>;

/** The app's service over the phone's secure storage. */
export const pinService: PinService = createPinService();

export const {
  isPinSet,
  setPin,
  setRecovery,
  completeOnboarding,
  verifyPin,
  lockoutRemaining,
  recoveryLockoutRemaining,
  lockoutUntil,
  recoveryLockoutUntil,
  getRecoveryQuestion,
  verifyRecoveryAnswer,
  changePin,
  changeRecovery,
  resetAll,
} = pinService;
