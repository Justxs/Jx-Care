import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { pickReturnStore, productAddedForPick } from '@/features/products/pickReturn';

import { routineDraftStore, setRoutineDraft } from '../../draft';
import * as reminders from '../../reminders';
import { getRoutine, listRoutines, saveRoutine, type SaveRoutineInput } from '../../repo';
import { buildFromTemplate, draftFromTemplate, routineTemplates } from '../../templates';
import { RoutineEditorScreen } from '../RoutineEditorScreen';

type Listener = (e: { preventDefault: () => void }) => void;
const mockParams: { current: Record<string, string> } = { current: {} };
const mockListeners: Record<string, Listener[]> = {};

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
  useNavigation: () => ({
    addListener: (event: string, fn: Listener) => {
      (mockListeners[event] ??= []).push(fn);
      return () => {
        mockListeners[event] = (mockListeners[event] ?? []).filter((f) => f !== fn);
      };
    },
  }),
}));

const { router } = jest.requireMock<{ router: { back: jest.Mock; push: jest.Mock } }>(
  'expo-router',
);

const TODAY = '2026-10-07';

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

const step = (over: Partial<SaveRoutineInput['steps'][number]> = {}) => ({
  id: null,
  productId: null,
  note: null,
  scheduleKind: 'always' as const,
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
  ...over,
});

const routineInput = (over: Partial<SaveRoutineInput> = {}): SaveRoutineInput => ({
  name: 'Evening A',
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  reminderTime: null,
  steps: [step()],
  ...over,
});

