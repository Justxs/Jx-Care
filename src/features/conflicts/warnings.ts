import type { ConflictExplain } from '@/components/ExplainSheet';
import {
  parseToken,
  routineConflictSummary,
  withDraftRoutine,
  type ConflictHit,
  type ConflictInput,
  type ConflictSide,
  type Token,
} from '@/lib/conflicts';
import type { RoutineLite, StepLite } from '@/lib/schedule';

import type { ConflictNames } from './repo';

/**
 * Turns conflict hits (src/lib/conflicts.ts) into what the warnings show: tags per routine or
 * step, the explain sheets' data and the editor panel's lines. No React, no database.
 */

/** One rule meeting between a step of a routine (`own`) and another step (`other`). */
export type Pairing = {
  ruleId: number;
  own: ConflictSide;
  other: ConflictSide;
  /** ISO weekdays they meet on. */
  weekdays: number[];
  /** Every merged hit was mild (an every-few-days step). */
  mild: boolean;
};

/** What a ConflictTag opens: the conflict sheet, or for a mild one the Mild conflict sheet. */
export type ConflictTarget = {
  ruleId: number;
  /** The step of this routine that carries the tag. */
  stepId: number;
  mild: boolean;
  conflict: ConflictExplain;
  /** The every-few-days step, for "Retinol serum runs every 3 days". */
  mildStep: { product: string; everyNDays: number } | null;
};

/**
 * The hits a routine is part of, merged by rule and step pair with their weekdays. A pair inside
 * the routine itself is listed from both steps, so both carry a tag.
 */
export function pairingsFor(hits: readonly ConflictHit[], routineId: number): Pairing[] {
  const merged = new Map<string, Pairing>();
  const add = (hit: ConflictHit, own: ConflictSide, other: ConflictSide) => {
    const key = `${hit.ruleId}|${own.stepId}|${other.stepId}`;
    const p = merged.get(key);
    if (p) {
      if (!p.weekdays.includes(hit.weekday)) p.weekdays.push(hit.weekday);
      p.mild = p.mild && hit.mild;
    } else {
      merged.set(key, { ruleId: hit.ruleId, own, other, weekdays: [hit.weekday], mild: hit.mild });
    }
  };
  for (const hit of hits) {
    if (hit.a.routineId === routineId) add(hit, hit.a, hit.b);
    if (hit.b.routineId === routineId) add(hit, hit.b, hit.a);
  }
  return [...merged.values()].map((p) => ({
    ...p,
    weekdays: [...p.weekdays].sort((a, b) => a - b),
  }));
}

/** An ingredient's or group's name. */
export function tokenName(token: Token, names: ConflictNames): string {
  const { kind, id } = parseToken(token);
  return (kind === 'ingredient' ? names.ingredients : names.groups).get(id) ?? '';
}

