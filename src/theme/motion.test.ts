import { motion, timing } from './motion';
import { motionFor } from './useMotion';

describe('motion', () => {
  it('has the scale from DESIGN.md', () => {
    expect(motion.duration).toEqual({ fast: 150, base: 200, slow: 300, reduced: 100 });
    expect(motion.spring).toEqual({ damping: 34, stiffness: 280, mass: 1 });
  });

  it('builds timing configs', () => {
    expect(timing('slow').duration).toBe(300);
    expect(typeof timing('fast', 'enter').easing).not.toBe('undefined');
  });

  it('turns every movement into a 100 ms fade with Reduce Motion', () => {
    const reduced = motionFor(true);
    expect(reduced.timing('slow').duration).toBe(100);
    expect(reduced.allowMovement).toBe(false);
    expect(reduced.allowCounting).toBe(false);
    const normal = motionFor(false);
    expect(normal.timing('slow').duration).toBe(300);
    expect(normal.allowMovement).toBe(true);
  });
});
