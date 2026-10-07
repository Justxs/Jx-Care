import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { Text } from 'react-native';

import { getDayLog, getTodayRoutines, tickSteps } from '@/features/routines/repo';
import { productListStore } from '@/features/products/listState';
import { defaultProductFilters } from '@/features/products/types';
import { quickSetup } from '@/features/hair/repo';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, runToastAction, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { CheckInCard } from '../../components/CheckInCard';
import * as slots from '../../slots';
import { prefetchToday } from '../../prefetch';
import { MON, TUE, WED, seedProduct, seedRoutine } from '../../testUtils';
import { TodayScreen } from '../TodayScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn() },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
// A bottom sheet that shows its content only while presented and reports closing like the real
// one: Close dismisses it, and the "drag" handle stands in for dragging it down.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const mock = jest.requireActual('@gorhom/bottom-sheet/mock');
  type MockProps = {
    children: React.ReactNode;
    onDismiss?: () => void;
    enablePanDownToClose?: boolean;
  };
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
      return React.createElement(
        RN.View,
        { testID: 'sheet' },
        this.props.children,
        this.props.enablePanDownToClose
          ? React.createElement(RN.Pressable, {
              testID: 'sheet-drag',
              onPress: () => this.dismiss(),
            })
          : null,
      );
    }
  }
  return { ...mock, BottomSheetModal };
});

const { router } = jest.requireMock<{
  router: { push: jest.Mock; navigate: jest.Mock };
}>('expo-router');

function setup(day = MON) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  appStore.setState((s) => ({ ...s, activeDay: day }));
  return app;
}

/** Renders Today the way the app does: prefetched, so every section is there on the first frame. */
async function renderToday(app: ReturnType<typeof setup>) {
  await prefetchToday(app.client, appStore.state.activeDay);
  await app.render(
    <>
      <TodayScreen />
      <PortalHost />
    </>,
  );
  expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeTruthy();
}

/** The setup card hidden, so routine cards own the filled button. */
function skipSetup(app: ReturnType<typeof setup>) {
  saveSettings(app.db, { setupHiddenAt: '2026-01-01' });
}

const sectionKeys = () =>
  screen
    .queryAllByTestId(/^today-section-/)
    .map((s) => s.props.testID.replace('today-section-', ''));

beforeEach(async () => {
  await setI18nLanguage('en');
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  productListStore.setState(() => ({ filters: defaultProductFilters }));
  router.push.mockClear();
  router.navigate.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
  jest.restoreAllMocks();
});

/** A daily Morning, Evening A on Mon/Wed/Fri and Evening B on Tue/Thu. */
function seedWeek(app: ReturnType<typeof setup>) {
  skipSetup(app);
  seedRoutine(app.db, {
    name: 'Morning',
    timeOfDay: 'morning',
    reminderTime: '07:30',
    steps: [null, null, null, null],
  });
  seedRoutine(app.db, { name: 'Evening A', days: [1, 3, 5] });
  seedRoutine(app.db, { name: 'Evening B', days: [2, 4] });
}