/** A rule's note as a sentence ("Can cause flushing."), for the sheet and the player's line. */
export function asSentence(note: string | null | undefined): string | null {
  const s = (note ?? '').trim();
  if (!s) return null;
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

function interval(step: StepLite | undefined): number | null {
  return step?.scheduleKind === 'interval' && step.everyNDays ? step.everyNDays : null;
}

/** The sheet data for a pairing. `routineName` overrides names (the editor's unsaved routine). */
export function toTarget(
  p: Pairing,
  input: ConflictInput,
  names: ConflictNames,
  routineName: (id: number) => string | undefined = () => undefined,
): ConflictTarget {
  const routineOf = (id: number) =>
    routineName(id) ?? input.routines.find((r) => r.id === id)?.name ?? '';
  const side = (s: ConflictSide) => ({
    product: names.products.get(s.productId) ?? '',
    routine: routineOf(s.routineId),
  });
  const ownStep = input.steps.find((s) => s.id === p.own.stepId);
  const otherStep = input.steps.find((s) => s.id === p.other.stepId);
  const ownEvery = interval(ownStep);
  const otherEvery = interval(otherStep);
  const mildStep =
    ownEvery !== null
      ? { product: names.products.get(p.own.productId) ?? '', everyNDays: ownEvery }
      : otherEvery !== null
        ? { product: names.products.get(p.other.productId) ?? '', everyNDays: otherEvery }
        : null;
  return {
    ruleId: p.ruleId,
    stepId: p.own.stepId,
    mild: p.mild,
    conflict: {
      first: side(p.own),
      second: side(p.other),
      weekdays: p.weekdays,
      note: asSentence(names.notes.get(p.ruleId)),
      mild: p.mild,
    },
    mildStep,
  };
}

/** Which sheet a tag with these targets opens: the first full conflict, else the Mild sheet. */
export function sheetFor(
  targets: readonly ConflictTarget[],
):
  | { kind: 'conflict'; conflict: ConflictExplain }
  | { kind: 'mild'; step: ConflictTarget['mildStep'] }
  | null {
  if (targets.length === 0) return null;
  const full = targets.find((t) => !t.mild);
  if (full) return { kind: 'conflict', conflict: full.conflict };
  return { kind: 'mild', step: targets[0]!.mildStep };
}

// ─── The R2 editor's unsaved draft ──────────────────────────────────────────

/** The editor's form values that conflicts depend on. */
export type DraftStep = {
  productId: number | null;
  scheduleKind: StepLite['scheduleKind'];
  daysOfWeek: number[] | null;
  everyNDays: number | string | null;
  startDate: string | null;
};

export type DraftRoutine = Pick<RoutineLite, 'name' | 'timeOfDay' | 'customName' | 'daysOfWeek'> & {
  /** The saved routine being edited; null for a new one. */
  id: number | null;
  sortTime?: string;
  steps: readonly DraftStep[];
};

/** The id a new routine stands in with; never a real row id. */
export const DRAFT_ROUTINE_ID = -1;

/** Draft step ids are negative (−1 for the first step), so they never clash with saved ones. */
export const draftStepId = (index: number) => -(index + 1);
export const draftStepIndex = (stepId: number) => -stepId - 1;

const toInt = (v: number | string | null): number | null => {
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** The conflict input with the draft in place of the saved routine (or added, when new). */
export function draftInput(
  input: ConflictInput,
  draft: DraftRoutine,
  createdDay: string,
): { input: ConflictInput; routineId: number } {
  const routineId = draft.id ?? DRAFT_ROUTINE_ID;
  const saved = input.routines.find((r) => r.id === routineId);
  const routine: RoutineLite = {
    id: routineId,
    name: draft.name,
    timeOfDay: draft.timeOfDay,
    customName: draft.timeOfDay === 'custom' ? (draft.customName ?? '').trim() || null : null,
    sortTime: draft.sortTime ?? saved?.sortTime ?? '00:00',
    daysOfWeek: [...draft.daysOfWeek],
    // A switched-off routine has no conflicts, the same as on R1.
    active: saved?.active ?? true,
    createdDay: saved?.createdDay ?? createdDay,
  };
  const steps: StepLite[] = draft.steps.map((s, i) => ({
    id: draftStepId(i),
    routineId,
    productId: s.productId,
    position: i,
    scheduleKind: s.scheduleKind,
    daysOfWeek: s.daysOfWeek,
    everyNDays: toInt(s.everyNDays),
    startDate: s.startDate,
  }));
  return { input: withDraftRoutine(input, routine, steps), routineId };
}

/** One panel line before wording: the step, the other side and where they meet. */
export type EditorLine = {
  key: string;
  ruleId: number;
  stepIndex: number;
  ownToken: string;
  otherToken: string;
  /** The other step's index when it is in the same routine. */
  otherStepIndex: number | null;
  otherRoutine: string;
  weekdays: number[];
  mild: boolean;
};

export type EditorAnalysis = {
  lines: EditorLine[];
  /** Step index → what its tag opens (every pairing of that step). */
  steps: Map<number, ConflictTarget[]>;
  /** Names of the other routines at this time of day, never compared with this one. */
  alternatives: string[];
};

/** The R2 panel and step tags for an unsaved draft against every saved routine. */
export function analyseDraft(
  input: ConflictInput,
  names: ConflictNames,
  hits: readonly ConflictHit[],
  routineId: number,
  draftName: string,
): EditorAnalysis {
  const pairings = pairingsFor(hits, routineId);
  const routineName = (id: number) => (id === routineId ? draftName : undefined);
  const steps = new Map<number, ConflictTarget[]>();
  const lines: EditorLine[] = [];
  const seen = new Set<string>();
  for (const p of pairings) {
    const stepIndex = draftStepIndex(p.own.stepId);
    const list = steps.get(stepIndex) ?? [];
    list.push(toTarget(p, input, names, routineName));
    steps.set(stepIndex, list);

    const inside = p.other.routineId === routineId;
    // A pair inside the routine is one line, not one from each step.
    const pairKey = `${p.ruleId}|${[p.own.stepId, p.other.stepId].sort().join('|')}`;
    if (inside && seen.has(pairKey)) continue;
    seen.add(pairKey);
    lines.push({
      key: `${p.ruleId}|${p.own.stepId}|${p.other.stepId}`,
      ruleId: p.ruleId,
      stepIndex,
      ownToken: tokenName(p.own.token, names),
      otherToken: tokenName(p.other.token, names),
      otherStepIndex: inside ? draftStepIndex(p.other.stepId) : null,
      otherRoutine: inside
        ? draftName
        : (input.routines.find((r) => r.id === p.other.routineId)?.name ?? ''),
      weekdays: p.weekdays,
      mild: p.mild,
    });
  }
  lines.sort((a, b) => a.stepIndex - b.stepIndex || a.ruleId - b.ruleId);
  const { alternatives } = routineConflictSummary([], routineId, input.routines);
  return {
    lines,
    steps,
    alternatives: alternatives.map((id) => input.routines.find((r) => r.id === id)?.name ?? ''),
  };
}
