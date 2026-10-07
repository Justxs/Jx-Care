import { waitFor } from '@testing-library/react-native';

import { useMarkFinishedMany } from '@/features/products/api';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { useIngredientProducts } from './api';
import { listIngredients } from './repo';

const productInput = (over: Partial<ProductInput> = {}): ProductInput => ({
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

describe('useIngredientProducts', () => {
  it('shows a product as finished once it is marked finished', async () => {
    const app = setupTestApp();
    appStore.setState((s) => ({ ...s, activeDay: '2026-10-05' }));
    const serum = createProduct(app.db, productInput({ name: 'Serum', ingredients: ['Retinol'] }));
    const retinol = listIngredients(app.db)[0]!.id;
    const { result } = await app.renderHook(() => ({
      products: useIngredientProducts(retinol),
      finish: useMarkFinishedMany(),
    }));
    await waitFor(() =>
      expect(result.current.products.data).toMatchObject([{ id: serum, archivedAt: null }]),
    );

    await result.current.finish.mutateAsync([serum]);
    await waitFor(() =>
      expect(result.current.products.data).toMatchObject([{ id: serum, archivedAt: '2026-10-05' }]),
    );
  });
});
