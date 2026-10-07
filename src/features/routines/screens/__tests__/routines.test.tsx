import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { routineDraftStore } from '../../draft';
import { getRoutine, listRoutines, saveRoutine, type SaveRoutineInput } from '../../repo';
import { RoutinesScreen } from '../RoutinesScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const TODAY = '2026-10-07';

const step = (productId: number | null = null) => ({
  id: null,
  productId,
  note: null,
  scheduleKind: 'always' as const,
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
});

const routineInput = (over: Partial<SaveRoutineInput> = {}): SaveRoutineInput => ({
  name: 'Evening A',
  timeOfDay: 'evening',
  customName: null,
  sortTime: '21:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  reminderTime: null,
  steps: [step(), step()],
  ...over,
});

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

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const show = () =>
    app.render(
      <>
        <RoutinesScreen />
        <PortalHost />
      </>,
    );
  return { ...app, show };
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
const preview = () => within(screen.getByTestId('starter-preview'));

/** Card names in screen order. */
const cardNames = () =>
  screen
    .queryAllByTestId(/^routine-card-/)
    .map((card) => within(card).getAllByRole('button')[0]!.props.accessibilityLabel.split(',')[0]);

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  routineDraftStore.setState(() => ({ draft: null }));
  router.push.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('RoutinesScreen', () => {
  it('shows the empty state in EN and LT, and New routine opens the starter', async () => {
    const app = setup();
    await app.show();
    expect(await screen.findByText('No routines yet')).toBeTruthy();
    expect(screen.getByText('Start from a template and swap in your products.')).toBeTruthy();
    // The empty state's button and the Fab.
    expect(screen.getAllByRole('button', { name: 'New routine' })).toHaveLength(2);

    await setI18nLanguage('lt');
    expect(await screen.findByText('Rutinų dar nėra')).toBeTruthy();
    expect(screen.getByText('Pradėkite nuo šablono ir įsidėkite savo produktus.')).toBeTruthy();
  });

  it('groups by time of day: no heading for one routine, "A or B" for two, Custom last', async () => {
    const app = setup();
    saveRoutine(app.db, routineInput({ name: 'Evening B' }));
    saveRoutine(app.db, routineInput({ name: 'Evening A' }));
    saveRoutine(
      app.db,
      routineInput({
        name: 'Morning',
        timeOfDay: 'morning',
        sortTime: '07:00',
        reminderTime: '07:30',
      }),
    );
    saveRoutine(
      app.db,
      routineInput({ name: 'Gym', timeOfDay: 'custom', customName: 'Gym', sortTime: '18:00' }),
    );
    await app.show();
    await screen.findByText('Evening A');

    expect(cardNames()).toEqual(['Morning', 'Evening B', 'Evening A', 'Gym']);
    // A lone Morning routine gets no heading that repeats its name.
    expect(screen.queryByRole('header', { name: 'Morning' })).toBeNull();
    expect(screen.getByRole('header', { name: 'Evening, A or B' })).toBeTruthy();
    expect(
      screen.getByText(
        'On nights both are set, you pick one on Today. A and B are never checked against each other for conflicts.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Custom' })).toBeTruthy();

    const morning = within(screen.getByTestId('routine-card-3'));
    expect(morning.getByText('Reminder at 07:30 · 2 steps')).toBeTruthy();
    expect(
      within(screen.getByTestId('routine-card-1')).getByText('No reminder · 2 steps'),
    ).toBeTruthy();
    expect(morning.getByLabelText('Every day')).toBeTruthy();
  });

  it('opens the editor on tap and the player on Start', async () => {
    const app = setup();
    saveRoutine(app.db, routineInput());
    await app.show();
    await fireEvent.press(await screen.findByTestId('routine-card-1'));
    expect(router.push).toHaveBeenCalledWith('/routines/1');
    await fireEvent.press(screen.getByRole('button', { name: 'Start Evening A' }));
    expect(router.push).toHaveBeenCalledWith('/player/1');
  });

  it('saves the active switch', async () => {
    const app = setup();
    saveRoutine(app.db, routineInput());
    await app.show();
    const toggle = await screen.findByRole('switch', { name: 'Evening A on' });
    expect(toggle.props.accessibilityState.checked).toBe(true);
    await fireEvent.press(toggle);
    await flush();
    expect(getRoutine(app.db, 1, TODAY, 30)?.active).toBe(false);
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Evening A on' }).props.accessibilityState.checked,
      ).toBe(false),
    );
    expect(screen.getAllByRole('button')[0]!.props.accessibilityLabel).toMatch(/Off$/);
  });

  it('duplicates as a variant with a toast', async () => {
    const app = setup();
    saveRoutine(app.db, routineInput());
    await app.show();
    await fireEvent(await screen.findByTestId('routine-card-1'), 'longPress');
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Duplicate as variant' }));
    await flush();
    expect(listRoutines(app.db, TODAY, 30).map((r) => r.name)).toEqual([
      'Evening A',
      'Evening A (copy)',
    ]);
    expect(uiStore.state.toasts[0]?.message).toBe('Evening A (copy) added');
    await waitFor(() => expect(cardNames()).toEqual(['Evening A', 'Evening A (copy)']));
    expect(screen.getByRole('header', { name: 'Evening, A or B' })).toBeTruthy();
  });

  it('deletes after the dialog', async () => {
    const app = setup();
    saveRoutine(app.db, routineInput());
    await app.show();
    await fireEvent(await screen.findByTestId('routine-card-1'), 'longPress');
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Delete Evening A?')).toBeTruthy();
    expect(
      screen.getByText("Its history in the calendar is deleted too. This can't be undone."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await flush();
    expect(listRoutines(app.db, TODAY, 30)).toEqual([]);
    expect(await screen.findByText('No routines yet')).toBeTruthy();
  });
});

