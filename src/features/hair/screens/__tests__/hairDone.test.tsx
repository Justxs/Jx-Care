import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { queryClient } from '@/db/queryClient';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveSettings } from '@/features/settings/repo';
import { seedRoutine } from '@/features/today/testUtils';
import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { getHairTask, hairLogsOnDay, markHairDone, saveHairTask } from '../../repo';
import type { HairTaskInput } from '../../schema';
import { HairDoneScreen } from '../HairDoneScreen';

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{
  router: { push: jest.Mock; back: jest.Mock };
}>('expo-router');

const TODAY = '2026-10-07'; // a Wednesday

const wash = (over: Partial<HairTaskInput> = {}): HairTaskInput => ({
  name: 'Wash',
  kind: 'wash',
  otherKind: null,
  productIds: [],
  scheduleKind: 'interval',
  everyNDays: 3,
  intervalUnit: 'days',
  daysOfWeek: null,
  lastDoneAt: '2026-10-04',
  reminderTime: null,
  ...over,
});

const product = (name: string): ProductInput => ({
  name,
  brand: null,
  area: 'hair',
  category: 'shampoo',
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
});

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const shampoo = createProduct(app.db, product('Shampoo'));
  const conditioner = createProduct(app.db, product('Conditioner'));
  return { ...app, shampoo, conditioner };
}

async function openSheet(app: ReturnType<typeof setup>, taskId: number) {
  mockParams.current = { taskId: String(taskId) };
  await app.render(
    <>
      <HairDoneScreen />
      <PortalHost />
    </>,
  );
}

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  router.push.mockClear();
  router.back.mockClear();
});

afterAll(() => queryClient.clear());

