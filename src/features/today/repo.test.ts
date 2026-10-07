import { createTestDb } from '@/db/test-db';
import { quickSetup } from '@/features/hair/repo';
import { createProduct } from '@/features/products/repo';
import { saveRoutine } from '@/features/routines/repo';

import { setupProgress } from './repo';

const product = (name: string) => ({
  name,
  brand: null,
  area: 'skin' as const,
  category: 'serum' as const,
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
});

describe('setupProgress', () => {
  it('starts with nothing done', () => {
    expect(setupProgress(createTestDb())).toEqual({ product: null, routine: null, hair: null });
  });

  it('names the first product, routine and hair task made', () => {
    const db = createTestDb();
    createProduct(db, product('Vitamin C serum'));
    createProduct(db, product('SPF 50 fluid'));
    saveRoutine(db, {
      name: 'Evening basics',
      timeOfDay: 'evening',
      customName: null,
      sortTime: '21:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      reminderTime: null,
      steps: [],
    });
    quickSetup(
      db,
      { frequency: 'every_3_days', lastWash: '2026-10-05', trim: false },
      '2026-10-07',
      { wash: 'Hair wash', trim: 'Trim' },
    );
    expect(setupProgress(db)).toEqual({
      product: 'Vitamin C serum',
      routine: 'Evening basics',
      hair: 'Hair wash',
    });
  });
});
