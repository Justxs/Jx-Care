import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { routine } from '@/db/schema';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { saveRoutine, type SaveRoutineInput } from '@/features/routines/repo';

/** Test helpers for Today: seed products and routines that count from long before the test day. */

export const MON = '2026-10-05';
export const TUE = '2026-10-06';
export const WED = '2026-10-07';

export const productInput = (over: Partial<ProductInput> = {}): ProductInput => ({
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

export function seedProduct(db: Db, over: Partial<ProductInput> = {}): number {
  return createProduct(db, productInput(over));
}

export type SeedRoutine = {
  name: string;
  timeOfDay?: SaveRoutineInput['timeOfDay'];
  days?: number[];
  reminderTime?: string | null;
  /** One step per entry: a product id or null. */
  steps?: (number | null)[];
};

export function seedRoutine(db: Db, r: SeedRoutine): number {
  const timeOfDay = r.timeOfDay ?? 'evening';
  const id = saveRoutine(db, {
    name: r.name,
    timeOfDay,
    customName: null,
    sortTime: timeOfDay === 'morning' ? '07:00' : '21:00',
    daysOfWeek: r.days ?? [1, 2, 3, 4, 5, 6, 7],
    reminderTime: r.reminderTime ?? null,
    steps: (r.steps ?? [null, null]).map((productId) => ({
      id: null,
      productId,
      note: null,
      scheduleKind: 'always' as const,
      daysOfWeek: null,
      everyNDays: null,
      startDate: null,
      waitSeconds: 0,
    })),
  });
  // Created long ago, so every test day counts.
  db.update(routine)
    .set({ createdAt: new Date(2026, 0, 1, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}
