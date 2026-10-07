import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { saveSettings } from '@/features/settings/repo';
import { saveRoutine } from '@/features/routines/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { pickReturnStore, productAddedForPick } from '../../pickReturn';
import { createProduct } from '../../repo';
import type { ProductInput } from '../../schema';
import { ProductPickerSheet, type ProductPickerSheetProps } from '../ProductPickerSheet';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

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
  const props = {
    open: true,
    onClose: jest.fn(),
    onPick: jest.fn(),
    onAddNew: jest.fn(),
  };
  const show = (over: Partial<ProductPickerSheetProps> = {}) =>
    app.render(<ProductPickerSheet area="skin" {...props} {...over} />);
  return { ...app, props, show };
}

const rowNames = (group: string) =>
  within(screen.getByTestId(`picker-group-${group}`))
    .queryAllByTestId(/^picker-row-/)
    .map((r) => String(r.props.accessibilityLabel).split(', ')[0]);

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  pickReturnStore.setState(() => ({ waiting: null, result: null }));
  router.push.mockClear();
});

describe('ProductPickerSheet', () => {
  it('lists skin and both products by name, with Recent first', async () => {
    const app = setup();
    createProduct(app.db, input({ name: 'Toner', brand: 'Acme' }));
    const serum = createProduct(app.db, input({ name: 'Serum', area: 'both' }));
    createProduct(app.db, input({ name: 'Shampoo', area: 'hair' }));
    saveRoutine(app.db, {
      name: 'Evening',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '21:00',
      daysOfWeek: [1],
      reminderTime: null,
      steps: [
        {
          id: null,
          productId: serum,
          note: null,
          scheduleKind: 'always',
          daysOfWeek: null,
          everyNDays: null,
          startDate: null,
          waitSeconds: 0,
        },
      ],
    });
    await app.show();
    await waitFor(() => expect(rowNames('all')).toEqual(['Serum', 'Toner']));
    expect(rowNames('recent')).toEqual(['Serum']);
    expect(screen.getByRole('header', { name: 'Recent' })).toBeTruthy();
    expect(screen.queryByText('Shampoo')).toBeNull();
    expect(screen.getAllByText('Acme')).toHaveLength(1);

    // Searching narrows the list and hides Recent.
    await fireEvent.changeText(screen.getByLabelText('Search products'), 'ton');
    await waitFor(() => expect(rowNames('all')).toEqual(['Toner']));
    expect(screen.queryByTestId('picker-group-recent')).toBeNull();
  });

  it('picks one and closes', async () => {
    const app = setup();
    const toner = createProduct(app.db, input({ name: 'Toner' }));
    await app.show();
    await fireEvent.press(await screen.findByTestId(`picker-row-${toner}`));
    expect(app.props.onPick).toHaveBeenCalledWith([toner]);
    expect(app.props.onClose).toHaveBeenCalled();
  });

  it("keeps expired products under Can't be picked, disabled and saying why", async () => {
    const app = setup();
    const old = createProduct(app.db, input({ name: 'Old SPF', expiresAt: '2026-01-01' }));
    await app.show();
    expect(await screen.findByRole('header', { name: "Can't be picked" })).toBeTruthy();
    expect(rowNames('expired')).toEqual(['Old SPF']);
    const row = screen.getByTestId(`picker-row-${old}`);
    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(row.props.accessibilityLabel).toContain(
      'Expired products stay out of new steps. Buy it again from Products.',
    );
    expect(within(row).getByText(/Expired/)).toBeTruthy();
    await fireEvent.press(row);
    expect(app.props.onPick).not.toHaveBeenCalled();
  });

  it('picks several and returns them with Done', async () => {
    const app = setup();
    const a = createProduct(app.db, input({ name: 'Shampoo', area: 'hair' }));
    const b = createProduct(app.db, input({ name: 'Mask', area: 'hair' }));
    await app.show({ area: 'hair', multiple: true, selected: [a] });
    expect((await screen.findByTestId(`picker-row-${a}`)).props.accessibilityState.checked).toBe(
      true,
    );
    await fireEvent.press(screen.getByTestId(`picker-row-${b}`));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(app.props.onPick).toHaveBeenCalledWith([a, b]);
  });

  it('opens Add product and comes back with the new product picked', async () => {
    const app = setup();
    await app.show();
    await fireEvent.press(screen.getByRole('button', { name: 'Add new product' }));
    expect(app.props.onClose).toHaveBeenCalled();
    expect(app.props.onAddNew).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/product-form',
      params: { prefill: JSON.stringify({ area: 'skin' }) },
    });

    await act(async () => productAddedForPick({ id: 42, area: 'skin' }));
    expect(app.props.onPick).toHaveBeenCalledWith([42]);
    // Only the first product added is picked.
    await act(async () => productAddedForPick({ id: 43, area: 'skin' }));
    expect(app.props.onPick).toHaveBeenCalledTimes(1);
  });

  it('does not pick a new product of the wrong area', async () => {
    const app = setup();
    await app.show();
    await fireEvent.press(screen.getByRole('button', { name: 'Add new product' }));
    await act(async () => productAddedForPick({ id: 7, area: 'hair' }));
    expect(app.props.onPick).not.toHaveBeenCalled();
  });
});
