import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Share } from 'react-native';

import { createProduct, markFinished } from '@/features/products/repo';
import { productsSegmentStore } from '@/features/products/listState';
import type { ProductInput } from '@/features/products/schema';
import { ProductsScreen } from '@/features/products/screens/ProductsScreen';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, runToastAction, runToastSecondary, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { ShoppingListRow } from '../../components/ShoppingListRow';
import { addBuyAgain, addItem, listShopping, setBought, toBuyCount } from '../../repo';
import { shoppingViewStore } from '../../viewState';
import { ShoppingScreen } from '../ShoppingScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{
  router: { push: jest.Mock; navigate: jest.Mock };
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

const item = (name: string, over: Partial<Parameters<typeof addItem>[1]> = {}) => ({
  name,
  brand: null,
  area: null,
  list: 'to_buy' as const,
  note: null,
  ...over,
});

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  return app;
}

const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

const addButtons = () => screen.getAllByRole('button', { name: 'Add item' });

const lastToast = () => uiStore.state.toasts.at(-1);

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  uiStore.setState((s) => ({ ...s, toasts: [] }));
  shoppingViewStore.setState(() => ({ area: 'all', suggestionsOpen: true }));
  productsSegmentStore.setState(() => ({ segment: 'mine' }));
  router.push.mockClear();
  router.navigate.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('ShoppingScreen', () => {
  it('shows the empty state in EN and LT, and Add item opens the sheet', async () => {
    const app = setup();
    await app.render(<ShoppingScreen />);
    expect(await screen.findByText('Nothing to buy')).toBeTruthy();
    expect(
      screen.getByText('Finished and expiring products show up here as suggestions.'),
    ).toBeTruthy();
    // The Fab is the add action; the empty state repeats it.
    expect(screen.getAllByRole('button', { name: 'Add item' }).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add item' })[0]!);
    expect(await screen.findByText('Add to shopping list')).toBeTruthy();

    await setI18nLanguage('lt');
    expect(await screen.findByText('Nieko nereikia pirkti')).toBeTruthy();
  });

  it('suggests finished and expiring products, adds with + and dismisses with x', async () => {
    const app = setup();
    const done = createProduct(app.db, input({ name: 'Clay mask' }));
    markFinished(app.db, done, '2026-10-02');
    createProduct(app.db, input({ name: 'Vitamin C serum', expiresAt: '2026-10-16' }));
    await app.render(<ShoppingScreen />);

    expect(await screen.findByText('Suggested')).toBeTruthy();
    expect(screen.getByText('Finished 2 Oct')).toBeTruthy();
    expect(screen.getByText('Expires in 9 days')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Buy again, Vitamin C serum' }));
    await wait(0);
    expect(lastToast()).toMatchObject({
      message: 'Vitamin C serum added to your shopping list',
      actionLabel: 'Undo',
    });
    expect(screen.getByTestId(/^shopping-row-/)).toBeTruthy();
    expect(screen.queryByTestId('suggestion-2')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss suggestion, Clay mask' }));
    await wait(0);
    expect(screen.queryByText('Suggested')).toBeNull();

    await act(async () => runToastAction(lastToast()!.id));
    await wait(0);
    expect(toBuyCount(app.db)).toBe(0);
    expect(await screen.findByText('Expires in 9 days')).toBeTruthy();
  });

  it('collapses Suggested and remembers it for the session', async () => {
    const app = setup();
    const done = createProduct(app.db, input({ name: 'Clay mask' }));
    markFinished(app.db, done, '2026-10-02');
    await app.render(<ShoppingScreen />);
    const header = await screen.findByRole('button', { name: 'Suggested, 1' });
    await fireEvent.press(header);
    expect(shoppingViewStore.state.suggestionsOpen).toBe(false);
    expect(screen.getByRole('button', { name: 'Suggested, 1' }).props.accessibilityState).toEqual({
      expanded: false,
    });
  });

  it('ticks an item into Bought with the inline Add line, which opens Add product pre-filled', async () => {
    const app = setup();
    const pid = createProduct(
      app.db,
      input({ name: 'Body lotion', brand: 'Nivea', size: 400, unit: 'ml', price: 1250 }),
    );
    markFinished(app.db, pid, '2026-10-01');
    const id = addBuyAgain(app.db, pid)!.id;
    await app.render(<ShoppingScreen />);

    const row = await screen.findByRole('checkbox', { name: /^Body lotion, Nivea/ });
    expect(
      within(screen.getByTestId(`shopping-row-${id}`)).getByText('€12.50 · 400 ml'),
    ).toBeTruthy();
    expect(screen.queryByText('Add it to your products to track when it expires.')).toBeNull();

    await fireEvent.press(row);
    await wait(0);
    expect(screen.getByText('Bought')).toBeTruthy();
    expect(screen.getByText(/^Bought .+ · leaves the list after 30 days$/)).toBeTruthy();
    expect(screen.getByText('Add it to your products to track when it expires.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Add Body lotion to your products' }));
    expect(router.push).toHaveBeenCalledTimes(1);
    const arg = router.push.mock.calls[0]![0] as {
      pathname: string;
      params: { prefill: string; fromShoppingItem: string };
    };
    expect(arg.pathname).toBe('/product-form');
    expect(arg.params.fromShoppingItem).toBe(String(id));
    expect(JSON.parse(arg.params.prefill)).toMatchObject({
      name: 'Body lotion',
      brand: 'Nivea',
      size: '400',
      unit: 'ml',
      purchasedAt: TODAY,
      openedAt: null,
      expiresAt: null,
    });
  });

  it('clears bought items with Undo', async () => {
    const app = setup();
    const a = addItem(app.db, item('Soap'));
    const b = addItem(app.db, item('Cotton pads'));
    addItem(app.db, item('Toner'));
    setBought(app.db, a, Date.now());
    setBought(app.db, b, Date.now());
    await app.render(<ShoppingScreen />);
    await screen.findByText('Soap');

    await fireEvent.press(screen.getByRole('button', { name: 'Clear bought' }));
    await wait(0);
    expect(screen.queryByText('Soap')).toBeNull();
    expect(lastToast()).toMatchObject({ message: '2 bought items cleared', actionLabel: 'Undo' });

    await act(async () => runToastAction(lastToast()!.id));
    await wait(0);
    expect(await screen.findByText('Soap')).toBeTruthy();
    expect(listShopping(app.db).bought).toHaveLength(2);
  });

  it('filters To buy by area and moves Want to try items to To buy', async () => {
    const app = setup();
    addItem(app.db, item('Face wash', { area: 'skin' }));
    addItem(app.db, item('Shampoo', { area: 'hair' }));
    addItem(app.db, item('Hair oil', { area: 'hair', list: 'want_to_try' }));
    await app.render(<ShoppingScreen />);
    await screen.findByText('Face wash');

    await fireEvent.press(screen.getByRole('button', { name: 'Hair' }));
    await wait(0);
    expect(screen.queryByText('Face wash')).toBeNull();
    expect(screen.getByText('Shampoo')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Move to To buy' }));
    await wait(0);
    expect(screen.queryByText('Want to try')).toBeNull();
    expect(listShopping(app.db, 'hair').toBuy.map((i) => i.name)).toEqual(['Shampoo', 'Hair oil']);
  });

  it('adds a new item from the sheet and validates the name', async () => {
    const app = setup();
    addItem(app.db, item('Toner'));
    await app.render(<ShoppingScreen />);
    await screen.findByText('Toner');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add item' })[0]!);
    await fireEvent.press(screen.getByRole('radio', { name: 'New item' }));

    await fireEvent.press(addButtons().at(-1)!);
    expect(await screen.findByText('Enter a name.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Cotton pads');
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Big pack');
    await fireEvent.press(screen.getByRole('radio', { name: 'Want to try' }));
    await fireEvent.press(addButtons().at(-1)!);
    await wait(0);
    expect(listShopping(app.db).wantToTry).toMatchObject([
      { name: 'Cotton pads', note: 'Big pack', list: 'want_to_try' },
    ]);
    expect(lastToast()?.message).toBe('Cotton pads added to your shopping list');
  });

  it('adds a finished product from the Buy again picker', async () => {
    const app = setup();
    const pid = createProduct(app.db, input({ name: 'Clay mask', brand: 'Acme' }));
    markFinished(app.db, pid, '2026-10-01');
    addItem(app.db, item('Toner'));
    await app.render(<ShoppingScreen />);
    await screen.findByText('Toner');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add item' })[0]!);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Clay mask. Acme · Finished' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add item' }).at(-1)!);
    await wait(0);
    expect(listShopping(app.db).toBuy.map((i) => i.productId)).toContain(pid);
    expect(lastToast()?.message).toBe('Clay mask added to your shopping list');
  });

  it('deletes an item from the row actions with Undo', async () => {
    const app = setup();
    const id = addItem(app.db, item('Toner'));
    await app.render(<ShoppingScreen />);
    const row = await screen.findByRole('checkbox', { name: 'Toner' });
    expect(row.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      'edit',
      'move',
      'delete',
    ]);
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    await wait(0);
    expect(screen.queryByText('Toner')).toBeNull();
    expect(lastToast()).toMatchObject({ message: 'Toner removed', actionLabel: 'Undo' });
    await act(async () => runToastAction(lastToast()!.id));
    await wait(0);
    expect(listShopping(app.db).toBuy.map((i) => i.id)).toEqual([id]);
  });
});

describe('Shopping in Products', () => {
  it('shows the to-buy count on the segment and shares the list', async () => {
    const app = setup();
    const pid = createProduct(app.db, input({ name: 'Body lotion', brand: 'Nivea' }));
    addBuyAgain(app.db, pid);
    addItem(app.db, item('Cotton pads'));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await app.render(<ProductsScreen />);

    const segment = await screen.findByRole('radio', { name: 'Shopping, 2' });
    await fireEvent.press(segment);
    await screen.findByText('Cotton pads');
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      message: 'To buy\n• Body lotion (Nivea)\n• Cotton pads',
      title: 'Shopping list',
    });
    share.mockRestore();
  });

  it('Buy again from a product row adds it with Undo, and Mark finished offers Buy again', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Clay pack' }));
    await app.render(<ProductsScreen />);
    await screen.findByText('Clay pack');
    const row = screen.getByTestId('product-row-1');
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'buyAgain' } });
    await wait(0);
    expect(lastToast()).toMatchObject({
      message: 'Clay pack added to your shopping list',
      actionLabel: 'Undo',
    });
    expect(toBuyCount(app.db)).toBe(1);
    await act(async () => runToastAction(lastToast()!.id));
    await wait(0);
    expect(toBuyCount(app.db)).toBe(0);

    await fireEvent(screen.getByTestId('product-row-1'), 'accessibilityAction', {
      nativeEvent: { actionName: 'markFinished' },
    });
    await wait(0);
    expect(lastToast()).toMatchObject({
      message: 'Clay pack moved to Archive',
      secondaryLabel: 'Buy again',
    });
    await act(async () => runToastSecondary(lastToast()!.id));
    await wait(0);
    expect(toBuyCount(app.db)).toBe(1);
    expect(lastToast()?.message).toBe('Clay pack added to your shopping list');
  });
});

describe('ShoppingListRow', () => {
  it('is hidden at 0 and opens the Shopping segment', async () => {
    const app = setup();
    await app.render(<ShoppingListRow />);
    expect(screen.queryByRole('button')).toBeNull();
    addItem(app.db, item('A'));
    addItem(app.db, item('B'));
    addItem(app.db, item('C'));
    await act(async () => app.client.invalidateQueries());
    const row = await screen.findByRole('button', { name: 'Shopping list · 3 to buy' });
    await fireEvent.press(row);
    expect(productsSegmentStore.state.segment).toBe('shopping');
    expect(router.navigate).toHaveBeenCalledWith('/products');
  });
});
