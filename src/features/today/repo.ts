import { asc } from 'drizzle-orm';

import type { DbOrTx } from '@/db';
import { hairTask, product, routine } from '@/db/schema';

/**
 * What the first-run card (T1) knows about setup, computed from data and never stored: the name
 * of the first product, routine and hair task made, or null while that step is still to do.
 */
export type SetupProgress = {
  product: string | null;
  routine: string | null;
  hair: string | null;
};

const firstName = (rows: { name: string }[]) => rows[0]?.name ?? null;

export function setupProgress(db: DbOrTx): SetupProgress {
  return {
    product: firstName(
      db
        .select({ name: product.name })
        .from(product)
        .orderBy(asc(product.createdAt), asc(product.id))
        .limit(1)
        .all(),
    ),
    routine: firstName(
      db
        .select({ name: routine.name })
        .from(routine)
        // By id: a schedule change moves `createdAt` (freezePastDays in routines/repo).
        .orderBy(asc(routine.id))
        .limit(1)
        .all(),
    ),
    hair: firstName(
      db
        .select({ name: hairTask.name })
        .from(hairTask)
        .orderBy(asc(hairTask.createdAt), asc(hairTask.id))
        .limit(1)
        .all(),
    ),
  };
}