describe('RoutineStarterSheet', () => {
  it('fills steps from products, marks gaps and opens the editor without saving', async () => {
    const app = setup();
    createProduct(app.db, productInput({ name: 'Old cleanser', category: 'cleanser' }));
    createProduct(app.db, productInput({ name: 'Gel cleanser', category: 'cleanser' }));
    createProduct(app.db, productInput({ name: 'Rich cream', category: 'moisturiser' }));
    // An evening routine exists, so the starter opens on Morning.
    saveRoutine(app.db, routineInput());
    await app.show();
    await screen.findByText('Evening A');
    await fireEvent.press(screen.getByRole('button', { name: 'New routine' }));

    const morning = screen.getByLabelText('Template');
    expect(
      within(morning)
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['Basics', 'Light', 'Start empty']);

    await waitFor(() => expect(preview().getByText('Gel cleanser')).toBeTruthy());
    expect(preview().getByText('Rich cream')).toBeTruthy();
    // No SPF yet: a gap.
    expect(preview().getByText('Pick a product later')).toBeTruthy();

    await fireEvent.press(within(morning).getByRole('radio', { name: 'Light' }));
    expect(preview().getByText('Rinse with water')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Evening' }));
    const evening = screen.getByLabelText('Template');
    expect(
      within(evening)
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['Treatment', 'Basics', 'Start empty']);
    // Treatment: cleanser, serum (gap), moisturiser.
    expect(preview().getAllByText('Pick a product later')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Create routine' }));
    expect(router.push).toHaveBeenCalledWith('/routines/new');
    expect(listRoutines(app.db, TODAY, 30)).toHaveLength(1);
    const draft = routineDraftStore.state.draft;
    expect(draft).toMatchObject({
      name: 'Evening treatment',
      timeOfDay: 'evening',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      reminderTime: null,
    });
    expect(draft?.steps.map((s) => s.productId)).toEqual([2, null, 3]);
  });

  it('says so when the template starts empty', async () => {
    const app = setup();
    await app.show();
    await screen.findByText('No routines yet');
    await fireEvent.press(screen.getAllByRole('button', { name: 'New routine' })[0]!);
    await fireEvent.press(screen.getByRole('radio', { name: 'Start empty' }));
    expect(screen.getByText('No steps yet. You add them on the next screen.')).toBeTruthy();
  });
});
