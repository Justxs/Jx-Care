import { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { motion } from './motion';

/**
 * Presets for rows that are added or removed: fade in and out while neighbours glide (200 ms).
 * Reanimated drops these under Reduce Motion.
 */
export const rowEntering = FadeIn.duration(motion.duration.base);
export const rowExiting = FadeOut.duration(motion.duration.fast);
export const rowLayout = LinearTransition.duration(motion.duration.base);
