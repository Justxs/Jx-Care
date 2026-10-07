import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { and, eq } from 'drizzle-orm';
import * as Haptics from 'expo-haptics';

import type { Db } from '@/db';
import { routineLog, routineStep } from '@/db/schema';
import { markFinished } from '@/features/products/repo';
import { registerBuyAgain } from '@/features/shopping/buyAgain';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { MON, seedProduct, seedRoutine } from '@/features/today/testUtils';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';
import { addBuyAgain } from '@/features/shopping/repo';

import * as reminders from '../../reminders';
import { registerPlayerConflicts } from '../../playerSlots';
import { getDayLog, getRoutineDay, tickSteps } from '../../repo';
import { RoutineDoneScreen } from '../RoutineDoneScreen';
import { RoutinePlayerScreen } from '../RoutinePlayerScreen';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
// A bottom sheet that shows its content only while presented and reports closing like the real one.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const mock = jest.requireActual('@gorhom/bottom-sheet/mock');
  type MockProps = { children: React.ReactNode; onDismiss?: () => void };
  class BottomSheetModal extends React.Component<MockProps, { open: boolean }> {
    state = { open: false };
    present() {
      this.setState({ open: true });
    }
    dismiss() {
      if (!this.state.open) return;
      this.setState({ open: false });
      this.props.onDismiss?.();
    }
    render() {
      if (!this.state.open) return null;
      return React.createElement(RN.View, { testID: 'sheet' }, this.props.children);
    }
  }
  return { ...mock, BottomSheetModal };
});

const expoRouter = jest.requireMock<{
  router: { replace: jest.Mock; back: jest.Mock; dismissTo: jest.Mock };
  useLocalSearchParams: jest.Mock;
}>('expo-router');
const { router } = expoRouter;

const WARN = 30;

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', setupHiddenAt: '2026-01-01' });
  appStore.setState((s) => ({ ...s, activeDay: MON }));
  return app;
}

type App = ReturnType<typeof setup>;

function stepIds(db: Db, routineId: number): number[] {
  return getRoutineDay(db, routineId, MON, WARN)!.steps.map((s) => s.id);
}

async function renderPlayer(app: App, routineId: number) {
  expoRouter.useLocalSearchParams.mockReturnValue({ routineId: String(routineId) });
  await app.render(
    <>
      <RoutinePlayerScreen />
      <PortalHost />
    </>,
  );
  await screen.findByRole('header', { name: /./ });
}

async function renderDone(app: App, routineId: number, from?: number) {
  expoRouter.useLocalSearchParams.mockReturnValue({
    routineId: String(routineId),
    ...(from === undefined ? {} : { from: String(from) }),
  });
  await app.render(<RoutineDoneScreen />);
}

const checkbox = (name: RegExp | string) => screen.getByRole('checkbox', { name });

beforeEach(async () => {
  await setI18nLanguage('en');
  uiStore.setState((s) => ({ ...s, toasts: [], toastInset: 0 }));
  router.replace.mockClear();
  router.back.mockClear();
  router.dismissTo.mockClear();
  jest.mocked(Haptics.impactAsync).mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  registerPlayerConflicts(() => []);
  registerBuyAgain(() => null);
  jest.restoreAllMocks();
});

