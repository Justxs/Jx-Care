import type { Streak } from '@/lib/streak';

import type { DayRoutine, RoutineStepItem, StepProduct } from './repo';

/** Pure helpers for the routine player and the Routine done screen (spec T2). */

/** Whole seconds left until `endsAt`, never below 0 ("0:42" rounds up, so 0:00 means done). */
export function remainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** "Step 2 of 5": the first step not ticked yet, or the last one once every step is ticked. */
export function stepCounter(progress: { due: number; done: number }): {
  index: number;
  count: number;
} {
  return { index: Math.max(1, Math.min(progress.done + 1, progress.due)), count: progress.due };
}

/**
 * The step a running wait holds back: the first unticked step after the one that started the
 * wait, or else the first unticked step anywhere. Null when every other step is ticked.
 */
export function heldStepId(
  steps: readonly Pick<RoutineStepItem, 'id'>[],
  doneIds: readonly number[],
  afterStepId: number,
): number | null {
  const done = new Set(doneIds);
  const at = steps.findIndex((s) => s.id === afterStepId);
  const open = (s: Pick<RoutineStepItem, 'id'>) => !done.has(s.id) && s.id !== afterStepId;
  return (steps.slice(at + 1).find(open) ?? steps.find(open))?.id ?? null;
}

/** Why a step shows as a card instead of a row (refinement 11), or null for a normal row. */
export type StepProblem = 'expired' | 'finished' | 'empty';

export function stepProblem(step: Pick<RoutineStepItem, 'product'>): StepProblem | null {
  if (!step.product) return 'empty';
  return step.product.problem;
}

/** The list as the player lays it out: runs of plain rows share a card; a problem step is its own. */
export type PlayerSegment =
  | { kind: 'rows'; steps: RoutineStepItem[] }
  | { kind: 'problem'; step: RoutineStepItem; problem: StepProblem };

export function playerSegments(steps: readonly RoutineStepItem[]): PlayerSegment[] {
  const out: PlayerSegment[] = [];
  for (const step of steps) {
    const problem = stepProblem(step);
    if (problem) {
      out.push({ kind: 'problem', step, problem });
      continue;
    }
    const last = out.at(-1);
    if (last?.kind === 'rows') last.steps.push(step);
    else out.push({ kind: 'rows', steps: [step] });
  }
  return out;
}

/** Due steps not ticked yet: what All done ticks. */
export function remainingIds(r: Pick<DayRoutine, 'progress' | 'log'>): number[] {
  const done = new Set(r.log?.doneStepIds ?? []);
  return r.progress.dueStepIds.filter((id) => !done.has(id));
}

/** The streak broke since its best run: the card reads "Started again. Your best is still …". */
export function streakRestarted(streak: Streak): boolean {
  return streak.best > streak.current;
}

/** Expired or finished products in the steps due today, each named once (done screen). */
export function attentionProducts(r: Pick<DayRoutine, 'dueSteps'>): StepProduct[] {
  const out = new Map<number, StepProduct>();
  for (const step of r.dueSteps) {
    if (step.product?.problem) out.set(step.product.id, step.product);
  }
  return [...out.values()];
}

// ─── What comes next ────────────────────────────────────────────────────────

/** A time of day on one app day, as "what comes next" needs it. */
export type NextGroup = {
  key: string;
  timeOfDay: DayRoutine['timeOfDay'];
  customName: string | null;
  routineIds: readonly number[];
  complete: boolean;
  /** The chosen routine's reminder time, else its sort time ("07:30"). */
  time: string;
};

export type NextUp = Pick<NextGroup, 'timeOfDay' | 'customName' | 'time'> & { day: string };

/**
 * "Next: Morning · Tomorrow at 07:30": the first time of day after the finished routine's own
 * that isn't done yet today, else the first one due on a later day. `days[0]` is today.
 */
export function pickNextUp(
  days: readonly { day: string; groups: readonly NextGroup[] }[],
  routineId: number,
): NextUp | null {
  for (const [i, { day, groups }] of days.entries()) {
    let candidates = groups;
    if (i === 0) {
      const own = groups.findIndex((g) => g.routineIds.includes(routineId));
      candidates = groups.slice(own + 1).filter((g) => !g.complete);
    }
    const next = candidates[0];
    if (next) {
      return { day, timeOfDay: next.timeOfDay, customName: next.customName, time: next.time };
    }
  }
  return null;
}
