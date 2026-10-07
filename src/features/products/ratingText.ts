import type { TFunction } from 'i18next';

/**
 * The rating and "Would buy again" as one line for shopping rows and suggestions:
 * "4 stars · would buy again", "4 stars", "Would buy again", or null when neither is set.
 */
export function ratingLine(
  t: TFunction,
  rating: number | null,
  wouldRebuy: boolean | null,
): string | null {
  const stars = rating ? t('products.rating.starsLine', { count: rating }) : null;
  if (wouldRebuy === null) return stars;
  if (stars === null) {
    return wouldRebuy ? t('products.rating.rebuyYesAlone') : t('products.rating.rebuyNoAlone');
  }
  return `${stars} · ${wouldRebuy ? t('products.rating.rebuyYes') : t('products.rating.rebuyNo')}`;
}
