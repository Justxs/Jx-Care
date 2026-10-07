import type { DayRoutine, StepProduct, TodayRoutineGroup } from '@/features/routines/repo';
import type { AppSettings } from '@/features/settings/repo';
import { DAY_ENDS_AT_HOUR } from '@/lib/appDay';
import { motion } from '@/theme/motion';

import type { SetupProgress } from './repo';

/** Pure helpers for Today (T1), kept out of the components so they can be tested on their own. */

export type Greeting = 'morning' | 'afternoon' | 'evening';

/**
 * "Good morning" until 12:00, "Good afternoon" until 18:00, "Good evening" after. App-day aware:
 * 00:00 to 03:59 still belongs to the evening before.
 */
export function greetingFor(now: number | Date): Greeting {
  const hour = new Date(now).getHours();
  if (hour < DAY_ENDS_AT_HOUR) return 'evening';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** The routine a card shows: the one ticked, else the remembered pick, else the first. */
export function chosenRoutine(group: TodayRoutineGroup): DayRoutine {
  return group.routines.find((r) => r.id === group.chosenId) ?? group.routines[0]!;
}

/** Due steps not ticked yet: what All done ticks (and its Undo unticks). */
export function remainingStepIds(r: DayRoutine): number[] {
  const done = new Set(r.log?.doneStepIds ?? []);
  return r.progress.dueStepIds.filter((id) => !done.has(id));
}

/** Expired products in the routine's steps due today, each named once. */
export function expiredProducts(r: DayRoutine): StepProduct[] {
  const out = new Map<number, StepProduct>();
  for (const step of r.dueSteps) {
    if (step.product?.problem === 'expired') out.set(step.product.id, step.product);
  }
  return [...out.values()];
}

/** The card whose Start gets the one filled button: the first time of day not finished. */
export function firstUnfinishedKey(groups: readonly TodayRoutineGroup[]): string | null {
  return groups.find((g) => !g.complete)?.key ?? null;
}

// ─── First-run card ─────────────────────────────────────────────────────────

export const SETUP_STEPS = ['product', 'routine', 'hair'] as const;
export type SetupStepKey = (typeof SETUP_STEPS)[number];

export type SetupView = {
  /** The card shows at all. */
  visible: boolean;
  /** "Set up Jx-Care" with its rows, or "You're set" once all three are done. */
  mode: 'progress' | 'set';
  done: number;
  total: number;
  /** The step opened up with the filled button. */
  next: SetupStepKey | null;
  /** All three are done and `setupDoneAt` is not saved yet: save today. */
  saveDoneAt: boolean;
};

/**
 * The first-run card from data: shown until hidden (`setupHiddenAt`, Hide and See today) or until
 * the app day after all three steps were done (`setupDoneAt`).
 */
export function setupView(
  progress: SetupProgress,
  settings: Pick<AppSettings, 'setupDoneAt' | 'setupHiddenAt'>,
  today: string,
): SetupView {
  const done = SETUP_STEPS.filter((k) => progress[k] !== null).length;
  const allDone = done === SETUP_STEPS.length;
  const hidden = settings.setupHiddenAt !== null;
  const expired = settings.setupDoneAt !== null && settings.setupDoneAt < today;
  return {
    visible: !hidden && !expired,
    mode: allDone ? 'set' : 'progress',
    done,
    total: SETUP_STEPS.length,
    next: SETUP_STEPS.find((k) => progress[k] === null) ?? null,
    saveDoneAt: allDone && !hidden && settings.setupDoneAt === null,
  };
}

// ─── Sections ───────────────────────────────────────────────────────────────

export type SectionKey = 'setup' | 'routines' | 'expiring' | 'hair' | 'checkIn';

/**
 * Today's sections top to bottom, each left out when empty. While any product is expired,
 * Expiring soon sits directly under the routine cards; otherwise it comes after Hair due.
 */
export function sectionOrder(p: {
  setup: boolean;
  routines: boolean;
  expiring: boolean;
  anyExpired: boolean;
  hair: boolean;
  checkIn: boolean;
}): SectionKey[] {
  const out: SectionKey[] = [];
  if (p.setup) out.push('setup');
  if (p.routines) out.push('routines');
  if (p.expiring && p.anyExpired) out.push('expiring');
  if (p.hair) out.push('hair');
  if (p.expiring && !p.anyExpired) out.push('expiring');
  if (p.checkIn) out.push('checkIn');
  return out;
}

/** Spec Motion: a finished routine card collapses to its done row in 250 ms. */
export const ROUTINE_DONE_MS = 250;

/** How a finished card turns into its done row: a collapse, or a short fade with Reduce Motion. */
export function doneTransition(reduced: boolean): { kind: 'collapse' | 'fade'; duration: number } {
  return reduced
    ? { kind: 'fade', duration: motion.duration.reduced }
    : { kind: 'collapse', duration: ROUTINE_DONE_MS };
}
