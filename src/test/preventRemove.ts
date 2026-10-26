import { useCallback, useEffect, useRef } from 'react';

type Blocked = { data: { action: { type: string } }; repeat: () => void };
type Guard = { prevent: boolean; callback?: (e: Blocked) => void };

const guards = new Set<Guard>();

/**
 * Stand-in for expo-router's `usePreventRemove` in tests that mock expo-router:
 * `usePreventRemove: (...args) => require('@/test/preventRemove').usePreventRemove(...args)`.
 * Leave the screen the way Android back does with `tryLeave()`.
 */
export function usePreventRemove(prevent: boolean, callback?: (e: Blocked) => void) {
  const current = useRef<Guard | null>(null);
  useEffect(() => {
    const guard: Guard = { prevent, callback };
    current.current = guard;
    guards.add(guard);
    return () => {
      guards.delete(guard);
    };
  }, [prevent, callback]);
  return useCallback(() => {
    if (current.current) current.current.prevent = false;
  }, []);
}

/** Android back or swipe-back: true when a mounted screen blocked it (its callback has run). */
export function tryLeave(): boolean {
  let blocked = false;
  for (const guard of guards) {
    if (!guard.prevent) continue;
    blocked = true;
    guard.callback?.({ data: { action: { type: 'GO_BACK' } }, repeat: () => {} });
  }
  return blocked;
}
