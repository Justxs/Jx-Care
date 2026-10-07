import type { ProductCategory } from '@/db/enums';
import type { PickerProduct } from '@/features/products/types';

import type { StepProduct } from '../repo';

/** What the editor shows for a step's product. */
export type EditorProduct = {
  id: number;
  name: string;
  brand: string | null;
  photoUri: string | null;
  category: ProductCategory;
  problem: 'finished' | 'expired' | null;
};

/**
 * Products the editor can name: the routine's own step products (finished ones too) and every
 * active product, which includes any picked or added while editing.
 */
export function editorProductMap(
  stepProducts: readonly StepProduct[],
  active: readonly PickerProduct[],
): Map<number, EditorProduct> {
  const map = new Map<number, EditorProduct>();
  for (const p of stepProducts) map.set(p.id, { ...basics(p), problem: p.problem });
  for (const p of active) {
    map.set(p.id, { ...basics(p), problem: p.status === 'expired' ? 'expired' : null });
  }
  return map;
}

function basics(p: PickerProduct | StepProduct) {
  return { id: p.id, name: p.name, brand: p.brand, photoUri: p.photoUri, category: p.category };
}
