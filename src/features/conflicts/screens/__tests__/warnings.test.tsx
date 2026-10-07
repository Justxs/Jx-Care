import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import type { ReactNode } from 'react';

import type { Db } from '@/db';
import { routineStep } from '@/db/schema';
import { getProduct } from '@/features/products/repo';
import { ProductDetailScreen } from '@/features/products/screens/ProductDetailScreen';
import { RoutineEditorScreen } from '@/features/routines/screens/RoutineEditorScreen';
import { RoutinePlayerScreen } from '@/features/routines/screens/RoutinePlayerScreen';
import { RoutinesScreen } from '@/features/routines/screens/RoutinesScreen';
import { saveSettings } from '@/features/settings/repo';
import { prefetchToday } from '@/features/today/prefetch';
import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { MON, seedProduct, seedRoutine } from '@/features/today/testUtils';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, runToastAction, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { addAvoidItem, listAvoidItems } from '../../avoidRepo';
import { listIngredients, saveGroup, saveRule } from '../../repo';
import { AvoidListScreen } from '../AvoidListScreen';

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      setParams: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: jest.fn(() => true),
    },
    useLocalSearchParams: () => mockParams.current,
    useNavigation: () => ({ addListener: () => () => {} }),
    useFocusEffect: (effect: () => undefined | (() => void)) => useEffect(effect, [effect]),
  };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
