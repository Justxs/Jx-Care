import { weeklyConflicts, type ConflictInput, type RuleLite } from '@/lib/conflicts';
import type { RoutineLite, StepLite } from '@/lib/schedule';

import type { ConflictNames } from './repo';
import {
  analyseDraft,
  asSentence,
  draftInput,
  pairingsFor,
  sheetFor,
  toTarget,
  type DraftRoutine,
} from './warnings';

const routine = (o: Partial<RoutineLite> & { id: number }): RoutineLite => ({
  name: `R${o.id}`,
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1],
  active: true,
  createdDay: '2026-01-01',
  ...o,
});

const step = (id: number, routineId: number, productId: number, o: Partial<StepLite> = {}) =>
  ({
    id,
    routineId,
    productId,
    position: id,
    scheduleKind: 'always',
    daysOfWeek: null,
    everyNDays: null,
    startDate: null,
    ...o,
  }) satisfies StepLite;

// Ingredients 1 retinol, 2 glycolic acid; products 100 retinol serum, 200 AHA toner.
const rule: RuleLite = {
  id: 7,
  leftKind: 'ingredient',
  leftId: 1,
  rightKind: 'ingredient',
  rightId: 2,
};
const names: ConflictNames = {
  products: new Map([
    [100, 'Retinol serum'],
    [200, 'AHA toner'],
  ]),
  ingredients: new Map([
    [1, 'Retinol'],
    [2, 'Glycolic acid'],
  ]),
  groups: new Map(),
  notes: new Map([[7, 'Can cause flushing']]),
};
const morning = routine({ id: 1, name: 'Morning', timeOfDay: 'morning', sortTime: '07:00' });
const eveA = routine({ id: 2, name: 'Evening A' });
const eveB = routine({ id: 3, name: 'Evening B' });

const input = (o: Partial<ConflictInput> = {}): ConflictInput => ({
  routines: [morning, eveA, eveB],
  // AHA in the morning, retinol in Evening A, AHA again in Evening B (its alternate).
  steps: [step(10, 1, 200), step(20, 2, 100), step(30, 3, 200)],
  productIngredients: new Map([
    [100, [1]],
    [200, [2]],
  ]),
  ingredientGroup: new Map([
    [1, null],
    [2, null],
  ]),
  rules: [rule],
  ...o,
});

describe('pairingsFor and toTarget', () => {
  it('names the pair from the routine’s side and never pairs A/B alternates', () => {
    const data = input();
    const hits = weeklyConflicts(data);
    expect(pairingsFor(hits, 3)).toEqual([]);
    const [p] = pairingsFor(hits, 2);
    expect(p).toMatchObject({ own: { stepId: 20 }, other: { stepId: 10 }, weekdays: [1] });
    expect(toTarget(p!, data, names)).toEqual({
      ruleId: 7,
      stepId: 20,
      mild: false,
      conflict: {
        first: { product: 'Retinol serum', routine: 'Evening A' },
        second: { product: 'AHA toner', routine: 'Morning' },
        weekdays: [1],
        note: 'Can cause flushing.',
        mild: false,
      },
      mildStep: null,
    });
  });

  it('lists a pair inside one routine from both steps', () => {
    const data = input({ steps: [step(20, 2, 100), step(21, 2, 200)] });
    const pairs = pairingsFor(weeklyConflicts(data), 2);
    expect(pairs.map((p) => [p.own.stepId, p.other.stepId])).toEqual([
      [20, 21],
      [21, 20],
    ]);
  });

  it('marks an every-few-days step mild and names it for the Mild conflict sheet', () => {
    const data = input({
      routines: [morning, routine({ ...eveA, daysOfWeek: [1, 2, 3, 4, 5, 6, 7] })],
      steps: [
        step(10, 1, 200, { scheduleKind: 'days', daysOfWeek: [1] }),
        step(20, 2, 100, { scheduleKind: 'interval', everyNDays: 3, startDate: '2026-10-05' }),
      ],
    });
    const targets = pairingsFor(weeklyConflicts(data), 1).map((p) => toTarget(p, data, names));
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      mild: true,
      mildStep: { product: 'Retinol serum', everyNDays: 3 },
    });
    expect(sheetFor(targets)).toEqual({
      kind: 'mild',
      step: { product: 'Retinol serum', everyNDays: 3 },
    });
  });

  it('opens the first full conflict when there is one', () => {
    const data = input();
    const targets = pairingsFor(weeklyConflicts(data), 1).map((p) => toTarget(p, data, names));
    expect(sheetFor([{ ...targets[0]!, mild: true }, targets[0]!])).toMatchObject({
      kind: 'conflict',
    });
    expect(sheetFor([])).toBeNull();
  });

  it('turns notes into sentences', () => {
    expect(asSentence('Can cause flushing')).toBe('Can cause flushing.');
    expect(asSentence('Careful!')).toBe('Careful!');
    expect(asSentence('  ')).toBeNull();
    expect(asSentence(null)).toBeNull();
  });
});

