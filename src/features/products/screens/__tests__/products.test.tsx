import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { avoidItem } from '@/db/schema';
import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, runToastAction, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { productListStore } from '../../listState';
import { countArchived, createProduct, markFinished } from '../../repo';
import type { ProductInput } from '../../schema';
import { defaultProductFilters } from '../../types';
import { ProductsScreen } from '../ProductsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

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
  return app;
}

const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

const rowNames = () =>
  screen.queryAllByTestId(/^product-row-/).map((row) => row.props.accessibilityLabel.split(',')[0]);

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  productListStore.setState(() => ({ filters: defaultProductFilters }));
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  router.push.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('ProductsScreen', () => {
  it('shows the first-run empty state in EN and LT', async () => {
    const app = setup();
    await app.render(<ProductsScreen />);
    expect(await screen.findByText('No products yet')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add product' })[0]!);
    expect(router.push).toHaveBeenCalledWith('/product-form');

    await setI18nLanguage('lt');
    expect(await screen.findByText('Produktų dar nėra')).toBeTruthy();
  });

  it('shows the date line, and a badge only when the status needs attention', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Fine', openedAt: '2026-09-01', paoMonths: 12 }));
    createProduct(app.db, input({ name: 'Gone', brand: 'Brand', expiresAt: '2026-10-02' }));
    createProduct(app.db, input({ name: 'Sealed', expiresAt: '2027-03-01', category: 'serum' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Fine');

    const fine = within(screen.getByTestId('product-row-1'));
    expect(fine.getByText('Expires 1 Sep 2027')).toBeTruthy();
    expect(fine.queryByText('OK')).toBeNull();

    const gone = within(screen.getByTestId('product-row-2'));
    expect(gone.getByText('Expired 2 Oct')).toBeTruthy();
    expect(gone.getByText('Brand · Other')).toBeTruthy();
    expect(gone.queryByText(/Expires/)).toBeNull();

    const sealed = within(screen.getByTestId('product-row-3'));
    expect(sealed.getByText('Not opened')).toBeTruthy();
    expect(sealed.getByText('Expires 1 Mar 2027')).toBeTruthy();
    expect(sealed.getByText('Serum')).toBeTruthy();

    // Soonest expiry first.
    expect(rowNames()).toEqual(['Gone', 'Sealed', 'Fine']);
    await fireEvent.press(screen.getByTestId('product-row-3'));
    expect(router.push).toHaveBeenCalledWith('/products/3');
  });

  it('searches as you type, ignoring accents', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Ąžuolo kremas' }));
    createProduct(app.db, input({ name: 'Face mist' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Face mist');
    await fireEvent.changeText(screen.getByLabelText('Search products'), 'azuol');
    await waitFor(() => expect(rowNames()).toEqual(['Ąžuolo kremas']));

    await fireEvent.changeText(screen.getByLabelText('Search products'), 'nothing');
    expect(await screen.findByText('No products match')).toBeTruthy();
    // The empty state's button (the filters sheet's footer has one too).
    await fireEvent.press(screen.getAllByRole('button', { name: 'Reset filters' })[0]!);
    await waitFor(() => expect(rowNames()).toHaveLength(2));
  });

  it('filters by area and sorts by name from the filters sheet', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Hair wash', area: 'hair', expiresAt: '2026-11-01' }));
    createProduct(app.db, input({ name: 'Oil', area: 'both', expiresAt: '2026-10-20' }));
    createProduct(app.db, input({ name: 'Face', area: 'skin' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Face');

    await fireEvent.press(screen.getByRole('button', { name: 'Filters' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Name' }));
    await fireEvent.press(screen.getByLabelText('Hair'));
    expect(await screen.findByRole('button', { name: 'Show 2 products' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Show 2 products' }));
    await wait(0);
    expect(rowNames()).toEqual(['Hair wash', 'Oil']);
    expect(screen.getByRole('button', { name: 'Filters, 1 on' })).toBeTruthy();
    expect(productListStore.state.filters).toMatchObject({ area: 'hair', sort: 'name' });
  });

  it('filters by status and category', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Gone', expiresAt: '2026-10-01', category: 'serum' }));
    createProduct(app.db, input({ name: 'Soon', expiresAt: '2026-10-20' }));
    createProduct(app.db, input({ name: 'Nodate', category: 'serum' }));
    productListStore.setState(() => ({
      filters: { ...defaultProductFilters, statuses: ['expired', 'nodate'] },
    }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Gone');
    expect(rowNames()).toEqual(['Gone', 'Nodate']);
    await act(async () =>
      productListStore.setState(() => ({
        filters: { ...defaultProductFilters, categories: ['serum'], sort: 'recent' },
      })),
    );
    await wait(0);
    expect(rowNames()).toEqual(['Nodate', 'Gone']);
  });

  it('marks a product finished with a toast, and Undo restores it', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Vitamin C serum' }));
    createProduct(app.db, input({ name: 'Face mist' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Face mist');

    await fireEvent(screen.getByTestId('product-row-1'), 'accessibilityAction', {
      nativeEvent: { actionName: 'markFinished' },
    });
    await wait(0);
    expect(uiStore.state.toasts[0]).toMatchObject({
      message: 'Vitamin C serum moved to Archive',
      actionLabel: 'Undo',
    });
    expect(rowNames()).toEqual(['Face mist']);
    expect(screen.getByText('Archive (1)')).toBeTruthy();

    await act(async () => runToastAction(uiStore.state.toasts[0]!.id));
    await wait(0);
    expect(rowNames()).toEqual(['Face mist', 'Vitamin C serum']);
    expect(countArchived(app.db)).toBe(0);
    expect(screen.queryByText(/^Archive \(/)).toBeNull();
  });

  it('marks as opened and duplicates from the row actions', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Clay pack' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Clay pack');
    const row = screen.getByTestId('product-row-1');
    expect(row.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      'markOpened',
      'markFinished',
      'buyAgain',
      'duplicate',
    ]);
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'markOpened' } });
    await wait(0);
    expect(screen.getByTestId('product-row-1').props.accessibilityActions).toHaveLength(3);
    await fireEvent(screen.getByTestId('product-row-1'), 'accessibilityAction', {
      nativeEvent: { actionName: 'duplicate' },
    });
    await wait(0);
    expect(rowNames()).toEqual(['Clay pack', 'Clay pack']);
    expect(uiStore.state.toasts[0]?.message).toBe('Copy of Clay pack added');
  });

  it('selects several products, finishes them together and undoes it', async () => {
    const app = setup();
    for (const name of ['A', 'B', 'C']) createProduct(app.db, input({ name }));
    await app.render(<ProductsScreen />);
    await screen.findByText('A');
    expect(screen.getByRole('button', { name: 'Add product' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Select' }));
    expect(screen.queryByRole('button', { name: 'Add product' })).toBeNull();
    expect(screen.getByTestId('selection-bar')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('product-row-1'));
    await fireEvent.press(screen.getByTestId('product-row-3'));
    expect(screen.getByTestId('product-row-1')).toBeChecked();
    expect(screen.getByText('2 selected')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Mark finished' }));
    await wait(0);
    expect(rowNames()).toEqual(['B']);
    expect(uiStore.state.toasts[0]?.message).toBe('2 products moved to Archive');
    expect(screen.queryByTestId('selection-bar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add product' })).toBeTruthy();

    await act(async () => runToastAction(uiStore.state.toasts[0]!.id));
    await wait(0);
    expect(rowNames()).toEqual(['A', 'B', 'C']);
  });

  it('switches to the shelf view and remembers it', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Hair wash', area: 'hair' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Hair wash');
    await fireEvent.press(screen.getByRole('button', { name: 'Shelf view' }));
    await wait(0);
    expect(await screen.findByTestId('product-tile-1')).toBeTruthy();
    expect(screen.queryByTestId('product-row-1')).toBeNull();
    expect(getSettings(app.db).productView).toBe('shelf');
    expect(screen.getByRole('button', { name: 'List view' })).toBeTruthy();
  });

  it('names the Avoid badge on a shelf tile for screen readers', async () => {
    const app = setup();
    saveSettings(app.db, { productView: 'shelf' });
    createProduct(app.db, input({ name: 'Perfumed', ingredients: ['Parfum'] }));
    app.db.insert(avoidItem).values({ kind: 'ingredient', refId: 1 }).run();
    await app.render(<ProductsScreen />);
    expect(await screen.findByTestId('product-tile-1')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/, Avoid$/),
    );
  });

  it('opens the archive from the footer link', async () => {
    const app = setup();
    const id = createProduct(app.db, input({ name: 'Old' }));
    createProduct(app.db, input({ name: 'New' }));
    markFinished(app.db, id, TODAY);
    await app.render(<ProductsScreen />);
    await fireEvent.press(await screen.findByText('Archive (1)'));
    expect(router.push).toHaveBeenCalledWith('/products/archive');
  });
});
