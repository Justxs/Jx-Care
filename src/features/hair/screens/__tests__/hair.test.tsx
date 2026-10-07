import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { queryClient } from '@/db/queryClient';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import {
  reminderAskStore,
  resetReminderAsk,
  setPermissionAdapter,
} from '@/notifications/askPermission';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { getHairTask, listHairTasks, saveHairTask } from '../../repo';
import type { HairTaskInput } from '../../schema';
import { HairListScreen } from '../HairListScreen';
import { HairTaskEditorScreen } from '../HairTaskEditorScreen';

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
  useNavigation: () => ({ addListener: () => () => {} }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock; back: jest.Mock } }>(
  'expo-router',
);

const TODAY = '2026-10-07'; // a Wednesday

const task = (over: Partial<HairTaskInput> = {}): HairTaskInput => ({
  name: 'Wash',
  kind: 'wash',
  otherKind: null,
  productIds: [],
  scheduleKind: 'interval',
  everyNDays: 3,
  intervalUnit: 'days',
  daysOfWeek: null,
  lastDoneAt: '2026-10-06',
  reminderTime: null,
  ...over,
});

const product = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Shampoo',
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
  ...over,
});

function setup(ui: 'list' | 'editor', params: Record<string, string> = {}) {
  mockParams.current = params;
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const show = () =>
    app.render(
      <>
        {ui === 'list' ? <HairListScreen /> : <HairTaskEditorScreen />}
        <PortalHost />
      </>,
    );
  return { ...app, show };
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

const next = () => screen.getByTestId('hair-setup-next');

/** The footer button of the sheet whose title is `title` (every sheet renders in Jest). */
function sheetButton(title: string, name: string) {
  let node = screen.getByRole('header', { name: title }).parent;
  while (node && !within(node).queryByRole('button', { name })) node = node.parent;
  if (!node) throw new Error(`No ${name} button in ${title}`);
  return within(node).getByRole('button', { name });
}

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  router.push.mockClear();
  router.back.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  resetReminderAsk();
  setPermissionAdapter(null);
});

// The permission ask stores its answer in the app's query client.
afterAll(() => queryClient.clear());

