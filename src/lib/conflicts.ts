import { weekdayOf } from './appDay';
import {
  routineRunsOn,
  stepScheduleAllows,
  timeOfDayKey,
  todayGroups,
  type RoutineChoiceLite,
  type RoutineLite,
  type StepLite,
} from './schedule';

/** Ingredient conflicts across the whole day (spec R2, T2, S3; refinements 3 and 5). */

export type Token = `i:${number}` | `g:${number}`;

export type RuleLite = {
  id: number;
  leftKind: 'ingredient' | 'group';
  leftId: number;
  rightKind: 'ingredient' | 'group';
  rightId: number;
};

export type ConflictInput = {
  routines: readonly RoutineLite[];
  steps: readonly StepLite[];
  /** productId → ingredient ids */
  productIngredients: ReadonlyMap<number, readonly number[]>;
  /** ingredientId → group id */
  ingredientGroup: ReadonlyMap<number, number | null>;
  rules: readonly RuleLite[];
};

export type ConflictSide = { routineId: number; stepId: number; productId: number; token: Token };

export type ConflictHit = {
  ruleId: number;
  weekday: number;
  a: ConflictSide;
  b: ConflictSide;
  mild: boolean;
};

export const tokenOf = (kind: 'ingredient' | 'group', id: number): Token =>
  kind === 'ingredient' ? `i:${id}` : `g:${id}`;

export function parseToken(token: Token): { kind: 'ingredient' | 'group'; id: number } {
  return { kind: token.startsWith('i:') ? 'ingredient' : 'group', id: Number(token.slice(2)) };
}

/** Every ingredient token of a product plus the token of each ingredient's group. */
export function productTokens(
  productId: number,
  input: Pick<ConflictInput, 'productIngredients' | 'ingredientGroup'>,
): Set<Token> {
  const tokens = new Set<Token>();
  for (const ingId of input.productIngredients.get(productId) ?? []) {
    tokens.add(`i:${ingId}`);
    const g = input.ingredientGroup.get(ingId);
    if (g != null) tokens.add(`g:${g}`);
  }
  return tokens;
}

/** A has one side and B the other (either way round); returns the matched tokens. */
export function ruleMatches(
  rule: RuleLite,
  tokensA: ReadonlySet<Token>,
  tokensB: ReadonlySet<Token>,
): { aToken: Token; bToken: Token } | null {
  const left = tokenOf(rule.leftKind, rule.leftId);
  const right = tokenOf(rule.rightKind, rule.rightId);
  if (tokensA.has(left) && tokensB.has(right)) return { aToken: left, bToken: right };
  if (tokensA.has(right) && tokensB.has(left)) return { aToken: right, bToken: left };
  return null;
}

/** A step that can be due on a weekday (interval steps may land on it). */
function stepCanBeDueOnWeekday(step: StepLite, weekday: number): boolean {
  if (step.scheduleKind === 'days') return (step.daysOfWeek ?? []).includes(weekday);
  return true;
}

type Candidate = { step: StepLite & { productId: number }; routine: RoutineLite; key: string };

function pairHits(
  candidates: readonly Candidate[],
  input: ConflictInput,
  weekday: number,
  exact: boolean,
): ConflictHit[] {
  const hits: ConflictHit[] = [];
  const tokenCache = new Map<number, Set<Token>>();
  const tokens = (productId: number) => {
    let t = tokenCache.get(productId);
    if (!t) {
      t = productTokens(productId, input);
      tokenCache.set(productId, t);
    }
    return t;
  };
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const x = candidates[i]!;
      const y = candidates[j]!;
      if (x.step.productId === y.step.productId) continue;
      // A/B routines at one time of day are alternatives: never compared with each other.
      if (x.routine.id !== y.routine.id && x.key === y.key) continue;
      const tx = tokens(x.step.productId);
      const ty = tokens(y.step.productId);
      for (const rule of input.rules) {
        const m = ruleMatches(rule, tx, ty);
        if (!m) continue;
        hits.push({
          ruleId: rule.id,
          weekday,
          a: {
            routineId: x.routine.id,
            stepId: x.step.id,
            productId: x.step.productId,
            token: m.aToken,
          },
          b: {
            routineId: y.routine.id,
            stepId: y.step.id,
            productId: y.step.productId,
            token: m.bToken,
          },
          mild:
            !exact && (x.step.scheduleKind === 'interval' || y.step.scheduleKind === 'interval'),
        });
      }
    }
  }
  return hits;
}

function sortedCandidates(
  input: ConflictInput,
  include: (step: StepLite, routine: RoutineLite) => boolean,
): Candidate[] {
  const routineById = new Map(input.routines.map((r) => [r.id, r]));
  const out: Candidate[] = [];
  for (const step of input.steps) {
    if (step.productId == null) continue;
    const routine = routineById.get(step.routineId);
    if (!routine || !routine.active) continue;
    if (!include(step, routine)) continue;
    out.push({
      step: step as StepLite & { productId: number },
      routine,
      key: timeOfDayKey(routine),
    });
  }
  return out.sort(
    (a, b) =>
      a.routine.sortTime.localeCompare(b.routine.sortTime) ||
      a.routine.id - b.routine.id ||
      a.step.position - b.step.position,
  );
}

