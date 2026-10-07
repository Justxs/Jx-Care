import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { avoidItem } from '@/db/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, runToastAction, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import {
  addUsedInSource,
  countArchived,
  createProduct,
  getProduct,
  markFinished,
} from '../../repo';
import type { ProductInput } from '../../schema';
import { ArchiveScreen } from '../ArchiveScreen';
import { ProductDetailScreen } from '../ProductDetailScreen';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (effect: () => undefined | (() => void)) => useEffect(effect, [effect]),
  };
});
// The menu's portal waits for the trigger to be measured, which never happens in Jest: draw the
// open menu in place instead.
jest.mock('@rn-primitives/dropdown-menu', () => ({
  ...jest.requireActual<object>('@rn-primitives/dropdown-menu'),
  Portal: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{
  router: { push: jest.Mock; back: jest.Mock };
}>('expo-router');

const TODAY = '2026-10-07';

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
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
  return {
    ...app,
    render: (ui: ReactElement) =>
      app.render(
        <>
          {ui}
          <PortalHost />
        </>,
      ),
  };
}

const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

const openMenu = () => fireEvent.press(screen.getByRole('button', { name: 'More actions' }));

const fullProduct = input({
  name: 'Vitamin C serum',
  brand: 'Glow Lab',
  category: 'serum',
  size: 30,
  unit: 'ml',
  price: 2490,
  purchasedAt: '2026-08-01',
  openedAt: '2026-09-01',
  paoMonths: 6,
  expiresAt: '2027-06-01',
  notes: 'Keep in the fridge.',
  photoUri: 'file:///photos/serum.jpg',
  ingredients: ['Ascorbic acid', 'Parfum'],
});

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  uiStore.setState((s) => ({ ...s, toasts: [], toastInset: 0 }));
  router.push.mockClear();
  router.back.mockClear();
  mockParams = {};
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('ProductDetailScreen', () => {
  it('shows every block for a product with all fields', async () => {
    const app = setup();
    const id = createProduct(app.db, fullProduct);
    const parfum = getProduct(app.db, id, TODAY, 30)!.ingredients[1]!;
    app.db.insert(avoidItem).values({ kind: 'ingredient', refId: parfum.id }).run();
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);

    expect(await screen.findByRole('header', { name: 'Vitamin C serum' })).toBeTruthy();
    expect(screen.getByText('Glow Lab')).toBeTruthy();
    expect(screen.getByText('Serum')).toBeTruthy();
    expect(screen.getByText('Skin')).toBeTruthy();
    expect(screen.getAllByText('Avoid').length).toBeGreaterThan(0);
    expect(screen.getByRole('imagebutton', { name: 'Show photo full screen' })).toBeTruthy();

    // Expiry: opened 1 Sep + 6M = 1 Mar 2027, earlier than the printed date.
    expect(screen.getByText('OK')).toBeTruthy();
    expect(screen.getByText('Expires in 145 days · 1 Mar 2027')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByLabelText('Purchased, 1 Aug')).toBeTruthy();
    expect(screen.getByLabelText('Opened, 1 Sep')).toBeTruthy();
    expect(screen.getByLabelText('Printed expiry, 1 Jun 2027')).toBeTruthy();
    expect(screen.getByLabelText('Period after opening, 6M')).toBeTruthy();

    // Details.
    expect(screen.getByLabelText('Size, 30 ml')).toBeTruthy();
    expect(screen.getByLabelText(/^Price, .*24.90/)).toBeTruthy();
    expect(screen.getByLabelText('Ascorbic acid')).toBeTruthy();
    expect(await screen.findByLabelText('Parfum, Avoid')).toBeTruthy();
    expect(screen.getByText('Keep in the fridge.')).toBeTruthy();

    // Not finished: no cost per day, and the bar has Edit and Mark finished (Buy again: 034).
    expect(screen.queryByText('Cost per day')).toBeNull();
    const bar = within(screen.getByTestId('detail-actions'));
    expect(bar.getAllByRole('button').map((b) => b.props.accessibilityLabel ?? '')).toHaveLength(2);
    expect(bar.getByText('Edit')).toBeTruthy();
    expect(bar.getByText('Mark finished')).toBeTruthy();

    await fireEvent.press(bar.getByText('Edit'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/product-form',
      params: { id: String(id) },
    });

    // The photo opens full screen and closes again.
    await fireEvent.press(screen.getByRole('imagebutton', { name: 'Show photo full screen' }));
    expect(screen.getByLabelText('Product photo')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByLabelText('Product photo')).toBeNull();
  });

  it('edits the ingredient list in place with Edit list', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Toner', ingredients: ['Aqua'] }));
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Edit list' }));
    await fireEvent.changeText(
      screen.getByLabelText('One ingredient per line'),
      'Aqua\nNiacinamide\nGlycerin',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save 3 ingredients' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)?.ingredients.map((i) => i.name)).toEqual([
      'Aqua',
      'Niacinamide',
      'Glycerin',
    ]);
    expect(getProduct(app.db, id, TODAY, 30)?.name).toBe('Toner');
    expect(screen.getAllByLabelText('Glycerin').length).toBeGreaterThan(0);
  });

  it('degrades cleanly for a product with only a name and area', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Hair oil', area: 'hair' }));
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);

    expect(await screen.findByRole('header', { name: 'Hair oil' })).toBeTruthy();
    expect(screen.getByText('Hair')).toBeTruthy();
    expect(screen.getByText('No date')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('imagebutton')).toBeNull();
    expect(screen.getAllByText('Not set')).toHaveLength(6);
    expect(screen.getByText('No ingredients yet')).toBeTruthy();
    expect(screen.queryByText('Notes')).toBeNull();
    expect(screen.queryByText('Used in')).toBeNull();
  });

  it('shows the routines that use it', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Toner' }));
    addUsedInSource((db, productId) =>
      db === app.db && productId === id ? [{ kind: 'routine', id: 4, name: 'Evening' }] : [],
    );
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Evening' }));
    expect(router.push).toHaveBeenCalledWith('/routines/4');
  });

  it('says a deleted product was deleted, with Back', async () => {
    const app = setup();
    mockParams = { id: '99' };
    await app.render(<ProductDetailScreen />);
    expect(await screen.findByText('This product was deleted')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Back' }).at(-1)!);
    expect(router.back).toHaveBeenCalled();
  });

  it('marks finished with a toast and Undo, then goes back', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Vitamin C serum' }));
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Mark finished' }));
    await wait(0);
    expect(countArchived(app.db)).toBe(1);
    expect(router.back).toHaveBeenCalled();
    expect(uiStore.state.toasts[0]).toMatchObject({
      message: 'Vitamin C serum moved to Archive',
      actionLabel: 'Undo',
    });
    await act(async () => runToastAction(uiStore.state.toasts[0]!.id));
    await wait(0);
    expect(countArchived(app.db)).toBe(0);
  });

  it('marks as opened and duplicates from the More menu; Delete is not offered', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Clay pack' }));
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);
    await screen.findByRole('header', { name: 'Clay pack' });

    await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).toBeNull();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Mark as opened' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)?.openedAt).toBe(TODAY);
    expect(screen.getByLabelText(`Opened, 7 Oct`)).toBeTruthy();

    await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Mark as opened' })).toBeNull();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Duplicate' }));
    await wait(0);
    expect(uiStore.state.toasts[0]?.message).toBe('Copy of Clay pack added');
    expect(router.push).toHaveBeenCalledWith(`/products/${id + 1}`);
    expect(getProduct(app.db, id + 1, TODAY, 30)?.name).toBe('Clay pack');
  });

  it('shows a finished product with its cost, Restore with Undo, and Delete with a dialog', async () => {
    const app = setup();
    const id = createProduct(
      app.db,
      input({ name: 'Clay mask', price: 2100, openedAt: '2026-05-08' }),
    );
    markFinished(app.db, id, '2026-09-27');
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);

    expect(await screen.findByLabelText('Finished, 27 Sep')).toBeTruthy();
    expect(screen.getAllByText('Finished')).toHaveLength(2);
    expect(screen.getByLabelText('Finished, 27 Sep')).toBeTruthy();
    expect(screen.getByText('€0.15 a day over 142 days')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();

    // Restore, then Undo puts it back in the archive.
    await fireEvent.press(screen.getByRole('button', { name: 'Restore' }));
    await wait(0);
    expect(countArchived(app.db)).toBe(0);
    expect(uiStore.state.toasts[0]?.message).toBe('Clay mask restored to Products');
    expect(await screen.findByRole('button', { name: 'Mark finished' })).toBeTruthy();
    await act(async () => runToastAction(uiStore.state.toasts[0]!.id));
    await wait(0);
    expect(countArchived(app.db)).toBe(1);

    await openMenu();
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(
      screen.getByText("Its notes and dates are deleted for good. This can't be undone."),
    ).toBeTruthy();
    expect(screen.getByText('Delete Clay mask?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)).toBeNull();
    expect(router.back).toHaveBeenCalled();
  });

  it('reads in Lithuanian', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Serumas', expiresAt: '2026-10-02' }));
    mockParams = { id: String(id) };
    await setI18nLanguage('lt');
    await app.render(<ProductDetailScreen />);
    expect(await screen.findByText('Nebegalioja')).toBeTruthy();
    expect(screen.getByText('Nebegalioja 5 dienas · 2026-10-02')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pažymėti baigtu' })).toBeTruthy();
    expect(screen.getAllByText('Nenurodyta').length).toBeGreaterThan(0);
  });

  it('lifts toasts above the action bar while it is shown', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    mockParams = { id: String(id) };
    uiStore.setState((s) => ({ ...s, toastInset: 64 }));
    const view = await app.render(<ProductDetailScreen />);
    await fireEvent(await screen.findByTestId('detail-actions'), 'layout', {
      nativeEvent: { layout: { height: 77 } },
    });
    expect(uiStore.state.toastInset).toBe(141);
    await view.unmount();
    expect(uiStore.state.toastInset).toBe(64);
  });
});

