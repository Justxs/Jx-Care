import { Easing, type WithTimingConfig } from 'react-native-reanimated';

/** Motion scale from DESIGN.md and the spec's Motion table. Every animation uses these. */
export const motion = {
  duration: { fast: 150, base: 200, slow: 300, reduced: 100 },
  // cubic-bezier control points for Easing.bezier
  easing: { standard: [0.2, 0, 0, 1], enter: [0, 0, 0.2, 1], exit: [0.4, 0, 1, 1] },
  spring: { damping: 34, stiffness: 280, mass: 1 }, // critically damped, no overshoot
} as const;

export type MotionDuration = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;

/** Reanimated `withTiming` config for a duration and curve from the scale. */
export function timing(
  duration: MotionDuration = 'base',
  easing: MotionEasing = 'standard',
): WithTimingConfig {
  const [x1, y1, x2, y2] = motion.easing[easing];
  return { duration: motion.duration[duration], easing: Easing.bezier(x1, y1, x2, y2) };
}
