import { useReducedMotion } from 'react-native-reanimated';

import { motion, timing, type MotionDuration, type MotionEasing } from './motion';

export type Motion = {
  /** True when the phone's Reduce Motion setting is on. */
  reduced: boolean;
  /** Timing config; with Reduce Motion every movement becomes a 100 ms fade. */
  timing: (duration?: MotionDuration, easing?: MotionEasing) => ReturnType<typeof timing>;
  /** Whether slides and scales may run; when false, animate opacity only. */
  allowMovement: boolean;
  /** Counters jump to the final number when false. */
  allowCounting: boolean;
};

export function motionFor(reduced: boolean): Motion {
  return {
    reduced,
    timing: (duration = 'base', easing = 'standard') =>
      reduced ? timing('reduced', 'standard') : timing(duration, easing),
    allowMovement: !reduced,
    allowCounting: !reduced,
  };
}

/** Motion helpers that respect Reduce Motion. */
export function useMotion(): Motion {
  const reduced = useReducedMotion();
  return motionFor(reduced);
}

export { motion };
