import {
  dayConflicts,
  ingredientInRules,
  parseToken,
  productTokens,
  routineConflictSummary,
  routinesPerRule,
  ruleMatches,
  ruleTokens,
  weeklyConflicts,
  withDraftRoutine,
  type ConflictInput,
  type RuleLite,
} from './conflicts';
import type { RoutineLite, StepLite } from './schedule';

const routine = (o: Partial<RoutineLite> & { id: number }): RoutineLite => ({
  name: `R${o.id}`,
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  active: true,
  createdDay: '2026-01-01',
  ...o,
});
const step = (
  id: number,
  routineId: number,
  productId: number,
  o: Partial<StepLite> = {},
): StepLite => ({
  id,
  routineId,
  productId,
  position: id,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  ...o,
});

// Ingredients: 1 retinol (group 10 retinoids), 2 glycolic acid (group 20 acids), 3 water,
// 4 salicylic acid (group 20). Products: 100 retinol serum, 200 AHA toner, 300 BHA, 400 water mist.
const productIngredients = new Map<number, number[]>([
  [100, [1, 3]],
  [200, [2, 3]],
  [300, [4]],
  [400, [3]],
]);
const ingredientGroup = new Map<number, number | null>([
  [1, 10],
  [2, 20],
  [3, null],
  [4, 20],
]);
const retinolVsGlycolic: RuleLite = {
  id: 1,
  leftKind: 'ingredient',
  leftId: 1,
  rightKind: 'ingredient',
  rightId: 2,
};
const retinoidsVsAcids: RuleLite = {
  id: 2,
  leftKind: 'group',
  leftId: 10,
  rightKind: 'group',
  rightId: 20,
};

const input = (o: Partial<ConflictInput>): ConflictInput => ({
  routines: [],
  steps: [],
  productIngredients,
  ingredientGroup,
  rules: [retinolVsGlycolic],
  ...o,
});

describe('tokens and rules', () => {
  it('collects ingredient and group tokens', () => {
    expect([...productTokens(100, input({}))].sort()).toEqual(['g:10', 'i:1', 'i:3']);
    expect(productTokens(999, input({})).size).toBe(0);
    expect(parseToken('g:10')).toEqual({ kind: 'group', id: 10 });
    expect(parseToken('i:3')).toEqual({ kind: 'ingredient', id: 3 });
  });
  it('matches either way round', () => {
    const a = productTokens(100, input({}));
    const b = productTokens(200, input({}));
    expect(ruleMatches(retinolVsGlycolic, a, b)).toEqual({ aToken: 'i:1', bToken: 'i:2' });
    expect(ruleMatches(retinolVsGlycolic, b, a)).toEqual({ aToken: 'i:2', bToken: 'i:1' });
    expect(ruleMatches(retinolVsGlycolic, a, a)).toBeNull();
  });
});