// The menu's portal waits for a measurement that never comes in Jest: draw it in place.
jest.mock('@rn-primitives/dropdown-menu', () => ({
  ...jest.requireActual<object>('@rn-primitives/dropdown-menu'),
  Portal: ({ children }: { children: ReactNode }) => children,
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

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const CONFLICT = 'Conflict. Tap for details.';
const MILD = 'Mild conflict. Tap for details.';
const PAIR = 'Retinol serum in Evening A and AHA toner in Morning are a conflict pair.';

const idOf = (db: Db, name: string) => listIngredients(db).find((i) => i.name === name)!.id;

/**
 * Retinol serum in Evening A (Mon) and the AHA toner in Morning (Mon), with a rule between their
 * ingredients. Evening B (Mon) is Evening A's alternate and holds the AHA toner too.
 */
function setup() {
  const app = setupTestApp();
  const db = app.db;
  saveSettings(db, { language: 'en', setupHiddenAt: '2026-01-01' });
  appStore.setState((s) => ({ ...s, activeDay: MON }));
  const retinol = seedProduct(db, { name: 'Retinol serum', ingredients: ['Retinol', 'Water'] });
  const aha = seedProduct(db, { name: 'AHA toner', ingredients: ['Glycolic acid'] });
  saveRule(db, {
    leftKind: 'ingredient',
    leftId: idOf(db, 'Retinol'),
    rightKind: 'ingredient',
    rightId: idOf(db, 'Glycolic acid'),
    note: 'Can cause flushing',
  });
  const morning = seedRoutine(db, {
    name: 'Morning',
    timeOfDay: 'morning',
    days: [1],
    steps: [aha],
  });
  const eveA = seedRoutine(db, { name: 'Evening A', days: [1], steps: [retinol] });
  const eveB = seedRoutine(db, { name: 'Evening B', days: [1], steps: [aha] });
  return { ...app, retinol, aha, morning, eveA, eveB };
}

type App = ReturnType<typeof setup>;

/** Evening A's retinol step runs every 3 days from Monday. */
function makeMild(app: App) {
  app.db
    .update(routineStep)
    .set({ scheduleKind: 'interval', everyNDays: 3, startDate: MON })
    .where(eq(routineStep.routineId, app.eveA))
    .run();
}

const show = (app: App, ui: React.ReactElement) =>
  app.render(
    <>
      {ui}
      <PortalHost />
    </>,
  );

const sheet = () => within(screen.getByTestId('sheet'));

beforeEach(async () => {
  await setI18nLanguage('en');
  uiStore.setState((s) => ({ ...s, toasts: [], toastInset: 0 }));
  router.push.mockClear();
  mockParams.current = {};
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('conflict warnings end to end', () => {
  it('tags both R1 cards, never the A/B alternate, and the tag opens the conflict sheet', async () => {
    const app = setup();
    await show(app, <RoutinesScreen />);
    const morning = within(await screen.findByTestId(`routine-card-${app.morning}`));
    expect(await morning.findByRole('button', { name: CONFLICT })).toBeTruthy();
    const eveA = within(screen.getByTestId(`routine-card-${app.eveA}`));
    expect(eveA.getByRole('button', { name: CONFLICT })).toBeTruthy();
    // Evening A and Evening B are alternates: never compared.
    const eveB = within(screen.getByTestId(`routine-card-${app.eveB}`));
    expect(eveB.queryByRole('button', { name: /Conflict/ })).toBeNull();

    await fireEvent.press(eveA.getByRole('button', { name: CONFLICT }));
    expect(sheet().getByText('Why this warning')).toBeTruthy();
    expect(sheet().getByText(PAIR)).toBeTruthy();
    expect(sheet().getByText('They meet on Mon.')).toBeTruthy();
    expect(sheet().getByText('Can cause flushing.')).toBeTruthy();
    expect(
      sheet().getByText('A and B routines at one time of day are never compared with each other.'),
    ).toBeTruthy();
    // Edit the routine: the sheet closes, then the editor opens.
    await fireEvent.press(sheet().getByRole('button', { name: 'Edit the routine' }));
    expect(screen.queryByTestId('sheet')).toBeNull();
    expect(router.push).toHaveBeenCalledWith(`/routines/${app.eveA}`);

    await fireEvent.press(morning.getByRole('button', { name: CONFLICT }));
    await fireEvent.press(sheet().getByRole('button', { name: 'See the rule' }));
    expect(router.push).toHaveBeenLastCalledWith('/settings/conflicts');
  });

  it('shows "Mild conflict" for an every-3-days step, which opens the Mild conflict sheet', async () => {
    const app = setup();
    makeMild(app);
    await show(app, <RoutinesScreen />);
    const eveA = within(await screen.findByTestId(`routine-card-${app.eveA}`));
    expect(await eveA.findByRole('button', { name: MILD })).toBeTruthy();
    const morning = within(screen.getByTestId(`routine-card-${app.morning}`));
    expect(morning.getByRole('button', { name: MILD })).toBeTruthy();

    await fireEvent.press(eveA.getByRole('button', { name: MILD }));
    expect(sheet().getByText('Mild conflict')).toBeTruthy();
    expect(
      sheet().getByText('Retinol serum runs every 3 days, so the pair only meets on some days.'),
    ).toBeTruthy();
    expect(sheet().getByText('On those days the tag is a normal Conflict.')).toBeTruthy();
  });

  it('tags the step in the editor and lists it in the panel, saving still allowed', async () => {
    const app = setup();
    mockParams.current = { id: String(app.eveA) };
    await show(app, <RoutineEditorScreen />);
    const line = 'Retinol (step 1) × Glycolic acid in Morning, Mon';
    expect(await screen.findByText(line)).toBeTruthy();
    const panel = within(screen.getByTestId('conflict-panel'));
    expect(panel.getByText('1 conflict this week')).toBeTruthy();
    expect(
      panel.getByText('Evening B is the other evening choice, so it is not compared.'),
    ).toBeTruthy();
    expect(panel.getByText('You can still save.')).toBeTruthy();
    expect(screen.getByTestId('step-row-0').props.accessibilityLabel).toMatch(/Conflict/);

    // The step's tag opens the conflict sheet, without "Edit the routine" (already here).
    await fireEvent.press(screen.getByRole('button', { name: CONFLICT }));
    expect(sheet().getByText(PAIR)).toBeTruthy();
    expect(sheet().queryByRole('button', { name: 'Edit the routine' })).toBeNull();
    await fireEvent.press(sheet().getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('sheet')).toBeNull();

    await fireEvent.press(panel.getByRole('button', { name: 'What does mild mean?' }));
    expect(sheet().getByText('Mild conflict')).toBeTruthy();
    await fireEvent.press(sheet().getByRole('button', { name: 'Close' }));

    // Removing the step (not saved yet) clears the panel.
    await fireEvent(screen.getByTestId('step-row-0'), 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });
    await waitFor(() => expect(screen.queryByText(line)).toBeNull());
    expect(screen.getByRole('button', { name: 'Save routine' })).toBeEnabled();
  });

  it('updates the panel for unsaved changes: Evening B moved to Morning meets Evening A', async () => {
    const app = setup();
    mockParams.current = { id: String(app.eveB) };
    await show(app, <RoutineEditorScreen />);
    await screen.findByDisplayValue('Evening B');
    expect(screen.queryByText(/conflict this week/)).toBeNull();

    await fireEvent.press(screen.getByText('Morning'));
    expect(
      await screen.findByText('Glycolic acid (step 1) × Retinol in Evening A, Mon'),
    ).toBeTruthy();
    expect(
      screen.getByText('Morning is the other morning choice, so it is not compared.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: CONFLICT })).toBeTruthy();
  });

  it("tags Monday's Today cards and follows the A/B choice", async () => {
    const app = setup();
    await prefetchToday(app.client, MON);
    await show(app, <TodayScreen />);
    const evening = within(await screen.findByTestId('routine-card-evening'));
    const morning = within(screen.getByTestId('routine-card-morning'));
    expect(morning.getByRole('button', { name: CONFLICT })).toBeTruthy();
    expect(evening.getByRole('button', { name: CONFLICT })).toBeTruthy();

    await fireEvent.press(evening.getByRole('button', { name: CONFLICT }));
    expect(sheet().getByText(PAIR)).toBeTruthy();
    await fireEvent.press(sheet().getByRole('button', { name: 'Close' }));

    // Evening B holds the same AHA toner as Morning: no conflict when it is the pick.
    await fireEvent.press(evening.getByText('Evening B'));
    await waitFor(() => expect(evening.queryByRole('button', { name: CONFLICT })).toBeNull());
  });

  it("tags the player's step and explains it in the amber line", async () => {
    const app = setup();
    mockParams.current = { routineId: String(app.eveA) };
    await show(app, <RoutinePlayerScreen />);
    expect(await screen.findByRole('button', { name: CONFLICT })).toBeTruthy();
    expect(
      screen.getByText('Retinol serum conflicts with AHA toner in Morning. Can cause flushing.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Why this warning' }));
    expect(sheet().getByText(PAIR)).toBeTruthy();
  });

  it('shows a normal Conflict on the day an every-few-days step is due', async () => {
    const app = setup();
    makeMild(app);
    mockParams.current = { routineId: String(app.eveA) };
    await show(app, <RoutinePlayerScreen />);
    expect(await screen.findByRole('button', { name: CONFLICT })).toBeTruthy();
  });

  it('marks chips in a rule with a link and avoided ones red on P2', async () => {
    const app = setup();
    mockParams.current = { id: String(app.retinol) };
    await show(app, <ProductDetailScreen />);
    expect(await screen.findByLabelText('Retinol, Conflict')).toBeTruthy();
    expect(screen.getByLabelText('Water')).toBeTruthy();
  });

  it('marks every product with a member of an avoided group (P2 badge, red chip)', async () => {
    const app = setup();
    const acids = saveGroup(app.db, { name: 'Acids', memberIds: [idOf(app.db, 'Glycolic acid')] });
    addAvoidItem(app.db, { kind: 'group', refId: acids });
    expect(getProduct(app.db, app.aha, MON, 30)!.avoid).toBe(true);
    mockParams.current = { id: String(app.aha) };
    await show(app, <ProductDetailScreen />);
    expect(await screen.findByLabelText('Glycolic acid, Avoid, Conflict')).toBeTruthy();
    expect(screen.getAllByText('Avoid').length).toBeGreaterThan(0);
  });
});

describe('AvoidListScreen', () => {
  it('starts empty with the add action', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    await show(app as App, <AvoidListScreen />);
    expect(await screen.findByText('Nothing to avoid yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Add ingredients that irritate you. Products that contain them get a red Avoid badge.',
      ),
    ).toBeTruthy();
    // The empty state carries the action; the Fab waits for the first row.
    expect(screen.getAllByRole('button', { name: 'Add ingredient' })).toHaveLength(1);

    await act(() => setI18nLanguage('lt'));
    expect(await screen.findByText('Kol kas nieko nevengiate')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pridėti ingredientą' })).toBeTruthy();
  });

  it('adds a group and a new ingredient, then lists the products that contain them', async () => {
    const app = setup();
    saveGroup(app.db, { name: 'Acids', memberIds: [idOf(app.db, 'Glycolic acid')] });
    await show(app, <AvoidListScreen />);
    await screen.findByText('Nothing to avoid yet');
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    await fireEvent.changeText(
      sheet().getByPlaceholderText('Search or type a new ingredient'),
      'aci',
    );
    await fireEvent.press(sheet().getByRole('button', { name: /^Acids group/ }));
    await fireEvent.changeText(sheet().getByLabelText('Note'), 'allergic');
    await fireEvent.press(sheet().getByRole('button', { name: 'Add to list' }));
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());

    expect(await screen.findByLabelText('Acids group, allergic, In 1 product')).toBeTruthy();
    expect(await screen.findByText('Products that contain these')).toBeTruthy();
    expect(screen.getByText('AHA toner')).toBeTruthy();
    expect(getProduct(app.db, app.aha, MON, 30)!.avoid).toBe(true);

    // A typed name that is no ingredient yet joins the list.
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    await fireEvent.changeText(
      sheet().getByPlaceholderText('Search or type a new ingredient'),
      'Linalool',
    );
    await fireEvent.press(
      sheet().getByRole('button', { name: 'Add “Linalool” as a new ingredient' }),
    );
    await fireEvent.press(sheet().getByRole('button', { name: 'Add to list' }));
    expect(await screen.findByLabelText('Linalool, In no products')).toBeTruthy();
    expect(listIngredients(app.db).some((i) => i.name === 'Linalool')).toBe(true);
  });

  it('removes a row with "Parfum removed" and Undo puts it back in the same place', async () => {
    const app = setup();
    const parfum = seedProduct(app.db, { name: 'Body lotion', ingredients: ['Parfum'] });
    addAvoidItem(app.db, { kind: 'ingredient', refId: idOf(app.db, 'Water') });
    addAvoidItem(app.db, { kind: 'ingredient', refId: idOf(app.db, 'Parfum'), note: 'itchy' });
    addAvoidItem(app.db, { kind: 'ingredient', refId: idOf(app.db, 'Retinol') });
    await show(app, <AvoidListScreen />);
    expect(await screen.findByLabelText('Parfum, itchy, In 1 product')).toBeTruthy();
    expect(screen.getByText('Body lotion')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove Parfum' }));
    await waitFor(() => expect(screen.queryByLabelText(/^Parfum/)).toBeNull());
    expect(uiStore.state.toasts.at(-1)?.message).toBe('Parfum removed');
    expect(getProduct(app.db, parfum, MON, 30)!.avoid).toBe(false);
    await waitFor(() => expect(screen.queryByText('Body lotion')).toBeNull());

    await act(async () => runToastAction(uiStore.state.toasts.at(-1)!.id));
    expect(await screen.findByLabelText('Parfum, itchy, In 1 product')).toBeTruthy();
    expect(listAvoidItems(app.db).map((i) => i.name)).toEqual(['Water', 'Parfum', 'Retinol']);
    const rows = screen.getAllByTestId(/^avoid-row-/).map((r) => r.props.testID);
    expect(rows).toEqual(listAvoidItems(app.db).map((i) => `avoid-row-${i.id}`));
  });
});
