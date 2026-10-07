import { router, useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useCloseGuard } from './close-guard';

/**
 * `useCloseGuard` for a whole screen: Android back and swipe-back ask "Discard changes?" too.
 * Leave on purpose (after Save or Delete) with `leave()`, which goes back without asking.
 * `onDiscard` runs when the person closes without saving.
 */
export function useScreenCloseGuard(opts: { dirty: boolean; onDiscard?: () => void }) {
  const { dirty, onDiscard } = opts;
  const navigation = useNavigation();
  const leaving = useRef(false);
  const leave = () => {
    leaving.current = true;
    router.back();
  };
  const guard = useCloseGuard({
    dirty,
    onClose: () => {
      onDiscard?.();
      leave();
    },
  });
  const { setConfirmOpen } = guard;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (leaving.current || !dirty) return;
        e.preventDefault();
        setConfirmOpen(true);
      }),
    [navigation, dirty, setConfirmOpen],
  );

  return { ...guard, leave };
}