const draft = (o: Partial<DraftRoutine> = {}): DraftRoutine => ({
  id: 2,
  name: 'Evening A',
  timeOfDay: 'evening',
  customName: null,
  daysOfWeek: [1],
  steps: [
    {
      productId: 200,
      scheduleKind: 'always',
      daysOfWeek: null,
      everyNDays: null,
      startDate: null,
    },
  ],
  ...o,
});

const analyse = (d: DraftRoutine, data = input()) => {
  const { input: withDraft, routineId } = draftInput(data, d, '2026-10-07');
  return analyseDraft(withDraft, names, weeklyConflicts(withDraft), routineId, d.name);
};

describe('the editor draft', () => {
  it('checks unsaved steps instead of the saved ones', () => {
    // Saved Evening A has retinol; the draft swapped it for the AHA toner: no conflict.
    expect(analyse(draft()).lines).toEqual([]);
    const a = analyse(
      draft({
        daysOfWeek: [1, 2],
        steps: [
          {
            productId: 200,
            scheduleKind: 'always',
            daysOfWeek: null,
            everyNDays: null,
            startDate: null,
          },
          {
            productId: 100,
            scheduleKind: 'always',
            daysOfWeek: null,
            everyNDays: null,
            startDate: null,
          },
        ],
      }),
    );
    expect(a.lines).toEqual([
      // Retinol meets the morning AHA on Monday, and the draft's own AHA on Monday and Tuesday.
      expect.objectContaining({ stepIndex: 0, otherStepIndex: 1, weekdays: [1, 2] }),
      expect.objectContaining({
        stepIndex: 1,
        ownToken: 'Retinol',
        otherToken: 'Glycolic acid',
        otherStepIndex: null,
        otherRoutine: 'Morning',
        weekdays: [1],
        mild: false,
      }),
    ]);
    // Both steps of the inside pair carry a tag, but the panel lists the pair once.
    expect([...a.steps.keys()].sort()).toEqual([0, 1]);
    expect(a.steps.get(1)).toHaveLength(2);
    expect(a.steps.get(1)![0]!.conflict.first.routine).toBe('Evening A');
    expect(a.alternatives).toEqual(['Evening B']);
  });

  it('works for a new routine and a string every-few-days count', () => {
    const a = analyse(
      draft({
        id: null,
        name: 'Night',
        timeOfDay: 'custom',
        customName: 'Night',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        steps: [
          {
            productId: 100,
            scheduleKind: 'interval',
            daysOfWeek: null,
            everyNDays: '3',
            startDate: '2026-10-05',
          },
        ],
      }),
    );
    expect(a.lines).toEqual([
      expect.objectContaining({ stepIndex: 0, otherRoutine: 'Morning', mild: true }),
      expect.objectContaining({ stepIndex: 0, otherRoutine: 'Evening B', mild: true }),
    ]);
    expect(a.steps.get(0)![0]!.mildStep).toEqual({ product: 'Retinol serum', everyNDays: 3 });
    expect(a.alternatives).toEqual([]);
  });
});
