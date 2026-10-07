import { setDb } from '@/db';
import { createTestDb } from '@/db/test-db';
import { createMemoryKV } from '@/features/security/secureStore';
import { createPinService } from '@/features/security/pin';
import { getSettings, hasSettingsRow, saveSettings } from '@/features/settings/repo';
import { lockStore, setLocked } from '@/state/lock';

import {
  clearDraft,
  clearMismatch,
  draftStore,
  rejectDraftPin,
  setDraftLanguage,
  setDraftPin,
} from './draft';
import { checkOnboarding, gateStore, markOnboarded, needsOnboarding } from './gate';
import { saveOnboarding } from './save';
import { emptyRecoveryForm, questionOptions, recoverySchema, toRecoveryQuestion } from './schema';

jest.mock('expo-crypto', () => {
  const nodeCrypto = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function setup() {
  const db = createTestDb();
  setDb(db);
  const kv = createMemoryKV();
  const service = createPinService(kv);
  return { db, kv, service };
}

beforeEach(() => {
  clearDraft();
  gateStore.setState(() => ({ pinMissing: false }));
  setLocked(true);
});

describe('onboarding draft', () => {
  it('holds the language and PIN in memory and forgets them on clear', () => {
    setDraftLanguage('lt');
    setDraftPin('2580');
    expect(draftStore.state).toMatchObject({ language: 'lt', pin: '2580', mismatch: false });
    clearDraft();
    expect(draftStore.state).toMatchObject({ language: null, pin: null, saved: false });
  });

  it('a mismatch drops the PIN and flags it until the next digit', () => {
    setDraftPin('2580');
    rejectDraftPin();
    expect(draftStore.state).toMatchObject({ pin: null, mismatch: true });
    clearMismatch();
    expect(draftStore.state.mismatch).toBe(false);
  });
});

describe('launch gate', () => {
  it('a first launch (no settings row) goes to onboarding and wipes old secure keys', async () => {
    const { db, kv, service } = setup();
    // Left over from an earlier install: the iOS Keychain survives an uninstall.
    await service.completeOnboarding({
      pin: '2580',
      question: { kind: 'preset', id: 'first_pet' },
      answer: 'Rex',
    });
    expect(kv.map.size).toBeGreaterThan(0);

    expect(await checkOnboarding(db, service)).toBe(true);
    expect(kv.map.size).toBe(0);
    expect(needsOnboarding(db)).toBe(true);
  });

  it('a settings row without a PIN goes to onboarding, and keeps the row', async () => {
    const { db, service } = setup();
    saveSettings(db, { language: 'lt' });
    expect(await checkOnboarding(db, service)).toBe(true);
    expect(needsOnboarding(db)).toBe(true);
    expect(hasSettingsRow(db)).toBe(true);
  });

  it('a settings row with a PIN opens the app', async () => {
    const { db, service } = setup();
    saveSettings(db, { language: 'en' });
    await service.setPin('2580');
    expect(await checkOnboarding(db, service)).toBe(false);
    expect(needsOnboarding(db)).toBe(false);
  });

  it('assumes the PIN is there when secure storage cannot be read', async () => {
    const { db } = setup();
    saveSettings(db, { language: 'en' });
    const broken = {
      isPinSet: () => Promise.reject(new Error('keychain')),
      resetAll: () => Promise.resolve(),
    };
    expect(await checkOnboarding(db, broken)).toBe(false);
  });

  it('killed on O3 and reopened: nothing saved, so the next launch starts at O1', async () => {
    const { db, kv, service } = setup();
    expect(await checkOnboarding(db, service)).toBe(true);
    // O1 and O2 only touch the in-memory draft.
    setDraftLanguage('lt');
    setDraftPin('2580');
    expect(kv.map.size).toBe(0);
    expect(hasSettingsRow(db)).toBe(false);

    // The app is killed: memory is gone.
    clearDraft();
    expect(await checkOnboarding(db, service)).toBe(true);
    expect(draftStore.state.pin).toBeNull();
    expect(kv.map.size).toBe(0);
  });
});

describe('saveOnboarding', () => {
  it('writes the PIN, the answer and the settings row together, then unlocks', async () => {
    const { db, kv, service } = setup();
    await checkOnboarding(db, service);
    const settings = await saveOnboarding(
      db,
      {
        language: 'lt',
        pin: '2580',
        question: { kind: 'custom', text: ' Favourite song? ' },
        answer: 'Yesterday',
      },
      { service, biometricKind: 'face' },
    );

    expect(settings).toMatchObject({ language: 'lt', currency: 'EUR', biometricsOn: false });
    expect(getSettings(db).language).toBe('lt');
    expect(await service.isPinSet()).toBe(true);
    expect(await service.getRecoveryQuestion()).toEqual({
      kind: 'custom',
      text: 'Favourite song?',
    });
    expect(await service.verifyPin('2580', Date.now())).toEqual({ ok: true });
    expect(kv.map.has('recovery')).toBe(true);
    expect(needsOnboarding(db)).toBe(false);
    expect(draftStore.state).toMatchObject({ saved: true, biometricKind: 'face' });
    expect(lockStore.state.locked).toBe(false);
  });

  it('saves nothing when secure storage refuses', async () => {
    const { db } = setup();
    const failing = { completeOnboarding: () => Promise.reject(new Error('keychain')) };
    await expect(
      saveOnboarding(
        db,
        {
          language: 'en',
          pin: '2580',
          question: { kind: 'preset', id: 'birth_city' },
          answer: 'Vilnius',
        },
        { service: failing },
      ),
    ).rejects.toThrow('keychain');
    expect(hasSettingsRow(db)).toBe(false);
    expect(draftStore.state.saved).toBe(false);
  });

  it('markOnboarded clears the missing-PIN flag', () => {
    gateStore.setState(() => ({ pinMissing: true }));
    markOnboarded();
    expect(gateStore.state.pinMissing).toBe(false);
  });
});

function issues(values: typeof emptyRecoveryForm) {
  const result = recoverySchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('recovery form schema', () => {
  it('needs a question and an answer of at least 3 characters', () => {
    expect(issues(emptyRecoveryForm)).toEqual({
      questionId: 'onboarding.errors.questionRequired',
      answer: 'security.errors.answerShort',
    });
    expect(issues({ questionId: 'first_pet', customText: '', answer: ' ab ' })).toEqual({
      answer: 'security.errors.answerShort',
    });
    expect(issues({ questionId: 'first_pet', customText: '', answer: 'Rex' })).toEqual({});
  });

  it('"Write my own" needs the question text', () => {
    expect(issues({ questionId: 'custom', customText: '  ', answer: 'Rex' })).toEqual({
      customText: 'onboarding.errors.customRequired',
    });
    expect(
      toRecoveryQuestion({ questionId: 'custom', customText: ' My band? ', answer: 'x' }),
    ).toEqual({ kind: 'custom', text: 'My band?' });
    expect(
      toRecoveryQuestion({ questionId: 'birth_city', customText: 'ignored', answer: 'x' }),
    ).toEqual({ kind: 'preset', id: 'birth_city' });
  });

  it('offers the five presets, then "Write my own"', () => {
    const options = questionOptions((key) => key);
    expect(options.map((o) => o.value)).toEqual([
      'first_pet',
      'mother_maiden',
      'first_school',
      'favourite_teacher',
      'birth_city',
      'custom',
    ]);
    expect(options[0]?.label).toBe('security.questions.first_pet');
    expect(options[5]?.label).toBe('onboarding.writeOwn');
  });
});
