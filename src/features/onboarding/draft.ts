import { createStore } from '@tanstack/react-store';

import type { BiometricKind } from '@/features/security/biometrics';
import type { RecoveryQuestion } from '@/features/security/pin';
import type { Language } from '@/i18n';

/**
 * What onboarding has collected so far. It lives only in memory: nothing is saved until O4
 * finishes, and killing the app drops it, so the next launch starts again at O1 (spec O1–O5).
 */
export type OnboardingDraft = {
  /** Picked on O1; null until then (the phone language shows pre-selected). */
  language: Language | null;
  /** The PIN typed on O2, waiting for O3 to confirm it. */
  pin: string | null;
  /** O3 sent the person back to O2 because the PINs differed; O2 says so until the next digit. */
  mismatch: boolean;
  /** The recovery question picked on O4. */
  question: RecoveryQuestion | null;
  /** O4 finished: the PIN, the answer and the settings row are saved. */
  saved: boolean;
  /** Set by O4 when the phone offers biometrics, so O5 can say Face ID or fingerprint. */
  biometricKind: BiometricKind | null;
};

const empty: OnboardingDraft = {
  language: null,
  pin: null,
  mismatch: false,
  question: null,
  saved: false,
  biometricKind: null,
};

export const draftStore = createStore<OnboardingDraft>({ ...empty });

function patch(next: Partial<OnboardingDraft>): void {
  draftStore.setState((s) => ({ ...s, ...next }));
}

export function setDraftLanguage(language: Language): void {
  patch({ language });
}

/** O2 accepted a PIN; O3 compares against it. */
export function setDraftPin(pin: string): void {
  patch({ pin, mismatch: false });
}

/** O3 mismatch: forget the PIN and tell O2 why it is back. */
export function rejectDraftPin(): void {
  patch({ pin: null, mismatch: true });
}

export function clearMismatch(): void {
  if (draftStore.state.mismatch) patch({ mismatch: false });
}

export function setDraftQuestion(question: RecoveryQuestion): void {
  patch({ question });
}

/** O4 saved everything; `biometricKind` is set when O5 should follow. */
export function markDraftSaved(biometricKind: BiometricKind | null): void {
  patch({ saved: true, biometricKind });
}

/** Drops everything, the PIN included (on finish, and in tests). */
export function clearDraft(): void {
  draftStore.setState(() => ({ ...empty }));
}
