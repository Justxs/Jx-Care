import { useMemo } from 'react';

import { useThemeColors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { useMotion } from '@/theme/useMotion';

/**
 * Options for every stack: our own ScreenHeader, the canvas behind screens (no white flash),
 * native push animations with gesture back, and 100 ms fades under Reduce Motion.
 */
export function useStackOptions() {
  const colors = useThemeColors();
  const m = useMotion();
  return useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.canvas },
      gestureEnabled: true,
      ...(m.reduced
        ? { animation: 'fade' as const, animationDuration: motion.duration.reduced }
        : { animation: 'default' as const }),
    }),
    [colors.canvas, m.reduced],
  );
}

/** Full-screen flows (product form, player, camera): slide up 300 ms; a fade under Reduce Motion. */
export function useFullScreenModalOptions() {
  const m = useMotion();
  return useMemo(
    () => ({
      presentation: 'fullScreenModal' as const,
      animation: m.reduced ? ('fade' as const) : ('slide_from_bottom' as const),
      animationDuration: m.reduced ? motion.duration.reduced : motion.duration.slow,
    }),
    [m.reduced],
  );
}
