import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { avoidItem, product } from '@/db/schema';
import { saveSettings } from '@/features/settings/repo';
import { addBuyAgain, listShopping, prefillFromItem, setBought } from '@/features/shopping/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { createProduct, getProduct, listKnownIngredients, markFinished } from '../../repo';
import type { ProductInput } from '../../schema';
import { ProductFormScreen } from '../ProductFormScreen';

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
jest.mock('../../photo', () => ({
  pickProductPhoto: jest.fn(() => Promise.resolve({ status: 'picked', uri: 'file:///new.jpg' })),
}));
jest.mock('../../photoFiles', () => ({ deletePhotoFile: jest.fn() }));

const { router } = jest.requireMock<{ router: { back: jest.Mock } }>('expo-router');
const { deletePhotoFile } = jest.requireMock<{ deletePhotoFile: jest.Mock }>('../../photoFiles');

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

function setup(params: Record<string, string> = {}) {
  mockParams.current = params;
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const show = () =>
    app.render(
      <>
        <ProductFormScreen />
        <PortalHost />
      </>,
    );
  return { ...app, show };
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
const helperLines = () => screen.queryAllByTestId('field-helper').length;

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  router.back.mockClear();
  deletePhotoFile.mockClear();
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('Add product (short form)', () => {
  it('adds the first product, opened today with a period after opening', async () => {
    const app = setup();
    await app.show();
    expect(await screen.findByText('Your first product')).toBeTruthy();
    expect(screen.queryByText('Save changes')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Vitamin C serum');
    await fireEvent.press(screen.getByLabelText('Skin'));
    await fireEvent.press(screen.getByLabelText('12M'));
    expect(screen.getByTestId('expiry-preview')).toHaveTextContent(
      'Expires on 7 Oct 2027 (in 365 days)',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save product' }));
    await flush();

    const saved = getProduct(app.db, 1, TODAY, 30);
    expect(saved).toMatchObject({
      name: 'Vitamin C serum',
      area: 'skin',
      openedAt: TODAY,
      paoMonths: 12,
      purchasedAt: TODAY,
      expiresAt: null,
    });
    expect(uiStore.state.toasts[0]?.message).toBe('Vitamin C serum added');
    expect(router.back).toHaveBeenCalled();
  });

  it('shows errors in place without moving the fields', async () => {
    const app = setup();
    await app.show();
    await screen.findByText('Your first product');
    const before = helperLines();
    await fireEvent.press(screen.getByRole('button', { name: 'Save product' }));
    await flush();
    expect(screen.getByText('Enter a name.')).toBeTruthy();
    expect(screen.getByText('Choose skin, hair or both.')).toBeTruthy();
    expect(helperLines()).toBe(before);
    expect(getProduct(app.db, 1, TODAY, 30)).toBeNull();
  });

  it('switches to Not yet without moving anything, and saves it unopened', async () => {
    const app = setup();
    await app.show();
    await screen.findByText('Use within');
    await fireEvent.press(screen.getByLabelText('6M'));
    await fireEvent.press(screen.getByLabelText('Not yet'));
    expect(screen.getAllByText('Printed expiry date').length).toBeGreaterThan(0);
    expect(screen.queryByText('Use within')).toBeNull();
    expect(screen.getByTestId('open-area')).toHaveProp(
      'className',
      expect.stringContaining('min-h-[176px]'),
    );
    expect(screen.getByTestId('expiry-preview')).toHaveTextContent('No expiry date yet');

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Mask');
    await fireEvent.press(screen.getByLabelText('Hair'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save product' }));
    await flush();
    expect(getProduct(app.db, 1, TODAY, 30)).toMatchObject({
      area: 'hair',
      openedAt: null,
      paoMonths: null,
    });
  });

  it('saves and clears the form for the next bottle', async () => {
    const app = setup();
    await app.show();
    await screen.findByText('Your first product');
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Toner');
    await fireEvent.press(screen.getByLabelText('Both'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save and add another' }));
    await flush();

    expect(uiStore.state.toasts[0]?.message).toBe('Toner added');
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveProp('value', '');
    expect(await screen.findByText('Add product')).toBeTruthy();
    expect(getProduct(app.db, 1, TODAY, 30)?.area).toBe('both');
  });

  it('saves More details: brand from suggestions, category and price', async () => {
    const app = setup();
    createProduct(app.db, input({ brand: 'La Roche-Posay' }));
    await app.show();
    await screen.findByText('Add product');
    await fireEvent.press(screen.getByRole('button', { name: 'More details' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Cleanser');
    await fireEvent.press(screen.getByLabelText('Skin'));
    await fireEvent(screen.getByLabelText('Brand'), 'focus');
    await fireEvent.changeText(screen.getByLabelText('Brand'), 'la r');
    await fireEvent.press(await screen.findByRole('button', { name: 'La Roche-Posay' }));
    await fireEvent.changeText(screen.getByLabelText('Price'), '12,5');
    await fireEvent.press(screen.getByRole('button', { name: 'Save product' }));
    await flush();
    expect(getProduct(app.db, 2, TODAY, 30)).toMatchObject({
      brand: 'La Roche-Posay',
      priceCents: 1250,
    });
  });
});

describe('Add product from a bought shopping item', () => {
  it('saves the prefilled fields with today as purchase date and links the item', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    const old = createProduct(
      app.db,
      input({ name: 'Body lotion', brand: 'Nivea', size: 400, unit: 'ml', ingredients: ['Aqua'] }),
    );
    app.db
      .update(product)
      .set({ createdAt: Date.now() - 60_000 })
      .run();
    markFinished(app.db, old, '2026-10-01');
    const item = addBuyAgain(app.db, old)!.id;
    setBought(app.db, item, Date.now() - 30_000);
    const prefill = prefillFromItem(app.db, item, TODAY);
    mockParams.current = { prefill: JSON.stringify(prefill), fromShoppingItem: String(item) };

    await app.render(
      <>
        <ProductFormScreen />
        <PortalHost />
      </>,
    );
    expect(await screen.findByDisplayValue('Body lotion')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save product' }));
    await flush();

    const saved = getProduct(app.db, 2, TODAY, 30);
    expect(saved).toMatchObject({
      name: 'Body lotion',
      brand: 'Nivea',
      size: 400,
      unit: 'ml',
      purchasedAt: TODAY,
      openedAt: null,
      expiresAt: null,
    });
    expect(saved?.ingredients.map((i) => i.name)).toEqual(['Aqua']);
    expect(listShopping(app.db).bought[0]).toMatchObject({ productId: 2, needsProduct: false });
  });
});

describe('Edit product (full form)', () => {
  it('shows every field and saves changes from the bottom bar', async () => {
    const app = setup({ id: '1' });
    createProduct(
      app.db,
      input({ name: 'Serum', size: 30, unit: 'ml', price: 2490, paoMonths: 9, openedAt: TODAY }),
    );
    await app.show();
    expect(await screen.findByText('Edit product')).toBeTruthy();
    // The header shows while the product loads; wait for the form itself.
    expect(await screen.findByLabelText('Name')).toHaveProp('value', 'Serum');
    expect(screen.getByLabelText('Size')).toHaveProp('value', '30');
    expect(screen.getByLabelText('Price')).toHaveProp('value', '24,90');
    for (const label of ['Purchase date', 'Printed expiry date', 'Opened on', 'Notes']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByLabelText('9M')).toBeSelected();
    expect(screen.queryByRole('button', { name: 'Save product' })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Serum 2');
    await fireEvent.press(screen.getByLabelText('Custom'));
    await fireEvent.changeText(screen.getByLabelText('Months'), '15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await flush();
    expect(getProduct(app.db, 1, TODAY, 30)).toMatchObject({ name: 'Serum 2', paoMonths: 15 });
    expect(uiStore.state.toasts[0]?.message).toBe('Changes saved');
    expect(router.back).toHaveBeenCalled();
  });

  it('splits a pasted ingredient list, undoes it, and saves the lines', async () => {
    const app = setup({ id: '1' });
    createProduct(app.db, input({ name: 'Serum' }));
    await app.show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Add ingredients' }));
    const field = screen.getByLabelText('One ingredient per line');
    await fireEvent.changeText(field, 'Aqua, Glycerin, Niacinamide, Parfum');
    expect(screen.getByText('Pasted list split at commas into 4 lines.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save 4 ingredients' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('One ingredient per line')).toHaveProp(
      'value',
      'Aqua, Glycerin, Niacinamide, Parfum',
    );
    expect(screen.getByRole('button', { name: 'Save 1 ingredient' })).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText('One ingredient per line'),
      'Aqua\nGlycerin\nNiacinamide',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save 3 ingredients' }));
    // The form's chips (the closed sheet also renders in tests).
    expect(screen.getAllByLabelText('Glycerin, New').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await flush();
    expect(getProduct(app.db, 1, TODAY, 30)?.ingredients.map((i) => i.name)).toEqual([
      'Aqua',
      'Glycerin',
      'Niacinamide',
    ]);
    expect(listKnownIngredients(app.db)).toHaveLength(3);
  });

  it('warns about an avoided ingredient and asks before saving', async () => {
    const app = setup({ id: '1' });
    createProduct(app.db, input({ name: 'Perfumed', ingredients: ['Aqua', 'Parfum'] }));
    app.db.insert(avoidItem).values({ kind: 'ingredient', refId: 2 }).run();
    await app.show();
    expect(
      await screen.findByText('Parfum is on your avoid list. Saving asks you to confirm.'),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Perfumed cream');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await flush();
    expect(screen.getByText('Save with an avoided ingredient?')).toBeTruthy();
    expect(getProduct(app.db, 1, TODAY, 30)?.name).toBe('Perfumed');
    await fireEvent.press(screen.getByRole('button', { name: 'Save anyway' }));
    await flush();
    expect(getProduct(app.db, 1, TODAY, 30)?.name).toBe('Perfumed cream');
  });

  it('replaces the photo and deletes the old file after saving', async () => {
    const app = setup({ id: '1' });
    createProduct(app.db, input({ photoUri: 'file:///old.jpg' }));
    await app.show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Change photo' }));
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Take photo' }));
    await flush();
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await flush();
    expect(getProduct(app.db, 1, TODAY, 30)?.photoUri).toBe('file:///new.jpg');
    expect(deletePhotoFile).toHaveBeenCalledWith('file:///old.jpg');
    expect(deletePhotoFile).not.toHaveBeenCalledWith('file:///new.jpg');
  });

  it('asks before closing with changes and deletes an unsaved photo', async () => {
    const app = setup({ id: '1' });
    createProduct(app.db, input({ name: 'Serum' }));
    await app.show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Add photo' }));
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Choose from library' }));
    await flush();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(deletePhotoFile).toHaveBeenCalledWith('file:///new.jpg');
    expect(getProduct(app.db, 1, TODAY, 30)?.photoUri).toBeNull();
  });
});