/** Conflicts for every weekday among steps that can be due that day (sequence 5). */
export function weeklyConflicts(input: ConflictInput): ConflictHit[] {
  const hits: ConflictHit[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    const candidates = sortedCandidates(
      input,
      (step, routine) =>
        routine.daysOfWeek.includes(weekday) && stepCanBeDueOnWeekday(step, weekday),
    );
    hits.push(...pairHits(candidates, input, weekday, false));
  }
  return hits;
}

/**
 * Conflicts among steps actually due on a date (player and Today); never mild. Of the A/B options
 * at one time of day only the one picked for that day counts, as Today shows it: the weekday's
 * remembered choice, else the first. `shownId`, the routine a card or the player shows, counts as
 * picked at its own time of day.
 */
export function dayConflicts(
  input: ConflictInput,
  day: string,
  choices: readonly RoutineChoiceLite[] = [],
  shownId?: number,
): ConflictHit[] {
  const picked = new Set(
    todayGroups(input.routines, input.steps, day, choices).map(
      (g) => g.routines.find((r) => r.id === shownId)?.id ?? g.chosenId,
    ),
  );
  const candidates = sortedCandidates(
    input,
    (step, routine) =>
      picked.has(routine.id) && routineRunsOn(routine, day) && stepScheduleAllows(step, day),
  );
  return pairHits(candidates, input, weekdayOf(day), true);
}

export type ConflictSummaryLine = {
  ruleId: number;
  own: ConflictSide;
  other: ConflictSide;
  weekdays: number[];
  mild: boolean;
};

export type ConflictSummary = { lines: ConflictSummaryLine[]; alternatives: number[] };

/**
 * Hits involving one routine, merged by rule and step pair with their weekdays (R2 panel). A line
 * is mild when every merged hit is mild. `alternatives` are the other routines at the same time
 * of day sharing a weekday, which are never compared with this one.
 */
export function routineConflictSummary(
  hits: readonly ConflictHit[],
  routineId: number,
  routines: readonly RoutineLite[] = [],
): ConflictSummary {
  const merged = new Map<string, ConflictSummaryLine>();
  for (const hit of hits) {
    let own: ConflictSide;
    let other: ConflictSide;
    if (hit.a.routineId === routineId) {
      own = hit.a;
      other = hit.b;
    } else if (hit.b.routineId === routineId) {
      own = hit.b;
      other = hit.a;
    } else continue;
    const key = `${hit.ruleId}|${own.stepId}|${other.stepId}`;
    const line = merged.get(key);
    if (line) {
      if (!line.weekdays.includes(hit.weekday)) line.weekdays.push(hit.weekday);
      line.mild = line.mild && hit.mild;
    } else {
      merged.set(key, { ruleId: hit.ruleId, own, other, weekdays: [hit.weekday], mild: hit.mild });
    }
  }
  const lines = [...merged.values()].map((l) => ({
    ...l,
    weekdays: [...l.weekdays].sort((a, b) => a - b),
  }));

  const me = routines.find((r) => r.id === routineId);
  const alternatives = me
    ? routines
        .filter(
          (r) =>
            r.id !== routineId &&
            r.active &&
            timeOfDayKey(r) === timeOfDayKey(me) &&
            r.daysOfWeek.some((d) => me.daysOfWeek.includes(d)),
        )
        .map((r) => r.id)
    : [];
  return { lines, alternatives };
}

/** Rule id → the routines it fires in (either side), for "In 2 routines" (S3). */
export function routinesPerRule(hits: readonly ConflictHit[]): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  for (const h of hits) {
    let set = out.get(h.ruleId);
    if (!set) {
      set = new Set();
      out.set(h.ruleId, set);
    }
    set.add(h.a.routineId);
    set.add(h.b.routineId);
  }
  return out;
}

/**
 * The input with one routine and its steps swapped for an unsaved draft (the R2 editor's live
 * panel). A routine id not in the input adds the draft as a new routine.
 */
export function withDraftRoutine(
  input: ConflictInput,
  draft: RoutineLite,
  steps: readonly StepLite[],
): ConflictInput {
  return {
    ...input,
    routines: [...input.routines.filter((r) => r.id !== draft.id), draft],
    steps: [...input.steps.filter((s) => s.routineId !== draft.id), ...steps],
  };
}

/** Every ingredient and group token named on either side of a rule. */
export function ruleTokens(rules: readonly RuleLite[]): Set<Token> {
  const tokens = new Set<Token>();
  for (const r of rules) {
    tokens.add(tokenOf(r.leftKind, r.leftId));
    tokens.add(tokenOf(r.rightKind, r.rightId));
  }
  return tokens;
}

/** An ingredient appears in a rule, by itself or through its group (the chips' link icon). */
export function ingredientInRules(
  tokens: ReadonlySet<Token>,
  ingredientId: number,
  groupId: number | null | undefined,
): boolean {
  return tokens.has(`i:${ingredientId}`) || (groupId != null && tokens.has(`g:${groupId}`));
}
