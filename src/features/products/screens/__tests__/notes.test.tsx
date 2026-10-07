import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, act, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { DayDetailScreen } from '@/features/calendar/screens/DayDetailScreen';
import { ShoppingRow } from '@/features/shopping/components/ShoppingRow';
import { addBuyAgain, listShopping } from '@/features/shopping/repo';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { addNote, listNotes, setRating, setWouldRebuy } from '../../notesRepo';
import { createProduct, getProduct } from '../../repo';
import type { ProductInput } from '../../schema';
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
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const TODAY = '2026-10-07';

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Vitamin C serum',
  brand: null,
  area: 'skin',
  category: 'serum',
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

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  uiStore.setState((s) => ({ ...s, toasts: [], toastInset: 0 }));
  router.push.mockClear();
  mockParams = {};
});

afterEach(() => {
  for (const toast of uiStore.state.toasts) dismissToast(toast.id);
});

describe('My rating on product detail', () => {
  it('saves stars at once, clears them with a second tap, and sets Would buy again', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);

    expect(await screen.findByRole('header', { name: 'My rating' })).toBeTruthy();
    const stars = screen.getByLabelText('My rating: 0 of 5 stars');
    // No choice until one is made.
    const rebuy = screen.getByLabelText('Would buy again', { exact: true });
    expect(
      within(rebuy)
        .getAllByRole('radio')
        .some((r) => r.props.accessibilityState?.checked),
    ).toBe(false);

    await fireEvent.press(within(stars).getByRole('radio', { name: '4 stars' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)!.rating).toBe(4);
    expect(screen.getByLabelText('My rating: 4 of 5 stars')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: '4 stars' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)!.rating).toBeNull();
    expect(screen.getByLabelText('My rating: 0 of 5 stars')).toBeTruthy();

    await fireEvent.press(within(rebuy).getByRole('radio', { name: 'No' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)!.wouldRebuy).toBe(false);
    await fireEvent.press(within(rebuy).getByRole('radio', { name: 'Yes' }));
    await wait(0);
    expect(getProduct(app.db, id, TODAY, 30)!.wouldRebuy).toBe(true);
  });

  it('shows a saved rating and choice', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    setRating(app.db, id, 3);
    setWouldRebuy(app.db, id, false);
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);
    expect(await screen.findByLabelText('My rating: 3 of 5 stars')).toBeTruthy();
    await wait(0);
    const no = within(screen.getByLabelText('Would buy again', { exact: true })).getByRole(
      'radio',
      { name: 'No' },
    );
    expect(no.props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('Notes timeline and the note sheet', () => {
  it('shows the empty line, then adds a note with tags that appears at the top', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    addNote(app.db, { productId: id, day: '2026-10-01', text: 'Older note', tags: [] });
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);

    expect(await screen.findByText('Older note')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add note' }));
    expect(screen.getByText('Today, 7 Oct')).toBeTruthy();
    expect(screen.getByText('0/280')).toBeTruthy();

    // Text is required.
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await wait(0);
    expect(await screen.findByText('Write a note.')).toBeTruthy();
    expect(listNotes(app.db, id)).toHaveLength(1);

    await fireEvent.changeText(screen.getByLabelText('Note'), 'Small breakout on chin');
    await wait(0);
    expect(screen.getByText('22/280')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Redness' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Breakout' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await wait(0);

    expect(listNotes(app.db, id)).toEqual([
      expect.objectContaining({
        day: TODAY,
        text: 'Small breakout on chin',
        tags: ['breakout', 'redness'],
      }),
      expect.objectContaining({ text: 'Older note' }),
    ]);
    const rows = screen.getAllByTestId(/^note-/);
    expect(rows[0]!.props.accessibilityLabel).toBe(
      '7 Oct, Breakout, Redness, Small breakout on chin',
    );
    expect(rows[1]!.props.accessibilityLabel).toBe('1 Oct, Older note');
  });

  it('says how to start when there are no notes', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);
    expect(await screen.findByText('Note how your skin or hair reacts to it.')).toBeTruthy();
  });

  it('edits a note on tap and deletes one from the long-press menu after the dialog', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    const note = addNote(app.db, { productId: id, day: '2026-10-05', text: 'Stung', tags: [] });
    mockParams = { id: String(id) };
    await app.render(<ProductDetailScreen />);

    await fireEvent.press(await screen.findByTestId(`note-${note}`));
    expect(screen.getByRole('header', { name: 'Edit note' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Stung a little');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await wait(0);
    expect(listNotes(app.db, id)[0]).toMatchObject({ day: '2026-10-05', text: 'Stung a little' });
    expect(await screen.findByText('Stung a little')).toBeTruthy();

    await fireEvent(screen.getByTestId(`note-${note}`), 'longPress');
    // The menu adds Edit next to the action bar's Edit.
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete this note?')).toBeTruthy();
    expect(
      screen.getByText("The note from 5 Oct is deleted for good. This can't be undone."),
    ).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    await wait(0);
    expect(listNotes(app.db, id)).toEqual([]);
    expect(await screen.findByText('Note how your skin or hair reacts to it.')).toBeTruthy();
  });

  it('reads in Lithuanian', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    addNote(app.db, { productId: id, day: TODAY, text: 'Rami oda', tags: ['calm'] });
    mockParams = { id: String(id) };
    await setI18nLanguage('lt');
    await app.render(<ProductDetailScreen />);
    expect(await screen.findByRole('header', { name: 'Mano įvertinimas' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Mano pastabos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pridėti pastabą' })).toBeTruthy();
    expect(screen.getAllByText('Rami').length).toBeGreaterThan(0);
    expect(screen.getByText('Pirkčiau dar kartą')).toBeTruthy();
  });
});

describe('Day detail product notes', () => {
  it('lists the notes written that day, each opening its product', async () => {
    const app = setup();
    const serum = createProduct(app.db, input());
    const mask = createProduct(app.db, input({ name: 'Clay mask' }));
    addNote(app.db, { productId: serum, day: '2026-10-06', text: 'Glowing', tags: ['glow'] });
    addNote(app.db, { productId: mask, day: '2026-10-05', text: 'Other day', tags: [] });
    mockParams = { day: '2026-10-06' };
    await app.render(<DayDetailScreen />);

    expect(await screen.findByRole('header', { name: 'Product notes' })).toBeTruthy();
    expect(screen.getByText('Glowing')).toBeTruthy();
    expect(screen.queryByText('Other day')).toBeNull();
    await fireEvent.press(
      screen.getByRole('link', { name: 'Vitamin C serum, open product, Glow, Glowing' }),
    );
    expect(router.push).toHaveBeenCalledWith(`/products/${serum}`);
  });

  it('shows no notes section on a day without notes', async () => {
    const app = setup();
    mockParams = { day: '2026-10-06' };
    await app.render(<DayDetailScreen />);
    await screen.findByText('Skin routines');
    await wait(0);
    expect(screen.queryByRole('header', { name: 'Product notes' })).toBeNull();
  });
});

describe('Rating on shopping rows', () => {
  it('shows "4 stars · would buy again" on a linked row', async () => {
    const app = setup();
    const id = createProduct(app.db, input());
    setRating(app.db, id, 4);
    setWouldRebuy(app.db, id, true);
    addBuyAgain(app.db, id);
    const item = listShopping(app.db).toBuy[0]!;
    await app.render(<ShoppingRow item={item} onToggle={() => {}} />);
    expect(screen.getByText('4 stars · would buy again')).toBeTruthy();
  });
});
