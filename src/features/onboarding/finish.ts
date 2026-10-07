import { router } from 'expo-router';

import { clearDraft } from './draft';

/** Lands on Today with the onboarding stack replaced (no Back into it) and drops the draft PIN. */
export function finishOnboarding(): void {
  router.replace('/');
  clearDraft();
}