function setup(id: string) {
  mockParams.current = { id };
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const show = () =>
    app.render(
      <>
        <RoutineEditorScreen />
        <PortalHost />
      </>,
    );
  return { ...app, show };
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
const emit = async (event: string) => {
  const preventDefault = jest.fn();
  await act(async () => {
    for (const fn of mockListeners[event] ?? []) fn({ preventDefault });
  });
  return preventDefault;
};
const save = () => fireEvent.press(screen.getByRole('button', { name: 'Save routine' }));
const saveStep = () => fireEvent.press(screen.getByTestId('save-step'));
const stepLabels = () =>
  screen
    .queryAllByTestId(/^step-row-/)
    .map((row) => String(row.props.accessibilityLabel).split(', ')[1]);

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  routineDraftStore.setState(() => ({ draft: null }));
  for (const key of Object.keys(mockListeners)) delete mockListeners[key];
  router.back.mockClear();
  router.push.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('New routine', () => {
  it('starts from the starter draft and saves it in one go', async () => {
    const app = setup('new');
    const cleanser = createProduct(
      app.db,
      productInput({ name: 'Gentle cleanser', category: 'cleanser' }),
    );
    const built = buildFromTemplate(routineTemplates.morning[0]!, [
      { id: cleanser, area: 'skin', category: 'cleanser', archivedAt: null, createdAt: 1 },
    ]);
    setRoutineDraft(
      draftFromTemplate(built, (k) => (k.endsWith('morningBasics') ? 'Morning basics' : k)),
    );
    await app.show();

    expect(screen.getByDisplayValue('Morning basics')).toBeTruthy();
    expect(routineDraftStore.state.draft).toBeNull();
    await waitFor(() => expect(stepLabels()[0]).toBe('Gentle cleanser'));
    // Gaps say so in amber.
    expect(screen.getAllByText('Pick a product later')).toHaveLength(2);
    // Unsaved from the start: leaving asks first.
    expect(await emit('beforeRemove')).toHaveBeenCalled();
    expect(screen.getByText('Discard changes?')).toBeTruthy();

    await save();
    await flush();
    const [saved] = listRoutines(app.db, TODAY, 30);
    expect(saved).toMatchObject({
      name: 'Morning basics',
      timeOfDay: 'morning',
      sortTime: '07:00',
    });
    expect(saved?.steps.map((s) => s.productId)).toEqual([cleanser, null, null]);
    expect(uiStore.state.toasts[0]?.message).toBe('Morning basics saved');
    expect(router.back).toHaveBeenCalled();
  });

  it('validates in place: name, days and at least one step', async () => {
    const app = setup('new');
    await app.show();
    expect(screen.getByText('No steps yet.')).toBeTruthy();
    // Nothing changed yet: leaving doesn't ask.
    expect(await emit('beforeRemove')).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Monday'));
    await fireEvent.press(screen.getByLabelText('Tuesday'));
    await fireEvent.press(screen.getByLabelText('Wednesday'));
    await fireEvent.press(screen.getByLabelText('Thursday'));
    await fireEvent.press(screen.getByLabelText('Friday'));
    await fireEvent.press(screen.getByLabelText('Saturday'));
    await fireEvent.press(screen.getByLabelText('Sunday'));
    await save();
    await flush();
    expect(screen.getByText('Enter a name.')).toBeTruthy();
    expect(screen.getByText('Choose at least one day.')).toBeTruthy();
    expect(screen.getByText('Add at least one step.')).toBeTruthy();
    expect(listRoutines(app.db, TODAY, 30)).toEqual([]);
    expect(await emit('beforeRemove')).toHaveBeenCalled();

    // "Every day" fills all seven.
    await fireEvent.press(screen.getByRole('button', { name: 'Every day' }));
    await waitFor(() => expect(screen.queryByText('Choose at least one day.')).toBeNull());
  });

  it('adds a step with a product, set days and a wait; custom time of day and a reminder', async () => {
    const app = setup('new');
    const serum = createProduct(app.db, productInput({ name: 'Retinol serum', category: 'serum' }));
    createProduct(app.db, productInput({ name: 'Hair oil', area: 'hair', category: 'hair_oil' }));
    const askSpy = jest.spyOn(reminders, 'askForRoutineReminders');
    await app.show();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Gym');
    await fireEvent.press(screen.getByRole('button', { name: 'Custom' }));
    await fireEvent.changeText(screen.getByLabelText('Name of this time'), 'After gym');
    await fireEvent.press(screen.getByRole('switch', { name: 'Reminder' }));
    expect(askSpy).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('add-step'));
    // The picker only lists skin (and both) products.
    expect(screen.queryByTestId(`picker-row-${serum}`)).toBeTruthy();
    expect(screen.queryByText('Hair oil')).toBeNull();
    await fireEvent.press(screen.getByTestId(`picker-row-${serum}`));
    await fireEvent.changeText(screen.getByLabelText('Note'), '2 drops');
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Set days. Only on the days you pick' }),
    );
    const stepDays = screen.getAllByLabelText('Days').at(-1)!;
    await fireEvent.press(within(stepDays).getByLabelText('Tuesday'));
    await fireEvent.press(within(stepDays).getByLabelText('Friday'));
    await fireEvent.press(screen.getByRole('radio', { name: '1 min' }));
    await saveStep();

    await waitFor(() => expect(stepLabels()).toEqual(['Retinol serum']));
    const row = screen.getByTestId('step-row-0');
    expect(within(row).getByText('Tue, Fri')).toBeTruthy();
    expect(within(row).getByText('1 min')).toBeTruthy();
    expect(within(row).getByText('2 drops')).toBeTruthy();

    await save();
    await flush();
    const [saved] = listRoutines(app.db, TODAY, 30);
    expect(saved).toMatchObject({
      name: 'Gym',
      timeOfDay: 'custom',
      customName: 'After gym',
      sortTime: '07:00',
      reminderTime: '07:00',
    });
    expect(saved?.steps[0]).toMatchObject({
      productId: serum,
      note: '2 drops',
      scheduleKind: 'days',
      daysOfWeek: [2, 5],
      waitSeconds: 60,
    });
    askSpy.mockRestore();
  });
  it('returns from Add product with the new product in the step', async () => {
    const app = setup('new');
    await app.show();
    await fireEvent.press(screen.getByTestId('add-step'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add new product' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/product-form',
      params: { prefill: JSON.stringify({ area: 'skin' }) },
    });

    // The product form saves a product and goes back.
    const id = createProduct(app.db, productInput({ name: 'Peptide serum' }));
    await act(async () => {
      productAddedForPick({ id, area: 'skin' });
      await app.client.invalidateQueries();
    });
    await emit('focus');
    await waitFor(() =>
      expect(screen.getByTestId('step-product').props.accessibilityLabel).toBe(
        'Product, Peptide serum',
      ),
    );
    await saveStep();
    await waitFor(() => expect(stepLabels()).toEqual(['Peptide serum']));
    // Cancelling Add product: back on the editor, a product added later elsewhere is not picked.
    await fireEvent.press(screen.getByTestId('add-step'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add new product' }));
    expect(pickReturnStore.state.waiting).not.toBeNull();
    await emit('focus');
    expect(pickReturnStore.state.waiting).toBeNull();
  });

  it('reads in Lithuanian', async () => {
    const app = setup('new');
    await setI18nLanguage('lt');
    await app.show();
    expect(screen.getByText('Nauja rutina')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Išsaugoti rutiną' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pridėti žingsnį' })).toBeTruthy();
    await flush();
  });
});

