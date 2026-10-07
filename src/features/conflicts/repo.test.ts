import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { avoidItem, conflict, ingredient, ingredientGroup, productIngredient } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { createProduct, productIngredients } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveRoutine, type SaveRoutineInput } from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';

import type { CommonRuleLabels } from './commonRules';
import {
  addCommonRules,
  conflictInput,
  deleteGroup,
  deleteIngredient,
  deleteRule,
  DuplicateRuleError,
  EmptyNameError,
  groupImpact,
  IngredientInUseError,
  ingredientProducts,
  listGroups,
  listIngredients,
  listRules,
  listRulesWithCounts,
  mergeIngredients,
  renameIngredient,
  ruleRoutineCount,
  SameSidesError,
  saveGroup,
  saveRule,
  setIngredientGroup,
} from './repo';

const productInput = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Cream',
  brand: null,
  area: 'skin',
  category: 'other',
  size: null,
  unit: null,
  price: null,
  purchasedAt: null,
  expiresAt: null,
  openedAt: null,
  paoMonths: null,
  notes: null,
  photoUri: null,
  ingredients: [],
  ...over,
});

const step = (over: Partial<StepInput> = {}): StepInput => ({
  id: null,
  productId: null,
  note: null,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  ...over,
});

const routineInput = (over: Partial<SaveRoutineInput> = {}): SaveRoutineInput => ({
  name: 'Evening',
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  reminderTime: null,
  steps: [],
  ...over,
});

const labels: CommonRuleLabels = {
  groups: {
    retinoids: ['Retinoids', 'Retinoidai'],
    ahaBha: ['AHA/BHA'],
    vitaminC: ['Vitamin C', 'Vitaminas C'],
  },
  notes: {
    irritate: 'Can irritate when used on the same day',
    bpRetinoids: 'Benzoyl peroxide can make retinoids less effective',
  },
};

const idOf = (db: Db, name: string) =>
  listIngredients(db).find((i) => i.name.toLowerCase() === name.toLowerCase())!.id;

const names = (db: Db, productId: number) => productIngredients(db, productId).map((i) => i.name);

let db: ReturnType<typeof createTestDb>;
beforeEach(() => {
  db = createTestDb();
});

