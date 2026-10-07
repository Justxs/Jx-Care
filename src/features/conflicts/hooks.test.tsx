import { act, waitFor } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { routine } from '@/db/schema';
import { createProduct } from '@/features/products/repo';
import type { ProductInput } from '@/features/products/schema';
import { useSetChoice } from '@/features/routines/api';
import * as reminders from '@/features/routines/reminders';
import { saveRoutine, setChoice, type SaveRoutineInput } from '@/features/routines/repo';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { useDayRoutineConflicts, usePlayerConflicts } from './hooks';
import { listIngredients, saveRule } from './repo';

const MON = '2026-10-05';

const productInput = (name: string, ingredients: string[]): ProductInput => ({
  name,
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
  ingredients,
});

function addRoutine(
  db: Db,
  name: string,
  timeOfDay: SaveRoutineInput['timeOfDay'],
  productId: number,
): number {
  const id = saveRoutine(db, {
    name,
    timeOfDay,
    customName: null,
    sortTime: timeOfDay === 'morning' ? '07:00' : '21:00',
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
  // Created long ago, so the test day counts.
  db.update(routine)
    .set({ createdAt: new Date(2026, 0, 1, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}

/** Vitamin C in the morning, glycolic acid in Evening A, neither in Evening B. */
function setup() {
  const app = setupTestApp();
  appStore.setState((s) => ({ ...s, activeDay: MON }));
  const serum = createProduct(app.db, productInput('C serum', ['Vitamin C']));
  const toner = createProduct(app.db, productInput('AHA toner', ['Glycolic acid']));
  const cream = createProduct(app.db, productInput('Night cream', ['Squalane']));
  const ids = new Map(listIngredients(app.db).map((i) => [i.name, i.id]));
  saveRule(app.db, {
    leftKind: 'ingredient',
    leftId: ids.get('Vitamin C')!,
    rightKind: 'ingredient',
    rightId: ids.get('Glycolic acid')!,
    note: null,
  });
  const morning = addRoutine(app.db, 'Morning', 'morning', serum);
  const eveA = addRoutine(app.db, 'Evening A', 'evening', toner);
  const eveB = addRoutine(app.db, 'Evening B', 'evening', cream);
  return { ...app, morning, eveA, eveB };
}

afterEach(() => jest.restoreAllMocks());

describe('day conflicts with A/B evenings', () => {
  it('compares the morning only with the evening picked on Today', async () => {
    jest.spyOn(reminders, 'resyncRoutineReminders').mockResolvedValue();
    const app = setup();
    const { result } = await app.renderHook(() => ({
      card: useDayRoutineConflicts(app.morning, MON),
      player: usePlayerConflicts(app.morning, MON),
      choose: useSetChoice(),
    }));
    // Nothing picked: Today shows Evening A, the first option.
    await waitFor(() => expect(result.current.card).toHaveLength(1));
    expect(result.current.card[0]!.conflict.second.routine).toBe('Evening A');
    expect(result.current.player.map((p) => p.conflict.second.routine)).toEqual(['Evening A']);

    await act(async () => {
      await result.current.choose.mutateAsync({
        timeOfDayKey: 'evening',
        weekday: 1,
        routineId: app.eveB,
      });
    });
    await waitFor(() => expect(result.current.card).toEqual([]));
    expect(result.current.player).toEqual([]);
  });

  it('still warns in an option opened against the pick', async () => {
    const app = setup();
    setChoice(app.db, 'evening', 1, app.eveB);
    const { result } = await app.renderHook(() => useDayRoutineConflicts(app.eveA, MON));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]!.conflict.second.routine).toBe('Morning');
  });
});