describe('Edit routine', () => {
  it('round-trips an every-few-days step and limits set days to the routine days', async () => {
    const app = setup('1');
    const id = saveRoutine(
      app.db,
      routineInput({
        daysOfWeek: [1, 3],
        steps: [
          step({
            scheduleKind: 'interval',
            everyNDays: 3,
            startDate: '2026-10-01',
            waitSeconds: 300,
          }),
        ],
      }),
    );
    await app.show();
    expect(await screen.findByText('Every 3 days')).toBeTruthy();
    expect(within(screen.getByTestId('step-row-0')).getByText('5 min')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('step-row-0'));
    expect(screen.getByDisplayValue('3')).toBeTruthy();
    await fireEvent.changeText(screen.getByDisplayValue('3'), '5');
    await saveStep();
    await waitFor(() => expect(screen.getByText('Every 5 days')).toBeTruthy());

    await save();
    await flush();
    expect(getRoutine(app.db, id, TODAY, 30)?.steps[0]).toMatchObject({
      scheduleKind: 'interval',
      everyNDays: 5,
      startDate: '2026-10-01',
      waitSeconds: 300,
    });
    expect(uiStore.state.toasts[0]?.message).toBe('Evening A saved');

    // Set days: only Monday and Wednesday can be picked.
    await fireEvent.press(screen.getByTestId('step-row-0'));
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Set days. Only on the days you pick' }),
    );
    const stepDays = screen.getAllByLabelText('Days').at(-1)!;
    expect(within(stepDays).getByLabelText('Tuesday').props.accessibilityState.disabled).toBe(true);
    expect(within(stepDays).getByLabelText('Monday').props.accessibilityState.disabled).toBe(false);
  });

  it('reorders and deletes steps, saved together', async () => {
    const app = setup('1');
    const a = createProduct(app.db, productInput({ name: 'Cleanser' }));
    const b = createProduct(app.db, productInput({ name: 'Serum' }));
    const c = createProduct(app.db, productInput({ name: 'Moisturiser' }));
    const id = saveRoutine(
      app.db,
      routineInput({
        steps: [step({ productId: a }), step({ productId: b }), step({ productId: c })],
      }),
    );
    await app.show();
    await waitFor(() => expect(stepLabels()).toEqual(['Cleanser', 'Serum', 'Moisturiser']));

    await fireEvent(screen.getByTestId('step-handle-0'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveDown' },
    });
    expect(stepLabels()).toEqual(['Serum', 'Cleanser', 'Moisturiser']);
    await fireEvent(screen.getByTestId('step-row-2'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });
    expect(stepLabels()).toEqual(['Serum', 'Moisturiser', 'Cleanser']);
    await fireEvent(screen.getByTestId('step-row-0'), 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });
    await waitFor(() => expect(stepLabels()).toEqual(['Moisturiser', 'Cleanser']));

    // Nothing is written before Save routine.
    expect(getRoutine(app.db, id, TODAY, 30)?.steps).toHaveLength(3);
    await save();
    await flush();
    expect(getRoutine(app.db, id, TODAY, 30)?.steps.map((s) => s.productId)).toEqual([c, a]);
  });

  it('asks before leaving with changes, and deletes the routine after the dialog', async () => {
    const app = setup('1');
    const id = saveRoutine(app.db, routineInput());
    await app.show();
    expect(await screen.findByDisplayValue('Evening A')).toBeTruthy();
    expect(await emit('beforeRemove')).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Evening B');
    expect(await emit('beforeRemove')).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(router.back).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Delete routine' }));
    expect(screen.getByText('Delete Evening A?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await flush();
    expect(getRoutine(app.db, id, TODAY, 30)).toBeNull();
    expect(router.back).toHaveBeenCalled();
  });

  it('has Save only in the bottom bar', async () => {
    const app = setup('1');
    saveRoutine(app.db, routineInput());
    await app.show();
    await screen.findByDisplayValue('Evening A');
    expect(screen.getAllByRole('button', { name: 'Save routine' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
