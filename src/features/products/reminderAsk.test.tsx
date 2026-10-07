import { act, fireEvent, screen } from '@testing-library/react-native';
import { useEffect } from 'react';

import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import {
  reminderAskStore,
  resetReminderAsk,
  setPermissionAdapter,
} from '@/notifications/askPermission';
import { createFakeOS } from '@/notifications/fakeOS';
import { setNotificationOS } from '@/notifications/scheduler';
import { dismissToast, uiStore } from '@/state/ui';
import { setupTestApp } from '@/test/render';

import { useCreateProduct } from './api';
import { ReminderAskHost } from './components/ReminderAskSheet';
import { onProductSaved } from './events';
import type { ProductInput } from './schema';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/db/queryClient', () => {
  const actual = jest.requireActual('@/db/queryClient');
  return { ...actual, queryClient: actual.createQueryClient({ gcTime: Infinity }) };
});

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

const request = jest.fn(async () => 'granted' as const);

beforeEach(async () => {
  await setI18nLanguage('en');
  request.mockClear();
  setPermissionAdapter({ get: async () => 'undetermined', request });
  setNotificationOS(createFakeOS());
});

afterEach(() => {
  resetReminderAsk();
  setPermissionAdapter(null);
  setNotificationOS(null);
  for (const t of uiStore.state.toasts) dismissToast(t.id);
});

type Create = ReturnType<typeof useCreateProduct>;
let create: Create;

/** The product form's save path next to the host it opens: create, then `onProductSaved`. */
function Harness({ onReady }: { onReady: (c: Create) => void }) {
  const c = useCreateProduct();
  useEffect(() => onReady(c), [c, onReady]);
  return <ReminderAskHost />;
}

const harness = (
  <Harness
    onReady={(c) => {
      create = c;
    }}
  />
);

async function saveProduct(values: ProductInput) {
  await act(async () => {
    const { id, isFirstWithExpiry } = await create.mutateAsync(values);
    onProductSaved({ id, name: values.name }, { isFirstWithExpiry });
  });
}

describe('reminder ask after saving a product (P3)', () => {
  it('shows once for the first product with an expiry date; Not now is final', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    await app.render(harness);

    // No date: nothing to remind about.
    await saveProduct(input({ name: 'Cleanser' }));
    expect(reminderAskStore.state.ask).toBeNull();

    await saveProduct(input({ expiresAt: '2026-11-20' }));
    expect(await screen.findByText('Get a reminder before it expires?')).toBeTruthy();
    expect(
      screen.getByText(
        'Jx Care reminds you about Vitamin C serum 30 days before it expires and on the day, at 09:00.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Example notification: Vitamin C serum expires in 30 days'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(reminderAskStore.state.ask).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(getSettings(app.db)).toMatchObject({ reminderAskDone: true, expiryRemindersOn: false });

    // The next product with a date is not the first; even if it were, the ask is done.
    await saveProduct(input({ name: 'Toner', expiresAt: '2026-12-01' }));
    onProductSaved({ id: 99, name: 'Toner' }, { isFirstWithExpiry: true });
    expect(reminderAskStore.state.ask).toBeNull();
  });

  it('Allow asks the phone and turns expiry reminders on', async () => {
    const app = setupTestApp();
    saveSettings(app.db, { language: 'en' });
    await app.render(harness);
    await saveProduct(input({ expiresAt: '2026-11-20' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Allow reminders' }));
    expect(request).toHaveBeenCalledTimes(1);
    expect(getSettings(app.db)).toMatchObject({ reminderAskDone: true, expiryRemindersOn: true });
  });
});
