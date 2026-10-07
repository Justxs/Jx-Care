import { createMemoryKV } from './secureStore';
import {
  createPinService,
  PIN_LOCK_LONG_MS,
  PIN_LOCK_SHORT_MS,
  RECOVERY_LOCK_MS,
  validateAnswer,
  validateNewPin,
  type RecoveryQuestion,
} from './pin';

jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

// The default instance is built over expo-secure-store on import; tests never touch it.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const pet: RecoveryQuestion = { kind: 'preset', id: 'first_pet' };
const T0 = 1_760_000_000_000;

async function setup() {
  const kv = createMemoryKV();
  const service = createPinService(kv);
  await service.completeOnboarding({ pin: '2580', question: pet, answer: '  Rex ' });
  return { kv, service };
}

async function failPin(service: ReturnType<typeof createPinService>, times: number, now: number) {
  let last;
  for (let i = 0; i < times; i++) last = await service.verifyPin('1111', now);
  return last;
}

describe('validateNewPin', () => {
  it('rejects anything but 4 digits', () => {
    expect(validateNewPin('123')).toBe('security.errors.pinFormat');
    expect(validateNewPin('12345')).toBe('security.errors.pinFormat');
    expect(validateNewPin('12a4')).toBe('security.errors.pinFormat');
  });

  it('rejects 0000, 1234 and four identical digits only', () => {
    expect(validateNewPin('0000')).toBe('security.errors.pinTooEasy');
    expect(validateNewPin('1234')).toBe('security.errors.pinTooEasy');
    expect(validateNewPin('7777')).toBe('security.errors.pinTooEasy');
    expect(validateNewPin('4321')).toBeNull();
    expect(validateNewPin('1235')).toBeNull();
    expect(validateNewPin('0001')).toBeNull();
  });

  it('needs an answer of at least 3 characters after trimming', () => {
    expect(validateAnswer(' ab ')).toBe('security.errors.answerShort');
    expect(validateAnswer('abc')).toBeNull();
  });
});

