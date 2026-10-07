import type { TFunction } from 'i18next';

import type { BadgeStatus } from '@/components/ui/badge';
import type { Formatter } from '@/i18n/useFormat';
import { avoidMatches, type AvoidItemLite } from '@/lib/avoid';
import { parseIngredientLines } from '@/lib/ingredients';

import type { IngredientPill } from './components/IngredientPills';
import type { ProductInput } from './schema';
import type { ProductDetail } from './types';

/** P2 badge: the status word always (OK included); a finished product reads "Finished". */
export function detailBadge(
  p: ProductDetail,
  t: TFunction,
): { status: BadgeStatus; label: string } {
  if (p.archivedAt) return { status: 'nodate', label: t('common.finished') };
  return { status: p.status, label: t(`common.status.${p.status}`) };
}

/** "Expires in 12 days · 19 Oct", "Expired 3 days ago · 2 Oct"; null without a date or once finished. */
export function expiryLine(p: ProductDetail, f: Formatter): string | null {
  if (p.archivedAt || p.daysLeft === null || !p.effectiveExpiry) return null;
  return `${f.relativeExpiry(p.daysLeft)} · ${f.date(p.effectiveExpiry)}`;
}

/** "50 ml", "1,5 g"; null without a size. */
export function sizeText(p: Pick<ProductDetail, 'size' | 'unit'>, f: Formatter, t: TFunction) {
  if (p.size == null) return null;
  const n = f.number(p.size, Number.isInteger(p.size) ? 0 : 1);
  return p.unit ? `${n} ${t(`products.detail.units.${p.unit}`)}` : n;
}

/**
 * Ingredient chips: avoided ones red (by ingredient or its group), ones in a conflict rule with a
 * link icon (`inRule`, task 030).
 */
export function ingredientPills(
  p: Pick<ProductDetail, 'ingredients'>,
  avoidItems: readonly AvoidItemLite[],
  inRule: (ingredientId: number) => boolean = () => false,
): IngredientPill[] {
  return p.ingredients.map((i) => ({
    name: i.name,
    avoided: avoidMatches([i.id], new Map([[i.id, i.groupId]]), avoidItems).length > 0,
    conflict: inRule(i.id),
  }));
}

/** The product as a save input with a new ingredient list (Edit list on P2 opens P4 directly). */
export function withIngredients(p: ProductDetail, text: string): ProductInput {
  return {
    name: p.name,
    brand: p.brand,
    area: p.area,
    category: p.category,
    size: p.size,
    unit: p.unit,
    price: p.priceCents,
    purchasedAt: p.purchasedAt,
    expiresAt: p.expiresAt,
    openedAt: p.openedAt,
    paoMonths: p.paoMonths,
    notes: p.notes,
    photoUri: p.photoUri,
    ingredients: parseIngredientLines(text),
  };
}