describe('RoutinePlayerScreen', () => {
  it('shows the steps due today in order; a row press ticks and unticks, and both save', async () => {
    const app = setup();
    const toner = seedProduct(app.db, { name: 'Toner', brand: 'Acme' });
    const serum = seedProduct(app.db, { name: 'Serum' });
    const cream = seedProduct(app.db, { name: 'Cream' });
    const id = seedRoutine(app.db, { name: 'Evening', steps: [toner, serum, cream] });
    const [s1, s2, s3] = stepIds(app.db, id);
    // The serum only runs on Wednesdays, so it is hidden on Monday.
    app.db
      .update(routineStep)
      .set({ scheduleKind: 'days', daysOfWeek: [3] })
      .where(eq(routineStep.id, s2!))
      .run();
    app.db.update(routineStep).set({ note: '2 drops' }).where(eq(routineStep.id, s3!)).run();
    await renderPlayer(app, id);

    expect(screen.getByText('Evening · Step 1 of 2')).toBeTruthy();
    expect(screen.getAllByRole('checkbox').map((c) => c.props.accessibilityLabel)).toEqual([
      'Toner, Acme',
      'Cream, 2 drops',
    ]);
    expect(screen.queryByText('Serum')).toBeNull();

    await fireEvent.press(checkbox('Toner, Acme'));
    await waitFor(() => expect(checkbox('Toner, Acme')).toBeChecked());
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getDayLog(app.db, id, MON)?.doneStepIds).toEqual([s1]));
    expect(screen.getByText('Evening · Step 2 of 2')).toBeTruthy();

    // Tapping a done row unticks it.
    await fireEvent.press(checkbox('Toner, Acme'));
    await waitFor(() => expect(checkbox('Toner, Acme')).not.toBeChecked());
    await waitFor(() => expect(getDayLog(app.db, id, MON)?.doneStepIds).toEqual([]));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps ticks when left mid-way, and the last tick hands over to the done screen', async () => {
    const app = setup();
    const completed = jest.spyOn(reminders, 'cancelTodaysRoutineReminders');
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null, null] });
    const [s1, s2] = stepIds(app.db, id);
    // Ticked earlier, then the player was closed.
    tickSteps(app.db, id, [s1!], MON, true, [s1!, s2!]);
    await renderPlayer(app, id);

    expect(screen.getByText('Evening · Step 2 of 2')).toBeTruthy();
    const rows = screen.getAllByRole('checkbox');
    expect(rows[0]).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(router.back).toHaveBeenCalled();
    expect(getDayLog(app.db, id, MON)?.doneStepIds).toEqual([s1]);

    await fireEvent.press(rows[1]!);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/player/[routineId]/done',
      params: { routineId: String(id), from: '0' },
    });
    await waitFor(() => expect(getDayLog(app.db, id, MON)?.completedAt).not.toBeNull());
    expect(completed).toHaveBeenCalledWith(id);
  });

  it('All done ticks every remaining step and opens the done screen', async () => {
    const app = setup();
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null, null, null] });
    await renderPlayer(app, id);

    await fireEvent.press(screen.getByRole('button', { name: 'All done' }));
    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/player/[routineId]/done' }),
    );
    await waitFor(() => expect(getDayLog(app.db, id, MON)?.doneStepIds).toHaveLength(3));
    expect(getDayLog(app.db, id, MON)?.completedAt).not.toBeNull();
  });

  it('starts a wait after a step that needs one, holds the next step, and Skip wait ends it', async () => {
    const app = setup();
    const a = seedProduct(app.db, { name: 'Acid toner' });
    const b = seedProduct(app.db, { name: 'Serum' });
    const id = seedRoutine(app.db, { name: 'Evening', steps: [a, b] });
    const [s1] = stepIds(app.db, id);
    app.db.update(routineStep).set({ waitSeconds: 60 }).where(eq(routineStep.id, s1!)).run();
    await renderPlayer(app, id);

    expect(screen.queryByTestId('wait-bar')).toBeNull();
    await fireEvent.press(checkbox('Acid toner'));

    expect(await screen.findByText('Wait 1:00 before the next step')).toBeTruthy();
    expect(screen.getByText('Next, after the wait')).toBeTruthy();
    expect(checkbox('Serum, Next, after the wait')).toBeTruthy();
    // The held step's name turns muted; nothing uses opacity.
    expect(screen.getByText('Serum').props.className).toContain('text-ink-muted');

    // Toasts float above the bar while it shows.
    await fireEvent(screen.getByTestId('wait-bar'), 'layout', {
      nativeEvent: { layout: { height: 84 } },
    });
    expect(uiStore.state.toastInset).toBe(84);

    await fireEvent.press(screen.getByRole('button', { name: 'Skip wait' }));
    expect(screen.queryByTestId('wait-bar')).toBeNull();
    expect(screen.queryByText('Next, after the wait')).toBeNull();
    expect(screen.getByText('Serum').props.className).not.toContain('text-ink-muted');
    expect(uiStore.state.toastInset).toBe(0);
  });

  it('shows expired, finished and missing products as cards, and Pick another replaces the product', async () => {
    const app = setup();
    const spf = seedProduct(app.db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    const oil = seedProduct(app.db, { name: 'Face oil' });
    markFinished(app.db, oil, MON);
    const fresh = seedProduct(app.db, { name: 'Fresh cream', brand: 'Acme' });
    const id = seedRoutine(app.db, { name: 'Evening', steps: [spf, oil, null] });
    const [s1] = stepIds(app.db, id);
    await renderPlayer(app, id);

    expect(screen.getByText('Step 1 · SPF 50 fluid')).toBeTruthy();
    expect(screen.getByText('Expired 2 Oct')).toBeTruthy();
    expect(screen.getByText('Step 2 · Face oil')).toBeTruthy();
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.getByText('Step 3 · No product yet')).toBeTruthy();
    expect(
      screen.getAllByText('Pick another product for this step, or tick it to use this one today.'),
    ).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Pick another' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Pick a product' })).toBeTruthy();
    // Buy again waits for task 034.
    expect(screen.queryByRole('button', { name: 'Buy again' })).toBeNull();
    // The card keeps its checkbox.
    expect(checkbox('Step 1 · SPF 50 fluid, Expired 2 Oct')).not.toBeChecked();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Pick another' })[0]!);
    const sheet = within(await screen.findByTestId('sheet'));
    // Expired products sit under Can't be picked, disabled; finished ones aren't listed.
    expect(sheet.getByRole('header', { name: "Can't be picked" })).toBeTruthy();
    expect(sheet.queryByText('Face oil')).toBeNull();
    await fireEvent.press(sheet.getByRole('button', { name: /^Fresh cream/ }));

    await waitFor(() => expect(screen.queryByText('Step 1 · SPF 50 fluid')).toBeNull());
    expect(checkbox('Fresh cream, Acme')).toBeTruthy();
    const step = app.db.select().from(routineStep).where(eq(routineStep.id, s1!)).get();
    expect(step?.productId).toBe(fresh);
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('shows Buy again on a problem card once the shopping list provides it', async () => {
    const app = setup();
    const buy = jest.fn();
    registerBuyAgain(() => buy);
    const spf = seedProduct(app.db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    const id = seedRoutine(app.db, { name: 'Evening', steps: [spf, null] });
    await renderPlayer(app, id);

    // Only on the product's card, not on the step without a product.
    expect(screen.getAllByRole('button', { name: 'Buy again' })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Buy again' }));
    expect(buy).toHaveBeenCalledWith([{ id: spf, name: 'SPF 50 fluid' }]);
  });

  it('the conflict tag and Why? open the conflict sheet', async () => {
    const app = setup();
    const vc = seedProduct(app.db, { name: 'Vitamin C serum' });
    const id = seedRoutine(app.db, { name: 'Morning', timeOfDay: 'morning', steps: [vc, null] });
    const [s1] = stepIds(app.db, id);
    registerPlayerConflicts((routineId) =>
      routineId === id
        ? [
            {
              stepId: s1!,
              conflict: {
                first: { product: 'Vitamin C serum', routine: 'Morning' },
                second: { product: 'the glycolic acid toner', routine: 'Evening B' },
                weekdays: [1],
                note: null,
                mild: false,
              },
            },
          ]
        : [],
    );
    await renderPlayer(app, id);

    expect(
      screen.getByText(
        'Vitamin C serum conflicts with the glycolic acid toner in Evening B. Using both on one day can irritate.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Conflict. Tap for details.' }));
    let sheet = within(await screen.findByTestId('sheet'));
    expect(sheet.getByText('Why this warning')).toBeTruthy();
    expect(
      sheet.getByText(
        'Vitamin C serum in Morning and the glycolic acid toner in Evening B are a conflict pair.',
      ),
    ).toBeTruthy();
    await fireEvent.press(sheet.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('sheet')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Why this warning' }));
    sheet = within(await screen.findByTestId('sheet'));
    expect(sheet.getByText('They meet on Mon.')).toBeTruthy();
  });

  it('says so when the routine has nothing due today', async () => {
    const app = setup();
    const id = seedRoutine(app.db, { name: 'Evening A', days: [3] });
    expoRouter.useLocalSearchParams.mockReturnValue({ routineId: String(id) });
    await app.render(<RoutinePlayerScreen />);

    expect(await screen.findByText('Nothing set for today')).toBeTruthy();
    expect(screen.getByText('Evening A has no steps due today.')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    expect(router.back).toHaveBeenCalled();
  });

  it('reads in Lithuanian', async () => {
    const app = setup();
    saveSettings(app.db, { language: 'lt' });
    await setI18nLanguage('lt');
    const spf = seedProduct(app.db, { name: 'SPF 50', expiresAt: '2026-10-02' });
    const id = seedRoutine(app.db, { name: 'Vakaras', steps: [spf, null] });
    await renderPlayer(app, id);

    expect(screen.getByText('Vakaras · 1 žingsnis iš 2')).toBeTruthy();
    expect(screen.getByText('1 žingsnis · SPF 50')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pasirinkti kitą' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Viskas atlikta' })).toBeTruthy();
  });
});

