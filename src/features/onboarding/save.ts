import type { Db } from '@/db';
import { seedDefaultRules } from '@/features/conflicts/seed';
import type { BiometricKind } from '@/features/security/biometrics';
import { pinService, type PinService, type RecoveryQuestion } from '@/features/security/pin';
import { saveSettings, type AppSettings } from '@/features/settings/repo';
import type { Language } from '@/i18n';
import { setLocked } from '@/state/lock';

import { markDraftSaved } from './draft';
import { markOnboarded } from './gate';

export type OnboardingInput = {
  language: Language;
  pin: string;
  question: RecoveryQuestion;
  answer: string;
};

/**
 * The end of O4 and the first moment anything is saved: the PIN and the recovery answer go to
 * secure storage, then the settings row is created with the language and EUR, and the default
 * conflict rules are added in that language. The app counts as
 * unlocked for the rest of this session (the lock starts from the next background, task 018).
 */
export async function saveOnboarding(
  db: Db,
  input: OnboardingInput,
  opts: {
    service?: Pick<PinService, 'completeOnboarding'>;
    /** Set when the phone offers biometrics, so O5 follows. */
    biometricKind?: BiometricKind | null;
  } = {},
): Promise<AppSettings> {
  const service = opts.service ?? pinService;
  await service.completeOnboarding({
    pin: input.pin,
    question: input.question,
    answer: input.answer,
  });
  const settings = saveSettings(db, { language: input.language, currency: 'EUR' });
  // The default conflict rules, named in the language just chosen.
  seedDefaultRules(db, input.language);
  markOnboarded();
  markDraftSaved(opts.biometricKind ?? null);
  setLocked(false);
  return settings;
}