describe('ingredients', () => {
  it('lists each ingredient with its group and product, rule and avoid counts', () => {
    createProduct(db, productInput({ name: 'A', ingredients: ['Niacinamide', 'Water'] }));
    createProduct(db, productInput({ name: 'B', ingredients: ['Water'] }));
    const g = saveGroup(db, { name: 'Vitamins', memberIds: [idOf(db, 'Niacinamide')] });
    saveRule(db, {
      leftKind: 'ingredient',
      leftId: idOf(db, 'Water'),
      rightKind: 'group',
      rightId: g,
      note: null,
    });
    db.insert(avoidItem)
      .values({ kind: 'ingredient', refId: idOf(db, 'Water') })
      .run();

    expect(listIngredients(db)).toMatchObject([
      { name: 'Niacinamide', groupName: 'Vitamins', productCount: 1, ruleCount: 0, avoidCount: 0 },
      { name: 'Water', groupName: null, productCount: 2, ruleCount: 1, avoidCount: 1 },
    ]);
    expect(ingredientProducts(db, idOf(db, 'Water')).map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('merge moves product links, rules and avoid references and removes duplicates', () => {
    const p1 = createProduct(
      db,
      productInput({ name: 'P1', ingredients: ['Niacinamide', 'Zinc'] }),
    );
    const p2 = createProduct(db, productInput({ name: 'P2', ingredients: ['niacinamide '] }));
    // The same product lists both spellings once they are separate rows.
    db.insert(ingredient).values({ name: 'NIACINAMIDE.', normalizedName: 'niacinamide.' }).run();
    const keep = idOf(db, 'Niacinamide');
    const dupe = idOf(db, 'NIACINAMIDE.');
    db.insert(productIngredient).values({ productId: p1, ingredientId: dupe, position: 5 }).run();
    db.insert(productIngredient).values({ productId: p2, ingredientId: dupe, position: 1 }).run();
    const zinc = idOf(db, 'Zinc');
    const group = saveGroup(db, { name: 'Boosters', memberIds: [dupe] });
    saveRule(db, {
      leftKind: 'ingredient',
      leftId: keep,
      rightKind: 'ingredient',
      rightId: zinc,
      note: 'A',
    });
    // Same pair once merged, and a rule between the two spellings that collapses to one side.
    db.insert(conflict)
      .values([
        { leftKind: 'ingredient', leftId: zinc, rightKind: 'ingredient', rightId: dupe, note: 'B' },
        { leftKind: 'ingredient', leftId: keep, rightKind: 'ingredient', rightId: dupe, note: 'C' },
        { leftKind: 'ingredient', leftId: dupe, rightKind: 'group', rightId: group, note: 'D' },
      ])
      .run();
    db.insert(avoidItem)
      .values([
        { kind: 'ingredient', refId: keep },
        { kind: 'ingredient', refId: dupe },
      ])
      .run();

    mergeIngredients(db, keep, [dupe]);

    expect(listIngredients(db).map((i) => i.name)).toEqual(['Niacinamide', 'Zinc']);
    expect(names(db, p1)).toEqual(['Niacinamide', 'Zinc']);
    expect(names(db, p2)).toEqual(['Niacinamide']);
    expect(listRules(db).map((r) => [r.left.name, r.right.name, r.note])).toEqual([
      ['Niacinamide', 'Zinc', 'A'],
      ['Niacinamide', 'Boosters', 'D'],
    ]);
    expect(db.select().from(avoidItem).all()).toHaveLength(1);
    // The kept ingredient had no group, so it takes the merged one's.
    expect(listIngredients(db)[0]).toMatchObject({ groupId: group, groupName: 'Boosters' });
  });

  it('renaming into an existing name merges the two', () => {
    const p1 = createProduct(db, productInput({ name: 'P1', ingredients: ['Niacinamid'] }));
    const p2 = createProduct(db, productInput({ name: 'P2', ingredients: ['Niacinamide'] }));
    const typo = idOf(db, 'Niacinamid');
    const target = idOf(db, 'Niacinamide');

    expect(renameIngredient(db, typo, '  NIACINAMIDE ')).toBe(target);
    expect(listIngredients(db)).toMatchObject([
      { id: target, name: 'NIACINAMIDE', normalizedName: 'niacinamide', productCount: 2 },
    ]);
    expect(names(db, p1)).toEqual(['NIACINAMIDE']);
    expect(names(db, p2)).toEqual(['NIACINAMIDE']);
  });

  it('renames in place, including a change of case only', () => {
    createProduct(db, productInput({ ingredients: ['niacinamide'] }));
    const id = idOf(db, 'niacinamide');
    expect(renameIngredient(db, id, 'Niacinamide')).toBe(id);
    expect(renameIngredient(db, id, 'Nicotinamide')).toBe(id);
    expect(listIngredients(db)).toMatchObject([
      { name: 'Nicotinamide', normalizedName: 'nicotinamide' },
    ]);
    expect(() => renameIngredient(db, id, '   ')).toThrow(EmptyNameError);
  });

  it('deletes an ingredient only when nothing uses it', () => {
    const p = createProduct(db, productInput({ ingredients: ['Water'] }));
    const water = idOf(db, 'Water');
    expect(() => deleteIngredient(db, water)).toThrow(IngredientInUseError);

    db.delete(productIngredient).where(eq(productIngredient.productId, p)).run();
    db.insert(avoidItem).values({ kind: 'ingredient', refId: water }).run();
    expect(() => deleteIngredient(db, water)).toThrow(IngredientInUseError);

    db.delete(avoidItem).run();
    deleteIngredient(db, water);
    expect(listIngredients(db)).toEqual([]);
  });
});

describe('groups', () => {
  it('saves a group with exactly the given members, moving them from other groups', () => {
    createProduct(db, productInput({ ingredients: ['Retinol', 'Retinal', 'Adapalene'] }));
    const [retinol, retinal, adapalene] = ['Retinol', 'Retinal', 'Adapalene'].map((n) =>
      idOf(db, n),
    ) as [number, number, number];
    const other = saveGroup(db, { name: 'Other', memberIds: [adapalene] });
    const id = saveGroup(db, { name: ' Retinoids ', memberIds: [retinol, retinal, adapalene] });
    expect(listGroups(db)).toMatchObject([
      { name: 'Other', memberCount: 0 },
      { id, name: 'Retinoids', memberCount: 3 },
    ]);

    saveGroup(db, { id, name: 'Retinoids', memberIds: [retinal] });
    expect(
      listGroups(db)
        .find((g) => g.id === id)!
        .members.map((m) => m.name),
    ).toEqual(['Retinal']);
    setIngredientGroup(db, retinol, other);
    expect(listGroups(db).find((g) => g.id === other)!.memberCount).toBe(1);
    expect(() => saveGroup(db, { name: '', memberIds: [] })).toThrow(EmptyNameError);
  });

  it('deleting a group clears its members and deletes its rules and avoid items', () => {
    createProduct(db, productInput({ ingredients: ['Retinol', 'Glycolic acid', 'Water'] }));
    const g = saveGroup(db, { name: 'Retinoids', memberIds: [idOf(db, 'Retinol')] });
    const keepRule = saveRule(db, {
      leftKind: 'ingredient',
      leftId: idOf(db, 'Water'),
      rightKind: 'ingredient',
      rightId: idOf(db, 'Glycolic acid'),
      note: null,
    });
    saveRule(db, {
      leftKind: 'group',
      leftId: g,
      rightKind: 'ingredient',
      rightId: idOf(db, 'Glycolic acid'),
      note: null,
    });
    saveRule(db, {
      leftKind: 'ingredient',
      leftId: idOf(db, 'Water'),
      rightKind: 'group',
      rightId: g,
      note: null,
    });
    db.insert(avoidItem)
      .values([
        { kind: 'group', refId: g },
        { kind: 'ingredient', refId: idOf(db, 'Retinol') },
      ])
      .run();
    expect(groupImpact(db, g)).toEqual({ members: 1, rules: 2, avoid: 1 });

    deleteGroup(db, g);
    expect(db.select().from(ingredientGroup).all()).toEqual([]);
    expect(listIngredients(db).every((i) => i.groupId === null)).toBe(true);
    expect(listRules(db).map((r) => r.id)).toEqual([keepRule]);
    expect(db.select().from(avoidItem).all()).toMatchObject([{ kind: 'ingredient' }]);
  });
});

describe('rules', () => {
  it('resolves both sides to names and kinds and refuses equal sides or a repeated pair', () => {
    createProduct(db, productInput({ ingredients: ['Retinol', 'Glycolic acid'] }));
    const retinol = idOf(db, 'Retinol');
    const acids = saveGroup(db, { name: 'AHA', memberIds: [idOf(db, 'Glycolic acid')] });
    const id = saveRule(db, {
      leftKind: 'ingredient',
      leftId: retinol,
      rightKind: 'group',
      rightId: acids,
      note: '  Can cause   flushing ',
    });
    expect(listRules(db)).toEqual([
      {
        id,
        left: { kind: 'ingredient', id: retinol, name: 'Retinol' },
        right: { kind: 'group', id: acids, name: 'AHA' },
        note: 'Can cause flushing',
      },
    ]);
    expect(() =>
      saveRule(db, {
        leftKind: 'group',
        leftId: acids,
        rightKind: 'group',
        rightId: acids,
        note: null,
      }),
    ).toThrow(SameSidesError);
    expect(() =>
      saveRule(db, {
        leftKind: 'group',
        leftId: acids,
        rightKind: 'ingredient',
        rightId: retinol,
        note: null,
      }),
    ).toThrow(DuplicateRuleError);
    // Editing the rule itself is not a duplicate.
    saveRule(db, {
      id,
      leftKind: 'group',
      leftId: acids,
      rightKind: 'ingredient',
      rightId: retinol,
      note: '',
    });
    expect(listRules(db)[0]).toMatchObject({ left: { name: 'AHA' }, note: null });

    deleteRule(db, id);
    expect(listRules(db)).toEqual([]);
  });

  it('counts the routines each rule fires in, never A/B alternates against each other', () => {
    const retinolSerum = createProduct(
      db,
      productInput({ name: 'Retinol serum', ingredients: ['Retinol'] }),
    );
    const ahaToner = createProduct(
      db,
      productInput({ name: 'AHA toner', ingredients: ['Glycolic acid'] }),
    );
    const vitC = createProduct(
      db,
      productInput({ name: 'Vitamin C', ingredients: ['Ascorbic acid'] }),
    );
    const bp = createProduct(
      db,
      productInput({ name: 'BP wash', ingredients: ['Benzoyl peroxide'] }),
    );
    addCommonRules(db, labels);

    // Morning: vitamin C. Evening A: retinol + AHA. Evening B: AHA only.
    saveRoutine(
      db,
      routineInput({
        name: 'Morning',
        timeOfDay: 'morning',
        sortTime: '07:00',
        steps: [step({ productId: vitC })],
      }),
    );
    saveRoutine(
      db,
      routineInput({
        name: 'Evening A',
        steps: [step({ productId: retinolSerum }), step({ productId: ahaToner })],
      }),
    );
    saveRoutine(db, routineInput({ name: 'Evening B', steps: [step({ productId: ahaToner })] }));
    // Benzoyl peroxide on Mondays only, retinol only in Evening A on Tuesdays: never one day.
    saveRoutine(
      db,
      routineInput({
        name: 'Monday wash',
        timeOfDay: 'custom',
        customName: 'Midday',
        sortTime: '12:00',
        daysOfWeek: [1],
        steps: [step({ productId: bp })],
      }),
    );
    saveRoutine(
      db,
      routineInput({
        name: 'Tuesday',
        timeOfDay: 'custom',
        customName: 'Late',
        sortTime: '23:00',
        daysOfWeek: [2],
        steps: [step({ productId: retinolSerum })],
      }),
    );

    const rules = listRulesWithCounts(db);
    const count = (left: string, right: string) =>
      rules.find((r) => r.left.name === left && r.right.name === right)!.routineCount;
    // Retinoids × AHA/BHA: inside Evening A, and Tuesday's retinol meets Evening A and B's AHA.
    // Evening A's retinol never counts against Evening B's AHA (A/B alternates).
    expect(count('Retinoids', 'AHA/BHA')).toBe(3);
    // Benzoyl peroxide (Mondays) meets Evening A's daily retinol, never Tuesday's.
    expect(count('Retinoids', 'Benzoyl peroxide')).toBe(2);
    // Vitamin C × AHA/BHA: morning with both evenings.
    expect(count('Vitamin C', 'AHA/BHA')).toBe(3);
    const rule = rules.find((r) => r.left.name === 'Vitamin C')!;
    expect(ruleRoutineCount(db, rule.id)).toBe(3);
  });

  it('shows no conflicts when the sides never fall on the same day, and A/B are not counted', () => {
    const retinolSerum = createProduct(
      db,
      productInput({ name: 'Retinol serum', ingredients: ['Retinol'] }),
    );
    const ahaToner = createProduct(
      db,
      productInput({ name: 'AHA toner', ingredients: ['Glycolic acid'] }),
    );
    addCommonRules(db, labels);
    // Two evening routines (A/B alternates) on the same days: never compared.
    saveRoutine(
      db,
      routineInput({ name: 'Evening A', steps: [step({ productId: retinolSerum })] }),
    );
    saveRoutine(db, routineInput({ name: 'Evening B', steps: [step({ productId: ahaToner })] }));
    // A morning routine with retinol on Mondays and AHA on Fridays never meets itself.
    saveRoutine(
      db,
      routineInput({
        name: 'Morning',
        timeOfDay: 'morning',
        sortTime: '07:00',
        daysOfWeek: [1, 5],
        steps: [
          step({ productId: retinolSerum, scheduleKind: 'days', daysOfWeek: [1] }),
          step({ productId: ahaToner, scheduleKind: 'days', daysOfWeek: [5] }),
        ],
      }),
    );
    const rule = listRulesWithCounts(db).find(
      (r) => r.right.name === 'AHA/BHA' && r.left.name === 'Retinoids',
    )!;
    // Morning (Mon retinol) meets Evening B (AHA) on Monday, and Morning (Fri AHA) meets
    // Evening A (retinol) on Friday; A and B never meet each other.
    expect(rule.routineCount).toBe(3);

    // Without the morning routine nothing meets.
    const lonely = createTestDb();
    const r = createProduct(
      lonely,
      productInput({ name: 'Retinol serum', ingredients: ['Retinol'] }),
    );
    const a = createProduct(
      lonely,
      productInput({ name: 'AHA toner', ingredients: ['Glycolic acid'] }),
    );
    addCommonRules(lonely, labels);
    saveRoutine(lonely, routineInput({ name: 'Evening A', steps: [step({ productId: r })] }));
    saveRoutine(lonely, routineInput({ name: 'Evening B', steps: [step({ productId: a })] }));
    expect(listRulesWithCounts(lonely).map((x) => x.routineCount)).toEqual([0, 0, 0]);
  });
});

describe('addCommonRules', () => {
  it('links existing ingredients by normalized name and creates the missing ones', () => {
    const p = createProduct(db, productInput({ ingredients: ['RETINOL', 'Salicylic  Acid'] }));
    const before = listIngredients(db).length;
    expect(addCommonRules(db, labels)).toEqual({ groupsAdded: 3, rulesAdded: 3 });

    // The product's own spellings are kept and now sit in the new groups.
    expect(productIngredients(db, p)).toMatchObject([
      { name: 'RETINOL', groupId: expect.any(Number) },
      { name: 'Salicylic Acid', groupId: expect.any(Number) },
    ]);
    const groups = listGroups(db);
    expect(groups.map((g) => [g.name, g.memberCount])).toEqual([
      ['AHA/BHA', 5],
      ['Retinoids', 6],
      ['Vitamin C', 6],
    ]);
    // 17 group members plus benzoyl peroxide, two of which existed.
    expect(listIngredients(db).length).toBe(before + 16);
    expect(listRules(db).map((r) => `${r.left.name} × ${r.right.name}: ${r.note}`)).toEqual([
      'Retinoids × AHA/BHA: Can irritate when used on the same day',
      'Retinoids × Benzoyl peroxide: Benzoyl peroxide can make retinoids less effective',
      'Vitamin C × AHA/BHA: Can irritate when used on the same day',
    ]);
    expect(listIngredients(db).find((i) => i.name === '3-O-ethyl ascorbic acid')?.groupName).toBe(
      'Vitamin C',
    );
  });

  it('is idempotent, also after the language changed', () => {
    addCommonRules(db, labels);
    const snapshot = () => ({
      ingredients: listIngredients(db),
      groups: listGroups(db),
      rules: listRules(db),
    });
    const first = snapshot();
    expect(addCommonRules(db, labels)).toEqual({ groupsAdded: 0, rulesAdded: 0 });
    const lt: CommonRuleLabels = {
      groups: {
        retinoids: ['Retinoidai', 'Retinoids'],
        ahaBha: ['AHA/BHA'],
        vitaminC: ['Vitaminas C', 'Vitamin C'],
      },
      notes: { irritate: 'LT', bpRetinoids: 'LT' },
    };
    expect(addCommonRules(db, lt)).toEqual({ groupsAdded: 0, rulesAdded: 0 });
    expect(snapshot()).toEqual(first);
  });

  it('puts back a deleted rule and leaves members of other groups where they are', () => {
    createProduct(db, productInput({ ingredients: ['Salicylic acid'] }));
    const mine = saveGroup(db, { name: 'Exfoliants', memberIds: [idOf(db, 'Salicylic acid')] });
    addCommonRules(db, labels);
    expect(idOf(db, 'Salicylic acid')).toBeDefined();
    expect(listIngredients(db).find((i) => i.name === 'Salicylic acid')?.groupId).toBe(mine);

    const rule = listRules(db).find((r) => r.right.name === 'Benzoyl peroxide')!;
    deleteRule(db, rule.id);
    expect(addCommonRules(db, labels)).toEqual({ groupsAdded: 0, rulesAdded: 1 });
  });
});

describe('conflictInput', () => {
  it('holds routines, steps, product ingredients, groups and rules', () => {
    const serum = createProduct(db, productInput({ ingredients: ['Retinol', 'Water'] }));
    const routineId = saveRoutine(db, routineInput({ steps: [step({ productId: serum })] }));
    const g = saveGroup(db, { name: 'Retinoids', memberIds: [idOf(db, 'Retinol')] });
    const ruleId = saveRule(db, {
      leftKind: 'group',
      leftId: g,
      rightKind: 'ingredient',
      rightId: idOf(db, 'Water'),
      note: null,
    });

    const input = conflictInput(db);
    expect(input.routines).toMatchObject([{ id: routineId, name: 'Evening', active: true }]);
    expect(input.steps).toMatchObject([{ routineId, productId: serum, scheduleKind: 'always' }]);
    expect(input.productIngredients.get(serum)).toEqual([idOf(db, 'Retinol'), idOf(db, 'Water')]);
    expect(input.ingredientGroup.get(idOf(db, 'Retinol'))).toBe(g);
    expect(input.ingredientGroup.get(idOf(db, 'Water'))).toBeNull();
    expect(input.rules).toEqual([
      {
        id: ruleId,
        leftKind: 'group',
        leftId: g,
        rightKind: 'ingredient',
        rightId: idOf(db, 'Water'),
      },
    ]);
  });
});