function finishAt(db: Db, id: number, day: string, hh = 21, mm = 52) {
  const r = getRoutineDay(db, id, day, WARN)!;
  tickSteps(db, id, r.progress.dueStepIds, day, true, r.progress.dueStepIds);
  const [y, mo, d] = day.split('-').map(Number);
  db.update(routineLog)
    .set({ completedAt: new Date(y!, mo! - 1, d!, hh, mm).getTime() })
    .where(and(eq(routineLog.routineId, id), eq(routineLog.day, day)))
    .run();
}

describe('RoutineDoneScreen', () => {
  it('shows the time of day done, the streak counting up, what is next and Back to Today', async () => {
    const app = setup();
    const spf = seedProduct(app.db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    seedRoutine(app.db, {
      name: 'Morning',
      timeOfDay: 'morning',
      reminderTime: '07:30',
      steps: [spf],
    });
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null, null, null, spf] });
    finishAt(app.db, id, MON);
    await renderDone(app, id, 0);

    expect(await screen.findByText('Evening done')).toBeTruthy();
    expect(screen.getByText('All 4 steps, finished at 21:52.')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText('Skin: 1 day in a row. Best 1 day')).toBeTruthy(),
    );
    expect(await screen.findByText('Next: Morning · Tomorrow at 07:30')).toBeTruthy();
    expect(screen.getByText('SPF 50 fluid expired 2 Oct')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Back to Today' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('says when an expired product is already on the shopping list', async () => {
    const app = setup();
    const spf = seedProduct(app.db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    addBuyAgain(app.db, spf);
    const id = seedRoutine(app.db, { name: 'Evening', steps: [spf] });
    finishAt(app.db, id, MON);
    await renderDone(app, id, 0);
    expect(
      await screen.findByText('SPF 50 fluid expired 2 Oct · On your shopping list'),
    ).toBeTruthy();
  });

  it('says "Started again" after a break, and Add a note opens the condition log on Skin', async () => {
    const app = setup();
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null] });
    // Two days in a row, then a day not done, then today.
    finishAt(app.db, id, '2026-10-01');
    finishAt(app.db, id, '2026-10-02');
    finishAt(app.db, id, MON);
    expect(getSettings(app.db).language).toBe('en');
    await renderDone(app, id, 0);

    await waitFor(() =>
      expect(
        screen.getByLabelText('Skin: 1 day in a row. Started again. Your best is still 2 days.'),
      ).toBeTruthy(),
    );
    expect(screen.getByText('1 step, finished at 21:52.')).toBeTruthy();
    expect(await screen.findByText('Next: Evening · Tomorrow at 21:00')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    expect(await screen.findByLabelText('Skin tags')).toBeTruthy();
  });

  it('counts up from the streak before the last tick', async () => {
    const app = setup();
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null] });
    finishAt(app.db, id, '2026-10-04');
    finishAt(app.db, id, MON);
    await renderDone(app, id, 1);

    // The first frame shows the number from before, then it counts up to the new one.
    expect(screen.getByLabelText(/^Skin: 1 day in a row/)).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText(/^Skin: 2 days in a row/)).toBeTruthy());
    await act(async () => {});
  });
});