function seed(app: ReturnType<typeof setup>) {
  // Cheap per day, finished last.
  const a = createProduct(
    app.db,
    input({ name: 'Clay mask', price: 2100, openedAt: '2026-05-08' }),
  );
  // No price: no cost per day.
  const b = createProduct(app.db, input({ name: 'Toner' }));
  // Dear per day, finished first.
  const c = createProduct(app.db, input({ name: 'Serum', price: 3000, openedAt: '2026-09-01' }));
  markFinished(app.db, c, '2026-09-11');
  markFinished(app.db, b, '2026-09-20');
  markFinished(app.db, a, '2026-09-27');
  return { a, b, c };
}

const archiveRowNames = () =>
  screen
    .queryAllByTestId(/^archive-row-/)
    .map((row) => within(row).getAllByRole('button')[0]!.props.accessibilityLabel.split(',')[0]);

describe('ArchiveScreen', () => {
  const rowNames = archiveRowNames;

  it('lists finished products newest first, and sorts by cost per day with no cost last', async () => {
    const app = setup();
    const { a } = seed(app);
    await app.render(<ArchiveScreen />);
    expect(await screen.findByText('Clay mask')).toBeTruthy();
    expect(rowNames()).toEqual(['Clay mask', 'Toner', 'Serum']);

    const row = within(screen.getByTestId(`archive-row-${a}`));
    expect(row.getByText('Finished 27 Sep')).toBeTruthy();
    expect(row.getByText('€0.15 a day')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Cost per day'));
    await wait(0);
    expect(rowNames()).toEqual(['Serum', 'Clay mask', 'Toner']);

    await fireEvent.press(screen.getAllByRole('button', { name: /^Serum/ })[0]!);
    expect(router.push).toHaveBeenCalledWith('/products/3');
  });

  it('shows the empty state', async () => {
    const app = setup();
    await app.render(<ArchiveScreen />);
    expect(await screen.findByText('Nothing finished yet')).toBeTruthy();
    expect(
      screen.getByText('Products you mark finished move here with their cost per day.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Cost per day')).toBeNull();
  });

  it('restores from the row sheet with Undo', async () => {
    const app = setup();
    const { a } = seed(app);
    await app.render(<ArchiveScreen />);
    await screen.findByText('Clay mask');
    await fireEvent.press(
      within(screen.getByTestId(`archive-row-${a}`)).getByRole('button', { name: 'More actions' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Restore to Products' }));
    await wait(0);
    expect(rowNames()).toEqual(['Toner', 'Serum']);
    expect(uiStore.state.toasts[0]).toMatchObject({
      message: 'Clay mask restored to Products',
      actionLabel: 'Undo',
    });
    await act(async () => runToastAction(uiStore.state.toasts[0]!.id));
    await wait(0);
    expect(rowNames()).toEqual(['Clay mask', 'Toner', 'Serum']);
  });

  it('deletes for good after the dialog', async () => {
    const app = setup();
    const { b } = seed(app);
    await app.render(<ArchiveScreen />);
    await screen.findByText('Toner');
    await fireEvent.press(
      within(screen.getByTestId(`archive-row-${b}`)).getByRole('button', { name: 'More actions' }),
    );
    expect(screen.queryByRole('button', { name: 'Buy again' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete Toner?')).toBeTruthy();
    const deletes = screen.getAllByRole('button', { name: 'Delete' });
    await fireEvent.press(deletes.at(-1)!);
    await wait(0);
    expect(rowNames()).toEqual(['Clay mask', 'Serum']);
    expect(getProduct(app.db, b, TODAY, 30)).toBeNull();
  });

  it('reads in Lithuanian', async () => {
    const app = setup();
    seed(app);
    await setI18nLanguage('lt');
    await app.render(<ArchiveScreen />);
    expect(await screen.findByText('Baigta 2026-09-27')).toBeTruthy();
    expect(screen.getByLabelText('Kaina per dieną')).toBeTruthy();
  });
});
