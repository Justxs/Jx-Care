import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { useCloseGuard } from './close-guard';

/**
 * `useCloseGuard` for a whole screen: Android back and swipe-back ask "Discard changes?" too.
 * Leave on purpose (after Save or Delete) with `leave()`, which goes back without asking.
 * `onDiscard` runs when the person closes without saving.
 */
export function useScreenCloseGuard(opts: { dirty: boolean; onDiscard?: () => void }) {
  const { dirty, onDiscard } = opts;
  const [leaving, setLeaving] = useState(false);
  const guard = useCloseGuard({
    dirty,
    onClose: () => {
      onDiscard?.();
      leave();
    },
  });
  const { setConfirmOpen } = guard;
  const disablePrevention = usePreventRemove(dirty && !leaving, () => setConfirmOpen(true));
  const leave = () => {
    setLeaving(true);
    disablePrevention();
    router.back();
  };

  return { ...guard, leave };
}