describe('weeklyConflicts', () => {
  const eveA = routine({ id: 1, name: 'Evening A', daysOfWeek: [1] });
  const morning = routine({ id: 2, timeOfDay: 'morning', sortTime: '07:00', daysOfWeek: [1, 2] });

  it('finds retinol in Evening A (Mon) against AHA in Morning (Mon)', () => {
    const hits = weeklyConflicts(
      input({ routines: [eveA, morning], steps: [step(1, 1, 100), step(2, 2, 200)] }),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ ruleId: 1, weekday: 1, mild: false });
    // Sides follow the day's order: Morning first.
    expect(hits[0]).toMatchObject({
      a: { routineId: 2, productId: 200 },
      b: { routineId: 1, productId: 100 },
    });
  });

  it('does not flag the same products on different weekdays', () => {
    const m = { ...morning, daysOfWeek: [2] };
    expect(
      weeklyConflicts(input({ routines: [eveA, m], steps: [step(1, 1, 100), step(2, 2, 200)] })),
    ).toEqual([]);
  });

  it('matches a group rule through an ingredient in that group', () => {
    const hits = weeklyConflicts(
      input({
        routines: [eveA],
        steps: [step(1, 1, 100), step(2, 1, 300)],
        rules: [retinoidsVsAcids],
      }),
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]!.a.token).toBe('g:10');
    expect(hits[0]!.b.token).toBe('g:20');
  });

  it('marks interval steps as mild', () => {
    const hits = weeklyConflicts(
      input({
        routines: [eveA],
        steps: [
          step(1, 1, 100),
          step(2, 1, 200, { scheduleKind: 'interval', everyNDays: 3, startDate: '2026-10-05' }),
        ],
      }),
    );
    expect(hits[0]!.mild).toBe(true);
  });

  it('never puts a product in conflict with itself', () => {
    const self: RuleLite = {
      id: 3,
      leftKind: 'ingredient',
      leftId: 1,
      rightKind: 'ingredient',
      rightId: 3,
    };
    const hits = weeklyConflicts(
      input({ routines: [eveA], steps: [step(1, 1, 100), step(2, 1, 100)], rules: [self] }),
    );
    expect(hits).toEqual([]);
  });

  it('respects set-day steps and skips empty steps and inactive routines', () => {
    const r = routine({ id: 1 });
    const hits = weeklyConflicts(
      input({
        routines: [r, routine({ id: 5, timeOfDay: 'morning', active: false })],
        steps: [
          step(1, 1, 100, { scheduleKind: 'days', daysOfWeek: [3] }),
          step(2, 1, 200),
          { ...step(3, 1, 0), productId: null },
          step(4, 5, 200),
        ],
      }),
    );
    expect(hits.map((h) => h.weekday)).toEqual([3]);
  });

  it('never compares Evening A and Evening B, but compares each with Morning', () => {
    const a = routine({ id: 1, name: 'Evening A' });
    const b = routine({ id: 2, name: 'Evening B' });
    const m = routine({ id: 3, timeOfDay: 'morning', sortTime: '07:00' });
    const hits = weeklyConflicts(
      input({
        routines: [a, b, m],
        steps: [step(1, 1, 100), step(2, 2, 200), step(3, 3, 200)],
      }),
    );
    const pairs = new Set(hits.map((h) => [h.a.routineId, h.b.routineId].sort().join('-')));
    expect(pairs).toEqual(new Set(['1-3']));
    const summary = routineConflictSummary(hits, 1, [a, b, m]);
    expect(summary.alternatives).toEqual([2]);
    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]!.weekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(summary.lines[0]!.own.routineId).toBe(1);
    expect(summary.lines[0]!.other.routineId).toBe(3);
    const fromMorning = routineConflictSummary(hits, 3, [a, b, m]);
    expect(fromMorning.lines[0]!.own.routineId).toBe(3);
    expect(routineConflictSummary(hits, 99).lines).toEqual([]);
  });

  it('checks a draft routine by passing it in place of the saved one', () => {
    const saved = routine({ id: 1, daysOfWeek: [1] });
    const m = routine({ id: 2, timeOfDay: 'morning', sortTime: '07:00', daysOfWeek: [2] });
    const steps = [step(1, 1, 100), step(2, 2, 200)];
    expect(weeklyConflicts(input({ routines: [saved, m], steps }))).toEqual([]);
    const draft = { ...saved, daysOfWeek: [1, 2] };
    const hits = weeklyConflicts(input({ routines: [draft, m], steps }));
    expect(hits.map((h) => h.weekday)).toEqual([2]);
  });

  it('merges mild lines in the summary only when every hit is mild', () => {
    const r = routine({ id: 1 });
    const hits = weeklyConflicts(
      input({
        routines: [r],
        steps: [
          step(1, 1, 100),
          step(2, 1, 200, { scheduleKind: 'interval', everyNDays: 2, startDate: '2026-10-05' }),
        ],
      }),
    );
    expect(routineConflictSummary(hits, 1, [r]).lines[0]!.mild).toBe(true);
  });
});