describe('HairListScreen', () => {
  it('shows the empty state in EN and LT, and the Fab opens a new task', async () => {
    const app = setup('list');
    await app.show();
    expect(await screen.findByText('Hair care is not set up')).toBeTruthy();
    expect(screen.getByText('Tell Jx Care how often you wash your hair.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set up hair care' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'New hair task' }));
    expect(router.push).toHaveBeenCalledWith('/routines/hair/new');

    await setI18nLanguage('lt');
    expect(await screen.findByText('Plaukų priežiūra nenustatyta')).toBeTruthy();
    expect(screen.getByText('Nurodykite Jx Care, kaip dažnai plaunate plaukus.')).toBeTruthy();
  });

  it('quick setup shows the next wash for every chip and saves the wash and the trim', async () => {
    const app = setup('list');
    await app.show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Set up hair care' }));

    // Last wash today (Wednesday 7 Oct).
    expect(next()).toHaveTextContent('Next wash: Saturday, 10 Oct');
    const expected: [string, string][] = [
      ['Every day', 'Thursday, 8 Oct'],
      ['Every 2 days', 'Friday, 9 Oct'],
      ['Every 3 days', 'Saturday, 10 Oct'],
      ['Twice a week', 'Thursday, 8 Oct'],
      ['Once a week', 'Wednesday, 14 Oct'],
    ];
    for (const [chip, date] of expected) {
      await fireEvent.press(screen.getByLabelText(chip));
      expect(next()).toHaveTextContent(`Next wash: ${date}`);
    }

    await fireEvent.press(screen.getByLabelText('Twice a week'));
    await fireEvent.press(screen.getByLabelText('Yesterday'));
    // Tuesday's wash: the next Monday-or-Thursday is Thursday.
    expect(next()).toHaveTextContent('Next wash: Thursday, 8 Oct');
    await fireEvent.press(screen.getByLabelText('2 days ago'));
    expect(next()).toHaveTextContent('Next wash: Thursday, 8 Oct');
    await fireEvent.press(screen.getByLabelText('Yesterday'));
    await fireEvent.press(screen.getByRole('switch', { name: 'Also track trims' }));
    expect(
      screen.getByText("Every 8 weeks. Trims don't count toward your hair streak."),
    ).toBeTruthy();
    await fireEvent.press(sheetButton('Set up hair care', 'Save'));
    await flush();

    const { washes, other } = listHairTasks(app.db, TODAY);
    expect(washes).toHaveLength(1);
    expect(washes[0]).toMatchObject({
      name: 'Wash',
      scheduleKind: 'days',
      daysOfWeek: [1, 4],
      lastDoneAt: '2026-10-06',
      nextDue: '2026-10-08',
    });
    expect(other[0]).toMatchObject({
      name: 'Trim',
      otherKind: 'trim',
      everyNDays: 56,
      intervalUnit: 'weeks',
    });

    // The list replaces the empty state.
    expect(await screen.findByRole('header', { name: 'Washes' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Other care' })).toBeTruthy();
    const wash = within(screen.getByTestId(`hair-task-${washes[0]!.id}`));
    expect(wash.getByText('Mon, Thu · Last 6 Oct')).toBeTruthy();
    expect(wash.getByText('Next 8 Oct')).toBeTruthy();
    const trim = within(screen.getByTestId(`hair-task-${other[0]!.id}`));
    expect(trim.getByText('Every 8 weeks · Last 7 Oct')).toBeTruthy();
    expect(trim.getByText('Next 2 Dec')).toBeTruthy();
  });

  it('sends Other to the full editor', async () => {
    const app = setup('list');
    await app.show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Set up hair care' }));
    await fireEvent.press(screen.getByLabelText('Other'));
    expect(router.push).toHaveBeenCalledWith('/routines/hair/new');
    expect(listHairTasks(app.db, TODAY).washes).toEqual([]);
  });

  it('shows frequency, next due with overdue in warning, last done as a date; tap edits', async () => {
    const app = setup('list');
    const late = saveHairTask(app.db, task({ name: 'Wash', lastDoneAt: '2026-10-03' }));
    saveHairTask(
      app.db,
      task({ name: 'Oil wash', scheduleKind: 'days', daysOfWeek: [3, 6], everyNDays: null }),
    );
    saveHairTask(
      app.db,
      task({
        name: 'Henna',
        kind: 'other',
        otherKind: 'colour',
        everyNDays: 42,
        intervalUnit: 'weeks',
        lastDoneAt: '2026-08-18',
      }),
    );
    await app.show();

    const overdue = within(await screen.findByTestId(`hair-task-${late}`));
    expect(overdue.getByText('Every 3 days · Last 3 Oct')).toBeTruthy();
    expect(overdue.getByText('Overdue 1 day').props.className).toContain('text-warning');
    const oil = within(screen.getByTestId('hair-task-2'));
    expect(oil.getByText('Wed, Sat · Last 6 Oct')).toBeTruthy();
    expect(oil.getByText('Due today').props.className).not.toContain('text-warning');
    const henna = within(screen.getByTestId('hair-task-3'));
    expect(henna.getByText('Every 6 weeks · Last 18 Aug')).toBeTruthy();
    // Six weeks after 18 Aug is 29 Sep: overdue.
    expect(henna.getByText('Overdue 8 days')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('hair-task-2'));
    expect(router.push).toHaveBeenCalledWith('/routines/hair/2');
  });
});

describe('HairTaskEditorScreen', () => {
  it('creates a wash with products; Save task is in the bottom bar, not the header', async () => {
    setPermissionAdapter({ get: async () => 'undetermined', request: async () => 'granted' });
    const app = setup('editor', { id: 'new' });
    createProduct(app.db, product({ name: 'Shampoo' }));
    createProduct(app.db, product({ name: 'Face cream', area: 'skin', category: 'moisturiser' }));
    createProduct(app.db, product({ name: 'Old mask', expiresAt: '2026-09-01' }));
    createProduct(app.db, product({ name: 'Conditioner', area: 'both', category: 'conditioner' }));
    await app.show();

    expect(await screen.findByRole('header', { name: 'New hair task' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save task' })).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Wash');
    expect(screen.getByText('Washes count toward your hair streak.')).toBeTruthy();
    expect(screen.getByTestId('hair-next-due')).toHaveTextContent('Next due: Saturday, 10 Oct');

    await fireEvent.press(screen.getByRole('button', { name: 'Pick products' }));
    expect(screen.queryByRole('checkbox', { name: /Face cream/ })).toBeNull();
    expect(screen.getByText("Can't be picked")).toBeTruthy();
    const expired = screen.getByRole('checkbox', { name: /^Old mask/ });
    expect(expired.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Shampoo/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Conditioner/ }));
    await fireEvent.press(sheetButton('Choose products', 'Done'));
    expect(screen.getByRole('button', { name: 'Remove Shampoo' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Conditioner' }));

    await fireEvent.changeText(screen.getByLabelText('Repeat every (days)'), '4');
    expect(screen.getByTestId('hair-next-due')).toHaveTextContent('Next due: Sunday, 11 Oct');
    await fireEvent.press(screen.getByRole('switch', { name: 'Reminder' }));
    // Turning a reminder on asks for notification permission (task 021's ask, worded for hair).
    await waitFor(() => expect(reminderAskStore.state.ask?.reason).toBe('hair'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    await flush();

    expect(getHairTask(app.db, 1, TODAY)).toMatchObject({
      name: 'Wash',
      kind: 'wash',
      productIds: [1],
      scheduleKind: 'interval',
      everyNDays: 4,
      lastDoneAt: TODAY,
      reminderTime: '19:00',
      nextDue: '2026-10-11',
    });
    expect(uiStore.state.toasts[0]?.message).toBe('Wash added');
    expect(router.back).toHaveBeenCalled();
  });

  it('creates other care every few weeks; the kind sets the name and products go away', async () => {
    const app = setup('editor', { id: 'new' });
    await app.show();
    await screen.findByRole('header', { name: 'New hair task' });
    expect(screen.queryByRole('radio', { name: /^Every few weeks/ })).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Other care' }));
    expect(screen.getByText("Other care doesn't count toward your hair streak.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pick products' })).toBeNull();
    expect(screen.getByLabelText('Name').props.value).toBe('Trim');
    await fireEvent.press(screen.getByLabelText('Colour'));
    expect(screen.getByLabelText('Name').props.value).toBe('Colour');

    await fireEvent.press(screen.getByRole('radio', { name: /^Every few weeks/ }));
    await fireEvent.changeText(screen.getByLabelText('Repeat every (weeks)'), '8');
    expect(screen.getByTestId('hair-next-due')).toHaveTextContent('Next due: Wednesday, 2 Dec');
    await fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    await flush();

    expect(getHairTask(app.db, 1, TODAY)).toMatchObject({
      name: 'Colour',
      kind: 'other',
      otherKind: 'colour',
      productIds: [],
      everyNDays: 56,
      intervalUnit: 'weeks',
      nextDue: '2026-12-02',
    });
  });

  it('keeps a typed name when the kind changes', async () => {
    const app = setup('editor', { id: 'new' });
    await app.show();
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Scalp scrub');
    await fireEvent.press(screen.getByRole('radio', { name: 'Other care' }));
    await fireEvent.press(screen.getByLabelText('Mask'));
    expect(screen.getByLabelText('Name').props.value).toBe('Scalp scrub');
  });

  it('shows errors in place and needs a day for set days', async () => {
    const app = setup('editor', { id: 'new' });
    await app.show();
    await fireEvent.changeText(await screen.findByLabelText('Name'), '');
    await fireEvent.changeText(screen.getByLabelText('Repeat every (days)'), '');
    expect(screen.getByTestId('hair-next-due')).toHaveTextContent('');
    await fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    await flush();
    expect(screen.getByText('Enter a name.')).toBeTruthy();
    expect(screen.getByText('Enter a whole number, like 3.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: /^Set days/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    await flush();
    expect(screen.getByText('Choose at least one day.')).toBeTruthy();
    expect(listHairTasks(app.db, TODAY).washes).toEqual([]);

    await fireEvent.press(within(screen.getByLabelText('Days')).getByLabelText('Monday'));
    expect(screen.getByTestId('hair-next-due')).toHaveTextContent('Next due: Monday, 12 Oct');
  });

  it('edits a saved task and asks before discarding changes', async () => {
    const app = setup('editor', { id: '1' });
    saveHairTask(
      app.db,
      task({
        name: 'Wash',
        scheduleKind: 'days',
        daysOfWeek: [2, 5],
        everyNDays: null,
        reminderTime: '08:30',
      }),
    );
    await app.show();
    await screen.findByLabelText('Name');
    expect(screen.getByRole('header', { name: 'Edit hair task' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /^Set days/ }).props.accessibilityState.checked).toBe(
      true,
    );
    // Last done Tuesday 6 Oct: the next of Tuesday or Friday is Friday.
    expect(screen.getByTestId('hair-next-due')).toHaveTextContent('Next due: Friday, 9 Oct');
    expect(screen.getByRole('switch', { name: 'Reminder' }).props.accessibilityState.checked).toBe(
      true,
    );

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Long wash');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Save task' }));
    await flush();
    expect(getHairTask(app.db, 1, TODAY)).toMatchObject({
      name: 'Long wash',
      daysOfWeek: [2, 5],
      reminderTime: '08:30',
    });
    expect(uiStore.state.toasts[0]?.message).toBe('Long wash saved');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('deletes after the dialog', async () => {
    const app = setup('editor', { id: '1' });
    saveHairTask(app.db, task({ name: 'Wash' }));
    await app.show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete task' }));
    expect(await screen.findByText('Delete Wash?')).toBeTruthy();
    expect(
      screen.getByText(
        "Its history leaves the calendar and the hair streak. This can't be undone.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await flush();
    expect(getHairTask(app.db, 1, TODAY)).toBeNull();
    expect(uiStore.state.toasts[0]?.message).toBe('Wash deleted');
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    // The form stays on screen while it leaves.
    expect(screen.getByRole('header', { name: 'Edit hair task' })).toBeTruthy();
  });
});