describe('TodayScreen routine cards', () => {
  it('shows the right cards for each weekday', async () => {
    const app = setup(MON);
    seedWeek(app);
    await renderToday(app);

    expect(screen.getByText('Monday, 5 Oct')).toBeTruthy();
    const morning = within(screen.getByTestId('routine-card-morning'));
    expect(morning.getByText('Morning')).toBeTruthy();
    expect(morning.getByText('Reminder at 07:30 · 4 steps')).toBeTruthy();
    const evening = within(screen.getByTestId('routine-card-evening'));
    expect(evening.getByText('No reminder · 2 steps')).toBeTruthy();
    // One routine at the time of day: no A/B chips.
    expect(screen.queryByText('About A and B')).toBeNull();
    // Only the first unfinished card's Start is filled.
    const starts = screen.getAllByRole('button', { name: 'Start' });
    expect(starts.map((b) => b.props.className.includes('bg-accent'))).toEqual([true, false]);

    await act(async () => appStore.setState((s) => ({ ...s, activeDay: TUE })));
    expect(await screen.findByText('Tuesday, 6 Oct')).toBeTruthy();
    // The new day's routines load after the header changes.
    expect(await screen.findByTestId('routine-card-evening')).toBeTruthy();
    expect(screen.getByTestId('routine-card-morning')).toBeTruthy();
  });

  it('offers A/B chips until the first tick, then Continue', async () => {
    const app = setup(MON);
    skipSetup(app);
    seedRoutine(app.db, { name: 'Evening A', days: [1, 3, 5] });
    const b = seedRoutine(app.db, { name: 'Evening B', days: [1, 2, 4] });
    await renderToday(app);

    expect(
      screen.getByText('Pick one for tonight; Jx Care remembers it for Mondays.'),
    ).toBeTruthy();
    const chipB = screen.getByRole('button', { name: 'Evening B' });
    await fireEvent.press(chipB);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Evening B' })).toBeSelected());

    // Start opens the player on the picked routine.
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(router.push).toHaveBeenCalledWith(`/player/${b}`);

    // A tick (here from the player) fixes the choice for the day.
    const due = getTodayRoutines(app.db, MON, 30)[0]!.routines.find((r) => r.id === b)!;
    tickSteps(app.db, b, [due.steps[0]!.id], MON, true, due.progress.dueStepIds);
    await act(async () => {
      await app.client.invalidateQueries({ queryKey: ['today'] });
    });

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(screen.queryByText('About A and B')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Evening A' })).toBeNull();
    expect(screen.getByText('Evening B · No reminder · 2 steps')).toBeTruthy();
  });

  it('All done ticks every due step, shows Evening done, and Undo unticks them', async () => {
    const app = setup(MON);
    skipSetup(app);
    const id = seedRoutine(app.db, { name: 'Evening', steps: [null, null, null] });
    await renderToday(app);

    await fireEvent.press(screen.getByRole('button', { name: 'All done' }));
    expect(uiStore.state.toasts.at(-1)?.message).toBe('Evening done');
    expect(
      await screen.findByRole('button', { name: 'Evening done. Opens the routine.' }),
    ).toBeTruthy();
    await waitFor(() => expect(getDayLog(app.db, id, MON)?.completedAt).not.toBeNull());
    expect(getDayLog(app.db, id, MON)!.doneStepIds).toHaveLength(3);
    // The streak chip appears once a routine exists and counts the finished day.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Skin streak: 1 day/ })).toBeTruthy(),
    );

    await act(async () => runToastAction(uiStore.state.toasts.at(-1)!.id));
    expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
    await waitFor(() => expect(getDayLog(app.db, id, MON)!.doneStepIds).toEqual([]));
    expect(getDayLog(app.db, id, MON)!.completedAt).toBeNull();
    // It never opens the Routine done screen.
    expect(router.push).not.toHaveBeenCalled();
  });

  it('names an expired product in red and moves Expiring soon under the routine cards', async () => {
    jest.spyOn(slots, 'useHairDueSlot').mockReturnValue(<Text>Wash: shampoo</Text>);
    const app = setup(MON);
    skipSetup(app);
    seedProduct(app.db, { name: 'Night cream', expiresAt: '2026-10-20' });
    seedRoutine(app.db, { name: 'Evening', steps: [null] });
    await renderToday(app);
    // Nothing expired: Expiring soon comes after Hair due.
    expect(sectionKeys()).toEqual(['routines', 'hair', 'expiring', 'checkIn']);

    const spf = seedProduct(app.db, { name: 'SPF 50 fluid', expiresAt: '2026-10-02' });
    seedRoutine(app.db, { name: 'Morning', timeOfDay: 'morning', steps: [spf, null] });
    await act(async () => {
      await app.client.invalidateQueries();
    });

    const morning = within(await screen.findByTestId('routine-card-morning'));
    expect(morning.getByText('SPF 50 fluid expired 2 Oct')).toBeTruthy();
    expect(sectionKeys()).toEqual(['routines', 'expiring', 'hair', 'checkIn']);
    // The expired row's badge carries the date, and its date line doesn't repeat it.
    expect(screen.getAllByText('Expired 2 Oct')).toHaveLength(1);

    // The done row keeps naming it.
    await fireEvent.press(morning.getByRole('button', { name: 'All done' }));
    const done = await screen.findByRole('button', {
      name: 'Morning done. Opens the routine. SPF 50 fluid expired 2 Oct',
    });
    expect(within(done).getByText('SPF 50 fluid expired 2 Oct')).toBeTruthy();

    // See all opens Products filtered to expired and expiring.
    await fireEvent.press(screen.getByRole('button', { name: 'See all expiring products' }));
    expect(productListStore.state.filters.statuses).toEqual(['expired', 'expiring']);
    expect(router.navigate).toHaveBeenCalledWith('/products');
  });

  it('opens the streak sheet and the A or B sheet, which close with Close or a drag', async () => {
    const app = setup(MON);
    skipSetup(app);
    seedRoutine(app.db, { name: 'Evening A' });
    seedRoutine(app.db, { name: 'Evening B' });
    await renderToday(app);
    expect(screen.queryByTestId('sheet')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /Skin streak: 0 days/ }));
    let sheet = within(screen.getByTestId('sheet'));
    expect(sheet.getByText('Skin streak')).toBeTruthy();
    expect(sheet.getByText('Your skin streak is 0 days. Your best is 0 days.')).toBeTruthy();
    expect(sheet.getByText('Days with nothing set are skipped.')).toBeTruthy();
    await fireEvent.press(sheet.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('sheet')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'About A and B' }));
    sheet = within(screen.getByTestId('sheet'));
    expect(sheet.getByText('Evening A or B')).toBeTruthy();
    expect(
      sheet.getByText(
        'Evening A and Evening B are both set for today. They are options: you do one of them.',
      ),
    ).toBeTruthy();
    expect(
      sheet.getByText(
        'Your pick is remembered for Mondays. You can change it until the first tick.',
      ),
    ).toBeTruthy();
    await fireEvent.press(sheet.getByTestId('sheet-drag'));
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('reads in Lithuanian', async () => {
    const app = setup(MON);
    skipSetup(app);
    seedRoutine(app.db, { name: 'Vakaras A' });
    seedRoutine(app.db, { name: 'Vakaras B' });
    await setI18nLanguage('lt');
    await prefetchToday(app.client, MON);
    await app.render(<TodayScreen />);
    expect(screen.getByText('Pirmadienis, 2026-10-05')).toBeTruthy();
    expect(
      screen.getByText('Pasirinkite vieną šiam vakarui; Jx Care tai įsimins pirmadieniais.'),
    ).toBeTruthy();
    expect(screen.getByText('Be priminimo · 2 žingsniai')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Viskas atlikta' })).toBeTruthy();
  });
});