describe('dayConflicts', () => {
  it('uses exact interval maths and is never mild', () => {
    const r = routine({ id: 1 });
    const steps = [
      step(1, 1, 100),
      step(2, 1, 200, { scheduleKind: 'interval', everyNDays: 3, startDate: '2026-10-05' }),
    ];
    expect(dayConflicts(input({ routines: [r], steps }), '2026-10-05')).toHaveLength(1);
    expect(dayConflicts(input({ routines: [r], steps }), '2026-10-05')[0]!.mild).toBe(false);
    expect(dayConflicts(input({ routines: [r], steps }), '2026-10-06')).toEqual([]);
  });
  it('skips A/B alternatives', () => {
    const a = routine({ id: 1 });
    const b = routine({ id: 2 });
    expect(
      dayConflicts(
        input({ routines: [a, b], steps: [step(1, 1, 100), step(2, 2, 200)] }),
        '2026-10-05',
      ),
    ).toEqual([]);
  });
});

describe('routinesPerRule', () => {
  it('collects the routines each rule fires in, never counting A/B alternates', () => {
    const hits = weeklyConflicts(
      input({
        routines: [
          routine({ id: 1, timeOfDay: 'morning', sortTime: '07:00' }),
          routine({ id: 2 }),
          routine({ id: 3 }),
        ],
        // Retinol in the morning, glycolic in evening A; evening B holds salicylic only.
        steps: [step(1, 1, 100), step(2, 2, 200), step(3, 3, 300)],
        rules: [retinolVsGlycolic, retinoidsVsAcids, { ...retinolVsGlycolic, id: 3, rightId: 99 }],
      }),
    );
    const perRule = routinesPerRule(hits);
    expect([...(perRule.get(1) ?? [])].sort()).toEqual([1, 2]);
    expect([...(perRule.get(2) ?? [])].sort()).toEqual([1, 2, 3]);
    // Rule 3 names an ingredient no product has.
    expect(perRule.get(3)).toBeUndefined();
  });
});

describe('withDraftRoutine', () => {
  const eveA = routine({ id: 1, name: 'Evening A', daysOfWeek: [1] });
  const morning = routine({ id: 2, timeOfDay: 'morning', sortTime: '07:00', daysOfWeek: [1] });

  it('checks the unsaved steps in place of the saved ones', () => {
    const saved = input({ routines: [eveA, morning], steps: [step(1, 1, 400), step(2, 2, 200)] });
    expect(weeklyConflicts(saved)).toHaveLength(0);
    const draft = withDraftRoutine(saved, { ...eveA, daysOfWeek: [1, 2] }, [step(-1, 1, 100)]);
    expect(draft.steps.map((s) => s.id)).toEqual([2, -1]);
    const hits = weeklyConflicts(draft);
    expect(hits).toHaveLength(1);
    expect([hits[0]!.a.stepId, hits[0]!.b.stepId]).toEqual([2, -1]);
  });

  it('adds a new routine', () => {
    const saved = input({ routines: [morning], steps: [step(2, 2, 200)] });
    const draft = withDraftRoutine(saved, routine({ id: -1, daysOfWeek: [1] }), [
      step(-1, -1, 100),
    ]);
    expect(draft.routines.map((r) => r.id)).toEqual([2, -1]);
    expect(weeklyConflicts(draft)).toHaveLength(1);
  });
});

describe('ruleTokens', () => {
  it('marks ingredients named by a rule directly or through their group', () => {
    const tokens = ruleTokens([retinoidsVsAcids, { ...retinolVsGlycolic, id: 3, rightId: 3 }]);
    expect(ingredientInRules(tokens, 1, 10)).toBe(true);
    expect(ingredientInRules(tokens, 4, 20)).toBe(true);
    expect(ingredientInRules(tokens, 3, null)).toBe(true);
    expect(ingredientInRules(tokens, 5, null)).toBe(false);
    expect(ingredientInRules(tokens, 5, 30)).toBe(false);
  });
});