describe('PIN service', () => {
  it('saves nothing before onboarding completes, then sets PIN and question together', async () => {
    const kv = createMemoryKV();
    const service = createPinService(kv);
    expect(await service.isPinSet()).toBe(false);
    expect(await service.getRecoveryQuestion()).toBeNull();

    await expect(
      service.completeOnboarding({ pin: '1234', question: pet, answer: 'Rex' }),
    ).rejects.toThrow('PIN does not meet the rules');
    await expect(
      service.completeOnboarding({ pin: '2580', question: pet, answer: ' R ' }),
    ).rejects.toThrow('Recovery answer is too short');
    expect(kv.map.size).toBe(0);

    await service.completeOnboarding({ pin: '2580', question: pet, answer: 'Rex' });
    expect(await service.isPinSet()).toBe(true);
    expect(await service.getRecoveryQuestion()).toEqual(pet);
  });

  it('stores only salted hashes', async () => {
    const { kv } = await setup();
    const pin = JSON.parse(kv.map.get('pin') ?? '{}');
    expect(pin.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(pin.hash).toMatch(/^[0-9a-f]{64}$/);
    for (const value of kv.map.values()) {
      expect(value).not.toContain('2580');
      expect(value.toLowerCase()).not.toContain('rex');
    }
  });

  it('verifies the right PIN and rejects a wrong one', async () => {
    const { service } = await setup();
    expect(await service.verifyPin('2580', T0)).toEqual({ ok: true });
    expect(await service.verifyPin('2581', T0)).toEqual({ ok: false, locked: false, failures: 1 });
  });

  it('locks for 30 s on the 5th failure and refuses even the right PIN until then', async () => {
    const { service } = await setup();
    const fourth = await failPin(service, 4, T0);
    expect(fourth).toEqual({ ok: false, locked: false, failures: 4 });

    const fifth = await service.verifyPin('1111', T0);
    expect(fifth).toEqual({
      ok: false,
      locked: false,
      failures: 5,
      lockedUntil: T0 + PIN_LOCK_SHORT_MS,
    });
    expect(await service.lockoutRemaining(T0)).toBe(30);
    expect(await service.lockoutRemaining(T0 + 20_500)).toBe(10);
    expect(await service.lockoutUntil(T0 + 20_500)).toBe(T0 + PIN_LOCK_SHORT_MS);
    expect(await service.lockoutUntil(T0 + PIN_LOCK_SHORT_MS)).toBe(0);

    expect(await service.verifyPin('2580', T0 + 29_999)).toEqual({
      ok: false,
      locked: true,
      lockedUntil: T0 + PIN_LOCK_SHORT_MS,
    });
    expect(await service.lockoutRemaining(T0 + PIN_LOCK_SHORT_MS)).toBe(0);
    expect(await service.verifyPin('2580', T0 + PIN_LOCK_SHORT_MS)).toEqual({ ok: true });
  });

  it('locks for 5 min on the 10th failure and every 5 failures after that', async () => {
    const { service } = await setup();
    await failPin(service, 5, T0);
    const t1 = T0 + PIN_LOCK_SHORT_MS;
    expect(await failPin(service, 4, t1)).toEqual({ ok: false, locked: false, failures: 9 });
    expect(await service.verifyPin('1111', t1)).toEqual({
      ok: false,
      locked: false,
      failures: 10,
      lockedUntil: t1 + PIN_LOCK_LONG_MS,
    });
    expect(await service.lockoutRemaining(t1)).toBe(300);
    expect((await service.verifyPin('2580', t1 + PIN_LOCK_LONG_MS - 1)).ok).toBe(false);

    const t2 = t1 + PIN_LOCK_LONG_MS;
    expect(await failPin(service, 5, t2)).toEqual({
      ok: false,
      locked: false,
      failures: 15,
      lockedUntil: t2 + PIN_LOCK_LONG_MS,
    });
  });

  it('resets the failure count after a correct PIN', async () => {
    const { service } = await setup();
    await failPin(service, 4, T0);
    expect(await service.verifyPin('2580', T0)).toEqual({ ok: true });
    expect(await failPin(service, 4, T0)).toEqual({ ok: false, locked: false, failures: 4 });
  });

  it('keeps the lockout across a restart', async () => {
    const { kv, service } = await setup();
    await failPin(service, 5, T0);

    const restarted = createPinService(createMemoryKV(kv.map));
    expect(await restarted.lockoutRemaining(T0 + 10_000)).toBe(20);
    expect(await restarted.verifyPin('2580', T0 + 10_000)).toEqual({
      ok: false,
      locked: true,
      lockedUntil: T0 + PIN_LOCK_SHORT_MS,
    });
    expect(await restarted.verifyPin('1111', T0 + PIN_LOCK_SHORT_MS)).toEqual({
      ok: false,
      locked: false,
      failures: 6,
    });
  });

  it('counts concurrent wrong tries one by one', async () => {
    const { service } = await setup();
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => service.verifyPin('1111', T0)));
    expect(results.map((r) => (r.ok || r.locked ? null : r.failures))).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('recovery answer', () => {
  it('matches ignoring case, accents and extra spaces', async () => {
    const { service } = await setup();
    expect(await service.verifyRecoveryAnswer('rex', T0)).toEqual({ ok: true });
    expect(await service.verifyRecoveryAnswer('Réx', T0)).toEqual({ ok: true });
    expect(await service.verifyRecoveryAnswer('  REX  ', T0)).toEqual({ ok: true });
    expect((await service.verifyRecoveryAnswer('Rexy', T0)).ok).toBe(false);
  });

  it('locks for 15 min after 5 wrong answers, then resets on a correct one', async () => {
    const { service } = await setup();
    for (let i = 1; i <= 4; i++) {
      expect(await service.verifyRecoveryAnswer('Max', T0)).toEqual({
        ok: false,
        locked: false,
        failures: i,
      });
    }
    expect(await service.verifyRecoveryAnswer('Max', T0)).toEqual({
      ok: false,
      locked: false,
      failures: 5,
      lockedUntil: T0 + RECOVERY_LOCK_MS,
    });
    expect(await service.recoveryLockoutRemaining(T0)).toBe(900);
    expect(await service.recoveryLockoutUntil(T0 + 1000)).toBe(T0 + RECOVERY_LOCK_MS);
    expect(await service.lockoutUntil(T0)).toBe(0);
    expect(await service.verifyRecoveryAnswer('rex', T0 + RECOVERY_LOCK_MS - 1)).toEqual({
      ok: false,
      locked: true,
      lockedUntil: T0 + RECOVERY_LOCK_MS,
    });
    // The PIN lockout is separate.
    expect(await service.verifyPin('2580', T0)).toEqual({ ok: true });

    expect(await service.verifyRecoveryAnswer('rex', T0 + RECOVERY_LOCK_MS)).toEqual({ ok: true });
    expect(await service.verifyRecoveryAnswer('Max', T0 + RECOVERY_LOCK_MS)).toEqual({
      ok: false,
      locked: false,
      failures: 1,
    });
  });

  it('lets a new PIN be set after a correct answer, clearing the PIN lockout', async () => {
    const { service } = await setup();
    await failPin(service, 10, T0);
    expect(await service.verifyRecoveryAnswer('Rex', T0)).toEqual({ ok: true });
    await service.setPin('9137');
    expect(await service.lockoutRemaining(T0)).toBe(0);
    expect(await service.verifyPin('9137', T0)).toEqual({ ok: true });
    expect((await service.verifyPin('2580', T0)).ok).toBe(false);
  });

  it('stores a custom question trimmed', async () => {
    const { service } = await setup();
    await service.setRecovery({ kind: 'custom', text: '  Favourite band? ' }, 'Muse');
    expect(await service.getRecoveryQuestion()).toEqual({
      kind: 'custom',
      text: 'Favourite band?',
    });
    expect(await service.verifyRecoveryAnswer('muse', T0)).toEqual({ ok: true });
  });
});

describe('change PIN and recovery (S6)', () => {
  it('changes the PIN with the right old PIN', async () => {
    const { service } = await setup();
    expect(await service.changePin('2580', '9137', T0)).toEqual({ ok: true });
    expect(await service.verifyPin('9137', T0)).toEqual({ ok: true });
    expect((await service.verifyPin('2580', T0)).ok).toBe(false);
  });

  it('counts a wrong old PIN as a failure toward the lockout', async () => {
    const { service } = await setup();
    await failPin(service, 4, T0);
    expect(await service.changePin('1111', '9137', T0)).toEqual({
      ok: false,
      locked: false,
      failures: 5,
      lockedUntil: T0 + PIN_LOCK_SHORT_MS,
    });
    expect(await service.changePin('2580', '9137', T0)).toEqual({
      ok: false,
      locked: true,
      lockedUntil: T0 + PIN_LOCK_SHORT_MS,
    });
    expect(await service.verifyPin('2580', T0 + PIN_LOCK_SHORT_MS)).toEqual({ ok: true });
  });

  it('refuses a weak new PIN without spending an attempt', async () => {
    const { service } = await setup();
    await expect(service.changePin('1111', '0000', T0)).rejects.toThrow(
      'PIN does not meet the rules',
    );
    expect(await service.verifyPin('1111', T0)).toEqual({ ok: false, locked: false, failures: 1 });
  });

  it('changes the recovery question only with the PIN', async () => {
    const { service } = await setup();
    const city: RecoveryQuestion = { kind: 'preset', id: 'birth_city' };
    expect((await service.changeRecovery('1111', city, 'Kaunas', T0)).ok).toBe(false);
    expect(await service.getRecoveryQuestion()).toEqual(pet);

    expect(await service.changeRecovery('2580', city, 'Kaunas', T0)).toEqual({ ok: true });
    expect(await service.getRecoveryQuestion()).toEqual(city);
    expect(await service.verifyRecoveryAnswer('kaunas', T0)).toEqual({ ok: true });
    expect((await service.verifyRecoveryAnswer('Rex', T0)).ok).toBe(false);
  });
});

describe('resetAll', () => {
  it('clears every secure key', async () => {
    const { kv, service } = await setup();
    await failPin(service, 3, T0);
    await service.verifyRecoveryAnswer('Max', T0);
    expect([...kv.map.keys()].sort()).toEqual([
      'pin',
      'pinAttempts',
      'recovery',
      'recoveryAttempts',
    ]);

    await service.resetAll();
    expect(kv.map.size).toBe(0);
    expect(await service.isPinSet()).toBe(false);
    expect(await service.getRecoveryQuestion()).toBeNull();
    expect(await service.lockoutRemaining(T0)).toBe(0);
  });
});