describe('HairDoneSheet (T3)', () => {
  it('logs the wash with the picked products and note, then shows the next wash in place of the button', async () => {
    const app = setup();
    const id = saveHairTask(app.db, wash({ productIds: [app.shampoo, app.conditioner] }));
    await openSheet(app, id);

    expect(await screen.findByRole('header', { name: 'Wash' })).toBeTruthy();
    expect(screen.getByText('Today, 7 Oct')).toBeTruthy();
    const chips = within(screen.getByLabelText('Products'));
    expect(chips.getByRole('button', { name: 'Shampoo' }).props.accessibilityState.selected).toBe(
      true,
    );
    // Tap to unselect: the chip stays where it is.
    await fireEvent.press(chips.getByRole('button', { name: 'Conditioner' }));
    expect(
      chips.getByRole('button', { name: 'Conditioner' }).props.accessibilityState.selected,
    ).toBe(false);
    expect(chips.getByRole('button', { name: 'Add a product' })).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Note'), 'Felt light');
    const button = screen.getByRole('button', { name: 'Mark as done' });
    await fireEvent.press(button);

    const next = await screen.findByTestId('hair-done-next');
    expect(next).toHaveTextContent('Next wash: Saturday, 10 Oct');
    expect(next.props.accessibilityLabel).toBe('Next wash: Saturday, 10 Oct. Tap to close.');
    // The line takes the button's place at the same height.
    expect(next.props.className).toContain('min-h-[52px]');
    expect(screen.queryByRole('button', { name: 'Mark as done' })).toBeNull();

    expect(hairLogsOnDay(app.db, TODAY)).toEqual([
      expect.objectContaining({ hairTaskId: id, productIds: [app.shampoo], note: 'Felt light' }),
    ]);
    expect(getHairTask(app.db, id, TODAY)).toMatchObject({
      lastDoneAt: TODAY,
      nextDue: '2026-10-10',
    });

    await fireEvent.press(next);
    expect(router.back).toHaveBeenCalled();
  });

  it('closes by itself after a short pause', async () => {
    const app = setup();
    const id = saveHairTask(app.db, wash());
    await openSheet(app, id);
    await fireEvent.press(await screen.findByRole('button', { name: 'Mark as done' }));
    await screen.findByTestId('hair-done-next');
    await waitFor(() => expect(router.back).toHaveBeenCalled(), { timeout: 4000 });
  });

  it('for other care: no products, and the next trim line', async () => {
    const app = setup();
    const id = saveHairTask(
      app.db,
      wash({
        name: 'Trim',
        kind: 'other',
        otherKind: 'trim',
        everyNDays: 56,
        intervalUnit: 'weeks',
        lastDoneAt: '2026-08-10',
      }),
    );
    await openSheet(app, id);
    expect(await screen.findByRole('header', { name: 'Trim' })).toBeTruthy();
    expect(screen.queryByLabelText('Products')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Mark as done' }));
    expect(await screen.findByTestId('hair-done-next')).toHaveTextContent(
      'Next trim: Wednesday, 2 Dec',
    );
  });

  it('keeps the note to 280 characters', async () => {
    const app = setup();
    const id = saveHairTask(app.db, wash());
    await openSheet(app, id);
    await fireEvent.changeText(await screen.findByLabelText('Note'), 'x'.repeat(281));
    await fireEvent.press(screen.getByRole('button', { name: 'Mark as done' }));
    expect(await screen.findByText('Keep the note to 280 characters or fewer.')).toBeTruthy();
    expect(hairLogsOnDay(app.db, TODAY)).toEqual([]);
  });

  it('says so when the task is gone', async () => {
    const app = setup();
    await openSheet(app, 99);
    expect(await screen.findByText('This hair task no longer exists.')).toBeTruthy();
  });
});

describe('Today hair rows and streak chip', () => {
  it('lists due and overdue tasks, opens the sheet, and a done row leaves while the chip counts', async () => {
    const app = setup();
    seedRoutine(app.db, { name: 'Evening' });
    const due = saveHairTask(app.db, wash({ productIds: [app.shampoo, app.conditioner] }));
    const late = saveHairTask(
      app.db,
      wash({ name: 'Hair mask', kind: 'other', otherKind: 'mask', lastDoneAt: '2026-10-03' }),
    );
    saveHairTask(app.db, wash({ name: 'Later', lastDoneAt: '2026-10-06' }));
    await app.render(<TodayScreen />);

    const section = within(await screen.findByTestId('today-section-hair'));
    expect(section.getByText('Hair care')).toBeTruthy();
    expect(section.getByText('Wash: Shampoo + Conditioner')).toBeTruthy();
    expect(section.getByText('Due today')).toBeTruthy();
    expect(section.getByText('Overdue 1 day').props.className).toContain('text-warning');
    expect(section.queryByText(/Later/)).toBeNull();
    // Most overdue first.
    expect(section.getAllByRole('button').map((b) => b.props.testID)).toEqual([
      `hair-due-${late}`,
      `hair-due-${due}`,
    ]);

    // Washes only: other care never counts toward the chip.
    expect(screen.getByRole('button', { name: /^Hair streak: 0 days/ })).toBeTruthy();

    await fireEvent.press(section.getByRole('button', { name: /^Wash: Shampoo \+ Conditioner/ }));
    expect(router.push).toHaveBeenCalledWith(`/hair/done/${due}`);

    // Marked done from the sheet: the row goes and the streak counts up.
    markHairDone(app.db, due, { day: TODAY, productIds: [app.shampoo], note: null });
    await act(() => app.client.invalidateQueries());
    await waitFor(() => expect(screen.queryByText('Wash: Shampoo + Conditioner')).toBeNull());
    expect(await screen.findByRole('button', { name: /^Hair streak: 1 day\./ })).toBeTruthy();
  });

  it('hides the section and the chip when nothing is due and no wash exists', async () => {
    const app = setup();
    seedRoutine(app.db, { name: 'Evening' });
    saveHairTask(
      app.db,
      wash({ name: 'Trim', kind: 'other', otherKind: 'trim', lastDoneAt: '2026-10-06' }),
    );
    await app.render(<TodayScreen />);
    await screen.findByTestId('today-section-routines');
    expect(screen.queryByTestId('today-section-hair')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Hair streak/ })).toBeNull();
  });
});
