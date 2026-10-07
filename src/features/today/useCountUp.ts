import { useEffect, useRef, useState } from 'react';

import { useMotion } from '@/theme/useMotion';

import { ROUTINE_DONE_MS } from './logic';

/**
 * A number that counts up to `value` when it grows while on screen (the streak chip after a
 * routine is finished). It jumps when it drops, on first paint, and with Reduce Motion.
 */
export function useCountUp(value: number, duration = ROUTINE_DONE_MS): number {
  const m = useMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value <= start || !m.allowCounting) {
      setShown(value);
      return;
    }
    const began = Date.now();
    let frame = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - began) / duration);
      setShown(Math.round(start + (value - start) * p));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, m.allowCounting]);

  return shown;
}
