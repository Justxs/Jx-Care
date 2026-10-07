import { act, waitFor } from '@testing-library/react-native';

import { useRoutines } from '@/features/routines/api';
import { saveRoutine } from '@/features/routines/repo';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { useMarkFinishedMany, useUpdateProduct } from './api';
import { createProduct } from './repo';
import type { ProductInput } from './schema';

const TODAY = '2026-10-07';

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'SPF 50 fluid',
  brand: null,
  area: 'skin',
  category: 'spf',
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
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  const productId = createProduct(app.db, input());
  saveRoutine(app.db, {
    name: 'Morning',
    timeOfDay: 'morning',
    customName: null,
    sortTime: '07:30',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    reminderTime: null,
    steps: [
      {
        id: null,
        productId,
        note: null,
        scheduleKind: 'always',
        daysOfWeek: null,
        everyNDays: null,
        startDate: null,
        waitSeconds: 0,
      },
    ],
  });
  return { ...app, productId };
}

describe('product mutations refresh the routines that use the product', () => {
  it('flags a step whose product was marked finished', async () => {
    const app = setup();
    const { result } = await app.renderHook(() => ({
      routines: useRoutines(),
      finish: useMarkFinishedMany(),
    }));
    await waitFor(() => expect(result.current.routines.data).toHaveLength(1));
    expect(result.current.routines.data![0]!.steps[0]!.product?.problem).toBeNull();

    await act(async () => {
      await result.current.finish.mutateAsync([app.productId]);
    });
    await waitFor(() =>
      expect(result.current.routines.data![0]!.steps[0]!.product?.problem).toBe('finished'),
    );
  });

  it('shows a renamed product in its routine', async () => {
    const app = setup();
    const { result } = await app.renderHook(() => ({
      routines: useRoutines(),
      update: useUpdateProduct(),
    }));
    await waitFor(() => expect(result.current.routines.data).toHaveLength(1));

    await act(async () => {
      await result.current.update.mutateAsync({
        id: app.productId,
        input: input({ name: 'Mineral SPF 30' }),
      });
    });
    await waitFor(() =>
      expect(result.current.routines.data![0]!.steps[0]!.product?.name).toBe('Mineral SPF 30'),
    );
  });
});
