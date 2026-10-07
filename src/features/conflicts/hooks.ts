import { queryOptions, useQuery } from '@tanstack/react-query';
import { useSelector } from '@tanstack/react-store';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db';
import { qk } from '@/db/queryKeys';
import { registerPlayerConflicts, type PlayerConflict } from '@/features/routines/playerSlots';
import { useFormat } from '@/i18n/useFormat';
import {
  dayConflicts,
  ingredientInRules,
  ruleTokens,
  weeklyConflicts,
  type ConflictHit,
} from '@/lib/conflicts';
import { appStore } from '@/state/app';

import { conflictData, type ConflictData } from './repo';
import {
  analyseDraft,
  draftInput,
  pairingsFor,
  toTarget,
  type ConflictTarget,
  type DraftRoutine,
} from './warnings';

/**
 * Conflict warnings everywhere they show (task 030): R1 cards, R2 step rows and panel, Today's
 * cards and the player. One cached read of routines, steps, ingredients and rules, with this
 * week's hits worked out once; routine, product, ingredient and rule changes invalidate
 * `qk.conflicts.all`, which refreshes it.
 */

export type { ConflictTarget, DraftRoutine } from './warnings';

export const conflictDataQuery = () =>
  queryOptions({ queryKey: qk.conflicts.input, queryFn: () => conflictData(getDb()) });

export function useConflictData() {
  return useQuery(conflictDataQuery());
}

const NO_TARGETS: readonly ConflictTarget[] = [];

const targetsFor = (data: ConflictData, hits: readonly ConflictHit[], routineId: number) =>
  pairingsFor(hits, routineId).map((p) => toTarget(p, data.input, data.names));

/** A routine's conflicts this week (R1 card tag; mild when every one is mild). */
export function useRoutineConflicts(routineId: number): readonly ConflictTarget[] {
  const data = useConflictData().data;
  return useMemo(
    () => (data ? targetsFor(data, data.weekly, routineId) : NO_TARGETS),
    [data, routineId],
  );
}

/** A routine's conflicts among the steps due on an app day (T1 card tag, T2 steps); never mild. */
export function useDayRoutineConflicts(routineId: number, day: string): readonly ConflictTarget[] {
  const data = useConflictData().data;
  return useMemo(
    () => (data ? targetsFor(data, dayConflicts(data.input, day), routineId) : NO_TARGETS),
    [data, day, routineId],
  );
}

// ─── The routine player (T2) ────────────────────────────────────────────────

function usePlayerConflicts(routineId: number, day: string): readonly PlayerConflict[] {
  const targets = useDayRoutineConflicts(routineId, day);
  return useMemo(() => {
    // One line per step pair, even when several rules match it.
    const seen = new Set<string>();
    const out: PlayerConflict[] = [];
    for (const t of targets) {
      const key = `${t.stepId}|${t.conflict.second.product}|${t.conflict.second.routine}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ stepId: t.stepId, conflict: t.conflict });
    }
    return out;
  }, [targets]);
}

registerPlayerConflicts(usePlayerConflicts);

// ─── The routine editor (R2) ────────────────────────────────────────────────

/** One line of the editor's conflict panel (spec R2). */
export type EditorConflictHit = {
  key: string;
  /** Index of the step in the editor's list that the line is about. */
  stepIndex: number;
  /** An every-few-days step: shown with the "mild" label. */
  mild: boolean;
  /** "Retinol (step 3) × Glycolic acid in Evening B, Tue". */
  text: string;
};

export type EditorConflicts = {
  /** The panel's lines, in step order. */
  hits: EditorConflictHit[];
  /** Step index → what its ConflictTag opens. */
  steps: ReadonlyMap<number, readonly ConflictTarget[]>;
  /** "Evening A is the other evening choice, so it is not compared."; null without one. */
  alternatives: string | null;
};

const NO_EDITOR_CONFLICTS: EditorConflicts = { hits: [], steps: new Map(), alternatives: null };

/**
 * Conflicts between the routine being edited (not saved yet) and every saved routine on the same
 * weekdays, and among its own steps. Updates as the draft changes.
 */
export function useEditorConflicts(draft: DraftRoutine): EditorConflicts {
  const { t } = useTranslation();
  const f = useFormat();
  const today = useSelector(appStore, (s) => s.activeDay);
  const data = useConflictData().data;
  const { id, name, timeOfDay, customName, sortTime, daysOfWeek, steps } = draft;

  const analysis = useMemo(() => {
    if (!data) return null;
    const shown = name.trim() || t('conflicts.editor.thisRoutine');
    const d = draftInput(
      data.input,
      { id, name: shown, timeOfDay, customName, sortTime, daysOfWeek, steps },
      today,
    );
    return analyseDraft(d.input, data.names, weeklyConflicts(d.input), d.routineId, shown);
  }, [data, id, name, timeOfDay, customName, sortTime, daysOfWeek, steps, today, t]);

  return useMemo(() => {
    if (!analysis) return NO_EDITOR_CONFLICTS;
    const hits = analysis.lines.map((l) => ({
      key: l.key,
      stepIndex: l.stepIndex,
      mild: l.mild,
      text:
        l.otherStepIndex === null
          ? t('conflicts.editor.line', {
              own: l.ownToken,
              step: l.stepIndex + 1,
              other: l.otherToken,
              routine: l.otherRoutine,
              days: f.weekdayList(l.weekdays),
            })
          : t('conflicts.editor.lineSame', {
              own: l.ownToken,
              step: l.stepIndex + 1,
              other: l.otherToken,
              otherStep: l.otherStepIndex + 1,
              days: f.weekdayList(l.weekdays),
            }),
    }));
    const alts = analysis.alternatives;
    const time =
      timeOfDay === 'custom'
        ? (customName ?? '').trim()
        : t(`conflicts.editor.timeWord.${timeOfDay}`);
    const alternatives =
      alts.length > 0
        ? t('conflicts.editor.alternatives', {
            count: alts.length,
            names: joinNames(alts, t('today.explain.and')),
            time,
          })
        : null;
    return { hits, steps: analysis.steps, alternatives };
  }, [analysis, t, f, timeOfDay, customName]);
}

/** "A, B and C". */
function joinNames(names: readonly string[], and: string): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${and} ${names.at(-1)}`;
}

// ─── Ingredient chips (P2, P3, P4) ──────────────────────────────────────────

/** Whether an ingredient appears in any conflict rule, itself or through its group (link icon). */
export function useIngredientInRule(): (ingredientId: number) => boolean {
  const data = useConflictData().data;
  const tokens = useMemo(() => (data ? ruleTokens(data.input.rules) : null), [data]);
  return useCallback(
    (ingredientId: number) =>
      tokens !== null &&
      ingredientInRules(tokens, ingredientId, data?.input.ingredientGroup.get(ingredientId)),
    [tokens, data],
  );
}