describe('TodayScreen first run', () => {
  it('ticks the setup rows from data and opens the next step with the filled button', async () => {
    const app = setup(MON);
    await renderToday(app);

    expect(screen.getByText('Set up Jx Care')).toBeTruthy();
    expect(screen.getByText('0 of 3')).toBeTruthy();
    // No streak chips or routine cards until a routine exists.
    expect(screen.queryByRole('button', { name: /Skin streak/ })).toBeNull();
    expect(sectionKeys()).toEqual(['setup', 'checkIn']);
    expect(screen.getByText('Optional')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add a product' }));
    expect(router.push).toHaveBeenCalledWith('/product-form');
    // The other steps are fixed-height rows.
    for (const step of ['routine', 'hair']) {
      expect(screen.getByTestId(`setup-step-${step}`).props.className).toContain('h-[72px]');
    }

    seedProduct(app.db, { name: 'Vitamin C serum' });
    await act(async () => {
      await app.client.invalidateQueries({ queryKey: ['today'] });
    });
    expect(await screen.findByText('1 of 3')).toBeTruthy();
    expect(screen.getByText('Vitamin C serum added')).toBeTruthy();
    expect(screen.getByTestId('setup-step-product').props.className).toContain('h-[72px]');
    await fireEvent.press(screen.getByRole('button', { name: 'Build a routine' }));
    expect(router.push).toHaveBeenLastCalledWith('/routines?starter=1');

    seedRoutine(app.db, { name: 'Evening basics' });
    await act(async () => {
      await app.client.invalidateQueries({ queryKey: ['today'] });
    });
    expect(await screen.findByText('2 of 3')).toBeTruthy();
    // The routine now shows with its streak chip, and the setup card keeps the filled button.
    expect(screen.getByRole('button', { name: /Skin streak/ })).toBeTruthy();
    expect(sectionKeys()).toEqual(['setup', 'routines', 'checkIn']);
    await fireEvent.press(screen.getByRole('button', { name: 'Set up hair care' }));
    expect(router.push).toHaveBeenLastCalledWith('/routines?segment=hair&setup=1');
  });

  it("becomes You're set, is gone the next app day, and See today removes it at once", async () => {
    const app = setup(MON);
    seedProduct(app.db, { name: 'Vitamin C serum' });
    seedRoutine(app.db, { name: 'Evening basics' });
    quickSetup(app.db, { frequency: 'every_3_days', lastWash: MON, trim: false }, MON);
    await renderToday(app);

    expect(screen.getByText("You're set")).toBeTruthy();
    await waitFor(() => expect(getSettings(app.db).setupDoneAt).toBe(MON));

    await act(async () => appStore.setState((s) => ({ ...s, activeDay: TUE })));
    await waitFor(() => expect(screen.queryByText("You're set")).toBeNull());
    // The new day's queries load first (Expiring soon holds its place until they do).
    await waitFor(() => expect(sectionKeys()).toEqual(['routines', 'checkIn']));

    // A fresh start on the same day: See today hides it at once.
    saveSettings(app.db, { setupDoneAt: null });
    await act(async () => appStore.setState((s) => ({ ...s, activeDay: WED })));
    await act(async () => {
      await app.client.invalidateQueries();
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'See today' }));
    await waitFor(() => expect(screen.queryByText("You're set")).toBeNull());
    expect(getSettings(app.db).setupHiddenAt).toBe(WED);
  });

  it('hides the setup card from its long-press menu', async () => {
    const app = setup(MON);
    await renderToday(app);
    await fireEvent(screen.getByTestId('setup-card'), 'longPress');
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Hide' }));
    await waitFor(() => expect(screen.queryByText('Set up Jx Care')).toBeNull());
    expect(getSettings(app.db).setupHiddenAt).toBe(MON);
  });
});

describe('CheckInCard', () => {
  it('holds the photo row above the skin chips', async () => {
    const app = setupTestApp();
    await app.render(<CheckInCard photo={<Text>This week's skin photo</Text>} />);
    expect(screen.getByText('Check-in')).toBeTruthy();
    expect(screen.getByText("This week's skin photo")).toBeTruthy();
    expect(screen.getByText("How's your skin today?")).toBeTruthy();
  });
});
