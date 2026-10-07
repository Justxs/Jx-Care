import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { Db } from '@/db';
import { avoidItem } from '@/db/schema';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveRoutine, type SaveRoutineInput } from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { listGroups, listIngredients, listRules, saveGroup, saveRule } from '../../repo';
import { ConflictsScreen } from '../ConflictsScreen';
import { IngredientsScreen } from '../IngredientsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

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

const step = (productId: number, over: Partial<StepInput> = {}): StepInput => ({
  id: null,
  productId,
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

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  return app;
}

const show = (app: ReturnType<typeof setup>, ui: React.ReactElement) =>
  app.render(
    <>
      {ui}
      <PortalHost />
    </>,
  );

const saveRuleButton = () => screen.getByRole('button', { name: 'Save rule' });

const idOf = (db: Db, name: string) => listIngredients(db).find((i) => i.name === name)!.id;

/** Retinol serum, AHA toner and a vitamin C serum, each in its own product. */
function seedProducts(db: Db) {
  return {
    retinol: createProduct(db, productInput({ name: 'Retinol serum', ingredients: ['Retinol'] })),
    aha: createProduct(db, productInput({ name: 'AHA toner', ingredients: ['Glycolic acid'] })),
    vitC: createProduct(db, productInput({ name: 'C serum', ingredients: ['Ascorbic acid'] })),
  };
}

beforeEach(async () => {
  await setI18nLanguage('en');
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  router.push.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('ConflictsScreen', () => {
  it('starts empty, and Add common rules fills it (EN and LT)', async () => {
    const app = setup();
    await show(app, <ConflictsScreen />);
    expect(await screen.findByText('No conflict rules')).toBeTruthy();
    expect(
      screen.getByText('Start with common pairs, like retinol with AHA, or write your own.'),
    ).toBeTruthy();
    // The empty state carries both actions; the Fab waits for the first rule.
    expect(screen.queryByRole('button', { name: 'New rule' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add common rules' }));
    expect(await screen.findByText(/Mild means one of the steps runs every few days/)).toBeTruthy();
    expect(screen.getAllByText('No conflicts')).toHaveLength(3);
    expect(screen.getAllByText('Can irritate when used on the same day')).toHaveLength(2);
    expect(uiStore.state.toasts.at(-1)?.message).toBe('Added 3 common rules');
    // A group side says so when spoken.
    expect(
      screen.getByLabelText(
        'Retinoids group with AHA/BHA group, Can irritate when used on the same day, No conflicts',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New rule' })).toBeTruthy();

    await act(() => setI18nLanguage('lt'));
    expect(await screen.findByRole('button', { name: 'Nauja taisyklė' })).toBeTruthy();
    expect(screen.getAllByText('Konfliktų nėra')).toHaveLength(3);
  });

  it('shows In N routines or No conflicts for seeded routines, never counting A against B', async () => {
    const app = setup();
    const p = seedProducts(app.db);
    const bp = createProduct(
      app.db,
      productInput({ name: 'BP wash', ingredients: ['Benzoyl peroxide'] }),
    );
    // Evening A: retinol. Evening B: AHA. They are alternates, so never compared.
    saveRoutine(app.db, routineInput({ name: 'Evening A', steps: [step(p.retinol)] }));
    saveRoutine(app.db, routineInput({ name: 'Evening B', steps: [step(p.aha)] }));
    // Morning vitamin C meets Evening B's AHA every day.
    saveRoutine(
      app.db,
      routineInput({
        name: 'Morning',
        timeOfDay: 'morning',
        sortTime: '07:00',
        steps: [step(p.vitC)],
      }),
    );
    // Benzoyl peroxide every three days in the morning: a mild meeting with Evening A.
    saveRoutine(
      app.db,
      routineInput({
        name: 'Wash',
        timeOfDay: 'custom',
        customName: 'Midday',
        sortTime: '12:00',
        steps: [step(bp, { scheduleKind: 'interval', everyNDays: 3, startDate: '2026-10-05' })],
      }),
    );
    await show(app, <ConflictsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add common rules' }));

    const rules = listRules(app.db);
    const row = (left: string, right: string) =>
      within(
        screen.getByTestId(
          `rule-row-${rules.find((r) => r.left.name === left && r.right.name === right)!.id}`,
        ),
      );
    await waitFor(() =>
      expect(row('Vitamin C', 'AHA/BHA').getByText('In 2 routines')).toBeTruthy(),
    );
    expect(row('Retinoids', 'AHA/BHA').getByText('No conflicts')).toBeTruthy();
    expect(row('Retinoids', 'Benzoyl peroxide').getByText('In 2 routines')).toBeTruthy();
  });

  it('creates a rule in the editor and shows how many routines it affects, then Done closes', async () => {
    const app = setup();
    const p = seedProducts(app.db);
    saveRoutine(app.db, routineInput({ name: 'Evening', steps: [step(p.retinol)] }));
    saveRoutine(
      app.db,
      routineInput({
        name: 'Morning',
        timeOfDay: 'morning',
        sortTime: '07:00',
        steps: [step(p.aha)],
      }),
    );
    saveGroup(app.db, { name: 'Acids', memberIds: [idOf(app.db, 'Glycolic acid')] });
    // One unrelated rule so the screen shows its list and Fab.
    saveRule(app.db, {
      leftKind: 'ingredient',
      leftId: idOf(app.db, 'Ascorbic acid'),
      rightKind: 'ingredient',
      rightId: idOf(app.db, 'Retinol'),
      note: null,
    });
    await show(app, <ConflictsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'New rule' }));

    expect(saveRuleButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'First side, Ingredient or group' }));
    await fireEvent.changeText(screen.getByLabelText('Search ingredients and groups'), 'reti');
    await fireEvent.press(screen.getByTestId(`side-option-ingredient-${idOf(app.db, 'Retinol')}`));
    await fireEvent.press(screen.getByRole('button', { name: 'Second side, Ingredient or group' }));
    // Groups are marked and listed with ingredients.
    await fireEvent.changeText(screen.getByLabelText('Search ingredients and groups'), 'acid');
    expect(screen.getByLabelText('Acids group, 1 ingredient')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Acids group, 1 ingredient'));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Can cause flushing');

    expect(screen.queryByTestId('rule-affected')).toBeNull();
    await fireEvent.press(saveRuleButton());
    expect(await screen.findByText('Affects 2 routines')).toBeTruthy();
    expect(listRules(app.db).at(-1)).toMatchObject({
      left: { kind: 'ingredient', name: 'Retinol' },
      right: { kind: 'group', name: 'Acids' },
      note: 'Can cause flushing',
    });
    // The list behind refreshed too.
    await waitFor(() => expect(screen.getByText('Can cause flushing')).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    // The next New rule starts a fresh editor.
    await fireEvent.press(screen.getByRole('button', { name: 'New rule' }));
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled();
  });

  it('refuses two equal sides, says when nothing is affected, and deletes a rule', async () => {
    const app = setup();
    seedProducts(app.db);
    const id = saveRule(app.db, {
      leftKind: 'ingredient',
      leftId: idOf(app.db, 'Ascorbic acid'),
      rightKind: 'ingredient',
      rightId: idOf(app.db, 'Retinol'),
      note: 'Old note',
    });
    await show(app, <ConflictsScreen />);
    await fireEvent.press(await screen.findByTestId(`rule-row-${id}`));
    expect(screen.getByText('Edit rule')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Second side, Retinol' }));
    await fireEvent.changeText(screen.getByLabelText('Search ingredients and groups'), 'ascorbic');
    await fireEvent.press(
      screen.getByTestId(`side-option-ingredient-${idOf(app.db, 'Ascorbic acid')}`),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save rule' }));
    expect(screen.getByText('Pick two different sides.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Second side, Ascorbic acid' }));
    await fireEvent.changeText(screen.getByLabelText('Search ingredients and groups'), 'glyc');
    await fireEvent.press(
      screen.getByTestId(`side-option-ingredient-${idOf(app.db, 'Glycolic acid')}`),
    );
    expect(screen.queryByText('Pick two different sides.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText("Doesn't affect any routine now")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await fireEvent.press(await screen.findByTestId(`rule-row-${id}`));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete rule' }));
    expect(screen.getByText('Delete this rule?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No conflict rules')).toBeTruthy();
    expect(listRules(app.db)).toEqual([]);
  });
});

describe('IngredientsScreen', () => {
  it('lists ingredients with group and product count, and searches both lists', async () => {
    const app = setup();
    createProduct(app.db, productInput({ name: 'A', ingredients: ['Niacinamide', 'Water'] }));
    createProduct(app.db, productInput({ name: 'B', ingredients: ['Water'] }));
    saveGroup(app.db, { name: 'Vitamins', memberIds: [idOf(app.db, 'Niacinamide')] });
    await show(app, <IngredientsScreen />);

    const water = within(await screen.findByTestId(`ingredient-row-${idOf(app.db, 'Water')}`));
    expect(water.getByText('In 2 products')).toBeTruthy();
    const nia = within(screen.getByTestId(`ingredient-row-${idOf(app.db, 'Niacinamide')}`));
    expect(nia.getByText('In 1 product')).toBeTruthy();
    expect(nia.getByText('Vitamins')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Search ingredients and groups'), 'wat');
    await waitFor(() => expect(screen.queryByTestId(/^ingredient-row-/)).toBeTruthy());
    expect(screen.queryAllByTestId(/^ingredient-row-/)).toHaveLength(1);

    await fireEvent.press(screen.getByRole('radio', { name: 'Groups' }));
    expect(await screen.findByText('Nothing matches')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search ingredients and groups'), '');
    const group = within(await screen.findByTestId(/^group-row-/));
    expect(group.getByText('Vitamins')).toBeTruthy();
    expect(group.getByText('1 ingredient')).toBeTruthy();
  });

  it('merges selected duplicates into the chosen name', async () => {
    const app = setup();
    createProduct(app.db, productInput({ name: 'P1', ingredients: ['Niacinamide'] }));
    createProduct(app.db, productInput({ name: 'P2', ingredients: ['Niacinamide'] }));
    // A second spelling that normalises differently (a typo).
    createProduct(app.db, productInput({ name: 'P3', ingredients: ['Niacinamid'] }));
    db_avoid(app.db, idOf(app.db, 'Niacinamid'));
    await show(app, <IngredientsScreen />);
    await screen.findByText('Niacinamid');

    await fireEvent.press(screen.getByRole('button', { name: 'Select' }));
    await fireEvent.press(screen.getByTestId(`ingredient-row-${idOf(app.db, 'Niacinamid')}`));
    const bar = within(screen.getByTestId('selection-bar'));
    expect(bar.getByText('1 selected')).toBeTruthy();
    expect(bar.getByRole('button', { name: 'Merge' })).toBeDisabled();
    await fireEvent.press(screen.getByTestId(`ingredient-row-${idOf(app.db, 'Niacinamide')}`));
    await fireEvent.press(bar.getByRole('button', { name: 'Merge' }));

    // The name in the most products is picked to keep.
    await fireEvent.press(await screen.findByRole('button', { name: 'Merge into Niacinamide' }));
    await waitFor(() =>
      expect(listIngredients(app.db).map((i) => i.name)).toEqual(['Niacinamide']),
    );
    expect(listIngredients(app.db)[0]).toMatchObject({ productCount: 3, avoidCount: 1 });
    expect(await screen.findByText('In 3 products')).toBeTruthy();
    expect(screen.queryByTestId('selection-bar')).toBeNull();
    expect(uiStore.state.toasts.at(-1)?.message).toBe('Merged into Niacinamide');
  });

  it('renames into an existing name (a merge) and opens a product', async () => {
    const app = setup();
    createProduct(app.db, productInput({ name: 'Toner', ingredients: ['Niacinamid'] }));
    const serum = createProduct(
      app.db,
      productInput({ name: 'Serum', ingredients: ['Niacinamide'] }),
    );
    const g = saveGroup(app.db, { name: 'Vitamins', memberIds: [] });
    await show(app, <IngredientsScreen />);

    await fireEvent.press(
      await screen.findByTestId(`ingredient-row-${idOf(app.db, 'Niacinamide')}`),
    );
    expect(await screen.findByText('Serum')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'Serum' }));
    expect(router.push).toHaveBeenCalledWith(`/products/${serum}`);

    await fireEvent.press(screen.getByTestId(`ingredient-row-${idOf(app.db, 'Niacinamid')}`));
    expect(
      screen.getByText(
        "Used in a product, a conflict rule or the avoid list, so it can't be deleted.",
      ),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'NIACINAMIDE');
    await fireEvent.press(screen.getByRole('button', { name: 'Save ingredient' }));
    await waitFor(() =>
      expect(listIngredients(app.db)).toMatchObject([{ name: 'NIACINAMIDE', productCount: 2 }]),
    );
    expect(uiStore.state.toasts.at(-1)?.message).toBe('Merged into NIACINAMIDE');
    expect(listGroups(app.db).find((x) => x.id === g)!.memberCount).toBe(0);
  });

  it('creates a group with members and deletes it with what goes with it', async () => {
    const app = setup();
    createProduct(app.db, productInput({ ingredients: ['Retinol', 'Retinal', 'Water'] }));
    await show(app, <IngredientsScreen />);
    await screen.findByText('Retinol');
    await fireEvent.press(screen.getByRole('radio', { name: 'Groups' }));
    expect(await screen.findByText('No groups yet')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'New group' }));
    await fireEvent.changeText(screen.getByLabelText('Group name'), 'Retinoids');
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    await fireEvent.changeText(screen.getByLabelText('Search ingredients'), 'reti');
    await fireEvent.press(screen.getByTestId(`side-option-ingredient-${idOf(app.db, 'Retinol')}`));
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    await fireEvent.changeText(screen.getByLabelText('Search ingredients'), 'retinal');
    await fireEvent.press(screen.getByTestId(`side-option-ingredient-${idOf(app.db, 'Retinal')}`));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Retinal' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save group' }));

    const row = within(await screen.findByTestId(/^group-row-/));
    expect(row.getByText('1 ingredient')).toBeTruthy();
    const groupId = listGroups(app.db)[0]!.id;
    saveRule(app.db, {
      leftKind: 'group',
      leftId: groupId,
      rightKind: 'ingredient',
      rightId: idOf(app.db, 'Water'),
      note: null,
    });

    await fireEvent.press(screen.getByTestId(`group-row-${groupId}`));
    await act(() => new Promise<void>((r) => setTimeout(r, 0)));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete group' }));
    expect(screen.getByText('Delete Retinoids?')).toBeTruthy();
    expect(
      screen.getByText(
        "Its ingredient stays, without a group. 1 conflict rule that uses it is deleted too. This can't be undone.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No groups yet')).toBeTruthy();
    expect(listRules(app.db)).toEqual([]);
  });
});

function db_avoid(db: Db, ingredientId: number) {
  db.insert(avoidItem).values({ kind: 'ingredient', refId: ingredientId }).run();
}
